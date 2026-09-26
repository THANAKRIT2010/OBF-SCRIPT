"use client";
import {useEffect,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL||"";
export default function Home(){
 const [c,setC]=useState(null),[answer,setAnswer]=useState(""),[msg,setMsg]=useState(""),[loading,setLoading]=useState(false);
 async function create(){setLoading(true);setMsg("");setAnswer("");try{const r=await fetch(`${API}/api/v1/captcha/create`,{method:"POST",cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"create_failed");setC(d)}catch(e){setMsg(`สร้าง CAPTCHA ไม่สำเร็จ: ${e.message}`)}finally{setLoading(false)}}
 async function verify(){if(!c)return;setLoading(true);setMsg("");try{const r=await fetch(`${API}/api/v1/captcha/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:c.token,answer})});const d=await r.json();setMsg(d.success?"CAPTCHA ผ่านแล้ว":"CAPTCHA ไม่ผ่าน: "+(d.error||"invalid_answer"));if(d.success)setTimeout(create,700)}catch(e){setMsg("ตรวจสอบไม่สำเร็จ")}finally{setLoading(false)}}
 useEffect(()=>{create()},[]);
 const choose=v=>setAnswer(v);
 return <main className="page"><nav><b>Flexozy</b><span>API • CAPTCHA</span></nav><section className="card"><div className="pill">FLEXOZY SECURITY</div><h1>CAPTCHA Verification</h1><p>ระบบ CAPTCHA สำหรับเว็บไซต์และ API ของ Flexozy</p>
 {c&&<div className="challenge"><div className="question">{c.question}</div><div className="meta">โหมด: {c.mode} • เหลือประมาณ {c.expires_in} วินาที</div>
 {c.mode==="choice"&&<div className="choices">{c.choices.map((x,i)=><button key={i} className={`choice ${answer===String(x)?"active":""}`} onClick={()=>choose(String(x))}>{x}</button>)}</div>}
 {c.mode!=="choice"&&<input value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="กรอกคำตอบ" autoComplete="off" inputMode={c.mode==="math"?"numeric":"text"}/>}</div>}
 <button onClick={verify} disabled={loading||!answer}>{loading?"กำลังตรวจสอบ…":"ยืนยัน CAPTCHA"}</button><div className="row"><button className="secondary" onClick={create} disabled={loading}>สร้างโจทย์ใหม่</button></div>{msg&&<div className="msg">{msg}</div>}<div className="types">รองรับโจทย์ของระบบเอง: คณิตศาสตร์ • เลือกคำตอบ • ลำดับตัวเลข • รหัสตัวอักษร</div></section></main>
}
