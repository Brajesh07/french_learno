// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superadmin' | 'teacher';
  createdAt: Date;
  lastLoginAt?: Date;
}

// Student Model
export interface Student {
  id: string;
  email: string;
  name: string;
  parentEmail: string;
  level: FrenchLevel;
  isActive: boolean;
  hasSubscription: boolean;
  progress: StudentProgress;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface StudentProgress {
  coursesCompleted: number;
  quizzesCompleted: number;
  currentLevel: FrenchLevel;
  totalPoints: number;
  currentCourse?: string;
  completedCourses: string[];
  badges: string[];
}

// Course Model
export interface Course {
  id: string;
  title: string;
  description: string;
  level: FrenchLevel;
  content: CourseContent;
  isPublished: boolean;
  order: number;
  prerequisites: string[];
  estimatedDuration: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CourseContent {
  text: string;
  audioUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'audio-repeat';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

// Quiz Model (Updated for Admin Dashboard)
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  level: FrenchLevel;
  questions: QuizQuestion[];
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
  isActive: boolean;
  isPublished: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'text' | 'audio';
  question: string; // Plain text question content
  options?: string[]; // Legacy support
  answers?: QuizAnswer[]; // For multiple choice answers in admin dashboard
  correctAnswer: string; // Legacy support
  correctAnswerId?: string; // For multiple choice questions in admin dashboard
  points: number;
  explanation?: string; // Rich text HTML
  audioUrl?: string;
  imageUrl?: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  studentId: string;
  answers: StudentQuizAnswer[];
  score: number;
  passed: boolean;
  completedAt: Date;
  timeSpent: number; // in seconds
}

export interface StudentQuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

// Notification Model
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'course' | 'quiz' | 'general' | 'achievement';
  targetAudience: 'all' | 'level' | 'individual';
  targetLevel?: FrenchLevel;
  targetStudents?: string[];
  isScheduled: boolean;
  scheduledFor?: Date;
  sentAt?: Date;
  createdAt: Date;
  createdBy: string;
}

// Common Types
export type FrenchLevel = 'A1' | 'B1' | 'B2';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  level?: FrenchLevel;
  isActive?: boolean;
  hasSubscription?: boolean;
  searchTerm?: string;
}

// Analytics Types
export interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  publishedCourses: number;
  totalQuizzes: number;
  completionRate: number;
  levelDistribution: Record<FrenchLevel, number>;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'student_registered' | 'course_completed' | 'quiz_completed' | 'course_published';
  description: string;
  studentId?: string;
  courseId?: string;
  quizId?: string;
  timestamp: Date;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface CourseFormData {
  title: string;
  description: string;
  level: FrenchLevel;
  content: {
    text: string;
    audioFile?: File;
    imageFile?: File;
    videoFile?: File;
  };
  prerequisites: string[];
  estimatedDuration: number;
}

export interface StudentFormData {
  name: string;
  email: string;
  parentEmail: string;
  level: FrenchLevel;
  isActive: boolean;
  hasSubscription: boolean;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

// Quiz Types
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  questions: QuizQuestion[];
  isPublished: boolean;
  order: number;
  timeLimit?: number; // in minutes
  passingScore: number; // percentage
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  answers: StudentAnswer[];
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  submittedAt: Date;
  timeSpent: number; // in seconds
}

export interface StudentAnswer {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
  points: number;
}

// Quiz Creation Form Types
export interface QuizFormData {
  title: string;
  description: string;
  courseId: string;
  timeLimit: number;
  passingScore: number;
  questions: QuizQuestionFormData[];
}

export interface QuizQuestionFormData {
  id: string;
  question: string;
  answers: QuizAnswerFormData[];
  correctAnswerId: string;
  points: number;
  explanation: string;
}

export interface QuizAnswerFormData {
  id: string;
  text: string;
}

// Theme Types
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}
