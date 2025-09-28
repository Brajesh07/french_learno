import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// Helper to check if a user is an admin
async function isAdmin(uid: string): Promise<boolean> {
  const doc = await adminDb.collection('admins').doc(uid).get();
  return doc.exists;
}

// Helper to verify the ID token and admin status
async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.replace('Bearer ', '');
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    if (await isAdmin(uid)) return uid;
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  // Auth check
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid } = await params;
    
    // Get user from Firebase Auth
    const user = await adminAuth.getUser(uid);
    
    // Check if user is admin (shouldn't happen but good to verify)
    const userIsAdmin = await isAdmin(uid);
    if (userIsAdmin) {
      return NextResponse.json({ error: 'Cannot view admin user as student' }, { status: 403 });
    }

    // Get additional student data from Firestore if it exists
    const studentDoc = await adminDb.collection('students').doc(uid).get();
    const studentData = studentDoc.exists ? studentDoc.data() : {};

    return NextResponse.json({
      student: {
        uid: user.uid,
        email: user.email || null,
        creationTime: user.metadata.creationTime || null,
        lastSignInTime: user.metadata.lastSignInTime || null,
        isActive: studentData?.isActive ?? true,
        hasSubscription: studentData?.hasSubscription ?? false,
      }
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    if (error instanceof Error && error.message.includes('no user record')) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  // Auth check
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid } = await params;
    const body = await request.json();
    const { isActive, hasSubscription } = body;

    // Validate that user exists in Firebase Auth
    const user = await adminAuth.getUser(uid);
    
    // Check if user is admin
    const userIsAdmin = await isAdmin(uid);
    if (userIsAdmin) {
      return NextResponse.json({ error: 'Cannot modify admin user as student' }, { status: 403 });
    }

    // Update student data in Firestore
    const updateData: { [key: string]: Date | boolean | string } = {
      updatedAt: new Date(),
    };

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    if (typeof hasSubscription === 'boolean') {
      updateData.hasSubscription = hasSubscription;
    }

    // Create or update the student document
    await adminDb.collection('students').doc(uid).set(updateData, { merge: true });

    // Get updated student data
    const studentDoc = await adminDb.collection('students').doc(uid).get();
    const studentData = studentDoc.data() || {};

    return NextResponse.json({
      student: {
        uid: user.uid,
        email: user.email || null,
        creationTime: user.metadata.creationTime || null,
        lastSignInTime: user.metadata.lastSignInTime || null,
        isActive: studentData.isActive ?? true,
        hasSubscription: studentData.hasSubscription ?? false,
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    if (error instanceof Error && error.message.includes('no user record')) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
