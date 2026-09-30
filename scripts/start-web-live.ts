import { createWebLiveServer } from "../src/web/demo-server.js";

const port = Number(process.env.ARIADNE_WEB_PORT ?? "18902");
const server = createWebLiveServer();
server.listen(port, "127.0.0.1", () => {
  console.log(`Ariadne API Live Read-only Mode: http://127.0.0.1:${port}/api`);
  console.log("Only asset research and market context are enabled. No wallet, signature or broadcast capability is exposed.");
});
