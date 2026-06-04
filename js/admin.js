// Zaylore Studio - Admin Command Center Controller (admin.js)

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
        // Enforce Session Authorization
        const role = localStorage.getItem('adminRole');
        const name = localStorage.getItem('adminName');

        if (!role) {
            window.location.href = 'account';
            return;
        }

        // Cache DB data
        let storeProducts = [];
        let storeSubscribers = [];
        let eventConfig = {};

        // Hydrate header
        document.body.setAttribute('data-role', role);
        const displayNameEl = document.getElementById('display-name');
        const displayRoleEl = document.getElementById('display-role');
        if (displayNameEl) displayNameEl.innerText = name;
        if (displayRoleEl) displayRoleEl.innerText = role === 'founder' ? 'SYNDICATE FOUNDER' : 'OPERATIONS STAFF';

        // Tab Navigation
        window.showTab = function (tabId) {
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => item.classList.remove('active'));

            // Set active state on nav item
            const activeItem = Array.from(menuItems).find(i => i.getAttribute('onclick').includes(tabId));
            if (activeItem) activeItem.classList.add('active');

            // Toggle panels
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                if (tab.id === tabId) tab.classList.add('active');
                else tab.classList.remove('active');
            });

            // Hydrate dynamic data based on active view
            if (tabId === 'dashboard') loadDashboardStats();
            if (tabId === 'products') loadAdminProducts();
            if (tabId === 'events') loadAdminEventDetails();
            if (tabId === 'subscribers') loadAdminSubscribers();
        };

        // Terminate Session
        window.terminateSession = function () {
            localStorage.removeItem('adminRole');
            localStorage.removeItem('adminName');
            window.location.href = 'account';
        };

        // Fetch Initial Data
        async function fetchAllAdminData() {
            try {
                storeProducts = await window.ZayloreDB.getProducts();
                storeSubscribers = await window.ZayloreDB.getSubscribers();
                eventConfig = await window.ZayloreDB.getEventDetails();
            } catch (e) {
                console.error("Admin data pre-fetch error", e);
            }
        }

        await fetchAllAdminData();
        loadDashboardStats(); // Initial load

        // ─────────────────────────────────────────────────────────────────────────────
        // OVERVIEW & STAFF APPLICATIONS
        // ─────────────────────────────────────────────────────────────────────────────

        function loadDashboardStats() {
            // Hydrate Overview statistics
            const ordersNum = document.getElementById('stat-orders');
            const revNum = document.getElementById('stat-revenue');
            const subsNum = document.getElementById('stat-subscribers');
            const productsNum = document.getElementById('stat-products');

            if (ordersNum) ordersNum.innerText = "152";
            if (revNum) revNum.innerText = "₹2.4L";
            if (subsNum) subsNum.innerText = storeSubscribers.length;
            if (productsNum) productsNum.innerText = storeProducts.length;

            if (role === 'founder') {
                loadPendingStaffRequests();
            }
        }

        function loadPendingStaffRequests() {
            const body = document.getElementById('staff-requests-body');
            const empty = document.getElementById('no-requests');
            if (!body) return;

            const requests = JSON.parse(localStorage.getItem('staffRequests') || '[]');
            body.innerHTML = '';

            if (requests.length === 0) {
                empty.style.display = 'block';
                return;
            }

            empty.style.display = 'none';
            requests.forEach(req => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHTML(req.name)}</td>
                    <td>${escapeHTML(req.email)}</td>
                    <td><span class="badge badge-pending">${escapeHTML(req.role)}</span></td>
                    <td>${escapeHTML(req.date)}</td>
                    <td>
                        <button class="action-btn btn-approve" onclick="approveStaff('${req.id}')">Approve</button>
                        <button class="action-btn btn-reject" onclick="rejectStaff('${req.id}')">Reject</button>
                    </td>
                `;
                body.appendChild(tr);
            });
        }

        window.approveStaff = function (id) {
            let requests = JSON.parse(localStorage.getItem('staffRequests') || '[]');
            const staff = requests.find(r => r.id === id);

            if (!staff) return;

            if (confirm(`APPROVE ${staff.name.toUpperCase()} AS ${staff.role.toUpperCase()}?`)) {
                // Generate credentials
                const uniqueId = staff.name.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 90 + 10);
                const uniquePass = 'ZY-' + Math.random().toString(36).substring(2, 10).toUpperCase();

                // Save approved credentials
                let approved = JSON.parse(localStorage.getItem('staffRequestsApproved') || '[]');
                approved.push({
                    username: `${uniqueId}_staff`,
                    password: uniquePass,
                    name: staff.name
                });
                localStorage.setItem('staffRequestsApproved', JSON.stringify(approved));

                // Remove from pending
                requests = requests.filter(r => r.id !== id);
                localStorage.setItem('staffRequests', JSON.stringify(requests));

                // Log details to console
                console.log(`%c[STAFF ACCESS LOG]%c Granted to ${staff.name} (${staff.email}). ID: ${uniqueId}_staff, Password: ${uniquePass}`, "background: #d41920; color: #fff; font-weight: bold;", "");
                alert(`Staff application authorized.\n\nCredentials transmitted:\nUsername: ${uniqueId}_staff\nPassword: ${uniquePass}\n\n(Details logged to developer tools console).`);
                loadDashboardStats();
            }
        };

        window.rejectStaff = function (id) {
            if (confirm("REJECT AND REMOVE THIS STAFF APPLICATION?")) {
                let requests = JSON.parse(localStorage.getItem('staffRequests') || '[]');
                requests = requests.filter(r => r.id !== id);
                localStorage.setItem('staffRequests', JSON.stringify(requests));
                loadDashboardStats();
            }
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // PRODUCTS MANAGEMENT (CRUD)
        // ─────────────────────────────────────────────────────────────────────────────

        async function loadAdminProducts() {
            const tbody = document.getElementById('products-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            storeProducts = await window.ZayloreDB.getProducts();

            if (storeProducts.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No products registered in catalog database.</td></tr>`;
                return;
            }

            storeProducts.forEach(prod => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><img src="${prod.images[0]}" style="width:40px;height:40px;border-radius:4px;object-fit:cover;border:1px solid #333;"></td>
                    <td>${escapeHTML(prod.title)}</td>
                    <td>₹${prod.price.toLocaleString('en-IN')}</td>
                    <td>
                        <span class="badge ${prod.inStock ? 'badge-active' : 'badge-red'}">
                            ${prod.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn btn-remove" onclick="deleteCatalogProduct('${prod.id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Add Product Form Submit
        const addProductForm = document.getElementById('admin-add-product-form');
        if (addProductForm) {
            addProductForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = addProductForm.querySelector('button[type="submit"]');

                const product = {
                    title: document.getElementById('prod-title').value.trim(),
                    price: document.getElementById('prod-price').value.trim(),
                    description: document.getElementById('prod-desc').value.trim(),
                    images: [
                        document.getElementById('prod-img1').value.trim(),
                        document.getElementById('prod-img2').value.trim(),
                        document.getElementById('prod-img3').value.trim(),
                        document.getElementById('prod-img4').value.trim()
                    ],
                    inStock: document.getElementById('prod-stock').checked
                };

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "UPLOADING...";

                    await window.ZayloreDB.addProduct(product);

                    alert("Product added successfully to catalog.");
                    addProductForm.reset();
                    loadAdminProducts();
                } catch (err) {
                    alert(err.message);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "ADD PRODUCT";
                }
            });
        }

        window.deleteCatalogProduct = async function (id) {
            if (confirm("PERMANENTLY DESTRUCT CATALOG ELEMENT? This item will be removed from all user wishlists.")) {
                try {
                    await window.ZayloreDB.removeProduct(id);
                    loadAdminProducts();
                } catch (e) {
                    alert("Failed to remove product.");
                }
            }
        };

        // ─────────────────────────────────────────────────────────────────────────────
        // LAUNCH & EVENT DETAILS EDITOR
        // ─────────────────────────────────────────────────────────────────────────────

        async function loadAdminEventDetails() {
            try {
                eventConfig = await window.ZayloreDB.getEventDetails();
                document.getElementById('evt-launch-date').value = eventConfig.launchDate || '';
                document.getElementById('evt-location').value = eventConfig.location || '';
                document.getElementById('evt-date-display').value = eventConfig.date || '';
                document.getElementById('evt-ticket-link').value = eventConfig.ticketLink || '';
            } catch (e) {
                console.error("Failed to load settings in editor tab", e);
            }
        }

        const eventSettingsForm = document.getElementById('admin-event-settings-form');
        if (eventSettingsForm) {
            eventSettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = eventSettingsForm.querySelector('button[type="submit"]');

                const eventData = {
                    launchDate: document.getElementById('evt-launch-date').value.trim(),
                    location: document.getElementById('evt-location').value.trim(),
                    date: document.getElementById('evt-date-display').value.trim(),
                    ticketLink: document.getElementById('evt-ticket-link').value.trim()
                };

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "UPDATING EVENT MATRIX...";

                    await window.ZayloreDB.updateEventDetails(eventData);

                    alert("Event parameters synchronized across the syndicate network.");
                } catch (err) {
                    alert(err.message);
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerText = "UPDATE EVENT PARAMETERS";
                }
            });
        }

        // ─────────────────────────────────────────────────────────────────────────────
        // SUBSCRIBERS DIRECTORY (SEARCHABLE)
        // ─────────────────────────────────────────────────────────────────────────────

        async function loadAdminSubscribers() {
            const tbody = document.getElementById('subscribers-tbody');
            if (!tbody) return;

            tbody.innerHTML = '';
            storeSubscribers = await window.ZayloreDB.getSubscribers();

            if (storeSubscribers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No subscribers cataloged in the alerts directory.</td></tr>`;
                return;
            }

            renderSubscribersList(storeSubscribers);
        }

        function renderSubscribersList(list) {
            const tbody = document.getElementById('subscribers-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            list.forEach(sub => {
                const tr = document.createElement('tr');
                const cleanSource = sub.source.startsWith('notify_prod_') ? `Alert (Product ID: ${sub.source.split('notify_prod_')[1]})` : sub.source;
                const formattedDate = new Date(sub.createdAt).toLocaleDateString();

                tr.innerHTML = `
                    <td>${escapeHTML(sub.email)}</td>
                    <td><span class="badge ${sub.source === 'newsletter' ? 'badge-active' : 'badge-pending'}">${escapeHTML(cleanSource.toUpperCase())}</span></td>
                    <td>${formattedDate}</td>
                    <td><a href="mailto:${sub.email}" class="admin-link" style="margin-left:0;">Mail</a></td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Filter and Search subscribers
        const searchInput = document.getElementById('sub-search');
        const filterSelect = document.getElementById('sub-filter');

        if (searchInput) {
            searchInput.addEventListener('input', filterSubscribers);
        }
        if (filterSelect) {
            filterSelect.addEventListener('change', filterSubscribers);
        }

        function filterSubscribers() {
            const query = searchInput.value.toLowerCase().trim();
            const filter = filterSelect.value; // 'all', 'newsletter', 'notify'

            let filtered = storeSubscribers;

            // Search Filter
            if (query !== '') {
                filtered = filtered.filter(sub => sub.email.toLowerCase().includes(query));
            }

            // Category Filter
            if (filter !== 'all') {
                if (filter === 'newsletter') {
                    filtered = filtered.filter(sub => sub.source === 'newsletter');
                } else if (filter === 'notify') {
                    filtered = filtered.filter(sub => sub.source.startsWith('notify_prod_'));
                }
            }

            renderSubscribersList(filtered);
        }

        // Helper to prevent HTML Injection
        function escapeHTML(str) {
            return str.replace(/[&<>'"]/g, 
                tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
            );
        }
    });

})();
