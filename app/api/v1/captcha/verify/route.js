import crypto from "crypto";
export const runtime="nodejs";
const SECRET=process.env.CAPTCHA_SECRET||"dev-only-flexozy-captcha-secret-change-me";
function sign(v){return crypto.createHmac("sha256",SECRET).update(v).digest("base64url")}
function safeEq(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)}
export async function POST(req){try{const body=await req.json();const token=String(body?.token||"");const answer=String(body?.answer??"").trim();if(!token||!answer)return Response.json({ok:false,success:false,error:"missing_data"},{status:400});const [raw,sig]=token.split(".");if(!raw||!sig||!safeEq(sign(raw),sig))return Response.json({ok:false,success:false,error:"invalid_token"},{status:400});const p=JSON.parse(Buffer.from(raw,"base64url").toString());if(Date.now()>Number(p.exp))return Response.json({ok:false,success:false,error:"expired"},{status:400});const success=answer.toLowerCase()===String(p.answer).toLowerCase();return Response.json({ok:success,success,error:success?undefined:"invalid_answer",id:p.id})}catch{return Response.json({ok:false,success:false,error:"invalid_request"},{status:400})}}
