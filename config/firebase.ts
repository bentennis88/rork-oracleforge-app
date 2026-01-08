import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBhx2eHtNdylUKnSekDNhTcvL_WQnJ_sfU",
  authDomain: "oracleforge.firebaseapp.com",
  projectId: "oracleforge",
  storageBucket: "oracleforge.firebasestorage.app",
  messagingSenderId: "206306883902",
  appId: "1:206306883902:android:1878b63e74585e92abd46f"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getReactNativePersistence } = require('firebase/auth');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };
