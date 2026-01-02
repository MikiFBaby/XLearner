import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

// This endpoint is called after Twitter OAuth callback to store the connection
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      twitterId,
      twitterUsername,
      twitterName,
      twitterAvatar,
      accessToken,
      refreshToken,
      expiresAt,
    } = body;

    if (!twitterId || !twitterUsername || !accessToken) {
      return NextResponse.json(
        { error: "Missing Twitter credentials" },
        { status: 400 }
      );
    }

    // Check if this Twitter account is already connected to another user
    const existingTwitterUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.twitterId, twitterId))
      .limit(1);

    if (existingTwitterUser.length > 0 && existingTwitterUser[0].id !== session.user.id) {
      return NextResponse.json(
        { error: "This Twitter account is already connected to another user" },
        { status: 400 }
      );
    }

    // Update the user with Twitter credentials
    await db
      .update(users)
      .set({
        twitterId,
        twitterUsername,
        twitterName,
        twitterAvatar,
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt ? new Date(expiresAt * 1000) : null,
        twitterConnectedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Twitter account connected successfully",
    });
  } catch (error) {
    console.error("Twitter connect error:", error);
    return NextResponse.json(
      { error: "Failed to connect Twitter account" },
      { status: 500 }
    );
  }
}

// Disconnect Twitter from account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(users)
      .set({
        twitterId: null,
        twitterUsername: null,
        twitterName: null,
        twitterAvatar: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        twitterConnectedAt: null,
        enableRealtimeSync: false,
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Twitter account disconnected",
    });
  } catch (error) {
    console.error("Twitter disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Twitter account" },
      { status: 500 }
    );
  }
}
