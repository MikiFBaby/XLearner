import { NextAuthOptions } from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
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
          // Create or update the main User record (separate from NextAuth UserAccount)
          await prisma.user.upsert({
            where: { twitterId: twitterProfile.data.id },
            update: {
              twitterUsername: twitterProfile.data.username,
              twitterName: twitterProfile.data.name,
              twitterAvatar: twitterProfile.data.profile_image_url,
              accessToken: account.access_token || "",
              refreshToken: account.refresh_token,
              tokenExpiresAt: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
            },
            create: {
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
            },
          });
        }
      }
      return true;
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
          const user = await prisma.user.findUnique({
            where: { twitterId: token.twitterId as string },
            select: {
              id: true,
              twitterId: true,
              twitterUsername: true,
              twitterName: true,
              twitterAvatar: true,
              lastSyncAt: true,
            },
          });
          if (user) {
            (session.user as typeof user) = {
              ...session.user,
              ...user,
            };
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
  debug: process.env.NODE_ENV === "development",
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
