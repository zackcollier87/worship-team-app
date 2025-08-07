import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration is pulled from environment variables. When
// deploying on Vercel, these should be configured in the project
// settings (NEXT_PUBLIC_FIREBASE_... variables).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once in the client. Next.js hot reloading
// can cause initializeApp to be called multiple times, so we check
// for existing apps before initializing.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Export Firestore and Storage instances for use throughout the app.
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
