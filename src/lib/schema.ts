import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  primaryKey,
  unique,
  index,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// ============================================================
// User & Authentication Models
// ============================================================

export const users = pgTable(
  "User",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    password: text("password"), // Hashed password for email auth
    name: text("name"),
    image: text("image"),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    // Twitter connection (optional - connected after account creation)
    twitterId: text("twitterId").unique(),
    twitterUsername: text("twitterUsername"),
    twitterName: text("twitterName"),
    twitterAvatar: text("twitterAvatar"),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    tokenExpiresAt: timestamp("tokenExpiresAt", { mode: "date" }),
    twitterConnectedAt: timestamp("twitterConnectedAt", { mode: "date" }),
    // Settings
    enableRealtimeSync: boolean("enableRealtimeSync").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    lastSyncAt: timestamp("lastSyncAt", { mode: "date" }),
  },
  (table) => ({
    emailIdx: index("User_email_idx").on(table.email),
    twitterIdIdx: index("User_twitterId_idx").on(table.twitterId),
  })
);

export const userPreferences = pgTable("UserPreferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  dailyGoalMinutes: integer("dailyGoalMinutes").default(30).notNull(),
  preferredVoice: text("preferredVoice").default("default").notNull(),
  playbackSpeed: real("playbackSpeed").default(1.0).notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
});

// ============================================================
// Bookmark Models
// ============================================================

export const bookmarks = pgTable(
  "Bookmark",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tweetId: text("tweetId").notNull().unique(),
    tweetText: text("tweetText").notNull(),
    tweetAuthorId: text("tweetAuthorId").notNull(),
    tweetAuthorName: text("tweetAuthorName").notNull(),
    tweetAuthorHandle: text("tweetAuthorHandle").notNull(),
    tweetCreatedAt: timestamp("tweetCreatedAt", { mode: "date" }).notNull(),
    tweetLikes: integer("tweetLikes").default(0).notNull(),
    tweetRetweets: integer("tweetRetweets").default(0).notNull(),
    tweetUrl: text("tweetUrl").notNull(),
    hasMedia: boolean("hasMedia").default(false).notNull(),
    mediaUrls: text("mediaUrls").array(),
    isThread: boolean("isThread").default(false).notNull(),
    threadId: text("threadId"),
    bookmarkedAt: timestamp("bookmarkedAt", { mode: "date" }).defaultNow().notNull(),
    lastProcessedAt: timestamp("lastProcessedAt", { mode: "date" }),
    summary: text("summary"),
    topics: text("topics").array(),
    learningDepth: text("learningDepth"),
    keyTakeaways: text("keyTakeaways").array(),
  },
  (table) => ({
    userBookmarkedAtIdx: index("Bookmark_userId_bookmarkedAt_idx").on(
      table.userId,
      table.bookmarkedAt
    ),
    userThreadIdIdx: index("Bookmark_userId_threadId_idx").on(
      table.userId,
      table.threadId
    ),
  })
);

// ============================================================
// Course Models
// ============================================================

export const courses = pgTable(
  "Course",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    coverImageUrl: text("coverImageUrl"),
    estimatedMinutes: integer("estimatedMinutes").notNull(),
    difficultyLevel: text("difficultyLevel").notNull(),
    topics: text("topics").array(),
    status: text("status").default("draft").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
    publishedAt: timestamp("publishedAt", { mode: "date" }),
  },
  (table) => ({
    userStatusIdx: index("Course_userId_status_idx").on(table.userId, table.status),
  })
);

export const modules = pgTable(
  "Module",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    orderIndex: integer("orderIndex").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    estimatedMinutes: integer("estimatedMinutes").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    courseOrderUnique: unique("Module_courseId_orderIndex_key").on(
      table.courseId,
      table.orderIndex
    ),
    courseIdIdx: index("Module_courseId_idx").on(table.courseId),
  })
);

export const moduleBookmarks = pgTable(
  "ModuleBookmark",
  {
    moduleId: text("moduleId")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    bookmarkId: text("bookmarkId")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    orderIndex: integer("orderIndex").notNull(),
    addedAt: timestamp("addedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.moduleId, table.bookmarkId] }),
  })
);

export const lessons = pgTable(
  "Lesson",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    moduleId: text("moduleId")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    orderIndex: integer("orderIndex").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    audioUrl: text("audioUrl"),
    audioGeneratedAt: timestamp("audioGeneratedAt", { mode: "date" }),
    videoPodcastUrl: text("videoPodcastUrl"),
    duration: integer("duration"),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    moduleOrderUnique: unique("Lesson_moduleId_orderIndex_key").on(
      table.moduleId,
      table.orderIndex
    ),
    moduleIdIdx: index("Lesson_moduleId_idx").on(table.moduleId),
  })
);

// ============================================================
// Quiz Models
// ============================================================

export const quizzes = pgTable(
  "Quiz",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    moduleId: text("moduleId")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    questions: json("questions").notNull(),
    passingScore: integer("passingScore").default(70).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    moduleIdIdx: index("Quiz_moduleId_idx").on(table.moduleId),
  })
);

export const quizResults = pgTable(
  "QuizResult",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quizId")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    answers: json("answers").notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userQuizIdx: index("QuizResult_userId_quizId_idx").on(table.userId, table.quizId),
  })
);

// ============================================================
// Learning Progress Models
// ============================================================

export const learningProgress = pgTable(
  "LearningProgress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("courseId")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    lessonId: text("lessonId").references(() => lessons.id, { onDelete: "cascade" }),
    status: text("status").default("not_started").notNull(),
    progressPercent: integer("progressPercent").default(0).notNull(),
    lastPosition: integer("lastPosition").default(0).notNull(),
    startedAt: timestamp("startedAt", { mode: "date" }),
    completedAt: timestamp("completedAt", { mode: "date" }),
    lastAccessedAt: timestamp("lastAccessedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userCourseLessonUnique: unique("LearningProgress_userId_courseId_lessonId_key").on(
      table.userId,
      table.courseId,
      table.lessonId
    ),
    userCourseIdx: index("LearningProgress_userId_courseId_idx").on(
      table.userId,
      table.courseId
    ),
  })
);

// ============================================================
// Background Jobs Models
// ============================================================

export const backgroundJobs = pgTable(
  "BackgroundJob",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobType: text("jobType").notNull(),
    userId: text("userId"),
    status: text("status").default("pending").notNull(),
    payload: json("payload").notNull(),
    result: json("result"),
    error: text("error"),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("maxAttempts").default(3).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    startedAt: timestamp("startedAt", { mode: "date" }),
    completedAt: timestamp("completedAt", { mode: "date" }),
  },
  (table) => ({
    userStatusIdx: index("BackgroundJob_userId_status_idx").on(table.userId, table.status),
    jobTypeStatusIdx: index("BackgroundJob_jobType_status_idx").on(
      table.jobType,
      table.status
    ),
  })
);

// ============================================================
// NextAuth Models
// ============================================================

export const userAccounts = pgTable("UserAccount", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "Account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => userAccounts.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    providerAccountUnique: unique("Account_provider_providerAccountId_key").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const sessions = pgTable("Session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => userAccounts.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "VerificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    identifierTokenUnique: unique("VerificationToken_identifier_token_key").on(
      table.identifier,
      table.token
    ),
  })
);

// ============================================================
// Relations
// ============================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(userPreferences),
  bookmarks: many(bookmarks),
  courses: many(courses),
  progress: many(learningProgress),
  quizResults: many(quizResults),
}));

export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  moduleBookmarks: many(moduleBookmarks),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, {
    fields: [courses.userId],
    references: [users.id],
  }),
  modules: many(modules),
  progress: many(learningProgress),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
  bookmarks: many(moduleBookmarks),
  quizzes: many(quizzes),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  progress: many(learningProgress),
}));

export const userAccountsRelations = relations(userAccounts, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));
