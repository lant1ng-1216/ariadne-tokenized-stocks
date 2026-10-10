import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ariadne — Tokenized stocks, agent native",
  description: "Research, compare, and prepare BSC tokenized-stock purchases through MCP or a typed SDK.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
