import { NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "./schema";

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        params: {
          scope: "users.read tweet.read bookmark.read offline.access",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Log for debugging
      console.log("=== SIGN IN CALLBACK ===");
      console.log("Provider:", account?.provider);
      console.log("Profile received:", JSON.stringify(profile, null, 2));

      // Always allow sign-in - we'll handle user creation separately
      if (account?.provider === "twitter" && profile) {
        try {
          const twitterProfile = profile as {
            data?: {
              id: string;
              username: string;
              name: string;
              profile_image_url?: string;
            };
          };

          if (twitterProfile.data) {
            console.log("Twitter data:", twitterProfile.data);

            const existingUser = await db
              .select()
              .from(users)
              .where(eq(users.twitterId, twitterProfile.data.id))
              .limit(1);

            if (existingUser.length > 0) {
              await db
                .update(users)
                .set({
                  twitterUsername: twitterProfile.data.username,
                  twitterName: twitterProfile.data.name,
                  twitterAvatar: twitterProfile.data.profile_image_url,
                  accessToken: account.access_token || "",
                  refreshToken: account.refresh_token,
                  tokenExpiresAt: account.expires_at
                    ? new Date(account.expires_at * 1000)
                    : null,
                })
                .where(eq(users.twitterId, twitterProfile.data.id));
              console.log("User updated");
            } else {
              await db.insert(users).values({
                twitterId: twitterProfile.data.id,
                twitterUsername: twitterProfile.data.username,
                twitterName: twitterProfile.data.name,
                twitterAvatar: twitterProfile.data.profile_image_url,
                accessToken: account.access_token || "",
                refreshToken: account.refresh_token,
                tokenExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
              });
              console.log("New user created");
            }
          }
        } catch (error) {
          console.error("Error in signIn callback:", error);
          // Don't fail sign-in due to DB error
        }
      }

      console.log("Sign in allowed");
      return true;
    },
    async jwt({ token, account, profile }) {
      console.log("=== JWT CALLBACK ===");

      if (account && profile) {
        const twitterProfile = profile as {
          data?: {
            id: string;
            username: string;
            name: string;
            profile_image_url?: string;
          };
        };

        if (twitterProfile.data) {
          token.twitterId = twitterProfile.data.id;
          token.twitterUsername = twitterProfile.data.username;
          token.twitterName = twitterProfile.data.name;
          token.twitterAvatar = twitterProfile.data.profile_image_url;
          token.accessToken = account.access_token;
          console.log("Token updated with Twitter data");
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.twitterId = token.twitterId as string;
        session.user.twitterUsername = token.twitterUsername as string;
        session.user.twitterName = token.twitterName as string;
        session.user.twitterAvatar = token.twitterAvatar as string;

        if (token.twitterId) {
          try {
            const userResult = await db
              .select({ id: users.id, lastSyncAt: users.lastSyncAt })
              .from(users)
              .where(eq(users.twitterId, token.twitterId as string))
              .limit(1);

            if (userResult.length > 0) {
              session.user.id = userResult[0].id;
              session.user.lastSyncAt = userResult[0].lastSyncAt;
            }
          } catch (error) {
            console.error("Session callback DB error:", error);
          }
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: true,
};

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      twitterId?: string;
      twitterUsername?: string;
      twitterName?: string | null;
      twitterAvatar?: string | null;
      lastSyncAt?: Date | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    twitterId?: string;
    twitterUsername?: string;
    twitterName?: string;
    twitterAvatar?: string;
    accessToken?: string;
  }
}
