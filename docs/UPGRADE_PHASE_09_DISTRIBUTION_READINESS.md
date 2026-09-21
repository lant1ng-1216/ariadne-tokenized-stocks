# Distribution Readiness — Local Review

## Objective

Make Ariadne straightforward to connect for a first-time user and prepare the TypeScript SDK for a future npm release without publishing it automatically.

## Delivered

- Separate Demo Mode and Live Mode MCP configuration examples;
- `npm run mcp:config:demo` and `npm run mcp:config:live` commands;
- credential-free Demo Mode path documented as the first-run route;
- publish-ready package metadata, repository links and MIT license;
- public SDK root export with JavaScript and TypeScript declaration output;
- `npm run pack:check` dry-run package inspection;
- package build narrowed to public SDK code rather than tests and internal phase tooling;
- distribution contract test with no credentials in configuration examples.

## Validation

- `npm run typecheck`: PASS;
- `npm run test:distribution`: PASS;
- `npm run build`: PASS;
- `npm pack --dry-run`: PASS;
- package contents: 62 files, 28.2 kB compressed in the local dry-run;
- no npm publish performed.

## Deferred boundary

Publishing to npm is an external release action and remains intentionally deferred until explicitly authorized. Hosted MCP, MCP Registry publication and real-wallet execution remain separate future decisions.
