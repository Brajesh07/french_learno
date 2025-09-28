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

    // Get all student documents
    const studentsSnapshot = await adminDb.collection('students').get();
    
    const updates: Array<{ docId: string; data: Record<string, unknown> }> = [];
    let migratedCount = 0;
    
    for (const doc of studentsSnapshot.docs) {
      const studentData = doc.data();
      const updateData: Record<string, unknown> = {};
      let needsUpdate = false;
      
      // Add missing hasSubscription field
      if (studentData.hasSubscription === undefined) {
        updateData.hasSubscription = false;
        needsUpdate = true;
      }
      
      // Add missing isActive field
      if (studentData.isActive === undefined) {
        updateData.isActive = true;
        needsUpdate = true;
      }
      
      // Convert legacy level format
      if (studentData.level) {
        let newLevel = studentData.level;
        if (studentData.level === 'beginner') {
          newLevel = 'A1';
          needsUpdate = true;
        } else if (studentData.level === 'intermediate') {
          newLevel = 'B1';
          needsUpdate = true;
        } else if (studentData.level === 'advanced') {
          newLevel = 'B2';
          needsUpdate = true;
        }
        
        if (needsUpdate && newLevel !== studentData.level) {
          updateData.level = newLevel;
        }
      }
      
      // Migrate progress structure
      if (typeof studentData.quizzesCompleted === 'number' && !studentData.progress) {
        updateData.progress = {
          coursesCompleted: 0,
          quizzesCompleted: studentData.quizzesCompleted || 0,
          currentLevel: (updateData.level as string) || studentData.level || 'A1',
          totalPoints: 0,
          completedCourses: [],
          badges: []
        };
        needsUpdate = true;
      }
      
      // Add timestamps if missing
      if (!studentData.createdAt) {
        updateData.createdAt = new Date();
        needsUpdate = true;
      }
      
      if (!studentData.lastUpdated) {
        updateData.lastUpdated = new Date();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        updates.push({
          docId: doc.id,
          data: updateData
        });
        migratedCount++;
      }
    }
    
    // Apply updates in batches
    const batchSize = 500;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = adminDb.batch();
      const batchUpdates = updates.slice(i, i + batchSize);
      
      for (const update of batchUpdates) {
        const docRef = adminDb.collection('students').doc(update.docId);
        batch.update(docRef, update.data);
      }
      
      await batch.commit();
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${migratedCount} student records`,
      totalStudents: studentsSnapshot.size,
      migratedStudents: migratedCount
    });
    
  } catch (error) {
    console.error('Error migrating students:', error);
    return NextResponse.json(
      { error: 'Failed to migrate students' },
      { status: 500 }
    );
  }
}