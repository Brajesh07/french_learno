import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST() {
  try {
    console.log('Fixing admin email mismatch...');
    
    // Get the admin user by UID
    const uid = '4h610A65C0WZceaJEYk16O5Nhzo1';
    
    // Get user from Firebase Auth
    const authUser = await adminAuth.getUser(uid);
    console.log('Auth user email:', authUser.email);
    
    // Update admin document with correct email
    await adminDb.collection('admins').doc(uid).update({
      email: authUser.email,
      updatedAt: new Date()
    });
    
    console.log('Admin document updated with correct email:', authUser.email);
    
    // Verify the update
    const updatedDoc = await adminDb.collection('admins').doc(uid).get();
    const updatedData = updatedDoc.data();
    
    return NextResponse.json({
      success: true,
      message: 'Admin email fixed',
      oldEmail: updatedData?.email,
      newEmail: authUser.email,
      fixed: true
    });
    
  } catch (error) {
    console.error('Error fixing admin email:', error);
    return NextResponse.json(
      { error: 'Failed to fix admin email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
