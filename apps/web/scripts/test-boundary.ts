import assert from "node:assert/strict";
import {proxyRead} from "../src/read-api";
async function main(){
 const original=globalThis.fetch;
 try {
  let requested="";
  globalThis.fetch=async(input)=>{requested=String(input);return Response.json({mode:"demo",view:{items:[]}});};
  const ok=await proxyRead(new Request("http://localhost/api/catalog?query=NVDA&target=https://example.com&chainId=56"),"assets");
  assert.equal(ok.status,200);
  assert.equal(new URL(requested).pathname,"/api/assets");
  assert.equal(new URL(requested).searchParams.get("query"),"NVDA");
  assert.equal(new URL(requested).searchParams.has("target"),false);
  globalThis.fetch=async()=>{throw new Error("offline");};
  const unavailable=await proxyRead(new Request("http://localhost/api/catalog"),"assets");
  assert.equal(unavailable.status,503);
  assert.equal((await unavailable.json()).error.code,"service_unavailable");
  globalThis.fetch=async()=>Response.json({error:{code:"upstream_error"}},{status:502});
  const upstream=await proxyRead(new Request("http://localhost/api/asset-research"),"research");
  assert.equal(upstream.status,502);
  assert.equal((await upstream.json()).error.code,"upstream_error");
  console.log("PASS: fixed endpoint, query allowlist, unavailable service, upstream errors, no fabricated fallback.");
 } finally {globalThis.fetch=original;}
}
void main();
