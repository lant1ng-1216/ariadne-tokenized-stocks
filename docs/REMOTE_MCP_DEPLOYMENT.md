# Remote MCP Deployment

Ariadne's production remote entry point serves MCP over Streamable HTTP at `/mcp`. It is separate from the local stdio executable and from the credential-free local Hosted Demo.

## Required configuration

| Variable | Purpose |
|---|---|
| `ARIADNE_MCP_AUTH_TOKEN` | Bearer token for every `/mcp` request; at least 32 characters |
| `ARIADNE_MCP_ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS; an empty list allows no browser origin, while server clients without an Origin header remain supported |
| `ARIADNE_MODE` | Set to `demo` for deterministic read-only data; omit for Live mode |
| `BINANCE_WEB3_API_KEY` / `BINANCE_WEB3_API_SECRET` | Required in Live mode through the hosting platform's secret store |
| `HOST` / `PORT` | Bind address and port; defaults to `0.0.0.0:8787` |
| `ARIADNE_MCP_MAX_BODY_BYTES` | Request body ceiling; defaults to 1 MiB |
| `ARIADNE_MCP_MAX_SESSIONS` | In-memory concurrent-session ceiling; defaults to 100 |
| `ARIADNE_MCP_SESSION_TTL_MS` | Idle session lifetime; defaults to 30 minutes |

The service exposes unauthenticated `GET /healthz` for process liveness and `GET /readyz` for safe configuration readiness. These endpoints never return secret values. `/mcp` requires `Authorization: Bearer …`; a supplied browser `Origin` must be allowlisted.

## Vercel

The Vercel adapter exposes the same read-only MCP tools through these Node.js Function routes:

- `POST /api/mcp` — stateless Streamable HTTP MCP
- `GET /api/healthz` — process liveness
- `GET /api/readyz` — configuration readiness

Vercel Functions are horizontally scheduled and may cold start, so this adapter deliberately uses MCP stateless mode and JSON responses. It does not rely on process-local session affinity. Each authenticated request constructs and closes its own MCP server; clients must not require server-initiated notifications, resumable SSE, or state retained between calls.

Create a Vercel project for this repository and configure the following secrets in the project rather than in `vercel.json` or source control:

```text
ARIADNE_MCP_AUTH_TOKEN=<at least 32 random characters>
ARIADNE_MCP_ALLOWED_ORIGINS=https://your-agent.example
BINANCE_WEB3_API_KEY=<live provider key>
BINANCE_WEB3_API_SECRET=<live provider secret>
```

For a credential-free preview, set `ARIADNE_MODE=demo` and omit the Binance credentials. Live production must omit `ARIADNE_MODE=demo` and pass `/api/readyz` before traffic is enabled. The production MCP URL will be `https://<project>.vercel.app/api/mcp`.

Before deploying, run `npm run test:vercel-mcp`. After deployment, verify `/api/healthz`, `/api/readyz`, authenticated MCP initialization, tool discovery and a read-only research call. Roll back through Vercel Deployments to the previous verified deployment and rotate `ARIADNE_MCP_AUTH_TOKEN` if authentication material may have been exposed.

## Container

```bash
docker build -f Dockerfile.remote-mcp -t ariadne-remote-mcp:0.1.0 .
docker run --rm -p 8787:8787 \
  -e ARIADNE_MODE=demo \
  -e ARIADNE_MCP_AUTH_TOKEN='replace-with-at-least-32-random-characters' \
  -e ARIADNE_MCP_ALLOWED_ORIGINS='https://your-agent.example' \
  ariadne-remote-mcp:0.1.0
```

Use the same image in a container platform that supports HTTPS ingress and secret-backed environment variables. Terminate TLS at the platform ingress and expose only port 8787 internally. Configure health checking on `/healthz` and deployment readiness on `/readyz`.

## Client connection

Connect a Streamable HTTP MCP client to `https://your-service.example/mcp` and supply the Bearer token through the client's secret configuration. Do not embed the token in a public URL, browser bundle, repository file or screenshot.

## Rollback

Keep the previously verified immutable image tag. If readiness, authentication or MCP initialization fails after release, route traffic back to that tag and revoke the affected Bearer token. Because sessions are process-local and intentionally bounded, a restart invalidates active MCP sessions; clients must reconnect.

## Scope boundary

This service makes the MCP tools remotely reachable. It does not by itself deploy the separate wallet-handoff relay or approval-page origin, prove that a particular Agent host will open MetaMask, authorize signing, or demonstrate settlement and automatic final reporting. Those surfaces require their own stable HTTPS origin, secret configuration and host validation.
