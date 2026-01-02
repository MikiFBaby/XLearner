import { NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, userAccounts, accounts, sessions, verificationTokens } from "./schema";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: userAccounts,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as NextAuthOptions["adapter"],
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
    async signIn({ user, account, profile }) {
      console.log("SignIn callback triggered", {
        provider: account?.provider,
        hasProfile: !!profile
      });

      try {
        if (account?.provider === "twitter" && profile) {
          const twitterProfile = profile as {
            data?: {
              id: string;
              username: string;
              name: string;
              profile_image_url?: string;
            };
          };

          console.log("Twitter profile data:", twitterProfile.data);

          if (twitterProfile.data) {
            // Create or update the main User record (separate from NextAuth UserAccount)
            const existingUser = await db
              .select()
              .from(users)
              .where(eq(users.twitterId, twitterProfile.data.id))
              .limit(1);

            console.log("Existing user found:", existingUser.length > 0);

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
              console.log("User updated successfully");
            } else {
              await db.insert(users).values({
                twitterId: twitterProfile.data.id,
                twitterUsername: twitterProfile.data.username,
                twitterName: twitterProfile.data.name,
                twitterAvatar: twitterProfile.data.profile_image_url,
                email: user.email,
                accessToken: account.access_token || "",
                refreshToken: account.refresh_token,
                tokenExpiresAt: account.expires_at
                  ? new Date(account.expires_at * 1000)
                  : null,
              });
              console.log("New user created successfully");
            }
          }
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        // Still return true to allow sign-in even if our custom user creation fails
        // The NextAuth adapter will handle the basic user creation
        return true;
      }
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const twitterProfile = profile as {
          data?: {
            id: string;
            username: string;
          };
        };
        if (twitterProfile.data) {
          token.twitterId = twitterProfile.data.id;
          token.twitterUsername = twitterProfile.data.username;
          token.accessToken = account.access_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // Add custom fields to session
        (session.user as { twitterId?: string }).twitterId = token.twitterId as string;
        (session.user as { twitterUsername?: string }).twitterUsername = token.twitterUsername as string;

        // Get the full user record
        if (token.twitterId) {
          try {
            const userResult = await db
              .select({
                id: users.id,
                twitterId: users.twitterId,
                twitterUsername: users.twitterUsername,
                twitterName: users.twitterName,
                twitterAvatar: users.twitterAvatar,
                lastSyncAt: users.lastSyncAt,
              })
              .from(users)
              .where(eq(users.twitterId, token.twitterId as string))
              .limit(1);

            if (userResult.length > 0) {
              const user = userResult[0];
              (session.user as typeof user) = {
                ...session.user,
                ...user,
              };
            }
          } catch (error) {
            console.error("Error fetching user in session callback:", error);
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: true, // Enable debug mode to see what's happening
};

// Type augmentation for NextAuth
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
    accessToken?: string;
  }
}
