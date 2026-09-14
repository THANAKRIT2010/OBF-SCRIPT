let scriptsData = [], teamData = [], robloxCatalog = [], currentUser = null, siteSettings = {};
let activeCommentScriptId = null, editingScriptId = null, currentVaultUnlockCode = null, currentAdminSubtab = 'overview';

function esc(str){ if(str===null||str===undefined) return ''; return String(str).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// โดเมนย่อยที่ให้บริการลิงก์ raw ของ vault (ใช้กับ loadstring(game:HttpGet("https://api.flexozy.xyz/CODE")))
// รูปแบบใหม่: https://api.flexozy.xyz/CODE แทนของเดิม https://flexozy.xyz/raw/vault/CODE
const VAULT_API_HOST = 'api.flexozy.xyz';
function vaultRawUrl(code){ return `https://${VAULT_API_HOST}/${encodeURIComponent(code)}`; }

// ===================== PIN ชั้นที่สองสำหรับหน้าแอดมิน (ถ้าเซิร์ฟเวอร์ตั้งค่า ADMIN_PANEL_PIN ไว้) =====================
// ดัก fetch ทุกจุดของเว็บ: ถ้า API ไหนตอบ 403 { error:'pin_required' } (เฉพาะ endpoint ของแอดมินเต็มเท่านั้น)
// ให้เด้งหน้าต่างขอ PIN ขึ้นมาทันที โดยไม่ต้องไปแก้โค้ดแอดมินทุกจุดทีละฟังก์ชัน
(function(){
  const nativeFetch = window.fetch.bind(window);
  let pinModalOpen = false;
  window.fetch = async function(...args){
    const res = await nativeFetch(...args);
    if (res.status === 403 && !pinModalOpen) {
      res.clone().json().then(data=>{
        if (data && data.error === 'pin_required') showAdminPinModal();
      }).catch(()=>{});
    }
    return res;
  };
  window.showAdminPinModal = function(){
    if (pinModalOpen) return;
    pinModalOpen = true;
    const overlay = document.createElement('div');
    overlay.className = 'ntf-overlay ntf-show';
    overlay.innerHTML = `
      <div class="ntf-box">
        <div class="ntf-icon warning"><i class="fa-solid fa-lock"></i></div>
        <div class="ntf-title">ยืนยันตัวตนเพิ่มเติม</div>
        <div class="ntf-text">หน้านี้ต้องกรอกรหัส PIN สำหรับแอดมินก่อนใช้งาน</div>
        <input id="adminPinInput" type="password" inputmode="numeric" maxlength="12" autocomplete="off"
          class="input-dark w-full rounded-lg px-3 py-2.5 text-center text-lg tracking-[6px] mb-3" placeholder="PIN">
        <div class="ntf-btns">
          <button class="ntf-btn ntf-btn-cancel" id="adminPinCancel">ยกเลิก</button>
          <button class="ntf-btn ntf-btn-confirm" id="adminPinSubmit">ยืนยัน</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#adminPinInput');
    setTimeout(()=>input.focus(), 50);
    function close(){ overlay.remove(); pinModalOpen = false; }
    overlay.querySelector('#adminPinCancel').addEventListener('click', ()=>{ close(); showView('scripts'); navigate('/scripts'); });
    async function submit(){
      const pin = input.value.trim();
      if (!pin) return;
      try{
        const res = await nativeFetch('/api/admin/verify-pin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin }) });
        const data = await res.json().catch(()=>({}));
        if (!res.ok) { notifyToast('error', data.message || 'PIN ไม่ถูกต้อง'); input.value=''; input.focus(); return; }
        notifyToast('success', 'ยืนยัน PIN สำเร็จ');
        close();
        if (typeof currentAdminSubtab !== 'undefined') adminTab(currentAdminSubtab);
      }catch(e){ notifyToast('error', 'ยืนยัน PIN ไม่สำเร็จ'); }
    }
    overlay.querySelector('#adminPinSubmit').addEventListener('click', submit);
    input.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') submit(); });
  };
})();

// ใช้ tokenizer highlightLua() ตัวเดียวกับที่ใช้แสดงผลโค้ด Vault/Admin แบบอ่านอย่างเดียว (ประกาศไว้ด้านล่างของไฟล์นี้ แต่ function declaration ถูก hoisted ใช้ได้เลย)
function attachLuaHighlight(textareaId){
  const textarea = document.getElementById(textareaId);
  if (!textarea || textarea.dataset.luaAttached) return;
  textarea.dataset.luaAttached = '1';
  const wrap = document.createElement('div');
  wrap.className = 'lua-highlight-wrap';
  textarea.parentNode.insertBefore(wrap, textarea);
  const bg = document.createElement('div'); bg.className = 'lua-bg';
  const pre = document.createElement('pre');
  pre.className = textarea.className.replace(/\bcode-area\b/,'').trim() + ' lua-highlight-layer';
  wrap.appendChild(bg); wrap.appendChild(pre); wrap.appendChild(textarea);
  function sync(){
    pre.innerHTML = highlightLua(textarea.value) + '\n';
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
  }
  textarea.addEventListener('input', sync);
  textarea.addEventListener('scroll', ()=>{ pre.scrollTop = textarea.scrollTop; pre.scrollLeft = textarea.scrollLeft; });
  sync();
}
// ใช้เรียกทุกครั้งที่ตั้งค่า .value ของ textarea ด้วยโค้ด (ไม่ได้พิมพ์เอง) เพราะ input event จะไม่ยิงเอง
function resyncLua(textareaId){
  const textarea = document.getElementById(textareaId);
  if (textarea) textarea.dispatchEvent(new Event('input'));
}

// ทำสีโค้ด Lua/Luau ตอนแสดงผลแบบอ่านอย่างเดียว (ไม่กระทบโค้ดจริงที่ใช้ loadstring ซึ่งยังเป็น plain text เหมือนเดิม)
const LUA_KEYWORDS = new Set(['and','break','do','else','elseif','end','for','function','if','in','local','not','or','repeat','return','then','until','while','continue','export','type','typeof']);
const LUA_CONSTS = new Set(['nil','true','false']);
const LUA_GLOBALS = new Set(['game','workspace','script','self','_G','_ENV','math','string','table','os','coroutine','debug','utf8','bit32','shared','wait','spawn','delay','tick','print','warn','error','pairs','ipairs','pcall','xpcall','require','select','type','typeof','tostring','tonumber','rawget','rawset','rawequal','setmetatable','getmetatable','unpack','Instance','Vector3','Vector2','CFrame','Color3','UDim2','UDim','Ray','Region3','BrickColor','Enum','Random','TweenInfo','task']);
const LUA_TOKEN_RE = /(?<comment>--\[(?<ceq>=*)\[[\s\S]*?\]\k<ceq>\]|--[^\n]*)|(?<longstr>\[(?<seq>=*)\[[\s\S]*?\]\k<seq>\])|(?<dq>"(?:\\.|[^"\\])*")|(?<sq>'(?:\\.|[^'\\])*')|(?<hex>0[xX][0-9a-fA-F]+)|(?<num>\d+\.?\d*(?:[eE][+-]?\d+)?)|(?<ident>[A-Za-z_][A-Za-z0-9_]*)|(?<op>\.\.\.|\.\.|==|~=|<=|>=|[+\-*/%^#=~<>(){}\[\];:,.])/g;
function highlightLua(code){
  if (!code) return '';
  let out = '';
  let lastIndex = 0;
  let m;
  LUA_TOKEN_RE.lastIndex = 0;
  while ((m = LUA_TOKEN_RE.exec(code)) !== null) {
    if (m.index > lastIndex) out += esc(code.slice(lastIndex, m.index));
    const g = m.groups;
    const full = m[0];
    if (g.comment) out += `<span class="tok-com">${esc(full)}</span>`;
    else if (g.longstr || g.dq || g.sq) out += `<span class="tok-str">${esc(full)}</span>`;
    else if (g.hex || g.num) out += `<span class="tok-num">${esc(full)}</span>`;
    else if (g.ident) {
      if (LUA_KEYWORDS.has(g.ident)) out += `<span class="tok-kw">${esc(full)}</span>`;
      else if (LUA_CONSTS.has(g.ident)) out += `<span class="tok-const">${esc(full)}</span>`;
      else if (LUA_GLOBALS.has(g.ident)) out += `<span class="tok-global">${esc(full)}</span>`;
      else if (/^\s*\(/.test(code.slice(LUA_TOKEN_RE.lastIndex))) out += `<span class="tok-fn">${esc(full)}</span>`;
      else out += esc(full);
    }
    else if (g.op) out += `<span class="tok-op">${esc(full)}</span>`;
    else out += esc(full);
    lastIndex = LUA_TOKEN_RE.lastIndex;
  }
  out += esc(code.slice(lastIndex));
  return out;
}

function renderAvatar(avatarUrl, decorationUrl, opts) {
  opts = opts || {};
  const size = opts.size || 28, adminRing = !!opts.adminRing, onClick = opts.onClick || '';
  const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
  const clickAttr = onClick ? `onclick="${onClick}"` : '';
  return `<div class="avatar-frame ${adminRing?'admin-ring':''}" style="--av-size:${size}px" ${clickAttr}>
    <img class="avatar-img" src="${esc(avatarUrl||fallback)}" loading="lazy" onerror="this.src='${fallback}'">
    ${decorationUrl?`<img class="avatar-decoration" src="${esc(decorationUrl)}" loading="lazy">`:''}
  </div>`;
}
function renderBadges(badges){
  if(!badges||!badges.length) return '';
  return `<div class="flex flex-wrap gap-1 mt-2">${badges.map(b=>`<span class="badge-chip">${esc(b)}</span>`).join('')}</div>`;
}

// navigate(path) — เปลี่ยนหน้าแบบ SPA จริงๆ (ไม่มี # ไม่รีโหลดหน้า) ด้วย History API
function navigate(path){
  if (location.pathname !== path) history.pushState(null, '', path);
  route();
}

function route(){
  const raw = location.pathname.replace(/^\//,'') || 'scripts';
  const parts = raw.split('/');
  const view = parts[0] || 'scripts';
  const param = parts[1];
  if (view === 'admin' && param) currentAdminSubtab = param;
  showView(view);
  if (view === 'vault' && param) openVaultUnlock(param);
}
function showView(view){
  const known = ['scripts','store','vault','roblox','team','partners','apikey','admin'];
  if (!known.includes(view)) view = 'scripts';
  document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active', el.dataset.view===view));
  document.querySelectorAll('.nav-menu-item[data-tab]').forEach(el=>el.classList.toggle('active', el.dataset.tab===view));

  if (view === 'admin') {
    const denied = document.getElementById('adminDenied');
    const panel = document.getElementById('adminPanel');
    if (!panel) {
      // หน้านี้ไม่มีแผงแอดมินอยู่ในตัว (คือ index.html ไม่ใช่ /admin) ส่งไปหน้าแอดมินจริงแทน
      // ป้องกันด้วยเซิร์ฟเวอร์อยู่แล้วว่าใครเข้า /admin ได้บ้าง หน้านี้แค่ redirect ให้ถูกที่
      location.href = '/admin';
      return;
    }
    if (isStaff()) {
      denied.classList.add('hidden'); panel.classList.remove('hidden');
      applyAdminTabVisibility();
      adminTab(currentAdminSubtab);
    } else {
      denied.classList.remove('hidden'); panel.classList.add('hidden');
    }
  }
  if (view === 'roblox' && robloxCatalog.length === 0) { loadRobloxCatalog(); loadRobloxGenres(); }
  if (view === 'team' && teamData.length === 0) loadTeam();
  if (view === 'partners') loadPartners();
  if (view === 'vault' && currentUser) loadMyVault();
  if (view === 'store') { loadStoreProducts(); if (currentUser) loadWallet(); }
  if (view === 'apikey') loadApikeyPage();
}
window.addEventListener('popstate', route);

// ดักคลิกลิงก์ภายในเว็บทุกจุด (href ที่ขึ้นต้นด้วย "/" และไม่ใช่ target="_blank"/ไฟล์ดาวน์โหลด)
// ให้เปลี่ยนหน้าแบบ SPA ผ่าน pushState แทนการโหลดหน้าใหม่ทั้งหน้า — ไม่ต้องไปแก้ href ทีละจุดในโค้ด
// ลิงก์ข้ามหน้าจริงๆ เช่น /admin, /login ยังคงโหลดใหม่ตามปกติ (ปลอดภัยกว่า เพราะเป็นคนละไฟล์ HTML กัน)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (!href || !href.startsWith('/') || href.startsWith('//')) return;
  if (href === '/admin' || href === '/login') return; // หน้าคนละไฟล์ HTML ต้องโหลดใหม่จริงๆ
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // เปิดแท็บใหม่/ดาวน์โหลดตามปกติ
  e.preventDefault();
  navigate(href);
});

function loginWithDiscord(){ window.location.href = '/login'; }

function toggleNavMenu(){ document.getElementById('navMenuDropdown').classList.toggle('hidden'); }
function closeNavMenu(){ document.getElementById('navMenuDropdown').classList.add('hidden'); }
document.addEventListener('click', (e)=>{
  const dd = document.getElementById('navMenuDropdown');
  const btn = document.getElementById('navMenuBtn');
  if (!dd || dd.classList.contains('hidden')) return;
  if (!dd.contains(e.target) && !btn.contains(e.target)) dd.classList.add('hidden');
});
function quickTopup(){
  if (!currentUser) { notifyToast('error','กรุณาเข้าสู่ระบบก่อนเติมเงิน'); return; }
  loadWallet();
  openTopupModal();
}
function canManage(perm){ return !!currentUser && (currentUser.is_admin || (currentUser.permissions||[]).includes(perm)); }
function isStaff(){ return !!currentUser && (currentUser.is_admin || (currentUser.permissions||[]).length > 0); }

async function checkAuth(){
  try{
    const res = await fetch('/api/me',{cache:'no-cache'});
    if (res.status === 403) {
      const data = await res.json().catch(()=>({}));
      if (data.error === 'banned') { showBannedScreen(data.reason); return true; }
    }
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;
      document.getElementById('authContainer').innerHTML = `
        <div class="flex items-center gap-1 bg-slate-100 border border-line pl-1.5 pr-1.5 py-1.5 rounded-xl max-w-[150px] sm:max-w-[200px]">
          <div class="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer" onclick="openProfileModal('${esc(currentUser.discord_id)}')">
            ${renderAvatar(currentUser.avatar, currentUser.avatar_decoration, {size:26, adminRing: currentUser.is_admin})}
            <span class="text-xs text-slate-900 font-medium hidden sm:inline truncate">${esc(currentUser.username)}</span>
          </div>
          <button onclick="doLogout()" class="text-slate-400 hover:text-red-600 text-xs shrink-0 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white" title="ออกจากระบบ"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
        </div>
      `;
      document.getElementById('addScriptBtn').classList.remove('hidden');
      document.getElementById('addScriptBtn').classList.add('flex');
      document.getElementById('walletBox').classList.remove('hidden');
      document.getElementById('walletBox').classList.add('flex');
      document.getElementById('storeLoginPrompt').classList.add('hidden');
      if (isStaff()) {
        document.getElementById('adminNavBtn').classList.remove('hidden');
      }
      if (canManage('store')) {
        document.getElementById('addProductBtn').classList.remove('hidden');
        document.getElementById('addProductBtn').classList.add('flex');
      }
    } else {
      document.getElementById('storeLoginPrompt').classList.remove('hidden');
    }
  }catch(e){}
}
function showBannedScreen(reason){
  document.body.innerHTML = `
    <div class="fixed inset-0 bg-slate-950 flex items-center justify-center p-6 z-[999]">
      <div class="max-w-sm w-full text-center">
        <div class="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-500/15">
          <i class="fa-solid fa-ban text-red-500 text-2xl"></i>
        </div>
        <h1 class="text-white text-lg font-bold mb-2">บัญชีนี้ถูกระงับการใช้งาน</h1>
        <p class="text-slate-400 text-sm mb-1">คุณไม่สามารถใช้งาน Flexozy ได้อีกต่อไป</p>
        ${reason?`<p class="text-slate-500 text-xs mt-3 bg-white/5 rounded-xl px-4 py-3">เหตุผล: ${esc(reason)}</p>`:''}
      </div>
    </div>`;
}
function doLogout(){ window.location.href = '/logout'; }

async function loadSettings(){
  try{
    const res = await fetch('/api/settings',{cache:'no-cache'});
    siteSettings = await res.json();
    document.title = siteSettings.site_name || 'Flexozy';
    document.getElementById('brandName').textContent = siteSettings.site_name || 'FLEXOZY';
    document.getElementById('brandTagline').textContent = 'ROBLOX SCRIPT HUB';
    document.getElementById('footerBrand').textContent = siteSettings.site_name || 'FLEXOZY';
    const heroTitleEl = document.getElementById('heroTitle');
    if (heroTitleEl && siteSettings.tagline) heroTitleEl.innerHTML = esc(siteSettings.tagline);
    const heroNoteEl = document.getElementById('heroNote');
    if (heroNoteEl) heroNoteEl.textContent = siteSettings.hero_note || 'ศูนย์รวมสคริปต์ Roblox ที่เชื่อถือได้ ตรวจสอบโดยทีมงานทุกรายการ';
    if (siteSettings.discord_invite) {
      const a = document.getElementById('footerDiscord');
      a.href = siteSettings.discord_invite; a.classList.remove('hidden');
    }
    const tickerBar = document.getElementById('announceTicker');
    const tickerText = document.getElementById('announceTickerText');
    const tickerText2 = document.getElementById('announceTickerText2');
    if (siteSettings.announcement_text && siteSettings.announcement_text.trim()) {
      const repeated = Array.from({length:8}).map(()=>`<span class="mx-6">${esc(siteSettings.announcement_text)}</span>`).join('');
      tickerText.innerHTML = repeated;
      tickerText2.innerHTML = repeated;
      tickerBar.classList.remove('hidden');
    } else {
      tickerBar.classList.add('hidden');
    }
    document.getElementById('plsText').textContent = siteSettings.loading_text || 'กำลังโหลดหน้าเว็บ';
    const plsBg = document.getElementById('plsBgImage');
    if (siteSettings.loading_image) { plsBg.src = siteSettings.loading_image; plsBg.classList.remove('hidden'); }
    else plsBg.classList.add('hidden');
  }catch(e){}
}

function hidePageLoadingScreen(afterHide){
  const el = document.getElementById('pageLoadingScreen');
  el.classList.add('fade-out');
  setTimeout(()=>{
    el.classList.add('hidden');
    if (afterHide) afterHide();
  }, 400);
}

const WP_HIDE_KEY = 'luader_welcome_hide_until';
function showWelcomePopupIfNeeded(){
  const enabled = siteSettings.popup_enabled === true || siteSettings.popup_enabled === 'true';
  if (!enabled) return;
  const hideUntil = Number(localStorage.getItem(WP_HIDE_KEY) || 0);
  if (Date.now() < hideUntil) return;

  document.getElementById('wpTitle').textContent = siteSettings.popup_title || 'ยินดีต้อนรับ';
  const desc = document.getElementById('wpDesc');
  desc.textContent = siteSettings.popup_desc || '';
  desc.classList.toggle('hidden', !siteSettings.popup_desc);

  const codeWrap = document.getElementById('wpCodeWrap');
  if (siteSettings.popup_code) { document.getElementById('wpCode').textContent = siteSettings.popup_code; codeWrap.classList.remove('hidden'); }
  else codeWrap.classList.add('hidden');

  const bg = document.getElementById('wpBgImage');
  if (siteSettings.popup_image) { bg.src = siteSettings.popup_image; bg.classList.remove('hidden'); }
  else bg.classList.add('hidden');

  const cta = document.getElementById('wpCta');
  cta.textContent = '';
  cta.append((siteSettings.popup_button_text || 'รับสิทธิ์เลย') + ' ');
  const icon = document.createElement('i'); icon.className = 'fa-solid fa-arrow-right text-[11px]'; cta.append(icon);
  if (siteSettings.popup_button_link) { cta.href = siteSettings.popup_button_link; cta.classList.remove('hidden'); }
  else cta.classList.add('hidden');

  document.getElementById('wpHideCheck').checked = false;
  document.getElementById('welcomePopup').classList.remove('hidden');
}
function closeWelcomePopup(){
  if (document.getElementById('wpHideCheck').checked) {
    localStorage.setItem(WP_HIDE_KEY, String(Date.now() + 24*60*60*1000));
  }
  document.getElementById('welcomePopup').classList.add('hidden');
}
function copyWelcomeCode(){
  const code = document.getElementById('wpCode').textContent;
  navigator.clipboard?.writeText(code).then(()=> notifyToast ? notifyToast('success','คัดลอกโค้ดแล้ว') : null).catch(()=>{});
}

async function fetchStats(){
  try{
    const res = await fetch('/api/stats',{cache:'no-cache'});
    const s = await res.json();
    document.getElementById('statOnline').textContent = s.online_users;
    document.getElementById('statViews').textContent = s.total_views;
    document.getElementById('statScripts').textContent = s.total_scripts;
    const ov = document.getElementById('ovOnline');
    if (ov){ ov.textContent=s.online_users; document.getElementById('ovViews').textContent=s.total_views; document.getElementById('ovScripts').textContent=s.total_scripts; document.getElementById('ovMembers').textContent=s.total_members; }
  }catch(e){}
}

function timeAgo(unixSec){
  if (!unixSec) return 'ไม่ทราบ';
  const diff = Math.max(0, Math.floor(Date.now()/1000) - unixSec);
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return `${Math.floor(diff/60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff/3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff/86400)} วันที่แล้ว`;
}
function presenceStatusOf(p){
  if (!p) return 'unknown';
  return ['online','idle','dnd','offline'].includes(p.status) ? p.status : 'unknown';
}
async function loadAdminMembers(){
  const wrap = document.getElementById('adminMembersList');
  wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">กำลังโหลด...</p>`;
  try{
    const res = await fetch('/api/admin/members',{cache:'no-cache'});
    if (!res.ok){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ไม่มีสิทธิ์ดูข้อมูลนี้</p>`; return; }
    const data = await res.json();
    document.getElementById('memTotal').textContent = data.total_members;
    document.getElementById('memOnline').textContent = data.online_now;
    if (!data.members.length){ wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีสมาชิก</p>`; return; }
    wrap.innerHTML = data.members.map(m=>{
      const status = presenceStatusOf(m.presence);
      return `
      <div class="member-card">
        <div class="member-avatar-wrap">
          <img src="${esc(m.avatar||'')}" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'" class="w-10 h-10 rounded-xl object-cover">
          <span class="presence-dot ${status}" style="bottom:-2px;right:-2px" title="${status}"></span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 min-w-0">
            <p class="text-xs font-semibold text-slate-900 truncate">${esc(m.username)}</p>
            ${m.is_admin?'<i class="fa-solid fa-shield-halved text-gold text-[10px] shrink-0" title="แอดมิน"></i>':''}
          </div>
          <p class="text-[10px] text-slate-400 truncate">ID ${esc(m.discord_id)} · เข้าเว็บล่าสุด ${timeAgo(m.last_seen)}</p>
        </div>
        <span class="text-[9px] text-slate-400 eyebrow shrink-0">เริ่มใช้งาน ${m.first_seen ? new Date(m.first_seen*1000).toLocaleDateString('th-TH') : '-'}</span>
      </div>`;
    }).join('');
  }catch(e){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">โหลดไม่สำเร็จ</p>`; }
}

let statsHistoryCache = null, currentChartRange = 'daily';
function svgBarChart(items, labelFn, valueFn){
  const w = Math.max(items.length * 44, 320), h = 160, padBottom = 24, padTop = 10;
  const max = Math.max(1, ...items.map(valueFn));
  const barW = Math.min(28, (w / items.length) - 10);
  let bars = '';
  items.forEach((item,i)=>{
    const val = valueFn(item);
    const barH = Math.max(2, (val / max) * (h - padBottom - padTop));
    const x = (w / items.length) * i + ((w/items.length) - barW)/2;
    const y = h - padBottom - barH;
    bars += `<rect class="bar-chart-bar" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4"><title>${esc(labelFn(item))}: ${val}</title></rect>`;
    bars += `<text x="${x+barW/2}" y="${h-8}" text-anchor="middle" font-size="8" fill="#94A3B8" font-family="JetBrains Mono, monospace">${esc(labelFn(item))}</text>`;
    if (val > 0) bars += `<text x="${x+barW/2}" y="${y-4}" text-anchor="middle" font-size="8" fill="#6366F1" font-weight="600">${val}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="min-width:${w}px">${bars}</svg>`;
}
async function loadStatsChart(){
  const wrap = document.getElementById('statsChartWrap');
  try{
    const res = await fetch('/api/admin/stats/history',{cache:'no-cache'});
    if (!res.ok){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ไม่มีสิทธิ์ดูข้อมูลนี้</p>`; return; }
    statsHistoryCache = await res.json();
    document.getElementById('memToday').textContent = statsHistoryCache.today;
    switchStatsChart(currentChartRange);
  }catch(e){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">โหลดไม่สำเร็จ</p>`; }
}
function switchStatsChart(range){
  currentChartRange = range;
  document.querySelectorAll('.chart-range-btn').forEach(b=>b.classList.toggle('active', b.dataset.chartRange===range));
  const wrap = document.getElementById('statsChartWrap');
  if (!statsHistoryCache) return;
  if (range==='daily'){
    const shortDay = d => d.slice(5).replace('-','/');
    wrap.innerHTML = svgBarChart(statsHistoryCache.daily, i=>shortDay(i.date), i=>i.count);
  } else if (range==='monthly'){
    if (!statsHistoryCache.monthly.length){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ยังไม่มีข้อมูล</p>`; return; }
    wrap.innerHTML = svgBarChart(statsHistoryCache.monthly, i=>i.month.slice(2), i=>i.count);
  } else {
    if (!statsHistoryCache.yearly.length){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ยังไม่มีข้อมูล</p>`; return; }
    wrap.innerHTML = svgBarChart(statsHistoryCache.yearly, i=>i.year, i=>i.count);
  }
}

function modTab(name){
  document.querySelectorAll('.mod-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.modTab===name));
  document.getElementById('mod-reports').classList.toggle('hidden', name!=='reports');
  document.getElementById('mod-bans').classList.toggle('hidden', name!=='bans');
}
const REPORT_TYPE_LABEL = { script:'สคริปต์', vault:'ลิงก์ Vault', user:'ผู้ใช้' };
const REPORT_STATUS_LABEL = { open:'รอตรวจสอบ', resolved:'แก้ไขแล้ว', dismissed:'ปัดตก' };
async function loadReports(){
  const wrap = document.getElementById('mod-reports');
  wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">กำลังโหลด...</p>`;
  try{
    const res = await fetch('/api/admin/reports',{cache:'no-cache'});
    if (!res.ok){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ไม่มีสิทธิ์ดูข้อมูลนี้</p>`; return; }
    const reports = await res.json();
    if (!reports.length){ wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีรายงานเข้ามา</p>`; return; }
    wrap.innerHTML = reports.map(r=>`
      <div class="bg-slate-100 border border-line rounded-xl p-3.5">
        <div class="flex items-start justify-between gap-2 mb-1.5">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="perm-badge">${esc(REPORT_TYPE_LABEL[r.type]||r.type)}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full ${r.status==='open'?'bg-amber-100 text-amber-700':r.status==='resolved'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-500'}">${esc(REPORT_STATUS_LABEL[r.status])}</span>
            </div>
            <p class="text-xs font-semibold text-slate-900 mt-1.5">${esc(r.target_label||r.target_id)}</p>
            <p class="text-[11px] text-slate-500 mt-1">${esc(r.reason)}</p>
            <p class="text-[10px] text-slate-400 mt-1.5 eyebrow">รายงานโดย ${esc(r.reporter_name)} · ${timeAgo(r.created_at)}</p>
          </div>
        </div>
        ${r.status==='open'?`
        <div class="flex gap-1.5 mt-2">
          <button onclick="setReportStatus('${esc(r.id)}','resolved')" class="btn-ghost text-[10px] px-2.5 py-1 rounded-lg bg-white"><i class="fa-solid fa-check mr-1"></i>แก้ไขแล้ว</button>
          <button onclick="setReportStatus('${esc(r.id)}','dismissed')" class="btn-ghost text-[10px] px-2.5 py-1 rounded-lg bg-white">ปัดตก</button>
          <button onclick="removeReport('${esc(r.id)}')" class="btn-danger text-[10px] px-2.5 py-1 rounded-lg ml-auto"><i class="fa-solid fa-trash"></i></button>
        </div>`:`<button onclick="removeReport('${esc(r.id)}')" class="btn-danger text-[10px] px-2.5 py-1 rounded-lg mt-2"><i class="fa-solid fa-trash mr-1"></i>ลบรายงาน</button>`}
      </div>`).join('');
  }catch(e){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">โหลดไม่สำเร็จ</p>`; }
}
async function setReportStatus(id, status){
  const res = await fetch(`/api/admin/reports/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
  if (res.ok){ notifyToast('success','อัปเดตแล้ว'); loadReports(); }
}
async function removeReport(id){
  const res = await fetch(`/api/admin/reports/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ลบแล้ว'); loadReports(); }
}
async function loadBans(){
  const wrap = document.getElementById('adminBansList');
  wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">กำลังโหลด...</p>`;
  try{
    const res = await fetch('/api/admin/bans',{cache:'no-cache'});
    if (!res.ok){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ไม่มีสิทธิ์ดูข้อมูลนี้</p>`; return; }
    const bans = await res.json();
    if (!bans.length){ wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีใครถูกแบน</p>`; return; }
    wrap.innerHTML = bans.map(b=>`
      <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-slate-900 truncate">${esc(b.username)} <span class="text-[10px] text-slate-400 eyebrow">ID ${esc(b.discord_id)}</span></p>
          <p class="text-[11px] text-slate-500 mt-0.5">${esc(b.reason)}</p>
          <p class="text-[10px] text-slate-400 mt-1 eyebrow">แบนโดย ${esc(b.banned_by_name)} · ${timeAgo(b.banned_at)}</p>
        </div>
        <button onclick="adminUnbanUser('${esc(b.discord_id)}')" class="btn-ghost text-[11px] px-3 py-1.5 rounded-lg bg-white shrink-0">ปลดแบน</button>
      </div>`).join('');
  }catch(e){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">โหลดไม่สำเร็จ</p>`; }
}
async function adminBanUser(e){
  e.preventDefault();
  const payload = { discord_id: document.getElementById('banDiscordId').value.trim(), reason: document.getElementById('banReason').value };
  const res = await fetch('/api/admin/bans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){
    notify('success','แบนแล้ว','ส่งแจ้งเตือนไปยัง Webhook และ DM ผู้ใช้แล้ว (ถ้าเปิดรับ DM)');
    document.getElementById('banDiscordId').value=''; document.getElementById('banReason').value='';
    loadBans();
  } else {
    const data = await res.json().catch(()=>({}));
    notify('error','แบนไม่สำเร็จ', data.error==='already_banned'?'คนนี้ถูกแบนอยู่แล้ว':'กรุณาตรวจสอบข้อมูล');
  }
}
async function adminUnbanUser(id){
  const res = await fetch(`/api/admin/bans/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ปลดแบนแล้ว'); loadBans(); }
}

let webhookEventsCache = [];
async function loadAdminWebhooks(){
  const wrap = document.getElementById('adminWebhooksList');
  wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">กำลังโหลด...</p>`;
  try{
    const res = await fetch('/api/admin/webhooks',{cache:'no-cache'});
    if (!res.ok){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ไม่มีสิทธิ์ดูข้อมูลนี้</p>`; return; }
    const data = await res.json();
    webhookEventsCache = data.available_events;
    document.getElementById('whEventGrid').innerHTML = renderWebhookEventGrid([]);
    if (!data.webhooks.length){ wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มี Webhook</p>`; return; }
    wrap.innerHTML = data.webhooks.map(w=>`
      <div class="bg-slate-100 border border-line rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs font-semibold text-slate-900 truncate"><i class="fa-brands fa-discord text-cyan mr-1.5"></i>${esc(w.name)}</p>
          <div class="flex gap-1.5 shrink-0">
            <button onclick="testWebhook('${esc(w.id)}')" class="btn-ghost text-[10px] px-2.5 py-1 rounded-lg bg-white"><i class="fa-solid fa-paper-plane mr-1"></i>ทดสอบ</button>
            <button onclick="removeWebhook('${esc(w.id)}')" class="btn-danger w-7 h-7 rounded-lg text-[11px]"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="flex flex-wrap gap-1 mb-2">
          ${(w.events.includes('all')?['ทุกหมวด']:w.events.map(ek=>webhookEventsCache.find(e=>e.key===ek)?.label||ek)).map(l=>`<span class="perm-badge">${esc(l)}</span>`).join('') || '<span class="text-[10px] text-slate-400">ยังไม่ได้เลือกหมวด</span>'}
        </div>
        <button onclick="editWebhookEvents('${esc(w.id)}')" class="text-[10px] text-cyan hover:underline"><i class="fa-solid fa-pen mr-1"></i>แก้ไขหมวดที่รับแจ้งเตือน</button>
      </div>`).join('');
  }catch(e){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">โหลดไม่สำเร็จ</p>`; }
}
function renderWebhookEventGrid(selected){
  const sel = new Set(selected||[]);
  const allChecked = sel.has('all');
  let html = `<label class="perm-chip"><input type="checkbox" value="all" ${allChecked?'checked':''} onchange="toggleAllWebhookEvents(this)"><span><span class="perm-chip-title">ทุกหมวด (แจ้งเตือนทั้งหมด)</span></span></label>`;
  html += webhookEventsCache.map(e=>`
    <label class="perm-chip">
      <input type="checkbox" value="${e.key}" ${(allChecked||sel.has(e.key))?'checked':''} ${allChecked?'disabled':''}>
      <span><span class="perm-chip-title">${esc(e.label)}</span></span>
    </label>`).join('');
  return html;
}
function toggleAllWebhookEvents(checkbox){
  const grid = checkbox.closest('.perm-grid');
  grid.querySelectorAll('input[type=checkbox]').forEach(i=>{ if (i!==checkbox){ i.checked = checkbox.checked; i.disabled = checkbox.checked; } });
}
async function adminAddWebhook(e){
  e.preventDefault();
  const events = getCheckedPerms(document.getElementById('whEventGrid'));
  const payload = { name: document.getElementById('whName').value || 'Webhook', url: document.getElementById('whUrl').value, events };
  const res = await fetch('/api/admin/webhooks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){
    notify('success','เพิ่ม Webhook แล้ว','');
    document.getElementById('whName').value=''; document.getElementById('whUrl').value='';
    document.getElementById('whEventGrid').innerHTML = renderWebhookEventGrid([]);
    loadAdminWebhooks();
  } else {
    notify('error','เพิ่มไม่สำเร็จ','ตรวจสอบว่าลิงก์ Webhook ถูกต้องหรือไม่ (ต้องเป็นลิงก์จาก discord.com/api/webhooks/...)');
  }
}
async function editWebhookEvents(id){
  const res = await fetch('/api/admin/webhooks',{cache:'no-cache'});
  const data = await res.json();
  const w = data.webhooks.find(x=>x.id===id);
  if (!w) return;
  document.getElementById('whEventGrid').innerHTML = renderWebhookEventGrid(w.events);
  document.getElementById('whEventGrid').dataset.editingId = id;
  const form = document.querySelector('#admin-webhooks form');
  const submitBtn = form.querySelector('button[type=submit], button:not([type])');
  submitBtn.textContent = 'บันทึกหมวดที่แก้ไข';
  form.onsubmit = async (e)=>{
    e.preventDefault();
    const events = getCheckedPerms(document.getElementById('whEventGrid'));
    const r = await fetch(`/api/admin/webhooks/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({events})});
    if (r.ok){ notifyToast('success','บันทึกแล้ว'); form.onsubmit = adminAddWebhook; submitBtn.textContent='เพิ่ม Webhook'; document.getElementById('whEventGrid').innerHTML = renderWebhookEventGrid([]); loadAdminWebhooks(); }
  };
  form.scrollIntoView({behavior:'smooth', block:'center'});
}
async function testWebhook(id){
  const res = await fetch(`/api/admin/webhooks/${id}/test`,{method:'POST'});
  if (res.ok) notifyToast('success','ส่งข้อความทดสอบแล้ว ไปเช็คใน Discord ได้เลย');
  else notify('error','ส่งไม่สำเร็จ','ลิงก์ Webhook นี้อาจถูกลบไปแล้วหรือไม่ถูกต้อง');
}
async function removeWebhook(id){
  const res = await fetch(`/api/admin/webhooks/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ลบแล้ว'); loadAdminWebhooks(); }
}

let categoriesData = [];
async function loadCategories(){
  try{
    const res = await fetch('/api/categories',{cache:'no-cache'});
    categoriesData = await res.json();
    renderCategories();
  }catch(e){}
}
function renderCategories(){
  const section = document.getElementById('categoriesSection');
  const grid = document.getElementById('categoriesGrid');
  if (!categoriesData.length){ section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  grid.innerHTML = categoriesData.map(c=>`
    <a href="${esc(c.link||'#')}" ${c.link?'target="_blank" rel="noopener"':''} class="category-card" ${c.image?`style="background-image:url('${esc(c.image)}')"`:''}>
      <span class="category-badge"><i class="fa-solid fa-layer-group"></i> Flexozy</span>
      <div class="category-body">
        <p class="category-title">${esc(c.title)}</p>
        ${c.subtitle?`<p class="category-subtitle">${esc(c.subtitle)}</p>`:''}
        ${c.link?`<p class="category-link"><i class="fa-solid fa-link"></i>${esc(c.link)}</p>`:''}
      </div>
      <span class="category-arrow-btn"><i class="fa-solid fa-arrow-right"></i></span>
    </a>`).join('');
}
async function loadScripts(){
  try{
    const res = await fetch('/api/scripts',{cache:'no-cache'});
    scriptsData = await res.json();
    renderScripts(scriptsData);
    if (document.getElementById('admin-scripts')) renderAdminScripts();
  }catch(e){}
}
function renderScripts(list){
  const grid = document.getElementById('scriptGrid');
  if (!list || !list.length) { grid.innerHTML = `<div class="col-span-full text-center py-16 text-xs text-slate-400">ยังไม่มีสคริปต์ในระบบ</div>`; return; }
  // สคริปต์ที่มีไลก์เยอะสุด 3 อันดับแรก ติดป้าย "ยอดนิยม" ที่เหลือถ้าเพิ่งมา (ภายใน 3 วัน) ติดป้าย "ใหม่"
  const topLiked = [...list].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,3).map(s=>s.id);
  const now = Date.now()/1000;
  grid.innerHTML = list.map(s=>{
    const isOwnerOrAdmin = currentUser && (String(currentUser.discord_id)===String(s.author_id) || canManage('scripts'));
    const isPopular = topLiked.includes(s.id) && (s.likes||0) > 0;
    const isNew = !isPopular && s.created_at && (now - s.created_at) < 3*86400;
    const badge = isPopular ? `<span class="absolute top-2.5 left-2.5 z-10 eyebrow text-[9px] font-bold px-2.5 py-1 rounded-lg bg-gold text-ink-900 shadow-lg"><i class="fa-solid fa-fire mr-0.5"></i>ยอดนิยม</span>`
      : isNew ? `<span class="absolute top-2.5 left-2.5 z-10 eyebrow text-[9px] font-bold px-2.5 py-1 rounded-lg bg-cyan text-white shadow-lg">ใหม่</span>` : '';
    return `
    <div class="panel-card rounded-2xl overflow-hidden flex flex-col">
      <div class="relative h-36 bg-slate-100 bg-cover bg-center" style="${s.image?`background-image:url('${esc(s.image)}')`:''}">
        ${badge}
        ${s.key_system?'<span class="absolute top-2.5 right-2.5 z-10 badge-chip"><i class="fa-solid fa-key text-[8px]"></i>KEY</span>':''}
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>
      <div class="p-4 flex-1 flex flex-col">
        <h3 class="text-sm font-bold text-slate-900 line-clamp-1 mb-1">${esc(s.title)}</h3>
        <p class="text-[11px] text-slate-500 mb-3 truncate">${esc(s.game)}</p>
        <div class="flex items-center gap-2 mb-3 cursor-pointer min-w-0" onclick="openProfileModal('${esc(s.author_id)}')">
          ${renderAvatar(s.author_avatar, s.author_avatar_decoration, {size:20})}
          <span class="text-[11px] text-slate-600 truncate">${esc(s.author)}</span>
        </div>
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-line">
          <div class="flex items-center gap-3 text-[11px] text-slate-400">
            <button onclick="likeScript('${s.id}')" class="flex items-center gap-1 hover:text-cyan font-semibold"><i class="fa-solid fa-heart text-gold"></i><span class="text-cyan">${s.likes||0}</span></button>
            <button onclick="openComments('${s.id}')" class="flex items-center gap-1 hover:text-cyan"><i class="fa-solid fa-comment"></i><span id="comment-count-${s.id}">${s.comments?s.comments.length:0}</span></button>
          </div>
          ${currentUser&&!isOwnerOrAdmin?`<button onclick='openReportModal("script", ${JSON.stringify(s.id)}, ${JSON.stringify(s.title)})' class="text-[11px] text-slate-400 hover:text-red-400" title="รายงานสคริปต์นี้"><i class="fa-solid fa-flag"></i></button>`:''}
        </div>
        <button onclick='copyScript(this, ${JSON.stringify(s.script)})' class="btn-cyan w-full py-2.5 rounded-xl text-xs font-semibold mb-1.5"><i class="fa-regular fa-copy mr-1"></i><span>คัดลอกสคริปต์</span></button>
        ${isOwnerOrAdmin?`<div class="grid grid-cols-2 gap-1.5"><button onclick="openScriptModal('${s.id}')" class="btn-ghost py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-pen mr-1"></i>แก้ไข</button><button onclick="deleteScript('${s.id}')" class="btn-danger py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-trash mr-1"></i>ลบ</button></div>`:''}
      </div>
    </div>`;
  }).join('');
}

// ===================== STORE (ร้านค้า) =====================
let storeProducts = [];
let currentWalletBalance = 0;

async function loadStoreProducts(){
  try{
    const canSeeAll = canManage('store');
    const res = await fetch(canSeeAll ? '/api/store/products/all' : '/api/store/products');
    storeProducts = await res.json();
    renderStoreProducts();
  }catch(e){ notifyToast('error','โหลดสินค้าล้มเหลว'); }
}
function renderStoreProducts(){
  const grid = document.getElementById('storeGrid');
  if (!storeProducts.length) { grid.innerHTML = `<div class="col-span-full text-center py-16 text-xs text-slate-400">ยังไม่มีสินค้าในร้าน</div>`; return; }
  grid.innerHTML = storeProducts.map(p=>{
    const canEdit = canManage('store');
    const soldOut = p.stock !== null && p.stock <= 0;
    const typeLabel = p.type==='script' ? 'สคริปต์ Roblox' : p.type==='discord_service' ? 'บริการ Discord' : 'อื่นๆ';
    return `
    <div class="panel-card rounded-2xl overflow-hidden flex flex-col">
      <div class="relative h-36 bg-slate-100 bg-cover bg-center" style="${p.image?`background-image:url('${esc(p.image)}')`:''}">
        ${soldOut?'<span class="absolute top-2.5 left-2.5 z-10 eyebrow text-[9px] font-bold px-2.5 py-1 rounded-lg bg-danger text-white shadow-lg">หมดสต็อก</span>':''}
        ${p.active===false?'<span class="absolute top-2.5 left-2.5 z-10 eyebrow text-[9px] font-bold px-2.5 py-1 rounded-lg bg-slate-300 text-slate-900 shadow-lg">ปิดขาย</span>':''}
        <span class="absolute top-2.5 right-2.5 z-10 badge-chip">${esc(typeLabel)}</span>
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
      </div>
      <div class="p-4 flex-1 flex flex-col">
        <h3 class="text-sm font-bold text-slate-900 line-clamp-1 mb-1">${esc(p.title)}</h3>
        <p class="text-[11px] text-slate-500 mb-3 line-clamp-2">${esc(p.description||'')}</p>
        <div class="flex items-center justify-between mb-3 pb-3 border-b border-line">
          <span class="text-lg font-extrabold text-cyan eyebrow">${p.price.toLocaleString()} บาท</span>
          ${p.stock!==null?`<span class="text-[10.5px] text-slate-400">เหลือ ${p.stock} ชิ้น</span>`:'<span class="text-[10.5px] text-slate-400">ไม่จำกัด</span>'}
        </div>
        <button onclick="buyProduct('${p.id}')" ${soldOut||p.active===false?'disabled':''} class="btn-cyan w-full py-2.5 rounded-xl text-xs font-semibold mb-1.5 disabled:opacity-40 disabled:cursor-not-allowed"><i class="fa-solid fa-cart-shopping mr-1"></i><span>${soldOut?'สินค้าหมด':'สั่งซื้อ'}</span></button>
        ${canEdit?`<div class="grid grid-cols-2 gap-1.5"><button onclick='openProductModal(${JSON.stringify(p.id)})' class="btn-ghost py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-pen mr-1"></i>แก้ไข</button><button onclick="deleteProduct('${p.id}')" class="btn-danger py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-trash mr-1"></i>ลบ</button></div>`:''}
      </div>
    </div>`;
  }).join('');
}

async function loadWallet(){
  try{
    const res = await fetch('/api/wallet');
    if (!res.ok) return;
    const data = await res.json();
    currentWalletBalance = data.balance || 0;
    document.getElementById('walletBalance').textContent = currentWalletBalance.toLocaleString() + ' บาท';
  }catch(e){}
}

async function buyProduct(id){
  if (!currentUser) { notifyToast('error','กรุณาเข้าสู่ระบบก่อน'); return; }
  const product = storeProducts.find(p=>p.id===id);
  if (!product) return;
  if (!confirm(`ยืนยันสั่งซื้อ "${product.title}" ราคา ${product.price} บาท?\nยอดเงินคงเหลือ: ${currentWalletBalance} บาท`)) return;
  try{
    const res = await fetch('/api/store/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:id})});
    const data = await res.json();
    if (!res.ok) { notifyToast('error', data.message || 'สั่งซื้อไม่สำเร็จ'); return; }
    notify('success','สั่งซื้อสำเร็จ','ทีมงานจะดำเนินการส่งมอบสินค้าให้เร็วๆ นี้');
    await loadWallet();
    await loadStoreProducts();
  }catch(e){ notifyToast('error','สั่งซื้อไม่สำเร็จ'); }
}

function openTopupModal(){
  if (!currentUser) { notifyToast('error','กรุณาเข้าสู่ระบบก่อน'); return; }
  document.getElementById('topupLink').value = '';
  document.getElementById('topupResult').classList.add('hidden');
  document.getElementById('topupModal').classList.remove('hidden');
}
function closeTopupModal(){ document.getElementById('topupModal').classList.add('hidden'); }
async function submitTopup(e){
  e.preventDefault();
  const btn = document.getElementById('topupSubmitBtn');
  const resultBox = document.getElementById('topupResult');
  const link = document.getElementById('topupLink').value.trim();
  btn.disabled = true; btn.textContent = 'กำลังแลกซอง...';
  try{
    const res = await fetch('/api/wallet/topup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({link})});
    const data = await res.json();
    resultBox.classList.remove('hidden');
    if (res.ok) {
      resultBox.className = 'text-xs rounded-lg p-2.5 bg-blue-50 text-cyan border border-blue-100';
      resultBox.textContent = `เติมเงินสำเร็จ +${data.credited} บาท (ยอดคงเหลือ ${data.balance} บาท)`;
      currentWalletBalance = data.balance;
      document.getElementById('walletBalance').textContent = data.balance.toLocaleString() + ' บาท';
      notifyToast('success','เติมเงินสำเร็จ');
      setTimeout(closeTopupModal, 1600);
    } else {
      resultBox.className = 'text-xs rounded-lg p-2.5 bg-danger-soft text-danger border border-danger';
      resultBox.textContent = data.message || 'แลกซองไม่สำเร็จ';
    }
  }catch(e){
    resultBox.classList.remove('hidden');
    resultBox.className = 'text-xs rounded-lg p-2.5 bg-danger-soft text-danger border border-danger';
    resultBox.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
  }
  btn.disabled = false; btn.textContent = 'แลกซอง';
}

function openProductModal(id){
  document.getElementById('addProductForm').reset();
  document.getElementById('productImagePreview').src = 'https://placehold.co/80x80/151B2B/38BDF8?text=IMG';
  if (id) {
    const p = storeProducts.find(x=>x.id===id);
    if (!p) return;
    document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-pen text-cyan mr-1.5"></i>แก้ไขสินค้า';
    document.getElementById('productId').value = p.id;
    document.getElementById('productTitle').value = p.title;
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('productImage').value = p.image || '';
    document.getElementById('productImagePreview').src = p.image || 'https://placehold.co/80x80/151B2B/38BDF8?text=IMG';
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productStock').value = p.stock === null ? '' : p.stock;
    document.getElementById('productCategory').value = p.category || '';
    document.getElementById('productType').value = p.type || 'other';
    document.getElementById('productActive').checked = p.active !== false;
  } else {
    document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-store text-cyan mr-1.5"></i>เพิ่มสินค้าใหม่';
    document.getElementById('productId').value = '';
  }
  document.getElementById('productModal').classList.remove('hidden');
}
function closeProductModal(){ document.getElementById('productModal').classList.add('hidden'); }
async function submitProduct(e){
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const stockRaw = document.getElementById('productStock').value;
  const payload = {
    title: document.getElementById('productTitle').value,
    description: document.getElementById('productDescription').value,
    image: document.getElementById('productImage').value,
    price: Number(document.getElementById('productPrice').value),
    stock: stockRaw === '' ? null : Number(stockRaw),
    category: document.getElementById('productCategory').value,
    type: document.getElementById('productType').value,
    active: document.getElementById('productActive').checked,
  };
  try{
    const res = await fetch(id ? `/api/store/products/${id}` : '/api/store/products', {
      method: id ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (!res.ok) { notifyToast('error','บันทึกสินค้าไม่สำเร็จ'); return; }
    notifyToast('success', id ? 'แก้ไขสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว');
    closeProductModal();
    await loadStoreProducts();
  }catch(e){ notifyToast('error','บันทึกสินค้าไม่สำเร็จ'); }
}
async function deleteProduct(id){
  if (!confirm('ยืนยันลบสินค้านี้?')) return;
  try{
    const res = await fetch(`/api/store/products/${id}`,{method:'DELETE'});
    if (!res.ok) { notifyToast('error','ลบสินค้าไม่สำเร็จ'); return; }
    notifyToast('success','ลบสินค้าแล้ว');
    await loadStoreProducts();
  }catch(e){ notifyToast('error','ลบสินค้าไม่สำเร็จ'); }
}

// ===================== ADMIN: ออเดอร์ร้านค้า =====================
async function loadAdminOrders(){
  try{
    const res = await fetch('/api/store/orders');
    if (!res.ok) return;
    const orders = await res.json();
    document.getElementById('adminStoreProductCount').textContent = storeProducts.length;
    document.getElementById('adminStoreOrderCount').textContent = orders.length;
    const revenue = orders.filter(o=>o.status!=='cancelled').reduce((sum,o)=>sum+o.price,0);
    document.getElementById('adminStoreRevenue').textContent = revenue.toLocaleString() + ' บาท';

    const wrap = document.getElementById('adminOrdersTable');
    if (!orders.length) { wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีออเดอร์</p>`; return; }
    const statusLabel = { paid:'รอดำเนินการ', fulfilled:'ส่งมอบแล้ว', cancelled:'ยกเลิกแล้ว' };
    const statusClass = { paid:'bg-gold text-ink-900', fulfilled:'bg-green-500/15 text-green-400', cancelled:'bg-danger-soft text-danger' };
    wrap.innerHTML = orders.slice(0,50).map(o=>`
      <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-slate-900 truncate">${esc(o.product_title)} — ${o.price.toLocaleString()} บาท</p>
          <p class="text-[10.5px] text-slate-400">${esc(o.buyer_name)} · ${new Date(o.created_at*1000).toLocaleString('th-TH')}</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="eyebrow text-[9px] font-bold px-2 py-1 rounded-lg ${statusClass[o.status]}">${statusLabel[o.status]}</span>
          ${o.status==='paid'?`<button onclick="updateOrderStatus('${o.id}','fulfilled')" class="btn-cyan px-2.5 py-1 rounded-lg text-[10.5px]">ส่งมอบแล้ว</button><button onclick="updateOrderStatus('${o.id}','cancelled')" class="btn-danger px-2.5 py-1 rounded-lg text-[10.5px]">ยกเลิก</button>`:''}
        </div>
      </div>`).join('');
  }catch(e){}
}
async function updateOrderStatus(id, status){
  if (status==='cancelled' && !confirm('ยืนยันยกเลิกออเดอร์นี้? ระบบจะคืนเงินและคืนสต็อกให้อัตโนมัติ')) return;
  try{
    const res = await fetch(`/api/store/orders/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    if (!res.ok) { notifyToast('error','อัปเดตไม่สำเร็จ'); return; }
    notifyToast('success','อัปเดตสถานะแล้ว');
    await loadAdminOrders();
  }catch(e){ notifyToast('error','อัปเดตไม่สำเร็จ'); }
}

// ===================== ADMIN: โค้ดแลกรางวัล =====================
function toggleRedeemValueField(){
  const type = document.getElementById('rcRewardType').value;
  document.getElementById('rcValueLabel').textContent = type==='wallet' ? 'จำนวนเงิน (บาท)' : type==='link' ? 'ลิงก์' : 'ข้อความ/โค้ดลับ';
  document.getElementById('rcValueNumber').classList.toggle('hidden', type!=='wallet');
  document.getElementById('rcValueText').classList.toggle('hidden', type==='wallet');
  if (type==='link') document.getElementById('rcValueText').placeholder = 'https://...';
  else if (type==='message') document.getElementById('rcValueText').placeholder = 'เช่น key พิเศษ, รหัสส่วนลด, ข้อความลับ';
}
async function loadRedeemCodes(){
  try{
    const res = await fetch('/api/redeem/codes');
    if (!res.ok) return;
    const codes = await res.json();
    const wrap = document.getElementById('redeemCodesTable');
    if (!codes.length) { wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีโค้ด ลองสร้างโค้ดแรกดูสิ</p>`; return; }
    const typeLabel = { wallet:'💰 เงิน', link:'🔗 ลิงก์', message:'📝 ข้อความ' };
    wrap.innerHTML = codes.map(c=>`
      <div class="panel-card rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-2 flex-wrap mb-1.5">
          <div class="flex items-center gap-2">
            <code class="text-xs font-bold text-cyan eyebrow">${esc(c.code)}</code>
            <button onclick="navigator.clipboard.writeText('${esc(c.code)}');notifyToast('success','คัดลอกโค้ดแล้ว')" class="text-slate-400 hover:text-cyan"><i class="fa-regular fa-copy text-[10px]"></i></button>
          </div>
          <span class="eyebrow text-[9px] font-bold px-2 py-1 rounded-lg ${c.active?'bg-green-500/15 text-green-400':'bg-slate-300 text-slate-900'}">${c.active?'เปิดใช้งาน':'ปิดใช้งาน'}</span>
        </div>
        <p class="text-[11px] text-slate-500 mb-2">${typeLabel[c.reward_type]}: ${c.reward_type==='wallet'?c.reward_value.toLocaleString()+' บาท':esc(String(c.reward_value)).slice(0,60)}</p>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10.5px] text-slate-400 eyebrow">ใช้ไปแล้ว ${c.used_by.length}/${c.max_uses} สิทธิ์</span>
          <div class="flex items-center gap-1.5">
            <button onclick="toggleRedeemCode('${esc(c.code)}',${!c.active})" class="btn-ghost px-2.5 py-1 rounded-lg text-[10.5px]">${c.active?'ปิด':'เปิด'}</button>
            <button onclick="deleteRedeemCode('${esc(c.code)}')" class="btn-danger px-2.5 py-1 rounded-lg text-[10.5px]"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`).join('');
  }catch(e){}
}
async function submitRedeemCode(e){
  e.preventDefault();
  const rewardType = document.getElementById('rcRewardType').value;
  const payload = {
    code: document.getElementById('rcCode').value,
    reward_type: rewardType,
    reward_value: rewardType==='wallet' ? document.getElementById('rcValueNumber').value : document.getElementById('rcValueText').value,
    max_uses: document.getElementById('rcMaxUses').value,
  };
  try{
    const res = await fetch('/api/redeem/codes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data = await res.json();
    if (!res.ok) { notifyToast('error', data.message || 'สร้างโค้ดไม่สำเร็จ'); return; }
    notify('success','สร้างโค้ดแล้ว', `โค้ด: ${data.code}`);
    document.getElementById('rcCode').value = '';
    document.getElementById('rcValueNumber').value = '';
    document.getElementById('rcValueText').value = '';
    document.getElementById('rcMaxUses').value = '1';
    await loadRedeemCodes();
  }catch(e){ notifyToast('error','สร้างโค้ดไม่สำเร็จ'); }
}
async function toggleRedeemCode(code, active){
  try{
    const res = await fetch(`/api/redeem/codes/${code}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active})});
    if (!res.ok) { notifyToast('error','อัปเดตไม่สำเร็จ'); return; }
    await loadRedeemCodes();
  }catch(e){ notifyToast('error','อัปเดตไม่สำเร็จ'); }
}
async function deleteRedeemCode(code){
  if (!confirm('ยืนยันลบโค้ดนี้?')) return;
  try{
    const res = await fetch(`/api/redeem/codes/${code}`,{method:'DELETE'});
    if (!res.ok) { notifyToast('error','ลบไม่สำเร็จ'); return; }
    notifyToast('success','ลบโค้ดแล้ว');
    await loadRedeemCodes();
  }catch(e){ notifyToast('error','ลบไม่สำเร็จ'); }
}
async function redeemCodePrompt(){
  if (!currentUser) { notifyToast('error','กรุณาเข้าสู่ระบบก่อน'); return; }
  const code = prompt('กรอกโค้ดที่ต้องการแลก:');
  if (!code || !code.trim()) return;
  try{
    const res = await fetch('/api/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code.trim()})});
    const data = await res.json();
    if (!res.ok) { notify('error','แลกโค้ดไม่สำเร็จ', data.message || ''); return; }
    if (data.reward_type==='wallet') {
      notify('success','แลกโค้ดสำเร็จ!', `ได้รับ ${data.amount.toLocaleString()} บาท ยอดคงเหลือ ${data.balance.toLocaleString()} บาท`);
      currentWalletBalance = data.balance;
      const wb = document.getElementById('walletBalance'); if (wb) wb.textContent = data.balance.toLocaleString() + ' บาท';
    } else if (data.reward_type==='link') {
      notify('success','แลกโค้ดสำเร็จ!', `ลิงก์รางวัลของคุณ: ${data.value}`);
    } else {
      notify('success','แลกโค้ดสำเร็จ!', data.value);
    }
  }catch(e){ notifyToast('error','แลกโค้ดไม่สำเร็จ'); }
}

// ===================== ADMIN: ปิดปรับปรุงเว็บ =====================
function fillAdminMaintenance(){
  document.getElementById('mtEnabled').checked = siteSettings.maintenance_enabled === true || siteSettings.maintenance_enabled === 'true';
  document.getElementById('mtHtml').value = siteSettings.maintenance_html || '';
}
async function adminSaveMaintenance(e){
  e.preventDefault();
  const payload = { maintenance_enabled: document.getElementById('mtEnabled').checked, maintenance_html: document.getElementById('mtHtml').value };
  try{
    const res = await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!res.ok) { notifyToast('error','บันทึกไม่สำเร็จ'); return; }
    notify('success','บันทึกแล้ว', payload.maintenance_enabled ? 'เปิดโหมดปิดปรับปรุงเว็บแล้ว ผู้เข้าชมทั่วไปจะเห็นหน้านี้ทันที' : 'ปิดโหมดปิดปรับปรุงเว็บแล้ว');
    await loadSettings();
  }catch(e){ notifyToast('error','บันทึกไม่สำเร็จ'); }
}

// ===================== ADMIN: Audit Log =====================
async function loadAuditLog(){
  const box = document.getElementById('auditLogList');
  box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>กำลังโหลด...</div>`;
  try{
    const res = await fetch('/api/admin/audit-log');
    if (!res.ok) { box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">โหลดไม่สำเร็จ</div>`; return; }
    const list = await res.json();
    if (!list.length) { box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">ยังไม่มีบันทึก</div>`; return; }
    const methodColor = { POST:'text-emerald-600', PUT:'text-amber-600', PATCH:'text-amber-600', DELETE:'text-red-600' };
    box.innerHTML = list.map(l => `
      <div class="flex items-center gap-2.5 bg-slate-100 border border-line rounded-lg px-3 py-2 text-[11px]">
        <span class="font-mono font-bold w-14 shrink-0 ${methodColor[l.method]||'text-slate-500'}">${esc(l.method)}</span>
        <span class="font-mono text-slate-700 flex-1 truncate" title="${esc(l.path)}">${esc(l.path)}</span>
        <span class="shrink-0 ${l.status>=400?'text-red-600':'text-slate-500'}">${l.status}</span>
        <span class="text-slate-500 shrink-0">${esc(l.actor_name||l.actor_id)}</span>
        <span class="text-slate-400 shrink-0">${esc(l.ip||'')}</span>
        <span class="text-slate-400 shrink-0">${new Date(l.created_at*1000).toLocaleString('th-TH')}</span>
      </div>`).join('');
  }catch(e){ box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">โหลดไม่สำเร็จ</div>`; }
}

// ===================== ADMIN: API Key (Slip Check) =====================
async function loadApikeyRequests(){
  const box = document.getElementById('apikeyRequestsList');
  if (!box) return;
  box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>กำลังโหลด...</div>`;
  try{
    const res = await fetch('/api/admin/apikey/requests');
    if (!res.ok) { box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">โหลดไม่สำเร็จ</div>`; return; }
    const list = await res.json();
    if (!list.length) { box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">ยังไม่มีคำขอ</div>`; return; }
    const statusBadge = {
      pending: '<span class="text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-[10px]">รออนุมัติ</span>',
      approved: '<span class="text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-[10px]">อนุมัติแล้ว</span>',
      rejected: '<span class="text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 text-[10px]">ปฏิเสธ</span>',
      revoked: '<span class="text-slate-500 bg-slate-100 border border-line rounded-full px-2 py-0.5 text-[10px]">ระงับแล้ว</span>',
    };
    box.innerHTML = list.map(k => `
      <div class="panel-card rounded-xl p-3.5">
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <p class="text-xs font-semibold text-slate-900">${esc(k.user_name)} <span class="text-slate-400 font-normal">· ${esc(k.user_id)}</span></p>
          ${statusBadge[k.status] || ''}
        </div>
        ${k.note ? `<p class="text-[11px] text-slate-500 mb-1.5">"${esc(k.note)}"</p>` : ''}
        <p class="text-[10.5px] text-slate-400 mb-2">ขอเมื่อ ${new Date(k.requested_at*1000).toLocaleString('th-TH')}${k.key_prefix?` · คีย์: <span class="font-mono">${esc(k.key_prefix)}</span>`:''}${k.rate_limit_per_day?` · โควตา ${k.rate_limit_per_day} ครั้ง/วัน (ใช้ไป ${k.usage_count||0})`:''}</p>
        ${k.status === 'pending' ? `
          <div class="flex items-center gap-2">
            <input id="rl-${k.id}" type="number" min="1" value="50" class="input-dark rounded-lg px-2.5 py-1.5 text-[11px] w-24" title="โควตาครั้ง/วัน">
            <button onclick="approveApikey('${k.id}')" class="btn-cyan px-3 py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-check mr-1"></i>อนุมัติ</button>
            <button onclick="rejectApikey('${k.id}')" class="btn-ghost px-3 py-1.5 rounded-lg text-[11px] text-red-500"><i class="fa-solid fa-xmark mr-1"></i>ปฏิเสธ</button>
          </div>` : ''}
        ${k.status === 'approved' ? `<button onclick="revokeApikey('${k.id}')" class="btn-ghost px-3 py-1.5 rounded-lg text-[11px] text-red-500"><i class="fa-solid fa-ban mr-1"></i>ระงับคีย์นี้</button>` : ''}
      </div>`).join('');
  }catch(e){ box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">โหลดไม่สำเร็จ</div>`; }
}
async function approveApikey(id){
  const rl = parseInt(document.getElementById(`rl-${id}`)?.value, 10) || 50;
  try{
    const res = await fetch(`/api/admin/apikey/${id}/approve`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rate_limit_per_day: rl }) });
    if (!res.ok) { notifyToast('error','อนุมัติไม่สำเร็จ'); return; }
    notifyToast('success','อนุมัติแล้ว');
    loadApikeyRequests();
  }catch(e){ notifyToast('error','อนุมัติไม่สำเร็จ'); }
}
function rejectApikey(id){
  window.notifyConfirm('ปฏิเสธคำขอนี้?','ผู้ใช้จะขอใหม่ได้อีกครั้งภายหลัง', async ()=>{
    try{
      const res = await fetch(`/api/admin/apikey/${id}/reject`, { method:'POST' });
      if (!res.ok) { notifyToast('error','ทำรายการไม่สำเร็จ'); return; }
      notifyToast('success','ปฏิเสธคำขอแล้ว');
      loadApikeyRequests();
    }catch(e){ notifyToast('error','ทำรายการไม่สำเร็จ'); }
  });
}
function revokeApikey(id){
  window.notifyConfirm('ระงับคีย์นี้?','คีย์นี้จะเรียก API เช็คสลิปไม่ได้อีกทันที', async ()=>{
    try{
      const res = await fetch(`/api/admin/apikey/${id}/revoke`, { method:'POST' });
      if (!res.ok) { notifyToast('error','ทำรายการไม่สำเร็จ'); return; }
      notifyToast('success','ระงับคีย์แล้ว');
      loadApikeyRequests();
    }catch(e){ notifyToast('error','ทำรายการไม่สำเร็จ'); }
  });
}

function copyScript(btn, text){
  navigator.clipboard.writeText(text).then(()=>{
    btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>สำเร็จ</span>`;
    notifyToast('success','คัดลอกสคริปต์แล้ว');
    setTimeout(()=>{ btn.innerHTML = `<i class="fa-regular fa-copy mr-1"></i><span>คัดลอก</span>`; },1500);
  });
}
function openScriptModal(id){
  if (!currentUser){ notify('info','กรุณาเข้าสู่ระบบ','ต้องเข้าสู่ระบบผ่าน Discord ก่อนแจกสคริปต์'); return; }
  editingScriptId = id || null;
  const titleEl = document.getElementById('scriptModalTitle');
  if (id) {
    const s = scriptsData.find(x=>String(x.id)===String(id));
    if (!s) return;
    titleEl.innerHTML = '<i class="fa-solid fa-pen text-cyan mr-1.5"></i>แก้ไขสคริปต์';
    document.getElementById('scriptTitle').value = s.title;
    document.getElementById('scriptGame').value = s.game;
    document.getElementById('scriptImage').value = s.image || '';
    document.getElementById('scriptImagePreview').src = s.image || 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
    document.getElementById('scriptCode').value = s.script;
    resyncLua('scriptCode');
    document.getElementById('scriptKeySystem').checked = !!s.key_system;
  } else {
    titleEl.innerHTML = '<i class="fa-solid fa-circle-plus text-cyan mr-1.5"></i>เพิ่มสคริปต์ใหม่';
    document.getElementById('addScriptForm').reset();
    document.getElementById('scriptImagePreview').src = 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
    resyncLua('scriptCode');
  }
  document.getElementById('scriptModal').classList.remove('hidden');
}
function closeScriptModal(){ document.getElementById('scriptModal').classList.add('hidden'); editingScriptId = null; }
async function submitScript(e){
  e.preventDefault();
  const payload = {
    title: document.getElementById('scriptTitle').value,
    game: document.getElementById('scriptGame').value,
    image: document.getElementById('scriptImage').value,
    script: document.getElementById('scriptCode').value,
    key_system: document.getElementById('scriptKeySystem').checked
  };
  try{
    const url = editingScriptId ? `/api/scripts/${editingScriptId}` : '/api/scripts/user_add';
    const method = editingScriptId ? 'PATCH' : 'POST';
    const res = await fetch(url,{method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if (res.ok){
      closeScriptModal();
      notify('success', editingScriptId?'แก้ไขสคริปต์แล้ว':'เพิ่มสคริปต์เรียบร้อย', editingScriptId?'บันทึกการแก้ไขเรียบร้อยแล้ว':'สคริปต์ของคุณถูกเผยแพร่แล้ว');
      loadScripts();
    } else notify('error','ทำรายการไม่สำเร็จ','กรุณาตรวจสอบข้อมูลแล้วลองใหม่');
  }catch(e){ notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
}
function deleteScript(id){
  notifyConfirm('ลบสคริปต์นี้?','เมื่อลบแล้วจะไม่สามารถกู้คืนได้', async ()=>{
    try{
      const res = await fetch(`/api/scripts/${id}`,{method:'DELETE'});
      if (res.ok){ notifyToast('success','ลบสคริปต์แล้ว'); loadScripts(); }
      else notify('error','ลบไม่สำเร็จ','คุณไม่มีสิทธิ์ลบสคริปต์นี้');
    }catch(e){ notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
  }, 'ลบเลย');
}
async function likeScript(id){
  try{
    const res = await fetch(`/api/scripts/${id}/like`,{method:'POST'});
    if (res.status===401){ notify('info','กรุณาเข้าสู่ระบบ','ต้องเข้าสู่ระบบก่อนกดไลก์'); return; }
    const data = await res.json();
    if (data.success){
      const s = scriptsData.find(x=>String(x.id)===String(id));
      if(s) s.likes = data.likes;
      renderScripts(scriptsData);
      notifyToast('success','กดถูกใจแล้ว');
    }
  }catch(e){}
}
function openComments(id){
  activeCommentScriptId = id;
  document.getElementById('commentModal').classList.remove('hidden');
  renderComments();
}
function closeCommentModal(){ document.getElementById('commentModal').classList.add('hidden'); }
function renderComments(){
  const s = scriptsData.find(x=>String(x.id)===String(activeCommentScriptId));
  const list = document.getElementById('commentList');
  const comments = (s && s.comments) || [];
  if (!comments.length){ list.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ยังไม่มีความคิดเห็น</p>`; return; }
  list.innerHTML = comments.map(c=>`
    <div class="flex gap-2">
      <img src="${esc(c.avatar||'https://cdn.discordapp.com/embed/avatars/0.png')}" class="w-7 h-7 rounded-full object-cover shrink-0">
      <div class="bg-slate-100 border border-line rounded-xl px-3 py-2 flex-1 min-w-0">
        <p class="text-[11px] font-semibold text-slate-900 truncate">${esc(c.author)}</p>
        <p class="text-xs text-slate-600 break-words">${esc(c.message)}</p>
      </div>
    </div>`).join('');
}
async function submitComment(e){
  e.preventDefault();
  const input = document.getElementById('commentInput');
  if (!currentUser){ notify('info','กรุณาเข้าสู่ระบบ','ต้องเข้าสู่ระบบผ่าน Discord ก่อนแสดงความคิดเห็น'); return; }
  try{
    const res = await fetch(`/api/scripts/${activeCommentScriptId}/comment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input.value})});
    const data = await res.json();
    if (data.success){
      input.value = '';
      const s = scriptsData.find(x=>String(x.id)===String(activeCommentScriptId));
      if (s){ s.comments = data.comments; document.getElementById(`comment-count-${activeCommentScriptId}`).innerText = s.comments.length; }
      renderComments();
      notifyToast('success','ส่งความคิดเห็นแล้ว');
    }
  }catch(e){}
}

let searchTimeout;
document.getElementById('searchInput').addEventListener('input', ()=>{
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(()=>{
    const q = document.getElementById('searchInput').value.toLowerCase();
    renderScripts(scriptsData.filter(s=>s.title.toLowerCase().includes(q)||s.game.toLowerCase().includes(q)));
  },100);
});

async function loadPartners(){
  try{
    const res = await fetch('/api/partners',{cache:'no-cache'});
    const partners = await res.json();
    const grid = document.getElementById('partnerGrid');
    if (!partners.length){ grid.innerHTML = `<div class="col-span-full text-center py-16 text-xs text-slate-400">ยังไม่มีพาร์ทเนอร์</div>`; return; }
    grid.innerHTML = partners.map(p=>`
      <div class="panel-card rounded-xl p-5 text-center flex flex-col items-center">
        <img src="${esc(p.avatar)}" onerror="this.src='https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG'" class="w-16 h-16 rounded-xl border border-cyan object-cover mb-2.5">
        <h3 class="text-sm font-bold text-slate-900">${esc(p.username)}</h3>
        <span class="text-[11px] text-slate-400 eyebrow">ID: ${esc(p.discord_id)}</span>
        ${p.description?`<p class="text-[11px] text-slate-500 mt-2 leading-relaxed">${esc(p.description)}</p>`:''}
        ${p.discord_invite?`<a href="${esc(p.discord_invite)}" target="_blank" class="btn-ghost text-[11px] px-3 py-1.5 rounded-lg mt-3"><i class="fa-brands fa-discord text-cyan mr-1"></i>เข้าร่วม Discord</a>`:''}
      </div>`).join('');
  }catch(e){}
}

// ===================== API Key (Slip Check) — หน้าผู้ใช้ =====================
async function loadApikeyPage(){
  const loggedOut = document.getElementById('apikeyLoggedOut');
  const loggedIn = document.getElementById('apikeyLoggedIn');
  if (!currentUser) {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
    return;
  }
  loggedOut.classList.add('hidden');
  loggedIn.classList.remove('hidden');

  const box = document.getElementById('apikeyStatusBox');
  box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>กำลังโหลด...</div>`;
  try{
    const res = await fetch('/api/apikey/mine');
    const data = await res.json();
    renderApikeyStatus(data.key);
  }catch(e){ box.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">โหลดไม่สำเร็จ</div>`; }
}

function renderApikeyStatus(key){
  const box = document.getElementById('apikeyStatusBox');
  if (!key) {
    box.innerHTML = `
      <p class="text-sm font-bold text-slate-900 mb-2"><i class="fa-solid fa-circle-info text-cyan mr-1.5"></i>ยังไม่เคยขอ API key</p>
      <p class="text-[11.5px] text-slate-500 mb-3">กดขอได้เลย แอดมินจะพิจารณาและตั้งโควตาการใช้งานให้</p>
      <textarea id="apikeyNoteInput" rows="2" placeholder="บอกแอดมินหน่อยว่าจะเอาไปใช้ทำอะไร (ไม่บังคับ)" class="input-dark w-full rounded-lg px-3 py-2 text-xs mb-3"></textarea>
      <button onclick="submitApikeyRequest()" class="btn-cyan px-5 py-2.5 rounded-xl text-xs font-semibold"><i class="fa-solid fa-paper-plane mr-1.5"></i>ขอ API Key</button>`;
    return;
  }
  const statusMeta = {
    pending: { label: 'รออนุมัติ', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'fa-clock' },
    approved: { label: 'อนุมัติแล้ว', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'fa-circle-check' },
    rejected: { label: 'ถูกปฏิเสธ', color: 'text-red-600 bg-red-50 border-red-200', icon: 'fa-circle-xmark' },
    revoked: { label: 'ถูกระงับ', color: 'text-slate-500 bg-slate-100 border-line', icon: 'fa-ban' },
  }[key.status] || {};

  let extra = '';
  if (key.status === 'approved') {
    extra = key.key_full
      ? `<div class="mt-3">
          <label class="block text-[10px] text-slate-500 mb-1">API Key ของคุณ (แสดงครั้งนี้ครั้งเดียวเท่านั้น เก็บไว้ให้ดี)</label>
          <div class="flex gap-2">
            <input id="apikeyFullInput" readonly value="${esc(key.key_full)}" class="input-dark flex-1 rounded-lg px-3 py-2 text-[11px] font-mono">
            <button onclick="navigator.clipboard.writeText(document.getElementById('apikeyFullInput').value); notifyToast('success','คัดลอกแล้ว')" class="btn-ghost px-3 rounded-lg text-xs"><i class="fa-regular fa-copy"></i></button>
          </div>
          <p class="text-[10px] text-amber-600 mt-1.5"><i class="fa-solid fa-triangle-exclamation mr-1"></i>ถ้าปิดหน้านี้ไปจะไม่เห็นคีย์เต็มอีก (เห็นได้แค่ตัวย่อ) เก็บไว้ให้ดีตอนนี้เลย</p>
        </div>`
      : `<p class="text-[11.5px] text-slate-500 mt-2">คีย์: <span class="font-mono">${esc(key.key_prefix || '')}</span> · โควตา ${key.rate_limit_per_day} ครั้ง/วัน (ใช้ไปแล้ว ${key.usage_count || 0})</p>`;
  }
  if (key.status === 'rejected') {
    extra = `<button onclick="submitApikeyRequest()" class="btn-cyan px-4 py-2 rounded-lg text-[11px] mt-2">ขอใหม่อีกครั้ง</button>`;
  }

  box.innerHTML = `
    <div class="flex items-center justify-between mb-1.5">
      <p class="text-sm font-bold text-slate-900"><i class="fa-solid fa-key text-cyan mr-1.5"></i>สถานะ API Key ของคุณ</p>
      <span class="text-[10.5px] border rounded-full px-2.5 py-1 ${statusMeta.color}"><i class="fa-solid ${statusMeta.icon} mr-1"></i>${statusMeta.label}</span>
    </div>
    ${key.note ? `<p class="text-[11px] text-slate-400">หมายเหตุที่ส่งไป: "${esc(key.note)}"</p>` : ''}
    ${extra}`;
}

async function submitApikeyRequest(){
  const noteEl = document.getElementById('apikeyNoteInput');
  const note = noteEl ? noteEl.value : '';
  try{
    const res = await fetch('/api/apikey/request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ note }) });
    const data = await res.json();
    if (!res.ok && res.status !== 409) { notifyToast('error', data.message || 'ขอไม่สำเร็จ'); return; }
    notifyToast('success', res.status === 409 ? 'คุณมีคำขอ/คีย์อยู่แล้ว' : 'ส่งคำขอแล้ว รอแอดมินอนุมัติ');
    renderApikeyStatus(data.key);
  }catch(e){ notifyToast('error','ขอไม่สำเร็จ'); }
}

async function loadTeam(){
  try{
    const res = await fetch('/api/team',{cache:'no-cache'});
    teamData = await res.json();
    const grid = document.getElementById('teamGrid');
    if (!teamData.length){ grid.innerHTML = `<div class="col-span-full text-center py-16 text-xs text-slate-400">ยังไม่มีข้อมูลทีมงาน</div>`; return; }
    grid.innerHTML = teamData.map(m=>{
      const status = presenceStatusOf(m.presence);
      const activity = m.presence && m.presence.activities && m.presence.activities[0];
      return `
      <div class="panel-card rounded-2xl p-5 text-center flex flex-col items-center overflow-hidden">
        <div class="relative cursor-pointer" onclick="openProfileModal('${esc(m.discord_id)}')">
          ${renderAvatar(m.avatar,m.avatar_decoration,{size:64})}
          <span class="presence-dot ${status}" style="bottom:2px;right:2px" title="${status}"></span>
        </div>
        <h3 class="text-sm font-bold text-slate-900 mt-3 w-full truncate px-1 cursor-pointer" title="${esc(m.username)}" onclick="openProfileModal('${esc(m.discord_id)}')">${esc(m.username)}</h3>
        <span class="text-[10px] text-slate-400 eyebrow">ID: ${esc(m.discord_id)}</span>
        <span class="role-badge mt-1.5 max-w-full truncate">${esc(m.role)}</span>
        ${m.bio?`<p class="text-[11px] text-slate-500 mt-2 break-words w-full line-clamp-3">${esc(m.bio)}</p>`:''}
        ${activity?`<p class="presence-label text-slate-400 mt-2"><span class="dot-inline ${status}"></span>${esc(activity.type_label||'')} ${esc(activity.name||'')}</p>`:''}
        ${m.discord_profile_url?`<a href="${esc(m.discord_profile_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="btn-ghost text-[10px] px-3 py-1.5 rounded-lg mt-3"><i class="fa-brands fa-discord text-cyan mr-1"></i>ดูโปรไฟล์ Discord</a>`:''}
      </div>`;
    }).join('');
  }catch(e){}
}

async function submitVault(e){
  e.preventDefault();
  if (!currentUser){ notify('info','กรุณาเข้าสู่ระบบ','ต้องเข้าสู่ระบบก่อนฝากสคริปต์'); return; }
  const payload = { title: document.getElementById('vaultTitle').value, image: document.getElementById('vaultImage').value, script: document.getElementById('vaultScript').value, password: document.getElementById('vaultPassword').value };
  try{
    const res = await fetch('/api/vault',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data = await res.json();
    if (res.ok){
      const link = vaultRawUrl(data.code);
      const loadstringCode = `loadstring(game:HttpGet("${link}"))()`;
      const linkEl = document.getElementById('vaultResultLink');
      const loadstringEl = document.getElementById('vaultResultLoadstring');
      const resultBox = document.getElementById('vaultResult');
      const hintEl = document.getElementById('vaultResultHint');
      if (!linkEl || !loadstringEl || !resultBox) {
        // หน้าเว็บที่ deploy อยู่คนละเวอร์ชันกับ main.js (ไฟล์ html ไม่มีช่องผลลัพธ์ใหม่) — แจ้งให้ชัดแทนการโชว์ error มั่วๆ
        notify('success','สร้างลิงก์สำเร็จ', `ลิงก์: ${link}\n\nโค้ด: ${loadstringCode}\n\n(หน้าเว็บเวอร์ชันนี้ยังไม่มีกล่องแสดงผลใหม่ กรุณาอัปโหลดไฟล์ index.html ล่าสุดทับ)`);
        loadMyVault();
        return;
      }
      linkEl.value = link;
      loadstringEl.value = loadstringCode;
      resultBox.classList.remove('hidden');
      if (hintEl) {
        hintEl.textContent = data.has_password
          ? 'รหัสผ่านจะใช้ป้องกันแค่การดู/คัดลอกโค้ดผ่านหน้าเว็บเท่านั้น ส่วนโค้ด loadstring ด้านบนใช้รันได้เลยไม่ต้องใส่รหัส'
          : 'ใครมีลิงก์หรือโค้ดด้านบนจะเปิด/รันโค้ดนี้ได้ทันที';
        hintEl.classList.remove('hidden');
      }
      document.getElementById('vaultForm').reset();
      document.getElementById('vaultImagePreview').src = 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
      resyncLua('vaultScript');
      notify('success','สร้างลิงก์แล้ว', data.has_password ? 'ลิงก์นี้ตั้งรหัสผ่านไว้แล้ว (ป้องกันการดูโค้ดผ่านเว็บ แต่รันผ่าน loadstring ได้ตามปกติ)' : 'ใครมีลิงก์นี้จะเปิดโค้ดได้ทันที');
      loadMyVault();
    } else notify('error','สร้างลิงก์ไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
  }catch(e){ notify('error','เกิดข้อผิดพลาด', 'รายละเอียด: ' + (e && e.message ? e.message : 'ไม่ทราบสาเหตุ')); }
}
function copyVaultResult(){
  const el = document.getElementById('vaultResultLink');
  navigator.clipboard.writeText(el.value);
  notifyToast('success','คัดลอกลิงก์แล้ว');
}
function copyVaultLoadstring(){
  const el = document.getElementById('vaultResultLoadstring');
  navigator.clipboard.writeText(el.value);
  notifyToast('success','คัดลอกโค้ด loadstring แล้ว');
}
async function loadMyVault(){
  const wrap = document.getElementById('myVaultList');
  if (!currentUser){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">เข้าสู่ระบบเพื่อดูลิงก์ของคุณ</p>`; return; }
  try{
    const res = await fetch('/api/vault/mine',{cache:'no-cache'});
    const list = await res.json();
    if (!list.length){ wrap.innerHTML = `<p class="text-xs text-slate-400 text-center py-8">ยังไม่มีลิงก์ที่คุณสร้าง</p>`; return; }
    wrap.innerHTML = list.map(v=>`
      <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          ${v.image?`<img src="${esc(v.image)}" class="w-9 h-9 rounded-lg object-cover shrink-0" onerror="this.style.display='none'">`:''}
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-900 truncate">${esc(v.title)} ${v.has_password?'<i class="fa-solid fa-lock text-gold text-[10px] ml-1"></i>':''}</p>
            <p class="text-[10px] text-slate-400 eyebrow">${v.views} views · /${esc(v.code)}</p>
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <a href="${vaultRawUrl(v.code)}" target="_blank" rel="noopener" class="btn-ghost w-8 h-8 rounded-lg text-xs flex items-center justify-center" title="เปิดดู"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          <button onclick="copyVaultLinkByCode('${v.code}')" class="btn-ghost w-8 h-8 rounded-lg text-xs"><i class="fa-regular fa-copy"></i></button>
          <button onclick="openVaultEditModal('${v.code}')" class="btn-ghost w-8 h-8 rounded-lg text-xs" title="แก้ไขโค้ด/รหัสผ่าน"><i class="fa-solid fa-pen"></i></button>
          <button onclick="deleteVaultLink('${v.code}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
  }catch(e){}
}
function copyVaultLinkByCode(code){
  navigator.clipboard.writeText(vaultRawUrl(code));
  notifyToast('success','คัดลอกลิงก์แล้ว');
}
async function deleteVaultLink(code){
  notifyConfirm('ลบลิงก์นี้?','ลิงก์จะใช้งานไม่ได้ทันที', async ()=>{
    const res = await fetch(`/api/vault/${code}`,{method:'DELETE'});
    if (res.ok){ notifyToast('success','ลบลิงก์แล้ว'); loadMyVault(); if(document.getElementById('admin-vault')) loadAdminVault(); }
  }, 'ลบเลย');
}
function openReportModal(type, targetId, targetLabel){
  if (!currentUser){ notify('error','ต้องเข้าสู่ระบบก่อน','login ด้วย Discord เพื่อส่งรายงาน'); return; }
  document.getElementById('rpType').value = type;
  document.getElementById('rpTargetId').value = targetId;
  document.getElementById('rpTargetLabel').value = targetLabel || '';
  document.getElementById('reportModalTarget').textContent = targetLabel || targetId;
  document.getElementById('rpReason').value = '';
  document.getElementById('reportModal').classList.remove('hidden');
}
function closeReportModal(){ document.getElementById('reportModal').classList.add('hidden'); }
async function submitReport(e){
  e.preventDefault();
  const payload = {
    type: document.getElementById('rpType').value,
    target_id: document.getElementById('rpTargetId').value,
    target_label: document.getElementById('rpTargetLabel').value,
    reason: document.getElementById('rpReason').value,
  };
  const res = await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){ notify('success','ส่งรายงานแล้ว','ทีมงานจะตรวจสอบโดยเร็วที่สุด'); closeReportModal(); }
  else notify('error','ส่งไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
}
async function openVaultEditModal(code){
  const res = await fetch(`/api/vault/${code}/admin-view`,{cache:'no-cache'});
  if (!res.ok){ notify('error','เปิดแก้ไขไม่ได้','คุณอาจไม่ใช่เจ้าของลิงก์นี้'); return; }
  const data = await res.json();
  document.getElementById('veCode').value = code;
  document.getElementById('veTitle').value = data.title;
  document.getElementById('veImage').value = data.image || '';
  document.getElementById('veImagePreview').src = data.image || 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('veScript').value = data.script;
  document.getElementById('vePassword').value = '';
  document.getElementById('veRemovePassword').checked = false;
  document.getElementById('vaultEditModal').classList.remove('hidden');
  attachLuaHighlight('veScript');
  resyncLua('veScript');
}
function closeVaultEditModal(){ document.getElementById('vaultEditModal').classList.add('hidden'); }
async function submitVaultEdit(e){
  e.preventDefault();
  const code = document.getElementById('veCode').value;
  const payload = {
    title: document.getElementById('veTitle').value,
    image: document.getElementById('veImage').value,
    script: document.getElementById('veScript').value,
    remove_password: document.getElementById('veRemovePassword').checked,
  };
  const pw = document.getElementById('vePassword').value;
  if (pw.trim()) payload.password = pw;
  const res = await fetch(`/api/vault/${code}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){
    notify('success','บันทึกแล้ว','อัปเดตโค้ด/รหัสผ่านเรียบร้อย');
    closeVaultEditModal();
    loadMyVault();
    if (document.getElementById('admin-vault')) loadAdminVault();
  } else {
    notify('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
  }
}
async function openVaultUnlock(code){
  currentVaultUnlockCode = code;
  const wrap = document.getElementById('vaultUnlockWrap');
  wrap.classList.remove('hidden');
  document.getElementById('vaultUnlockedWrap').classList.add('hidden');
  document.getElementById('vaultPasswordWrap').classList.add('hidden');
  document.getElementById('vaultUnlockTitle').textContent = 'กำลังโหลด...';
  try{
    const res = await fetch(`/api/vault/${code}/meta`,{cache:'no-cache'});
    if (!res.ok){ document.getElementById('vaultUnlockTitle').textContent = 'ไม่พบลิงก์นี้ หรือถูกลบไปแล้ว'; return; }
    const meta = await res.json();
    document.getElementById('vaultUnlockTitle').textContent = meta.title;
    if (meta.has_password) document.getElementById('vaultPasswordWrap').classList.remove('hidden');
    else submitUnlock();
  }catch(e){ document.getElementById('vaultUnlockTitle').textContent = 'โหลดไม่สำเร็จ'; }
}
async function submitUnlock(){
  const password = document.getElementById('vaultUnlockPassword').value;
  try{
    const res = await fetch(`/api/vault/${currentVaultUnlockCode}/unlock`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    if (res.status===401){ notify('error','รหัสผ่านไม่ถูกต้อง','กรุณาลองใหม่อีกครั้ง'); return; }
    if (!res.ok){ notify('error','เปิดลิงก์ไม่สำเร็จ','ลิงก์นี้อาจถูกลบไปแล้ว'); return; }
    const data = await res.json();
    document.getElementById('vaultPasswordWrap').classList.add('hidden');
    document.getElementById('vaultUnlockedWrap').classList.remove('hidden');
    document.getElementById('vaultUnlockedScript').innerHTML = highlightLua(data.script);
  }catch(e){ notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
}
function copyUnlockedScript(){
  navigator.clipboard.writeText(document.getElementById('vaultUnlockedScript').textContent);
  notifyToast('success','คัดลอกโค้ดแล้ว');
}

function extractRobloxId(input){ const m = String(input||'').match(/(\d{5,})/); return m ? m[1] : null; }

async function checkRobloxId(){
  const raw = document.getElementById('robloxIdInput').value;
  const id = extractRobloxId(raw);
  if (!id){ notify('error','ใส่ ID ไม่ถูกต้อง','กรุณาใส่ Roblox Sound ID หรือลิงก์ที่ถูกต้อง'); return; }

  const box = document.getElementById('robloxResult');
  box.classList.remove('hidden');
  box.innerHTML = '';
  // แสดง popup "กำลังตรวจสอบ..." ระหว่างรอ Roblox API ตอบกลับ (มี spinner หมุน ปิดเองตอนได้ผลลัพธ์)
  const loading = notifyLoading('กำลังตรวจสอบ...', 'กำลังเชื่อมต่อ Roblox API เพื่อเช็ค ID นี้');
  try{
    const res = await fetch(`/api/roblox/check/${id}`,{cache:'no-cache'});
    loading.close();
    if (res.status===404){ notify('error','ไม่พบ ID นี้','ไม่พบข้อมูลใน Roblox กรุณาตรวจสอบ ID อีกครั้ง'); box.classList.add('hidden'); return; }
    if (!res.ok){ notify('error','เชื่อมต่อ Roblox ไม่สำเร็จ','กรุณาลองใหม่อีกครั้งในภายหลัง'); box.classList.add('hidden'); return; }
    const info = await res.json();
    box.innerHTML = renderRobloxCard(info, true);
    highlightPlayingCard();
    notifyToast('success','ตรวจสอบสำเร็จ');
  }catch(e){
    loading.close();
    notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    box.classList.add('hidden');
  }
}
function renderRobloxCard(info, showAddBtn){
  const canAdd = showAddBtn && canManage('roblox') && info.is_audio;
  const playable = info.is_audio && info.usable;
  const isFav = myFavoriteIds.has(String(info.id));
  return `
    <div class="panel-card rid-card rounded-xl p-4 flex items-center gap-3" data-rid="${esc(info.id)}">
      <img src="${esc(info.thumbnail||'')}" onerror="this.style.display='none'" class="w-14 h-14 rounded-lg object-cover bg-white shrink-0">
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-slate-900 truncate">${esc(info.name)}</p>
        <p class="text-[11px] text-slate-500 truncate">โดย ${esc(info.creator)}</p>
        <p class="text-[10px] text-slate-400 eyebrow flex items-center gap-1">ID: ${esc(info.id)} <i onclick='copyRobloxId(${JSON.stringify(info.id)}, ${JSON.stringify(info.name)})' class="fa-regular fa-copy copy-id-btn cursor-pointer" title="คัดลอก ID"></i> ${playable?'':(info.is_audio?'<span class="text-gold">· ติดลิขสิทธิ์</span>':'· ไม่ใช่ไฟล์เสียง')}</p>
      </div>
      <div class="flex flex-col gap-1.5 shrink-0 items-center">
        ${currentUser&&info.is_audio?`<i onclick='toggleFavorite(${JSON.stringify(info.id)}, ${JSON.stringify(info.name)}, ${JSON.stringify(info.thumbnail||"")}, this)' class="fa-solid fa-star fav-star-btn text-base cursor-pointer ${isFav?'is-fav':''}" title="เพิ่มรายการโปรด"></i>`:''}
        ${playable?`<button onclick='playRoblox(${JSON.stringify(info.id)}, ${JSON.stringify(info.name)}, ${JSON.stringify(info.thumbnail||"")})' class="btn-cyan w-9 h-9 rounded-lg text-xs"><i class="fa-solid fa-play"></i></button>`:''}
        ${canAdd?`<button onclick='adminAddRobloxDirect(${JSON.stringify(info.id)})' class="btn-ghost w-9 h-9 rounded-lg text-xs" title="เพิ่มเข้าคลัง"><i class="fa-solid fa-plus"></i></button>`:''}
      </div>
    </div>`;
}
let robloxGenresData = [], currentGenreFilter = null;
async function loadRobloxGenres(){
  try{
    const res = await fetch('/api/roblox/genres',{cache:'no-cache'});
    robloxGenresData = await res.json();
    renderRobloxGenres();
  }catch(e){}
}
function renderRobloxGenres(){
  const grid = document.getElementById('robloxGenresGrid');
  const watermark = Array.from({length:14}).map(()=>'FLEXOZY').join(' ');
  grid.innerHTML = robloxGenresData.map(g=>{
    const count = robloxCatalog.filter(s=>s.genre_id===g.id).length;
    return `
    <div onclick="filterRobloxGenre('${esc(g.id)}','${esc(g.title)}')" class="category-card cursor-pointer">
      ${g.image?`<div style="position:absolute;inset:0;background-image:url('${esc(g.image)}');background-size:cover;background-position:center;opacity:.28"></div>`:''}
      <div class="category-watermark"><span>${watermark}</span><span>${watermark}</span></div>
      ${g.image?`<img src="${esc(g.image)}" class="category-icon" onerror="this.style.display='none'">`:''}
      <div class="category-body">
        <p class="category-title">${esc(g.title)}</p>
      </div>
      <i class="fa-solid fa-arrow-right category-arrow"></i>
      <span class="category-count">${count} รายการ</span>
    </div>`;
  }).join('');
}
function filterRobloxGenre(genreId, title){
  currentGenreFilter = genreId;
  document.getElementById('robloxGenresSection').classList.add('hidden');
  document.getElementById('robloxGenreBackBtn').classList.remove('hidden');
  document.getElementById('robloxGenreBackLabel').textContent = title;
  switchRobloxTab('catalog');
  renderRobloxCatalog();
}
function clearRobloxGenreFilter(){
  currentGenreFilter = null;
  document.getElementById('robloxGenresSection').classList.remove('hidden');
  document.getElementById('robloxGenreBackBtn').classList.add('hidden');
  renderRobloxCatalog();
}
async function loadRobloxCatalog(){
  try{
    const res = await fetch('/api/roblox',{cache:'no-cache'});
    robloxCatalog = await res.json();
    renderRobloxCatalog();
    renderRobloxGenres();
  }catch(e){}
}
function renderRobloxCatalog(){
  const grid = document.getElementById('robloxCatalogGrid');
  const search = (document.getElementById('robloxSearchInput')?.value || '').trim().toLowerCase();
  let list = robloxCatalog;
  if (currentGenreFilter) list = list.filter(s=>s.genre_id===currentGenreFilter);
  if (search) list = list.filter(s=>s.name.toLowerCase().includes(search));
  if (!list.length){ grid.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-slate-400">ไม่พบเพลงที่ตรงกัน</div>`; return; }
  grid.innerHTML = list.map(s=>renderRobloxGridCard(s)).join('');
  highlightPlayingCard();
}
function renderRobloxGridCard(s){
  const isFav = myFavoriteIds.has(String(s.id));
  const playable = s.playable !== false;
  const genre = robloxGenresData.find(g=>g.id===s.genre_id);
  return `
    <div class="panel-card rid-card rounded-xl p-3 flex flex-col items-center text-center overflow-hidden relative" data-rid="${esc(s.id)}">
      ${currentUser?`<i onclick='toggleFavorite(${JSON.stringify(s.id)}, ${JSON.stringify(s.name)}, ${JSON.stringify(s.thumbnail||"")}, this)' class="fa-solid fa-star fav-star-btn text-sm cursor-pointer absolute top-2 right-2 z-10 ${isFav?'is-fav':''}" title="เพิ่มรายการโปรด"></i>`:''}
      ${canManage('roblox')?`<i onclick='openEditRobloxModal(${JSON.stringify(s.id)})' class="fa-solid fa-pen fav-star-btn text-[11px] cursor-pointer absolute top-2 left-2 z-10" title="แก้ไขชื่อ/หมวดหมู่"></i>`:''}
      <img src="${esc(s.thumbnail||'')}" onerror="this.style.display='none'" class="w-16 h-16 rounded-lg object-cover bg-white mb-2">
      <p class="text-[11px] font-semibold text-slate-900 truncate w-full" title="${esc(s.name)}">${esc(s.name)}</p>
      <p class="text-[10px] text-slate-400 truncate w-full">${esc(s.creator)}</p>
      ${genre?`<span class="perm-badge mb-1">${esc(genre.title)}</span>`:''}
      <p class="text-[9px] text-slate-400 eyebrow truncate w-full mb-1 flex items-center justify-center gap-1">ID: ${esc(s.id)} <i onclick='copyRobloxId(${JSON.stringify(s.id)}, ${JSON.stringify(s.name)})' class="fa-regular fa-copy copy-id-btn cursor-pointer" title="คัดลอก ID"></i></p>
      ${!playable?`<p class="playable-badge is-bad mb-2"><span class="dot-inline"></span>ติดลิขสิทธิ์</p>`:'<div class="mb-2"></div>'}
      <div class="flex gap-1.5 w-full">
        ${playable
          ? `<button onclick='playRoblox(${JSON.stringify(s.id)}, ${JSON.stringify(s.name)}, ${JSON.stringify(s.thumbnail||"")})' class="btn-cyan flex-1 py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-play"></i></button>`
          : (canManage('roblox') ? `<button onclick='retryRobloxCache(${JSON.stringify(s.id)}, this)' class="btn-ghost flex-1 py-1.5 rounded-lg text-[11px]"><i class="fa-solid fa-rotate mr-1"></i>ลองใหม่</button>` : `<button disabled class="flex-1 py-1.5 rounded-lg text-[11px] bg-slate-100 text-slate-400 cursor-not-allowed"><i class="fa-solid fa-ban"></i></button>`)}
        ${canManage('roblox')?`<button onclick='removeRobloxFromCatalog(${JSON.stringify(s.id)})' class="btn-danger w-8 rounded-lg text-[11px]"><i class="fa-solid fa-trash"></i></button>`:''}
      </div>
    </div>`;
}
function openEditRobloxModal(id){
  const s = robloxCatalog.find(x=>String(x.id)===String(id));
  if (!s) return;
  document.getElementById('erId').value = s.id;
  document.getElementById('erName').value = s.name;
  const sel = document.getElementById('erGenre');
  sel.innerHTML = '<option value="">ไม่ระบุหมวดหมู่</option>' + robloxGenresData.map(g=>`<option value="${esc(g.id)}" ${g.id===s.genre_id?'selected':''}>${esc(g.title)}</option>`).join('');
  document.getElementById('editRobloxModal').classList.remove('hidden');
}
function closeEditRobloxModal(){ document.getElementById('editRobloxModal').classList.add('hidden'); }
async function submitEditRoblox(e){
  e.preventDefault();
  const id = document.getElementById('erId').value;
  const payload = { name: document.getElementById('erName').value, genre_id: document.getElementById('erGenre').value };
  const res = await fetch(`/api/roblox/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){ notifyToast('success','บันทึกแล้ว'); closeEditRobloxModal(); loadRobloxCatalog(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
}
async function retryRobloxCache(id, btnEl){
  btnEl.disabled = true;
  btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try{
    const res = await fetch(`/api/roblox/${id}/retry-cache`,{method:'POST'});
    const data = await res.json();
    if (data.playable){ notifyToast('success','ดาวน์โหลดสำเร็จ เล่นได้แล้ว'); loadRobloxCatalog(); }
    else { notify('error','ยังเล่นไม่ได้','ลองดาวน์โหลดจาก Roblox ไม่สำเร็จอีกครั้ง'); btnEl.disabled=false; btnEl.innerHTML='<i class="fa-solid fa-rotate mr-1"></i>ลองใหม่'; }
  }catch(e){ btnEl.disabled=false; btnEl.innerHTML='<i class="fa-solid fa-rotate mr-1"></i>ลองใหม่'; }
}
function copyRobloxId(id, name){
  navigator.clipboard?.writeText(String(id)).then(()=> notifyToast('success','คัดลอก ID แล้ว')).catch(()=>{});
  fetch('/api/roblox/track-copy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name})}).catch(()=>{});
}

let myFavoriteIds = new Set(), myFavoritesData = [];
async function loadMyFavorites(){
  if (!currentUser){ myFavoriteIds = new Set(); myFavoritesData = []; return; }
  try{
    const res = await fetch('/api/favorites/mine',{cache:'no-cache'});
    if (!res.ok) return;
    myFavoritesData = await res.json();
    myFavoriteIds = new Set(myFavoritesData.map(f=>String(f.id)));
  }catch(e){}
}
async function toggleFavorite(id, name, thumbnail, iconEl){
  if (!currentUser){ notify('error','ต้องเข้าสู่ระบบก่อน','login ด้วย Discord เพื่อบันทึกรายการโปรด'); return; }
  try{
    const res = await fetch('/api/favorites/toggle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,thumbnail})});
    const data = await res.json();
    myFavoritesData = data.list;
    myFavoriteIds = new Set(myFavoritesData.map(f=>String(f.id)));
    if (iconEl) iconEl.classList.toggle('is-fav', data.favorited);
    notifyToast('success', data.favorited ? 'เพิ่มในรายการโปรดแล้ว' : 'เอาออกจากรายการโปรดแล้ว');
    if (document.getElementById('robloxFavoritesGrid') && !document.getElementById('robloxFavoritesGrid').classList.contains('hidden')) renderFavoritesGrid();
  }catch(e){ notify('error','เกิดข้อผิดพลาด','ลองใหม่อีกครั้ง'); }
}
function renderFavoritesGrid(){
  const grid = document.getElementById('robloxFavoritesGrid');
  if (!currentUser){ grid.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-slate-400">เข้าสู่ระบบเพื่อดูรายการโปรดของคุณ</div>`; return; }
  if (!myFavoritesData.length){ grid.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-slate-400"><i class="fa-regular fa-star text-lg block mb-2"></i>ยังไม่มีรายการโปรด กดรูปดาว ⭐ ที่เพลงเพื่อบันทึกไว้ดูภายหลัง</div>`; return; }
  grid.innerHTML = myFavoritesData.map(s=>renderRobloxGridCard(s)).join('');
  highlightPlayingCard();
}
function switchRobloxTab(tab){
  document.querySelectorAll('.rtab-btn').forEach(b=>b.classList.toggle('active', b.dataset.rtab===tab));
  document.getElementById('robloxCatalogGrid').classList.toggle('hidden', tab!=='catalog');
  document.getElementById('robloxFavoritesGrid').classList.toggle('hidden', tab!=='favorites');
  if (tab==='favorites') renderFavoritesGrid();
}
let currentPlayingId = null;
function highlightPlayingCard(){
  document.querySelectorAll('.rid-card').forEach(el=>{
    el.classList.toggle('is-playing', currentPlayingId !== null && el.dataset.rid === String(currentPlayingId));
  });
}
function playRoblox(id, name, thumbnail){
  const audio = document.getElementById('miniAudio');
  audio.src = `/api/roblox/audio/${id}`; // เซิร์ฟเวอร์จะดาวน์โหลดเก็บไว้แล้วเล่นจากไฟล์ที่เก็บไว้ตลอด (ครั้งแรกอาจโหลดช้าหน่อย)
  audio.play().catch(()=>{ notify('error','เล่นไม่ได้','ไม่สามารถดาวน์โหลดเสียงนี้จาก Roblox ได้ในขณะนี้ ลองใหม่อีกครั้ง'); });
  document.getElementById('miniPlayerTitle').textContent = name;
  const thumbEl = document.getElementById('miniPlayerThumb');
  if (thumbnail){ thumbEl.src = thumbnail; thumbEl.classList.remove('hidden'); } else { thumbEl.classList.add('hidden'); }
  document.getElementById('miniPlayer').classList.remove('hidden');
  document.body.classList.add('has-player');
  document.getElementById('miniPlayBtn').innerHTML = '<i class="fa-solid fa-pause text-xs"></i>';
  document.getElementById('miniEq').classList.add('playing');
  currentPlayingId = id;
  highlightPlayingCard();
}
function toggleMiniPlayer(){
  const audio = document.getElementById('miniAudio');
  const eq = document.getElementById('miniEq');
  if (audio.paused){ audio.play(); document.getElementById('miniPlayBtn').innerHTML = '<i class="fa-solid fa-pause text-xs"></i>'; eq.classList.add('playing'); }
  else { audio.pause(); document.getElementById('miniPlayBtn').innerHTML = '<i class="fa-solid fa-play text-xs"></i>'; eq.classList.remove('playing'); }
}
function closeMiniPlayer(){
  const audio = document.getElementById('miniAudio');
  audio.pause(); audio.src = '';
  document.getElementById('miniPlayer').classList.add('hidden');
  document.body.classList.remove('has-player');
  document.getElementById('miniEq').classList.remove('playing');
  currentPlayingId = null;
  highlightPlayingCard();
}
// ---- ระดับเสียง (volume) + ปิด/เปิดเสียง (mute) ของ mini player ----
(function initMiniPlayerVolume(){
  const audio = document.getElementById('miniAudio');
  const volSlider = document.getElementById('miniVolume');
  const muteBtn = document.getElementById('miniMuteBtn');
  const savedVol = Number(localStorage.getItem('luader_player_volume'));
  const initialVol = Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 100 ? savedVol : 80;
  volSlider.value = initialVol;
  audio.volume = initialVol / 100;
  function paintMuteIcon(){
    const icon = (audio.muted || audio.volume === 0) ? 'fa-volume-xmark' : (audio.volume < 0.5 ? 'fa-volume-low' : 'fa-volume-high');
    muteBtn.innerHTML = `<i class="fa-solid ${icon} text-xs"></i>`;
  }
  volSlider.addEventListener('input', ()=>{
    audio.volume = Number(volSlider.value) / 100;
    audio.muted = false;
    localStorage.setItem('luader_player_volume', volSlider.value);
    paintMuteIcon();
  });
  muteBtn.addEventListener('click', ()=>{
    audio.muted = !audio.muted;
    paintMuteIcon();
  });
  paintMuteIcon();
})();
function fmtTime(sec){
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}
// ---- แถบเลื่อนฟังเพลง (seek bar) ของ mini player ----
(function initMiniPlayerSeek(){
  const audio = document.getElementById('miniAudio');
  const seek = document.getElementById('miniSeek');
  const curEl = document.getElementById('miniTimeCurrent');
  const durEl = document.getElementById('miniTimeDuration');
  let userSeeking = false;
  const paintProgress = (val) => {
    const max = Number(seek.max) || 1;
    const pct = max > 0 ? (Number(val) / max) * 100 : 0;
    seek.style.setProperty('--seek-progress', `${pct}%`);
  };
  audio.addEventListener('loadedmetadata', ()=>{
    seek.max = audio.duration || 0;
    durEl.textContent = fmtTime(audio.duration);
  });
  audio.addEventListener('timeupdate', ()=>{
    if (userSeeking) return;
    seek.value = audio.currentTime;
    curEl.textContent = fmtTime(audio.currentTime);
    paintProgress(audio.currentTime);
  });
  audio.addEventListener('ended', ()=>{
    document.getElementById('miniPlayBtn').innerHTML = '<i class="fa-solid fa-play text-xs"></i>';
    document.getElementById('miniEq').classList.remove('playing');
  });
  seek.addEventListener('input', ()=>{
    userSeeking = true;
    curEl.textContent = fmtTime(Number(seek.value));
    paintProgress(seek.value);
  });
  seek.addEventListener('change', ()=>{
    audio.currentTime = Number(seek.value);
    userSeeking = false;
  });
})();
async function adminAddRobloxDirect(id){
  const loading = notifyLoading('กำลังเพิ่มเข้าคลัง...', 'กำลังตรวจสอบและบันทึกข้อมูล');
  try{
    const res = await fetch('/api/roblox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    loading.close();
    if (res.ok){ notify('success','เพิ่มเข้าคลังแล้ว','เพลงนี้จะปรากฏในหน้า Roblox ID ให้ทุกคนฟังได้'); loadRobloxCatalog(); }
    else notify('error','เพิ่มไม่สำเร็จ','อาจมี ID นี้ในคลังอยู่แล้ว');
  }catch(e){ loading.close(); notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
}
async function removeRobloxFromCatalog(id){
  notifyConfirm('ลบออกจากคลัง?','', async ()=>{
    const res = await fetch(`/api/roblox/${id}`,{method:'DELETE'});
    if (res.ok){ notifyToast('success','ลบแล้ว'); loadRobloxCatalog(); }
  }, 'ลบเลย');
}

async function openProfileModal(discordId){
  const modal = document.getElementById('profileModal');
  const body = document.getElementById('profileModalBody');
  modal.classList.remove('hidden');
  body.innerHTML = `<div class="profile-banner skeleton"></div><div class="px-5"><div class="profile-avatar-wrap avatar-frame"><div class="skeleton rounded-full" style="width:76px;height:76px"></div></div><div class="h-4 w-32 skeleton rounded mt-3"></div></div>`;
  try{
    const res = await fetch(`/api/profile/${discordId}`,{cache:'no-cache'});
    if (!res.ok){ body.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">ไม่พบข้อมูลโปรไฟล์นี้</div>`; return; }
    const p = await res.json();
    const bannerStyle = p.banner ? `background-image:url('${esc(p.banner)}')` : (p.accent_color?`background:#${p.accent_color.toString(16).padStart(6,'0')}`:'');
    const status = presenceStatusOf(p.presence);
    const activity = p.presence && p.presence.activities && p.presence.activities[0];
    const statusLabelMap = { online:'ออนไลน์', idle:'ไม่อยู่ที่คีย์บอร์ด', dnd:'ห้ามรบกวน', offline:'ออฟไลน์', unknown:'ไม่ทราบสถานะ' };
    const profileUrl = p.discord_profile_url || (p.auth_provider==='local' ? null : `https://discord.com/users/${p.discord_id}`);
    body.innerHTML = `
      <div class="profile-banner" style="${bannerStyle}"></div>
      <div class="px-5">
        <div class="profile-avatar-wrap relative">
          ${renderAvatar(p.avatar,p.avatar_decoration,{size:76,adminRing:p.is_admin})}
          <span class="presence-dot ${status}" style="bottom:4px;right:4px;width:15px;height:15px" title="${status}"></span>
        </div>
        <div class="mt-3">
          <div class="flex items-center gap-1.5 min-w-0"><h3 class="text-base font-bold text-slate-900 truncate">${esc(p.username)}</h3>${p.is_admin?'<i class="fa-solid fa-shield-halved text-gold text-xs shrink-0" title="แอดมิน"></i>':''}</div>
          <span class="text-[11px] text-slate-400 eyebrow break-all">@${esc(p.handle)} · ID ${esc(p.discord_id)}</span>
          ${renderBadges(p.badges)}
          <p class="presence-label text-slate-500 mt-2"><span class="dot-inline ${status}"></span>${statusLabelMap[status]||''}${activity?` · ${esc(activity.type_label||'')} ${esc(activity.name||'')}`:''}</p>
          <div class="flex items-center gap-1.5 mt-3.5 bg-slate-100 border border-line rounded-xl px-3 py-2 w-fit">
            <i class="fa-solid fa-scroll text-cyan text-xs"></i><span class="text-xs text-slate-600">แจกสคริปต์แล้ว <b class="text-slate-900">${p.script_count||0}</b> รายการ</span>
          </div>
          ${profileUrl?`<a href="${esc(profileUrl)}" target="_blank" rel="noopener" class="btn-ghost text-[11px] px-3 py-1.5 rounded-lg mt-2.5 inline-flex items-center"><i class="fa-brands fa-discord text-cyan mr-1.5"></i>ดูโปรไฟล์/ไบโอบน Discord</a>`:''}
          ${(currentUser && isStaff() && currentUser.discord_id===discordId) ? `
          <div class="admin-quickmenu">
            <span class="admin-quickmenu-label"><i class="fa-solid fa-shield-halved mr-1"></i>เมนูแอดมิน</span>
            <button onclick="goAdminTab('overview')" class="admin-quick-btn"><i class="fa-solid fa-shield-halved"></i>เปิด Admin Panel</button>
            ${canManage('partners')?`<button onclick="goAdminTab('partners')" class="admin-quick-btn"><i class="fa-solid fa-handshake"></i>จัดการพาร์ทเนอร์</button>`:''}
            ${canManage('settings')?`<button onclick="goAdminTab('popup')" class="admin-quick-btn"><i class="fa-solid fa-gift"></i>ตั้งค่าป็อปอัพต้อนรับ</button>`:''}
            ${canManage('settings')?`<button onclick="goAdminTab('settings')" class="admin-quick-btn"><i class="fa-solid fa-sliders"></i>ตั้งค่าเว็บไซต์</button>`:''}
            ${canManage('members')?`<button onclick="goAdminTab('members')" class="admin-quick-btn"><i class="fa-solid fa-users"></i>ดูรายชื่อสมาชิก</button>`:''}
            ${currentUser.is_admin?`<button onclick="goAdminTab('team')" class="admin-quick-btn"><i class="fa-solid fa-user-tag"></i>จัดการทีมงาน/ยศ</button>`:''}
          </div>` : ''}
        </div>
      </div><div class="h-4"></div>`;
  }catch(e){ body.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">โหลดโปรไฟล์ไม่สำเร็จ</div>`; }
}
function closeProfileModal(){ document.getElementById('profileModal').classList.add('hidden'); }
function goAdminTab(subtab){
  closeProfileModal();
  if (document.getElementById('adminPanel')) {
    // อยู่ในหน้า /admin อยู่แล้ว แค่สลับแท็บในหน้าเดียวกัน (ไม่รีโหลดหน้า)
    navigate('/admin/' + subtab);
    applyAdminTabVisibility();
    adminTab(subtab);
  } else {
    // อยู่หน้าเว็บหลัก (index.html) — หน้านี้ไม่มีแผงแอดมินแล้ว ต้องไปหน้า /admin จริงๆ
    location.href = '/admin/' + subtab;
  }
}

function applyAdminTabVisibility(){
  let firstVisible = null;
  document.querySelectorAll('.admin-subtab').forEach(el=>{
    const perm = el.dataset.perm;
    const visible = perm === '' || (perm === '__admin_only__' ? !!(currentUser && currentUser.is_admin) : canManage(perm));
    el.classList.toggle('hidden', !visible);
    if (visible && !firstVisible) firstVisible = el.dataset.sub;
  });
  const activeBtn = document.querySelector(`.admin-subtab[data-sub="${currentAdminSubtab}"]`);
  if (!activeBtn || activeBtn.classList.contains('hidden')) {
    currentAdminSubtab = firstVisible || 'overview';
  }
}
function adminTab(name){
  currentAdminSubtab = name;
  document.querySelectorAll('.admin-subtab').forEach(el=>el.classList.toggle('active', el.dataset.sub===name));
  document.querySelectorAll('.admin-pane').forEach(el=>el.classList.toggle('hidden', el.id!==`admin-${name}`));
  if (name==='overview') fetchStats();
  if (name==='scripts') renderAdminScripts();
  if (name==='partners') loadAdminPartners();
  if (name==='categories') loadAdminCategories();
  if (name==='team') renderAdminTeam();
  if (name==='roblox') loadAdminGenres();
  if (name==='vault') loadAdminVault();
  if (name==='members') { loadAdminMembers(); loadStatsChart(); }
  if (name==='moderation') { loadReports(); loadBans(); }
  if (name==='webhooks') loadAdminWebhooks();
  if (name==='settings') fillAdminSettings();
  if (name==='loading') fillAdminLoading();
  if (name==='popup') fillAdminPopup();
  if (name==='store') { loadStoreProducts(); loadAdminOrders(); }
  if (name==='redeem') loadRedeemCodes();
  if (name==='apikeys') loadApikeyRequests();
  if (name==='maintenance') fillAdminMaintenance();
  if (name==='audit') loadAuditLog();
}
function renderAdminScripts(){
  const wrap = document.getElementById('adminScriptsTable');
  if (!wrap) return;
  if (!scriptsData.length){ wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีสคริปต์</p>`; return; }
  wrap.innerHTML = scriptsData.map(s=>`
    <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
      <div class="min-w-0"><p class="text-xs font-semibold text-slate-900 truncate">${esc(s.title)}</p><p class="text-[10px] text-slate-400 eyebrow">${esc(s.game)} · โดย ${esc(s.author)} · ❤ ${s.likes||0}</p></div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="openScriptModal('${s.id}')" class="btn-ghost w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button>
        <button onclick="deleteScript('${s.id}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}
let adminPartnersCache = [], editingPartnerId = null;
async function loadAdminPartners(){
  const res = await fetch('/api/partners',{cache:'no-cache'});
  adminPartnersCache = await res.json();
  const wrap = document.getElementById('adminPartnersList');
  wrap.innerHTML = adminPartnersCache.map(p=>`
    <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <img src="${esc(p.avatar)}" class="w-9 h-9 rounded-lg object-cover shrink-0" onerror="this.src='https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG'">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-slate-900 truncate">${esc(p.username)}</p>
          <p class="text-[10px] text-slate-400 truncate">${esc(p.description||'ไม่มีคำอธิบาย')}</p>
        </div>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="editPartner('${esc(p.discord_id)}')" class="btn-ghost w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button>
        <button onclick="adminRemovePartner('${esc(p.discord_id)}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('') || `<p class="text-xs text-slate-400">ยังไม่มีพาร์ทเนอร์</p>`;
}
function editPartner(discordId){
  const p = adminPartnersCache.find(x=>x.discord_id===discordId);
  if (!p) return;
  editingPartnerId = discordId;
  document.getElementById('apDiscordId').value = p.discord_id;
  document.getElementById('apDiscordId').disabled = true;
  document.getElementById('apUsername').value = p.username || '';
  document.getElementById('apAvatar').value = p.avatar || '';
  document.getElementById('apAvatarPreview').src = p.avatar || 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('apDescription').value = p.description || '';
  document.getElementById('apDiscordInvite').value = p.discord_invite || '';
  document.getElementById('partnerFormTitle').innerHTML = `<i class="fa-solid fa-pen text-cyan mr-1.5"></i>แก้ไขพาร์ทเนอร์`;
  document.getElementById('partnerFormSubmitBtn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('partnerFormCancelBtn').classList.remove('hidden');
  document.getElementById('partnerForm').scrollIntoView({behavior:'smooth', block:'center'});
}
function resetPartnerForm(){
  editingPartnerId = null;
  document.getElementById('partnerForm').reset();
  document.getElementById('apDiscordId').disabled = false;
  document.getElementById('apAvatarPreview').src = 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('partnerFormTitle').innerHTML = `<i class="fa-solid fa-handshake text-cyan mr-1.5"></i>เพิ่มพาร์ทเนอร์ใหม่`;
  document.getElementById('partnerFormSubmitBtn').textContent = 'เพิ่มพาร์ทเนอร์';
  document.getElementById('partnerFormCancelBtn').classList.add('hidden');
}
async function adminSubmitPartner(e){
  e.preventDefault();
  const payload = {
    discord_id: document.getElementById('apDiscordId').value,
    username: document.getElementById('apUsername').value,
    avatar: document.getElementById('apAvatar').value,
    description: document.getElementById('apDescription').value,
    discord_invite: document.getElementById('apDiscordInvite').value,
  };
  const isEdit = !!editingPartnerId;
  const res = await fetch(`/api/partners${isEdit ? '/'+editingPartnerId : ''}`, { method: isEdit?'PUT':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  if (res.ok){ notify('success', isEdit?'บันทึกการแก้ไขแล้ว':'เพิ่มพาร์ทเนอร์แล้ว',''); resetPartnerForm(); loadAdminPartners(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาตรวจสอบข้อมูล');
}
async function adminRemovePartner(id){
  const res = await fetch(`/api/partners/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ลบแล้ว'); if (editingPartnerId===id) resetPartnerForm(); loadAdminPartners(); }
}
let adminCategoriesCache = [], editingCategoryId = null;
async function loadAdminCategories(){
  const res = await fetch('/api/categories',{cache:'no-cache'});
  adminCategoriesCache = await res.json();
  const wrap = document.getElementById('adminCategoriesList');
  wrap.innerHTML = adminCategoriesCache.map(c=>`
    <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <img src="${esc(c.image)}" class="w-9 h-9 rounded-lg object-cover shrink-0" onerror="this.src='https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG'">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-slate-900 truncate">${esc(c.title)}</p>
          <p class="text-[10px] text-slate-400 truncate">${esc(c.subtitle||'ไม่มีคำโปรย')}</p>
        </div>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="editCategory('${esc(c.id)}')" class="btn-ghost w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button>
        <button onclick="adminRemoveCategory('${esc(c.id)}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('') || `<p class="text-xs text-slate-400">ยังไม่มีหมวดหมู่</p>`;
}
function editCategory(id){
  const c = adminCategoriesCache.find(x=>x.id===id);
  if (!c) return;
  editingCategoryId = id;
  document.getElementById('catTitle').value = c.title || '';
  document.getElementById('catSubtitle').value = c.subtitle || '';
  document.getElementById('catImage').value = c.image || '';
  document.getElementById('catImagePreview').src = c.image || 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('catLink').value = c.link || '';
  document.getElementById('catOrder').value = c.order ?? '';
  document.getElementById('categoryFormTitle').innerHTML = `<i class="fa-solid fa-pen text-cyan mr-1.5"></i>แก้ไขหมวดหมู่`;
  document.getElementById('categoryFormSubmitBtn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('categoryFormCancelBtn').classList.remove('hidden');
  document.getElementById('categoryForm').scrollIntoView({behavior:'smooth', block:'center'});
}
function resetCategoryForm(){
  editingCategoryId = null;
  document.getElementById('categoryForm').reset();
  document.getElementById('catImagePreview').src = 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('categoryFormTitle').innerHTML = `<i class="fa-solid fa-grip text-cyan mr-1.5"></i>เพิ่มหมวดหมู่ใหม่`;
  document.getElementById('categoryFormSubmitBtn').textContent = 'เพิ่มหมวดหมู่';
  document.getElementById('categoryFormCancelBtn').classList.add('hidden');
}
async function adminSubmitCategory(e){
  e.preventDefault();
  const payload = {
    title: document.getElementById('catTitle').value,
    subtitle: document.getElementById('catSubtitle').value,
    image: document.getElementById('catImage').value,
    link: document.getElementById('catLink').value,
    order: document.getElementById('catOrder').value,
  };
  const isEdit = !!editingCategoryId;
  const res = await fetch(`/api/categories${isEdit?'/'+editingCategoryId:''}`, { method: isEdit?'PATCH':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  if (res.ok){ notify('success', isEdit?'บันทึกการแก้ไขแล้ว':'เพิ่มหมวดหมู่แล้ว',''); resetCategoryForm(); loadAdminCategories(); loadCategories(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาตรวจสอบข้อมูล');
}
async function adminRemoveCategory(id){
  const res = await fetch(`/api/categories/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ลบแล้ว'); if (editingCategoryId===id) resetCategoryForm(); loadAdminCategories(); loadCategories(); }
}
const PERMISSIONS_LIST = [
  { key:'scripts', label:'จัดการสคริปต์', desc:'ลบ/แก้ไขสคริปต์ของคนอื่นได้' },
  { key:'roblox', label:'คลังเสียง Roblox ID', desc:'เพิ่ม/ลบเพลงในคลัง' },
  { key:'partners', label:'พาร์ทเนอร์', desc:'เพิ่ม/แก้ไข/ลบพาร์ทเนอร์' },
  { key:'vault', label:'ดูลิงก์ Vault ทั้งหมด', desc:'ดูลิงก์ฝากสคริปต์ของทุกคน' },
  { key:'settings', label:'ตั้งค่าเว็บไซต์', desc:'แก้ไขตั้งค่าเว็บและป็อปอัพ' },
  { key:'members', label:'ดูรายชื่อสมาชิก', desc:'ดูสถิติสมาชิกและเวลาเข้าเว็บล่าสุด' },
  { key:'store', label:'จัดการร้านค้า', desc:'เพิ่ม/แก้ไข/ลบสินค้า ดูออเดอร์ทั้งหมด' },
  { key:'redeem', label:'จัดการโค้ดแลกรางวัล', desc:'สร้าง/ปิดใช้งาน/ลบโค้ดแลกรางวัล' },
];
function renderPermGrid(selected){
  const sel = new Set(selected||[]);
  return PERMISSIONS_LIST.map(p=>`
    <label class="perm-chip">
      <input type="checkbox" value="${p.key}" ${sel.has(p.key)?'checked':''}>
      <span><span class="perm-chip-title">${p.label}</span><span class="perm-chip-desc">${p.desc}</span></span>
    </label>`).join('');
}
function getCheckedPerms(container){
  return Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(i=>i.value);
}
let editingTeamId = null;
function renderAdminTeam(){
  const wrap = document.getElementById('adminTeamList');
  document.getElementById('atPermGrid').innerHTML = renderPermGrid([]);
  if (!teamData.length){ wrap.innerHTML = `<p class="text-xs text-slate-400">ยังไม่มีทีมงาน</p>`; loadTeam().then(renderAdminTeam); return; }
  wrap.innerHTML = teamData.map(m=>`
    <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <img src="${esc(m.avatar)}" class="w-8 h-8 rounded-lg object-cover shrink-0">
        <div class="min-w-0">
          <p class="text-xs text-slate-900 truncate">${esc(m.username)}</p>
          <p class="text-[10px] text-slate-400 eyebrow truncate">${esc(m.role)} · ID ${esc(m.discord_id)}</p>
          ${(m.permissions&&m.permissions.length)?`<div class="flex flex-wrap gap-1 mt-1">${m.permissions.map(p=>`<span class="perm-badge">${esc(p)}</span>`).join('')}</div>`:''}
        </div>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="editTeamMember('${esc(m.discord_id)}')" class="btn-ghost w-8 h-8 rounded-lg text-xs" title="แก้ไข/ตั้งยศ"><i class="fa-solid fa-pen"></i></button>
        <button onclick="adminRefreshTeam('${esc(m.discord_id)}')" class="btn-ghost w-8 h-8 rounded-lg text-xs" title="ดึงโปรไฟล์ล่าสุดจาก Discord"><i class="fa-solid fa-rotate"></i></button>
        <button onclick="adminRemoveTeam('${esc(m.discord_id)}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}
function editTeamMember(discordId){
  const m = teamData.find(x=>x.discord_id===discordId);
  if (!m) return;
  editingTeamId = discordId;
  document.getElementById('atDiscordId').value = m.discord_id;
  document.getElementById('atDiscordId').disabled = true;
  document.getElementById('atRole').value = m.role || '';
  document.getElementById('atBio').value = m.bio || '';
  document.getElementById('atPermGrid').innerHTML = renderPermGrid(m.permissions || []);
  document.getElementById('teamFormTitle').innerHTML = `<i class="fa-solid fa-pen text-cyan mr-1.5"></i>แก้ไข ${esc(m.username)} · ตั้งยศ/สิทธิ์`;
  document.getElementById('teamFormSubmitBtn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('teamFormCancelBtn').classList.remove('hidden');
  document.getElementById('teamForm').scrollIntoView({behavior:'smooth', block:'center'});
}
function resetTeamForm(){
  editingTeamId = null;
  document.getElementById('teamForm').reset();
  document.getElementById('atDiscordId').disabled = false;
  document.getElementById('atPermGrid').innerHTML = renderPermGrid([]);
  document.getElementById('teamFormTitle').innerHTML = `<i class="fa-solid fa-user-plus text-cyan mr-1.5"></i>เพิ่มทีมงานใหม่`;
  document.getElementById('teamFormSubmitBtn').textContent = 'ดึงโปรไฟล์ + เพิ่ม';
  document.getElementById('teamFormCancelBtn').classList.add('hidden');
}
async function adminSubmitTeam(e){
  e.preventDefault();
  const permissions = getCheckedPerms(document.getElementById('atPermGrid'));
  const role = document.getElementById('atRole').value;
  const bio = document.getElementById('atBio').value;
  if (editingTeamId){
    const res = await fetch(`/api/team/${editingTeamId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({role,bio,permissions})});
    if (res.ok){ notify('success','บันทึกแล้ว','อัปเดตยศ/สิทธิ์เรียบร้อย'); resetTeamForm(); teamData=[]; await loadTeam(); renderAdminTeam(); }
    else notify('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
    return;
  }
  const payload = { discord_id: document.getElementById('atDiscordId').value.trim(), role, bio, permissions };
  const loading = notifyLoading('กำลังดึงโปรไฟล์...', 'กำลังเชื่อมต่อ Discord เพื่อดึงชื่อและรูปโปรไฟล์ด้วย ID');
  try{
    const res = await fetch('/api/team',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    loading.close();
    if (res.ok){
      notify('success','เพิ่มทีมงานแล้ว','ดึงชื่อและรูปโปรไฟล์จาก Discord เรียบร้อย');
      resetTeamForm();
      teamData=[]; await loadTeam(); renderAdminTeam();
    } else {
      const data = await res.json().catch(()=>({}));
      const msgMap = { already_in_team:'คนนี้อยู่ในทีมงานอยู่แล้ว', discord_user_not_found:'ไม่พบผู้ใช้ Discord ID นี้', invalid_discord_id:'Discord ID ไม่ถูกต้อง', discord_unreachable:'เชื่อมต่อ Discord ไม่สำเร็จ ลองใหม่อีกครั้ง' };
      notify('error','เพิ่มไม่สำเร็จ', msgMap[data.error] || 'กรุณาตรวจสอบข้อมูลแล้วลองใหม่');
    }
  }catch(e){ loading.close(); notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
}
async function adminRefreshTeam(id){
  const res = await fetch(`/api/team/${id}/refresh`,{method:'POST'});
  if (res.ok){ notifyToast('success','อัปเดตโปรไฟล์แล้ว'); teamData=[]; await loadTeam(); renderAdminTeam(); }
  else notify('error','อัปเดตไม่สำเร็จ','อาจหา Discord ID นี้ไม่เจอแล้ว');
}
async function adminRemoveTeam(id){
  const res = await fetch(`/api/team/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ลบแล้ว'); if (editingTeamId===id) resetTeamForm(); teamData=[]; await loadTeam(); renderAdminTeam(); }
}
async function adminAddRoblox(){
  const raw = document.getElementById('arIdInput').value;
  const id = extractRobloxId(raw);
  const name = document.getElementById('arNameInput').value.trim();
  const genre_id = document.getElementById('arGenreInput').value;
  if (!id){ notify('error','ใส่ ID ไม่ถูกต้อง','กรุณาใส่ Roblox Sound ID หรือลิงก์ที่ถูกต้อง'); return; }
  const loading = notifyLoading('กำลังตรวจสอบและเพิ่ม...', 'กำลังเชื่อมต่อ Roblox API');
  try{
    const res = await fetch('/api/roblox',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id, name, genre_id})});
    loading.close();
    if (res.ok){ notify('success','เพิ่มเข้าคลังแล้ว',''); document.getElementById('arIdInput').value=''; document.getElementById('arNameInput').value=''; loadRobloxCatalog(); }
    else notify('error','เพิ่มไม่สำเร็จ','ID นี้อาจไม่ใช่ไฟล์เสียง หรือมีอยู่ในคลังแล้ว');
  }catch(e){ loading.close(); notify('error','เกิดข้อผิดพลาด','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); }
}
function fillGenreDropdown(){
  const sel = document.getElementById('arGenreInput');
  if (sel) sel.innerHTML = '<option value="">ไม่ระบุหมวดหมู่</option>' + robloxGenresData.map(g=>`<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('');
}
let editingGenreId = null;
async function loadAdminGenres(){
  await loadRobloxGenres();
  fillGenreDropdown();
  const wrap = document.getElementById('adminGenresList');
  wrap.innerHTML = robloxGenresData.map(g=>`
    <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <img src="${esc(g.image)}" class="w-9 h-9 rounded-lg object-cover shrink-0" onerror="this.src='https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG'">
        <p class="text-xs font-semibold text-slate-900 truncate">${esc(g.title)}</p>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="editGenre('${esc(g.id)}')" class="btn-ghost w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-pen"></i></button>
        <button onclick="adminRemoveGenre('${esc(g.id)}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('') || `<p class="text-xs text-slate-400">ยังไม่มีหมวดหมู่</p>`;
}
function editGenre(id){
  const g = robloxGenresData.find(x=>x.id===id);
  if (!g) return;
  editingGenreId = id;
  document.getElementById('genreTitle').value = g.title;
  document.getElementById('genreImage').value = g.image || '';
  document.getElementById('genreImagePreview').src = g.image || 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('genreSubmitBtn').textContent = 'บันทึกการแก้ไข';
  document.getElementById('genreCancelBtn').classList.remove('hidden');
}
function resetGenreForm(){
  editingGenreId = null;
  document.getElementById('genreTitle').value = '';
  document.getElementById('genreImage').value = '';
  document.getElementById('genreImagePreview').src = 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('genreSubmitBtn').textContent = 'เพิ่มหมวดหมู่';
  document.getElementById('genreCancelBtn').classList.add('hidden');
}
async function adminSubmitGenre(e){
  e.preventDefault();
  const payload = { title: document.getElementById('genreTitle').value, image: document.getElementById('genreImage').value };
  const isEdit = !!editingGenreId;
  const res = await fetch(`/api/roblox/genres${isEdit?'/'+editingGenreId:''}`, { method: isEdit?'PATCH':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  if (res.ok){ notifyToast('success', isEdit?'บันทึกแล้ว':'เพิ่มหมวดหมู่แล้ว'); resetGenreForm(); loadAdminGenres(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาตรวจสอบข้อมูล');
}
async function adminRemoveGenre(id){
  const res = await fetch(`/api/roblox/genres/${id}`,{method:'DELETE'});
  if (res.ok){ notifyToast('success','ลบแล้ว'); if (editingGenreId===id) resetGenreForm(); loadAdminGenres(); }
}
async function loadAdminVault(){
  const res = await fetch('/api/vault',{cache:'no-cache'});
  if (!res.ok) return;
  const list = await res.json();
  const wrap = document.getElementById('adminVaultList');
  const ovVault = document.getElementById('ovVault');
  if (ovVault) ovVault.textContent = list.length;
  wrap.innerHTML = list.length ? list.map(v=>`
    <div class="bg-slate-100 border border-line rounded-xl p-3 flex items-center justify-between gap-2">
      <div class="min-w-0"><p class="text-xs font-semibold text-slate-900 truncate">${esc(v.title)} ${v.has_password?'<i class="fa-solid fa-lock text-gold text-[10px] ml-1"></i>':''}</p><p class="text-[10px] text-slate-400 eyebrow">โดย ${esc(v.owner_name)} · ${v.views} views · /${esc(v.code)}</p></div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="adminViewVault('${v.code}')" class="btn-ghost w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-eye"></i></button>
        <button onclick="deleteVaultLink('${v.code}')" class="btn-danger w-8 h-8 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('') : `<p class="text-xs text-slate-400">ยังไม่มีลิงก์ในระบบ</p>`;
}
async function adminViewVault(code){
  const res = await fetch(`/api/vault/${code}/admin-view`,{cache:'no-cache'});
  if (!res.ok) return;
  const data = await res.json();
  document.getElementById('adminCodeModalTitle').innerHTML = `<i class="fa-solid fa-eye text-cyan mr-1.5"></i>${esc(data.title)}`;
  document.getElementById('adminCodeModalBody').innerHTML = highlightLua(data.script);
  document.getElementById('adminCodeModalBody').dataset.rawScript = data.script;
  document.getElementById('adminCodeModal').classList.remove('hidden');
}
function copyAdminCodeModal(){
  const raw = document.getElementById('adminCodeModalBody').dataset.rawScript || '';
  navigator.clipboard?.writeText(raw).then(()=> notifyToast('success','คัดลอกโค้ดแล้ว')).catch(()=>{});
}
function closeAdminCodeModal(){ document.getElementById('adminCodeModal').classList.add('hidden'); }
function fillAdminSettings(){
  document.getElementById('stSiteName').value = siteSettings.site_name || '';
  document.getElementById('stTagline').value = siteSettings.tagline || '';
  document.getElementById('stHeroNote').value = siteSettings.hero_note || '';
  document.getElementById('stAnnouncement').value = siteSettings.announcement_text || '';
  document.getElementById('stLogoUrl').value = siteSettings.logo_url || '';
  document.getElementById('stDiscordInvite').value = siteSettings.discord_invite || '';
}
async function adminSaveSettings(e){
  e.preventDefault();
  const payload = { site_name: document.getElementById('stSiteName').value, tagline: document.getElementById('stTagline').value, hero_note: document.getElementById('stHeroNote').value, announcement_text: document.getElementById('stAnnouncement').value, logo_url: document.getElementById('stLogoUrl').value, discord_invite: document.getElementById('stDiscordInvite').value };
  const res = await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){ notify('success','บันทึกการตั้งค่าแล้ว','การเปลี่ยนแปลงจะมีผลทันที'); await loadSettings(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
}

async function uploadAndFill(fileInput, targetInputId, previewImgId){
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const preview = document.getElementById(previewImgId);
  if (preview) preview.style.opacity = '.5';
  const fd = new FormData();
  fd.append('image', file);
  try{
    const res = await fetch('/api/upload', { method:'POST', body: fd });
    const data = await res.json();
    if (!res.ok){ notify('error','อัปโหลดไม่สำเร็จ', data.message || (data.error==='invalid_file_type'?'รองรับเฉพาะไฟล์รูปภาพเท่านั้น':'กรุณาลองใหม่อีกครั้ง')); if(preview) preview.style.opacity='1'; return; }
    document.getElementById(targetInputId).value = data.url;
    if (preview){ preview.src = data.url; preview.style.opacity = '1'; }
    notifyToast ? notifyToast('success','อัปโหลดรูปสำเร็จ') : null;
  }catch(e){ notify('error','อัปโหลดไม่สำเร็จ','ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้'); if(preview) preview.style.opacity='1'; }
  finally{ fileInput.value=''; }
}

function fillAdminLoading(){
  document.getElementById('lsImageUrl').value = siteSettings.loading_image || '';
  document.getElementById('lsImagePreview').src = siteSettings.loading_image || 'https://placehold.co/80x80/0F172A/38BDF8?text=IMG';
  document.getElementById('lsTextInput').value = siteSettings.loading_text || '';
}
async function adminSaveLoading(e){
  e.preventDefault();
  const payload = {
    loading_image: document.getElementById('lsImageUrl').value,
    loading_text: document.getElementById('lsTextInput').value,
  };
  const res = await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){ notify('success','บันทึกหน้าโหลดเว็บแล้ว','การเปลี่ยนแปลงจะมีผลกับผู้เข้าชมครั้งถัดไปทันที'); await loadSettings(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
}
function fillAdminPopup(){
  document.getElementById('wpEnabled').checked = siteSettings.popup_enabled === true || siteSettings.popup_enabled === 'true';
  document.getElementById('wpImageUrl').value = siteSettings.popup_image || '';
  document.getElementById('wpImagePreview').src = siteSettings.popup_image || 'https://placehold.co/80x80/EFF6FF/93C5FD?text=IMG';
  document.getElementById('wpTitleInput').value = siteSettings.popup_title || '';
  document.getElementById('wpCodeInput').value = siteSettings.popup_code || '';
  document.getElementById('wpDescInput').value = siteSettings.popup_desc || '';
  document.getElementById('wpBtnText').value = siteSettings.popup_button_text || '';
  document.getElementById('wpBtnLink').value = siteSettings.popup_button_link || '';
}
async function adminSavePopup(e){
  e.preventDefault();
  const payload = {
    popup_enabled: document.getElementById('wpEnabled').checked,
    popup_image: document.getElementById('wpImageUrl').value,
    popup_title: document.getElementById('wpTitleInput').value,
    popup_code: document.getElementById('wpCodeInput').value,
    popup_desc: document.getElementById('wpDescInput').value,
    popup_button_text: document.getElementById('wpBtnText').value,
    popup_button_link: document.getElementById('wpBtnLink').value,
  };
  const res = await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (res.ok){ notify('success','บันทึกป็อปอัพแล้ว','การเปลี่ยนแปลงจะมีผลกับผู้เข้าชมครั้งถัดไปทันที'); await loadSettings(); }
  else notify('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง');
}
function previewWelcomePopup(){
  const saved = { ...siteSettings };
  siteSettings.popup_enabled = true;
  siteSettings.popup_image = document.getElementById('wpImageUrl').value;
  siteSettings.popup_title = document.getElementById('wpTitleInput').value || 'ยินดีต้อนรับ';
  siteSettings.popup_code = document.getElementById('wpCodeInput').value;
  siteSettings.popup_desc = document.getElementById('wpDescInput').value;
  siteSettings.popup_button_text = document.getElementById('wpBtnText').value;
  siteSettings.popup_button_link = document.getElementById('wpBtnLink').value;
  localStorage.removeItem(WP_HIDE_KEY);
  showWelcomePopupIfNeeded();
  siteSettings = saved;
}

(async function init(){
  const startTs = Date.now();
  const banned = await checkAuth();
  if (banned) return;
  const heroWatermarkEl = document.getElementById('heroWatermark');
  if (heroWatermarkEl) heroWatermarkEl.textContent = Array.from({length:12}).map(()=>'FLEXOZY').join(' ');
  await loadMyFavorites();
  await loadSettings();
  route();
  loadScripts();
  loadCategories();
  fetchStats();
  setInterval(fetchStats, 15000);
  attachLuaHighlight('vaultScript');
  attachLuaHighlight('scriptCode');

  const minDisplay = 1500;
  const elapsed = Date.now() - startTs;
  setTimeout(()=>{
    hidePageLoadingScreen(showWelcomePopupIfNeeded);
  }, Math.max(0, minDisplay - elapsed));
})();
