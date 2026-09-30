import { App } from "@modelcontextprotocol/ext-apps/app-with-deps";
import { renderResearchView, type ResearchViewMode } from "./research-view.js";

const root = document.querySelector<HTMLElement>("#app") ?? (() => {
  throw new Error("Ariadne research view mount point is missing");
})();

let currentPayload: unknown;
let currentMode: ResearchViewMode = "overview";

function showFallback(message: string) {
  root.innerHTML = `<main class="research-shell"><header class="topbar"><div class="brand-mark">A</div><div class="brand"><strong>ARIADNE</strong><span>MARKET CONTEXT</span></div></header><section class="empty-state"><div class="eyebrow">TEXT MODE AVAILABLE</div><h1>Research data is available in the conversation.</h1><p>${message}</p><p>This Agent host may not forward MCP App results to the embedded view. Use the text result above, or open the same MCP service in an MCP Apps-compatible host.</p></section></main>`;
}

function readTextPayload(content: unknown): unknown {
  if (!Array.isArray(content)) return undefined;
  const textItem = content.find((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "text") as { text?: unknown } | undefined;
  if (typeof textItem?.text !== "string") return undefined;
  try { return JSON.parse(textItem.text); } catch { return undefined; }
}

function render() {
  if (currentPayload === undefined) return;
  root.innerHTML = renderResearchView(currentPayload, currentMode);
}

root.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-view]") : null;
  if (target?.dataset.view === "overview" || target?.dataset.view === "representations") {
    currentMode = target.dataset.view;
    render();
  }
});

const app = new App({ name: "Ariadne Research View", version: "0.1.0" }, {}, { autoResize: true });
app.ontoolresult = (result) => {
  const structured = result.structuredContent;
  currentPayload = structured && typeof structured === "object" ? structured : readTextPayload(result.content);
  if (currentPayload === undefined) {
    showFallback(result.isError ? "The research tool returned an error without a readable result." : "The host did not provide a structured research result.");
    return;
  }
  currentMode = "overview";
  render();
};
app.ontoolcancelled = () => showFallback("The research request was cancelled. Its text response, if any, remains in the conversation.");
app.connect().catch(() => showFallback("This host did not complete the MCP Apps handshake."));
