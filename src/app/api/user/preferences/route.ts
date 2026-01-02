import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  requireAuth,
  successResponse,
  validateBody,
  withErrorHandler,
} from "@/lib/api-utils";
import { updatePreferencesSchema } from "@/lib/validations";

// GET /api/user/preferences - Get user preferences
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const user = await requireAuth();

  let preferences = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  // Create default preferences if they don't exist
  if (!preferences) {
    preferences = await prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    });
  }

  return successResponse(preferences);
});

// PATCH /api/user/preferences - Update user preferences
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const data = await validateBody(request, updatePreferencesSchema);

  const preferences = await prisma.userPreferences.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...data,
    },
    update: data,
  });

  return successResponse(preferences);
});
