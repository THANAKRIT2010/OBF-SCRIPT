/**
 * notify-standalone.js — Flexozy Notification System (Sonner-style)
 * ----------------------------------------------------------------
 * ระบบแจ้งเตือนธีมเดียวกับแบรนด์ Flexozy (โทนน้ำเงิน-ม่วง / dark) เขียนด้วย
 * pure JavaScript + CSS ล้วน ไม่พึ่งไลบรารีภายนอก แต่มีหน้าตา/ลูกเล่นแบบ
 * "sonner" (rich colors, close button, stacking, swipe-to-dismiss, promise helper)
 *
 * ใช้ยังไง: โหลดไฟล์นี้ไฟล์เดียว
 *   <script src="/notify-standalone.js"></script>
 *
 * แล้วเรียกใช้ได้เหมือนเดิมทุกจุดในเว็บ (API เดิม 100%, ไม่ต้องแก้โค้ดที่เรียกใช้เลย):
 *   notify('success', 'สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
 *   notifyToast('success', 'บันทึกแล้ว');
 *   notifyToast('success', 'บันทึกแล้ว', { description: 'พบ 24 รายการ' });
 *   notifyConfirm('ลบรายการนี้?', 'กู้คืนไม่ได้นะ', () => {...});
 *   const l = notifyLoading('กำลังทำงาน...'); l.close();
 *   confirmAndSubmit({ url:'/api/x', onSuccess:(r)=>{} });
 *
 * เพิ่มเติมแบบ sonner (ของใหม่ ไม่บังคับใช้):
 *   toast('ข้อความทั่วไป');
 *   toast.success('สำเร็จแล้ว', { description: '...' });
 *   toast.error('เกิดข้อผิดพลาด');
 *   toast.warning('โปรดระวัง');
 *   toast.info('ข้อมูลเพิ่มเติม');
 *   toast.loading('กำลังโหลด...');            // -> คืน id ใช้กับ toast.success(msg,{id})
 *   toast.promise(fetch(...), { loading, success, error });
 *   toast.dismiss();            // ปิดทั้งหมด
 *   toast.dismiss(id);         // ปิดอันเดียว
 */
(function () {
  // ---------- ฝัง CSS ----------
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --ntf-bg:#0F1420; --ntf-border:#232B3D; --ntf-fg:#F1F5F9; --ntf-muted:#94A3B8;
      --ntf-accent:#6366F1; --ntf-accent2:#4F46E5;
      --ntf-success:#22C55E; --ntf-success-bg:#0F1F17; --ntf-success-bd:#14532D;
      --ntf-error:#F87171;  --ntf-error-bg:#210F13;   --ntf-error-bd:#4C1D1D;
      --ntf-warning:#F59E0B;--ntf-warning-bg:#221708;  --ntf-warning-bd:#78350F;
      --ntf-info:#60A5FA;   --ntf-info-bg:#0D1A2B;     --ntf-info-bd:#1E3A5F;
    }

    /* ---------- Modal (notify / notifyConfirm / notifyLoading) ---------- */
    .ntf-overlay{
      position:fixed; inset:0; background:rgba(5,7,13,.72); backdrop-filter:blur(3px);
      display:flex; align-items:center; justify-content:center; z-index:99999;
      opacity:0; transition:opacity .18s ease; padding:16px;
    }
    .ntf-overlay.ntf-show{ opacity:1; }
    .ntf-box{
      background:linear-gradient(180deg,#131a2a 0%,#0F1420 100%);
      border:1px solid var(--ntf-border); border-radius:20px; padding:30px 26px;
      width:100%; max-width:360px; text-align:center;
      box-shadow:0 20px 50px -12px rgba(0,0,0,.6), 0 0 0 1px rgba(99,102,241,.05);
      transform:scale(.9) translateY(8px); transition:transform .18s cubic-bezier(.34,1.56,.64,1);
      font-family:'IBM Plex Sans Thai','Segoe UI',sans-serif;
    }
    .ntf-overlay.ntf-show .ntf-box{ transform:scale(1) translateY(0); }
    .ntf-icon{
      width:56px; height:56px; border-radius:16px; display:flex; align-items:center;
      justify-content:center; margin:0 auto 16px; font-size:24px; font-weight:700; color:#fff;
    }
    .ntf-icon.success{ background:linear-gradient(135deg,#22C55E,#16A34A); box-shadow:0 8px 20px -6px rgba(34,197,94,.5); }
    .ntf-icon.error{   background:linear-gradient(135deg,#F87171,#DC2626); box-shadow:0 8px 20px -6px rgba(220,38,38,.5); }
    .ntf-icon.warning{ background:linear-gradient(135deg,#FBBF24,#D97706); box-shadow:0 8px 20px -6px rgba(217,119,6,.5); }
    .ntf-icon.info{    background:linear-gradient(135deg,#60A5FA,#2563EB); box-shadow:0 8px 20px -6px rgba(37,99,235,.5); }
    .ntf-title{ font-size:17px; font-weight:700; margin-bottom:6px; color:var(--ntf-fg); }
    .ntf-text{ font-size:13.5px; line-height:1.6; color:var(--ntf-muted); margin-bottom:22px; white-space:pre-wrap; }
    .ntf-btns{ display:flex; gap:10px; justify-content:center; }
    .ntf-btn{ border:none; border-radius:12px; padding:10px 22px; font-size:13.5px; cursor:pointer; font-weight:600; transition:filter .15s ease, transform .1s ease; font-family:inherit; }
    .ntf-btn:active{ transform:scale(.97); }
    .ntf-btn-confirm{ background:linear-gradient(135deg,#6366F1 0%,#4F46E5 100%); color:#fff; box-shadow:0 4px 14px rgba(79,70,229,.4); flex:1; }
    .ntf-btn-cancel{ background:#151B2B; border:1px solid var(--ntf-border); color:var(--ntf-muted); flex:1; }
    .ntf-btn:hover{ filter:brightness(1.1); }
    .ntf-btn-cancel:hover{ color:var(--ntf-fg); border-color:#475569; }

    .ntf-spinner{
      width:38px; height:38px; border-radius:50%; margin:0 auto 16px;
      border:3px solid rgba(99,102,241,.15); border-top-color:var(--ntf-accent);
      animation:ntf-spin .7s linear infinite;
    }
    @keyframes ntf-spin{ to{ transform:rotate(360deg); } }

    /* ---------- Toast (sonner-style) ---------- */
    .ntf-toast-wrap{
      position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:100000;
      display:flex; flex-direction:column; gap:8px; align-items:center;
      width:100%; max-width:380px; padding:0 12px; pointer-events:none;
    }
    .ntf-toast{
      pointer-events:auto; width:100%; background:var(--ntf-bg); border:1px solid var(--ntf-border);
      border-radius:14px; padding:12px 14px; display:flex; align-items:flex-start; gap:10px;
      box-shadow:0 10px 30px -8px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.02);
      font-family:'IBM Plex Sans Thai','Segoe UI',sans-serif; color:var(--ntf-fg);
      opacity:0; transform:translateY(-16px) scale(.96); transition:opacity .2s ease, transform .25s cubic-bezier(.34,1.56,.64,1);
      cursor:grab; touch-action:pan-y;
    }
    .ntf-toast.ntf-show{ opacity:1; transform:translateY(0) scale(1); }
    .ntf-toast.ntf-hide{ opacity:0; transform:translateY(-10px) scale(.96); }
    .ntf-toast.ntf-dragging{ transition:none; cursor:grabbing; }
    .ntf-toast.success{ background:var(--ntf-success-bg); border-color:var(--ntf-success-bd); }
    .ntf-toast.error{   background:var(--ntf-error-bg);   border-color:var(--ntf-error-bd); }
    .ntf-toast.warning{ background:var(--ntf-warning-bg); border-color:var(--ntf-warning-bd); }
    .ntf-toast.info{    background:var(--ntf-info-bg);    border-color:var(--ntf-info-bd); }
    .ntf-toast .ntf-toast-icon{
      flex-shrink:0; width:20px; height:20px; border-radius:9999px; display:flex; align-items:center;
      justify-content:center; font-size:12px; font-weight:800; color:#0B0F19; margin-top:1px;
    }
    .ntf-toast.success .ntf-toast-icon{ background:var(--ntf-success); }
    .ntf-toast.error   .ntf-toast-icon{ background:var(--ntf-error); }
    .ntf-toast.warning .ntf-toast-icon{ background:var(--ntf-warning); }
    .ntf-toast.info    .ntf-toast-icon{ background:var(--ntf-info); }
    .ntf-toast.default .ntf-toast-icon{ background:var(--ntf-accent); color:#fff; }
    .ntf-toast .ntf-toast-body{ flex:1; min-width:0; }
    .ntf-toast .ntf-toast-title{ font-size:13px; font-weight:600; line-height:1.45; word-break:break-word; }
    .ntf-toast .ntf-toast-desc{ font-size:12px; color:var(--ntf-muted); margin-top:2px; line-height:1.5; word-break:break-word; }
    .ntf-toast .ntf-toast-close{
      flex-shrink:0; width:18px; height:18px; border-radius:9999px; border:none; background:transparent;
      color:var(--ntf-muted); cursor:pointer; display:flex; align-items:center; justify-content:center;
      font-size:13px; line-height:1; margin-top:1px; transition:background .15s ease, color .15s ease;
    }
    .ntf-toast .ntf-toast-close:hover{ background:rgba(255,255,255,.08); color:var(--ntf-fg); }
    .ntf-toast .ntf-toast-action{
      flex-shrink:0; align-self:center; border:none; border-radius:9px; padding:6px 12px;
      font-size:11.5px; font-weight:700; cursor:pointer; background:var(--ntf-accent); color:#fff;
    }
    .ntf-toast .ntf-toast-action:hover{ filter:brightness(1.1); }
    .ntf-toast .ntf-toast-spinner{
      flex-shrink:0; width:16px; height:16px; border-radius:50%; margin-top:2px;
      border:2px solid rgba(255,255,255,.15); border-top-color:#fff; animation:ntf-spin .7s linear infinite;
    }
    @media (max-width:480px){ .ntf-toast-wrap{ max-width:calc(100% - 24px); } }
  `;
  document.head.appendChild(style);

  const ICONS = { success: "✓", error: "✕", warning: "!", info: "i", default: "•" };

  // ================= Modal: notify / notifyLoading / notifyConfirm =================

  window.notify = function (type, title, message, onClose) {
    const overlay = document.createElement("div");
    overlay.className = "ntf-overlay";
    overlay.innerHTML = `
            <div class="ntf-box">
                <div class="ntf-icon ${type}">${ICONS[type] || ICONS.info}</div>
                <div class="ntf-title"></div>
                <div class="ntf-text"></div>
                <div class="ntf-btns">
                    <button class="ntf-btn ntf-btn-confirm" data-close>ตกลง</button>
                </div>
            </div>`;
    overlay.querySelector(".ntf-title").textContent = title || "";
    overlay.querySelector(".ntf-text").textContent = message || "";
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("ntf-show"));

    function close() {
      overlay.classList.remove("ntf-show");
      setTimeout(() => {
        overlay.remove();
        if (typeof onClose === "function") onClose();
      }, 180);
    }
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
  };

  window.notifyLoading = function (title, message) {
    const overlay = document.createElement("div");
    overlay.className = "ntf-overlay";
    overlay.innerHTML = `
            <div class="ntf-box">
                <div class="ntf-spinner"></div>
                <div class="ntf-title"></div>
                <div class="ntf-text"></div>
            </div>`;
    overlay.querySelector(".ntf-title").textContent = title || "";
    overlay.querySelector(".ntf-text").textContent = message || "";
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("ntf-show"));

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      overlay.classList.remove("ntf-show");
      setTimeout(() => overlay.remove(), 180);
    }
    return { close };
  };

  window.notifyConfirm = function (title, text, onConfirm, confirmLabel) {
    const overlay = document.createElement("div");
    overlay.className = "ntf-overlay";
    overlay.innerHTML = `
            <div class="ntf-box">
                <div class="ntf-icon warning">!</div>
                <div class="ntf-title"></div>
                <div class="ntf-text"></div>
                <div class="ntf-btns">
                    <button class="ntf-btn ntf-btn-cancel" data-cancel>ยกเลิก</button>
                    <button class="ntf-btn ntf-btn-confirm" data-confirm></button>
                </div>
            </div>`;
    overlay.querySelector(".ntf-title").textContent = title || "";
    overlay.querySelector(".ntf-text").textContent = text || "";
    overlay.querySelector("[data-confirm]").textContent = confirmLabel || "ยืนยัน";
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("ntf-show"));

    function close() {
      overlay.classList.remove("ntf-show");
      setTimeout(() => overlay.remove(), 180);
    }
    overlay.querySelector("[data-cancel]").addEventListener("click", close);
    overlay.querySelector("[data-confirm]").addEventListener("click", () => {
      close();
      if (typeof onConfirm === "function") onConfirm();
    });
  };

  window.confirmAndSubmit = function (options) {
    const settings = Object.assign(
      {
        method: "POST",
        confirmTitle: "ยืนยันการทำรายการ?",
        confirmText: "คุณต้องการดำเนินการนี้ใช่หรือไม่",
        confirmButtonText: "ยืนยัน",
      },
      options
    );

    window.notifyConfirm(
      settings.confirmTitle,
      settings.confirmText,
      function () {
        if (settings.btn) {
          settings.btn.disabled = true;
          if (settings.btnLoadingHtml) settings.btn.innerHTML = settings.btnLoadingHtml;
        }

        fetch(settings.url, {
          method: settings.method,
          headers: { "Content-Type": "application/json" },
          body: settings.data ? JSON.stringify(settings.data) : undefined,
        })
          .then(async (response) => {
            const json = await response.json().catch(() => ({}));
            if (!response.ok) throw json;
            return json;
          })
          .then((res) => {
            window.notify("success", "สำเร็จ", res.message, () => {
              if (typeof settings.onSuccess === "function") settings.onSuccess(res);
            });
          })
          .catch((res) => {
            window.notify("error", "เกิดข้อผิดพลาด", (res && res.message) || "ไม่สามารถทำรายการได้", () => {
              if (typeof settings.onError === "function") settings.onError(res);
            });
          })
          .finally(() => {
            if (settings.btn) {
              settings.btn.disabled = false;
              if (settings.btnDefaultHtml) settings.btn.innerHTML = settings.btnDefaultHtml;
            }
          });
      },
      settings.confirmButtonText
    );
  };

  // ================= Toast engine (sonner-style) =================

  let toastWrap = null;
  function getWrap() {
    if (!toastWrap || !document.body.contains(toastWrap)) {
      toastWrap = document.createElement("div");
      toastWrap.className = "ntf-toast-wrap";
      document.body.appendChild(toastWrap);
    }
    return toastWrap;
  }

  let seq = 0;
  const activeToasts = new Map(); // id -> { el, timer }

  function removeToast(id) {
    const t = activeToasts.get(id);
    if (!t) return;
    activeToasts.delete(id);
    clearTimeout(t.timer);
    t.el.classList.add("ntf-hide");
    setTimeout(() => t.el.remove(), 200);
  }

  function buildToastEl(type, title, opts) {
    const el = document.createElement("div");
    el.className = "ntf-toast " + (type || "default");
    el.setAttribute("role", "status");

    const iconHtml =
      type === "loading"
        ? `<div class="ntf-toast-spinner"></div>`
        : `<div class="ntf-toast-icon">${ICONS[type] || ICONS.default}</div>`;

    el.innerHTML = `
      ${iconHtml}
      <div class="ntf-toast-body">
        <div class="ntf-toast-title"></div>
        ${opts && opts.description ? `<div class="ntf-toast-desc"></div>` : ""}
      </div>
      ${opts && opts.action ? `<button class="ntf-toast-action"></button>` : ""}
      <button class="ntf-toast-close" aria-label="close">✕</button>
    `;
    el.querySelector(".ntf-toast-title").textContent = title || "";
    if (opts && opts.description) el.querySelector(".ntf-toast-desc").textContent = opts.description;
    if (opts && opts.action) {
      const actionBtn = el.querySelector(".ntf-toast-action");
      actionBtn.textContent = opts.action.label || "";
      actionBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof opts.action.onClick === "function") opts.action.onClick();
      });
    }
    return el;
  }

  function attachSwipeToDismiss(el, id) {
    let startX = 0,
      startY = 0,
      dx = 0,
      dragging = false;
    function onDown(e) {
      const p = e.touches ? e.touches[0] : e;
      startX = p.clientX;
      startY = p.clientY;
      dragging = true;
      el.classList.add("ntf-dragging");
    }
    function onMove(e) {
      if (!dragging) return;
      const p = e.touches ? e.touches[0] : e;
      dx = p.clientX - startX;
      const dy = Math.abs(p.clientY - startY);
      if (dy > 40) return; // vertical scroll intent, ignore
      el.style.transform = `translateX(${dx}px)`;
      el.style.opacity = String(Math.max(0, 1 - Math.abs(dx) / 120));
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("ntf-dragging");
      if (Math.abs(dx) > 90) {
        removeToast(id);
      } else {
        el.style.transform = "";
        el.style.opacity = "";
      }
      dx = 0;
    }
    el.addEventListener("mousedown", onDown);
    el.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mousemove", onMove);
    el.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseup", onUp);
    el.addEventListener("touchend", onUp);
  }

  /**
   * core(type, title, opts) — opts: { description, duration, action:{label,onClick}, id }
   * คืนค่า id ของ toast (ใช้กับ toast.dismiss(id) หรืออัปเดตซ้ำผ่าน {id} ได้)
   */
  function core(type, title, opts) {
    opts = opts || {};
    const wrap = getWrap();
    const id = opts.id || ++seq;

    // ถ้ามี id เดิมอยู่แล้ว (เช่น loading -> success) ให้แทนที่ของเดิมแบบนุ่มนวล
    if (activeToasts.has(id)) {
      const old = activeToasts.get(id);
      clearTimeout(old.timer);
      const newEl = buildToastEl(type, title, opts);
      old.el.replaceWith(newEl);
      attachSwipeToDismiss(newEl, id);
      newEl.querySelector(".ntf-toast-close").addEventListener("click", () => removeToast(id));
      requestAnimationFrame(() => newEl.classList.add("ntf-show"));
      const duration = type === "loading" ? 0 : opts.duration != null ? opts.duration : 3500;
      const timer = duration > 0 ? setTimeout(() => removeToast(id), duration) : null;
      activeToasts.set(id, { el: newEl, timer });
      return id;
    }

    const el = buildToastEl(type, title, opts);
    wrap.appendChild(el);
    attachSwipeToDismiss(el, id);
    el.querySelector(".ntf-toast-close").addEventListener("click", () => removeToast(id));
    requestAnimationFrame(() => el.classList.add("ntf-show"));

    const duration = type === "loading" ? 0 : opts.duration != null ? opts.duration : 3500;
    const timer = duration > 0 ? setTimeout(() => removeToast(id), duration) : null;
    activeToasts.set(id, { el, timer });
    return id;
  }

  // ---- window.toast — sonner-like API ----
  function toast(message, opts) {
    return core("default", message, opts);
  }
  toast.success = (message, opts) => core("success", message, opts);
  toast.error = (message, opts) => core("error", message, opts);
  toast.warning = (message, opts) => core("warning", message, opts);
  toast.info = (message, opts) => core("info", message, opts);
  toast.loading = (message, opts) => core("loading", message, opts);
  toast.message = (message, opts) => core("default", message, opts);
  toast.dismiss = (id) => {
    if (id === undefined) {
      Array.from(activeToasts.keys()).forEach(removeToast);
    } else {
      removeToast(id);
    }
  };
  toast.promise = function (promise, msgs) {
    const id = ++seq;
    core("loading", (msgs && msgs.loading) || "กำลังดำเนินการ...", { id });
    return Promise.resolve(promise).then(
      (result) => {
        const successMsg = typeof msgs.success === "function" ? msgs.success(result) : msgs.success;
        core("success", successMsg || "สำเร็จ", { id });
        return result;
      },
      (err) => {
        const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
        core("error", errorMsg || "เกิดข้อผิดพลาด", { id });
        throw err;
      }
    );
  };
  window.toast = toast;

  // ---- window.notifyToast — API เดิมที่ใช้ทั่วทั้งเว็บ (คงไว้ให้ทำงานเหมือนเดิมทุกจุด) ----
  // รูปแบบเดิม: notifyToast(type, title)
  // รองรับเพิ่ม (ไม่บังคับ): notifyToast(type, title, { description })
  window.notifyToast = function (type, title, opts) {
    const t = ["success", "error", "warning", "info"].includes(type) ? type : "default";
    return core(t, title, opts);
  };
})();
