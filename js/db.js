// ═══════════════════════════════════════════════════════════════════
// ZAYLORE STUDIO — Database & Security Layer (db.js)
// Supports: Firebase Firestore (live) OR localStorage (offline demo)
// ═══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    const log = (msg, isError = false) => {
        if (isError) {
            console.error(`[ZAYLORE-DB] ❌ ${msg}`);
        } else {
            console.log(`%c[ZAYLORE-DB] %c${msg}`, 'color:#d41920;font-weight:bold;', 'color:#eee;');
        }
    };

    // ─────────────────────────────────────────────────────────────
    // SECURITY UTILS
    // ─────────────────────────────────────────────────────────────

    async function hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    function generateCSRFToken() {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem('zs_csrf_token', token);
        return token;
    }

    function validateCSRFToken(token) {
        const stored = sessionStorage.getItem('zs_csrf_token');
        return stored && stored === token;
    }

    // Rate limiting
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_TIME_MS = 15 * 60 * 1000;
    const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

    function checkRateLimit(email) {
        try {
            const key = `zs_rate_${email}`;
            const limitData = JSON.parse(localStorage.getItem(key)) || { attempts: [], lockoutUntil: 0 };
            const now = Date.now();
            if (limitData.lockoutUntil > now) {
                const waitMin = Math.ceil((limitData.lockoutUntil - now) / 60000);
                return { allowed: false, message: `Access suspended. Try again in ${waitMin} minute(s).` };
            }
            limitData.attempts = limitData.attempts.filter(t => (now - t) < ATTEMPT_WINDOW_MS);
            if (limitData.attempts.length >= MAX_LOGIN_ATTEMPTS) {
                limitData.lockoutUntil = now + LOCKOUT_TIME_MS;
                localStorage.setItem(key, JSON.stringify(limitData));
                return { allowed: false, message: `Too many failed attempts. Login locked for 15 minutes.` };
            }
            return { allowed: true };
        } catch (e) { return { allowed: true }; }
    }

    function recordFailedAttempt(email) {
        try {
            const key = `zs_rate_${email}`;
            const limitData = JSON.parse(localStorage.getItem(key)) || { attempts: [], lockoutUntil: 0 };
            limitData.attempts.push(Date.now());
            localStorage.setItem(key, JSON.stringify(limitData));
        } catch (e) {}
    }

    function clearRateLimits(email) {
        try { localStorage.removeItem(`zs_rate_${email}`); } catch (e) {}
    }

    // ─────────────────────────────────────────────────────────────
    // UNIQUE ID GENERATOR (for localStorage mode)
    // ─────────────────────────────────────────────────────────────
    function generateUID() {
        return 'zs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ─────────────────────────────────────────────────────────────
    // FIREBASE MODE (when useFirebase = true)
    // ─────────────────────────────────────────────────────────────

    async function initFirebase() {
        // Firebase v9 compat (loaded via CDN script tags)
        const { initializeApp, getApps } = window.firebase_app || {};
        const { getAuth } = window.firebase_auth || {};
        const { getFirestore } = window.firebase_firestore || {};

        if (!window.firebase || !window.zsFirebaseConfig) {
            throw new Error('Firebase SDK not loaded. Check CDN scripts.');
        }

        // Avoid double initialization
        let app;
        if (!firebase.apps.length) {
            app = firebase.initializeApp(window.zsFirebaseConfig);
        } else {
            app = firebase.apps[0];
        }

        window._zsAuth = firebase.auth();
        window._zsDB   = firebase.firestore();

        log('Firebase initialized ✓');
        return { auth: window._zsAuth, db: window._zsDB };
    }

    // ─────────────────────────────────────────────────────────────
    // FIREBASE DATABASE OPERATIONS
    // ─────────────────────────────────────────────────────────────

    const FirebaseDB = {
        async signup(name, email, password) {
            const { auth, db } = await initFirebase();
            const rateCheck = checkRateLimit(email);
            if (!rateCheck.allowed) throw new Error(rateCheck.message);

            // Create Firebase Auth user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({ displayName: name });

            // Send email verification
            await user.sendEmailVerification();

            // Create Firestore profile document
            const profile = {
                uid: user.uid,
                name,
                email,
                tier: 'CORE MEMBER',
                phone: '',
                gender: '',
                dob: '',
                profilePic: '',
                referralCode: 'ZS-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                wishlist: [],
                notifications: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(user.uid).set(profile);

            clearRateLimits(email);
            log(`New user created: ${email}`);
            return profile;
        },

        async login(email, password) {
            const { auth, db } = await initFirebase();
            const rateCheck = checkRateLimit(email);
            if (!rateCheck.allowed) throw new Error(rateCheck.message);

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;

                // Update last login
                await db.collection('users').doc(user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Get full profile
                const doc = await db.collection('users').doc(user.uid).get();
                const profile = doc.exists ? doc.data() : {
                    uid: user.uid,
                    name: user.displayName || email.split('@')[0],
                    email: user.email,
                    tier: 'CORE MEMBER',
                    referralCode: 'ZS-' + Math.random().toString(36).substr(2, 6).toUpperCase()
                };

                clearRateLimits(email);
                log(`Login successful: ${email}`);
                return profile;
            } catch (err) {
                recordFailedAttempt(email);
                const friendlyErrors = {
                    'auth/user-not-found': 'No account found with this email.',
                    'auth/wrong-password': 'Incorrect password. Please try again.',
                    'auth/invalid-email': 'Invalid email address.',
                    'auth/user-disabled': 'This account has been suspended.',
                    'auth/too-many-requests': 'Too many attempts. Try again later.',
                    'auth/invalid-credential': 'Invalid credentials. Check email and password.'
                };
                throw new Error(friendlyErrors[err.code] || err.message);
            }
        },

        async loginWithGoogle() {
            const { auth, db } = await initFirebase();
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');

            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Check if profile exists, create if not
            const docRef = db.collection('users').doc(user.uid);
            const doc = await docRef.get();

            if (!doc.exists) {
                const profile = {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    profilePic: user.photoURL || '',
                    tier: 'CORE MEMBER',
                    phone: '',
                    gender: '',
                    dob: '',
                    referralCode: 'ZS-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    wishlist: [],
                    notifications: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                };
                await docRef.set(profile);
                return profile;
            } else {
                await docRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });
                return doc.data();
            }
        },

        async getProfile(uid) {
            const { db } = await initFirebase();
            const doc = await db.collection('users').doc(uid).get();
            if (!doc.exists) throw new Error('Profile not found.');
            return doc.data();
        },

        async updateProfile(uid, data) {
            const { auth, db } = await initFirebase();
            const allowedFields = ['name', 'phone', 'gender', 'dob', 'profilePic'];
            const cleanData = {};
            allowedFields.forEach(f => { if (data[f] !== undefined) cleanData[f] = data[f]; });
            cleanData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('users').doc(uid).update(cleanData);

            // Update Firebase Auth display name if name changed
            if (data.name && auth.currentUser) {
                await auth.currentUser.updateProfile({ displayName: data.name });
            }
            log(`Profile updated: ${uid}`);
        },

        async resetPasswordRequest(email) {
            const { auth } = await initFirebase();
            await auth.sendPasswordResetEmail(email);
            log(`Password reset sent to: ${email}`);
        },

        async logout() {
            const { auth } = await initFirebase();
            await auth.signOut();
            log('User signed out');
        },

        async getAllUsers() {
            // Admin only — reads all user documents
            const { db } = await initFirebase();
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => doc.data());
        },

        async subscribeNewsletter(email, name = '') {
            const { db } = await initFirebase();
            await db.collection('newsletterSignups').doc(email.toLowerCase()).set({
                email: email.toLowerCase(),
                name,
                subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            log(`Newsletter: ${email}`);
        },

        async submitStaffApplication(data) {
            const { db } = await initFirebase();
            const id = 'REQ-' + Date.now();
            await db.collection('staffApplications').doc(id).set({
                ...data,
                id,
                status: 'pending',
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            log(`Staff application: ${data.email}`);
        },

        onAuthStateChanged(callback) {
            if (!window.firebase) return;
            initFirebase().then(({ auth }) => {
                auth.onAuthStateChanged(callback);
            });
        }
    };

    // ─────────────────────────────────────────────────────────────
    // LOCAL STORAGE FALLBACK (when useFirebase = false)
    // ─────────────────────────────────────────────────────────────

    const LocalDB = {
        async signup(name, email, password) {
            const rateCheck = checkRateLimit(email);
            if (!rateCheck.allowed) throw new Error(rateCheck.message);

            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
                throw new Error('An account with this email already exists.');
            }

            if (password.length < 6) throw new Error('Password must be at least 6 characters.');
            const hashedPass = await hashPassword(password);

            const user = {
                uid: generateUID(),
                name,
                email: email.toLowerCase(),
                password: hashedPass,
                tier: 'CORE MEMBER',
                phone: '',
                gender: '',
                dob: '',
                profilePic: '',
                referralCode: 'ZS-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                wishlist: [],
                notifications: [],
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            users.push(user);
            localStorage.setItem('zs_users_db', JSON.stringify(users));
            clearRateLimits(email);
            log(`[LOCAL] New user: ${email}`);

            const { password: _, ...publicProfile } = user;
            return publicProfile;
        },

        async login(email, password) {
            const rateCheck = checkRateLimit(email);
            if (!rateCheck.allowed) throw new Error(rateCheck.message);

            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

            if (!user) {
                recordFailedAttempt(email);
                throw new Error('No account found with this email.');
            }

            const hashedPass = await hashPassword(password);
            if (user.password !== hashedPass) {
                recordFailedAttempt(email);
                throw new Error('Incorrect password. Please try again.');
            }

            // Update last login
            user.lastLogin = new Date().toISOString();
            localStorage.setItem('zs_users_db', JSON.stringify(users));
            clearRateLimits(email);
            log(`[LOCAL] Login: ${email}`);

            const { password: _, ...publicProfile } = user;
            return publicProfile;
        },

        async loginWithGoogle() {
            throw new Error('Google Sign-In requires Firebase. Please enable Firebase in firebase-config.js.');
        },

        async getProfile(uid) {
            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            const user = users.find(u => u.uid === uid);
            if (!user) throw new Error('Profile not found.');
            const { password: _, ...publicProfile } = user;
            return publicProfile;
        },

        async updateProfile(uid, data) {
            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            const idx = users.findIndex(u => u.uid === uid);
            if (idx === -1) throw new Error('User not found.');
            const allowedFields = ['name', 'phone', 'gender', 'dob', 'profilePic'];
            allowedFields.forEach(f => { if (data[f] !== undefined) users[idx][f] = data[f]; });
            users[idx].updatedAt = new Date().toISOString();
            localStorage.setItem('zs_users_db', JSON.stringify(users));
            log(`[LOCAL] Profile updated: ${uid}`);
        },

        async resetPasswordRequest(email) {
            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (!user) throw new Error('No account found with this email.');
            const resetToken = generateUID();
            const resets = JSON.parse(localStorage.getItem('zs_resets') || '{}');
            resets[resetToken] = { uid: user.uid, expires: Date.now() + 3600000 };
            localStorage.setItem('zs_resets', JSON.stringify(resets));
            alert(`[Demo Mode] Reset link:\n${window.location.origin}/account?reset=1&uid=${user.uid}\n\n(In production with Firebase, this is sent via email automatically.)`);
        },

        async completeResetPassword(uid, newPassword) {
            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            const idx = users.findIndex(u => u.uid === uid);
            if (idx === -1) throw new Error('Invalid reset token.');
            users[idx].password = await hashPassword(newPassword);
            localStorage.setItem('zs_users_db', JSON.stringify(users));
            log(`[LOCAL] Password reset: ${uid}`);
        },

        async logout() {
            // Handled by clearing localStorage in auth.js
            log('[LOCAL] User signed out');
        },

        async getAllUsers() {
            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            return users.map(({ password: _, ...u }) => u);
        },

        async subscribeNewsletter(email, name = '') {
            const subs = JSON.parse(localStorage.getItem('zs_newsletter') || '[]');
            if (!subs.find(s => s.email === email.toLowerCase())) {
                subs.push({ email: email.toLowerCase(), name, subscribedAt: new Date().toISOString() });
                localStorage.setItem('zs_newsletter', JSON.stringify(subs));
            }
            log(`[LOCAL] Newsletter: ${email}`);
        },

        async submitStaffApplication(data) {
            const apps = JSON.parse(localStorage.getItem('staffApplications') || '[]');
            const id = 'REQ-' + Math.floor(Math.random() * 9000 + 1000);
            apps.push({ ...data, id, status: 'pending', submittedAt: new Date().toISOString() });
            localStorage.setItem('staffApplications', JSON.stringify(apps));
            localStorage.setItem('staffRequests', JSON.stringify(apps));
            log(`[LOCAL] Staff application: ${data.email}`);
        },

        onAuthStateChanged(callback) {
            // Check localStorage session
            const session = localStorage.getItem('zs_user');
            if (session) {
                try { callback(JSON.parse(session)); } catch (e) { callback(null); }
            } else {
                callback(null);
            }
        }
    };

    // ─────────────────────────────────────────────────────────────
    // UNIFIED API — uses Firebase or LocalDB based on config
    // ─────────────────────────────────────────────────────────────

    const useFirebase = window.zsUseFirebase || false;
    const DB = useFirebase ? FirebaseDB : LocalDB;

    // Public API
    window.ZayloreDB = {
        signup:                 (...args) => DB.signup(...args),
        login:                  (...args) => DB.login(...args),
        loginWithGoogle:        (...args) => DB.loginWithGoogle(...args),
        getProfile:             (...args) => DB.getProfile(...args),
        updateProfile:          (...args) => DB.updateProfile(...args),
        resetPasswordRequest:   (...args) => DB.resetPasswordRequest(...args),
        completeResetPassword:  (...args) => DB.completeResetPassword ? DB.completeResetPassword(...args) : Promise.resolve(),
        logout:                 (...args) => DB.logout(...args),
        getAllUsers:             (...args) => DB.getAllUsers(...args),
        subscribeNewsletter:    (...args) => DB.subscribeNewsletter(...args),
        submitStaffApplication: (...args) => DB.submitStaffApplication(...args),
        onAuthStateChanged:     (...args) => DB.onAuthStateChanged(...args),
        isFirebaseMode:         () => useFirebase
    };

    // Security utils — used by auth.js
    window.zsSecurity = {
        generateCSRFToken,
        validateCSRFToken,
        hashPassword
    };

    log(`DB initialized (mode: ${useFirebase ? 'Firebase' : 'LocalStorage Demo'})`);
})();
