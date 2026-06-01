// Zaylore Studio - Firebase Configuration
// To connect to a live Firebase instance:
// 1. Create a project at console.firebase.google.com
// 2. Enable Authentication (Email/Password), Firestore Database, and Storage
// 3. Replace the configuration placeholders below with your project credentials
// 4. Toggle the 'useFirebase' flag to true

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

const useFirebase = false; // Set to true to activate live Firebase SDK connection

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, useFirebase };
} else {
    window.firebaseConfig = firebaseConfig;
    window.useFirebase = useFirebase;
}
