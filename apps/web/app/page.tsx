import { cookies } from "next/headers";
import { language } from "@/copy";
import Home from "@/brand-home";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const lang = language(query.lang) ?? language((await cookies()).get("ariadne-language")?.value) ?? "en";
  return <Home initialLanguage={lang} />;
}
