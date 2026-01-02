"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bookmark,
  ExternalLink,
  Filter,
  Heart,
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
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Author and actions */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">@{bookmark.tweetAuthorHandle}</span>
              {isProcessed && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Analyzed
                </Badge>
              )}
            </div>
            <a
              href={bookmark.tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Content */}
          <p className="text-sm">
            {bookmark.summary || bookmark.tweetText}
          </p>

          {/* Topics */}
          {bookmark.topics.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bookmark.topics.map((topic) => (
                <Badge key={topic} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}

function BookmarkSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookmarksPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["bookmarks", page],
    queryFn: () => fetchBookmarks(page),
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch("/api/bookmarks/sync", { method: "POST" });
      await refetch();
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const bookmarks = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bookmark className="h-8 w-8" />
            Bookmarks
          </h1>
          <p className="text-muted-foreground">
            {pagination?.total || 0} bookmarks synced from X
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          Sync Bookmarks
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
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
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No bookmarks yet</CardTitle>
            <CardDescription>
              Click &quot;Sync Bookmarks&quot; to import your X bookmarks
            </CardDescription>
          </CardHeader>
        </Card>
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
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
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
