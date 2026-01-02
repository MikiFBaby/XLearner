// ============================================================
// User Types
// ============================================================

export interface User {
  id: string;
  email?: string | null;
  twitterId: string;
  twitterUsername: string;
  twitterName?: string | null;
  twitterAvatar?: string | null;
  createdAt: Date;
  lastSyncAt?: Date | null;
}

export interface UserPreferences {
  id: string;
  userId: string;
  dailyGoalMinutes: number;
  preferredVoice: string;
  playbackSpeed: number;
  emailNotifications: boolean;
}

// ============================================================
// Bookmark Types
// ============================================================

export type LearningDepth = "quick_insight" | "deep_concept" | "tutorial";

export interface Bookmark {
  id: string;
  userId: string;
  tweetId: string;
  tweetText: string;
  tweetAuthorId: string;
  tweetAuthorName: string;
  tweetAuthorHandle: string;
  tweetCreatedAt: Date;
  tweetLikes: number;
  tweetRetweets: number;
  tweetUrl: string;
  hasMedia: boolean;
  mediaUrls: string[];
  isThread: boolean;
  threadId?: string | null;
  bookmarkedAt: Date;
  lastProcessedAt?: Date | null;
  summary?: string | null;
  topics: string[];
  learningDepth?: LearningDepth | null;
  keyTakeaways: string[];
}

export interface BookmarkFilters {
  topics?: string[];
  author?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasMedia?: boolean;
  isProcessed?: boolean;
  learningDepth?: LearningDepth;
}

// ============================================================
// Course Types
// ============================================================

export type CourseStatus = "draft" | "published" | "archived";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

export interface Course {
  id: string;
  userId: string;
  title: string;
  description: string;
  coverImageUrl?: string | null;
  estimatedMinutes: number;
  difficultyLevel: DifficultyLevel;
  topics: string[];
  status: CourseStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  modules?: Module[];
}

export interface Module {
  id: string;
  courseId: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  estimatedMinutes: number;
  createdAt: Date;
  lessons?: Lesson[];
  quizzes?: Quiz[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  orderIndex: number;
  title: string;
  content: string;
  audioUrl?: string | null;
  audioGeneratedAt?: Date | null;
  videoPodcastUrl?: string | null;
  duration?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Quiz Types
// ============================================================

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  moduleId: string;
  title: string;
  questions: QuizQuestion[];
  passingScore: number;
  createdAt: Date;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  answers: Record<string, string | number>;
  completedAt: Date;
}

// ============================================================
// Learning Progress Types
// ============================================================

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export interface LearningProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId?: string | null;
  status: ProgressStatus;
  progressPercent: number;
  lastPosition: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  lastAccessedAt: Date;
}

// ============================================================
// Background Job Types
// ============================================================

export type JobType = "sync_bookmarks" | "analyze_bookmark" | "generate_course" | "generate_audio" | "generate_quiz";
export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface BackgroundJob {
  id: string;
  jobType: JobType;
  userId?: string | null;
  status: JobStatus;
  payload: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  error?: string | null;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ============================================================
// AI Processing Types
// ============================================================

export interface BookmarkAnalysis {
  summary: string;
  topics: string[];
  learningDepth: LearningDepth;
  keyTakeaways: string[];
  prerequisites?: string[];
  relatedTopics?: string[];
}

export interface TopicCluster {
  name: string;
  description: string;
  difficultyLevel: DifficultyLevel;
  bookmarkIds: string[];
  suggestedModules: {
    title: string;
    description: string;
  }[];
}

export interface GeneratedCourse {
  title: string;
  description: string;
  estimatedMinutes: number;
  difficultyLevel: DifficultyLevel;
  topics: string[];
  modules: {
    title: string;
    description: string;
    estimatedMinutes: number;
    lessons: {
      title: string;
      content: string;
      estimatedMinutes: number;
    }[];
  }[];
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardStats {
  totalBookmarks: number;
  processedBookmarks: number;
  activeCourses: number;
  completedCourses: number;
  totalLearningMinutes: number;
  currentStreak: number;
  topTopics: { topic: string; count: number }[];
}

export interface LearningRecommendation {
  type: "continue" | "new_course" | "quiz";
  title: string;
  description: string;
  courseId?: string;
  lessonId?: string;
  quizId?: string;
  estimatedMinutes: number;
}
