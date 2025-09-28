import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    console.log('Checking admin document details...');
    
    // Get the admin user by UID
    const uid = '4h610A65C0WZceaJEYk16O5Nhzo1';
    
    // Get user from Firebase Auth
    const authUser = await adminAuth.getUser(uid);
    console.log('Auth user email:', authUser.email);
    
    // Get admin document from Firestore
    const adminDoc = await adminDb.collection('admins').doc(uid).get();
    const adminData = adminDoc.data();
    
    console.log('Admin document data:', adminData);
    console.log('Admin document email:', adminData?.email);
    console.log('Auth email:', authUser.email);
    console.log('Emails match:', adminData?.email === authUser.email);
    
    return NextResponse.json({
      success: true,
      authUser: {
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified
      },
      adminDoc: adminData,
      emailMatch: adminData?.email === authUser.email
    });
    
  } catch (error) {
    console.error('Error checking admin:', error);
    return NextResponse.json(
      { error: 'Failed to check admin', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
