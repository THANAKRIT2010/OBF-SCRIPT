import "dotenv/config";
import {Client,GatewayIntentBits} from "discord.js";

const API_URL=(process.env.FLEXOZY_API_URL||"https://api.flexozy.online").replace(/\/$/,"");
const API_KEY=process.env.FLEXOZY_API_KEY;

if(!API_KEY) throw new Error("Missing FLEXOZY_API_KEY");
if(!process.env.DISCORD_BOT_TOKEN) throw new Error("Missing DISCORD_BOT_TOKEN");

async function flexozy(path,options={}){
  const response=await fetch(`${API_URL}${path}`,{
    ...options,
    headers:{
      "accept":"application/json",
      "content-type":"application/json",
      "authorization":`Bearer ${API_KEY}`,
      ...(options.headers||{})
    }
  });
  const text=await response.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
  if(!response.ok) throw new Error(data?.message||data?.error||`API ${response.status}`);
  return data;
}

async function getQuests(){
  return flexozy("/api/quests");
}

async function getQuest(id){
  return flexozy(`/api/quests/${encodeURIComponent(id)}`);
}

async function sendQuestProgress(id,progress){
  return flexozy(`/api/quests/${encodeURIComponent(id)}`,{
    method:"POST",
    body:JSON.stringify(progress)
  });
}

const client=new Client({intents:[GatewayIntentBits.Guilds]});

client.once("ready",async()=>{
  console.log(`Logged in as ${client.user.tag}`);
  try{
    const health=await fetch(`${API_URL}/api/health`).then(r=>r.json());
    console.log("Flexozy API:",health.ok?"ONLINE":"OFFLINE");
    const quests=await getQuests();
    console.log("Quest API response:",quests);
  }catch(err){
    console.error("Flexozy API error:",err.message);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);