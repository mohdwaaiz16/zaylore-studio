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

    function validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase());
    }

    // ─────────────────────────────────────────────────────────────
    // UNIQUE ID GENERATOR (for localStorage mode)
    // ─────────────────────────────────────────────────────────────
    function generateUID() {
        return 'zs_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ─────────────────────────────────────────────────────────────
    // MOCK DATA & LOCAL STORAGE DB INITIALIZER
    // ─────────────────────────────────────────────────────────────

    const MOCK_PRODUCTS = [
        {
            id: "zs-tee-01",
            title: "Z-Signature Oversized Tee",
            description: "Heavyweight 240GSM luxury streetwear cotton t-shirt with dropped shoulders and thick ribbed neck. Features a matte-black aesthetic texture with a vivid signature red tag accent.",
            price: 2299,
            images: ["img/model-tshirt.webp", "img/hoodie-product.webp", "img/gallery-5.webp", "img/gallery-6.webp"],
            inStock: true,
            createdAt: Date.now()
        },
        {
            id: "zs-hoodie-02",
            title: "Classic Oversized Washed Hoodie",
            description: "Thick 450GSM loopback terry fleece hoodie with a kangaroo pocket, clean seamless cuffs, and custom metal aglets. Features classic Zaylore Studio brand embroidery.",
            price: 4599,
            images: ["img/gallery-1.webp", "img/gallery-4.webp", "img/gallery-2.webp", "img/gallery-3.webp"],
            inStock: true,
            createdAt: Date.now() - 86400000
        },
        {
            id: "zs-jacket-03",
            title: "Quilted Culture Bomber Jacket",
            description: "Premium nylon shell bomber jacket featuring an inner orange quilted liner, heavy utility zippers, and modular side pockets. Emblazoned with brand icons.",
            price: 6299,
            images: ["img/gallery-2.webp", "img/gallery-1.webp", "img/gallery-3.webp", "img/gallery-4.webp"],
            inStock: true,
            createdAt: Date.now() - 172800000
        },
        {
            id: "zs-cargo-04",
            title: "Syndicate Canvas Cargo Pants",
            description: "Heavyweight duck canvas utility cargo pants featuring a wide-leg baggy fit, double-knee panels, and raw copper metal adjustments.",
            price: 3999,
            images: ["img/gallery-5.webp", "img/gallery-6.webp", "img/gallery-1.webp", "img/gallery-2.webp"],
            inStock: true,
            createdAt: Date.now() - 259200000
        },
        {
            id: "zs-polo-05",
            title: "Vintage Heavyweight Zip Polo",
            description: "Oversized knitted polo shirt with a custom brushed chrome zip collar. Engineered box-cut fit inspired by vintage sportswear culture.",
            price: 2799,
            images: ["img/gallery-6.webp", "img/gallery-5.webp", "img/gallery-2.webp", "img/gallery-3.webp"],
            inStock: false,
            createdAt: Date.now() - 345600000
        },
        {
            id: "zs-hoodie-06",
            title: "Distressed Fleece Crimson Hoodie",
            description: "Vintage sun-washed crimson red fleece hoodie. Hand-distressed details at cuffs and hem with bold culture graphic print.",
            price: 4899,
            images: ["img/hoodie-product.webp", "img/gallery-4.webp", "img/gallery-2.webp", "img/gallery-1.webp"],
            inStock: true,
            createdAt: Date.now() - 432000000
        },
        {
            id: "zs-jeans-07",
            title: "Raw Denim Baggy Jeans",
            description: "Super heavyweight raw indigo denim baggy jeans featuring custom hardware, white accent stitch, and utility painter loops. Designed for a full stack at the hem.",
            price: 4299,
            images: ["img/gallery-5.webp", "img/gallery-6.webp", "img/gallery-1.webp", "img/gallery-2.webp"],
            inStock: true,
            createdAt: Date.now() - 518400000
        },
        {
            id: "zs-cap-08",
            title: "Distressed Syndicate Cap",
            description: "Vintage washed cotton strapback cap with heavy distressing, raw edge panels, and Z-signature red logo embroidery on the back.",
            price: 1499,
            images: ["img/logo-icon-sm.webp", "img/gallery-1.webp", "img/gallery-2.webp", "img/gallery-3.webp"],
            inStock: true,
            createdAt: Date.now() - 604800000
        },
        {
            id: "zs-shirt-09",
            title: "Heavy Flannel Oversized Shirt",
            description: "Double-brushed heavyweight plaid cotton flannel. Engineered with extra-wide dropped shoulder seams, chest pockets, and silver zip closure.",
            price: 3499,
            images: ["img/gallery-3.webp", "img/gallery-4.webp", "img/gallery-5.webp", "img/gallery-6.webp"],
            inStock: true,
            createdAt: Date.now() - 691200000
        },
        {
            id: "zs-short-10",
            title: "Fleece Street Sweatshorts",
            description: "Heavyweight loopback fleece shorts with an elastic drawstring waist, raw hem edge detail, and screen-printed manifesto text down the leg.",
            price: 2199,
            images: ["img/gallery-4.webp", "img/gallery-5.webp", "img/gallery-6.webp", "img/gallery-1.webp"],
            inStock: true,
            createdAt: Date.now() - 777600000
        },
        {
            id: "zs-socks-11",
            title: "Signature Ribbed Crew Socks",
            description: "Premium combed cotton performance crew socks featuring ribbed arch bands, double-cushioned soles, and woven Zaylore brand mark.",
            price: 799,
            images: ["img/gallery-6.webp", "img/gallery-1.webp", "img/gallery-2.webp", "img/gallery-3.webp"],
            inStock: true,
            createdAt: Date.now() - 864000000
        },
        {
            id: "zs-beanie-12",
            title: "Ribbed Heavy Knit Beanie",
            description: "Heavy gauge ribbed knit beanie in solid black with double roll cuff. Features a stitched signature red streak Z patch.",
            price: 1299,
            images: ["img/gallery-2.webp", "img/gallery-3.webp", "img/gallery-4.webp", "img/gallery-5.webp"],
            inStock: true,
            createdAt: Date.now() - 950400000
        }
    ];

    const DEFAULT_EVENT = {
        launchDate: "August 23, 2026 10:00:00",
        location: "Bangalore Showcase Event Arena",
        date: "23 August 2026",
        ticketLink: "https://www.ticketlink-zaylore.in"
    };

    function initLocalStorageDB() {
        if (!localStorage.getItem('zs_products_db')) {
            localStorage.setItem('zs_products_db', JSON.stringify(MOCK_PRODUCTS));
        }
        if (!localStorage.getItem('zs_event_db')) {
            localStorage.setItem('zs_event_db', JSON.stringify(DEFAULT_EVENT));
        }
        if (!localStorage.getItem('zs_users_db')) {
            localStorage.setItem('zs_users_db', JSON.stringify([]));
        }
        if (!localStorage.getItem('zs_addresses_db')) {
            localStorage.setItem('zs_addresses_db', JSON.stringify([]));
        }
        if (!localStorage.getItem('zs_wishlist_db')) {
            localStorage.setItem('zs_wishlist_db', JSON.stringify([]));
        }
        if (!localStorage.getItem('zs_newsletter')) {
            localStorage.setItem('zs_newsletter', JSON.stringify([]));
        }
        if (!localStorage.getItem('staffApplications')) {
            localStorage.setItem('staffApplications', JSON.stringify([]));
        }
    }

    // Call local DB initializer
    initLocalStorageDB();

    // ─────────────────────────────────────────────────────────────
    // FIREBASE MODE (when useFirebase = true)
    // ─────────────────────────────────────────────────────────────

    async function initFirebase() {
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
            if (email.toLowerCase().includes('admin')) {
                throw new Error("Registration with admin email is restricted.");
            }
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
            const { db } = await initFirebase();
            const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => doc.data());
        },

        async subscribeNewsletter(email, name = '') {
            return this.addSubscriber(email, 'newsletter');
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
        },

        async signInAdmin() {
            const { auth } = await initFirebase();
            const adminEmail = 'admin@zaylorestudio.in';
            const adminPass = 'zaylore_admin_secure_1122';
            try {
                await auth.signInWithEmailAndPassword(adminEmail, adminPass);
                log("Admin Firebase session established ✓");
            } catch (err) {
                if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    try {
                        await auth.createUserWithEmailAndPassword(adminEmail, adminPass);
                        log("Admin Firebase user created and signed in ✓");
                    } catch (createErr) {
                        throw new Error("Admin Firebase authentication failed: " + createErr.message);
                    }
                } else {
                    throw err;
                }
            }
        },

        async getAddresses(userId) {
            const { db } = await initFirebase();
            const snapshot = await db.collection('addresses').where('userId', '==', userId).get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async addAddress(userId, address) {
            const { db } = await initFirebase();
            const fields = ["fullName", "mobileNumber", "addressLine1", "city", "state", "country", "postalCode"];
            for (const f of fields) {
                if (!address[f] || address[f].trim() === "") throw new Error(`Field ${f} is required.`);
            }
            const ref = await db.collection('addresses').add({ userId, ...address });
            return { id: ref.id, userId, ...address };
        },

        async updateAddress(id, address) {
            const { db } = await initFirebase();
            await db.collection('addresses').doc(id).update(address);
            return true;
        },

        async deleteAddress(id) {
            const { db } = await initFirebase();
            await db.collection('addresses').doc(id).delete();
            return true;
        },

        async getWishlist(userId) {
            const { db } = await initFirebase();
            const snap = await db.collection('users').doc(userId).collection('wishlist').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async toggleWishlist(userId, productId) {
            const { db } = await initFirebase();
            const docRef = db.collection('users').doc(userId).collection('wishlist').doc(productId);
            const doc = await docRef.get();
            if (!doc.exists) {
                await docRef.set({
                    productId,
                    addedAt: Date.now()
                });
                return { added: true };
            } else {
                await docRef.delete();
                return { added: false };
            }
        },

        async getProducts() {
            const { db } = await initFirebase();
            const snap = await db.collection('products').orderBy('createdAt', 'desc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async addProduct(product) {
            const { db } = await initFirebase();
            const req = ["title", "description", "price", "images"];
            for (const r of req) {
                if (!product[r]) throw new Error(`Product ${r} is required.`);
            }
            if (product.images.length !== 4) throw new Error("Products must supply exactly 4 images.");

            const fullProduct = {
                ...product,
                price: parseFloat(product.price),
                inStock: product.hasOwnProperty('inStock') ? product.inStock : true,
                createdAt: Date.now()
            };
            const ref = await db.collection('products').add(fullProduct);
            return { id: ref.id, ...fullProduct };
        },

        async removeProduct(id) {
            const { db } = await initFirebase();
            await db.collection('products').doc(id).delete();
            return true;
        },

        async getEventDetails() {
            const { db } = await initFirebase();
            const doc = await db.collection('settings').doc('event_config').get();
            return doc.exists ? doc.data() : DEFAULT_EVENT;
        },

        async updateEventDetails(eventData) {
            const { db } = await initFirebase();
            await db.collection('settings').doc('event_config').set(eventData, { merge: true });
            return true;
        },

        async getSubscribers() {
            const { db } = await initFirebase();
            const snapshot = await db.collection('newsletterSignups').orderBy('subscribedAt', 'desc').get();
            return snapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email,
                source: doc.data().source || 'newsletter',
                createdAt: doc.data().subscribedAt ? (doc.data().subscribedAt.toDate ? doc.data().subscribedAt.toDate().toISOString() : doc.data().subscribedAt) : new Date().toISOString()
            }));
        },

        async addSubscriber(email, source = 'newsletter') {
            const { db } = await initFirebase();
            await db.collection('newsletterSignups').doc(email.toLowerCase()).set({
                email: email.toLowerCase(),
                source,
                subscribedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            return true;
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
            log('[LOCAL] User signed out');
        },

        async getAllUsers() {
            const users = JSON.parse(localStorage.getItem('zs_users_db') || '[]');
            return users.map(({ password: _, ...u }) => u);
        },

        async subscribeNewsletter(email, name = '') {
            return this.addSubscriber(email, 'newsletter');
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
            const session = localStorage.getItem('zs_user');
            if (session) {
                try { callback(JSON.parse(session)); } catch (e) { callback(null); }
            } else {
                callback(null);
            }
        },

        async signInAdmin() {
            return Promise.resolve();
        },

        async getAddresses(userId) {
            const addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
            return addresses.filter(addr => addr.userId === userId);
        },

        async addAddress(userId, address) {
            const fields = ["fullName", "mobileNumber", "addressLine1", "city", "state", "country", "postalCode"];
            for (const f of fields) {
                if (!address[f] || address[f].trim() === "") throw new Error(`Field ${f} is required.`);
            }
            const addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
            const newAddress = {
                id: "zs-addr-" + Math.floor(Math.random() * 900000 + 100000),
                userId,
                ...address
            };
            addresses.push(newAddress);
            localStorage.setItem('zs_addresses_db', JSON.stringify(addresses));
            return newAddress;
        },

        async updateAddress(id, address) {
            const addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
            const idx = addresses.findIndex(a => a.id === id);
            if (idx === -1) throw new Error("Address entry not found.");
            addresses[idx] = { ...addresses[idx], ...address };
            localStorage.setItem('zs_addresses_db', JSON.stringify(addresses));
            return true;
        },

        async deleteAddress(id) {
            let addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
            addresses = addresses.filter(a => a.id !== id);
            localStorage.setItem('zs_addresses_db', JSON.stringify(addresses));
            return true;
        },

        async getWishlist(userId) {
            const wish = JSON.parse(localStorage.getItem('zs_wishlist_db')) || [];
            return wish.filter(w => w.userId === userId);
        },

        async toggleWishlist(userId, productId) {
            let wish = JSON.parse(localStorage.getItem('zs_wishlist_db')) || [];
            const idx = wish.findIndex(w => w.userId === userId && w.productId === productId);
            if (idx === -1) {
                wish.push({ id: "zs-wish-" + Math.floor(Math.random() * 900000 + 100000), userId, productId, addedAt: Date.now() });
                localStorage.setItem('zs_wishlist_db', JSON.stringify(wish));
                return { added: true };
            } else {
                wish = wish.filter(w => !(w.userId === userId && w.productId === productId));
                localStorage.setItem('zs_wishlist_db', JSON.stringify(wish));
                return { added: false };
            }
        },

        async getProducts() {
            return JSON.parse(localStorage.getItem('zs_products_db')) || [];
        },

        async addProduct(product) {
            const req = ["title", "description", "price", "images"];
            for (const r of req) {
                if (!product[r]) throw new Error(`Product ${r} is required.`);
            }
            if (product.images.length !== 4) throw new Error("Products must supply exactly 4 images.");

            const fullProduct = {
                ...product,
                price: parseFloat(product.price),
                inStock: product.hasOwnProperty('inStock') ? product.inStock : true,
                createdAt: Date.now()
            };
            const products = JSON.parse(localStorage.getItem('zs_products_db')) || [];
            const newProduct = {
                id: "zs-prod-" + Math.floor(Math.random() * 90000 + 10000),
                ...fullProduct
            };
            products.unshift(newProduct);
            localStorage.setItem('zs_products_db', JSON.stringify(products));
            return newProduct;
        },

        async removeProduct(id) {
            let products = JSON.parse(localStorage.getItem('zs_products_db')) || [];
            products = products.filter(p => p.id !== id);
            localStorage.setItem('zs_products_db', JSON.stringify(products));
            return true;
        },

        async getEventDetails() {
            return JSON.parse(localStorage.getItem('zs_event_db')) || DEFAULT_EVENT;
        },

        async updateEventDetails(eventData) {
            const current = JSON.parse(localStorage.getItem('zs_event_db')) || DEFAULT_EVENT;
            const updated = { ...current, ...eventData };
            localStorage.setItem('zs_event_db', JSON.stringify(updated));
            return true;
        },

        async getSubscribers() {
            const subs = JSON.parse(localStorage.getItem('zs_newsletter') || '[]');
            return subs.map(s => ({
                id: s.email,
                email: s.email,
                source: s.source || 'newsletter',
                createdAt: s.subscribedAt || new Date().toISOString()
            }));
        },

        async addSubscriber(email, source = 'newsletter') {
            const subs = JSON.parse(localStorage.getItem('zs_newsletter') || '[]');
            const exists = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
            if (!exists) {
                subs.push({ email: email.toLowerCase(), source, subscribedAt: new Date().toISOString() });
                localStorage.setItem('zs_newsletter', JSON.stringify(subs));
            }
            return true;
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
        isFirebaseMode:         () => useFirebase,
        
        // Recovered methods
        signInAdmin:            (...args) => DB.signInAdmin(...args),
        getAddresses:           (...args) => DB.getAddresses(...args),
        addAddress:             (...args) => DB.addAddress(...args),
        updateAddress:          (...args) => DB.updateAddress(...args),
        deleteAddress:          (...args) => DB.deleteAddress(...args),
        getWishlist:            (...args) => DB.getWishlist(...args),
        toggleWishlist:         (...args) => DB.toggleWishlist(...args),
        getProducts:            (...args) => DB.getProducts(...args),
        addProduct:             (...args) => DB.addProduct(...args),
        removeProduct:          (...args) => DB.removeProduct(...args),
        getEventDetails:        (...args) => DB.getEventDetails(...args),
        updateEventDetails:     (...args) => DB.updateEventDetails(...args),
        getSubscribers:         (...args) => DB.getSubscribers(...args),
        addSubscriber:          (...args) => DB.addSubscriber(...args)
    };

    // Security utils — used by auth.js
    window.zsSecurity = {
        generateCSRFToken,
        validateCSRFToken,
        hashPassword
    };

    log(`DB initialized (mode: ${useFirebase ? 'Firebase' : 'LocalStorage Demo'})`);
})();
