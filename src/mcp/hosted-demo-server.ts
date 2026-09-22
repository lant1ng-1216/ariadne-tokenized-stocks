import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

process.env.ARIADNE_MODE = "demo";
process.env.ARIADNE_TRANSPORT = "http";

const { server } = await import("./server.js");
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
transport.onerror = (error) => console.error(`Hosted Demo transport error: ${error.message}`);
await server.connect(transport);

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

function readJsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
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
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id, mcp-protocol-version");
  response.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }
  try {
    await transport.handleRequest(request, response, await readJsonBody(request));
  } catch (error) {
    if (!response.headersSent) response.writeHead(400, { "content-type": "application/json" });
    if (!response.writableEnded) response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
});

httpServer.listen(port, host, () => {
  const address = httpServer.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.error(`Ariadne Hosted Demo listening at http://${host}:${actualPort}/mcp`);
});

const shutdown = async () => {
  await transport.close();
  await server.close();
  httpServer.close();
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
