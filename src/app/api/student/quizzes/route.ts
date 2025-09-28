import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Quiz } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
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

    // Get student subscription status from Firestore
    const studentDoc = await adminDb.collection('students').doc(studentId).get();
    const studentData = studentDoc.data();
    
    // Handle both old and new data structures
    const hasSubscription = studentData?.hasSubscription ?? false;
    const isActive = studentData?.isActive ?? true;

    if (!isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const level = searchParams.get('level');
    
    // Get all published quizzes from all courses
    const coursesSnapshot = await adminDb.collection('courses').get();
    const quizzes: (Quiz & { requiresSubscription: boolean; canAccess: boolean })[] = [];
    
    for (const courseDoc of coursesSnapshot.docs) {
      let quizzesQuery = adminDb
        .collection('courses')
        .doc(courseDoc.id)
        .collection('quizzes')
        .where('isPublished', '==', true);
      
      if (level) {
        quizzesQuery = quizzesQuery.where('level', '==', level);
      }

      const quizzesSnapshot = await quizzesQuery.get();
      
      for (const quizDoc of quizzesSnapshot.docs) {
        const quizData = quizDoc.data();
        
        // Skip if courseId filter is applied and doesn't match
        if (courseId && courseDoc.id !== courseId) {
          continue;
        }
        
        // Determine if quiz requires subscription (B1, B2 levels require subscription)
        const requiresSubscription = ['B1', 'B2'].includes(quizData.level);
        const canAccess = !requiresSubscription || hasSubscription;
        
        const quiz: Quiz & { requiresSubscription: boolean; canAccess: boolean } = {
          id: quizDoc.id,
          title: quizData.title,
          description: quizData.description,
          courseId: courseDoc.id,
          level: quizData.level,
          questions: canAccess ? quizData.questions || [] : [], // Hide questions if no access
          timeLimit: quizData.timeLimit,
          passingScore: quizData.passingScore,
          isActive: quizData.isActive,
          isPublished: quizData.isPublished,
          order: quizData.order,
          createdAt: quizData.createdAt?.toDate() || new Date(),
          updatedAt: quizData.updatedAt?.toDate() || new Date(),
          createdBy: quizData.createdBy,
          requiresSubscription,
          canAccess
        };
        
        quizzes.push(quiz);
      }
    }

    // Sort by order and title
    quizzes.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.title.localeCompare(b.title);
    });

    return NextResponse.json({
      quizzes,
      studentStatus: {
        hasSubscription,
        isActive,
        canAccessPremium: hasSubscription
      }
    });

  } catch (error) {
    console.error('Error fetching quizzes for student:', error);
    
    if (error instanceof Error && error.message.includes('Firebase ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}