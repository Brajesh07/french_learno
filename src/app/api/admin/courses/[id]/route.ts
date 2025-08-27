import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Course, Quiz } from '@/lib/types';

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

    const courseId = id;

    // Get course document
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    const courseData = courseDoc.data()!;

    // Get quizzes for this course
    const quizzesSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('quizzes')
      .orderBy('order', 'asc')
      .get();

    const quizzes: Quiz[] = quizzesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        courseId: courseId,
        level: data.level,
        questions: data.questions || [],
        timeLimit: data.timeLimit,
        passingScore: data.passingScore,
        isActive: data.isActive,
        isPublished: data.isPublished,
        order: data.order,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
      };
    });

    const course: Course = {
      id: courseDoc.id,
      title: courseData.title,
      description: courseData.description,
      level: courseData.level,
      content: courseData.content,
      isPublished: courseData.isPublished,
      order: courseData.order,
      prerequisites: courseData.prerequisites || [],
      estimatedDuration: courseData.estimatedDuration,
      createdAt: courseData.createdAt?.toDate() || new Date(),
      updatedAt: courseData.updatedAt?.toDate() || new Date(),
      createdBy: courseData.createdBy,
    };

    return NextResponse.json({
      course,
      quizzes,
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
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

    const courseId = id;
    const updateData = await request.json();

    // Check if course exists
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Update course
    const updatedCourse = {
      ...updateData,
      updatedAt: new Date(),
    };

    await adminDb.collection('courses').doc(courseId).update(updatedCourse);

    return NextResponse.json({
      success: true,
      message: 'Course updated successfully',
    });

  } catch (error) {
    console.error('Error updating course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
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

    const courseId = id;

    // Check if course exists
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Delete all quizzes in this course first
    const quizzesSnapshot = await adminDb
      .collection('courses')
      .doc(courseId)
      .collection('quizzes')
      .get();

    const batch = adminDb.batch();
    quizzesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the course
    batch.delete(adminDb.collection('courses').doc(courseId));

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
