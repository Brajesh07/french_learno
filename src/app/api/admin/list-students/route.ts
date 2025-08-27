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

export async function GET(request: NextRequest) {
  // Auth check
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // List all users (up to 1000 at a time)
    const allUsers: import('firebase-admin/auth').UserRecord[] = [];
    let nextPageToken: string | undefined = undefined;
    do {
      const result = await adminAuth.listUsers(1000, nextPageToken);
      allUsers.push(...result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    // Filter out admins
    const students: { uid: string; email: string | null; creationTime: string | null; lastSignInTime: string | null }[] = [];
    for (const user of allUsers) {
      const isAdminUser = await isAdmin(user.uid);
      if (!isAdminUser) {
        students.push({
          uid: user.uid,
          email: user.email || null,
          creationTime: user.metadata.creationTime || null,
          lastSignInTime: user.metadata.lastSignInTime || null,
        });
      }
    }

    return NextResponse.json({ students });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list students', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
