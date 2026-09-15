import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function adminServices() {
  let app = getApps().find(app => app.name === "distribution-admin");
  if (!app) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey || !process.env.ADMIN_UID) {
      throw new Error("FIREBASE_SETUP_REQUIRED");
    }
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, "distribution-admin");
  }
  return { auth: getAuth(app), db: getFirestore(app) };
}
