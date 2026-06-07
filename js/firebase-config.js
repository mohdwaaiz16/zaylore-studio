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
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// ⬇ Set this to true once you've filled in real credentials above
const useFirebase = false;

// ─────────────────────────────────────────────────────────────────
// Internal: expose config globally
// ─────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, useFirebase };
} else {
    window.zsFirebaseConfig  = firebaseConfig;
    window.zsUseFirebase     = useFirebase;
}
