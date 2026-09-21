const base=()=>String(process.env.QUEST_PROVIDER_URL||"").replace(/\/$/,"");

function headers(){
  const h={"accept":"application/json","content-type":"application/json"};
  const key=process.env.QUEST_PROVIDER_KEY;
  if(key) h.authorization=`Bearer ${key}`;
  return h;
}

async function request(path,options={}){
  if(!base()) throw new Error("QUEST_PROVIDER_URL is not configured");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(base()+path,{
      ...options,
      headers:{...headers(),...(options.headers||{})},
      signal:controller.signal
    });
    const raw=await response.text();
    let data={};
    try{data=raw?JSON.parse(raw):{}}catch{data={raw}};
    if(!response.ok){
      const err=new Error(data?.error||data?.message||`Provider returned ${response.status}`);
      err.status=response.status;
      throw err;
    }
    return data;
  }finally{clearTimeout(timer)}
}

export const listQuests=()=>request("/quests");
export async function getQuest(id){
  try{return await request(`/quests/${encodeURIComponent(id)}`)}
  catch(err){if(err.status===404)return null;throw err}
}
export const updateQuestProgress=(id,body)=>request(`/quests/${encodeURIComponent(id)}/progress`,{
  method:"POST",
  body:JSON.stringify(body)
});