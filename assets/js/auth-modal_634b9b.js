/**
 * assets/js/auth-modal.js
 * Popup เข้าสู่ระบบ / สมัครสมาชิก — เปิดลอยทับหน้าเว็บเดิม, submit ผ่าน AJAX
 */
(function () {
    var overlay   = document.getElementById('amOverlay');
    if (!overlay) return;

    var tabsEl    = document.getElementById('amTabs');
    var badgeTxt  = document.getElementById('amBadgeTxt');
    var h1        = document.getElementById('amH1');
    var sub       = document.getElementById('amSub');
    var alertBox  = document.getElementById('amAlert');
    var loginForm = document.getElementById('amLoginForm');
    var regForm   = document.getElementById('amRegisterForm');

    // ใช้ subtitle เดิมที่ render มาจาก PHP หาชื่อร้านออกมา แล้วประกอบข้อความใหม่ตามแท็บ
    var siteName = (sub.textContent || '').replace(/^ลงชื่อเข้าใช้\s*/, '').trim();
    var COPY = {
        login:    { badge: 'ยืนยันตัวตน',  h1: 'ยินดีต้อนรับกลับมา', sub: 'ลงชื่อเข้าใช้ ' + siteName },
        register: { badge: 'สมัครสมาชิก', h1: 'สร้างบัญชีใหม่',      sub: 'เริ่มต้นใช้งาน ' + siteName }
    };

    function q(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    /* ── Turnstile: ย้าย widget เดียวกันไป-มาระหว่างสองฟอร์ม ── */
    var cfTemplate = document.getElementById('amCfTemplate');
    var cfMounted = false;
    function mountTurnstile(panelName) {
        if (!window.__AM_CF_ENABLED__ || !cfTemplate) return;
        var slot = q('[data-panel="' + panelName + '"] .am-cf-slot');
        if (!slot) return;
        var existing = document.getElementById('amCfWrap');
        if (existing && existing.parentNode === slot) return; // อยู่ที่เดิมแล้ว
        if (existing) {
            slot.appendChild(existing);
        } else {
            slot.appendChild(cfTemplate.content.cloneNode(true));
        }
        if (!cfMounted && window.turnstile) {
            cfMounted = true;
        }
        // ถ้า turnstile.js โหลดมาแล้วและยังไม่ render ให้ explicit render
        if (window.turnstile && slot.querySelector('.cf-turnstile') && !slot.querySelector('.cf-turnstile').hasChildNodes()) {
            try {
                window.turnstile.render(slot.querySelector('.cf-turnstile'), {
                    sitekey: slot.querySelector('.cf-turnstile').dataset.sitekey,
                    theme: 'auto',
                    callback: window.amCfSuccess
                });
            } catch (e) {}
        }
        var wrap = document.getElementById('amCfWrap');
        if (wrap) requestAnimationFrame(function () { wrap.classList.remove('ready'); });
    }
    window.amCfSuccess = function () {
        var wrap = document.getElementById('amCfWrap');
        if (!wrap) return;
        wrap.classList.add('ready');
        var box = document.getElementById('amCfSuccessBox');
        if (box) box.classList.add('show');
    };

    /* ── เปิด/ปิด modal ── */
    function setUrlParam(tab) {
        try {
            var url = new URL(window.location.href);
            url.searchParams.set('auth', tab);
            window.history.pushState({ amAuth: tab }, '', url.toString());
        } catch (e) {}
    }
    function clearUrlParam() {
        try {
            var url = new URL(window.location.href);
            if (url.searchParams.has('auth')) {
                url.searchParams.delete('auth');
                window.history.pushState({}, '', url.toString());
            }
        } catch (e) {}
    }

    function switchTab(tab, opts) {
        opts = opts || {};
        tabsEl.dataset.active = tab;
        qa('.am-tab', tabsEl).forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
        qa('.am-panel').forEach(function (p) { p.classList.toggle('active', p.dataset.panel === tab); });
        badgeTxt.textContent = COPY[tab].badge;
        h1.textContent = COPY[tab].h1;
        sub.textContent = COPY[tab].sub;
        hideAlert();
        mountTurnstile(tab);
        if (!opts.silent) setUrlParam(tab);
    }

    function openModal(tab) {
        switchTab(tab || 'login', { silent: true });
        setUrlParam(tab || 'login');
        overlay.classList.remove('closing');
        overlay.classList.add('open');
        document.body.classList.add('am-lock');
    }
    function closeModal() {
        overlay.classList.add('closing');
        document.body.classList.remove('am-lock');
        clearUrlParam();
        setTimeout(function () { overlay.classList.remove('open', 'closing'); }, 200);
    }

    qa('.am-tab', tabsEl).forEach(function (btn) {
        btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });
    document.getElementById('amClose').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal(); });
    window.addEventListener('popstate', function () {
        var p = new URLSearchParams(window.location.search).get('auth');
        if (p === 'login' || p === 'register') openModal(p);
        else closeModal();
    });

    /* ── สกัดลิงก์ login/register เดิมทั้งเว็บ ให้เปิด modal แทนการเปลี่ยนหน้า ── */
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href]');
        if (!a) return;
        var path;
        try { path = new URL(a.href, window.location.href).pathname; } catch (err) { return; }
        if (/\/user\/login\/?$/.test(path)) { e.preventDefault(); openModal('login'); }
        else if (/\/user\/register\/?$/.test(path)) { e.preventDefault(); openModal('register'); }
    });

    /* ── เปิดอัตโนมัติถ้า URL มี ?auth=login|register ── */
    (function initFromUrl() {
        var params = new URLSearchParams(window.location.search);
        var p = params.get('auth');
        var oauthErr = params.get('oauth_err');
        if (p === 'login' || p === 'register' || oauthErr) openModal(p === 'register' ? 'register' : 'login');
        if (oauthErr) showAlert(oauthErr, false);
    })();

    /* ── floating label ── */
    qa('.am-field').forEach(function (field) {
        var input = field.querySelector('.am-input');
        if (!input) return;
        function upd() { field.classList.toggle('has-val', input.value.length > 0); }
        input.addEventListener('input', upd);
        upd();
    });

    /* ── toggle password ── */
    qa('[data-toggle-pass]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var inp = document.getElementById(btn.dataset.togglePass);
            if (!inp) return;
            var show = inp.type === 'password';
            inp.type = show ? 'text' : 'password';
            var svg = btn.querySelector('svg');
            svg.innerHTML = show
                ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
                : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
        });
    });

    function showAlert(msg, ok) {
        alertBox.style.display = 'flex';
        alertBox.classList.toggle('am-alert--ok', !!ok);
        alertBox.innerHTML = (ok
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>')
            + '<span></span>';
        alertBox.querySelector('span').textContent = msg;
        alertBox.classList.remove('am-shake');
        void alertBox.offsetWidth;
        if (!ok) alertBox.classList.add('am-shake');
    }
    function hideAlert() { alertBox.style.display = 'none'; }

    function setLoading(form, loading) {
        var btn = form.querySelector('.am-btn');
        btn.disabled = loading;
        btn.classList.toggle('loading', loading);
    }

    function submitForm(form, tab) {
        hideAlert();
        var fd = new FormData(form);
        var cfSlot = q('[data-panel="' + tab + '"] .am-cf-slot');
        if (window.turnstile && cfSlot) {
            var widget = cfSlot.querySelector('.cf-turnstile');
            if (widget) {
                try { fd.set('cf-turnstile-response', window.turnstile.getResponse(widget) || ''); } catch (e) {}
            }
        }
        setLoading(form, true);
        fetch((window.BASE_URL || '') + '/user/auth-api.php', {
            method: 'POST',
            body: fd,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin'
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                setLoading(form, false);
                if (data.ok) {
                    showAlert(data.msg || 'สำเร็จ', true);
                    setTimeout(function () { window.location.href = data.redirect || window.location.href; }, 500);
                } else {
                    showAlert(data.msg || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
                    if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
                }
            })
            .catch(function () {
                setLoading(form, false);
                showAlert('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่');
            });
    }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitForm(loginForm, 'login');
    });
    /* ── Confirm dialog ── */
    var confirmOverlay = null;
    function showConfirmDialog(username, onConfirm) {
        if (confirmOverlay) confirmOverlay.remove();

        confirmOverlay = document.createElement('div');
        confirmOverlay.className = 'am-confirm-overlay';
        confirmOverlay.innerHTML = [
            '<div class="am-confirm-card">',
            '  <h2 class="am-confirm-title">ยืนยันการสมัครสมาชิก</h2>',
            '  <p class="am-confirm-sub">กรุณาตรวจสอบข้อมูลก่อนดำเนินการต่อ</p>',
            '  <div class="am-confirm-field">',
            '    <span class="am-confirm-field-label">ชื่อผู้ใช้</span>',
            '    <div class="am-confirm-field-value">' + escHtml(username) + '</div>',
            '  </div>',
            '  <div class="am-confirm-actions">',
            '    <button type="button" class="am-confirm-btn-cancel">ยกเลิก</button>',
            '    <button type="button" class="am-confirm-btn-ok">ยืนยันสมัคร</button>',
            '  </div>',
            '</div>'
        ].join('');

        document.body.appendChild(confirmOverlay);
        // double rAF: paint frame แรกก่อน แล้วค่อย transition
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (confirmOverlay) confirmOverlay.classList.add('open');
            });
        });

        confirmOverlay.querySelector('.am-confirm-btn-cancel').addEventListener('click', function () {
            closeConfirmDialog();
        });
        confirmOverlay.querySelector('.am-confirm-btn-ok').addEventListener('click', function () {
            closeConfirmDialog();
            onConfirm();
        });
        confirmOverlay.addEventListener('click', function (e) {
            if (e.target === confirmOverlay) closeConfirmDialog();
        });
    }
    function closeConfirmDialog() {
        if (!confirmOverlay) return;
        confirmOverlay.classList.add('closing');
        setTimeout(function () {
            if (confirmOverlay) { confirmOverlay.remove(); confirmOverlay = null; }
        }, 180);
    }
    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    regForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var p1 = q('#amRegPass').value, p2 = q('#amRegPass2').value;
        if (p1 !== p2) { showAlert('ยืนยันรหัสผ่านไม่ตรงกัน'); return; }
        var username = (q('#amRegUser').value || '').trim();
        showConfirmDialog(username, function () {
            submitForm(regForm, 'register');
        });
    });

    // mount turnstile ให้แท็บที่ active อยู่ตอนเริ่มต้น (เผื่อไม่ได้เปิดผ่าน URL)
    mountTurnstile(tabsEl.dataset.active || 'login');
})();
