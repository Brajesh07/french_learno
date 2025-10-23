import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('cookie');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader
      .split(';')
      .find(cookie => cookie.trim().startsWith('__session='))
      ?.split('=')[1];

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token found' },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionToken, true);
    const adminId = decodedToken.uid;

    const adminDoc = await adminDb.collection('admins').doc(adminId).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { quizId, oldCourseId, newCourseId } = await request.json();

    if (!quizId || !oldCourseId || !newCourseId) {
      return NextResponse.json(
        { error: 'Missing required fields: quizId, oldCourseId, newCourseId' },
        { status: 400 }
      );
    }

    // Get the quiz from global collection
    const globalQuizDoc = await adminDb.collection('quizzes').doc(quizId).get();
    
    if (!globalQuizDoc.exists) {
      return NextResponse.json(
        { error: 'Quiz not found in global collection' },
        { status: 404 }
      );
    }

    const quizData = globalQuizDoc.data()!;

    // Update the courseId in the quiz data
    const updatedQuizData = {
      ...quizData,
      courseId: newCourseId,
      updatedAt: new Date()
    };

    // Batch write to move the quiz
    const batch = adminDb.batch();

    // 1. Update global quiz with new courseId
    batch.update(globalQuizDoc.ref, { courseId: newCourseId, updatedAt: new Date() });

    // 2. Remove from old course subcollection (if it exists)
    if (oldCourseId) {
      const oldQuizRef = adminDb
        .collection('courses')
        .doc(oldCourseId)
        .collection('quizzes')
        .doc(quizId);
      batch.delete(oldQuizRef);
    }

    // 3. Add to new course subcollection
    const newQuizRef = adminDb
      .collection('courses')
      .doc(newCourseId)
      .collection('quizzes')
      .doc(quizId);
    batch.set(newQuizRef, updatedQuizData);

    // Execute the batch
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Quiz "${quizData.title}" migrated from ${oldCourseId} to ${newCourseId}`,
      quiz: {
        id: quizId,
        title: quizData.title,
        oldCourseId,
        newCourseId
      }
    });

  } catch (error) {
    console.error('Error migrating quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}