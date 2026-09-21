import {listQuests} from "../lib/quest/provider.js";
import {requireApiKey} from "../lib/auth.js";

export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"method_not_allowed"});
  if(!requireApiKey(req,res)) return;
  try{
    const data=await listQuests();
    return res.status(200).json({ok:true,...data});
  }catch(err){
    return res.status(err.status||502).json({error:"provider_error",message:err.message});
  }
}