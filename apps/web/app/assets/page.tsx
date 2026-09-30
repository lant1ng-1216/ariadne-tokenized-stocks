import {Site} from "@/site";
import {getLanguage,type Query} from "@/locale-server";
import Assets from "@/assets";
export const metadata={title:"Assets — Ariadne"};
export default async function Page({searchParams}:{searchParams:Query}){return <Site initialLanguage={await getLanguage(searchParams)}><Assets/></Site>;}
