
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase once and only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export initialized services
// Initializing Firestore directly from the app instance to ensure it's registered correctly
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
