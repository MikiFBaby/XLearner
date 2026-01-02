import { z } from "zod";

// ============================================================
// Common Schemas
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

// ============================================================
// Bookmark Schemas
// ============================================================

export const bookmarkFilterSchema = z.object({
  ...paginationSchema.shape,
  topics: z.string().optional(), // comma-separated
  author: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  hasMedia: z.coerce.boolean().optional(),
  isProcessed: z.coerce.boolean().optional(),
  learningDepth: z.enum(["quick_insight", "deep_concept", "tutorial"]).optional(),
  sortBy: z.enum(["bookmarkedAt", "tweetLikes", "tweetCreatedAt"]).default("bookmarkedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const updateBookmarkSchema = z.object({
  summary: z.string().optional(),
  topics: z.array(z.string()).optional(),
  learningDepth: z.enum(["quick_insight", "deep_concept", "tutorial"]).optional(),
  keyTakeaways: z.array(z.string()).optional(),
});

// ============================================================
// Course Schemas
// ============================================================

export const courseFilterSchema = z.object({
  ...paginationSchema.shape,
  status: z.enum(["draft", "published", "archived"]).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const createCourseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  topics: z.array(z.string()).min(1),
  bookmarkIds: z.array(z.string()).optional(),
  autoGenerate: z.boolean().default(false),
  userInstructions: z.string().optional(),
});

export const updateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  topics: z.array(z.string()).optional(),
  coverImageUrl: z.string().url().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

// ============================================================
// Module Schemas
// ============================================================

export const createModuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  orderIndex: z.number().min(0),
  estimatedMinutes: z.number().min(1).default(15),
});

export const updateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  orderIndex: z.number().min(0).optional(),
  estimatedMinutes: z.number().min(1).optional(),
});

// ============================================================
// Lesson Schemas
// ============================================================

export const createLessonSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  orderIndex: z.number().min(0),
  duration: z.number().min(0).optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  orderIndex: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
});

export const updateProgressSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  lastPosition: z.number().min(0).optional(),
});

// ============================================================
// Quiz Schemas
// ============================================================

export const submitQuizSchema = z.object({
  answers: z.record(z.union([z.string(), z.number()])),
});

// ============================================================
// AI Processing Schemas
// ============================================================

export const analyzeBookmarkSchema = z.object({
  bookmarkId: z.string(),
});

export const clusterBookmarksSchema = z.object({
  bookmarkIds: z.array(z.string()).optional(),
  minClusters: z.number().min(1).default(3),
  maxClusters: z.number().max(15).default(10),
});

export const generateCourseSchema = z.object({
  bookmarkIds: z.array(z.string()).min(1),
  userInstructions: z.string().optional(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
});

export const generatePodcastSchema = z.object({
  lessonId: z.string(),
  voiceId: z.string().optional(),
});

// ============================================================
// User Preferences Schemas
// ============================================================

export const updatePreferencesSchema = z.object({
  dailyGoalMinutes: z.number().min(5).max(480).optional(),
  preferredVoice: z.string().optional(),
  playbackSpeed: z.number().min(0.5).max(3).optional(),
  emailNotifications: z.boolean().optional(),
});
