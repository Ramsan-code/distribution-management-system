import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKUwRUNUsdMGCWw5zvxYvNSDywf6oZo1w",
  authDomain: "distribution-system-7783a.firebaseapp.com",
  projectId: "distribution-system-7783a",
  storageBucket: "distribution-system-7783a.firebasestorage.app",
  messagingSenderId: "553932461529",
  appId: "1:553932461529:web:948f56b28802c6d775b5c8",
  measurementId: "G-BPESKEMF6V"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
