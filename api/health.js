export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"method_not_allowed"});
  return res.status(200).json({
    ok:true,
    service:"flexozy-api",
    version:"3.0.0",
    timestamp:new Date().toISOString(),
    provider_configured:Boolean(process.env.QUEST_PROVIDER_URL),
    auth_configured:Boolean(process.env.API_ADMIN_KEY)
  });
}