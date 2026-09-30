import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { language } from "@/copy";
import "./globals.css";
import "./product.css";

const editorial = localFont({ src: "../public/fonts/cormorant-garamond.ttf", variable: "--font-editorial", display: "swap", weight: "300 700" });
const sans = localFont({ src: "../public/fonts/manrope.ttf", variable: "--font-sans", display: "swap", weight: "200 800" });
export const metadata: Metadata = {
  title: "Ariadne — Your way through onchain markets",
  description: "Discover tokenized equities, compare issuers, and build through Ariadne's SDK and MCP.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = language((await cookies()).get("ariadne-language")?.value) ?? "en";
  return <html lang={lang === "zh" ? "zh-CN" : lang} data-scroll-behavior="smooth" className={`${editorial.variable} ${sans.variable}`}><body>{children}</body></html>;
}
