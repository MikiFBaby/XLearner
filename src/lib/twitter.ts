// Twitter API v2 client for fetching bookmarks

interface TwitterBookmark {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
  };
  entities?: {
    urls?: Array<{
      expanded_url: string;
    }>;
  };
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterBookmarksResponse {
  data?: TwitterBookmark[];
  includes?: {
    users?: TwitterUser[];
  };
  meta?: {
    next_token?: string;
    result_count: number;
  };
  errors?: Array<{
    message: string;
    type: string;
  }>;
}

export interface ParsedBookmark {
  tweetId: string;
  tweetText: string;
  tweetAuthorId: string;
  tweetAuthorName: string;
  tweetAuthorHandle: string;
  tweetCreatedAt: Date;
  tweetLikes: number;
  tweetRetweets: number;
  tweetUrl: string;
  hasMedia: boolean;
  mediaUrls: string[];
}

export async function fetchTwitterBookmarks(
  accessToken: string,
  userId: string,
  maxResults: number = 100
): Promise<{ bookmarks: ParsedBookmark[]; error?: string }> {
  try {
    const url = new URL(`https://api.twitter.com/2/users/${userId}/bookmarks`);
    url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
    url.searchParams.set(
      "tweet.fields",
      "created_at,public_metrics,entities,author_id"
    );
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "name,username,profile_image_url");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Twitter API error:", errorData);

      if (response.status === 401) {
        return { bookmarks: [], error: "Twitter access token expired or invalid" };
      }
      if (response.status === 403) {
        return { bookmarks: [], error: "Access to bookmarks denied. Make sure your app has bookmark.read permission." };
      }

      return {
        bookmarks: [],
        error: `Twitter API error: ${response.status} - ${errorData.detail || errorData.title || "Unknown error"}`
      };
    }

    const data: TwitterBookmarksResponse = await response.json();

    if (data.errors) {
      console.error("Twitter API errors:", data.errors);
      return { bookmarks: [], error: data.errors[0]?.message || "Twitter API error" };
    }

    if (!data.data || data.data.length === 0) {
      return { bookmarks: [] };
    }

    // Create a map of users for quick lookup
    const usersMap = new Map<string, TwitterUser>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        usersMap.set(user.id, user);
      }
    }

    // Parse bookmarks
    const bookmarks: ParsedBookmark[] = data.data.map((tweet) => {
      const author = usersMap.get(tweet.author_id);

      return {
        tweetId: tweet.id,
        tweetText: tweet.text,
        tweetAuthorId: tweet.author_id,
        tweetAuthorName: author?.name || "Unknown",
        tweetAuthorHandle: author?.username || "unknown",
        tweetCreatedAt: new Date(tweet.created_at),
        tweetLikes: tweet.public_metrics?.like_count || 0,
        tweetRetweets: tweet.public_metrics?.retweet_count || 0,
        tweetUrl: `https://twitter.com/${author?.username || "i"}/status/${tweet.id}`,
        hasMedia: false, // Would need media.fields expansion to detect
        mediaUrls: [],
      };
    });

    return { bookmarks };
  } catch (error) {
    console.error("Error fetching Twitter bookmarks:", error);
    return {
      bookmarks: [],
      error: error instanceof Error ? error.message : "Failed to fetch bookmarks"
    };
  }
}

export async function refreshTwitterToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  } catch (error) {
    console.error("Error refreshing Twitter token:", error);
    return null;
  }
}
