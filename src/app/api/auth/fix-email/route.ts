import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('Getting admin user details...');
    
    // Get the admin user by email to see what's in Firebase Auth
    const authUser = await adminAuth.getUserByEmail('admin@frenchlearno.co');
    console.log('Firebase Auth user:', {
      uid: authUser.uid,
      email: authUser.email,
      emailVerified: authUser.emailVerified
    });
    
    // Get admin document from Firestore
    const adminDoc = await adminDb.collection('admins').doc(authUser.uid).get();
    const adminData = adminDoc.data();
    
    console.log('Firestore admin document:', adminData);
    
    // Fix the email mismatch by updating the document
    if (adminData && adminData.email !== authUser.email) {
      console.log('Fixing email mismatch...');
      await adminDb.collection('admins').doc(authUser.uid).update({
        email: authUser.email,
        updatedAt: new Date()
      });
      console.log('Email updated successfully');
    }
    
    return NextResponse.json({
      success: true,
      authUser: {
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified
      },
      firestoreData: adminData,
      fixed: adminData?.email !== authUser.email
    });
    
  } catch (error) {
    console.error('Error getting admin details:', error);
    return NextResponse.json(
      { error: 'Failed to get admin details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
