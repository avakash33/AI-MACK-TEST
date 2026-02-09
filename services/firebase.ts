
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtYisGtOoxmiWxXLAH7KyQ5XpEjaJTEtU",
  authDomain: "with-ai-mock-tests.firebaseapp.com",
  projectId: "with-ai-mock-tests",
  storageBucket: "with-ai-mock-tests.firebasestorage.app",
  messagingSenderId: "621303515211",
  appId: "1:621303515211:web:e055c13f67d8f1b6c8e5ce",
  measurementId: "G-JHWM8J33HR"
};

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Export initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);
