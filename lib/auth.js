import crypto from "node:crypto";

export function getApiKey(req){
  const auth=req.headers.authorization||"";
  if(auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return String(req.headers["x-api-key"]||"").trim();
}

export function requireApiKey(req,res){
  const supplied=getApiKey(req);
  const expected=String(process.env.API_ADMIN_KEY||"");
  if(!supplied||!expected||supplied.length!==expected.length){
    res.status(401).json({error:"unauthorized"});
    return false;
  }
  if(!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))){
    res.status(401).json({error:"unauthorized"});
    return false;
  }
  return true;
}