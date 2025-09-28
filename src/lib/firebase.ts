import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate required configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  throw new Error('Missing required Firebase configuration. Please check your environment variables.');
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Note: Emulator connections removed to use production Firebase services
// If you want to use emulators, uncomment and ensure emulators are running:
/*
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  if (!auth.emulatorConfig) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
    } catch {
      console.log('Auth emulator already connected');
    }
  }
  
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch {
    console.log('Firestore emulator already connected');
  }
  
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch {
    console.log('Storage emulator already connected');
  }
}
*/

export default app;
