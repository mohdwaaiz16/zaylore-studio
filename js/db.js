// Zaylore Studio - Database & Security Layer (Unified db.js)
// Actively coordinates real Firebase services or a high-fidelity local emulation database.

(function () {
    'use strict';

    // Helper functions
    const log = (msg, isError = false) => {
        const prefix = "[ZAYLORE-DB]";
        if (isError) {
            console.error(`${prefix} ❌ ${msg}`);
        } else {
            console.log(`%c${prefix} %c${msg}`, "color: #d41920; font-weight: bold;", "color: #eee;");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // SECURE UTILS (SHA-256, CSRF, RATE-LIMITING)
    // ─────────────────────────────────────────────────────────────────────────────

    // Async SHA-256 Hashing using Web Crypto API (Client-Side Protection)
    async function hashPassword(password) {
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // CSRF Protection Token Generator & Validator
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

    // Client-side Login Rate Limiting (Brute-Force Prevention)
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 Minutes
    const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 Minutes

    function checkRateLimit(email) {
        try {
            const limitData = JSON.parse(localStorage.getItem(`zs_rate_${email}`)) || { attempts: [], lockoutUntil: 0 };
            const now = Date.now();

            if (limitData.lockoutUntil > now) {
                const waitMin = Math.ceil((limitData.lockoutUntil - now) / 60000);
                return { allowed: false, message: `Access suspended. Try again in ${waitMin} minute(s).` };
            }

            // Filter attempts within active window
            limitData.attempts = limitData.attempts.filter(t => (now - t) < ATTEMPT_WINDOW_MS);

            if (limitData.attempts.length >= MAX_LOGIN_ATTEMPTS) {
                limitData.lockoutUntil = now + LOCKOUT_TIME_MS;
                localStorage.setItem(`zs_rate_${email}`, JSON.stringify(limitData));
                return { allowed: false, message: `Too many failed attempts. Login locked for 15 minutes.` };
            }

            return { allowed: true };
        } catch (e) {
            return { allowed: true };
        }
    }

    function recordFailedAttempt(email) {
        try {
            const limitData = JSON.parse(localStorage.getItem(`zs_rate_${email}`)) || { attempts: [], lockoutUntil: 0 };
            limitData.attempts.push(Date.now());
            localStorage.setItem(`zs_rate_${email}`, JSON.stringify(limitData));
        } catch (e) {}
    }

    function clearRateLimits(email) {
        try {
            localStorage.removeItem(`zs_rate_${email}`);
        } catch (e) {}
    }

    // Input Validation
    function validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase());
    }

    // Mock JWT Web Token Generator
    function generateMockJWT(payload) {
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
        const body = btoa(JSON.stringify({
            ...payload,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000) // 1 Day expiry
        }));
        const signature = btoa(header + "." + body + "zs_syndicate_secret_signature");
        return `${header}.${body}.${signature}`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // LOCAL STORAGE DATABASE SETUP (MOCK DATA)
    // ─────────────────────────────────────────────────────────────────────────────

    const MOCK_PRODUCTS = [
        {
            id: "zs-tee-01",
            title: "Z-Signature Oversized Tee",
            description: "Heavyweight 240GSM luxury streetwear cotton t-shirt with dropped shoulders and thick ribbed neck. Features a matte-black aesthetic texture with a vivid signature red tag accent.",
            price: 2299,
            images: ["img/model-tshirt.jpg", "img/hoodie-product.jpg", "img/gallery-5.jpg", "img/gallery-6.jpg"],
            inStock: true,
            createdAt: Date.now()
        },
        {
            id: "zs-hoodie-02",
            title: "Classic Oversized Washed Hoodie",
            description: "Thick 450GSM loopback terry fleece hoodie with a kangaroo pocket, clean seamless cuffs, and custom metal aglets. Features classic Zaylore Studio brand embroidery.",
            price: 4599,
            images: ["img/gallery-1.jpg", "img/gallery-4.jpg", "img/gallery-2.jpg", "img/gallery-3.jpg"],
            inStock: true,
            createdAt: Date.now() - 86400000
        },
        {
            id: "zs-jacket-03",
            title: "Quilted Culture Bomber Jacket",
            description: "Premium nylon shell bomber jacket featuring an inner orange quilted liner, heavy utility zippers, and modular side pockets. Emblazoned with brand icons.",
            price: 6299,
            images: ["img/gallery-2.jpg", "img/gallery-1.jpg", "img/gallery-3.jpg", "img/gallery-4.jpg"],
            inStock: true,
            createdAt: Date.now() - 172800000
        },
        {
            id: "zs-cargo-04",
            title: "Syndicate Canvas Cargo Pants",
            description: "Heavyweight duck canvas utility cargo pants featuring a wide-leg baggy fit, double-knee panels, and raw copper metal adjustments.",
            price: 3999,
            images: ["img/gallery-5.jpg", "img/gallery-6.jpg", "img/gallery-1.jpg", "img/gallery-2.jpg"],
            inStock: true,
            createdAt: Date.now() - 259200000
        },
        {
            id: "zs-polo-05",
            title: "Vintage Heavyweight Zip Polo",
            description: "Oversized knitted polo shirt with a custom brushed chrome zip collar. Engineered box-cut fit inspired by vintage sportswear culture.",
            price: 2799,
            images: ["img/gallery-6.jpg", "img/gallery-5.jpg", "img/gallery-2.jpg", "img/gallery-3.jpg"],
            inStock: false,
            createdAt: Date.now() - 345600000
        },
        {
            id: "zs-hoodie-06",
            title: "Distressed Fleece Crimson Hoodie",
            description: "Vintage sun-washed crimson red fleece hoodie. Hand-distressed details at cuffs and hem with bold culture graphic print.",
            price: 4899,
            images: ["img/hoodie-product.jpg", "img/gallery-4.jpg", "img/gallery-2.jpg", "img/gallery-1.jpg"],
            inStock: true,
            createdAt: Date.now() - 432000000
        }
    ];

    const DEFAULT_EVENT = {
        launchDate: "August 23, 2026 11:00:00",
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
        if (!localStorage.getItem('zs_subscribers_db')) {
            localStorage.setItem('zs_subscribers_db', JSON.stringify([]));
        }
        if (!localStorage.getItem('zs_addresses_db')) {
            localStorage.setItem('zs_addresses_db', JSON.stringify([]));
        }
        if (!localStorage.getItem('zs_wishlist_db')) {
            localStorage.setItem('zs_wishlist_db', JSON.stringify([]));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // THE DB DRIVER INTERFACE
    // ─────────────────────────────────────────────────────────────────────────────

    const ZayloreDB = {
        isFirebaseReady: false,
        useFirebase: false,

        // Initialize Engine
        async init() {
            initLocalStorageDB();

            const useFB = window.useFirebase || false;
            this.useFirebase = useFB;

            if (useFB) {
                log("Attaching to Firebase services...");
                try {
                    await this.loadFirebaseSDKs();
                    // Initialize Firebase App
                    if (!firebase.apps.length) {
                        firebase.initializeApp(window.firebaseConfig);
                    }
                    this.isFirebaseReady = true;
                    log("Firebase initialized successfully.");
                } catch (e) {
                    log("Firebase initialization failed! Falling back to local storage engine. Details: " + e.message, true);
                    this.useFirebase = false;
                }
            } else {
                log("Local Emulation Engine Active.");
            }
        },

        // Helper to load Firebase dynamically in client environment
        loadFirebaseSDKs() {
            const compatVersion = "10.8.0";
            const files = [
                `https://www.gstatic.com/firebasejs/${compatVersion}/firebase-app-compat.js`,
                `https://www.gstatic.com/firebasejs/${compatVersion}/firebase-auth-compat.js`,
                `https://www.gstatic.com/firebasejs/${compatVersion}/firebase-firestore-compat.js`,
                `https://www.gstatic.com/firebasejs/${compatVersion}/firebase-storage-compat.js`
            ];

            const loadScript = src => new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = src;
                s.onload = res;
                s.onerror = rej;
                document.head.appendChild(s);
            });

            return files.reduce((promise, url) => promise.then(() => loadScript(url)), Promise.resolve());
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // AUTHENTICATION APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async signup(fullName, email, password) {
            // Validation
            if (!fullName || fullName.trim().length < 2) throw new Error("Full name must be at least 2 characters.");
            if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
            if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

            if (this.useFirebase && this.isFirebaseReady) {
                // Firebase Auth signup
                const credential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                const fbUser = credential.user;
                await fbUser.updateProfile({ displayName: fullName });

                // Create profile doc in Firestore
                await firebase.firestore().collection('users').doc(fbUser.uid).set({
                    name: fullName,
                    email: email,
                    tier: 'CORE MEMBER',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                return { uid: fbUser.uid, name: fullName, email: email, tier: 'CORE MEMBER' };
            } else {
                // Local DB signup
                const users = JSON.parse(localStorage.getItem('zs_users_db')) || [];
                if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
                    throw new Error("Email address is already registered.");
                }

                const hashedPassword = await hashPassword(password);
                const newUser = {
                    uid: "zs-usr-" + Math.floor(Math.random() * 900000 + 100000),
                    name: fullName.trim(),
                    email: email.trim().toLowerCase(),
                    password: hashedPassword,
                    phone: "",
                    gender: "",
                    dob: "",
                    profilePic: "",
                    tier: "CORE MEMBER",
                    createdAt: Date.now()
                };

                users.push(newUser);
                localStorage.setItem('zs_users_db', JSON.stringify(users));

                return { uid: newUser.uid, name: newUser.name, email: newUser.email, tier: newUser.tier };
            }
        },

        async login(email, password) {
            if (!validateEmail(email)) throw new Error("Please enter a valid email address.");
            if (!password) throw new Error("Password is required.");

            // Check rate limiting
            const rate = checkRateLimit(email);
            if (!rate.allowed) throw new Error(rate.message);

            if (this.useFirebase && this.isFirebaseReady) {
                try {
                    const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
                    const fbUser = credential.user;

                    // Retrieve doc
                    const doc = await firebase.firestore().collection('users').doc(fbUser.uid).get();
                    const data = doc.exists ? doc.data() : { tier: 'CORE MEMBER' };

                    clearRateLimits(email);
                    return {
                        uid: fbUser.uid,
                        name: fbUser.displayName || fbUser.email.split('@')[0],
                        email: fbUser.email,
                        tier: data.tier || 'CORE MEMBER',
                        phone: data.phone || '',
                        gender: data.gender || '',
                        dob: data.dob || '',
                        profilePic: data.profilePic || '',
                        token: await fbUser.getIdToken()
                    };
                } catch (e) {
                    recordFailedAttempt(email);
                    throw new Error("Invalid email or password. Access Denied.");
                }
            } else {
                // Local DB login
                const users = JSON.parse(localStorage.getItem('zs_users_db')) || [];
                const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

                if (!user) {
                    recordFailedAttempt(email);
                    throw new Error("Invalid email or password. Access Denied.");
                }

                const hashedPass = await hashPassword(password);
                if (user.password !== hashedPass) {
                    recordFailedAttempt(email);
                    throw new Error("Invalid email or password. Access Denied.");
                }

                clearRateLimits(email);
                const token = generateMockJWT({ uid: user.uid, name: user.name, email: user.email });

                return {
                    uid: user.uid,
                    name: user.name,
                    email: user.email,
                    tier: user.tier || 'CORE MEMBER',
                    phone: user.phone || '',
                    gender: user.gender || '',
                    dob: user.dob || '',
                    profilePic: user.profilePic || '',
                    token: token
                };
            }
        },

        // Password Reset Request
        async resetPasswordRequest(email) {
            if (!validateEmail(email)) throw new Error("Invalid email format.");

            if (this.useFirebase && this.isFirebaseReady) {
                await firebase.auth().sendPasswordResetEmail(email);
                return true;
            } else {
                const users = JSON.parse(localStorage.getItem('zs_users_db')) || [];
                const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (!user) throw new Error("Email address not found in our database.");

                // Simulate reset email link console capture
                console.log(`%c[SIMULATED PASSWORD RESET LINK FOR ${email}]%c https://www.zaylorestudio.in/account.html?reset=1&uid=${user.uid}`, "background: #d41920; color: #fff; font-weight: bold;", "");
                return true;
            }
        },

        // Complete Reset Password
        async completeResetPassword(uid, newPassword) {
            if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
            if (this.useFirebase) {
                throw new Error("Real resets must go through Firebase reset link flow.");
            } else {
                const users = JSON.parse(localStorage.getItem('zs_users_db')) || [];
                const userIndex = users.findIndex(u => u.uid === uid);
                if (userIndex === -1) throw new Error("Invalid user ID session.");

                const hashed = await hashPassword(newPassword);
                users[userIndex].password = hashed;
                localStorage.setItem('zs_users_db', JSON.stringify(users));
                return true;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // PROFILE APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async updateProfile(uid, profileData) {
            if (this.useFirebase && this.isFirebaseReady) {
                await firebase.firestore().collection('users').doc(uid).update(profileData);
                // Also update displayName if changed
                if (profileData.name) {
                    const fbUser = firebase.auth().currentUser;
                    if (fbUser) await fbUser.updateProfile({ displayName: profileData.name });
                }
                return true;
            } else {
                const users = JSON.parse(localStorage.getItem('zs_users_db')) || [];
                const index = users.findIndex(u => u.uid === uid);
                if (index === -1) throw new Error("Profile session not found.");

                users[index] = { ...users[index], ...profileData };
                localStorage.setItem('zs_users_db', JSON.stringify(users));
                return true;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // ADDRESSES APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async getAddresses(userId) {
            if (this.useFirebase && this.isFirebaseReady) {
                const snapshot = await firebase.firestore().collection('addresses').where('userId', '==', userId).get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                const addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
                return addresses.filter(addr => addr.userId === userId);
            }
        },

        async addAddress(userId, address) {
            const fields = ["fullName", "mobileNumber", "addressLine1", "city", "state", "country", "postalCode"];
            for (const f of fields) {
                if (!address[f] || address[f].trim() === "") throw new Error(`Field ${f} is required.`);
            }

            if (this.useFirebase && this.isFirebaseReady) {
                const ref = await firebase.firestore().collection('addresses').add({ userId, ...address });
                return { id: ref.id, userId, ...address };
            } else {
                const addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
                const newAddress = {
                    id: "zs-addr-" + Math.floor(Math.random() * 900000 + 100000),
                    userId,
                    ...address
                };
                addresses.push(newAddress);
                localStorage.setItem('zs_addresses_db', JSON.stringify(addresses));
                return newAddress;
            }
        },

        async updateAddress(id, address) {
            if (this.useFirebase && this.isFirebaseReady) {
                await firebase.firestore().collection('addresses').doc(id).update(address);
                return true;
            } else {
                const addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
                const idx = addresses.findIndex(a => a.id === id);
                if (idx === -1) throw new Error("Address entry not found.");

                addresses[idx] = { ...addresses[idx], ...address };
                localStorage.setItem('zs_addresses_db', JSON.stringify(addresses));
                return true;
            }
        },

        async deleteAddress(id) {
            if (this.useFirebase && this.isFirebaseReady) {
                await firebase.firestore().collection('addresses').doc(id).delete();
                return true;
            } else {
                let addresses = JSON.parse(localStorage.getItem('zs_addresses_db')) || [];
                addresses = addresses.filter(a => a.id !== id);
                localStorage.setItem('zs_addresses_db', JSON.stringify(addresses));
                return true;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // PRODUCT APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async getProducts() {
            if (this.useFirebase && this.isFirebaseReady) {
                const snap = await firebase.firestore().collection('products').orderBy('createdAt', 'desc').get();
                return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                return JSON.parse(localStorage.getItem('zs_products_db')) || [];
            }
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

            if (this.useFirebase && this.isFirebaseReady) {
                const ref = await firebase.firestore().collection('products').add(fullProduct);
                return { id: ref.id, ...fullProduct };
            } else {
                const products = JSON.parse(localStorage.getItem('zs_products_db')) || [];
                const newProduct = {
                    id: "zs-prod-" + Math.floor(Math.random() * 90000 + 10000),
                    ...fullProduct
                };
                products.unshift(newProduct);
                localStorage.setItem('zs_products_db', JSON.stringify(products));
                return newProduct;
            }
        },

        async removeProduct(id) {
            if (this.useFirebase && this.isFirebaseReady) {
                await firebase.firestore().collection('products').doc(id).delete();
                return true;
            } else {
                let products = JSON.parse(localStorage.getItem('zs_products_db')) || [];
                products = products.filter(p => p.id !== id);
                localStorage.setItem('zs_products_db', JSON.stringify(products));
                return true;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // SUBSCRIBERS APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async addSubscriber(email, source = 'newsletter') {
            if (!validateEmail(email)) throw new Error("Invalid email address.");

            if (this.useFirebase && this.isFirebaseReady) {
                // Check if already subscribed to prevent duplication
                const snap = await firebase.firestore().collection('subscribers')
                    .where('email', '==', email.toLowerCase())
                    .where('source', '==', source)
                    .get();

                if (snap.empty) {
                    await firebase.firestore().collection('subscribers').add({
                        email: email.toLowerCase(),
                        source,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                return true;
            } else {
                const subs = JSON.parse(localStorage.getItem('zs_subscribers_db')) || [];
                const exists = subs.find(s => s.email.toLowerCase() === email.toLowerCase() && s.source === source);
                if (!exists) {
                    subs.push({ email: email.toLowerCase(), source, createdAt: Date.now() });
                    localStorage.setItem('zs_subscribers_db', JSON.stringify(subs));
                }
                return true;
            }
        },

        async getSubscribers() {
            if (this.useFirebase && this.isFirebaseReady) {
                const snap = await firebase.firestore().collection('subscribers').orderBy('createdAt', 'desc').get();
                return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                return JSON.parse(localStorage.getItem('zs_subscribers_db')) || [];
            }
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // EVENT CONFIG APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async getEventDetails() {
            if (this.useFirebase && this.isFirebaseReady) {
                const doc = await firebase.firestore().collection('settings').doc('event_config').get();
                return doc.exists ? doc.data() : DEFAULT_EVENT;
            } else {
                return JSON.parse(localStorage.getItem('zs_event_db')) || DEFAULT_EVENT;
            }
        },

        async updateEventDetails(eventData) {
            if (this.useFirebase && this.isFirebaseReady) {
                await firebase.firestore().collection('settings').doc('event_config').set(eventData, { merge: true });
                return true;
            } else {
                const current = JSON.parse(localStorage.getItem('zs_event_db')) || DEFAULT_EVENT;
                const updated = { ...current, ...eventData };
                localStorage.setItem('zs_event_db', JSON.stringify(updated));
                return true;
            }
        },

        // ─────────────────────────────────────────────────────────────────────────────
        // WISHLIST APIs
        // ─────────────────────────────────────────────────────────────────────────────

        async getWishlist(userId) {
            if (this.useFirebase && this.isFirebaseReady) {
                const snap = await firebase.firestore().collection('wishlists').where('userId', '==', userId).get();
                return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                const wish = JSON.parse(localStorage.getItem('zs_wishlist_db')) || [];
                return wish.filter(w => w.userId === userId);
            }
        },

        async toggleWishlist(userId, productId) {
            if (this.useFirebase && this.isFirebaseReady) {
                const ref = firebase.firestore().collection('wishlists');
                const snap = await ref.where('userId', '==', userId).where('productId', '==', productId).get();

                if (snap.empty) {
                    await ref.add({ userId, productId, addedAt: Date.now() });
                    return { added: true };
                } else {
                    await ref.doc(snap.docs[0].id).delete();
                    return { added: false };
                }
            } else {
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
            }
        }
    };

    // Attach token logic to global window
    window.ZayloreDB = ZayloreDB;
    ZayloreDB.init();

    // Attach CSRF utils to window
    window.zsSecurity = {
        generateCSRFToken,
        validateCSRFToken
    };

})();
