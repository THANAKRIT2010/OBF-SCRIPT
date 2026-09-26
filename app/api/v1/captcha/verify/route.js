export async function POST(req){
  try{
    const {token,answer}=await req.json();
    if(!token||answer===undefined)return Response.json({ok:false,error:"missing_data"},{status:400});
    const data=JSON.parse(Buffer.from(token,"base64url").toString());
    if(Date.now()>data.exp)return Response.json({ok:false,error:"expired"},{status:400});
    const success=Number(answer)===Number(data.answer);
    return Response.json({ok:success,success,error:success?undefined:"invalid_answer"});
  }catch{
    return Response.json({ok:false,error:"invalid_token"},{status:400});
  }
}