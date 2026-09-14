// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCKUwRUNUsdMGCWw5zvxYvNSDywf6oZo1w",
  authDomain: "distribution-system-7783a.firebaseapp.com",
  projectId: "distribution-system-7783a",
  storageBucket: "distribution-system-7783a.firebasestorage.app",
  messagingSenderId: "553932461529",
  appId: "1:553932461529:web:948f56b28802c6d775b5c8",
  measurementId: "G-BPESKEMF6V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);