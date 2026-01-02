import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";
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

  const prefsResult = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1);

  let preferences = prefsResult[0];

  // Create default preferences if they don't exist
  if (!preferences) {
    const newPrefsResult = await db
      .insert(userPreferences)
      .values({
        userId: user.id,
      })
      .returning();
    preferences = newPrefsResult[0];
  }

  return successResponse(preferences);
});

// PATCH /api/user/preferences - Update user preferences
export const PATCH = withErrorHandler(async (request: NextRequest) => {
  const user = await requireAuth();
  const data = await validateBody(request, updatePreferencesSchema);

  // Check if preferences exist
  const existingResult = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id))
    .limit(1);

  let preferences;

  if (existingResult.length > 0) {
    // Update existing
    const updateResult = await db
      .update(userPreferences)
      .set(data)
      .where(eq(userPreferences.userId, user.id))
      .returning();
    preferences = updateResult[0];
  } else {
    // Create new
    const insertResult = await db
      .insert(userPreferences)
      .values({
        userId: user.id,
        ...data,
      })
      .returning();
    preferences = insertResult[0];
  }

  return successResponse(preferences);
});
