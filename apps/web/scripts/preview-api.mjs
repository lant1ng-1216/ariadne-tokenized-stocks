import {spawn} from "node:child_process";
import {mkdirSync,openSync,closeSync} from "node:fs";
import {createConnection} from "node:net";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
const app=fileURLToPath(new URL("..",import.meta.url)),root=resolve(app,"../..");
const occupied=await new Promise(resolve=>{const socket=createConnection({host:"127.0.0.1",port:18901});socket.on("connect",()=>{socket.destroy();resolve(true);});socket.on("error",()=>resolve(false));});
if(occupied){console.log("Port 18901 already in use; left untouched.");process.exit(0);}
mkdirSync(resolve(app,".local"),{recursive:true});
const log=openSync(resolve(app,".local/api-preview.log"),"a");
const child=spawn(process.execPath,["--import","tsx","scripts/start-web-demo.ts"],{cwd:root,detached:true,stdio:["ignore",log,log],env:{...process.env,ARIADNE_WEB_PORT:"18901"}});
child.on("error",error=>{console.error(error);process.exitCode=1;});
child.unref();closeSync(log);
console.log("Read-only demo API starting on localhost:18901. No credentials, signing or broadcasting.");
