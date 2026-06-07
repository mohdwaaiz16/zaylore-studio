// Zaylore Studio - Authentication & Security Frontend Controller (auth.js)

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Initialize CSRF token
        const csrfToken = window.zsSecurity.generateCSRFToken();

        // Check if user is already logged in, redirect to dashboard
        const currentUser = localStorage.getItem('zs_user');
        const urlParams = new URLSearchParams(window.location.search);
        const isResetFlow = urlParams.has('reset') && urlParams.has('uid');

        if (currentUser && !isResetFlow) {
            window.location.href = 'dashboard';
            return;
        }

        // Setup forms & tabs
        const loginTab = document.querySelector('.auth-tabs button:nth-child(1)');
        const joinTab = document.querySelector('.auth-tabs button:nth-child(2)');
        const loginFormContainer = document.getElementById('login-form');
        const joinFormContainer = document.getElementById('join-form');
        const staffFormContainer = document.getElementById('staff-join-form');
        const resetFormContainer = document.getElementById('reset-password-form');
        const socialBlock = document.getElementById('social-block');
        const titleEl = document.querySelector('.auth-title');
        const subtitleEl = document.querySelector('.auth-subtitle');

        // Reset Password Form UI injection if reset token exists
        if (isResetFlow) {
            const uid = urlParams.get('uid');
            injectResetPasswordForm(uid);
        }

        // Global functions for switching screens
        window.toggleAuth = function (type) {
            if (isResetFlow) {
                // If in reset flow, exit it
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
                return;
            }

            if (type === 'login') {
                loginFormContainer.style.display = 'block';
                joinFormContainer.style.display = 'none';
                staffFormContainer.style.display = 'none';
                if (resetFormContainer) resetFormContainer.style.display = 'none';
                socialBlock.style.display = 'flex';
                loginTab.classList.add('active');
                joinTab.classList.remove('active');
                titleEl.innerText = window.isAdminView ? 'ADMIN TERMINAL' : 'ACCESS GRANTED';
            } else {
                loginFormContainer.style.display = 'none';
                joinFormContainer.style.display = 'block';
                staffFormContainer.style.display = 'none';
                if (resetFormContainer) resetFormContainer.style.display = 'none';
                socialBlock.style.display = 'none';
                joinTab.classList.add('active');
                loginTab.classList.remove('active');
                titleEl.innerText = 'JOIN THE MOVEMENT';
            }
        };

        window.toggleStaffForm = function (show) {
            if (show) {
                joinFormContainer.style.display = 'none';
                staffFormContainer.style.display = 'block';
                titleEl.innerText = 'STAFF APPLICATION';
            } else {
                joinFormContainer.style.display = 'block';
                staffFormContainer.style.display = 'none';
                titleEl.innerText = 'JOIN THE MOVEMENT';
            }
        };

        // Form Submit Listeners
        const actualLoginForm = document.getElementById('actual-login-form');
        const actualJoinForm = document.getElementById('actual-join-form');

        if (actualLoginForm) {
            actualLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('user-input');
                const passInput = document.getElementById('pass-input');
                const submitBtn = actualLoginForm.querySelector('button[type="submit"]');

                const email = emailInput.value.trim();
                const password = passInput.value;

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "AUTHENTICATING...";

                    // Validate CSRF
                    if (!validateCSRF()) {
                        throw new Error("Security verification failed (CSRF). Refresh page.");
                    }

                    if (window.isAdminView) {
                        // Admin Auth
                        if (email.toLowerCase() === 'waaiz' && password === 'zaylore_founder') {
                            if (window.ZayloreDB) await window.ZayloreDB.signInAdmin();
                            localStorage.setItem('adminRole', 'founder');
                            localStorage.setItem('adminName', 'PM Mohammed Waaiz');
                            showToast("Access Granted. Launching Founder Command Center...", false);
                            setTimeout(() => window.location.href = 'admin', 1200);
                        } else if (email.toLowerCase() === 'staff' && password === 'zaylore_staff') {
                            if (window.ZayloreDB) await window.ZayloreDB.signInAdmin();
                            localStorage.setItem('adminRole', 'staff');
                            localStorage.setItem('adminName', 'Zaylore Staff');
                            showToast("Access Granted. Launching Operations Console...", false);
                            setTimeout(() => window.location.href = 'admin', 1200);
                        } else {
                            // Check if it's dynamic approved staff
                            const requests = JSON.parse(localStorage.getItem('staffRequestsApproved') || '[]');
                            const matchedStaff = requests.find(s => s.username === email.toLowerCase() && s.password === password);
                            if (matchedStaff) {
                                if (window.ZayloreDB) await window.ZayloreDB.signInAdmin();
                                localStorage.setItem('adminRole', 'staff');
                                localStorage.setItem('adminName', matchedStaff.name);
                                showToast(`Welcome back ${matchedStaff.name}. Access Authorized.`, false);
                                setTimeout(() => window.location.href = 'admin', 1200);
                            } else {
                                throw new Error("Invalid Staff credentials. Override rejected.");
                            }
                        }
                    } else {
                        // User Auth
                        const user = await window.ZayloreDB.login(email, password);
                        localStorage.setItem('zs_user', JSON.stringify({
                            isLoggedIn: true,
                            uid: user.uid,
                            name: user.name,
                            email: user.email,
                            tier: user.tier,
                            phone: user.phone || "",
                            gender: user.gender || "",
                            dob: user.dob || "",
                            profilePic: user.profilePic || ""
                        }));

                        showToast("Authentication Successful. Entering Syndicate...", false);
                        setTimeout(() => window.location.href = 'dashboard', 1000);
                    }
                } catch (error) {
                    showToast(error.message, true);
                    submitBtn.disabled = false;
                    submitBtn.innerText = window.isAdminView ? "BYPASS" : "AUTHORIZE";
                }
            });
        }

        if (actualJoinForm) {
            actualJoinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('join-name');
                const emailInput = document.getElementById('join-email');
                const passInput = document.getElementById('join-password');
                const submitBtn = actualJoinForm.querySelector('button[type="submit"]');

                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                const password = passInput.value;

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "INITIALIZING...";

                    // Validate CSRF
                    if (!validateCSRF()) {
                        throw new Error("Security verification failed. Please try again.");
                    }

                    const user = await window.ZayloreDB.signup(name, email, password);

                    localStorage.setItem('zs_user', JSON.stringify({
                        isLoggedIn: true,
                        uid: user.uid,
                        name: user.name,
                        email: user.email,
                        tier: user.tier,
                        phone: "",
                        gender: "",
                        dob: "",
                        profilePic: ""
                    }));

                    showToast("Account Created. Welcome to the Zaylore Syndicate!", false);
                    setTimeout(() => window.location.href = 'dashboard', 1200);

                } catch (error) {
                    showToast(error.message, true);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "INITIALIZE";
                }
            });
        }

        // Forgot Password Action
        const forgotLink = document.querySelector('.forgot-password');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                showForgotPasswordModal();
            });
        }

        // Helper to validate CSRF token on submission
        function validateCSRF() {
            // Secure validation against token
            return window.zsSecurity.validateCSRFToken(sessionStorage.getItem('zs_csrf_token'));
        }

        // Dynamic Injection of Toast Notification
        function showToast(msg, isError = true) {
            let toast = document.getElementById('zs-auth-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'zs-auth-toast';
                document.body.appendChild(toast);
            }

            toast.innerText = msg;
            toast.className = `auth-toast show ${isError ? 'error' : 'success'}`;

            setTimeout(() => {
                toast.classList.remove('show');
            }, 4000);
        }

        // Forgot Password Modal UI
        function showForgotPasswordModal() {
            const modal = document.createElement('div');
            modal.className = 'modal-backdrop';
            modal.id = 'forgot-modal';
            modal.innerHTML = `
                <div class="modal-panel glass-card auth-modal-panel">
                    <div class="modal-header">
                        <h3 class="modal-title">RECOVER ACCESS</h3>
                        <p class="modal-sub">Enter email to transmit reset instructions</p>
                    </div>
                    <form id="forgot-password-form" class="auth-form" style="margin-top:20px;">
                        <div class="form-group">
                            <label class="form-label">Email Address</label>
                            <input type="email" id="forgot-email" class="form-input" placeholder="name@example.com" required>
                        </div>
                        <button type="submit" class="auth-btn">SEND LINK</button>
                        <button type="button" class="auth-btn btn-reject" id="close-forgot-modal" style="background:transparent;border:1px solid #444;color:#888;margin-top:10px;">CANCEL</button>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            // Close actions
            const closeBtn = document.getElementById('close-forgot-modal');
            closeBtn.addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

            // Form action
            const form = document.getElementById('forgot-password-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('forgot-email').value.trim();
                const submitBtn = form.querySelector('button[type="submit"]');

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "TRANSMITTING...";
                    await window.ZayloreDB.resetPasswordRequest(email);
                    showToast("Password reset transmission sent. Check console/logs.", false);
                    modal.remove();
                } catch (err) {
                    showToast(err.message, true);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "SEND LINK";
                }
            });
        }

        // Reset Password Form Injection
        function injectResetPasswordForm(uid) {
            // Hide standard tabs & forms
            document.querySelector('.auth-tabs').style.display = 'none';
            if (loginFormContainer) loginFormContainer.style.display = 'none';
            if (joinFormContainer) joinFormContainer.style.display = 'none';
            if (socialBlock) socialBlock.style.display = 'none';

            titleEl.innerText = "RESET PASSWORD";
            subtitleEl.innerText = "Reinitialize security credentials";

            const resetDiv = document.createElement('div');
            resetDiv.id = 'reset-password-form';
            resetDiv.innerHTML = `
                <form class="auth-form" id="actual-reset-form">
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" id="reset-pass" class="form-input" placeholder="••••••••" minlength="6" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirm New Password</label>
                        <input type="password" id="reset-pass-confirm" class="form-input" placeholder="••••••••" minlength="6" required>
                    </div>
                    <button type="submit" class="auth-btn">UPDATE SECURITY</button>
                    <div class="admin-toggle">
                        <a class="admin-link" onclick="location.href='account'">Cancel Reset</a>
                    </div>
                </form>
            `;
            document.querySelector('.auth-container').insertBefore(resetDiv, document.getElementById('social-block'));

            // Submit listener
            const form = document.getElementById('actual-reset-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pass = document.getElementById('reset-pass').value;
                const confirmPass = document.getElementById('reset-pass-confirm').value;
                const submitBtn = form.querySelector('button[type="submit"]');

                if (pass !== confirmPass) {
                    showToast("Passwords do not match.", true);
                    return;
                }

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerText = "UPDATING...";
                    await window.ZayloreDB.completeResetPassword(uid, pass);
                    showToast("Security updated. Log in with new credentials.", false);
                    setTimeout(() => {
                        window.history.replaceState({}, document.title, window.location.pathname);
                        location.reload();
                    }, 1500);
                } catch (err) {
                    showToast(err.message, true);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "UPDATE SECURITY";
                }
            });
        }
    });

    // Expose toggle admin utility
    window.toggleAdmin = function () {
        window.isAdminView = !window.isAdminView;
        const title = document.querySelector('.auth-title');
        const subtitle = document.querySelector('.auth-subtitle');
        const userLabel = document.getElementById('user-label');
        const userInput = document.getElementById('user-input');
        const adminBtn = document.getElementById('admin-btn');
        const adminText = document.getElementById('admin-text');
        const authBtn = document.getElementById('auth-submit-btn');
        const socialBlock = document.getElementById('social-block');

        if (window.isAdminView) {
            title.innerText = 'ADMIN TERMINAL';
            subtitle.innerText = 'Secure Staff Override Active';
            userLabel.innerText = 'Admin Username';
            userInput.value = '';
            userInput.placeholder = 'Enter staff ID';
            adminBtn.innerText = 'User Login';
            adminText.innerText = 'Not staff?';
            authBtn.innerText = 'Bypass';
            socialBlock.style.display = 'none';
        } else {
            title.innerText = 'ACCESS GRANTED';
            subtitle.innerText = 'Welcome to the Zaylore Syndicate';
            userLabel.innerText = 'Username or Email Address';
            userInput.value = '';
            userInput.placeholder = 'Enter username or email';
            adminBtn.innerText = 'Admin Login';
            adminText.innerText = 'Staff member?';
            authBtn.innerText = 'Authorize';
            socialBlock.style.display = 'flex';
        }
    };

    window.submitStaffApplication = function (e) {
        e.preventDefault();
        const name = document.getElementById('staff-name').value.trim();
        const email = document.getElementById('staff-email').value.trim();
        const role = document.getElementById('staff-role').value;

        const application = {
            id: 'REQ-' + Math.floor(Math.random() * 9000 + 1000),
            name,
            email,
            role,
            date: new Date().toLocaleString()
        };

        // Save to localStorage
        let requests = JSON.parse(localStorage.getItem('staffRequests') || '[]');
        requests.push(application);
        localStorage.setItem('staffRequests', JSON.stringify(requests));

        alert('APPLICATION TRANSMITTED: Your request has been queued for review by Founder Waaiz. You will receive credentials upon approval.');
        window.toggleStaffForm(false);
        window.toggleAuth('login');
    };

    window.handleCredentialResponse = function (response) {
        try {
            const responsePayload = decodeJwtResponse(response.credential);
            const userObj = {
                isLoggedIn: true,
                uid: "google-" + responsePayload.sub,
                name: responsePayload.name,
                email: responsePayload.email,
                profilePic: responsePayload.picture,
                tier: 'CORE MEMBER',
                phone: '',
                gender: '',
                dob: ''
            };
            localStorage.setItem('zs_user', JSON.stringify(userObj));
            
            // Trigger toast
            let toast = document.getElementById('zs-auth-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'zs-auth-toast';
                document.body.appendChild(toast);
            }
            toast.innerText = "Connected via Google. Entering Syndicate...";
            toast.className = 'auth-toast show success';
            setTimeout(() => { toast.classList.remove('show'); }, 4000);

            setTimeout(() => window.location.href = 'dashboard', 1000);
        } catch (e) {
            alert("Google authentication failed.");
        }
    };

    function decodeJwtResponse(token) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    }

})();
