import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(
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
    
    const hasSubscription = studentData?.hasSubscription ?? false;
    const isActive = studentData?.isActive ?? true;

    if (!isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Get submission data
    const { answers, timeSpent } = await request.json();

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid submission data' },
        { status: 400 }
      );
    }

    // Define types for submission
    interface SubmissionAnswer {
      questionId: string;
      selectedAnswerId: string;
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
    
    // Check subscription requirement
    const requiresSubscription = ['B1', 'B2'].includes(quizData.level);
    
    if (requiresSubscription && !hasSubscription) {
      return NextResponse.json(
        { error: 'Subscription required to submit quiz' },
        { status: 402 }
      );
    }

    // Calculate score
    const questions = quizData.questions || [];
    let totalPoints = 0;
    let earnedPoints = 0;
    const processedAnswers = [];

    for (const question of questions) {
      totalPoints += question.points || 1;
      
      const studentAnswer = (answers as SubmissionAnswer[]).find((a) => a.questionId === question.id);
      
      if (studentAnswer) {
        const isCorrect = studentAnswer.selectedAnswerId === question.correctAnswerId;
        const pointsEarned = isCorrect ? (question.points || 1) : 0;
        earnedPoints += pointsEarned;
        
        processedAnswers.push({
          questionId: question.id,
          selectedAnswerId: studentAnswer.selectedAnswerId,
          isCorrect,
          pointsEarned
        });
      }
    }

    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = percentage >= quizData.passingScore;

    // Save quiz submission
    const submissionData = {
      quizId,
      courseId,
      studentId,
      answers: processedAnswers,
      score: earnedPoints,
      totalPoints,
      percentage,
      passed,
      submittedAt: new Date(),
      timeSpent: timeSpent || 0
    };

    const submissionRef = await adminDb.collection('quiz_submissions').add(submissionData);

    // Update student progress - handle both old and new data structures
    const updateData: Record<string, unknown> = {
      lastUpdated: new Date()
    };
    
    if (studentData) {
      // Handle legacy structure where quizzesCompleted is at root level
      if (typeof studentData.quizzesCompleted === 'number') {
        updateData.quizzesCompleted = studentData.quizzesCompleted + 1;
      } else if (studentData.progress?.quizzesCompleted) {
        // Handle new structure with progress object
        const currentProgress = studentData.progress || {};
        updateData.progress = {
          ...currentProgress,
          quizzesCompleted: (currentProgress.quizzesCompleted || 0) + 1,
          totalPoints: (currentProgress.totalPoints || 0) + earnedPoints
        };
      } else {
        // Initialize progress structure
        updateData.quizzesCompleted = 1;
      }
      
      await adminDb.collection('students').doc(studentId).update(updateData);
    }

    return NextResponse.json({
      submissionId: submissionRef.id,
      results: {
        score: earnedPoints,
        totalPoints,
        percentage,
        passed,
        answers: processedAnswers
      },
      message: passed ? 'Congratulations! You passed the quiz.' : 'Keep practicing! You can retake the quiz.'
    });

  } catch (error) {
    console.error('Error submitting quiz:', error);
    
    if (error instanceof Error && error.message.includes('Firebase ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    );
  }
}