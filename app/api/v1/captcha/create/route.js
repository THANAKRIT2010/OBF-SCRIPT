import crypto from "crypto";

export async function POST(){
  const a=Math.floor(Math.random()*9)+1;
  const b=Math.floor(Math.random()*9)+1;
  const id=crypto.randomUUID();
  const payload={id,answer:a+b,exp:Date.now()+300000};
  const token=Buffer.from(JSON.stringify(payload)).toString("base64url");
  return Response.json({ok:true,id,question:`${a} + ${b} = ?`,token,expires_in:300});
}