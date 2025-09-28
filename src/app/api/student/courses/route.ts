import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Course } from '@/lib/types';

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

    // Get student subscription status
    const studentDoc = await adminDb.collection('students').doc(studentId).get();
    const studentData = studentDoc.data();
    
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
    const level = searchParams.get('level');
    
    // Get published courses
    let coursesQuery = adminDb.collection('courses')
      .where('isPublished', '==', true)
      .orderBy('order', 'asc');
    
    if (level) {
      coursesQuery = coursesQuery.where('level', '==', level);
    }

    const coursesSnapshot = await coursesQuery.get();
    
    const courses: (Course & { requiresSubscription: boolean; canAccess: boolean; quizCount: number })[] = [];
    
    for (const doc of coursesSnapshot.docs) {
      const courseData = doc.data();
      
      // Count available quizzes in this course
      const quizzesSnapshot = await adminDb
        .collection('courses')
        .doc(doc.id)
        .collection('quizzes')
        .where('isPublished', '==', true)
        .get();
      
      // Determine access based on subscription
      const requiresSubscription = ['B1', 'B2'].includes(courseData.level);
      const canAccess = !requiresSubscription || hasSubscription;
      
      const course: Course & { requiresSubscription: boolean; canAccess: boolean; quizCount: number } = {
        id: doc.id,
        title: courseData.title,
        description: courseData.description,
        level: courseData.level,
        content: canAccess ? courseData.content : { text: 'Premium content requires subscription.' },
        isPublished: courseData.isPublished,
        order: courseData.order,
        prerequisites: courseData.prerequisites || [],
        estimatedDuration: courseData.estimatedDuration,
        createdAt: courseData.createdAt?.toDate() || new Date(),
        updatedAt: courseData.updatedAt?.toDate() || new Date(),
        createdBy: courseData.createdBy,
        requiresSubscription,
        canAccess,
        quizCount: quizzesSnapshot.size
      };
      
      courses.push(course);
    }

    return NextResponse.json({
      courses,
      studentStatus: {
        hasSubscription,
        isActive,
        canAccessPremium: hasSubscription
      }
    });

  } catch (error) {
    console.error('Error fetching courses for student:', error);
    
    if (error instanceof Error && error.message.includes('Firebase ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}