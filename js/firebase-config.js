// ═══════════════════════════════════════════════════════════════════
// ZAYLORE STUDIO — Firebase Configuration
// ═══════════════════════════════════════════════════════════════════
//
// HOW TO ACTIVATE (one-time setup, takes 5 minutes):
//
// 1. Go to https://console.firebase.google.com/
// 2. Click "Add project" → name it "zaylore-studio" → Create
// 3. In the project, click "Web" icon (</>) → Register app → name it "Zaylore Web"
// 4. Copy the firebaseConfig object below and paste your real values
// 5. In Firebase Console → Authentication → Get Started → Enable:
//       - Email/Password provider
//       - Google provider
// 6. In Firebase Console → Firestore Database → Create database → Start in production mode
// 7. Set useFirebase = true below
// 8. Deploy Firestore security rules (see firestore.rules in this project)
//
// ═══════════════════════════════════════════════════════════════════

const firebaseConfig = {
    apiKey:            "AIzaSyCAzNRhRp-pOAhN2ys5d87vVQBrznUqncs",
    authDomain:        "zaylore-studio.firebaseapp.com",
    databaseURL:       "https://zaylore-studio-default-rtdb.firebaseio.com",
    projectId:         "zaylore-studio",
    storageBucket:     "zaylore-studio.firebasestorage.app",
    messagingSenderId: "1005319404523",
    appId:             "1:1005319404523:web:eb08670713a96b3d3d77ae",
    measurementId:     "G-FZZN7LVY7R"
};

// ✅ Firebase is LIVE — credentials are set
const useFirebase = true;

// ─────────────────────────────────────────────────────────────────
// Internal: expose config globally
// ─────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, useFirebase };
} else {
    window.zsFirebaseConfig  = firebaseConfig;
    window.zsUseFirebase     = useFirebase;
}
