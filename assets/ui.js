/* UI scaffold for cinematic interactions
   - loader
   - custom cursor
   - scroll progress
   - mobile menu toggle
   - login modal (simulated OAuth)
   - admin launch mode toggle (simulate activation)
*/
(function () {
    'use strict';

    // UTIL
    const $ = s => document.querySelector(s);
    const $$ = s => Array.from(document.querySelectorAll(s));

    // Insert loader
    function createLoader() {
        if ($('#site-loader')) return;
        const loader = document.createElement('div');
        loader.id = 'site-loader';
        loader.innerHTML = `
      <div class="loader-wrap">
        <div class="loader-ring"></div>
        <div class="loader-logo"><img src="img/logo-icon-sm.webp" alt="Z" style="width:100%;height:100%;object-fit:cover"></div>
        <div class="loader-title">ZAYLORE</div>
        <div class="loader-sub">Premium Studio</div>
      </div>
    `;
        document.documentElement.classList.add('is-loading');
        document.body.appendChild(loader);
    }

    function hideLoader() {
        const loader = $('#site-loader');
        if (!loader) return;
        loader.style.transition = 'opacity 450ms ease'; loader.style.opacity = '0';
        setTimeout(() => { loader.remove(); document.documentElement.classList.remove('is-loading'); }, 500);
    }

    // Custom cursor
    function createCursor() {
        if ($('#z-cursor')) return;
        const c = document.createElement('div'); c.id = 'z-cursor'; document.body.appendChild(c);

        let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
        let posX = mouseX, posY = mouseY;

        window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; c.style.display = 'block'; });

        function render() {
            posX += (mouseX - posX) * 0.18; posY += (mouseY - posY) * 0.18;
            c.style.transform = `translate(${posX}px, ${posY}px) translate(-50%, -50%)`;
            requestAnimationFrame(render);
        }
        render();

        // interactions
        $$('a, button, .nav-action, .nav-link').forEach(el => {
            el.addEventListener('mouseenter', () => c.classList.add('link'));
            el.addEventListener('mouseleave', () => c.classList.remove('link'));
        });
    }

    // Scroll progress
    function setupScrollProgress() {
        if ($('#scroll-progress')) return;
        const prog = document.createElement('div'); prog.id = 'scroll-progress'; document.body.appendChild(prog);
        window.addEventListener('scroll', () => {
            const h = document.documentElement.scrollHeight - window.innerHeight;
            const pct = h > 0 ? (window.scrollY / h) * 100 : 0; prog.style.width = pct + '%';
        }, { passive: true });
    }

    // Simple login modal + simulated OAuth
    function showLoginModal() {
        if ($('#login-modal')) return;
        const md = document.createElement('div'); md.className = 'modal-backdrop'; md.id = 'login-modal';
        md.innerHTML = `
      <div class="modal-panel glass-card">
        <div class="modal-header">
          <img src="img/logo-icon-sm.webp" style="width:54px;height:54px;border-radius:10px;" alt="Z">
          <div>
            <div class="modal-title">ZAYLORE LOGIN</div>
            <div class="modal-sub">Sign in to access your membership and drops</div>
          </div>
        </div>
        <div style="margin-top:18px;display:flex;gap:12px;align-items:center;">
          <button class="oauth-btn google" id="oauth-google">Continue with Google</button>
          <div class="oauth-ghost">Secure OAuth</div>
        </div>
        <div style="margin-top:18px;color:var(--text-muted);font-size:0.9rem;">By signing in you agree to receive launch notifications and event invites.</div>
      </div>
    `;
        document.body.appendChild(md);

        $('#oauth-google').addEventListener('click', () => {
            md.querySelector('.modal-panel').style.transform = 'translateY(-8px)';
            md.querySelector('.modal-panel').style.opacity = '0.9';
            // simulate popup
            setTimeout(() => { md.remove(); onLoginSuccess({ name: 'Guest', email: 'guest@zaylore.in', tier: 'CORE MEMBER' }); }, 900);
        });

        md.addEventListener('click', (e) => { if (e.target === md) md.remove(); });
    }

    // On login success
    function onLoginSuccess(profile) {
        try { localStorage.setItem('zs_user', JSON.stringify(profile)); }
        catch (e) { }
        applyLoggedInState(profile);

        // show welcome toast
        const t = document.createElement('div'); t.className = 'glass-card hover-raise'; t.style.position = 'fixed'; t.style.right = '20px'; t.style.bottom = '20px'; t.style.zIndex = '99999'; t.style.padding = '12px 16px'; t.innerHTML = `Welcome back, ${profile.name}`;
        document.body.appendChild(t); setTimeout(() => t.remove(), 2200);

        // navigate to dashboard after short delay
        setTimeout(() => {
            // prefer existing dashboard path
            window.location.href = '/dashboard.html';
        }, 700);
    }

    function applyLoggedInState(profile) {
        // replace Login link with avatar menu
        const navRight = document.querySelector('.nav-right');
        if (!navRight) return;
        // remove existing account link
        const acct = navRight.querySelector('.nav-action'); if (acct) acct.remove();

        const wrapper = document.createElement('div'); wrapper.className = 'nav-account'; wrapper.style.display = 'flex'; wrapper.style.gap = '12px';
        const avatar = document.createElement('div'); avatar.className = 'nav-action'; avatar.innerHTML = `<img src='img/logo-icon-sm.webp' style='width:28px;height:28px;border-radius:50%'>`;
        avatar.title = profile.name || 'Account';
        const menu = document.createElement('div'); menu.className = 'account-menu u-hidden glass-card'; menu.style.position = 'absolute'; menu.style.right = '20px'; menu.style.top = '70px'; menu.style.zIndex = '99999';
        menu.innerHTML = `<div style='padding:10px;min-width:200px'><strong>${profile.name}</strong><div style='height:8px'></div>
            <a href='dashboard.html' class='nav-link'>Dashboard</a><br>
      <a href='wishlist.html' class='nav-link'>Wishlist</a><br>
      <a href='orders.html' class='nav-link'>Orders</a><br>
      <a href='tickets.html' class='nav-link'>Tickets</a><br>
      <a href='#' id='logout-link' class='nav-link'>Logout</a>
    </div>`;
        wrapper.appendChild(avatar); wrapper.appendChild(menu); navRight.appendChild(wrapper);

        avatar.addEventListener('click', () => menu.classList.toggle('u-hidden'));
        document.getElementById('logout-link').addEventListener('click', () => {
            localStorage.removeItem('zs_user'); location.reload();
        });
    }

    function restoreSession() {
        try {
            const raw = localStorage.getItem('zs_user'); if (!raw) return false; const profile = JSON.parse(raw); applyLoggedInState(profile); return true;
        } catch (e) { return false; }
    }

    // Admin simulated Launch Mode
    function createLaunchControl() {
        if ($('#launch-control')) return;
        const ctrl = document.createElement('div'); ctrl.id = 'launch-control'; ctrl.style.position = 'fixed'; ctrl.style.left = '16px'; ctrl.style.bottom = '16px'; ctrl.style.zIndex = '99999';
        ctrl.innerHTML = `<button class='launch-btn' id='activate-drop'>ACTIVATE DROP</button>`;
        document.body.appendChild(ctrl);
        $('#activate-drop').addEventListener('click', () => {
            localStorage.setItem('zs_launch_active', '1');
            document.documentElement.classList.add('launch-active');
            // trigger a launch animation placeholder
            const overlay = document.createElement('div'); overlay.className = 'modal-backdrop'; overlay.style.zIndex = '99998'; overlay.innerHTML = `<div class='modal-panel glass-card' style='text-align:center'><h2 style='letter-spacing:4px'>Volume 01 Live</h2><p>Drop Activated</p></div>`;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.remove(), 4000);
        });
    }

    // progressive enhancement init
    function init() {
        createLoader(); createCursor(); setupScrollProgress();
        // remove loader after DOM ready + images loaded
        window.addEventListener('load', () => { setTimeout(() => hideLoader(), 700); restoreSession(); if (location.search.indexOf('login') > -1) showLoginModal(); });
        // create launch control only in dev/local
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') createLaunchControl();
    }

    // Expose minimal API
    window.ZayloreUI = { init, showLoginModal, onLoginSuccess };
    document.addEventListener('DOMContentLoaded', init);
})();
