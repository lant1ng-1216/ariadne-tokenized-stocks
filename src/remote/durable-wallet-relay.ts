import pg from "pg";
import { WalletHandoffStore } from "../services/wallet-handoff-relay.js";

const { Pool } = pg;

type PersistedSession = { id: string };

/** Serializes all handoff mutations for one authenticated owner across Vercel instances. */
export class DurableWalletRelay {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Durable wallet relay requires PostgreSQL");
    url.searchParams.set("sslmode", "verify-full");
    this.pool = new Pool({ connectionString: url.toString(), max: 4, connectionTimeoutMillis: 10_000 });
  }

  async close(): Promise<void> { await this.pool.end(); }

  async findOwner(handoffId: string): Promise<string | null> {
    if (!/^[a-f0-9]{32}$/.test(handoffId)) return null;
    const result = await this.pool.query("SELECT owner_id FROM ariadne_remote_handoff_index WHERE handoff_id=$1", [handoffId]);
    return result.rowCount ? result.rows[0].owner_id as string : null;
  }

  /**
   * Existing WalletHandoffStore validation runs inside one DB transaction.
   * The committed snapshot and ID index move together; callback failures roll back.
   * Do not perform wallet broadcasts inside the callback.
   */
  async withOwnerStore<T>(ownerId: string, portalOrigin: string, action: (store: WalletHandoffStore) => Promise<T> | T): Promise<T> {
    if (typeof ownerId !== "string" || !ownerId.trim() || ownerId.length > 512) throw new Error("Authenticated owner is required");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO ariadne_remote_relay_snapshots (owner_id) VALUES ($1) ON CONFLICT DO NOTHING", [ownerId]);
      const locked = await client.query("SELECT sessions FROM ariadne_remote_relay_snapshots WHERE owner_id=$1 FOR UPDATE", [ownerId]);
      const store = new WalletHandoffStore({ portalOrigin, persistedSessions: locked.rows[0].sessions });
      const value = await action(store);
      const sessions = store.exportPersistedSessions() as PersistedSession[];
      const ids = sessions.map((session) => session.id);
      if (new Set(ids).size !== ids.length) throw new Error("Duplicate handoff IDs in the durable snapshot");
      await client.query(
        "UPDATE ariadne_remote_relay_snapshots SET sessions=$2::jsonb,version=version+1,updated_at=now() WHERE owner_id=$1",
        [ownerId, JSON.stringify(sessions)]
      );
      for (const id of ids) {
        const indexed = await client.query("INSERT INTO ariadne_remote_handoff_index (handoff_id,owner_id) VALUES ($1,$2) ON CONFLICT (handoff_id) DO UPDATE SET owner_id=EXCLUDED.owner_id WHERE ariadne_remote_handoff_index.owner_id=EXCLUDED.owner_id RETURNING handoff_id", [id, ownerId]);
        if (indexed.rowCount !== 1) throw new Error("Handoff ID is already owned by another user");
      }
      await client.query("DELETE FROM ariadne_remote_handoff_index WHERE owner_id=$1 AND NOT (handoff_id = ANY($2::text[]))", [ownerId, ids]);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
