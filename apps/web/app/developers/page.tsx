import {Site} from "@/site";
import {getLanguage,type Query} from "@/locale-server";
import Developers from "@/developers";
export const metadata={title:"Developers — Ariadne"};
export default async function Page({searchParams}:{searchParams:Query}){return <Site initialLanguage={await getLanguage(searchParams)}><Developers/></Site>;}
