import { createWebDemoServer } from "../src/web/demo-server.js";

const port = Number(process.env.ARIADNE_WEB_PORT ?? "18901");
const server = createWebDemoServer();
server.listen(port, "127.0.0.1", () => {
  console.log(`Ariadne API Demo Mode: http://127.0.0.1:${port}/api`);
  console.log("Read-only Demo Mode. No wallet, signature or broadcast capability is enabled.");
});
