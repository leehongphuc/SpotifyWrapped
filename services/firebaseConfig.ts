import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyBG9QgCQYvJKr_eFwPBaLwdXwD7EIL1Yno",
  projectId: "nghenhac-53b05",
  storageBucket: "nghenhac-53b05.firebasestorage.app",
  messagingSenderId: "738199759651",
  appId: "1:738199759651:android:d061229fd8dd08ddbc7a96",
  databaseURL: "https://nghenhac-53b05-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
