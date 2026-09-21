import {getQuest,updateQuestProgress} from "../../lib/quest/provider.js";
import {requireApiKey} from "../../lib/auth.js";

export default async function handler(req,res){
  if(!requireApiKey(req,res)) return;
  const id=req.query?.id;
  if(!id) return res.status(400).json({error:"quest_id_required"});
  try{
    if(req.method==="GET"){
      const data=await getQuest(id);
      return data?res.status(200).json({ok:true,...data}):res.status(404).json({error:"quest_not_found"});
    }
    if(req.method==="POST"){
      const data=await updateQuestProgress(id,req.body||{});
      return res.status(200).json({ok:true,...data});
    }
    return res.status(405).json({error:"method_not_allowed"});
  }catch(err){
    return res.status(err.status||502).json({error:"provider_error",message:err.message});
  }
}