// src/firebase/firebase.js

// Import Firebase core functions
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// --- 1. Default App: Admin Dashboard (slawn-project) ---
const adminConfig = {
  apiKey: "AIzaSyC97AmSmP1MaT1t1Xit6TCwJ8JBiSpF9l0",
  authDomain: "slawn-project.firebaseapp.com",
  projectId: "slawn-project",
  storageBucket: "slawn-project.appspot.com", // corrected
  messagingSenderId: "916067458212",
  appId: "1:916067458212:web:dda88c39aeab6fef655a31",
  measurementId: "G-KCVPZ596X1"
};

// Initialize the default app if not already initialized
const adminApp = getApps().length === 0 ? initializeApp(adminConfig) : getApp();
const adminDB = getFirestore(adminApp);

// --- 2. Secondary App: Student App (slawn-shinto) ---
const shintoConfig = {
  apiKey: "AIzaSyArPyKUXu3wG83VRIl75-SKta4izehraJY",
  authDomain: "slawn-shinto.firebaseapp.com",
  projectId: "slawn-shinto",
  storageBucket: "slawn-shinto.appspot.com", // corrected
  messagingSenderId: "835954209782",
  appId: "1:835954209782:web:7951b83c5832f39d0a8dd7"
};

let shintoApp;
try {
  shintoApp = getApp('Slawn-Shinto');
} catch (e) {
  shintoApp = initializeApp(shintoConfig, 'Slawn-Shinto');
}
const shintoDB = getFirestore(shintoApp);

// --- Exports ---
export { adminApp, adminDB, shintoApp, shintoDB };
