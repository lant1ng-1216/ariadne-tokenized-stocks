import {notFound} from "next/navigation";
import {Site} from "@/site";
import {getLanguage,type Query} from "@/locale-server";
import {docs} from "@/docs-content";
import Documentation from "@/documentation";
export const metadata={title:"Documentation — Ariadne"};
export default async function Page({searchParams,params}:{searchParams:Query;params:Promise<{slug:string}>}){const {slug}=await params;if(!docs.some(d=>d.slug===slug))notFound();return <Site initialLanguage={await getLanguage(searchParams)}><Documentation slug={slug}/></Site>;}
