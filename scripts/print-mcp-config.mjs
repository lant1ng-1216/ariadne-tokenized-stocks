const mode = process.argv[2];
if (!['demo', 'live'].includes(mode)) {
  console.error('Usage: npm run mcp:config:demo | npm run mcp:config:live');
  process.exit(1);
}
const config = mode === 'demo'
  ? { command: 'npm', args: ['run', 'mcp:demo'] }
  : { command: 'node', args: ['--env-file=.env', '--import', 'tsx', 'src/mcp/server.ts'] };
console.log(JSON.stringify({ mcpServers: { 'ariadne-tokenized-stocks': { ...config, cwd: process.cwd() } } }, null, 2));
