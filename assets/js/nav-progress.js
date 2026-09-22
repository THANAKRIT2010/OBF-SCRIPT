/* nav-progress.js — แถบโหลดด้านบน + fade เปลี่ยนหน้า (ใช้สีหลักเว็บ) */
(function(){
  'use strict';
  function start(){
    var preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.opacity = '1';
      preloader.style.visibility = 'visible';
    }
  }
  function done(){
    var preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      preloader.style.visibility = 'hidden';
    }
  }

  // ดักการกดลิงก์ภายในเว็บ → เล่นแถบ + fade out ก่อนเปลี่ยนหน้า
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a');
    if(!a) return;
    var href=a.getAttribute('href');
    if(!href) return;
    // ข้าม: ลิงก์นอก, anchor, target ใหม่, javascript, ปุ่มดาวน์โหลด
    if(a.target==='_blank'||a.hasAttribute('download')) return;
    if(href.charAt(0)==='#'||href.indexOf('javascript:')===0||href.indexOf('mailto:')===0||href.indexOf('tel:')===0) return;
    if(a.host && a.host!==location.host) return; // ลิงก์นอกเว็บ
    if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey) return;
    
    // ตรวจสอบว่าเป็นลิงก์ข้ามไปยัง hash บนหน้าเดียวกันหรือไม่ (เช่น http://localhost/#products)
    var currentUrlNoHash = window.location.href.split('#')[0];
    var targetUrlNoHash = a.href.split('#')[0];
    if (currentUrlNoHash === targetUrlNoHash) return;

    // เริ่มโหลด + แสดงหน้ากาก preloader สีทองตอนเปลี่ยนหน้า
    start();
    document.body.classList.add('page-leaving');
    e.preventDefault();
    setTimeout(function(){ window.location.href=a.href; },220);
  },true);

  // เผื่อกลับมาด้วยปุ่ม back (bfcache) ให้เคลียร์สถานะ
  window.addEventListener('pageshow',function(ev){
    document.body.classList.remove('page-leaving');
    done();
  });
  // ตอนกำลังจะออกจากหน้า (ลิงก์ที่ไม่ได้ดัก) ให้โชว์แถบ
  window.addEventListener('beforeunload',function(){ start(); });
})();
