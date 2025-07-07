import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your Firebase service account key
const serviceAccountPath = path.resolve(__dirname, "../../firebase-admin.json");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../firebase-admin.json")));




  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

export { admin, db, auth };
