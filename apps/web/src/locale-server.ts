import { cookies } from "next/headers";
import { language } from "./copy";
export type Query = Promise<Record<string, string | string[] | undefined>>;
export async function getLanguage(query: Query) { return language((await query).lang) ?? language((await cookies()).get("ariadne-language")?.value) ?? "en"; }
