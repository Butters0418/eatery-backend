import admin from "firebase-admin";
import path from "path";

let serviceAccount: admin.ServiceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Render 等環境使用環境變數載入 service account
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as admin.ServiceAccount;
  } else {
    // 本地開發使用檔案
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    serviceAccount = require(path.resolve(__dirname, "./firebase-service-account.json"));
  }
} catch (error) {
  throw new Error("Firebase service account 初始化失敗，請確認設定");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

export { bucket };
