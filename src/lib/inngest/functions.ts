import { inngest } from "./client";
import { prisma } from "../db";

// Sync bookmarks from Twitter
export const syncBookmarks = inngest.createFunction(
  {
    id: "sync-bookmarks",
    name: "Sync Bookmarks from Twitter",
    retries: 3,
  },
  { event: "bookmarks/sync.requested" },
  async ({ event, step }) => {
    const { userId, jobId } = event.data;

    // Step 1: Get user and validate access token
    await step.run("get-user", async () => {
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
        },
      });

      if (!userData) {
        throw new Error("User not found");
      }

      if (!userData.accessToken) {
        throw new Error("No access token available");
      }

      return userData;
    });

    // Step 2: Update job status to processing
    await step.run("update-job-processing", async () => {
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "processing",
          startedAt: new Date(),
        },
      });
    });

    // Step 3: Fetch bookmarks from Twitter API
    // Note: This is a placeholder - actual Twitter API implementation would go here
    const bookmarks = await step.run("fetch-twitter-bookmarks", async () => {
      // TODO: Implement actual Twitter API v2 bookmark fetching
      // const response = await fetch("https://api.twitter.com/2/users/:id/bookmarks", {
      //   headers: {
      //     Authorization: `Bearer ${user.accessToken}`,
      //   },
      // });

      // For now, return empty array as placeholder
      return [];
    });

    // Step 4: Save bookmarks to database
    const savedCount = await step.run("save-bookmarks", async () => {
      let count = 0;

      for (const _tweet of bookmarks as unknown[]) {
        // Transform and upsert each bookmark
        // This would be implemented based on actual Twitter API response structure
        count++;
      }

      return count;
    });

    // Step 5: Update job status to completed
    await step.run("update-job-completed", async () => {
      await prisma.backgroundJob.update({
        where: { id: jobId },
        data: {
          status: "completed",
          completedAt: new Date(),
          result: {
            bookmarksImported: savedCount,
          },
        },
      });

      // Update user's last sync time
      await prisma.user.update({
        where: { id: userId },
        data: { lastSyncAt: new Date() },
      });
    });

    return { success: true, bookmarksImported: savedCount };
  }
);

// Analyze a single bookmark with AI
export const analyzeBookmark = inngest.createFunction(
  {
    id: "analyze-bookmark",
    name: "Analyze Bookmark with AI",
    retries: 2,
    concurrency: {
      limit: 5, // Limit concurrent AI calls
    },
  },
  { event: "bookmarks/analyze.requested" },
  async ({ event, step }) => {
    const { bookmarkId, jobId } = event.data;

    // Step 1: Get bookmark
    const bookmark = await step.run("get-bookmark", async () => {
      return prisma.bookmark.findUnique({
        where: { id: bookmarkId },
      });
    });

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    // Step 2: Update job status
    await step.run("update-job-processing", async () => {
      if (jobId) {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: { status: "processing", startedAt: new Date() },
        });
      }
    });

    // Step 3: Call AI to analyze (placeholder)
    const analysis = await step.run("ai-analyze", async () => {
      // TODO: Implement actual Claude API call
      // const response = await anthropic.messages.create({...});

      // Placeholder analysis
      return {
        summary: `Summary of: ${bookmark.tweetText.slice(0, 100)}...`,
        topics: ["General"],
        learningDepth: "quick_insight" as const,
        keyTakeaways: ["Key insight from this tweet"],
      };
    });

    // Step 4: Update bookmark with analysis
    await step.run("update-bookmark", async () => {
      await prisma.bookmark.update({
        where: { id: bookmarkId },
        data: {
          summary: analysis.summary,
          topics: analysis.topics,
          learningDepth: analysis.learningDepth,
          keyTakeaways: analysis.keyTakeaways,
          lastProcessedAt: new Date(),
        },
      });
    });

    // Step 5: Complete job
    if (jobId) {
      await step.run("complete-job", async () => {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: {
            status: "completed",
            completedAt: new Date(),
            result: analysis,
          },
        });
      });
    }

    return { success: true, analysis };
  }
);

// Generate a course from bookmarks
export const generateCourse = inngest.createFunction(
  {
    id: "generate-course",
    name: "Generate Course from Bookmarks",
    retries: 2,
  },
  { event: "courses/generate.requested" },
  async ({ event, step }) => {
    const { courseId, bookmarkIds, jobId } = event.data;

    // Step 1: Get course and bookmarks
    const [course] = await step.run("get-data", async () => {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      const bookmarks = await prisma.bookmark.findMany({
        where: { id: { in: bookmarkIds } },
      });
      return [course, bookmarks] as const;
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Step 2: Update job status
    await step.run("update-job-processing", async () => {
      if (jobId) {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: { status: "processing", startedAt: new Date() },
        });
      }
    });

    // Step 3: Generate course structure with AI (placeholder)
    const courseStructure = await step.run("ai-generate-course", async () => {
      // TODO: Implement actual Claude API call for course generation

      // Placeholder structure
      return {
        title: `Course: ${course.title}`,
        description: course.description,
        modules: [
          {
            title: "Introduction",
            description: "Getting started with the topic",
            estimatedMinutes: 15,
            lessons: [
              {
                title: "Welcome",
                content: "Introduction to the course content based on your bookmarks.",
                estimatedMinutes: 5,
              },
            ],
          },
        ],
      };
    });

    // Step 4: Create modules and lessons
    await step.run("create-modules", async () => {
      // Update course title and description
      await prisma.course.update({
        where: { id: courseId },
        data: {
          title: courseStructure.title,
          description: courseStructure.description,
          estimatedMinutes: courseStructure.modules.reduce(
            (acc, m) => acc + m.estimatedMinutes,
            0
          ),
        },
      });

      // Create modules
      for (let i = 0; i < courseStructure.modules.length; i++) {
        const moduleData = courseStructure.modules[i];

        const createdModule = await prisma.module.create({
          data: {
            courseId,
            orderIndex: i,
            title: moduleData.title,
            description: moduleData.description,
            estimatedMinutes: moduleData.estimatedMinutes,
          },
        });

        // Create lessons for this module
        for (let j = 0; j < moduleData.lessons.length; j++) {
          const lessonData = moduleData.lessons[j];

          await prisma.lesson.create({
            data: {
              moduleId: createdModule.id,
              orderIndex: j,
              title: lessonData.title,
              content: lessonData.content,
              duration: lessonData.estimatedMinutes * 60,
            },
          });
        }
      }
    });

    // Step 5: Complete job
    if (jobId) {
      await step.run("complete-job", async () => {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: {
            status: "completed",
            completedAt: new Date(),
            result: { courseId, moduleCount: courseStructure.modules.length },
          },
        });
      });
    }

    return { success: true, courseId };
  }
);

// Generate audio for a lesson
export const generateAudio = inngest.createFunction(
  {
    id: "generate-audio",
    name: "Generate Audio for Lesson",
    retries: 2,
    concurrency: {
      limit: 3, // Limit concurrent audio generation
    },
  },
  { event: "lessons/generate-audio.requested" },
  async ({ event, step }) => {
    const { lessonId, jobId } = event.data;

    // Step 1: Get lesson
    const lesson = await step.run("get-lesson", async () => {
      return prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: { include: { course: true } } },
      });
    });

    if (!lesson) {
      throw new Error("Lesson not found");
    }

    // Step 2: Update job status
    await step.run("update-job-processing", async () => {
      if (jobId) {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: { status: "processing", startedAt: new Date() },
        });
      }
    });

    // Step 3: Convert content to podcast script (placeholder)
    await step.run("generate-script", async () => {
      // TODO: Use Claude to convert lesson content to spoken format
      return lesson.content;
    });

    // Step 4: Generate audio with ElevenLabs (placeholder)
    const audioUrl = await step.run("generate-audio", async () => {
      // TODO: Implement actual ElevenLabs API call
      // const audio = await elevenlabs.generate({ voice: voiceId, text: script });

      // Placeholder URL - will be replaced with actual audio generation
      return null;
    });

    // Step 5: Update lesson with audio URL
    await step.run("update-lesson", async () => {
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          audioUrl,
          audioGeneratedAt: new Date(),
        },
      });
    });

    // Step 6: Complete job
    if (jobId) {
      await step.run("complete-job", async () => {
        await prisma.backgroundJob.update({
          where: { id: jobId },
          data: {
            status: "completed",
            completedAt: new Date(),
            result: { audioUrl },
          },
        });
      });
    }

    return { success: true, audioUrl };
  }
);

// Export all functions for the Inngest handler
export const functions = [
  syncBookmarks,
  analyzeBookmark,
  generateCourse,
  generateAudio,
];
