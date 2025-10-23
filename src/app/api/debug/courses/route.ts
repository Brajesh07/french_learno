import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
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

    // Get all courses with their quiz counts
    const coursesSnapshot = await adminDb.collection('courses').get();
    
    const coursesData = await Promise.all(
      coursesSnapshot.docs.map(async (courseDoc) => {
        const courseData = courseDoc.data();
        
        // Get quiz count for this course
        const quizzesSnapshot = await adminDb
          .collection('courses')
          .doc(courseDoc.id)
          .collection('quizzes')
          .get();
        
        return {
          id: courseDoc.id,
          title: courseData.title || 'Untitled',
          description: courseData.description || '',
          level: courseData.level || 'A1',
          quizCount: quizzesSnapshot.size,
          createdAt: courseData.createdAt?.toDate()?.toISOString() || null,
          isPublished: courseData.isPublished || false
        };
      })
    );

    // Also get global quizzes
    const globalQuizzesSnapshot = await adminDb.collection('quizzes').get();
    const globalQuizzes = globalQuizzesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Quiz',
        courseId: data.courseId || 'No courseId',
        createdAt: data.createdAt?.toDate()?.toISOString() || null
      };
    });

    return NextResponse.json({
      success: true,
      courses: coursesData,
      globalQuizzes: globalQuizzes,
      summary: {
        totalCourses: coursesData.length,
        totalGlobalQuizzes: globalQuizzes.length,
        coursesWithQuizzes: coursesData.filter(c => c.quizCount > 0).length
      }
    });

  } catch (error) {
    console.error('Error debugging courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}