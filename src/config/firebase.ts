import admin from "firebase-admin";
import path from "path";

// json 憑證檔
const serviceAccount = require(path.resolve(__dirname, "./firebase-service-account.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

export { bucket };
