/**
 * assets/js/effects.js — v36 SNOW UPGRADE
 *
 * v36:
 *  - กวางหันหน้าเข้าหาแซนต้า (head faces right/sleigh) ✓
 *  - Elf cosplay redesign — ชุด fur-trim coat, boots, ตาน่ารัก ✓
 *  - Card Snow Effect — snowflakes บนรูปสินค้า, hover burst, click burst ✓
 *  - Hero title frost glow + ❄ spinner ✓
 *  - Section title frost badge, nav brand ❄ ✓
 *  - Card ice border + image ice shimmer ✓
 *
 * ของเดิม (S1-S5, A-H) คงไว้ครบ:
 *  S1. Snow Ground Accumulation (canvas ล่าง)
 *  S2. Wind Gust System (หิมะพัดพร้อมกัน)
 *  S3. Fog + Frost layer (CSS activate)
 *  S4. Cursor Snow Trail (desktop)
 *  S5. Mascot Elf (Rexzy-style, canvas วาด, เดินขอบล่าง)
 *
 * ของเดิมทั้งหมด (A-H, 1-16) คงไว้ครบ
 */
(function () {
  'use strict';

  var isTouch = window.matchMedia('(pointer: coarse)').matches;

  /* ── helper: format number with commas ── */
  function fmtNum(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ── helper: read --accent and return [r,g,b] ── */
  function accentRGB() {
    var c = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#caa14a';
    var m = c.match(/^#([0-9a-f]{6})$/i);
    if (m) { var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    m = c.match(/^#([0-9a-f]{3})$/i);
    if (m) return [parseInt(m[1][0]+m[1][0],16),parseInt(m[1][1]+m[1][1],16),parseInt(m[1][2]+m[1][2],16)];
    m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) return [+m[1],+m[2],+m[3]];
    return [202,161,74];
  }

  /* ═══════════════════════════════════════════════════
   * 1. COUNTER ANIMATION
   * ═══════════════════════════════════════════════════ */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function runCounter(el) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target) || target <= 0) return;
    var unitEl = el.querySelector('span');
    var unitHTML = unitEl ? unitEl.outerHTML : '';
    var duration = 1100, start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      el.innerHTML = fmtNum(easeOut(p) * target) + ' ' + unitHTML;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cntObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); cntObs.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('.statx__num[data-count]').forEach(function (el) { cntObs.observe(el); });
  }

  /* ═══════════════════════════════════════════════════
   * 2. RIPPLE
   * ═══════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.product__buy:not(.product__buy--out), .hb-btn, .cat-card__btn, .pkg-card__btn');
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    var rpl = document.createElement('span');
    rpl.className = 'fx-ripple';
    rpl.style.left = (e.clientX - rect.left) + 'px';
    rpl.style.top  = (e.clientY - rect.top)  + 'px';
    btn.appendChild(rpl);
    setTimeout(function () { rpl.remove(); }, 650);
  });

  /* ═══════════════════════════════════════════════════
   * 3. SCROLL-TO-TOP
   * ═══════════════════════════════════════════════════ */
  var totop = document.createElement('button');
  totop.id = 'fx-totop';
  totop.setAttribute('aria-label','กลับด้านบน');
  totop.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
  document.body.appendChild(totop);
  totop.addEventListener('click', function () { window.scrollTo({ top:0, behavior:'smooth' }); });
  window.addEventListener('scroll', function () {
    var nearBottom = (window.scrollY + window.innerHeight) >= (document.documentElement.scrollHeight - 260);
    totop.classList.toggle('visible', window.scrollY > 320 && !nearBottom);
  }, { passive:true });

  /* ═══════════════════════════════════════════════════
   * 4-6. UNIFIED CANVAS LOOP  (Sparkle + Embers + Rain)
   * ═══════════════════════════════════════════════════ */
  var uCanvas = document.createElement('canvas');
  uCanvas.id = 'fx-unified';
  uCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;will-change:transform';
  document.body.appendChild(uCanvas);
  var uCtx = uCanvas.getContext('2d');
  var UW, UH;
  function resizeU() { UW = uCanvas.width = window.innerWidth; UH = uCanvas.height = window.innerHeight; }
  resizeU();
  window.addEventListener('resize', resizeU, { passive:true });

  var sharedRgb = accentRGB(), colorTimer = 0;

  /* ── 4. SPARKLE (desktop) ── */
  var sparks = [];
  if (!isTouch) {
    document.addEventListener('mousemove', function (e) {
      if (Math.random() > 0.4) return;
      sparks.push({ x:e.clientX, y:e.clientY, r:Math.random()*2.2+0.8, vx:(Math.random()-0.5)*1.6, vy:-(Math.random()*1.8+0.4), life:1, decay:Math.random()*0.04+0.028 });
    });
  }

  /* ── 5. เอฟเฟก particle — อ่านจาก window.__FX__.type ── */
  var __fxType = (window.__FX__ && window.__FX__.type) || 'none';

  /* ══════════════════════════════════════════════════════
   * S2. WIND GUST SYSTEM
   * ══════════════════════════════════════════════════════ */
  var windForce = 0, windTarget = 0, windTimer = 0;
  function tickWind() {
    windTimer--;
    if (windTimer <= 0) {
      windTarget = (Math.random() - 0.5) * 1.8; // -0.9 ถึง +0.9
      windTimer = 180 + Math.floor(Math.random() * 300); // 3-8 วิ @ 60fps
    }
    windForce += (windTarget - windForce) * 0.012; // smooth ease
  }

  /* ══════════════════════════════════════════════════════
   * S4. CURSOR SNOW TRAIL (desktop only)
   * ══════════════════════════════════════════════════════ */
  if (!isTouch) {
    var _cursorSnowThrottle = 0;
    document.addEventListener('mousemove', function (e) {
      if (__fxType !== 'snow') return;
      _cursorSnowThrottle++;
      if (_cursorSnowThrottle % 3 !== 0) return; // ทุก 3 frame
      var el = document.createElement('div');
      el.className = 'fx-snow-cursor';
      var sz = Math.random() * 6 + 3;
      el.style.cssText = 'width:'+sz+'px;height:'+sz+'px;left:'+e.clientX+'px;top:'+e.clientY+'px;';
      document.body.appendChild(el);
      setTimeout(function () { el.remove(); }, 720);
    }, { passive: true });
  }

  /* ── EMBERS (ลอยขึ้น) ── */
  var embers = [];
  function mkEmber() {
    return { x:Math.random()*UW, y:UH+Math.random()*60, r:Math.random()*1.8+0.5, vy:-(Math.random()*0.55+0.25), vx:(Math.random()-0.5)*0.35, opacity:Math.random()*0.28+0.08, wobble:Math.random()*Math.PI*2, ws:(Math.random()-0.5)*0.035 };
  }
  if (__fxType === 'embers') {
    for (var ei = 0; ei < 30; ei++) { var em = mkEmber(); em.y = Math.random()*UH; embers.push(em); }
  }

  /* ── RAIN (ฝนตก) ── */
  var drops = [];
  var RAIN_COUNT = 55;
  function mkDrop() {
    return { x:Math.random()*UW, y:-Math.random()*UH, len:Math.random()*14+8, speed:Math.random()*2.5+1.5, opacity:Math.random()*0.35+0.28, width:Math.random()*1.0+1.0, angle:0.12 };
  }
  if (__fxType === 'rain') {
    for (var ri = 0; ri < RAIN_COUNT; ri++) { var rd = mkDrop(); rd.y = Math.random()*UH; drops.push(rd); }
  }

  /* ── SNOW (หิมะ) ── */
  var snowflakes = [];
  function mkSnow() {
    var roll=Math.random(), t=roll<0.55?'dot':roll<0.85?'flake':'big';
    var r=t==='big'?Math.random()*4+5:t==='flake'?Math.random()*4.5+2.5:Math.random()*2+0.8;
    return { x:Math.random()*UW, y:-10-Math.random()*20, r:r, speed:(t==='big'?0.25:t==='flake'?0.4:0.65)+Math.random()*0.55, vx:(Math.random()-0.5)*0.4, wobble:Math.random()*Math.PI*2, ws:(Math.random()-0.5)*0.015, opacity:t==='big'?Math.random()*0.22+0.1:Math.random()*0.4+0.5, rot:Math.random()*Math.PI*2, rotS:(Math.random()-0.5)*0.007, type:t, twinkle:Math.random()*Math.PI*2, twinkleS:Math.random()*0.035+0.012 };
  }
  if (__fxType === 'snow') {
    for (var sni = 0; sni < 80; sni++) { var sf = mkSnow(); sf.y = Math.random()*UH; snowflakes.push(sf); }
    activateSnowEnv();
  }

  /* ══════════════════════════════════════════════════════
   * S1. SNOW GROUND ACCUMULATION CANVAS
   * ══════════════════════════════════════════════════════ */
  var groundCanvas, groundCtx, groundH = 55;
  var groundPiles = []; // { x, h } สะสมหิมะ
  var GROUND_SEGS = 80;

  function initGround() {
    if (groundCanvas) { groundCanvas.remove(); }
    groundCanvas = document.createElement('canvas');
    groundCanvas.width = window.innerWidth;
    groundCanvas.height = groundH + 10;
    groundCanvas.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;pointer-events:none;z-index:9997;';
    document.body.appendChild(groundCanvas);
    groundCtx = groundCanvas.getContext('2d');
    groundPiles = [];
    var segW = window.innerWidth / GROUND_SEGS;
    for (var gi = 0; gi <= GROUND_SEGS; gi++) {
      groundPiles.push({ x: gi * segW, h: 4 + Math.random() * 6 });
    }
  }

  function growGround(sx) {
    // หิมะตกลง x นั้น → เพิ่มความสูงสะสม
    if (!groundPiles.length) return;
    var segW = (groundCanvas ? groundCanvas.width : window.innerWidth) / GROUND_SEGS;
    var idx = Math.round(sx / segW);
    idx = Math.max(0, Math.min(GROUND_SEGS, idx));
    if (groundPiles[idx]) {
      groundPiles[idx].h = Math.min(groundPiles[idx].h + 0.08, groundH - 4);
      // กระจายให้ข้างๆ ด้วย
      if (groundPiles[idx-1]) groundPiles[idx-1].h = Math.min(groundPiles[idx-1].h + 0.02, groundH - 4);
      if (groundPiles[idx+1]) groundPiles[idx+1].h = Math.min(groundPiles[idx+1].h + 0.02, groundH - 4);
    }
  }

  function drawGround() {
    if (!groundCtx || !groundPiles.length) return;
    var w = groundCanvas.width, h = groundCanvas.height;
    groundCtx.clearRect(0, 0, w, h);

    // วาดพื้นหิมะ
    groundCtx.beginPath();
    groundCtx.moveTo(0, h);
    for (var gi2 = 0; gi2 < groundPiles.length; gi2++) {
      var p = groundPiles[gi2];
      groundCtx.lineTo(p.x, h - p.h);
    }
    groundCtx.lineTo(w, h);
    groundCtx.closePath();

    // gradient ขาวน้ำแข็ง
    var grd = groundCtx.createLinearGradient(0, h - groundH, 0, h);
    grd.addColorStop(0, 'rgba(230,245,255,0.82)');
    grd.addColorStop(0.5, 'rgba(210,235,255,0.92)');
    grd.addColorStop(1, 'rgba(240,250,255,1)');
    groundCtx.fillStyle = grd;
    groundCtx.fill();

    // highlight เส้นขอบบน
    groundCtx.beginPath();
    groundCtx.moveTo(0, h - groundPiles[0].h);
    for (var gi3 = 1; gi3 < groundPiles.length; gi3++) {
      groundCtx.lineTo(groundPiles[gi3].x, h - groundPiles[gi3].h);
    }
    groundCtx.strokeStyle = 'rgba(255,255,255,0.95)';
    groundCtx.lineWidth = 2.5;
    groundCtx.stroke();

    // glow ขอบบน
    groundCtx.beginPath();
    groundCtx.moveTo(0, h - groundPiles[0].h);
    for (var gi4 = 1; gi4 < groundPiles.length; gi4++) {
      groundCtx.lineTo(groundPiles[gi4].x, h - groundPiles[gi4].h);
    }
    groundCtx.strokeStyle = 'rgba(180,220,255,0.45)';
    groundCtx.lineWidth = 6;
    groundCtx.stroke();
  }

  /* S3. FOG + FROST activation */
  function activateSnowEnv() {
    document.body.classList.add('fx-snow-active');
    if (!document.getElementById('fx-fog')) {
      var fog = document.createElement('div');
      fog.id = 'fx-fog';
      document.body.appendChild(fog);
    }
    if (!document.querySelector('.fx-frost-left')) {
      var fl = document.createElement('div'); fl.className = 'fx-frost-left';
      var fr = document.createElement('div'); fr.className = 'fx-frost-right';
      document.body.appendChild(fl);
      document.body.appendChild(fr);
    }
    initGround();
  }

  function deactivateSnowEnv() {
    document.body.classList.remove('fx-snow-active');
    if (groundCanvas) { groundCanvas.remove(); groundCanvas = null; groundCtx = null; groundPiles = []; }
  }

  /* ── SAKURA (ดอกซากุระ) ── */
  var petals = [];
  function mkPetal() {
    return { x:Math.random()*UW, y:-10-Math.random()*UH, r:Math.random()*4+2, speed:Math.random()*0.8+0.4, vx:(Math.random()-0.5)*0.8, wobble:Math.random()*Math.PI*2, ws:(Math.random()-0.5)*0.025, rot:Math.random()*Math.PI*2, rotS:(Math.random()-0.5)*0.04, opacity:Math.random()*0.55+0.3 };
  }
  if (__fxType === 'sakura') {
    for (var pi2 = 0; pi2 < 45; pi2++) { var pt = mkPetal(); pt.y = Math.random()*UH; petals.push(pt); }
  }

  /* ── TULIP (กลีบทิวลิปร่วง) ── */
  var tulips = [];
  var TULIP_COLORS = [
    [255, 100, 140],  // ชมพูร้อน
    [220,  60, 100],  // แดงกุหลาบ
    [180,  60, 200],  // ม่วงสด
    [255, 140, 180],  // ชมพูอ่อน
    [200,  80, 230],  // ม่วงอ่อน
    [255,  80, 120],  // แดงสด
    [240, 120, 200],  // ชมพูกลาง
  ];
  function mkTulip() {
    var col = TULIP_COLORS[Math.floor(Math.random() * TULIP_COLORS.length)];
    return {
      x:       Math.random() * UW,
      y:       -20 - Math.random() * UH,
      r:       Math.random() * 5 + 4,        // ขนาดกลีบ 4–9 px
      speed:   Math.random() * 0.6 + 0.3,
      vx:      (Math.random() - 0.5) * 0.7,
      wobble:  Math.random() * Math.PI * 2,
      ws:      (Math.random() - 0.5) * 0.018,
      rot:     Math.random() * Math.PI * 2,
      rotS:    (Math.random() - 0.5) * 0.03,
      opacity: Math.random() * 0.55 + 0.35,
      col:     col,
      phase:   Math.random() * Math.PI * 2,  // for petal shape variation
    };
  }
  function drawTulipPetal(ctx, tp) {
    ctx.save();
    ctx.translate(tp.x, tp.y);
    ctx.rotate(tp.rot);
    ctx.globalAlpha = tp.opacity;
    var r = tp.r;
    var col = tp.col;
    // กลีบหลัก (ellipse หัวทู่)
    var grd = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
    grd.addColorStop(0, 'rgba(' + (col[0]+30) + ',' + (col[1]+20) + ',' + (col[2]+20) + ',1)');
    grd.addColorStop(0.6, 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.92)');
    grd.addColorStop(1,   'rgba(' + Math.max(col[0]-40,0) + ',' + Math.max(col[1]-30,0) + ',' + Math.max(col[2]-30,0) + ',0.5)');
    ctx.beginPath();
    // กลีบทิวลิปรูปไข่–ปลายมน (bezier curve)
    ctx.moveTo(0, -r * 1.3);
    ctx.bezierCurveTo( r * 0.95, -r * 0.9,  r * 0.85,  r * 0.5,  0,  r * 0.9);
    ctx.bezierCurveTo(-r * 0.85,  r * 0.5, -r * 0.95, -r * 0.9,  0, -r * 1.3);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();
    // เส้นกลีบ (vein)
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.3);
    ctx.lineTo(0, r * 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(r * 0.1, 0.5);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
  if (__fxType === 'tulip') {
    for (var ti = 0; ti < 50; ti++) { var tp0 = mkTulip(); tp0.y = Math.random() * UH; tulips.push(tp0); }
  }

  /* ── ONEKO (แมวไล่เมาส์) — โหลด script แยก ── */
  if (__fxType === 'oneko') {
    (function() {
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/oneko@1.1.0/oneko.js';
      s.async = true;
      document.head.appendChild(s);
    })();
  }

  /* ── 14. PARTICLE BURST pool ── */
  var bursts = [];
  function spawnBurst(x, y) {
    var rgb = accentRGB();
    for (var i = 0; i < 28; i++) {
      var angle = (Math.PI*2/28)*i + (Math.random()-0.5)*0.6;
      var speed = Math.random()*4.5+1.5;
      bursts.push({ x:x, y:y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed-2.5, r:Math.random()*3.5+1.2, life:1, decay:Math.random()*0.018+0.012, rgb:rgb });
    }
  }

  /* ── SANTA (แซนต้าบินผ่าน ทุก 5-7 วิ) ── */
  var santaState = {
    active: false,       // false = กำลังพักรอรอบถัดไป
    sleeping: true,      // true = รอก่อนบิน
    sleepUntil: performance.now() + (2000 + Math.random()*2000), // บินรอบแรกใน ~2-4 วิ
    x: -300,
    y: 0,
    vx: 4.2,   // บวก=ขวา, ลบ=ซ้าย
    dir: 1,    // 1=ขวา, -1=ซ้าย
    bob: 0,
    trail: [],
    gifts: [],
    nextFly: 0
  };
  var santaTick = 0;
  santaState.y = (window.innerHeight || 600) * (0.06 + Math.random() * 0.12);

  /* ══ ฟังก์ชัน helper วาด star shape ══ */
  function drawStar(ctx, cx, cy, r, pts, inner) {
    var step = Math.PI / pts;
    ctx.beginPath();
    for (var ii = 0; ii < pts * 2; ii++) {
      var rad = (ii % 2 === 0) ? r : inner;
      var angle = ii * step - Math.PI / 2;
      if (ii === 0) ctx.moveTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
      else ctx.lineTo(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
    }
    ctx.closePath();
  }

  function drawReindeer(ctx, rdx, rdy, ri2, now) {
    var legPh = now * 0.007 + ri2 * 1.5;
    var isRudolph = ri2 === 0;
    var sc = 1.35; // scale ใหญ่ขึ้น
    ctx.save();
    ctx.translate(rdx, rdy);
    ctx.scale(sc, sc);

    // shadow ใต้ตัว
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(0, 20, 16, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // body gradient ลึก สวยขึ้น
    var bodyGrad = ctx.createLinearGradient(-16,-8,16,8);
    bodyGrad.addColorStop(0,'#C8723A');
    bodyGrad.addColorStop(0.45,'#A0522D');
    bodyGrad.addColorStop(1,'#6B3012');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0.08, 0, Math.PI*2); ctx.fill();

    // belly spot น่ารักขึ้น
    var bellyGrad = ctx.createRadialGradient(3,3,0,3,3,9);
    bellyGrad.addColorStop(0,'rgba(230,195,155,0.55)');
    bellyGrad.addColorStop(1,'rgba(210,175,130,0)');
    ctx.fillStyle = bellyGrad;
    ctx.beginPath(); ctx.ellipse(3, 3, 9, 5, 0.1, 0, Math.PI*2); ctx.fill();

    // neck gradient
    var neckGrad = ctx.createLinearGradient(10,-8,18,-2);
    neckGrad.addColorStop(0,'#B06030'); neckGrad.addColorStop(1,'#8B4513');
    ctx.fillStyle = neckGrad;
    ctx.beginPath(); ctx.ellipse(15, -6, 5.5, 3.2, 0.5, 0, Math.PI*2); ctx.fill();

    // head gradient
    var headGrad = ctx.createRadialGradient(20,-10,1,20,-10,7);
    headGrad.addColorStop(0,'#C8723A'); headGrad.addColorStop(1,'#9A4820');
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.ellipse(21, -10, 7, 5.5, -0.25, 0, Math.PI*2); ctx.fill();

    // snout
    var snoutGrad = ctx.createRadialGradient(25,-9,0,25,-9,4);
    snoutGrad.addColorStop(0,'#DDA060'); snoutGrad.addColorStop(1,'#B07840');
    ctx.fillStyle = snoutGrad;
    ctx.beginPath(); ctx.ellipse(25, -9, 4, 3, -0.15, 0, Math.PI*2); ctx.fill();

    // nose
    if (isRudolph) {
      // Rudolph: nose glow pulse
      var pulse = 0.7 + Math.sin(now * 0.006) * 0.3;
      ctx.save();
      ctx.shadowColor = '#FF3333'; ctx.shadowBlur = 18 * pulse;
      var noseGrad = ctx.createRadialGradient(28,-9,0,28,-9,4);
      noseGrad.addColorStop(0,'#FF6060'); noseGrad.addColorStop(1,'#CC0000');
      ctx.fillStyle = noseGrad;
      ctx.beginPath(); ctx.arc(28, -9, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // glow ring ซ้อน 2 ชั้น
      ctx.strokeStyle = 'rgba(255,100,100,'+(0.5*pulse)+')'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(28, -9, 5.5, 0, Math.PI*2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,150,150,'+(0.25*pulse)+')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(28, -9, 8, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = '#E8B8B8';
      ctx.beginPath(); ctx.arc(28, -9, 2.8, 0, Math.PI*2); ctx.fill();
    }

    // antlers - เพิ่มกิ่งสวยขึ้น
    ctx.save();
    ctx.strokeStyle = '#5C2D0A'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    // antler หน้า
    ctx.beginPath(); ctx.moveTo(22,-13); ctx.lineTo(25,-24); ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(25,-20); ctx.lineTo(30,-25); ctx.moveTo(25,-20); ctx.lineTo(22,-26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(27,-16); ctx.lineTo(31,-19); ctx.stroke();
    // antler หลัง
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(17,-13); ctx.lineTo(20,-22); ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(20,-18); ctx.lineTo(24,-22); ctx.moveTo(20,-18); ctx.lineTo(17,-23); ctx.stroke();
    ctx.restore();

    // ear ขนฟู
    ctx.fillStyle = '#A05028';
    ctx.beginPath(); ctx.ellipse(17,-13,3,2,-0.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#E8A878';
    ctx.beginPath(); ctx.ellipse(17,-13,1.8,1.2,-0.8,0,Math.PI*2); ctx.fill();

    // eye น่ารักมากขึ้น — ตาใหญ่ + iris + ขนตาสวย
    ctx.fillStyle = '#1a0800';
    ctx.beginPath(); ctx.arc(21,-11,3,0,Math.PI*2); ctx.fill();
    // iris สีน้ำตาลอมทอง
    ctx.fillStyle = '#7B4010';
    ctx.beginPath(); ctx.arc(21,-11,1.8,0,Math.PI*2); ctx.fill();
    // pupil
    ctx.fillStyle = '#0a0400';
    ctx.beginPath(); ctx.arc(21.2,-11,1.1,0,Math.PI*2); ctx.fill();
    // แวว 2 จุด
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(22,-12,0.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20.5,-10.5,0.4,0,Math.PI*2); ctx.fill();
    // ขนตา curved
    ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(19.5,-13.5); ctx.quadraticCurveTo(21,-14.5,22.5,-13.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(23,-12.5); ctx.lineTo(24.5,-13.5); ctx.stroke();

    // blush แก้มน่ารัก
    ctx.fillStyle = 'rgba(255,160,140,0.35)';
    ctx.beginPath(); ctx.ellipse(19,-8,3.5,2,0,0,Math.PI*2); ctx.fill();

    // smile เล็กน้อย
    ctx.strokeStyle = 'rgba(100,40,10,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(25,-7,2,0.1,Math.PI*0.8); ctx.stroke();

    // tail ฟู
    var tailGrad = ctx.createRadialGradient(-15,0,0,-15,0,5);
    tailGrad.addColorStop(0,'#FFFAF0'); tailGrad.addColorStop(1,'rgba(245,222,179,0.5)');
    ctx.fillStyle = tailGrad;
    ctx.beginPath(); ctx.ellipse(-15,0,5,4,-0.2,0,Math.PI*2); ctx.fill();

    // scarf น่ารัก (ผ้าพันคอ)
    ctx.fillStyle = '#D44040';
    ctx.beginPath(); ctx.ellipse(13,-4,4,2.5,0.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FF6666';
    // ลายจุดบน scarf
    ctx.beginPath(); ctx.arc(12,-4,0.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(14.5,-3,0.8,0,Math.PI*2); ctx.fill();

    // legs gallop สวย 4 ขา
    ctx.strokeStyle = '#7a3b10'; ctx.lineWidth = 2.8; ctx.lineCap = 'round';
    var lxPos = [-9,-3,3,9];
    var lphase = [0, Math.PI, Math.PI*0.5, Math.PI*1.5];
    for (var lg=0; lg<4; lg++) {
      var ang = Math.sin(legPh + lphase[lg]) * 0.62;
      var lx2 = lxPos[lg];
      var kx = lx2 + Math.sin(ang)*9, ky = 9;
      var fx = kx + Math.sin(ang*0.6)*7, fy = 18;
      // upper leg gradient
      ctx.strokeStyle = '#8B4513';
      ctx.beginPath(); ctx.moveTo(lx2, 7); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.strokeStyle = '#6B3010';
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      // กีบมน
      ctx.fillStyle = '#2a1008';
      ctx.beginPath(); ctx.ellipse(fx, fy+1.5, 3.5, 2, ang*0.3, 0, Math.PI*2); ctx.fill();
      // กีบ shine
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.ellipse(fx-0.5, fy, 1.5, 0.8, ang*0.3, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  }

  function drawSantaScene(ctx, x, y, dir) {
    dir = dir || -1; // default ซ้าย
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1); // flip ทั้ง scene ตามทิศทาง
    var now = Date.now();
    var reinCount = 3, reinSpacing = 62;

    // harness เชือกสวยขึ้น gradient
    for (var ri=0; ri<reinCount; ri++) {
      var rdxR = -(ri+1)*reinSpacing - 22;
      var rdyR = Math.sin(now*0.0025+ri*1.2)*7 - 6;
      var fromX = -24, fromY = -4;
      var toX = rdxR*1.35 + 20, toY = rdyR - 6;
      var midX = (fromX+toX)/2;
      var midY = Math.min(fromY, toY) - 8;
      // เชือก gradient สีทองแดง
      var ropeGrad = ctx.createLinearGradient(fromX, fromY, toX, toY);
      ropeGrad.addColorStop(0,'rgba(180,120,40,0.9)');
      ropeGrad.addColorStop(0.5,'rgba(210,160,60,0.8)');
      ropeGrad.addColorStop(1,'rgba(160,100,30,0.9)');
      ctx.strokeStyle = ropeGrad;
      ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fromX, fromY);
      ctx.quadraticCurveTo(midX, midY, toX, toY);
      ctx.stroke();
      // เชือก shine
      ctx.strokeStyle = 'rgba(255,220,100,0.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(fromX, fromY);
      ctx.quadraticCurveTo(midX, midY-1, toX, toY);
      ctx.stroke();
      // bell เล็กๆ บนเชือก
      var bellX = (fromX+toX)*0.4, bellY = midY + (midY - Math.min(fromY,toY))*0.7 + 4;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(bellX, bellY, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#AA8800';
      ctx.beginPath(); ctx.arc(bellX, bellY+2, 3, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,200,0.7)';
      ctx.beginPath(); ctx.arc(bellX-0.8, bellY-0.8, 1, 0, Math.PI*2); ctx.fill();
    }

    // กวาง
    for (var ri2=0; ri2<reinCount; ri2++) {
      var rdx = -(ri2+1)*reinSpacing - 22;
      var rdy = Math.sin(now*0.0025+ri2*1.2)*7 - 6;
      drawReindeer(ctx, rdx, rdy, ri2, now);
    }

    // ── Sleigh - อัปเกรดสวยขึ้น ──

    // shadow sleigh
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(12, 25, 32, 6, 0, 0, Math.PI*2); ctx.fill();

    // runners ทอง 3D
    var runnerGrad1 = ctx.createLinearGradient(-24,18,44,18);
    runnerGrad1.addColorStop(0,'#AA7800'); runnerGrad1.addColorStop(0.4,'#FFE566'); runnerGrad1.addColorStop(1,'#CC9900');
    ctx.strokeStyle = runnerGrad1; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-24,20); ctx.bezierCurveTo(-8,34,20,32,44,20); ctx.stroke();
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-18,16); ctx.bezierCurveTo(-4,28,16,26,38,16); ctx.stroke();
    // runner shine
    ctx.strokeStyle = 'rgba(255,240,120,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-22,19); ctx.bezierCurveTo(-6,31,18,29,42,19); ctx.stroke();

    // sleigh body — gradient แดงลึก
    var sleighGrad = ctx.createLinearGradient(-18,14,40,-16);
    sleighGrad.addColorStop(0,'#D01515'); sleighGrad.addColorStop(0.5,'#B80000'); sleighGrad.addColorStop(1,'#7A0000');
    ctx.fillStyle = sleighGrad;
    ctx.beginPath();
    ctx.moveTo(-16,14);
    ctx.bezierCurveTo(-8,22,22,20,40,12);
    ctx.bezierCurveTo(44,-2,36,-12,22,-16);
    ctx.bezierCurveTo(6,-20,-10,-10,-16,14);
    ctx.fill();

    // sleigh highlight ด้านบน
    ctx.fillStyle = 'rgba(255,100,100,0.22)';
    ctx.beginPath();
    ctx.moveTo(-12,10); ctx.bezierCurveTo(2,16,24,14,36,8);
    ctx.bezierCurveTo(38,2,30,-6,20,-12);
    ctx.bezierCurveTo(6,-14,-8,-6,-12,10);
    ctx.fill();

    // ลายดาวบน sleigh (ลาย emboss)
    ctx.save();
    ctx.fillStyle = 'rgba(255,180,180,0.18)';
    drawStar(ctx, 12, 0, 7, 5, 3.5);
    ctx.fill();
    drawStar(ctx, 28, -5, 5, 5, 2.5);
    ctx.fill();
    ctx.restore();

    // front curl ทอง สวยขึ้น
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-16,14); ctx.bezierCurveTo(-26,4,-20,-6,-12,-8); ctx.bezierCurveTo(-4,-10,-6,4,-16,14); ctx.stroke();
    // curl shine
    ctx.strokeStyle = 'rgba(255,240,100,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-15,12); ctx.bezierCurveTo(-24,4,-19,-4,-12,-6); ctx.stroke();

    // gold trim ขอบบน เพิ่ม double line
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-10,-7); ctx.bezierCurveTo(8,-18,26,-16,34,-12); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,120,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-9,-9); ctx.bezierCurveTo(8,-20,26,-18,33,-14); ctx.stroke();

    // ถุงของขวัญ — สวยขึ้น
    var bagGrad = ctx.createRadialGradient(5,-5,1,5,-1,13);
    bagGrad.addColorStop(0,'#CC2222'); bagGrad.addColorStop(0.6,'#991111'); bagGrad.addColorStop(1,'#5A0000');
    ctx.fillStyle = bagGrad;
    ctx.beginPath(); ctx.ellipse(5,-1,10,11,-0.12,0,Math.PI*2); ctx.fill();
    // shine ถุง
    ctx.fillStyle = 'rgba(255,180,180,0.2)';
    ctx.beginPath(); ctx.ellipse(3,-4,5,4,-0.3,0,Math.PI*2); ctx.fill();
    // ริบบิ้นถุง
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-3,-9); ctx.lineTo(13,-9); ctx.moveTo(5,-15); ctx.lineTo(5,-3); ctx.stroke();
    // โบว์น่ารัก
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.ellipse(2,-11,4,2.5,-0.4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8,-11,4,2.5,0.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFE566'; ctx.beginPath(); ctx.arc(5,-11,2,0,Math.PI*2); ctx.fill();
    // star บนถุง
    ctx.fillStyle = 'rgba(255,240,150,0.6)';
    drawStar(ctx, 5, 3, 4, 5, 2);
    ctx.fill();

    // ── Santa ── ขนาดใหญ่ขึ้น สวยขึ้น

    // shadow santa
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.ellipse(24,22,11,3,0,0,Math.PI*2); ctx.fill();

    // ตัว gradient แดงลึก
    var bodyGrad2 = ctx.createRadialGradient(20,-4,2,20,-2,13);
    bodyGrad2.addColorStop(0,'#FF4040'); bodyGrad2.addColorStop(0.5,'#CC0000'); bodyGrad2.addColorStop(1,'#880000');
    ctx.fillStyle = bodyGrad2;
    ctx.beginPath(); ctx.ellipse(22,-4,11,12,0,0,Math.PI*2); ctx.fill();
    // ไฮไลท์ด้านหน้า
    ctx.fillStyle = 'rgba(255,140,140,0.18)';
    ctx.beginPath(); ctx.ellipse(19,-6,7,8,-0.2,0,Math.PI*2); ctx.fill();

    // ขนสีขาว fur trim สวย
    ctx.save();
    ctx.shadowColor = 'rgba(200,220,255,0.4)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#F0F5FF';
    ctx.beginPath(); ctx.ellipse(22,-15,11,3.5,0,0,Math.PI*2); ctx.fill(); // ปก
    ctx.beginPath(); ctx.ellipse(22,7,10,3,0,0,Math.PI*2); ctx.fill(); // ชายล่าง
    ctx.shadowBlur = 0; ctx.restore();

    // เข็มขัด gradient
    var beltGrad = ctx.createLinearGradient(12,0,38,0);
    beltGrad.addColorStop(0,'#1a1a1a'); beltGrad.addColorStop(0.5,'#333'); beltGrad.addColorStop(1,'#1a1a1a');
    ctx.fillStyle = beltGrad;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(12,-3,20,5,2) : ctx.fillRect(12,-3,20,5);
    ctx.fill();
    // หัวเข็มขัดทอง 3D
    var buckleGrad = ctx.createLinearGradient(18,-3,26,3);
    buckleGrad.addColorStop(0,'#FFE566'); buckleGrad.addColorStop(0.5,'#CC9900'); buckleGrad.addColorStop(1,'#FFE566');
    ctx.fillStyle = buckleGrad;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(19,-3.5,7,6,1.5) : ctx.fillRect(19,-3.5,7,6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,100,0.6)';
    ctx.beginPath(); ctx.fillRect(20,-2,2,3);
    ctx.fillRect(22.5,-2,2,3);

    // ขา + รองเท้า
    ctx.fillStyle = '#990000';
    ctx.beginPath(); ctx.ellipse(17,13,5,6,0.12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(26,14,5,6,-0.12,0,Math.PI*2); ctx.fill();
    // รองเท้าหนัง gradient
    var shoeGrad = ctx.createLinearGradient(10,15,22,20);
    shoeGrad.addColorStop(0,'#2a2a2a'); shoeGrad.addColorStop(1,'#0a0a0a');
    ctx.fillStyle = shoeGrad;
    ctx.beginPath(); ctx.ellipse(15,19,7,3,0.1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(26,20,7,3,-0.1,0,Math.PI*2); ctx.fill();
    // shoe shine
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.ellipse(13.5,18,3,1.2,0.1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24.5,19,3,1.2,-0.1,0,Math.PI*2); ctx.fill();

    // หัว Santa — ใหญ่ขึ้น น่ารักขึ้น
    var faceGrad = ctx.createRadialGradient(22,-18,1,22,-18,10);
    faceGrad.addColorStop(0,'#FECAB8'); faceGrad.addColorStop(1,'#F0A090');
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.arc(22,-19,10,0,Math.PI*2); ctx.fill();
    // แก้มชมพู glow
    ctx.save();
    ctx.shadowColor = 'rgba(255,100,100,0.3)'; ctx.shadowBlur = 6;
    ctx.fillStyle = 'rgba(255,120,120,0.45)';
    ctx.beginPath(); ctx.ellipse(16,-17,4.5,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28,-17,4.5,3,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();

    // จมูก cute
    ctx.fillStyle = '#E87060';
    ctx.beginPath(); ctx.ellipse(22,-16,3,2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,200,0.5)';
    ctx.beginPath(); ctx.arc(21,-16.5,1,0,Math.PI*2); ctx.fill();

    // หมวกสวยขึ้น gradient + ขอบ fur
    var hatGrad = ctx.createLinearGradient(14,-22,30,-44);
    hatGrad.addColorStop(0,'#EE1111'); hatGrad.addColorStop(1,'#990000');
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(14,-24);
    ctx.bezierCurveTo(16,-30,20,-36,25,-42);
    ctx.bezierCurveTo(28,-46,33,-42,28,-34);
    ctx.bezierCurveTo(30,-28,33,-24,36,-22);
    ctx.lineTo(14,-24); ctx.closePath(); ctx.fill();
    // หมวก highlight
    ctx.fillStyle = 'rgba(255,120,120,0.2)';
    ctx.beginPath();
    ctx.moveTo(16,-26); ctx.bezierCurveTo(18,-31,21,-36,25,-41);
    ctx.bezierCurveTo(23,-38,20,-32,18,-27); ctx.closePath(); ctx.fill();
    // ขอบหมวก fur glow
    ctx.save();
    ctx.shadowColor = 'rgba(200,220,255,0.5)'; ctx.shadowBlur = 8;
    ctx.fillStyle = '#F0F5FF';
    ctx.beginPath(); ctx.ellipse(24,-24,13,4,0,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
    // ปอมๆ glow + ดาว
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.6)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(25,-43,4.5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
    // ดาวบนปอม
    ctx.fillStyle = 'rgba(255,220,100,0.7)';
    drawStar(ctx, 25,-43,3,4,1.5);
    ctx.fill();

    // เครา gradient ฟู — น่ารัก
    var beardGrad = ctx.createRadialGradient(22,-10,2,22,-8,10);
    beardGrad.addColorStop(0,'#FFFFFF'); beardGrad.addColorStop(1,'rgba(220,235,255,0.9)');
    ctx.fillStyle = beardGrad;
    ctx.beginPath(); ctx.ellipse(22,-11,9,7,0,0,Math.PI); ctx.fill();
    // curl เครา
    ctx.strokeStyle = 'rgba(200,215,240,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(17,-10,3,Math.PI*1.3,Math.PI*0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(27,-10,3,Math.PI*1.7,-Math.PI*0.3); ctx.stroke();
    // หนวด
    ctx.fillStyle = '#F0F5FF';
    ctx.beginPath(); ctx.ellipse(19,-21,3.5,1.5,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(25,-21,3.5,1.5,-0.3,0,Math.PI*2); ctx.fill();

    // ตา น่ารักมาก — ตาใหญ่ + sparkling
    ctx.fillStyle = '#1a0800';
    ctx.beginPath(); ctx.arc(18,-21,2.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(26,-21,2.8,0,Math.PI*2); ctx.fill();
    // iris
    ctx.fillStyle = '#3D1A00';
    ctx.beginPath(); ctx.arc(18,-21,1.8,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(26,-21,1.8,0,Math.PI*2); ctx.fill();
    // แวว 2 จุดต่อตา
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(19,-22,0.9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(17.5,-20.5,0.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(27,-22,0.9,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25.5,-20.5,0.5,0,Math.PI*2); ctx.fill();
    // ขนตา curved cute
    ctx.strokeStyle = '#1a0800'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(15.5,-23); ctx.quadraticCurveTo(18,-24.5,20.5,-23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(23.5,-23); ctx.quadraticCurveTo(26,-24.5,28.5,-23); ctx.stroke();
    // smile
    ctx.strokeStyle = 'rgba(150,60,30,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(22,-17,4,0.2,Math.PI-0.2); ctx.stroke();

    // แขนโบกมือ animation
    var wAng = Math.sin(now*0.004)*0.65 - 0.25;
    ctx.save(); ctx.translate(32,-12); ctx.rotate(wAng);
    var armGrad = ctx.createLinearGradient(-2,-14,2,2);
    armGrad.addColorStop(0,'#FF4040'); armGrad.addColorStop(1,'#CC0000');
    ctx.fillStyle = armGrad;
    ctx.beginPath(); ctx.ellipse(0,-7,4.5,11,0,0,Math.PI*2); ctx.fill();
    // fur ข้อมือ
    ctx.fillStyle = '#F0F5FF';
    ctx.beginPath(); ctx.ellipse(0,-17,4.5,2,0,0,Math.PI*2); ctx.fill();
    // มือ + ถุงมือ
    var gloveGrad = ctx.createRadialGradient(-0.5,-22,0,-0.5,-22,5);
    gloveGrad.addColorStop(0,'#FECAB8'); gloveGrad.addColorStop(1,'#E09080');
    ctx.fillStyle = gloveGrad;
    ctx.beginPath(); ctx.arc(0,-22,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#F0F5FF'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0,-22,5,0,Math.PI*2); ctx.stroke();
    // นิ้วมือ
    ctx.fillStyle = '#FECAB8';
    ctx.beginPath(); ctx.arc(-3,-26,2.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0,-27,2.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(3,-26,2.2,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // แขนซ้าย (จับบังเหียน)
    var armL = ctx.createLinearGradient(10,-16,18,-2);
    armL.addColorStop(0,'#FF4040'); armL.addColorStop(1,'#CC0000');
    ctx.fillStyle = armL;
    ctx.beginPath(); ctx.ellipse(15,-9,4,10,-0.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F0F5FF';
    ctx.beginPath(); ctx.ellipse(12,-17,4,2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FECAB8';
    ctx.beginPath(); ctx.arc(11,-20,4.5,0,Math.PI*2); ctx.fill();

    ctx.restore();
  }

  function drawGift(ctx, gx, gy, spin, col, rib, w, h) {
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(spin);
    var sc = 1.3;
    ctx.scale(sc, sc);
    // shadow
    ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, h/2+3, w*0.55, 3.5, 0, 0, Math.PI*2); ctx.fill();
    // box body gradient
    var boxGrad = ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
    boxGrad.addColorStop(0, col);
    boxGrad.addColorStop(1, col.replace(/rgb|rgba/, '').replace('(','').replace(')','').split(',').length > 0 ? shiftColor(col,-40) : '#660000');
    ctx.fillStyle = col;
    // กล่องมุมมน
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,3); ctx.fill();
    } else {
      ctx.fillRect(-w/2,-h/2,w,h);
    }
    // shine ด้านบนซ้าย
    ctx.fillStyle='rgba(255,255,255,0.2)';
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h*0.4,3); ctx.fill();
    } else {
      ctx.fillRect(-w/2,-h/2,w,h*0.4);
    }
    // ribbon vertical
    ctx.fillStyle=rib; ctx.fillRect(-2.5,-h/2,5,h);
    // ribbon horizontal
    ctx.fillRect(-w/2,-2.5,w,5);
    // ribbon shine
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(-1.5,-h/2,2,h);
    // bow - น่ารักขึ้น 3D
    ctx.fillStyle = rib;
    ctx.beginPath(); ctx.ellipse(-6,-h/2,6,3.5,-0.55,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6,-h/2,6,3.5,0.55,0,Math.PI*2); ctx.fill();
    // bow shine
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(-6,-h/2-0.5,3,1.5,-0.55,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6,-h/2-0.5,3,1.5,0.55,0,Math.PI*2); ctx.fill();
    // bow knot
    ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(0,-h/2,3,0,Math.PI*2); ctx.fill();
    // star deco บนกล่อง
    ctx.fillStyle='rgba(255,255,255,0.25)';
    drawStar(ctx,0,1,4,5,2);
    ctx.fill();
    ctx.restore();
  }

  function shiftColor(hex, amt) {
    // ทำให้สีเข้มขึ้น (fallback)
    return '#660000';
  }

  var giftColors=[['#CC2200','#FFD700'],['#006622','#FF6666'],['#0044BB','#FFEE44'],['#7700AA','#EEEEFF'],['#BB6600','#DD2200'],['#CC0055','#AAFFAA'],['#008888','#FFD700'],['#9900CC','#FFCC00']];

  /* ── UNIFIED rAF LOOP ── */
  function unifiedLoop() {
    if (++colorTimer > 180) { sharedRgb = accentRGB(); colorTimer = 0; }
    uCtx.clearRect(0, 0, UW, UH);
    var r = sharedRgb[0], g = sharedRgb[1], b = sharedRgb[2];

    /* Rain */
    if (drops.length) {
      uCtx.lineCap = 'round';
      for (var j = 0; j < drops.length; j++) {
        var dp = drops[j];
        uCtx.beginPath(); uCtx.strokeStyle = 'rgba('+r+','+g+','+b+','+dp.opacity+')'; uCtx.lineWidth = dp.width;
        uCtx.moveTo(dp.x, dp.y); uCtx.lineTo(dp.x+dp.angle*dp.len, dp.y+dp.len); uCtx.stroke();
        dp.x += dp.angle; dp.y += dp.speed;
        if (dp.y > UH+dp.len) drops[j] = mkDrop();
      }
    }
    /* Embers */
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      e.wobble += e.ws; e.x += e.vx+Math.sin(e.wobble)*0.28; e.y += e.vy;
      if (e.y < -12) { embers[i] = mkEmber(); continue; }
      uCtx.beginPath(); uCtx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      uCtx.fillStyle = 'rgba('+r+','+g+','+b+','+e.opacity+')'; uCtx.fill();
    }
    /* Snow — wind tick */
    if (snowflakes.length) tickWind();
    /* Snow */
    for (var sj = 0; sj < snowflakes.length; sj++) {
      var sf2 = snowflakes[sj];
      sf2.wobble += sf2.ws; sf2.rot += sf2.rotS; sf2.twinkle += sf2.twinkleS;
      sf2.x += sf2.vx + Math.sin(sf2.wobble)*0.38 + windForce * (sf2.r * 0.28);
      sf2.y += sf2.speed;
      if (sf2.y > UH+10) { growGround(sf2.x); snowflakes[sj] = mkSnow(); continue; }
      var twF = 0.75+Math.sin(sf2.twinkle)*0.25;
      uCtx.save(); uCtx.globalAlpha = sf2.opacity*twF;
      if (sf2.type === 'flake' && sf2.r >= 2.5) {
        uCtx.save(); uCtx.translate(sf2.x, sf2.y); uCtx.rotate(sf2.rot);
        var grd=uCtx.createRadialGradient(0,0,0,0,0,sf2.r*2.2);
        grd.addColorStop(0,'rgba(220,240,255,0.22)'); grd.addColorStop(1,'rgba(220,240,255,0)');
        uCtx.beginPath(); uCtx.arc(0,0,sf2.r*2.2,0,Math.PI*2); uCtx.fillStyle=grd; uCtx.fill();
        uCtx.strokeStyle='rgba(225,242,255,0.95)'; uCtx.lineWidth=Math.max(sf2.r*0.19,0.8); uCtx.lineCap='round';
        for (var arm=0; arm<6; arm++) {
          uCtx.save(); uCtx.rotate(arm*Math.PI/3);
          uCtx.beginPath(); uCtx.moveTo(0,0); uCtx.lineTo(0,-sf2.r); uCtx.stroke();
          var bl=sf2.r*0.38, bp=sf2.r*0.55;
          uCtx.beginPath(); uCtx.moveTo(0,-bp); uCtx.lineTo(bl*0.65,-bp-bl*0.45); uCtx.moveTo(0,-bp); uCtx.lineTo(-bl*0.65,-bp-bl*0.45); uCtx.stroke();
          uCtx.restore();
        }
        uCtx.beginPath(); uCtx.arc(0,0,sf2.r*0.2,0,Math.PI*2); uCtx.fillStyle='rgba(255,255,255,0.95)'; uCtx.fill();
        uCtx.restore();
      } else {
        var gd=uCtx.createRadialGradient(sf2.x,sf2.y,0,sf2.x,sf2.y,sf2.r);
        gd.addColorStop(0,'rgba(255,255,255,1)'); gd.addColorStop(0.5,'rgba(220,235,255,0.85)'); gd.addColorStop(1,'rgba(200,220,255,0)');
        uCtx.beginPath(); uCtx.arc(sf2.x,sf2.y,sf2.r,0,Math.PI*2); uCtx.fillStyle=gd; uCtx.fill();
      }
      uCtx.globalAlpha=1; uCtx.restore();
    }
    /* Santa */
    santaTick++;
    if (__fxType === 'snow') {
      // wake santa เมื่อครบเวลา sleep
      if (santaState.sleeping && performance.now() >= santaState.sleepUntil) {
        santaState.sleeping = false;
        santaState.active   = true;
        santaState.gifts    = []; santaState.trail = [];
        santaState.dir      = (Math.random() < 0.5) ? 1 : -1;
        if (santaState.dir === 1) {
          santaState.x  = -320;
          santaState.vx = 3.8 + Math.random()*1.4;
        } else {
          santaState.x  = UW + 320;
          santaState.vx = -(3.8 + Math.random()*1.4);
        }
        santaState.y   = UH * (0.06 + Math.random()*0.13);
        santaState.bob = 0;
      }
      // gifts ตกต่อแม้ santa ออกจากหน้าแล้ว
      for (var gi=santaState.gifts.length-1; gi>=0; gi--) {
        var gf=santaState.gifts[gi]; gf.vy+=0.25; gf.x+=gf.vx; gf.y+=gf.vy; gf.spin+=gf.spinS;
        if (gf.y > UH+40) { santaState.gifts.splice(gi,1); continue; }
        drawGift(uCtx, gf.x, gf.y, gf.spin, gf.col, gf.rib, gf.w, gf.h);
      }
      // แซนต้าบินผ่านครั้งละรอบ แล้วพัก 5-7 วิ
      if (santaState.active) {
        santaState.bob+=0.055; santaState.x+=santaState.vx;
        var sbY=santaState.y+Math.sin(santaState.bob)*8;
        // trail sparkles magic — ดาว + หัวใจ + เกล็ดหิมะ + วงกลม glow
        var trailColors=['#FFD700','#FFFFFF','#FFE066','#FFF0A0','#FFB8C8','#AADDFF','#CCFFEE','#FFE4B5'];
        var trailTypes=['star','heart','snow','glow','star4'];
        if (santaTick%2===0) {
          var tc=trailColors[Math.floor(Math.random()*trailColors.length)];
          var tt=trailTypes[Math.floor(Math.random()*trailTypes.length)];
          // trail ออกด้านหลัง sleigh (ตรงข้ามทิศบิน)
          var trailOffX = santaState.dir === 1
            ? -(50 + Math.random()*30)   // บินขวา → trail ออกซ้าย
            :  (50 + Math.random()*30);  // บินซ้าย → trail ออกขวา
          santaState.trail.push({
            x:santaState.x + trailOffX,
            y:sbY+Math.random()*12-6,
            life:1,
            r:Math.random()*3.5+1.2,
            vx:(Math.random()-0.5)*0.8,
            vy:-0.35-Math.random()*0.25,
            rot:Math.random()*Math.PI*2,
            rotS:(Math.random()-0.5)*0.08,
            col:tc,
            type:tt,
            decay:0.018+Math.random()*0.008
          });
        }
        for (var ti=santaState.trail.length-1; ti>=0; ti--) {
          var tr=santaState.trail[ti];
          tr.life-=tr.decay; tr.y+=tr.vy; tr.x+=tr.vx; tr.rot+=tr.rotS;
          if (tr.life<=0) { santaState.trail.splice(ti,1); continue; }
          var ts=tr.r*(0.5+tr.life*0.5);
          uCtx.save();
          uCtx.globalAlpha=tr.life*0.85;
          uCtx.translate(tr.x,tr.y);
          uCtx.rotate(tr.rot);
          // glow layer
          uCtx.shadowColor=tr.col; uCtx.shadowBlur=ts*3;
          uCtx.fillStyle=tr.col;
          if (tr.type==='star') {
            // 5-point star
            drawStar(uCtx,0,0,ts,5,ts*0.42);
            uCtx.fill();
            // inner bright
            uCtx.globalAlpha=tr.life*0.5;
            uCtx.fillStyle='rgba(255,255,255,0.8)';
            drawStar(uCtx,0,0,ts*0.45,5,ts*0.18);
            uCtx.fill();
          } else if (tr.type==='star4') {
            // 4-point cross star
            drawStar(uCtx,0,0,ts*1.1,4,ts*0.28);
            uCtx.fill();
          } else if (tr.type==='heart') {
            // หัวใจมินิ
            var hs=ts*0.7;
            uCtx.beginPath();
            uCtx.moveTo(0,hs*0.5);
            uCtx.bezierCurveTo(-hs*1.2,-hs*0.3,-hs*1.8,hs*0.8,0,hs*1.8);
            uCtx.bezierCurveTo(hs*1.8,hs*0.8,hs*1.2,-hs*0.3,0,hs*0.5);
            uCtx.fill();
          } else if (tr.type==='snow') {
            // เกล็ดหิมะ 6 แฉก
            uCtx.strokeStyle=tr.col; uCtx.lineWidth=Math.max(ts*0.28,0.8); uCtx.lineCap='round';
            for (var sa=0;sa<6;sa++) {
              uCtx.save(); uCtx.rotate(sa*Math.PI/3);
              uCtx.beginPath(); uCtx.moveTo(0,0); uCtx.lineTo(0,-ts); uCtx.stroke();
              uCtx.beginPath(); uCtx.moveTo(0,-ts*0.55); uCtx.lineTo(ts*0.32,-ts*0.75); uCtx.moveTo(0,-ts*0.55); uCtx.lineTo(-ts*0.32,-ts*0.75); uCtx.stroke();
              uCtx.restore();
            }
            uCtx.beginPath(); uCtx.arc(0,0,ts*0.22,0,Math.PI*2); uCtx.fill();
          } else {
            // glow circle
            var glowGrd=uCtx.createRadialGradient(0,0,0,0,0,ts*1.5);
            glowGrd.addColorStop(0,'rgba(255,255,255,0.9)');
            glowGrd.addColorStop(0.4,tr.col);
            glowGrd.addColorStop(1,'rgba(255,255,255,0)');
            uCtx.fillStyle=glowGrd;
            uCtx.beginPath(); uCtx.arc(0,0,ts*1.5,0,Math.PI*2); uCtx.fill();
          }
          uCtx.shadowBlur=0;
          uCtx.restore();
        }
        // spawn gift ทุก ~40 frames
        if (santaTick%40===0) {
          var gc=giftColors[Math.floor(Math.random()*giftColors.length)];
          var gw=11+Math.random()*8, gh=11+Math.random()*8;
          santaState.gifts.push({x:santaState.x+20, y:sbY+14, vx:santaState.vx*0.25, vy:-(1+Math.random()*0.8), spin:Math.random()*Math.PI*2, spinS:(Math.random()-0.5)*0.12, col:gc[0], rib:gc[1], w:gw, h:gh});
        }
        drawSantaScene(uCtx, santaState.x, sbY, santaState.dir);
        // ออกขอบจอ → เข้า sleep แล้วรอ 5-7 วิก่อนบินรอบถัดไป
        var santaExited = (santaState.dir === 1 && santaState.x > UW + 320)
                       || (santaState.dir === -1 && santaState.x < -320);
        if (santaExited) {
          santaState.active   = false;
          santaState.sleeping = true;
          santaState.trail    = [];
          // sleep 5000-7000 ms
          santaState.sleepUntil = performance.now() + 5000 + Math.random()*2000;
        }
      }
    }
    /* Sakura */
    for (var pk = 0; pk < petals.length; pk++) {
      var pt2 = petals[pk];
      pt2.wobble += pt2.ws; pt2.x += pt2.vx + Math.sin(pt2.wobble)*0.5; pt2.y += pt2.speed; pt2.rot += pt2.rotS;
      if (pt2.y > UH+10) { petals[pk] = mkPetal(); continue; }
      uCtx.save();
      uCtx.translate(pt2.x, pt2.y); uCtx.rotate(pt2.rot);
      uCtx.beginPath();
      uCtx.ellipse(0, 0, pt2.r, pt2.r*0.55, 0, 0, Math.PI*2);
      uCtx.fillStyle = 'rgba(255,170,200,'+pt2.opacity+')'; uCtx.fill();
      uCtx.restore();
    }
    /* Tulip */
    for (var tk = 0; tk < tulips.length; tk++) {
      var tp2 = tulips[tk];
      tp2.wobble += tp2.ws; tp2.x += tp2.vx + Math.sin(tp2.wobble) * 0.55; tp2.y += tp2.speed; tp2.rot += tp2.rotS;
      if (tp2.y > UH + 20) { tulips[tk] = mkTulip(); continue; }
      drawTulipPetal(uCtx, tp2);
    }
    /* Sparkle */
    for (var si = sparks.length-1; si >= 0; si--) {
      var s = sparks[si]; s.x += s.vx; s.y += s.vy; s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(si,1); continue; }
      uCtx.beginPath(); uCtx.arc(s.x, s.y, s.r*s.life, 0, Math.PI*2);
      uCtx.fillStyle = 'rgba('+r+','+g+','+b+','+(s.life*0.75)+')'; uCtx.fill();
    }
    /* Burst */
    for (var bi = bursts.length-1; bi >= 0; bi--) {
      var bst = bursts[bi]; bst.x += bst.vx; bst.y += bst.vy; bst.vy += 0.12; bst.life -= bst.decay;
      if (bst.life <= 0) { bursts.splice(bi,1); continue; }
      uCtx.beginPath(); uCtx.arc(bst.x, bst.y, bst.r*bst.life, 0, Math.PI*2);
      uCtx.fillStyle = 'rgba('+bst.rgb[0]+','+bst.rgb[1]+','+bst.rgb[2]+','+(bst.life*0.9)+')'; uCtx.fill();
    }
    /* Snow Ground */
    if (__fxType === 'snow') drawGround();

    /* Mascot */
    tickMascot();

    requestAnimationFrame(unifiedLoop);
  }
  unifiedLoop();

  window.__FX_CTRL__ = {
    setType: function(t) {
      __fxType = t;
      drops=[]; embers=[]; snowflakes=[]; petals=[]; tulips=[];
      deactivateSnowEnv();
      if(t==='tulip') { for(var tli=0;tli<50;tli++){var tpt=mkTulip();tpt.y=Math.random()*UH;tulips.push(tpt);} }
      mascotState.active = false;
    }
  };
  /* compat กับโค้ดเก่าที่ใช้ __RAIN_CTRL__ */
  window.__RAIN_CTRL__ = {
    stop:   function () { window.__FX_CTRL__.setType('none'); },
    start:  function () { window.__FX_CTRL__.setType('rain'); },
    toggle: function () { window.__FX_CTRL__.setType(__fxType==='rain'?'none':'rain'); },
  };

  /* ═══════════════════════════════════════════════════
   * 7. 3D TILT (desktop)
   * ═══════════════════════════════════════════════════ */
  if (!isTouch) {
    document.querySelectorAll('.product').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var dx = (e.clientX-rect.left-rect.width/2)/(rect.width/2);
        var dy = (e.clientY-rect.top-rect.height/2)/(rect.height/2);
        card.style.transition = 'transform .06s, box-shadow .06s';
        card.style.transform = 'perspective(700px) rotateX('+(-dy*7)+'deg) rotateY('+(dx*7)+'deg) translateY(-6px)';
        card.style.boxShadow = '0 18px 42px rgba(0,0,0,.14), '+(-dx*8)+'px '+(-dy*8)+'px 18px rgba(0,0,0,.07)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transition = 'transform .32s cubic-bezier(.34,1.2,.64,1), box-shadow .32s';
        card.style.transform = ''; card.style.boxShadow = '';
        setTimeout(function () { card.style.transition = ''; }, 350);
      });
    });
  }

  /* ═══════════════════════════════════════════════════
   * 8. IMAGE FADE-IN + SHIMMER
   * ═══════════════════════════════════════════════════ */
  document.querySelectorAll('.product__img').forEach(function (wrap) {
    var img = wrap.querySelector('img');
    if (!img) return;
    img.style.opacity = '0'; img.style.transition = 'opacity .45s ease';
    wrap.classList.add('img-shimmer');
    function reveal() { img.style.opacity = '1'; wrap.classList.remove('img-shimmer'); }
    if (img.complete && img.naturalWidth > 0) { reveal(); }
    else { img.addEventListener('load', reveal, { once:true }); img.addEventListener('error', reveal, { once:true }); }
  });

  /* ═══════════════════════════════════════════════════
   * 9. PAGE TRANSITION FADE
   * ═══════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0)==='#' || a.dataset.noFade!==undefined || a.target==='_blank' ||
        href.indexOf('javascript')===0 || (href.indexOf('http')===0 && href.indexOf(location.hostname)===-1)) return;
    e.preventDefault();
    document.body.style.transition = 'opacity .12s ease';
    document.body.style.opacity = '0';
    setTimeout(function () { location.href = href; }, 120);
  });
  window.addEventListener('pageshow', function () {
    document.body.style.transition = 'opacity .22s ease';
    document.body.style.opacity = '1';
  });

  /* PARALLAX HERO SLIDER — disabled (ทำให้ banner เลื่อนตาม scroll) */

  /* ═══════════════════════════════════════════════════
   * 11. SKELETON SHIMMER ON PRODUCT CARDS
   * ═══════════════════════════════════════════════════ */
  if ('IntersectionObserver' in window) {
    var skelObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('fx-card-visible'); skelObs.unobserve(e.target); }
      });
    }, { threshold:0.08, rootMargin:'0px 0px -30px 0px' });
    document.querySelectorAll('.product').forEach(function (card) { skelObs.observe(card); });
  }

  /* ═══════════════════════════════════════════════════
   * 12. TOAST NOTIFICATION
   * ═══════════════════════════════════════════════════ */
  var toastWrap = document.createElement('div');
  toastWrap.id = 'fx-toast-wrap';
  document.body.appendChild(toastWrap);
  var TOAST_ICONS = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    warn:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  window.toast = function (msg, type, duration) {
    type = type || 'info'; duration = duration || 3200;
    var t = document.createElement('div');
    t.className = 'fx-toast fx-toast--' + type;
    t.innerHTML = '<span class="fx-toast__icon">'+(TOAST_ICONS[type]||TOAST_ICONS.info)+'</span>'
      +'<span class="fx-toast__msg">'+msg+'</span>'+'<div class="fx-toast__bar"></div>';
    toastWrap.appendChild(t);
    var bar = t.querySelector('.fx-toast__bar');
    bar.style.transition = 'width '+duration+'ms linear';
    requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.width = '0%'; }); });
    var remove = function () { t.classList.add('fx-toast--out'); setTimeout(function () { t.remove(); }, 300); };
    t.addEventListener('click', remove);
    setTimeout(remove, duration);
  };

  /* ═══════════════════════════════════════════════════
   * 13. HAPTIC PULSE (mobile)
   * ═══════════════════════════════════════════════════ */
  if (isTouch && navigator.vibrate) {
    document.addEventListener('click', function (e) {
      if (e.target.closest('.product__buy:not(.product__buy--out), .hb-btn, .cat-card__btn, .pkg-card__btn')) navigator.vibrate(8);
    });
  }

  /* ═══════════════════════════════════════════════════
   * 14. PARTICLE BURST — เรียกผ่าน window.fxBurst(x,y)
   * ═══════════════════════════════════════════════════ */
  window.fxBurst = function (x, y) {
    x = x !== undefined ? x : window.innerWidth/2;
    y = y !== undefined ? y : window.innerHeight/2;
    spawnBurst(x, y);
  };
  if (/[?&]bought/.test(location.search)) {
    setTimeout(function () {
      spawnBurst(window.innerWidth/2, window.innerHeight*0.4);
      setTimeout(function () { spawnBurst(window.innerWidth*0.3, window.innerHeight*0.5); }, 160);
      setTimeout(function () { spawnBurst(window.innerWidth*0.7, window.innerHeight*0.45); }, 300);
    }, 400);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.product__buy:not(.product__buy--out)');
    if (!btn) return;
    var rect = btn.getBoundingClientRect();
    spawnBurst(rect.left+rect.width/2, rect.top+rect.height/2);
  });

  /* ═══════════════════════════════════════════════════
   * 15. MAGNETIC BUTTON (desktop)
   * ═══════════════════════════════════════════════════ */
  if (!isTouch) {
    var MAG_R = 50, MAG_STRENGTH = 0.38, magBtns = [];
    function initMagnets() { magBtns = Array.prototype.slice.call(document.querySelectorAll('.product__buy:not(.product__buy--out), .hb-btn--solid')); }
    initMagnets();
    document.addEventListener('mousemove', function (e) {
      var mx = e.clientX, my = e.clientY;
      magBtns.forEach(function (btn) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
        var dx = mx-cx, dy = my-cy, dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < MAG_R) {
          var pull = (1-dist/MAG_R)*MAG_STRENGTH;
          btn.style.transform = 'translate('+(dx*pull)+'px,'+(dy*pull)+'px)';
          btn.style.transition = 'transform .08s ease';
        } else if (btn.style.transform) {
          btn.style.transform = ''; btn.style.transition = 'transform .32s cubic-bezier(.34,1.2,.64,1)';
        }
      });
    });
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) { if (muts[i].addedNodes.length) { initMagnets(); break; } }
      }).observe(document.body, { childList:true, subtree:true });
    }
  }

  /* ═══════════════════════════════════════════════════
   * 16. STOCK COUNTDOWN URGENCY
   * ═══════════════════════════════════════════════════ */
  var LOW_THRESHOLD = 10;
  function applyStockUrgency(el) {
    var n = parseInt(el.dataset.count, 10);
    if (isNaN(n)) return;
    var ptag = el.closest('.ptag--stock');
    if (!ptag) return;
    if (n <= 0) return;
    if (n <= LOW_THRESHOLD) {
      ptag.classList.add('ptag--stock-low');
      if (!ptag.querySelector('.stock-pulse')) {
        var dot = document.createElement('span'); dot.className = 'stock-pulse';
        ptag.insertBefore(dot, ptag.firstChild);
      }
    }
  }
  document.querySelectorAll('.fx-count[data-count]').forEach(applyStockUrgency);

  /* ═══════════════════════════════════════════════════
   * A. GLASSMORPHISM NAV — เพิ่ม class เมื่อ scroll
   * ═══════════════════════════════════════════════════ */
  var navEl = document.querySelector('.nav');
  if (navEl) {
    window.addEventListener('scroll', function () {
      navEl.classList.toggle('nav--scrolled', window.scrollY > 40);
    }, { passive:true });
  }

  /* ═══════════════════════════════════════════════════
   * B. TYPING ANIMATION — hero subtitle
   *    ต้องมี data-typing="ข้อความ" บน .hero-overlay__sub
   *    หรืออ่านจาก textContent เดิม
   * ═══════════════════════════════════════════════════ */
  (function () {
    var el = document.querySelector('.hero-overlay__sub');
    if (!el) return;
    var text = el.dataset.typing || el.textContent.trim();
    if (!text) return;
    el.textContent = '';
    el.classList.add('typing-active');
    var i = 0;
    var SPEED = 48; // ms ต่ออักขระ
    function typeNext() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(typeNext, SPEED);
      } else {
        // หยุดกระพริบหลัง 3 วิ
        setTimeout(function () { el.classList.remove('typing-active'); }, 3000);
      }
    }
    // delay ก่อนเริ่ม พอ hero โหลดขึ้นมา
    setTimeout(typeNext, 800);
  })();

  /* ═══════════════════════════════════════════════════
   * C. CONFETTI BURST เมื่อซื้อสำเร็จ
   *    ใช้ canvas-confetti CDN (โหลด lazy)
   *    trigger เมื่อ URL มี ?bought=1 หรือ .alert-ok ปรากฏ
   * ═══════════════════════════════════════════════════ */
  function lazyConfetti(cb) {
    if (window.confetti) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }
  function fireConfetti() {
    lazyConfetti(function () {
      var rgb = accentRGB();
      var hexAccent = '#' + rgb.map(function (c) { return ('0'+c.toString(16)).slice(-2); }).join('');
      window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 }, colors: [hexAccent, '#ffffff', '#f59e0b', '#ec4899'] });
      setTimeout(function () {
        window.confetti({ particleCount: 60, spread: 120, origin: { x: 0.2, y: 0.6 }, colors: [hexAccent,'#60a5fa'] });
        window.confetti({ particleCount: 60, spread: 120, origin: { x: 0.8, y: 0.6 }, colors: [hexAccent,'#34d399'] });
      }, 250);
    });
  }
  // trigger จาก ?bought=1
  if (/[?&]bought/.test(location.search)) {
    setTimeout(fireConfetti, 500);
  }
  // trigger จาก .alert-ok ที่มี "สำเร็จ" ใน text
  (function () {
    var alerts = document.querySelectorAll('.alert-ok');
    alerts.forEach(function (a) {
      if (a.textContent.indexOf('สำเร็จ') >= 0 || a.textContent.indexOf('เรียบร้อย') >= 0) {
        setTimeout(fireConfetti, 400);
      }
    });
  })();
  // expose API
  window.fxConfetti = fireConfetti;

  /* ═══════════════════════════════════════════════════
   * D. LIVE VIEWERS บนหน้า product.php
   *    หา .live-viewers__count แล้ว animate ตัวเลข
   * ═══════════════════════════════════════════════════ */
  (function () {
    var el = document.querySelector('.live-viewers__count');
    if (!el) return;
    var base = parseInt(el.dataset.base || el.textContent, 10) || 0;
    var current = base;
    function flicker() {
      // สุ่ม ±1-3 รอบ 8-18 วินาที ให้รู้สึก realtime
      var delta = Math.floor(Math.random() * 5) - 2;
      current = Math.max(1, current + delta);
      el.textContent = current;
      setTimeout(flicker, 8000 + Math.random() * 10000);
    }
    setTimeout(flicker, 5000);
  })();

  /* ═══════════════════════════════════════════════════
   * E. CATEGORY FILTER PILLS (AJAX-style, no reload)
   *    ต้องมี .cat-filter__pill[data-cat="id|all"]
   *    และ .product[data-cat="category_id"]
   * ═══════════════════════════════════════════════════ */
  (function () {
    var pills = document.querySelectorAll('.cat-filter__pill');
    if (!pills.length) return;
    var grid = document.getElementById('productGrid');
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product'));

    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var cat = pill.dataset.cat || 'all';

        // active state
        pills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');

        // fade out
        grid.classList.add('filtering');

        setTimeout(function () {
          cards.forEach(function (card) {
            var cardCat = card.dataset.cat || '';
            if (cat === 'all' || cardCat === cat) {
              card.style.display = '';
            } else {
              card.style.display = 'none';
            }
          });
          grid.classList.remove('filtering');
          grid.classList.add('filtered');
          setTimeout(function () { grid.classList.remove('filtered'); }, 300);
        }, 180);
      });
    });
  })();

  /* ═══════════════════════════════════════════════════
   * F. PRODUCT CARD FLIP
   *    กดปุ่ม .product-flip__toggle จะ toggle flip
   *    desktop: hover flip ก็ได้ (optional)
   * ═══════════════════════════════════════════════════ */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.product-flip__toggle');
    if (!toggle) return;
    e.preventDefault(); e.stopPropagation();
    var card = toggle.closest('.product-flip');
    if (card) card.classList.toggle('is-flipped');
  });
  // click นอกการ์ด flip → flip กลับ
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.product-flip')) {
      document.querySelectorAll('.product-flip.is-flipped').forEach(function (c) {
        c.classList.remove('is-flipped');
      });
    }
  });

  /* ═══════════════════════════════════════════════════
   * G. SCROLL PROGRESS BAR
   * ═══════════════════════════════════════════════════ */
  (function () {
    var bar = document.createElement('div');
    bar.id = 'fx-scroll-progress';
    document.body.appendChild(bar);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollTop = window.scrollY || document.documentElement.scrollTop;
          var docH = document.documentElement.scrollHeight - window.innerHeight;
          var pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
          bar.style.width = pct.toFixed(1) + '%';
          ticking = false;
        });
        ticking = true;
      }
    }, { passive:true });
  })();

  /* ═══════════════════════════════════════════════════
   * H. HOT / NEW BADGE INJECT อัตโนมัติ
   *    อ่านจาก data-badge="hot|new|sale" บน .product
   *    หรือ data-sold="n" data-days="n" ที่ PHP render
   * ═══════════════════════════════════════════════════ */
  (function () {
    document.querySelectorAll('.product[data-badge]').forEach(function (card) {
      var type = card.dataset.badge;
      if (!type) return;
      if (card.querySelector('.product__badge')) return; // มีแล้ว

      var badge = document.createElement('div');
      badge.className = 'product__badge product__badge--' + type;

      var svgStar = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
      var svgFire = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-2-1-3.5-2-5 0 3-2 4-3 4 1-2 0-5 0-8z"/></svg>';
      var svgTag  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7H7.01"/></svg>';
      var icons  = { hot: svgFire, new: svgStar, sale: svgTag };
      var labels = { hot: 'HOT', new: 'แนะนำ', sale: 'SALE' };

      badge.innerHTML = (icons[type] || '') + ' ' + (labels[type] || type.toUpperCase());

      // ใส่ข้างในรูป (position: absolute ทำงานได้เพราะ .product มี position:relative แล้ว)
      var imgWrap = card.querySelector('.product__img');
      if (imgWrap) { imgWrap.style.position = 'relative'; imgWrap.appendChild(badge); }
      else { card.style.position = 'relative'; card.appendChild(badge); }
    });
  })();

  /* ═══════════════════════════════════════════════════
   * I. ONLINE DOT WRAP — ห่อ .nav__bal-ava ด้วย wrapper
   *    (ถ้ายังไม่มี wrapper ให้ JS สร้างให้)
   * ═══════════════════════════════════════════════════ */
  (function () {
    var ava = document.querySelector('.nav__bal-ava');
    if (!ava || ava.parentElement.classList.contains('nav__bal-ava-wrap')) return;
    var wrap = document.createElement('span');
    wrap.className = 'nav__bal-ava-wrap';
    ava.parentNode.insertBefore(wrap, ava);
    wrap.appendChild(ava);
  })();

  /* ══════════════════════════════════════════════════════
   * S5. MASCOT ELF — Rexzy-style, วาดด้วย Canvas
   *     เดินไปมาขอบล่างจอ พักแล้วโบกมือ
   * ══════════════════════════════════════════════════════ */
  var mascotCanvas = document.createElement('canvas');
  mascotCanvas.id = 'fx-mascot-canvas';
  var MC_W = 110, MC_H = 140;
  mascotCanvas.width  = MC_W;
  mascotCanvas.height = MC_H;
  // offset ให้หนีปุ่ม contact (bottom:116px บน mobile)
  var MC_BASE_BOTTOM = window.innerWidth <= 767 ? 120 : 0;
  mascotCanvas.style.cssText = [
    'position:fixed', 'bottom:'+MC_BASE_BOTTOM+'px', 'left:50%',
    'width:'+MC_W+'px', 'height:'+MC_H+'px',
    'pointer-events:none', 'z-index:10000',
    'transition:opacity .5s'
  ].join(';');
  document.body.appendChild(mascotCanvas);
  var mCtx = mascotCanvas.getContext('2d');

  var mascotState = {
    active: (__fxType === 'snow'),
    x: window.innerWidth - MC_W - 24,   // pixel pos ของ canvas left
    dir: -1,            // -1 = เดินซ้าย, +1 = เดินขวา
    speed: 0.9,
    phase: 0,           // เฟส walk animation
    action: 'walk',     // 'walk' | 'idle' | 'wave'
    actionTimer: 0,
    bobY: 0,
    groundH_px: 0       // ความสูงพื้นหิมะที่ x ของ mascot
  };

  // รับ groundH ที่ x จาก groundPiles
  function getGroundAt(worldX) {
    if (!groundPiles.length || !groundCanvas) return 0;
    var segW = groundCanvas.width / GROUND_SEGS;
    var idx = Math.round(worldX / segW);
    idx = Math.max(0, Math.min(GROUND_SEGS, idx));
    return groundPiles[idx] ? groundPiles[idx].h : 0;
  }

  function drawElf(ctx, frame, action, dir, t) {
    ctx.clearRect(0, 0, MC_W, MC_H);

    // ─── pivot ที่กลางล่าง ───
    ctx.save();
    ctx.translate(MC_W / 2, MC_H - 2);

    var scale = dir; // -1 = เดินซ้าย, +1 = เดินขวา
    ctx.scale(scale, 1);

    // ── bob ขึ้นลง ──
    var walkY = action === 'walk' ? Math.sin(frame * 0.32) * 2.5 : 0;
    ctx.translate(0, walkY);

    // ─── BOOTS & LEGS ───────────────────────────────────
    var legSwing = action === 'walk' ? Math.sin(frame * 0.32) * 16 : 0;
    ctx.lineCap = 'round';

    // เนื้อขาใต้กระโปรง — เส้นสีขาว (stockings)
    ctx.strokeStyle = '#eee8dc'; ctx.lineWidth = 7.5;
    ctx.save();
    ctx.rotate((legSwing * Math.PI) / 180);
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-8, 15); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate((-legSwing * Math.PI) / 180);
    ctx.beginPath(); ctx.moveTo(8, -4); ctx.lineTo(8, 15); ctx.stroke();
    ctx.restore();

    // บู๊ทแดงปลายม้วน
    ctx.save();
    ctx.rotate((legSwing * Math.PI) / 180);
    // boot shaft left
    ctx.fillStyle = '#c0172a';
    ctx.beginPath();
    ctx.moveTo(-10,13); ctx.lineTo(-2,13); ctx.quadraticCurveTo(0,13,0,16);
    ctx.lineTo(0,20); ctx.quadraticCurveTo(0,23,-2,23); ctx.lineTo(-13,23);
    ctx.quadraticCurveTo(-15,23,-15,20); ctx.lineTo(-15,16);
    ctx.quadraticCurveTo(-15,13,-13,13); ctx.closePath(); ctx.fill();
    // boot sole
    ctx.fillStyle = '#8B0000';
    ctx.beginPath(); ctx.ellipse(-8, 22, 8, 3, 0.1, 0, Math.PI*2); ctx.fill();
    // boot toe curl
    ctx.fillStyle = '#c0172a';
    ctx.beginPath(); ctx.ellipse(-2, 21, 4, 2.5, -0.3, 0, Math.PI*2); ctx.fill();
    // boot fur trim
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(-8, 14, 6, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate((-legSwing * Math.PI) / 180);
    ctx.fillStyle = '#c0172a';
    ctx.beginPath();
    ctx.moveTo(2,13); ctx.lineTo(10,13); ctx.quadraticCurveTo(13,13,13,16);
    ctx.lineTo(13,20); ctx.quadraticCurveTo(13,23,10,23); ctx.lineTo(2,23);
    ctx.quadraticCurveTo(0,23,0,20); ctx.lineTo(0,16);
    ctx.quadraticCurveTo(0,13,2,13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8B0000';
    ctx.beginPath(); ctx.ellipse(8, 22, 8, 3, -0.1, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c0172a';
    ctx.beginPath(); ctx.ellipse(14, 21, 4, 2.5, 0.3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(8, 14, 6, 2, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // ─── SKIRT / COAT BODY ───────────────────────────────
    // กระโปรงหางเสื้อ (flare)
    var skirtBob = action === 'walk' ? Math.sin(frame * 0.32) * 2 : 0;
    // เงา (shadow glob)
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.beginPath(); ctx.ellipse(0, 5, 20, 5, 0, 0, Math.PI*2); ctx.fill();

    // coat body gradient
    var coatGrad = ctx.createLinearGradient(-22, 0, 22, 0);
    coatGrad.addColorStop(0, '#9e1212');
    coatGrad.addColorStop(0.35, '#d42020');
    coatGrad.addColorStop(0.65, '#cc1818');
    coatGrad.addColorStop(1, '#8a0e0e');
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.moveTo(-21, 2 + skirtBob);
    ctx.bezierCurveTo(-24, -10, -20, -32, 0, -38);
    ctx.bezierCurveTo(20, -32, 24, -10, 21, 2 + skirtBob);
    ctx.closePath();
    ctx.fill();

    // coat highlight (left side rim light)
    ctx.fillStyle = 'rgba(255,120,120,0.18)';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.bezierCurveTo(-22, -14, -18, -32, -5, -37);
    ctx.bezierCurveTo(-12, -28, -14, -14, -16, 0);
    ctx.closePath();
    ctx.fill();

    // fur trim ขอบล่างเสื้อ
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(-21, 2 + skirtBob);
    ctx.bezierCurveTo(-18, 8+skirtBob, 18, 8+skirtBob, 21, 2+skirtBob);
    ctx.bezierCurveTo(18, -2+skirtBob, -18, -2+skirtBob, -21, 2+skirtBob);
    ctx.fill();
    // fur texture dots
    ctx.fillStyle = 'rgba(200,200,200,0.4)';
    for (var fd=-16; fd<=16; fd+=6) {
      ctx.beginPath(); ctx.arc(fd, 3+skirtBob, 1.2, 0, Math.PI*2); ctx.fill();
    }

    // กระดุม 3 เม็ด
    var btnColors = ['#FFD700','#FFF176','#FFD700'];
    for (var bi=0; bi<3; bi++) {
      ctx.fillStyle = btnColors[bi];
      ctx.beginPath(); ctx.arc(0, -8 - bi*8, 2.2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(180,130,0,0.5)';
      ctx.beginPath(); ctx.arc(0.5, -7.5 - bi*8, 1, 0, Math.PI*2); ctx.fill();
    }

    // ─── ARMS ────────────────────────────────────────────
    var armSwing = action === 'walk' ? -Math.sin(frame * 0.32) * 20 : 0;
    var waveAng  = action === 'wave' ? Math.sin(t * 0.075) * 40 - 45 : 0;
    var idleAng  = action === 'idle' ? Math.sin(t * 0.04) * 5 : 0;

    // ─ แขนขวา (foreground) ─
    ctx.save();
    ctx.translate(20, -28);
    ctx.rotate(((armSwing + waveAng + idleAng) * Math.PI) / 180);
    // sleeve
    var sleeveGrad = ctx.createLinearGradient(-5,0,5,0);
    sleeveGrad.addColorStop(0,'#b01010'); sleeveGrad.addColorStop(1,'#d42020');
    ctx.fillStyle = sleeveGrad;
    ctx.beginPath(); ctx.ellipse(0, 9, 5.5, 11, 0, 0, Math.PI*2); ctx.fill();
    // sleeve fur cuff
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(0, 18, 6, 2.5, 0, 0, Math.PI*2); ctx.fill();
    // มือ (น่ารัก มีนิ้วหัวแม่มือ)
    ctx.fillStyle = '#f5b075';
    ctx.beginPath(); ctx.arc(0, 24, 5.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-5.5, 22, 2, 3, -0.5, 0, Math.PI*2); ctx.fill(); // thumb
    // เมื่อ wave ถือดาวหิมะ
    if (action === 'wave') {
      ctx.fillStyle = 'rgba(200,235,255,0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄', 0, 32);
    }
    ctx.restore();

    // ─ แขนซ้าย (background) ─
    ctx.save();
    ctx.translate(-20, -28);
    ctx.rotate(((-armSwing + idleAng*0.7) * Math.PI) / 180);
    ctx.fillStyle = '#9a0e0e';
    ctx.beginPath(); ctx.ellipse(0, 9, 5, 11, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.ellipse(0, 18, 5.5, 2.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e8985a';
    ctx.beginPath(); ctx.arc(0, 24, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // ─── HEAD ────────────────────────────────────────────
    // หู ยาวแหลม elf (สีน่ารักขึ้น + inner ear)
    ctx.fillStyle = '#f5a870';
    ctx.beginPath(); ctx.moveTo(-15, -40); ctx.lineTo(-24, -52); ctx.lineTo(-8, -43); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -40);  ctx.lineTo(24, -52);  ctx.lineTo(8, -43);  ctx.closePath(); ctx.fill();
    // inner ear
    ctx.fillStyle = 'rgba(255,150,120,0.4)';
    ctx.beginPath(); ctx.moveTo(-14,-42); ctx.lineTo(-20,-50); ctx.lineTo(-10,-44); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(14,-42);  ctx.lineTo(20,-50);  ctx.lineTo(10,-44);  ctx.closePath(); ctx.fill();

    // หน้า (กลม น่ารัก)
    var faceGrad = ctx.createRadialGradient(-3, -48, 2, 0, -44, 16);
    faceGrad.addColorStop(0, '#fdd5a0');
    faceGrad.addColorStop(1, '#f0964a');
    ctx.fillStyle = faceGrad;
    ctx.beginPath(); ctx.arc(0, -44, 16, 0, Math.PI*2); ctx.fill();

    // ─── หมวก elf ───────────────────────────────────────
    // hat body gradient
    var hatGrad = ctx.createLinearGradient(-16, -55, 16, -55);
    hatGrad.addColorStop(0,'#9e1212'); hatGrad.addColorStop(0.5,'#d62020'); hatGrad.addColorStop(1,'#9e1212');
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(-17, -51);
    ctx.bezierCurveTo(-12, -68, -4, -80, 0, -88);
    ctx.bezierCurveTo(4, -80, 12, -68, 17, -51);
    ctx.closePath();
    ctx.fill();

    // hat highlight
    ctx.fillStyle = 'rgba(255,120,120,0.22)';
    ctx.beginPath();
    ctx.moveTo(-14, -53);
    ctx.bezierCurveTo(-10, -66, -3, -78, 0, -86);
    ctx.bezierCurveTo(-2, -80, -8, -68, -12, -56);
    ctx.closePath();
    ctx.fill();

    // hat snowflake badge
    ctx.fillStyle = 'rgba(200,235,255,0.88)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄', -4, -65);

    // ปลายหมวกแกว่ง + pompom
    var hatTip = Math.sin(t * 0.045) * 7;
    var hatTipY = -88 + Math.cos(t * 0.045) * 3;
    // pom-pom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.arc(hatTip*0.7, hatTipY+3, 5, 0, Math.PI*2); ctx.fill();
    // pom-pom white
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(hatTip, hatTipY, 5.5, 0, Math.PI*2); ctx.fill();
    // pom-pom shine
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(hatTip-1.5, hatTipY-2, 2, 0, Math.PI*2); ctx.fill();

    // hat brim (fur)
    ctx.fillStyle = 'rgba(255,255,255,0.93)';
    ctx.beginPath(); ctx.ellipse(0, -51, 18, 4.5, 0, 0, Math.PI*2); ctx.fill();
    // fur texture
    ctx.fillStyle = 'rgba(200,200,200,0.35)';
    for (var hf=-14; hf<=14; hf+=5) {
      ctx.beginPath(); ctx.arc(hf, -51, 1.5, 0, Math.PI*2); ctx.fill();
    }

    // ─── FACE details ────────────────────────────────────
    if (action === 'wave' || action === 'idle') {
      // ตาหลับ ยิ้มสดใส
      ctx.strokeStyle = '#5a2800'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      // ตา (closed happy arc)
      ctx.beginPath(); ctx.arc(-6, -45, 4.5, Math.PI+0.45, Math.PI*2-0.45); ctx.stroke();
      ctx.beginPath(); ctx.arc(6, -45, 4.5, Math.PI+0.45, Math.PI*2-0.45); ctx.stroke();
      // ขนตาบน
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-10,-49); ctx.lineTo(-8,-51); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5,-50); ctx.lineTo(-5,-52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5,-50); ctx.lineTo(5,-52); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10,-49); ctx.lineTo(8,-51); ctx.stroke();
      // ยิ้มกว้าง
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, -40, 7, 0.15, Math.PI-0.15); ctx.stroke();
      // ฟัน
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(0, -34, 4, 0, Math.PI); ctx.fill();
    } else {
      // ตาโต (walk mode — ตื่นตัว)
      // ตาขาว
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.ellipse(-6, -45, 4, 4.5, -0.1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(6, -45, 4, 4.5, 0.1, 0, Math.PI*2); ctx.fill();
      // ม่านตาน้ำเงิน (น่ารัก)
      ctx.fillStyle = '#3a78c9';
      ctx.beginPath(); ctx.arc(-6, -45, 2.8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -45, 2.8, 0, Math.PI*2); ctx.fill();
      // กลางตาดำ
      ctx.fillStyle = '#1a0a00';
      ctx.beginPath(); ctx.arc(-6, -45, 1.6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -45, 1.6, 0, Math.PI*2); ctx.fill();
      // แวว
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(-5.2,-46.2, 0.9, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(6.8,-46.2, 0.9, 0, Math.PI*2); ctx.fill();
      // คิ้ว (ตั้งใจ)
      ctx.strokeStyle = '#5a2800'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-10.5,-50); ctx.quadraticCurveTo(-6,-49.5,-3,-50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10.5,-50); ctx.quadraticCurveTo(6,-49.5,3,-50); ctx.stroke();
      // ปากเล็กน้อย
      ctx.beginPath(); ctx.arc(0,-40,3.5,0.3,Math.PI-0.3); ctx.stroke();
    }

    // แก้มสีชมพู (น่ารัก + มีประกาย)
    ctx.fillStyle = 'rgba(255,110,100,0.3)';
    ctx.beginPath(); ctx.ellipse(-10, -40, 5.5, 3.5, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -40, 5.5, 3.5, -0.2, 0, Math.PI*2); ctx.fill();
    // แววแก้ม
    ctx.fillStyle = 'rgba(255,200,200,0.55)';
    ctx.beginPath(); ctx.arc(-9, -41, 1.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -41, 1.8, 0, Math.PI*2); ctx.fill();

    // จุดไฝน่ารัก
    ctx.fillStyle = 'rgba(150,80,30,0.5)';
    ctx.beginPath(); ctx.arc(9, -37, 1.2, 0, Math.PI*2); ctx.fill();

    ctx.restore();
  }

  var mascotFrame = 0, mascotT = 0;

  function tickMascot() {
    if (!mascotState.active) {
      mascotCanvas.style.opacity = '0';
      return;
    }
    mascotCanvas.style.opacity = '1';

    mascotT++;
    mascotFrame++;
    mascotState.actionTimer--;

    // เลือก action
    if (mascotState.actionTimer <= 0) {
      var roll = Math.random();
      if (mascotState.action === 'walk') {
        if (roll < 0.35) {
          mascotState.action = 'idle';
          mascotState.actionTimer = 90 + Math.floor(Math.random() * 90);
        } else if (roll < 0.55) {
          mascotState.action = 'wave';
          mascotState.actionTimer = 120 + Math.floor(Math.random() * 80);
        } else {
          mascotState.dir *= -1; // เปลี่ยนทิศ
          mascotState.actionTimer = 60 + Math.floor(Math.random() * 180);
        }
      } else {
        mascotState.action = 'walk';
        mascotState.actionTimer = 180 + Math.floor(Math.random() * 240);
      }
    }

    // เดิน
    if (mascotState.action === 'walk') {
      mascotState.x += mascotState.dir * mascotState.speed;
      // ชนขอบ
      var maxX = window.innerWidth - MC_W - 8;
      if (mascotState.x < 8) { mascotState.x = 8; mascotState.dir = 1; }
      if (mascotState.x > maxX) { mascotState.x = maxX; mascotState.dir = -1; }
    }

    // อัปเดต canvas left
    mascotCanvas.style.left = mascotState.x + 'px';

    // คำนวณ groundH ที่ตำแหน่งนั้น + offset หนีปุ่ม contact บน mobile
    var gh = getGroundAt(mascotState.x + MC_W / 2);
    mascotCanvas.style.bottom = (MC_BASE_BOTTOM + gh) + 'px';

    // วาด
    drawElf(mCtx, mascotFrame, mascotState.action, mascotState.dir, mascotT);
  }

  // init visibility
  if (!mascotState.active) mascotCanvas.style.opacity = '0';

  // resize update
  window.addEventListener('resize', function () {
    MC_BASE_BOTTOM = window.innerWidth <= 767 ? 120 : 0;
    if (groundCanvas) { groundCanvas.width = window.innerWidth; groundPiles = []; initGround(); }
  }, { passive: true });

  /* ══════════════════════════════════════════════════════
   * S6. CARD HOVER SNOW BURST — หิมะระเบิดออกจากการ์ดสินค้า
   * ══════════════════════════════════════════════════════ */
  var snowSymbols = ['❄','❅','❆','✦','·','⬥'];
  var _cardThrottle = 0;

  document.addEventListener('mousemove', function (e) {
    if (__fxType !== 'snow') return;
    if (isTouch) return;
    _cardThrottle++;
    if (_cardThrottle % 8 !== 0) return;

    var card = e.target.closest('.product');
    if (!card) return;

    var rect = card.getBoundingClientRect();
    var relX = e.clientX - rect.left;
    var relY = e.clientY - rect.top;

    // สร้าง snowflake element บนการ์ด
    var flake = document.createElement('span');
    flake.className = 'fx-card-snow-flake';
    flake.textContent = snowSymbols[Math.floor(Math.random() * snowSymbols.length)];
    flake.style.left = relX + 'px';
    flake.style.top  = relY + 'px';
    flake.style.fontSize = (8 + Math.random() * 8) + 'px';
    flake.style.animationDuration = (1.2 + Math.random() * 0.8) + 's';
    // ให้ card มี position: relative (มีอยู่แล้ว)
    card.style.position = 'relative';
    card.appendChild(flake);
    setTimeout(function () { flake.remove(); }, 2000);
  }, { passive: true });

  /* ── Product image click snow burst ── */
  document.addEventListener('click', function (e) {
    if (__fxType !== 'snow') return;
    var img = e.target.closest('.product__img');
    if (!img) return;
    var rect = img.getBoundingClientRect();
    var cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    var card = img.closest('.product');
    if (!card) return;
    for (var si = 0; si < 6; si++) {
      (function (i) {
        setTimeout(function () {
          var f = document.createElement('span');
          f.className = 'fx-card-snow-flake';
          f.textContent = snowSymbols[Math.floor(Math.random() * snowSymbols.length)];
          var angle = (i / 6) * Math.PI * 2;
          f.style.left = (cx + Math.cos(angle) * 12) + 'px';
          f.style.top  = (cy + Math.sin(angle) * 10) + 'px';
          f.style.fontSize = (10 + Math.random() * 8) + 'px';
          f.style.animationDuration = (1.4 + Math.random() * 0.6) + 's';
          card.appendChild(f);
          setTimeout(function () { f.remove(); }, 2200);
        }, i * 40);
      })(si);
    }
  }, { passive: true });

})();
