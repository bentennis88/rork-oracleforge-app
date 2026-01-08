import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth'; // ← Fixed line
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBhx2eHtNdylUKnSekDNhTcvL_WQnJ_sfU",
  authDomain: "oracleforge.firebaseapp.com",
  projectId: "oracleforge",
  storageBucket: "oracleforge.firebasestorage.app",
  messagingSenderId: "206306883902",
  appId: "1:206306883902:android:1878b63e74585e92abd46f"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { auth, db };
