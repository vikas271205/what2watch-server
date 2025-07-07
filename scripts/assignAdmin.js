// server/scripts/assignAdmin.js
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import path from "path";

dotenv.config();

const serviceAccount = JSON.parse(
  readFileSync(path.resolve("firebase-admin.json"), "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const uid = "LTdAFUBkRWS1ZlJQi6xlit0P3uS2"; // Replace with your UID

getAuth()
  .setCustomUserClaims(uid, { isAdmin: true })
  .then(() => {
    console.log("✅ Custom claim 'isAdmin' has been set!");
  })
  .catch((err) => {
    console.error("❌ Failed to set custom claim:", err);
  });
