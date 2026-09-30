import {Site} from "@/site";
import {getLanguage,type Query} from "@/locale-server";
import Documentation from "@/documentation";
export const metadata={title:"Documentation — Ariadne"};
export default async function Page({searchParams}:{searchParams:Query}){return <Site initialLanguage={await getLanguage(searchParams)}><Documentation/></Site>;}
