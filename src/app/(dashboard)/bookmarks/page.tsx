"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "next-auth/react";
import {
  AlertCircle,
  Bookmark,
  ExternalLink,
  Filter,
  Heart,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface BookmarkData {
  id: string;
  tweetId: string;
  tweetText: string;
  tweetAuthorHandle: string;
  tweetAuthorName: string;
  tweetUrl: string;
  tweetLikes: number;
  tweetRetweets: number;
  bookmarkedAt: string;
  summary: string | null;
  topics: string[];
  learningDepth: string | null;
  lastProcessedAt: string | null;
}

interface BookmarksResponse {
  success: boolean;
  data: BookmarkData[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

async function fetchBookmarks(page = 1, pageSize = 20): Promise<BookmarksResponse> {
  const res = await fetch(`/api/bookmarks?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error("Failed to fetch bookmarks");
  return res.json();
}

function BookmarkCard({ bookmark }: { bookmark: BookmarkData }) {
  const isProcessed = !!bookmark.lastProcessedAt;

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-4 hover:bg-white/10 transition-all">
      <div className="flex flex-col gap-3">
        {/* Author and actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">@{bookmark.tweetAuthorHandle}</span>
            {isProcessed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400">
                <Sparkles className="h-3 w-3" />
                Analyzed
              </span>
            )}
          </div>
          <a
            href={bookmark.tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-300">
          {bookmark.summary || bookmark.tweetText}
        </p>

        {/* Topics */}
        {bookmark.topics && bookmark.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bookmark.topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {bookmark.tweetLikes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {bookmark.tweetRetweets}
            </span>
          </div>
          <span>{formatRelativeTime(bookmark.bookmarkedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function BookmarkSkeleton() {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="h-16 w-full bg-white/10 rounded animate-pulse" />
        <div className="flex gap-1">
          <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-5 w-16 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bookmarks", page],
    queryFn: () => fetchBookmarks(page),
  });

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      const res = await fetch("/api/bookmarks/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setSyncError("Twitter access token missing or expired. Please re-authenticate with Twitter.");
        } else {
          setSyncError(data.error || "Failed to sync bookmarks");
        }
        return;
      }

      setSyncSuccess(`Synced ${data.data?.newBookmarks || 0} new bookmarks!`);
      await refetch();
    } catch (err) {
      setSyncError("Failed to sync bookmarks. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReAuth = () => {
    signIn("twitter", { callbackUrl: "/bookmarks" });
  };

  const bookmarks = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-white">
            <Bookmark className="h-8 w-8" />
            Bookmarks
          </h1>
          <p className="text-gray-400">
            {pagination?.total || 0} bookmarks synced from X
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0"
        >
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Bookmarks
        </Button>
      </div>

      {/* Error message */}
      {syncError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{syncError}</p>
            {syncError.includes("re-authenticate") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReAuth}
                className="mt-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                Re-authenticate with Twitter
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Success message */}
      {syncSuccess && (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
          <Sparkles className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400">{syncSuccess}</p>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        <Button variant="outline" className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Bookmarks grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <BookmarkSkeleton key={i} />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 text-center">
          <Bookmark className="h-12 w-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No bookmarks yet</h3>
          <p className="text-gray-400 mb-4">
            Click &quot;Sync Bookmarks&quot; to import your X bookmarks
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevious}
                className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
