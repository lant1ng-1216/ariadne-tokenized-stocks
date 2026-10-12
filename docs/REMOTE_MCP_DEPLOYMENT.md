# Remote MCP deployment architecture

The public remote entry point is `https://ariadne-remote-mcp.vercel.app/api/mcp`. End-user connection instructions and the current verification boundary are in [Remote MCP usage and status](REMOTE_MCP_USAGE.md).

This project has three distinct surfaces:

- `remote-mcp/`: the dedicated Vercel application serving Streamable HTTP MCP, OAuth protected-resource metadata, review pages and relay routes;
- `website/`: the product site, deployed as the separate `ariadne` Vercel project;
- the root package: the TypeScript SDK and local stdio MCP distribution.

The remote application builds handlers from root source at deployment time. Its durable state is stored in a database and each user authenticates through OAuth. The hosted Binance credentials, OAuth configuration, database connection and relay secrets belong in the dedicated project's encrypted environment; they are not client configuration, public documentation or website variables. The prior experimental root Vercel adapter used a shared bearer token and encountered upstream `40304` on its tested egress path. That older adapter is not the current public connection path.

A repeatable release should preserve the dedicated project's region and dependency paths, then verify readiness, OAuth discovery, a newly authorized client, tool discovery, Live research, and a non-broadcast review link. The wallet-bound quote, signing and settlement stages require separate evidence and must not be inferred from a successful MCP connection. Any Git push or production deployment requires owner approval.
