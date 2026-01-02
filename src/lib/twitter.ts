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
  attachments?: {
    media_keys?: string[];
  };
}

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string;
  preview_image_url?: string;
}

interface TwitterBookmarksResponse {
  data?: TwitterBookmark[];
  includes?: {
    users?: TwitterUser[];
    media?: TwitterMedia[];
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
  tweetAuthorProfileImage: string | null;
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
      "created_at,public_metrics,entities,author_id,attachments"
    );
    url.searchParams.set("expansions", "author_id,attachments.media_keys");
    url.searchParams.set("user.fields", "name,username,profile_image_url");
    url.searchParams.set("media.fields", "url,preview_image_url,type");

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

    // Create a map of media for quick lookup
    const mediaMap = new Map<string, TwitterMedia>();
    if (data.includes?.media) {
      for (const media of data.includes.media) {
        mediaMap.set(media.media_key, media);
      }
    }

    // Parse bookmarks
    const bookmarks: ParsedBookmark[] = data.data.map((tweet) => {
      const author = usersMap.get(tweet.author_id);

      // Get media URLs for this tweet
      const mediaUrls: string[] = [];
      if (tweet.attachments?.media_keys) {
        for (const mediaKey of tweet.attachments.media_keys) {
          const media = mediaMap.get(mediaKey);
          if (media) {
            // For photos, use url; for videos/gifs, use preview_image_url
            const mediaUrl = media.url || media.preview_image_url;
            if (mediaUrl) {
              mediaUrls.push(mediaUrl);
            }
          }
        }
      }

      return {
        tweetId: tweet.id,
        tweetText: tweet.text,
        tweetAuthorId: tweet.author_id,
        tweetAuthorName: author?.name || "Unknown",
        tweetAuthorHandle: author?.username || "unknown",
        tweetAuthorProfileImage: author?.profile_image_url?.replace("_normal", "_400x400") || null,
        tweetCreatedAt: new Date(tweet.created_at),
        tweetLikes: tweet.public_metrics?.like_count || 0,
        tweetRetweets: tweet.public_metrics?.retweet_count || 0,
        tweetUrl: `https://twitter.com/${author?.username || "i"}/status/${tweet.id}`,
        hasMedia: mediaUrls.length > 0,
        mediaUrls,
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
