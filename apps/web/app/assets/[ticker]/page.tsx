import {Site} from "@/site";
import {getLanguage,type Query} from "@/locale-server";
import {AssetDetail} from "@/assets";
export const metadata={title:"Asset market — Ariadne"};
export default async function Page({searchParams,params}:{searchParams:Query;params:Promise<{ticker:string}>}){return <Site initialLanguage={await getLanguage(searchParams)}><AssetDetail ticker={(await params).ticker}/></Site>;}
