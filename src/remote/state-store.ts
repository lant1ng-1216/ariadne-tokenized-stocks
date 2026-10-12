import pg from "pg";
import { jsonDataSnapshot } from "../domain/json-snapshot.js";

const { Pool } = pg;

export type RemoteRecordKind = "plan" | "handoff" | "settlement" | "continuation";
export type RemoteRecord<T = unknown> = {
  kind: RemoteRecordKind;
  id: string;
  ownerId: string;
  version: number;
  state: string;
  payload: T;
  expiresAt: Date | null;
};

export const REMOTE_STATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS ariadne_remote_records (
  kind text NOT NULL CHECK (kind IN ('plan', 'handoff', 'settlement', 'continuation')),
  id text NOT NULL,
  owner_id text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  state text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS ariadne_remote_records_owner_idx
  ON ariadne_remote_records (owner_id, kind, updated_at DESC);
CREATE INDEX IF NOT EXISTS ariadne_remote_records_expiry_idx
  ON ariadne_remote_records (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS ariadne_remote_wallet_attempts (
  handoff_id text PRIMARY KEY,
  handoff_kind text NOT NULL DEFAULT 'handoff' CHECK (handoff_kind = 'handoff'),
  owner_id text NOT NULL,
  attempt_id_hash text NOT NULL UNIQUE CHECK (attempt_id_hash ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed', 'submitted', 'uncertain', 'rejected', 'confirmed', 'failed')),
  tx_hash text UNIQUE CHECK (tx_hash IS NULL OR tx_hash ~ '^0x[0-9a-f]{64}$'),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (handoff_kind, handoff_id) REFERENCES ariadne_remote_records (kind, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ariadne_remote_wallet_attempts_owner_idx
  ON ariadne_remote_wallet_attempts (owner_id, claimed_at DESC);

CREATE TABLE IF NOT EXISTS ariadne_remote_reports (
  handoff_id text PRIMARY KEY,
  handoff_kind text NOT NULL DEFAULT 'handoff' CHECK (handoff_kind = 'handoff'),
  owner_id text NOT NULL,
  report_payload jsonb NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  FOREIGN KEY (handoff_kind, handoff_id) REFERENCES ariadne_remote_records (kind, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ariadne_remote_relay_snapshots (
  owner_id text PRIMARY KEY,
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  sessions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sessions) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ariadne_remote_handoff_index (
  handoff_id text PRIMARY KEY CHECK (handoff_id ~ '^[a-f0-9]{32}$'),
  owner_id text NOT NULL REFERENCES ariadne_remote_relay_snapshots (owner_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ariadne_remote_handoff_index_owner_idx
  ON ariadne_remote_handoff_index (owner_id);
`;

function nonempty(value: string, name: string): void {
  if (typeof value !== "string" || !value.trim() || value.length > 512) throw new Error(`${name} must be a nonempty bounded string`);
}

function assertKind(kind: RemoteRecordKind): void {
  if (!["plan", "handoff", "settlement", "continuation"].includes(kind)) throw new Error("Invalid remote record kind");
}

function toRecord<T>(row: Record<string, unknown>): RemoteRecord<T> {
  return {
    kind: row.kind as RemoteRecordKind,
    id: row.id as string,
    ownerId: row.owner_id as string,
    version: row.version as number,
    state: row.state as string,
    payload: jsonDataSnapshot(row.payload as T),
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null
  };
}

/** Shared, owner-scoped state for the hosted MCP journey. No connection string is logged. */
export class RemoteStateStore {
  private readonly pool: pg.Pool;

  constructor(connectionString: string, options: { maxConnections?: number } = {}) {
    const parsed = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) throw new Error("Remote state requires a PostgreSQL URL");
    parsed.searchParams.set("sslmode", "verify-full");
    this.pool = new Pool({ connectionString: parsed.toString(), max: options.maxConnections ?? 4, connectionTimeoutMillis: 10_000 });
  }

  async close(): Promise<void> { await this.pool.end(); }

  async migrate(): Promise<void> {
    await this.pool.query(REMOTE_STATE_SCHEMA);
  }

  async create<T>(input: Omit<RemoteRecord<T>, "version">): Promise<RemoteRecord<T>> {
    assertKind(input.kind);
    nonempty(input.id, "id"); nonempty(input.ownerId, "ownerId"); nonempty(input.state, "state");
    const payload = jsonDataSnapshot(input.payload);
    const result = await this.pool.query(
      `INSERT INTO ariadne_remote_records (kind,id,owner_id,state,payload,expires_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
      [input.kind, input.id, input.ownerId, input.state, JSON.stringify(payload), input.expiresAt]
    );
    return toRecord<T>(result.rows[0]);
  }

  async read<T>(kind: RemoteRecordKind, id: string, ownerId: string, options: { includeExpired?: boolean } = {}): Promise<RemoteRecord<T> | null> {
    assertKind(kind);
    nonempty(id, "id"); nonempty(ownerId, "ownerId");
    const result = await this.pool.query(
      `SELECT * FROM ariadne_remote_records WHERE kind=$1 AND id=$2 AND owner_id=$3
       AND ($4::boolean OR expires_at IS NULL OR expires_at > now())`,
      [kind, id, ownerId, options.includeExpired === true]
    );
    return result.rowCount ? toRecord<T>(result.rows[0]) : null;
  }

  /** Version and state must both match: a retry or concurrent writer cannot silently replace a review. */
  async transition<T>(input: { kind: RemoteRecordKind; id: string; ownerId: string; version: number; from: string; to: string; payload: T }): Promise<RemoteRecord<T> | null> {
    assertKind(input.kind);
    nonempty(input.id, "id"); nonempty(input.ownerId, "ownerId"); nonempty(input.from, "from"); nonempty(input.to, "to");
    if (!Number.isSafeInteger(input.version) || input.version < 1) throw new Error("Invalid remote record version");
    const payload = jsonDataSnapshot(input.payload);
    const result = await this.pool.query(
      `UPDATE ariadne_remote_records SET state=$6,payload=$7::jsonb,version=version+1,updated_at=now()
       WHERE kind=$1 AND id=$2 AND owner_id=$3 AND version=$4 AND state=$5
         AND (expires_at IS NULL OR expires_at > now()) RETURNING *`,
      [input.kind, input.id, input.ownerId, input.version, input.from, input.to, JSON.stringify(payload)]
    );
    return result.rowCount ? toRecord<T>(result.rows[0]) : null;
  }

  /** At most one wallet attempt per handoff, even across instances. */
  async claimWalletAttempt(handoffId: string, ownerId: string, attemptIdHash: string): Promise<boolean> {
    nonempty(handoffId, "handoffId"); nonempty(ownerId, "ownerId");
    if (!/^[0-9a-f]{64}$/.test(attemptIdHash)) throw new Error("Wallet attempt hash must be SHA-256 hex");
    const result = await this.pool.query(
      `INSERT INTO ariadne_remote_wallet_attempts (handoff_id,owner_id,attempt_id_hash)
       SELECT r.id,r.owner_id,$3 FROM ariadne_remote_records r
       WHERE r.kind='handoff' AND r.id=$1 AND r.owner_id=$2 AND r.state='active'
         AND (r.expires_at IS NULL OR r.expires_at > now())
       ON CONFLICT DO NOTHING RETURNING handoff_id`,
      [handoffId, ownerId, attemptIdHash]
    );
    return result.rowCount === 1;
  }

  async attachTransactionHash(handoffId: string, ownerId: string, txHash: string): Promise<boolean> {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error("Invalid transaction hash");
    const result = await this.pool.query(
      `UPDATE ariadne_remote_wallet_attempts SET tx_hash=$3,state='submitted',updated_at=now()
       WHERE handoff_id=$1 AND owner_id=$2 AND state IN ('claimed','uncertain') AND tx_hash IS NULL
       RETURNING handoff_id`,
      [handoffId, ownerId, txHash.toLowerCase()]
    );
    return result.rowCount === 1;
  }

  /** Claim a terminal report once; a restart cannot emit a second one. */
  async claimReport(handoffId: string, ownerId: string, payload: unknown): Promise<boolean> {
    nonempty(handoffId, "handoffId"); nonempty(ownerId, "ownerId");
    const result = await this.pool.query(
      `INSERT INTO ariadne_remote_reports (handoff_id,owner_id,report_payload)
       SELECT r.id,r.owner_id,$3::jsonb FROM ariadne_remote_records r
       WHERE r.kind='handoff' AND r.id=$1 AND r.owner_id=$2
         AND r.state IN ('confirmed','failed','wallet_rejected','wallet_uncertain','expired')
       ON CONFLICT DO NOTHING RETURNING handoff_id`,
      [handoffId, ownerId, JSON.stringify(jsonDataSnapshot(payload))]
    );
    return result.rowCount === 1;
  }
}
