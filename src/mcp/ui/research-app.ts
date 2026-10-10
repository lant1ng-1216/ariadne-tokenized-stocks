import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables
} from "@modelcontextprotocol/ext-apps-v1/app-with-deps";
import { renderResearchView } from "./research-view.js";

type HostContext = Parameters<NonNullable<App["onhostcontextchanged"]>>[0];

const root = document.querySelector<HTMLElement>("#app") ?? (() => {
  throw new Error("Ariadne research view mount point is missing");
})();

let currentPayload: unknown;

function selectChainTab(tab: HTMLButtonElement, focus = false) {
  const group = tab.closest<HTMLElement>("[data-issuer-group]");
  if (!group) return;
  const selectedPanelId = tab.getAttribute("aria-controls");
  for (const candidate of group.querySelectorAll<HTMLButtonElement>("[role=tab]")) {
    const selected = candidate === tab;
    candidate.setAttribute("aria-selected", String(selected));
    candidate.setAttribute("tabindex", selected ? "0" : "-1");
  }
  for (const panel of group.querySelectorAll<HTMLElement>("[role=tabpanel]")) {
    panel.hidden = panel.id !== selectedPanelId;
  }
  if (focus) tab.focus();
}

root.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const tab = event.target.closest<HTMLButtonElement>("button[data-chain-tab]");
  if (tab) selectChainTab(tab);
});

root.addEventListener("keydown", (event) => {
  if (!(event.target instanceof Element)) return;
  const tab = event.target.closest<HTMLButtonElement>("button[data-chain-tab]");
  if (!tab) return;
  const group = tab.closest<HTMLElement>("[data-issuer-group]");
  const tabs = group ? [...group.querySelectorAll<HTMLButtonElement>("[role=tab]")] : [];
  const index = tabs.indexOf(tab);
  if (index < 0 || tabs.length < 2) return;
  let nextIndex: number | undefined;
  if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === undefined) return;
  event.preventDefault();
  selectChainTab(tabs[nextIndex]!, true);
});

function showFallback(message: string) {
  root.innerHTML = `<main class="research-shell">
    <header class="result-heading"><div class="brandline"><span class="brand-thread" aria-hidden="true"></span><span class="brand-name">Ariadne</span><span class="brand-divider">·</span><span class="brand-context">Research · Binance Web3 · BSC</span></div></header>
    <section class="empty-state"><h1>Research data is available in the conversation.</h1><p>${message}</p><p>This Agent host may not render the MCP App. The text result remains available in the conversation.</p></section>
  </main>`;
}

function readTextPayload(content: unknown): unknown {
  if (!Array.isArray(content)) return undefined;
  const textItem = content.find((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "text") as { text?: unknown } | undefined;
  if (typeof textItem?.text !== "string") return undefined;
  try { return JSON.parse(textItem.text); } catch { return undefined; }
}

function render() {
  if (currentPayload === undefined) return;
  root.innerHTML = renderResearchView(currentPayload);
}

function applyHostContext(context: HostContext) {
  if (context.theme) applyDocumentTheme(context.theme);
  if (context.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);

  const insets = context.safeAreaInsets;
  if (insets) {
    for (const edge of ["top", "right", "bottom", "left"] as const) {
      const value = insets[edge];
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        document.documentElement.style.setProperty(`--host-safe-area-${edge}`, `${value}px`);
      }
    }
  }
}

const app = new App({ name: "Ariadne Research View", version: "0.4.0" }, {}, { autoResize: true });
app.onhostcontextchanged = (context) => applyHostContext(context);
app.ontoolresult = (result) => {
  const structured = result.structuredContent;
  currentPayload = structured && typeof structured === "object" ? structured : readTextPayload(result.content);
  if (currentPayload === undefined) {
    showFallback(result.isError ? "The research tool returned an error without a readable result." : "The host did not provide a structured research result.");
    return;
  }
  render();
};
app.ontoolcancelled = () => showFallback("The research request was cancelled. Its text response, if any, remains in the conversation.");
app.connect().then(() => {
  const context = app.getHostContext();
  if (context) applyHostContext(context);
}).catch(() => showFallback("This host did not complete the MCP Apps handshake."));
