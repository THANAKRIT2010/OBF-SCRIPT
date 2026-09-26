import crypto from "crypto";
export const runtime="nodejs";
const SECRET=process.env.CAPTCHA_SECRET||"dev-only-flexozy-captcha-secret-change-me";
const b64=s=>Buffer.from(s).toString("base64url");
function sign(value){return crypto.createHmac("sha256",SECRET).update(value).digest("base64url")}
function token(payload){const body=b64(JSON.stringify(payload));return `${body}.${sign(body)}`}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function make(){
 const mode=pick(["math","choice","sequence","text"]),id=crypto.randomUUID(),exp=Date.now()+300000;
 if(mode==="math"){const a=pick([2,3,4,5,6,7,8,9,11,12]),b=pick([2,3,4,5,6,7,8,9,10]);return {id,mode,question:`${a} + ${b} = ?`,answer:String(a+b),exp}}
 if(mode==="choice"){const answer=String(pick([12,15,18,21,24]));const vals=new Set([answer]);while(vals.size<4)vals.add(String(pick([9,10,11,13,14,16,17,19,20,22,23,25])));return {id,mode,question:"เลือกคำตอบที่ถูกต้อง",choices:[...vals].sort(()=>Math.random()-.5),answer,exp}}
 if(mode==="sequence"){const start=pick([2,3,4,5]),step=pick([2,3,4]);const seq=[start,start+step,start+step*2,start+step*3];return {id,mode,question:`${seq.join(", ")}, ?`,answer:String(start+step*4),exp}}
 const answer=pick(["FLEX","SAFE","API","SECURE"]);return {id,mode,question:`พิมพ์คำว่า ${answer}`,answer,exp}}
export async function POST(){const p=make();return Response.json({ok:true,id:p.id,mode:p.mode,question:p.question,choices:p.choices||undefined,token:token(p),expires_in:300})}
