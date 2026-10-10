import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps-v1/app-with-deps";
import { renderCatalogView } from "./catalog-view.js";

type HostContext = Parameters<NonNullable<App["onhostcontextchanged"]>>[0];
const root = document.querySelector<HTMLElement>("#app") ?? (() => { throw new Error("Ariadne catalog view mount point is missing"); })();
let currentPayload: unknown;
const readTextPayload = (content: unknown): unknown => {
  if (!Array.isArray(content)) return undefined;
  const item = content.find((value) => value && typeof value === "object" && (value as { type?: unknown }).type === "text") as { text?: unknown } | undefined;
  if (typeof item?.text !== "string") return undefined;
  try { return JSON.parse(item.text); } catch { return undefined; }
};
const render = () => { if (currentPayload !== undefined) root.innerHTML = renderCatalogView(currentPayload); };
const fallback = (message: string) => { root.innerHTML = `<main class="catalog-shell"><div class="empty-result"><h1>Catalog data is available in the conversation.</h1><p>${message}</p></div></main>`; };
const applyHostContext = (context: HostContext) => {
  if (context.theme) applyDocumentTheme(context.theme);
  if (context.styles?.variables) applyHostStyleVariables(context.styles.variables);
  if (context.styles?.css?.fonts) applyHostFonts(context.styles.css.fonts);
};
const app = new App({ name: "Ariadne Catalog View", version: "0.1.0" }, {}, { autoResize: true });
app.onhostcontextchanged = applyHostContext;
app.ontoolresult = (result) => {
  currentPayload = result.structuredContent && typeof result.structuredContent === "object" ? result.structuredContent : readTextPayload(result.content);
  if (currentPayload === undefined) return fallback("The host did not provide a readable catalog result.");
  render();
};
app.ontoolcancelled = () => fallback("The catalog request was cancelled.");
app.connect().then(() => { const context = app.getHostContext(); if (context) applyHostContext(context); }).catch(() => fallback("This host did not complete the MCP Apps handshake."));
