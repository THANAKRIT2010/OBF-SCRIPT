import crypto from "node:crypto";
import {requireApiKey} from "../lib/auth.js";

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"method_not_allowed"});
  if(!requireApiKey(req,res)) return;
  const {event,data={}}=req.body||{};
  if(!event||typeof event!=="string") return res.status(400).json({error:"event_required"});
  return res.status(200).json({
    ok:true,
    event:{id:crypto.randomUUID(),event,data,created_at:new Date().toISOString()}
  });
}