import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

let app: App;

console.log('Initializing Firebase Admin...');

try {
  // Check if any Firebase Admin apps are already initialized
  const apps = getApps();
  console.log('Existing Firebase apps:', apps.length);
  
  if (apps.length === 0) {
    console.log('Initializing new Firebase Admin app...');
    
    // Use the JSON file directly
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    console.log('Service account path:', serviceAccountPath);
    
    // Initialize Firebase Admin SDK
    app = initializeApp({
      credential: cert(serviceAccountPath),
    });
    console.log('Firebase Admin app initialized successfully');
  } else {
    console.log('Using existing Firebase Admin app');
    // Use existing app
    app = apps[0];
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  throw error;
}

// Export Firebase Admin services
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export default app;
