import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBhx2eHtNdylUKnSekDNhTcvL_WQnJ_sfU",
  authDomain: "oracleforge.firebaseapp.com",
  projectId: "oracleforge",
  storageBucket: "oracleforge.firebasestorage.app",
  messagingSenderId: "206306883902",
  appId: "1:206306883902:android:1878b63e74585e92abd46f"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { auth, db };
