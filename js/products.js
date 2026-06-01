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
                            <div class="product-lock-overlay">
                                <div class="lock-circle">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                                <span class="lock-label">LOCKED</span>
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
        // NOTIFY ALERT POPUP
        // ─────────────────────────────────────────────────────────────────────────────

        window.openNotifyModal = function (productId) {
            activeNotifyProdId = productId;
            if (notifyModal) {
                notifyModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        };

        window.closeNotifyModal = function () {
            if (notifyModal) {
                notifyModal.classList.remove('show');
                document.body.style.overflow = '';
                notifyForm.reset();
            }
        };

        if (notifyForm) {
            notifyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('notify-email').value.trim();
                const submitBtn = notifyForm.querySelector('button[type="submit"]');

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "CAPTURING...";

                    await window.ZayloreDB.addSubscriber(email, `notify_prod_${activeNotifyProdId}`);

                    showToast("Subscriber Added. Early launch details will be transmitted.", false);
                    closeNotifyModal();
                } catch (err) {
                    showToast(err.message, true);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "CONFIRM NOTIFICATION";
                }
            });
        }

        // Close on esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeNotifyModal();
        });

        // ─────────────────────────────────────────────────────────────────────────────
        // WISHLIST TOGGLE (WORKS BEFORE LAUNCH)
        // ─────────────────────────────────────────────────────────────────────────────

        window.toggleProductWishlist = async function (prodId) {
            if (!currentUser) {
                showToast("Syndicate authentication required. Please log in.", true);
                setTimeout(() => window.location.href = 'account.html', 1500);
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
