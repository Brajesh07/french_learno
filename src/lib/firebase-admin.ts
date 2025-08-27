import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

let app: App;

console.log('Initializing Firebase Admin...');

try {
  // Check if any Firebase Admin apps are already initialized
  const apps = getApps();
  console.log('Existing Firebase apps:', apps.length);
  
  if (apps.length === 0) {
    console.log('Initializing new Firebase Admin app...');
    
    let credential;
    
    // Try to use environment variables first (for production deployment)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Using Firebase environment variables for credential');
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle escaped newlines
      });
    } else {
      // Fallback to JSON file (for local development)
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      console.log('Service account path:', serviceAccountPath);
      
      // Check if the file exists
      if (fs.existsSync(serviceAccountPath)) {
        console.log('Using Firebase service account JSON file');
        credential = cert(serviceAccountPath);
      } else {
        throw new Error('Firebase configuration not found. Please ensure either service account JSON file exists or environment variables are set.');
      }
    }
    
    // Initialize Firebase Admin SDK
    app = initializeApp({
      credential: credential,
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
