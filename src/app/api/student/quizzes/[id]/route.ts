import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Quiz } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify student authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const studentId = decodedToken.uid;

    // Get student subscription status
    const studentDoc = await adminDb.collection('students').doc(studentId).get();
    const studentData = studentDoc.data();
    
    // Handle both old and new data structures
    const hasSubscription = studentData?.hasSubscription ?? false;
    const isActive = studentData?.isActive ?? true;
    
    // If student document doesn't exist, create it with default values
    if (!studentDoc.exists) {
      await adminDb.collection('students').doc(studentId).set({
        email: decodedToken.email,
        name: decodedToken.name || 'Student',
        level: 'A1',
        hasSubscription: false,
        isActive: true,
        quizzesCompleted: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    }

    if (!isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Find quiz across all courses
    const quizId = id;
    let quizDoc = null;
    let courseId = '';
    
    // Search for quiz in all courses
    const coursesSnapshot = await adminDb.collection('courses').get();
    
    for (const courseDoc of coursesSnapshot.docs) {
      const quizRef = await adminDb
        .collection('courses')
        .doc(courseDoc.id)
        .collection('quizzes')
        .doc(quizId)
        .get();
      
      if (quizRef.exists) {
        quizDoc = quizRef;
        courseId = courseDoc.id;
        break;
      }
    }
    
    if (!quizDoc || !quizDoc.exists) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data()!;
    
    // Check if quiz is published
    if (!quizData.isPublished) {
      return NextResponse.json(
        { error: 'Quiz is not available' },
        { status: 403 }
      );
    }
    
    // Check subscription requirement
    const requiresSubscription = ['B1', 'B2'].includes(quizData.level);
    
    if (requiresSubscription && !hasSubscription) {
      return NextResponse.json(
        { 
          error: 'Subscription required',
          message: 'This quiz requires a premium subscription to access.',
          requiredSubscription: true,
          quizLevel: quizData.level
        },
        { status: 402 } // Payment Required
      );
    }

    const quiz: Quiz = {
      id: quizDoc.id,
      title: quizData.title,
      description: quizData.description,
      courseId: courseId,
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

    return NextResponse.json({
      quiz,
      accessGranted: true,
      studentStatus: {
        hasSubscription,
        isActive
      }
    });

  } catch (error) {
    console.error('Error fetching quiz for student:', error);
    
    if (error instanceof Error && error.message.includes('Firebase ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}