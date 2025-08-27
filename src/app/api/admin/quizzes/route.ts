import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { QuizFormData, Quiz, QuizAnswer } from '@/lib/types';
import { generateId } from '@/lib/utils';

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

    // Parse the request body
    const formData: QuizFormData = await request.json();

    // Validate required fields
    if (!formData.title?.trim()) {
      return NextResponse.json(
        { error: 'Quiz title is required' },
        { status: 400 }
      );
    }

    if (!formData.courseId?.trim()) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!formData.questions || formData.questions.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Validate questions
    for (const question of formData.questions) {
      if (!question.question?.trim()) {
        return NextResponse.json(
          { error: 'All questions must have content' },
          { status: 400 }
        );
      }

      if (!question.correctAnswerId) {
        return NextResponse.json(
          { error: 'All questions must have a correct answer selected' },
          { status: 400 }
        );
      }

      if (question.answers.some(answer => !answer.text?.trim())) {
        return NextResponse.json(
          { error: 'All answer options must be filled' },
          { status: 400 }
        );
      }
    }

    // Create the quiz document
    const quizId = generateId();
    const now = new Date();
    
    const quiz: Quiz = {
      id: quizId,
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      courseId: formData.courseId.trim(),
      level: 'A1', // Default level, could be determined by course
      questions: formData.questions.map(q => {
        const answers: QuizAnswer[] = q.answers.map(a => ({
          id: a.id,
          text: a.text.trim(),
          isCorrect: a.id === q.correctAnswerId
        }));

        return {
          id: q.id,
          type: 'multiple-choice' as const,
          question: q.question,
          answers,
          correctAnswer: q.answers.find(a => a.id === q.correctAnswerId)?.text || '',
          correctAnswerId: q.correctAnswerId,
          points: q.points || 1,
          explanation: q.explanation?.trim() || ''
        };
      }),
      timeLimit: formData.timeLimit || 30,
      passingScore: formData.passingScore || 70,
      isActive: true,
      isPublished: true, // Auto-publish for now
      order: 0, // Will be set based on existing quizzes
      createdAt: now,
      updatedAt: now,
      createdBy: adminId
    };

    // Save to Firestore under courses/{courseId}/quizzes/{quizId}
    const quizRef = adminDb
      .collection('courses')
      .doc(formData.courseId)
      .collection('quizzes')
      .doc(quizId);

    await quizRef.set(quiz);

    // Also save to a global quizzes collection for easier management
    const globalQuizRef = adminDb.collection('quizzes').doc(quizId);
    await globalQuizRef.set(quiz);

    return NextResponse.json({
      success: true,
      data: { quizId, quiz },
      message: 'Quiz created successfully'
    });

  } catch (error) {
    console.error('Error creating quiz:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Parse query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const level = searchParams.get('level');
    const isPublished = searchParams.get('isPublished');
    const courseId = searchParams.get('courseId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const searchTerm = searchParams.get('search');

    // Build Firestore query from global quizzes collection
    let query = adminDb.collection('quizzes').orderBy(sortBy, sortOrder as 'asc' | 'desc');

    // Apply filters
    if (level) {
      query = query.where('level', '==', level);
    }
    if (isPublished !== null && isPublished !== undefined) {
      query = query.where('isPublished', '==', isPublished === 'true');
    }
    if (courseId) {
      query = query.where('courseId', '==', courseId);
    }

    // Get all matching documents
    const snapshot = await query.get();
    let filteredDocs = snapshot.docs;

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

    // Transform documents to Quiz objects
    const quizzes = paginatedDocs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        courseId: data.courseId,
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

    return NextResponse.json({
      data: quizzes,
      total,
      page,
      limit,
      totalPages,
    });

  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
