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
      
      // Handle private key formatting - Vercel sometimes double-escapes newlines
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Remove any quotes that might be wrapping the key
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      // Replace literal \n with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Clean up any extra whitespace
      privateKey = privateKey.trim();
      
      // Ensure proper PEM format
      if (!privateKey.includes('\n')) {
        // If it's all on one line, add proper newlines
        privateKey = privateKey
          .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
          .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----')
          .replace(/(.{64})/g, '$1\n'); // Add newlines every 64 characters for the key content
      }
      
      // Validate key format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Invalid private key format. Key must include BEGIN and END markers.');
      }
      
      console.log('Private key first 50 chars:', privateKey.substring(0, 50));
      console.log('Private key includes newlines:', privateKey.includes('\n'));
      
      try {
        credential = cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        });
      } catch (keyError) {
        console.error('Error creating credential with environment variables:', keyError);
        throw new Error(`Failed to create Firebase credential: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`);
      }
    } else {
      // Fallback to JSON file (for local development)
      const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
      console.log('Service account path:', serviceAccountPath);
      
      // Check if the file exists and is not empty
      if (fs.existsSync(serviceAccountPath)) {
        const stats = fs.statSync(serviceAccountPath);
        if (stats.size > 0) {
          console.log('Using Firebase service account JSON file');
          credential = cert(serviceAccountPath);
        } else {
          console.log('Firebase service account JSON file is empty');
          throw new Error('Firebase service account file exists but is empty. Please restore the file or use environment variables.');
        }
      } else {
        console.log('Firebase service account JSON file not found');
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
