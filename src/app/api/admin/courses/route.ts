import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Course, PaginatedResponse } from '@/lib/types';

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

    // Extract session token from cookies
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

    // Verify the session token
    const decodedToken = await adminAuth.verifySessionCookie(sessionToken, true);
    const adminId = decodedToken.uid;

    // Verify user is admin
    const adminDoc = await adminDb.collection('admins').doc(adminId).get();
    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const level = searchParams.get('level');
    const isPublished = searchParams.get('isPublished');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const searchTerm = searchParams.get('search');

    // Build Firestore query
    let query = adminDb.collection('courses').orderBy(sortBy, sortOrder as 'asc' | 'desc');

    // Apply filters
    if (level) {
      query = query.where('level', '==', level);
    }
    if (isPublished !== null && isPublished !== undefined) {
      query = query.where('isPublished', '==', isPublished === 'true');
    }

    // Get total count for pagination
    const countQuery = await query.get();
    let filteredDocs = countQuery.docs;

    // Apply search filter (client-side since Firestore doesn't support full-text search)
    if (searchTerm) {
      filteredDocs = filteredDocs.filter(doc => {
        const data = doc.data();
        return (
          data.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          data.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    const total = filteredDocs.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Apply pagination
    const paginatedDocs = filteredDocs.slice(startIndex, endIndex);

    // Get quiz counts for each course
    const coursesWithQuizCounts = await Promise.all(
      paginatedDocs.map(async (doc) => {
        const courseData = doc.data();
        
        // Count quizzes for this course
        const quizzesSnapshot = await adminDb
          .collection('courses')
          .doc(doc.id)
          .collection('quizzes')
          .get();

        const course: Course = {
          id: doc.id,
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

        return {
          ...course,
          quizCount: quizzesSnapshot.size,
        };
      })
    );

    const response: PaginatedResponse<Course & { quizCount: number }> = {
      data: coursesWithQuizCounts,
      total,
      page,
      limit,
      totalPages,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

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

    // Parse request body
    const courseData = await request.json();

    // Validate required fields
    if (!courseData.title?.trim()) {
      return NextResponse.json(
        { error: 'Course title is required' },
        { status: 400 }
      );
    }

    if (!courseData.level) {
      return NextResponse.json(
        { error: 'Course level is required' },
        { status: 400 }
      );
    }

    // Create course document
    const newCourse = {
      title: courseData.title.trim(),
      description: courseData.description || '',
      level: courseData.level,
      content: courseData.content || { text: '' },
      isPublished: courseData.isPublished || false,
      order: courseData.order || 0,
      prerequisites: courseData.prerequisites || [],
      estimatedDuration: courseData.estimatedDuration || 30,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: adminId,
    };

    const docRef = await adminDb.collection('courses').add(newCourse);

    return NextResponse.json({
      success: true,
      courseId: docRef.id,
      course: { id: docRef.id, ...newCourse },
    });

  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
