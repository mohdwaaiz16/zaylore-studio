// ═══════════════════════════════════════════════════════════════════
// ZAYLORE STUDIO — Auth State Manager (auth-state.js)
// Included on every page. Updates the nav account icon dynamically.
// ═══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    function updateNavIcon(user) {
        const navBtn = document.getElementById('nav-profile-btn');
        if (!navBtn) return;

        if (user && user.isLoggedIn) {
            const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();
            const pic = user.profilePic || '';

            navBtn.innerHTML = pic
                ? `<img src="${pic}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : `<span class="nav-avatar-initial">${initial}</span>`;

            navBtn.classList.add('nav-logged-in');
            navBtn.setAttribute('aria-label', `${user.name}'s account`);
            navBtn.setAttribute('title', `Signed in as ${user.name}`);
        } else {
            navBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>`;
            navBtn.classList.remove('nav-logged-in');
            navBtn.setAttribute('aria-label', 'Account');
            navBtn.setAttribute('title', 'Sign in');
        }
    }

    function checkSession() {
        try {
            const raw = localStorage.getItem('zs_user');
            if (!raw) return updateNavIcon(null);
            const user = JSON.parse(raw);
            updateNavIcon(user && user.isLoggedIn ? user : null);
        } catch (e) {
            updateNavIcon(null);
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkSession);
    } else {
        checkSession();
    }

    // Listen for auth changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'zs_user') checkSession();
    });

    // Expose for manual refresh
    window.zsRefreshAuthState = checkSession;
})();
