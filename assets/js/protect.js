/**
 * protect.js — ป้องกัน view-source / devtools / copy
 */
(function(){
  'use strict';

  // ── 1. บล็อก right-click ──
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });

  // ── 2. บล็อก keyboard shortcuts ──
  document.addEventListener('keydown', function(e){
    var ctrl = e.ctrlKey || e.metaKey;
    // Ctrl+U (view-source), Ctrl+S (save), Ctrl+A (select all)
    if(ctrl && ['u','U','s','S','a','A'].indexOf(e.key) !== -1){
      e.preventDefault(); return false;
    }
    // F12
    if(e.key === 'F12'){ e.preventDefault(); return false; }
    // Ctrl+Shift+I / J / C (devtools)
    if(ctrl && e.shiftKey && ['i','I','j','J','c','C'].indexOf(e.key) !== -1){
      e.preventDefault(); return false;
    }
  });

  // ── 3. บล็อก text selection ──
  document.addEventListener('selectstart', function(e){ e.preventDefault(); });

  // ── 4. ตรวจ devtools เปิด → ล้างหน้า ──
  var _devOpen = false;
  function _checkDev(){
    var w = window.outerWidth - window.innerWidth > 160;
    var h = window.outerHeight - window.innerHeight > 160;
    if((w || h) && !_devOpen){
      _devOpen = true;
      document.documentElement.innerHTML =
        '<style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}</style>' +
        '<body><p style="color:#fff;font-family:sans-serif;font-size:18px;">⛔ ไม่อนุญาต</p></body>';
    } else if(!w && !h){
      _devOpen = false;
    }
  }
  setInterval(_checkDev, 800);

  // ── 5. ป้องกัน view-source redirect ──
  if(window.location.protocol !== 'view-source:'){
    document.addEventListener('keypress', function(e){
      if((e.ctrlKey||e.metaKey) && (e.key==='u'||e.key==='U')){
        e.preventDefault(); return false;
      }
    });
  }

}());