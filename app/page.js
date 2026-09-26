"use client";
import {useEffect,useState} from "react";
const API=process.env.NEXT_PUBLIC_API_URL||"";
export default function Home(){
 const [c,setC]=useState(null),[a,setA]=useState(""),[msg,setMsg]=useState("");
 async function create(){
  setMsg("");setA("");
  const r=await fetch(`${API}/api/v1/captcha/create`,{method:"POST"});
  setC(await r.json());
 }
 async function verify(){
  const r=await fetch(`${API}/api/v1/captcha/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:c?.token,answer:a})});
  const d=await r.json(); setMsg(d.success?"CAPTCHA ผ่านแล้ว":"CAPTCHA ไม่ผ่าน");
  if(d.success) setTimeout(create,700);
 }
 useEffect(()=>{create()},[]);
 return <main className="page"><nav><b>Flexozy</b><span>API • CAPTCHA</span></nav><section className="card">
  <div className="pill">FLEXOZY SECURITY</div><h1>Verify your request</h1><p>CAPTCHA สำหรับระบบของ Flexozy</p>
  {c&&<div className="captcha">{c.question}</div>}
  <input value={a} onChange={e=>setA(e.target.value)} placeholder="คำตอบ" inputMode="numeric"/>
  <button onClick={verify}>ยืนยัน CAPTCHA</button><button className="secondary" onClick={create}>สร้างใหม่</button>
  {msg&&<div className="msg">{msg}</div>}
 </section></main>
}