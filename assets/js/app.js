/* assets/js/app.js — drawer, slider, scroll reveal */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const burger=$('burger'),drawer=$('drawer'),overlay=$('overlay'),closeBtn=$('drawerClose');
const open=()=>{drawer.classList.add('open');overlay.classList.add('open')};
const close=()=>{drawer.classList.remove('open');overlay.classList.remove('open')};
burger&&burger.addEventListener('click',open);
overlay&&overlay.addEventListener('click',close);
closeBtn&&closeBtn.addEventListener('click',close);

const slidesEl=$('slides');
if(slidesEl){
  const total=slidesEl.children.length;
  let idx=0,timer;
  const go=i=>{idx=(i+total)%total;slidesEl.style.transform=`translateX(-${idx*100}%)`;};
  const start=()=>timer=setInterval(()=>go(idx+1),4500);
  const reset=()=>{clearInterval(timer);start();};
  if(total>1)start();

  /* ── Touch / Mouse swipe (เลื่อนขวาอย่างเดียว ← ห้ามย้อน) ── */
  let x0=null,y0=null,dragging=false;
  const THRESHOLD=40;

  const onStart=e=>{
    const p=e.touches?e.touches[0]:e;
    x0=p.clientX; y0=p.clientY; dragging=true;
  };
  const onEnd=e=>{
    if(!dragging||x0===null)return;
    const p=e.changedTouches?e.changedTouches[0]:e;
    const dx=p.clientX-x0, dy=p.clientY-y0;
    dragging=false;
    /* dx<0 = swipe ซ้าย = ไปหน้าถัดไป (ขวา) เท่านั้น */
    if(dx<-THRESHOLD&&Math.abs(dx)>Math.abs(dy)){
      go(idx+1); reset();
    }
    x0=null; y0=null;
  };
  const onMove=e=>{
    if(!dragging||x0===null)return;
    const p=e.touches?e.touches[0]:e;
    const dx=p.clientX-x0, dy=Math.abs(p.clientY-y0);
    /* บล็อก scroll แนวนอนถ้า swipe ซ้าย (ไปหน้าต่อไป) */
    if(dx<-8&&Math.abs(dx)>dy) e.preventDefault();
  };

  const wrap=slidesEl.closest('.slider')||slidesEl.parentElement;
  /* user-select:none + cursor ปกติ กันกดค้างลาก */
  wrap.style.userSelect='none';
  wrap.style.webkitUserSelect='none';
  wrap.addEventListener('touchstart',onStart,{passive:true});
  wrap.addEventListener('touchmove',onMove,{passive:false});
  wrap.addEventListener('touchend',onEnd,{passive:true});
  wrap.addEventListener('mousedown',onStart);
  window.addEventListener('mouseup',onEnd);
  /* บล็อก drag รูป */
  wrap.addEventListener('dragstart',e=>e.preventDefault());
}

const secs=document.querySelectorAll('.section');
document.documentElement.classList.add('js-anim');
// slider-section ต้องแสดงทันที ไม่ fade
document.querySelectorAll('.slider-section').forEach(s=>s.classList.add('reveal'));
if('IntersectionObserver'in window){
  const o=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('reveal');o.unobserve(e.target)}})},{threshold:.08});
  secs.forEach(s=>{ if(!s.classList.contains('slider-section')) o.observe(s); });
  // กันกรณี observer ไม่ยิงใน WebView เก่า: บังคับ reveal หลัง 1.2 วิ
  setTimeout(()=>secs.forEach(s=>s.classList.add('reveal')),1200);
}else secs.forEach(s=>s.classList.add('reveal'));
})();
