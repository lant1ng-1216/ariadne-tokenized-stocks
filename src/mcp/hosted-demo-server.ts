import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";

process.env.ARIADNE_MODE = "demo";
process.env.ARIADNE_TRANSPORT = "http";

const { buildMcpServer } = await import("./server.js");
const sessions = new Map<string, {
  server: Awaited<ReturnType<typeof buildMcpServer>>;
  transport: NodeStreamableHTTPServerTransport;
}>();

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.method !== "POST") return Promise.resolve(undefined);
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : undefined); }
      catch (error) { reject(error); }
    });
    request.on("error", reject);
  });
}

async function createSession() {
  const server = buildMcpServer();
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
  transport.onerror = (error) => console.error(`Hosted Demo transport error: ${error.name}`);
  await server.connect(transport);
  transport.onclose = () => {
    const sessionId = transport.sessionId;
    if (sessionId) sessions.delete(sessionId);
    void server.close();
  };
  return { server, transport };
}

function addCors(response: ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version");
  response.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

const httpServer = createServer(async (request, response) => {
  if (request.url === "/healthz" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", mode: "demo", readOnly: true }));
    return;
  }
  if (request.url !== "/mcp") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }
  addCors(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const sessionId = request.headers["mcp-session-id"];
    let session = typeof sessionId === "string" ? sessions.get(sessionId) : undefined;
    if (typeof sessionId === "string" && !session) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unknown_session" }));
      return;
    }
    session ??= await createSession();
    await session.transport.handleRequest(request, response, await readJsonBody(request));
    const assignedSessionId = session.transport.sessionId;
    if (assignedSessionId) sessions.set(assignedSessionId, session);
  } catch (error) {
    if (!response.headersSent) response.writeHead(400, { "content-type": "application/json" });
    if (!response.writableEnded) response.end(JSON.stringify({ error: error instanceof Error ? error.name : "request_failed" }));
  }
});

httpServer.listen(port, host, () => {
  const address = httpServer.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.error(`Ariadne Hosted Demo listening at http://${host}:${actualPort}/mcp`);
});

const shutdown = async () => {
  httpServer.close();
  await Promise.allSettled([...sessions.values()].map(async ({ transport, server }) => {
    await transport.close();
    await server.close();
  }));
  sessions.clear();
};
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
