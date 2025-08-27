import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('Setting up admin user...');
    
    // Find the admin user by email
    const user = await adminAuth.getUserByEmail('admin@frenchlearno.co');
    console.log('Found admin user:', user.uid, user.email);
    
    // Check if admin document exists in Firestore
    const adminDoc = await adminDb.collection('admins').doc(user.uid).get();
    
    if (!adminDoc.exists) {
      // Create admin document
      await adminDb.collection('admins').doc(user.uid).set({
        email: user.email,
        role: 'admin',
        name: 'Admin User',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created admin document in Firestore');
    } else {
      console.log('Admin document already exists');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin user setup complete',
      user: {
        uid: user.uid,
        email: user.email,
        adminDocExists: adminDoc.exists
      }
    });
    
  } catch (error) {
    console.error('Error setting up admin user:', error);
    return NextResponse.json(
      { error: 'Failed to setup admin user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
