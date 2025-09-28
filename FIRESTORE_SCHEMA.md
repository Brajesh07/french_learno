# French Learning App - Firestore Schema Documentation

## Overview

This document outlines the Firestore database schema for the French Learning Admin Dashboard, specifically focusing on the course management system.

## Collections Structure

### 1. Courses Collection: `courses`

**Path**: `/courses/{courseId}`

**Document Structure**:

```typescript
{
  id: string,              // Auto-generated document ID
  title: string,           // Course title (e.g., "Basic French Greetings")
  description: string,     // Course description (optional)
  level: "A1" | "B1" | "B2", // French proficiency level
  content: {
    text: string,          // Main course content (supports markdown formatting)
    audioUrl?: string,     // URL to audio file (optional)
    videoUrl?: string,     // URL to video file (optional)
    imageUrl?: string,     // URL to course image (optional)
    exercises?: Exercise[] // In-course exercises (optional)
  },
  isPublished: boolean,    // Whether course is live for students
  order: number,           // Display order in course list
  prerequisites: string[], // Array of prerequisite course IDs
  estimatedDuration: number, // Estimated completion time in minutes
  createdAt: Timestamp,    // Course creation date
  updatedAt: Timestamp,    // Last modification date
  createdBy: string        // Admin user ID who created the course
}
```

**Example Document**:

```json
{
  "id": "course_basic_greetings_001",
  "title": "French Greetings and Introductions",
  "description": "Learn essential French greetings and how to introduce yourself",
  "level": "A1",
  "content": {
    "text": "# French Greetings\n\n**Bonjour** - Hello (formal)\n**Salut** - Hi (informal)\n\nPractice these greetings with the audio files below.",
    "audioUrl": "https://storage.googleapis.com/french-app/audio/greetings.mp3",
    "imageUrl": "https://storage.googleapis.com/french-app/images/greetings.jpg"
  },
  "isPublished": true,
  "order": 1,
  "prerequisites": [],
  "estimatedDuration": 30,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "createdBy": "admin_user_123"
}
```

### 2. Course Quizzes Subcollection: `courses/{courseId}/quizzes`

**Path**: `/courses/{courseId}/quizzes/{quizId}`

**Document Structure**:

```typescript
{
  id: string,              // Auto-generated document ID
  title: string,           // Quiz title
  description?: string,    // Quiz description (optional)
  courseId: string,        // Parent course ID
  level: "A1" | "B1" | "B2", // French proficiency level
  questions: QuizQuestion[], // Array of quiz questions
  timeLimit?: number,      // Time limit in minutes (optional)
  passingScore: number,    // Percentage needed to pass (0-100)
  isActive: boolean,       // Whether quiz is accepting submissions
  isPublished: boolean,    // Whether quiz is visible to students
  order: number,           // Order within the course
  createdAt: Timestamp,    // Quiz creation date
  updatedAt: Timestamp,    // Last modification date
  createdBy: string        // Admin user ID who created the quiz
}
```

**Quiz Question Structure**:

```typescript
{
  id: string,              // Unique question ID
  type: "multiple-choice" | "text" | "audio", // Question type
  question: string,        // Question text (supports basic markdown)
  answers?: QuizAnswer[],  // Multiple choice answers
  correctAnswerId?: string, // ID of correct answer (for multiple choice)
  points: number,          // Points awarded for correct answer
  explanation?: string,    // Explanation shown after answering
  audioUrl?: string,       // Audio file for listening questions
  imageUrl?: string        // Image for visual questions
}
```

**Quiz Answer Structure**:

```typescript
{
  id: string,              // Unique answer ID
  text: string             // Answer text
}
```

**Example Quiz Document**:

```json
{
  "id": "quiz_greetings_001",
  "title": "Greetings Quiz",
  "description": "Test your knowledge of French greetings",
  "courseId": "course_basic_greetings_001",
  "level": "A1",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What is the formal way to say 'Hello' in French?",
      "answers": [
        { "id": "a1", "text": "Salut" },
        { "id": "a2", "text": "Bonjour" },
        { "id": "a3", "text": "Bonsoir" },
        { "id": "a4", "text": "Au revoir" }
      ],
      "correctAnswerId": "a2",
      "points": 10,
      "explanation": "**Bonjour** is the formal greeting used during the day."
    }
  ],
  "timeLimit": 15,
  "passingScore": 70,
  "isActive": true,
  "isPublished": true,
  "order": 1,
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z",
  "createdBy": "admin_user_123"
}
```

### 3. Admins Collection: `admins`

**Path**: `/admins/{adminId}`

**Document Structure**:

```typescript
{
  id: string,              // Firebase Auth UID
  email: string,           // Admin email address
  name: string,            // Admin display name
  role: "admin" | "superadmin" | "teacher", // Admin role
  createdAt: Timestamp,    // Account creation date
  lastLoginAt?: Timestamp  // Last login timestamp
}
```

## Database Indexes

### Recommended Composite Indexes

1. **Courses Collection**:

   - `level` (Ascending) + `order` (Ascending)
   - `isPublished` (Ascending) + `createdAt` (Descending)
   - `level` (Ascending) + `isPublished` (Ascending) + `order` (Ascending)

2. **Quizzes Subcollection**:
   - `courseId` (Ascending) + `order` (Ascending)
   - `isPublished` (Ascending) + `createdAt` (Descending)

### Single Field Indexes

- All timestamp fields (`createdAt`, `updatedAt`)
- `level` field in both collections
- `isPublished` field in both collections
- `order` field in both collections

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Courses collection - Admin only
    match /courses/{courseId} {
      allow read, write: if isAdmin();

      // Quiz subcollection
      match /quizzes/{quizId} {
        allow read, write: if isAdmin();
      }
    }

    // Admins collection - Super admin only for writes
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow write: if isSuperAdmin();
    }

    // Helper function to check admin status
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isSuperAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'superadmin';
    }
  }
}
```

## API Endpoints

### Course Management

- `GET /api/admin/courses` - List courses with pagination and filters
- `POST /api/admin/courses` - Create new course
- `GET /api/admin/courses/[id]` - Get course details with quizzes
- `PUT /api/admin/courses/[id]` - Update course
- `DELETE /api/admin/courses/[id]` - Delete course and all its quizzes

### Quiz Management

- `GET /api/admin/quizzes` - List quizzes with course filtering
- `POST /api/admin/quizzes` - Create new quiz
- `GET /api/admin/quizzes/[id]` - Get quiz details
- `PUT /api/admin/quizzes/[id]` - Update quiz
- `DELETE /api/admin/quizzes/[id]` - Delete quiz

## Data Validation

### Course Validation Rules

- `title`: Required, 1-200 characters
- `level`: Must be one of ["A1", "B1", "B2"]
- `estimatedDuration`: Positive integer, 1-999 minutes
- `order`: Non-negative integer
- URLs in content: Must be valid URLs or empty

### Quiz Validation Rules

- `title`: Required, 1-200 characters
- `questions`: Must have at least 1 question
- `passingScore`: Integer between 0-100
- `timeLimit`: Positive integer or null
- Each question must have valid `correctAnswerId` for multiple choice

## Usage Examples

### Creating a Course

```typescript
const courseData = {
  title: "French Numbers",
  description: "Learn to count from 1 to 100 in French",
  level: "A1",
  content: {
    text: "# French Numbers\n\n**Un** - One\n**Deux** - Two...",
    audioUrl: "https://example.com/numbers.mp3",
  },
  isPublished: false,
  order: 5,
  prerequisites: ["course_basic_greetings_001"],
  estimatedDuration: 45,
};

// POST to /api/admin/courses
```

### Querying Courses

```typescript
// Get published A1 courses, ordered by sequence
const response = await fetch(
  "/api/admin/courses?level=A1&isPublished=true&sortBy=order&sortOrder=asc"
);
```

This schema provides a solid foundation for course management with proper hierarchical organization, efficient querying capabilities, and comprehensive metadata tracking.
