import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('=== Login API called ===');
  
  try {
    console.log('Parsing request body...');
    const { idToken } = await request.json();
    console.log('Received idToken:', idToken ? 'present' : 'missing');

    if (!idToken) {
      console.log('No idToken provided, returning 400');
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to import Firebase Admin...');
    const { adminAuth, adminDb } = await import('@/lib/firebase-admin');
    console.log('Firebase Admin imported successfully');

    console.log('Verifying ID token...');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    console.log('Token verified successfully, UID:', decodedToken.uid);
    
    const uid = decodedToken.uid;
    
    console.log('Looking up admin document for UID:', uid);
    const adminDoc = await adminDb.collection('admins').doc(uid).get();
    console.log('Admin document exists:', adminDoc.exists);

    if (!adminDoc.exists) {
      console.log('User not found in admins collection');
      return NextResponse.json(
        { error: 'User not authorized as admin' },
        { status: 403 }
      );
    }

    const adminData = adminDoc.data();
    
    if (!adminData) {
      console.log('Invalid admin data');
      return NextResponse.json(
        { error: 'Invalid admin data' },
        { status: 403 }
      );
    }
    
    // Verify email matches
    if (adminData.email !== decodedToken.email) {
      console.log('Email mismatch in admin record');
      return NextResponse.json(
        { error: 'Email mismatch in admin record' },
        { status: 403 }
      );
    }

    console.log('Admin authentication successful');

    // Update last login time
    await adminDb.collection('admins').doc(uid).update({
      lastLoginAt: new Date()
    });

    // Create session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({
      success: true,
      user: {
        id: uid,
        email: decodedToken.email,
        name: adminData.name || '',
        role: adminData.role || 'admin'
      }
    });

    // Set session cookie
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    console.log('Login successful, returning response');
    return response;

  } catch (error) {
    console.error('=== Login API error ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Full error:', error);
    
    if (error instanceof Error) {
      // Handle specific Firebase errors
      if (error.message.includes('ID token has expired')) {
        console.log('Token expired error');
        return NextResponse.json(
          { error: 'Session expired. Please login again.' },
          { status: 401 }
        );
      }
      
      if (error.message.includes('ID token is invalid')) {
        console.log('Invalid token error');
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }

      if (error.message.includes('Firebase')) {
        console.log('Firebase configuration error');
        return NextResponse.json(
          { error: 'Authentication service configuration error' },
          { status: 500 }
        );
      }
    }

    console.log('Returning generic error');
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
