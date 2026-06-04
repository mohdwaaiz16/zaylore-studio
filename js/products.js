// Zaylore Studio - Products Frontend Controller (products.js)

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
        const productsGrid = document.getElementById('products-grid');
        const countdownEl = document.getElementById('countdown-timer-wrap');
        const notifyModal = document.getElementById('notify-modal');
        const notifyForm = document.getElementById('actual-notify-form');
        
        let storeProducts = [];
        let eventConfig = {};
        let activeNotifyProdId = null;

        // Fetch User Session for Wishlist check
        const currentUser = localStorage.getItem('zs_user') ? JSON.parse(localStorage.getItem('zs_user')) : null;

        // 1. Load Event Launch Date & Run Countdown
        try {
            eventConfig = await window.ZayloreDB.getEventDetails();
            initCountdown(eventConfig.launchDate);
        } catch (e) {
            console.error("Failed to load launch event details", e);
            initCountdown("August 23, 2026 11:00:00");
        }

        // 2. Fetch Products and Render Grid
        try {
            storeProducts = await window.ZayloreDB.getProducts();
            await renderProductsGrid();
        } catch (e) {
            console.error("Failed to fetch products", e);
            if (productsGrid) productsGrid.innerHTML = '<div class="error-state">Failed to retrieve items. Try refreshing.</div>';
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // LAUNCH COUNTDOWN ENGINE
        // ─────────────────────────────────────────────────────────────────────────────

        let countdownInterval = null;
        let isLaunchReleased = false;

        function initCountdown(dateString) {
            const launchDate = new Date(dateString).getTime();
            const elDays = document.getElementById('cd-days');
            const elHours = document.getElementById('cd-hours');
            const elMins = document.getElementById('cd-mins');
            const elSecs = document.getElementById('cd-secs');
            const statusBanner = document.getElementById('drop-status-banner');

            if (countdownInterval) clearInterval(countdownInterval);

            countdownInterval = setInterval(() => {
                const now = Date.now();
                const distance = launchDate - now;

                // Check Admin Launch Override flag or real expiry
                const isOverrideActive = !!localStorage.getItem('zs_launch_active');

                if (distance < 0 || isOverrideActive) {
                    clearInterval(countdownInterval);
                    isLaunchReleased = true;
                    if (statusBanner) statusBanner.innerHTML = `<span style="color:#00ff00; letter-spacing:4px;">THE MOVEMENT HAS COMMENCED • COLD DROP ACTIVE</span>`;
                    if (countdownEl) {
                        countdownEl.innerHTML = `
                            <div class="drop-live-marquee">
                                <span class="badge badge-active" style="padding:15px 30px; font-size:1rem; letter-spacing:2px;">THE COLLECTION IS LIVE NOW</span>
                            </div>
                        `;
                    }
                    // Trigger dynamic reveal of products
                    renderProductsGrid();
                    return;
                }

                // If not expired
                isLaunchReleased = false;
                if (elDays && elHours && elMins && elSecs) {
                    elDays.innerText = Math.floor(distance / 86400000).toString().padStart(2, '0');
                    elHours.innerText = Math.floor((distance % 86400000) / 3600000).toString().padStart(2, '0');
                    elMins.innerText = Math.floor((distance % 3600000) / 60000).toString().padStart(2, '0');
                    elSecs.innerText = Math.floor((distance % 60000) / 1000).toString().padStart(2, '0');
                }
            }, 1000);
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // PRODUCTS RENDERING & STATES
        // ─────────────────────────────────────────────────────────────────────────────

        async function renderProductsGrid() {
            if (!productsGrid) return;
            productsGrid.innerHTML = '';

            const isLocked = !isLaunchReleased && !localStorage.getItem('zs_launch_active');

            // Fetch User Wishlist to render active heart icons
            let wishlistIds = [];
            if (currentUser) {
                try {
                    const wishList = await window.ZayloreDB.getWishlist(currentUser.uid);
                    wishlistIds = wishList.map(w => w.productId);
                } catch (e) {}
            }

            storeProducts.forEach(prod => {
                const isWishlisted = wishlistIds.includes(prod.id);
                const card = document.createElement('div');
                card.className = `product-card glass-card hover-raise reveal-fade ${isLocked ? 'locked' : 'unlocked'}`;

                card.innerHTML = `
                    <div class="product-media-wrap">
                        <img src="${prod.images[0]}" alt="${escapeHTML(prod.title)}" class="${isLocked ? 'blur-lock' : ''}">
                        
                        <!-- Premium Lock Overlay before launch -->
                        ${isLocked ? `
                            <svg class="chain-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#333" />
                                        <stop offset="25%" stop-color="#bbb" />
                                        <stop offset="50%" stop-color="#fff" />
                                        <stop offset="75%" stop-color="#555" />
                                        <stop offset="100%" stop-color="#222" />
                                    </linearGradient>
                                </defs>
                                <line x1="0" y1="0" x2="100" y2="100" stroke="url(#chain-grad)" stroke-width="4.5" stroke-dasharray="8 3" stroke-linecap="round" />
                                <line x1="100" y1="0" x2="0" y2="100" stroke="url(#chain-grad)" stroke-width="4.5" stroke-dasharray="8 3" stroke-linecap="round" />
                            </svg>
                            <div class="product-lock-overlay">
                                <div class="padlock-container">
                                    <svg class="silver-padlock" viewBox="0 0 100 100" width="64" height="64">
                                        <defs>
                                            <linearGradient id="shackle-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stop-color="#4a4a4a" />
                                                <stop offset="25%" stop-color="#b8b8b8" />
                                                <stop offset="50%" stop-color="#ffffff" />
                                                <stop offset="75%" stop-color="#8a8a8a" />
                                                <stop offset="100%" stop-color="#3a3a3a" />
                                            </linearGradient>
                                            <linearGradient id="lock-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stop-color="#7a7a7a" />
                                                <stop offset="20%" stop-color="#d1d1d1" />
                                                <stop offset="40%" stop-color="#ffffff" />
                                                <stop offset="60%" stop-color="#9a9a9a" />
                                                <stop offset="80%" stop-color="#5a5a5a" />
                                                <stop offset="100%" stop-color="#2a2a2a" />
                                            </linearGradient>
                                            <radialGradient id="keyhole-glow" cx="50%" cy="50%" r="50%">
                                                <stop offset="0%" stop-color="#ff1a1a" stop-opacity="0.6" />
                                                <stop offset="100%" stop-color="#000000" stop-opacity="0" />
                                            </radialGradient>
                                        </defs>
                                        <path d="M 30,50 V 32 A 20,20 0 0 1 70,32 V 50" fill="none" stroke="url(#shackle-grad)" stroke-width="10" stroke-linecap="round" />
                                        <path d="M 30,50 V 32 A 20,20 0 0 1 70,32 V 50" fill="none" stroke="#222" stroke-width="10" stroke-linecap="round" stroke-opacity="0.3" filter="blur(2px)" />
                                        <rect x="20" y="44" width="60" height="46" rx="10" ry="10" fill="url(#lock-body-grad)" stroke="#111" stroke-width="1.5" />
                                        <rect x="23" y="47" width="54" height="40" rx="7" ry="7" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
                                        <circle cx="50" cy="62" r="7" fill="#111" />
                                        <path d="M 47,62 H 53 L 55,75 H 45 Z" fill="#111" />
                                        <circle cx="50" cy="64" r="8" fill="url(#keyhole-glow)" pointer-events="none" />
                                    </svg>
                                </div>
                                <span class="lock-label-coming">COMING SOON</span>
                            </div>
                        ` : ''}

                        <!-- Stock status overlay -->
                        ${!isLocked && !prod.inStock ? `
                            <div class="product-outofstock-overlay">
                                <span>OUT OF STOCK</span>
                            </div>
                        ` : ''}
                    </div>

                    <div class="product-info-wrap">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <h3 class="product-card-title">${escapeHTML(prod.title)}</h3>
                                <p class="product-card-subtitle">${isLocked ? 'Premium Silhouette' : escapeHTML(prod.description.substring(0, 50)) + '...'}</p>
                            </div>
                            <span class="product-card-price">${isLocked ? '₹X,XXX' : '₹' + prod.price.toLocaleString('en-IN')}</span>
                        </div>

                        <div class="product-card-actions">
                            ${isLocked ? `
                                <button class="prod-btn notify-btn" onclick="openNotifyModal('${prod.id}')">NOTIFY ME</button>
                                <button class="prod-wish-icon ${isWishlisted ? 'active' : ''}" onclick="toggleProductWishlist('${prod.id}')" aria-label="Add to wishlist">
                                    <svg viewBox="0 0 24 24" fill="${isWishlisted ? '#d41920' : 'none'}" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </button>
                            ` : `
                                ${prod.inStock ? `
                                    <button class="prod-btn checkout-btn" onclick="addToCart('${prod.id}')">ADD TO CART</button>
                                ` : `
                                    <button class="prod-btn checkout-btn disabled" disabled>SOLD OUT</button>
                                `}
                                <button class="prod-wish-icon ${isWishlisted ? 'active' : ''}" onclick="toggleProductWishlist('${prod.id}')" aria-label="Add to wishlist">
                                    <svg viewBox="0 0 24 24" fill="${isWishlisted ? '#d41920' : 'none'}" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </button>
                            `}
                        </div>
                    </div>
                `;

                productsGrid.appendChild(card);
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // NOTIFY ALERT REDIRECTION TO FOOTER NEWSLETTER
        // ─────────────────────────────────────────────────────────────────────────────

        window.openNotifyModal = function (productId) {
            activeNotifyProdId = productId;
            const footerNewsletter = document.getElementById('footer-newsletter-form') || document.querySelector('.newsletter-form') || document.querySelector('.footer-col-newsletter');
            if (footerNewsletter) {
                footerNewsletter.scrollIntoView({ behavior: 'smooth' });
                const emailInput = footerNewsletter.querySelector('input[type="email"]');
                if (emailInput) {
                    setTimeout(() => emailInput.focus(), 800);
                }
                showToast("Scrolling to early access notification form.", false);
            }
        };

        window.closeNotifyModal = function () {
            // No-op placeholder
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // WISHLIST TOGGLE (WORKS BEFORE LAUNCH)
        // ─────────────────────────────────────────────────────────────────────────────

        window.toggleProductWishlist = async function (prodId) {
            if (!currentUser) {
                showToast("Syndicate authentication required. Please log in.", true);
                setTimeout(() => window.location.href = 'account', 1500);
                return;
            }

            try {
                const res = await window.ZayloreDB.toggleWishlist(currentUser.uid, prodId);
                showToast(res.added ? "Item saved in vault." : "Item removed from vault.", false);
                renderProductsGrid();
            } catch (e) {
                showToast("Failed to update wishlist state.", true);
            }
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // ADD TO CART POST-LAUNCH
        // ─────────────────────────────────────────────────────────────────────────────

        window.addToCart = function (prodId) {
            const prod = storeProducts.find(p => p.id === prodId);
            if (prod) {
                showToast(`[CART OVERLAY] ${prod.title.toUpperCase()} ADDED TO BAG.`, false);
            }
        };

        // Hydrate header avatar icon
        (function hydrateHeaderAvatar() {
            const navAction = document.getElementById('nav-profile-btn');
            if (currentUser && navAction) {
                if (currentUser.profilePic) {
                    navAction.innerHTML = `<img src="${currentUser.profilePic}" alt="Avatar" class="avatar-header-icon" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                } else {
                    navAction.innerHTML = `<div class="profile-avatar" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#d41920;color:#fff;border-radius:50%;font-weight:700;">${currentUser.name.charAt(0).toUpperCase()}</div>`;
                }
            }
        })();

        // ─────────────────────────────────────────────────────────────────────────────
        // TOAST ENGINE
        // ─────────────────────────────────────────────────────────────────────────────

        function showToast(msg, isError = true) {
            let toast = document.getElementById('zs-prod-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'zs-prod-toast';
                document.body.appendChild(toast);
            }

            toast.innerText = msg;
            toast.className = `auth-toast show ${isError ? 'error' : 'success'}`;

            setTimeout(() => {
                toast.classList.remove('show');
            }, 4000);
        }

        // Helper to prevent HTML Injection
        function escapeHTML(str) {
            return str.replace(/[&<>'"]/g, 
                tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
            );
        }
    });

})();
