import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const quizId = id;

    // Get quiz from global quizzes collection
    const quizDoc = await adminDb.collection('quizzes').doc(quizId).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();
    if (!quizData) {
      return NextResponse.json(
        { error: 'Quiz data not found' },
        { status: 404 }
      );
    }

    // Transform the quiz data
    const quiz = {
      id: quizDoc.id,
      title: quizData.title,
      description: quizData.description,
      courseId: quizData.courseId,
      level: quizData.level,
      questions: quizData.questions || [],
      timeLimit: quizData.timeLimit,
      passingScore: quizData.passingScore,
      isActive: quizData.isActive,
      isPublished: quizData.isPublished,
      order: quizData.order,
      createdAt: quizData.createdAt?.toDate() || new Date(),
      updatedAt: quizData.updatedAt?.toDate() || new Date(),
      createdBy: quizData.createdBy,
    };

    return NextResponse.json(quiz);

  } catch (error) {
    console.error('Error fetching quiz:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const quizId = id;
    const updateData = await request.json();

    // Check if quiz exists
    const quizDoc = await adminDb.collection('quizzes').doc(quizId).get();
    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    // Update the quiz
    const updatedQuizData = {
      ...updateData,
      updatedAt: new Date(),
    };

    await adminDb.collection('quizzes').doc(quizId).update(updatedQuizData);

    // If the quiz belongs to a course, also update it in the course's subcollection
    const quizData = quizDoc.data();
    if (quizData?.courseId) {
      try {
        await adminDb
          .collection('courses')
          .doc(quizData.courseId)
          .collection('quizzes')
          .doc(quizId)
          .update(updatedQuizData);
      } catch (error) {
        console.error('Error updating quiz in course subcollection:', error);
        // Continue even if subcollection update fails
      }
    }

    return NextResponse.json({
      message: 'Quiz updated successfully',
      id: quizId,
    });

  } catch (error) {
    console.error('Error updating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const quizId = id;

    // Check if quiz exists and get course info
    const quizDoc = await adminDb.collection('quizzes').doc(quizId).get();
    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();

    // Delete from global quizzes collection
    await adminDb.collection('quizzes').doc(quizId).delete();

    // If the quiz belongs to a course, also delete it from the course's subcollection
    if (quizData?.courseId) {
      try {
        await adminDb
          .collection('courses')
          .doc(quizData.courseId)
          .collection('quizzes')
          .doc(quizId)
          .delete();
      } catch (error) {
        console.error('Error deleting quiz from course subcollection:', error);
        // Continue even if subcollection delete fails
      }
    }

    return NextResponse.json({
      message: 'Quiz deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    );
  }
}
