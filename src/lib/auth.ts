import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "./schema";

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          const user = userResult[0];

          if (!user || !user.password) {
            throw new Error("Invalid email or password");
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            throw new Error("Invalid email or password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image || user.twitterAvatar,
          };
        } catch (error) {
          console.error("Credentials auth error:", error);
          throw new Error("Invalid email or password");
        }
      },
    }),
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // Twitter/X OAuth (for login)
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
    // Facebook OAuth
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID || "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For credentials login, always allow
      if (account?.provider === "credentials") {
        return true;
      }

      // Handle Twitter OAuth specially (no email provided)
      if (account?.provider === "twitter" && profile) {
        const twitterProfile = profile as {
          data?: {
            id: string;
            username: string;
            name: string;
            profile_image_url?: string;
          };
        };

        if (twitterProfile.data) {
          try {
            // Look for existing user by Twitter ID
            const existingByTwitter = await db
              .select()
              .from(users)
              .where(eq(users.twitterId, twitterProfile.data.id))
              .limit(1);

            // Calculate token expiration
            const tokenExpiresAt = account.expires_at
              ? new Date(account.expires_at * 1000)
              : new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours default

            if (existingByTwitter.length > 0) {
              // User exists with this Twitter account
              user.id = existingByTwitter[0].id;
              user.email = existingByTwitter[0].email;
              user.name = existingByTwitter[0].name;

              // Update Twitter tokens and credentials
              await db
                .update(users)
                .set({
                  twitterAvatar: twitterProfile.data.profile_image_url,
                  twitterConnectedAt: new Date(),
                  accessToken: account.access_token,
                  refreshToken: account.refresh_token,
                  tokenExpiresAt: tokenExpiresAt,
                  updatedAt: new Date(),
                })
                .where(eq(users.id, existingByTwitter[0].id));
            } else {
              // Create new user from Twitter
              const newUserId = crypto.randomUUID();
              const twitterEmail = `${twitterProfile.data.username}@twitter.local`;

              await db.insert(users).values({
                id: newUserId,
                email: twitterEmail,
                name: twitterProfile.data.name,
                image: twitterProfile.data.profile_image_url,
                twitterId: twitterProfile.data.id,
                twitterUsername: twitterProfile.data.username,
                twitterName: twitterProfile.data.name,
                twitterAvatar: twitterProfile.data.profile_image_url,
                twitterConnectedAt: new Date(),
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                tokenExpiresAt: tokenExpiresAt,
                emailVerified: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              user.id = newUserId;
              user.email = twitterEmail;
            }
            return true;
          } catch (error) {
            console.error("Twitter OAuth signIn error:", error);
            return false;
          }
        }
      }

      // For other OAuth providers (Google, Facebook) that provide email
      if (account && user.email) {
        try {
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (existingUser.length === 0) {
            // Create new user from OAuth
            const newUserId = crypto.randomUUID();
            await db.insert(users).values({
              id: newUserId,
              email: user.email,
              name: user.name || user.email.split("@")[0],
              image: user.image,
              emailVerified: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            user.id = newUserId;
          } else {
            user.id = existingUser[0].id;
            // Update user image if not set
            if (!existingUser[0].image && user.image) {
              await db
                .update(users)
                .set({ image: user.image, updatedAt: new Date() })
                .where(eq(users.id, existingUser[0].id));
            }
          }
        } catch (error) {
          console.error("OAuth signIn error:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account, profile }) {
      // On initial sign in with credentials
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
      }

      // When connecting Twitter account
      if (account?.provider === "twitter" && profile) {
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
          token.refreshToken = account.refresh_token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;

        // Get user data from database for Twitter connection status
        if (token.id) {
          try {
            const userResult = await db
              .select({
                id: users.id,
                name: users.name,
                image: users.image,
                twitterId: users.twitterId,
                twitterUsername: users.twitterUsername,
                twitterName: users.twitterName,
                twitterAvatar: users.twitterAvatar,
                twitterConnectedAt: users.twitterConnectedAt,
                lastSyncAt: users.lastSyncAt,
                enableRealtimeSync: users.enableRealtimeSync,
              })
              .from(users)
              .where(eq(users.id, token.id as string))
              .limit(1);

            if (userResult.length > 0) {
              const dbUser = userResult[0];
              session.user.twitterId = dbUser.twitterId || undefined;
              session.user.twitterUsername = dbUser.twitterUsername || undefined;
              session.user.twitterName = dbUser.twitterName || undefined;
              session.user.twitterAvatar = dbUser.twitterAvatar || undefined;
              session.user.twitterConnected = !!dbUser.twitterConnectedAt;
              session.user.lastSyncAt = dbUser.lastSyncAt || undefined;
              session.user.enableRealtimeSync = dbUser.enableRealtimeSync;
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
    newUser: "/dashboard",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
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
      twitterConnected?: boolean;
      lastSyncAt?: Date | null;
      enableRealtimeSync?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
    twitterId?: string;
    twitterUsername?: string;
    twitterName?: string;
    twitterAvatar?: string;
    accessToken?: string;
    refreshToken?: string;
  }
}
