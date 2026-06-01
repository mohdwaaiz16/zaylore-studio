// Zaylore Studio - Members Dashboard Controller (dashboard.js)

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Authenticate session
        const rawUser = localStorage.getItem('zs_user');
        if (!rawUser) {
            window.location.href = 'account.html';
            return;
        }

        const user = JSON.parse(rawUser);
        let activeTab = 'membership'; // default tab

        // DB Data cache
        let userAddresses = [];
        let userWishlist = [];
        let storeProducts = [];

        // Tab Navigation
        const tabs = document.querySelectorAll('.dash-tab-btn');
        const sections = document.querySelectorAll('.dash-section');

        window.switchTab = function (tabId) {
            activeTab = tabId;
            tabs.forEach(t => {
                if (t.getAttribute('data-tab') === tabId) t.classList.add('active');
                else t.classList.remove('active');
            });
            sections.forEach(s => {
                if (s.id === `sec-${tabId}`) s.classList.add('active');
                else s.classList.remove('active');
            });

            // Trigger specific loaders
            if (tabId === 'addresses') loadAddresses();
            if (tabId === 'wishlist') loadWishlist();
            if (tabId === 'profile') loadProfileData();
        };

        // Add event listeners to tabs
        tabs.forEach(t => {
            t.addEventListener('click', () => {
                switchTab(t.getAttribute('data-tab'));
            });
        });

        // ─────────────────────────────────────────────────────────────────────────────
        // PROFILE DETAILS & PICTURE MANAGEMENT
        // ─────────────────────────────────────────────────────────────────────────────

        function loadProfileData() {
            // Populate inputs
            document.getElementById('profile-name').value = user.name || '';
            document.getElementById('profile-email').value = user.email || '';
            document.getElementById('profile-phone').value = user.phone || '';
            document.getElementById('profile-gender').value = user.gender || '';
            document.getElementById('profile-dob').value = user.dob || '';

            // Update avatars
            const avImg = user.profilePic || 'img/logo-icon-sm.jpg';
            document.getElementById('profile-avatar-img').src = avImg;
        }

        // Save Profile Form
        const profileForm = document.getElementById('profile-edit-form');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = profileForm.querySelector('button[type="submit"]');

                const name = document.getElementById('profile-name').value.trim();
                const phone = document.getElementById('profile-phone').value.trim();
                const gender = document.getElementById('profile-gender').value;
                const dob = document.getElementById('profile-dob').value;

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "SAVING CHANGES...";

                    const profileUpdate = { name, phone, gender, dob };
                    await window.ZayloreDB.updateProfile(user.uid, profileUpdate);

                    // Update session
                    user.name = name;
                    user.phone = phone;
                    user.gender = gender;
                    user.dob = dob;
                    localStorage.setItem('zs_user', JSON.stringify(user));

                    showToast("Profile Updated Successfully.", false);
                    hydrateGlobalHeader();
                } catch (err) {
                    showToast(err.message, true);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "SAVE CHANGES";
                }
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // PURE JS AVATAR CROPPING ENGINE (NO PLUGINS)
        // ─────────────────────────────────────────────────────────────────────────────

        const avatarInput = document.getElementById('avatar-input');
        const cropperModal = document.getElementById('cropper-modal');
        const cropperPreview = document.getElementById('crop-preview-container');
        const zoomSlider = document.getElementById('crop-zoom');
        let rawImageObj = null;

        // Cropper state parameters
        let zoom = 1;
        let imgX = 0;
        let imgY = 0;
        let isDragging = false;
        let startX = 0;
        let startY = 0;

        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (!file.type.startsWith('image/')) {
                    showToast("Please upload an image file.", true);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    rawImageObj = new Image();
                    rawImageObj.onload = () => {
                        // Reset cropper config
                        zoom = 1;
                        zoomSlider.value = 100;
                        imgX = 0;
                        imgY = 0;

                        openCropperModal();
                        renderCropperCanvas();
                    };
                    rawImageObj.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        function openCropperModal() {
            cropperModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        window.closeCropperModal = function () {
            cropperModal.classList.remove('show');
            document.body.style.overflow = '';
            avatarInput.value = ''; // Reset input
        };

        // Render cropping overlay Canvas
        const cropCanvas = document.getElementById('crop-canvas');
        const cropCtx = cropCanvas ? cropCanvas.getContext('2d') : null;

        function renderCropperCanvas() {
            if (!cropCtx || !rawImageObj) return;

            const cw = cropCanvas.width = 300;
            const ch = cropCanvas.height = 300;

            // Clear
            cropCtx.clearRect(0, 0, cw, ch);

            // Compute scaling to cover viewport
            const viewSize = 200; // Size of target square box
            const viewX = (cw - viewSize) / 2;
            const viewY = (ch - viewSize) / 2;

            // Draw Dark Overlay
            cropCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            cropCtx.fillRect(0, 0, cw, ch);

            // Draw image on lower layer using clipping (drawn inside viewport only)
            cropCtx.save();
            
            // Define clipping path
            cropCtx.beginPath();
            cropCtx.rect(viewX, viewY, viewSize, viewSize);
            cropCtx.clip();

            // Clear background inside clip
            cropCtx.fillStyle = '#111';
            cropCtx.fillRect(viewX, viewY, viewSize, viewSize);

            // Calculate scaled image size
            let scale = Math.max(viewSize / rawImageObj.width, viewSize / rawImageObj.height) * zoom;
            let sw = rawImageObj.width * scale;
            let sh = rawImageObj.height * scale;

            // Center image inside viewport
            let cx = viewX + (viewSize - sw) / 2 + imgX;
            let cy = viewY + (viewSize - sh) / 2 + imgY;

            cropCtx.drawImage(rawImageObj, cx, cy, sw, sh);
            cropCtx.restore();

            // Draw Viewport border overlay
            cropCtx.strokeStyle = '#d41920';
            cropCtx.lineWidth = 2;
            cropCtx.strokeRect(viewX, viewY, viewSize, viewSize);

            // Corner decorative tags
            cropCtx.fillStyle = '#d41920';
            const tag = 8;
            cropCtx.fillRect(viewX - 2, viewY - 2, tag, 2);
            cropCtx.fillRect(viewX - 2, viewY - 2, 2, tag);
            cropCtx.fillRect(viewX + viewSize - tag + 2, viewY - 2, tag, 2);
            cropCtx.fillRect(viewX + viewSize, viewY - 2, 2, tag);
            cropCtx.fillRect(viewX - 2, viewY + viewSize, tag, 2);
            cropCtx.fillRect(viewX - 2, viewY + viewSize - tag + 2, 2, tag);
            cropCtx.fillRect(viewX + viewSize - tag + 2, viewY + viewSize, tag, 2);
            cropCtx.fillRect(viewX + viewSize, viewY + viewSize - tag + 2, 2, tag);
        }

        // Mouse Drag actions inside canvas
        if (cropCanvas) {
            // Drag Start
            const startDrag = (e) => {
                isDragging = true;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                startX = clientX - imgX;
                startY = clientY - imgY;
            };

            // Drag Move
            const moveDrag = (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                imgX = clientX - startX;
                imgY = clientY - startY;
                renderCropperCanvas();
            };

            // Drag End
            const endDrag = () => {
                isDragging = false;
            };

            cropCanvas.addEventListener('mousedown', startDrag);
            cropCanvas.addEventListener('mousemove', moveDrag);
            window.addEventListener('mouseup', endDrag);

            cropCanvas.addEventListener('touchstart', startDrag, { passive: false });
            cropCanvas.addEventListener('touchmove', moveDrag, { passive: false });
            window.addEventListener('touchend', endDrag);
        }

        // Zoom Slider action
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                zoom = e.target.value / 100;
                renderCropperCanvas();
            });
        }

        // Save Cropped Image Action
        window.saveCroppedAvatar = async function () {
            if (!rawImageObj) return;

            const saveBtn = document.querySelector('.cropper-actions .auth-btn');
            saveBtn.disabled = true;
            saveBtn.innerText = "SAVING...";

            try {
                // Generate a square output canvas
                const outCanvas = document.createElement('canvas');
                outCanvas.width = 250;
                outCanvas.height = 250;
                const outCtx = outCanvas.getContext('2d');

                const viewSize = 200;
                let scale = Math.max(viewSize / rawImageObj.width, viewSize / rawImageObj.height) * zoom;
                let sw = rawImageObj.width * scale;
                let sh = rawImageObj.height * scale;

                // Scale values to output size (250 / 200 = 1.25 ratio)
                const ratio = 250 / viewSize;
                let outW = sw * ratio;
                let outH = sh * ratio;
                let outX = (250 - outW) / 2 + (imgX * ratio);
                let outY = (250 - outH) / 2 + (imgY * ratio);

                outCtx.fillStyle = '#111';
                outCtx.fillRect(0, 0, 250, 250);
                outCtx.drawImage(rawImageObj, outX, outY, outW, outH);

                const dataURL = outCanvas.toDataURL('image/jpeg', 0.85);

                // Save in Database
                await window.ZayloreDB.updateProfile(user.uid, { profilePic: dataURL });

                // Update session memory
                user.profilePic = dataURL;
                localStorage.setItem('zs_user', JSON.stringify(user));

                // Reflect in UI
                document.getElementById('profile-avatar-img').src = dataURL;
                hydrateGlobalHeader();
                showToast("Profile image updated successfully.", false);
                closeCropperModal();
            } catch (err) {
                showToast("Failed to crop/save profile picture.", true);
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = "SAVE CROP";
            }
        };

        window.removeAvatar = async function () {
            if (confirm("REMOVE PROFILE PICTURE?")) {
                try {
                    await window.ZayloreDB.updateProfile(user.uid, { profilePic: "" });
                    user.profilePic = "";
                    localStorage.setItem('zs_user', JSON.stringify(user));
                    document.getElementById('profile-avatar-img').src = 'img/logo-icon-sm.jpg';
                    hydrateGlobalHeader();
                    showToast("Avatar image removed.", false);
                } catch (e) {
                    showToast("Failed to remove avatar.", true);
                }
            }
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // ADDRESSES CRUD MANAGEMENT
        // ─────────────────────────────────────────────────────────────────────────────

        const addressModal = document.getElementById('address-modal');
        const addressForm = document.getElementById('actual-address-form');
        let editingAddressId = null; // null for add mode

        async function loadAddresses() {
            const container = document.getElementById('addresses-container');
            if (!container) return;

            container.innerHTML = '<div class="dash-loader">LOADING ADDRESSES...</div>';

            try {
                userAddresses = await window.ZayloreDB.getAddresses(user.uid);
                container.innerHTML = '';

                if (userAddresses.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <p>No saved addresses found. Add one to expedite drop orders.</p>
                            <button class="dash-action-btn" onclick="openAddressModal()" style="margin-top:15px;">Add New Address</button>
                        </div>
                    `;
                    return;
                }

                // Render address cards
                userAddresses.forEach(addr => {
                    const card = document.createElement('div');
                    card.className = 'glass-card address-card hover-raise';
                    card.innerHTML = `
                        <div class="address-details">
                            <h4 class="address-recipient">${escapeHTML(addr.fullName)}</h4>
                            <p class="address-phone">📞 ${escapeHTML(addr.mobileNumber)}</p>
                            <p class="address-lines">
                                ${escapeHTML(addr.addressLine1)}<br>
                                ${addr.addressLine2 ? escapeHTML(addr.addressLine2) + '<br>' : ''}
                                ${escapeHTML(addr.city)}, ${escapeHTML(addr.state)} - ${escapeHTML(addr.postalCode)}<br>
                                <strong>${escapeHTML(addr.country)}</strong>
                            </p>
                        </div>
                        <div class="address-actions">
                            <button class="action-edit" onclick="openAddressModal('${addr.id}')">Edit</button>
                            <button class="action-delete" onclick="deleteAddress('${addr.id}')">Delete</button>
                        </div>
                    `;
                    container.appendChild(card);
                });

                // Add grid spacer and "New Address" card
                const addCard = document.createElement('div');
                addCard.className = 'address-card-new glass-card';
                addCard.innerHTML = `
                    <div class="add-new-inner" onclick="openAddressModal()">
                        <span>+</span>
                        <p>Add New Address</p>
                    </div>
                `;
                container.appendChild(addCard);

            } catch (e) {
                container.innerHTML = '<div class="error-state">Failed to fetch addresses.</div>';
            }
        }

        window.openAddressModal = function (id = null) {
            editingAddressId = id;
            const modalTitle = document.getElementById('address-modal-title');

            if (id) {
                modalTitle.innerText = "EDIT ADDRESS DETAILS";
                const addr = userAddresses.find(a => a.id === id);
                if (addr) {
                    document.getElementById('addr-name').value = addr.fullName;
                    document.getElementById('addr-phone').value = addr.mobileNumber;
                    document.getElementById('addr-line1').value = addr.addressLine1;
                    document.getElementById('addr-line2').value = addr.addressLine2 || '';
                    document.getElementById('addr-city').value = addr.city;
                    document.getElementById('addr-state').value = addr.state;
                    document.getElementById('addr-country').value = addr.country;
                    document.getElementById('addr-postal').value = addr.postalCode;
                }
            } else {
                modalTitle.innerText = "ADD NEW ADDRESS";
                addressForm.reset();
            }

            addressModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        };

        window.closeAddressModal = function () {
            addressModal.classList.remove('show');
            document.body.style.overflow = '';
        };

        if (addressForm) {
            addressForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = addressForm.querySelector('button[type="submit"]');

                const address = {
                    fullName: document.getElementById('addr-name').value.trim(),
                    mobileNumber: document.getElementById('addr-phone').value.trim(),
                    addressLine1: document.getElementById('addr-line1').value.trim(),
                    addressLine2: document.getElementById('addr-line2').value.trim(),
                    city: document.getElementById('addr-city').value.trim(),
                    state: document.getElementById('addr-state').value.trim(),
                    country: document.getElementById('addr-country').value.trim(),
                    postalCode: document.getElementById('addr-postal').value.trim()
                };

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "SAVING...";

                    if (editingAddressId) {
                        await window.ZayloreDB.updateAddress(editingAddressId, address);
                        showToast("Address details updated.", false);
                    } else {
                        await window.ZayloreDB.addAddress(user.uid, address);
                        showToast("Address added to profile.", false);
                    }

                    closeAddressModal();
                    loadAddresses();
                } catch (err) {
                    showToast(err.message, true);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "SAVE ADDRESS";
                }
            });
        }

        window.deleteAddress = async function (id) {
            if (confirm("DELETE THIS ADDRESS?")) {
                try {
                    await window.ZayloreDB.deleteAddress(id);
                    showToast("Address deleted.", false);
                    loadAddresses();
                } catch (e) {
                    showToast("Failed to delete address entry.", true);
                }
            }
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // WISHLIST ARCHITECTURE (PRE-LAUNCH INCLUDED)
        // ─────────────────────────────────────────────────────────────────────────────

        async function loadWishlist() {
            const container = document.getElementById('wishlist-container');
            if (!container) return;

            container.innerHTML = '<div class="dash-loader">HYDRATING WISHLIST...</div>';

            try {
                storeProducts = await window.ZayloreDB.getProducts();
                userWishlist = await window.ZayloreDB.getWishlist(user.uid);
                container.innerHTML = '';

                // Filter products that are saved by user
                const savedProducts = storeProducts.filter(prod =>
                    userWishlist.some(w => w.productId === prod.id)
                );

                if (savedProducts.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <p>Your wishlist is empty. Unlocked items and locked drop alerts appear here.</p>
                            <button class="dash-action-btn" onclick="location.href='products.html'" style="margin-top:15px;">Discover Drop Items</button>
                        </div>
                    `;
                    return;
                }

                // Render wishlist items
                savedProducts.forEach(prod => {
                    const card = document.createElement('div');
                    card.className = 'wishlist-item glass-card hover-raise';
                    
                    // Locked drop overlay check
                    const isLocked = !localStorage.getItem('zs_launch_active');

                    card.innerHTML = `
                        <div class="wishlist-img-wrap">
                            <img src="${prod.images[0]}" alt="${escapeHTML(prod.title)}" class="${isLocked ? 'blurred' : ''}">
                            ${isLocked ? '<div class="locked-drop-badge">🔒 LOCKED</div>' : ''}
                        </div>
                        <div class="wishlist-item-info">
                            <h4 class="wishlist-title">${escapeHTML(prod.title)}</h4>
                            <p class="wishlist-price">₹${prod.price.toLocaleString('en-IN')}</p>
                            <p class="wishlist-status">${isLocked ? '<span style="color:#d41920;">Available on Event Day</span>' : '<span style="color:#00ff00;">In Stock</span>'}</p>
                        </div>
                        <div class="wishlist-item-actions">
                            <button class="dash-action-btn rm-btn" onclick="removeFromWishlist('${prod.id}')">Remove</button>
                            ${!isLocked && prod.inStock ? `<button class="dash-action-btn cart-btn">Add to Cart</button>` : ''}
                        </div>
                    `;
                    container.appendChild(card);
                });

            } catch (e) {
                container.innerHTML = '<div class="error-state">Failed to fetch wishlist data.</div>';
            }
        }

        window.removeFromWishlist = async function (prodId) {
            try {
                await window.ZayloreDB.toggleWishlist(user.uid, prodId);
                showToast("Product removed from wishlist.", false);
                loadWishlist();
            } catch (e) {
                showToast("Failed to remove item.", true);
            }
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // GLOBAL HEADER HYDRATION
        // ─────────────────────────────────────────────────────────────────────────────

        function hydrateGlobalHeader() {
            const navAction = document.getElementById('nav-profile-btn');
            if (navAction) {
                if (user.profilePic) {
                    navAction.innerHTML = `<img src="${user.profilePic}" alt="Avatar" class="avatar-header-icon" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                } else {
                    navAction.innerHTML = `<div class="profile-avatar" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#d41920;color:#fff;border-radius:50%;font-weight:700;">${user.name.charAt(0).toUpperCase()}</div>`;
                }
            }
        }

        // Hydrate status metrics
        (function hydrateStatusPillars() {
            document.getElementById('member-id').innerText = user.uid;
            document.getElementById('member-name-title').innerText = user.name.toUpperCase();
            
            // Check launch activation
            const isLaunchActive = !!localStorage.getItem('zs_launch_active');
            const dropStatus = document.getElementById('drop-access-status');
            if (dropStatus) {
                dropStatus.innerHTML = isLaunchActive 
                    ? `<span class="badge badge-active">Active</span>` 
                    : `<span class="badge badge-pending">Active on Event Day</span>`;
            }
        })();

        // Hydrate initially
        hydrateGlobalHeader();

        // ─────────────────────────────────────────────────────────────────────────────
        // GLOBAL LOGOUT
        // ─────────────────────────────────────────────────────────────────────────────

        window.syndicateLogout = function () {
            if (confirm("REVOKE ACCESS AND LOGOUT OF SYNDICATE?")) {
                localStorage.removeItem('zs_user');
                window.location.href = 'account.html';
            }
        };

        // Modal escape click handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeCropperModal();
                closeAddressModal();
            }
        });

        // ─────────────────────────────────────────────────────────────────────────────
        // TOAST NOTIFICATIONS
        // ─────────────────────────────────────────────────────────────────────────────

        function showToast(msg, isError = true) {
            let toast = document.getElementById('zs-dash-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'zs-dash-toast';
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
