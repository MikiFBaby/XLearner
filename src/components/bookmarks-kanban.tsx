"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Brain,
  FileText,
  GraduationCap,
  Play,
  Loader2,
  ExternalLink,
  MoreHorizontal,
  Image as ImageIcon,
  Wand2,
  MessageSquare,
  ListChecks,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

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
  hasMedia: boolean;
  mediaUrls: string[] | null;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  bgColor: string;
  filter: (bookmark: BookmarkData) => boolean;
}

const columns: KanbanColumn[] = [
  {
    id: "new",
    title: "New",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    filter: (b) => !b.lastProcessedAt && !b.summary,
  },
  {
    id: "processing",
    title: "Processing",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    filter: (b) => b.lastProcessedAt && !b.summary,
  },
  {
    id: "analyzed",
    title: "Analyzed",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    filter: (b) => !!b.summary,
  },
];

async function fetchBookmarks(): Promise<{ data: BookmarkData[] }> {
  const res = await fetch("/api/bookmarks?pageSize=50");
  if (!res.ok) throw new Error("Failed to fetch bookmarks");
  return res.json();
}

function BookmarkCard({
  bookmark,
  onAiAction,
}: {
  bookmark: BookmarkData;
  onAiAction: (action: string, bookmarkId: string) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get the first media URL or generate a placeholder
  const mediaUrl = bookmark.mediaUrls?.[0];
  const hasValidMedia = bookmark.hasMedia && mediaUrl && !imageError;

  // Generate gradient placeholder based on tweet content
  const getPlaceholderGradient = () => {
    const hash = bookmark.tweetId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const gradients = [
      "from-purple-600 to-blue-600",
      "from-pink-600 to-purple-600",
      "from-blue-600 to-cyan-600",
      "from-orange-600 to-red-600",
      "from-green-600 to-teal-600",
      "from-indigo-600 to-purple-600",
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  const handleAction = async (action: string) => {
    setIsProcessing(true);
    try {
      await onAiAction(action, bookmark.id);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="group rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all">
      {/* Image Section */}
      <div className="relative aspect-video w-full overflow-hidden">
        {hasValidMedia ? (
          <img
            src={mediaUrl}
            alt="Tweet media"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${getPlaceholderGradient()} flex items-center justify-center`}
          >
            <div className="text-center text-white/80 p-4">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs opacity-70">AI-generated preview coming soon</p>
            </div>
          </div>
        )}

        {/* AI Badge */}
        {bookmark.summary && (
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-purple-500/90 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3 w-3" />
            AI Analyzed
          </div>
        )}

        {/* External Link */}
        <a
          href={bookmark.tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-purple-400">
            @{bookmark.tweetAuthorHandle}
          </span>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] rounded-xl border border-white/10 bg-[#1a0a2e] p-1.5 shadow-xl"
                align="end"
                sideOffset={5}
              >
                <DropdownMenu.Item
                  onClick={() => handleAction("summarize")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white"
                >
                  <FileText className="h-4 w-4 text-blue-400" />
                  Summarize
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => handleAction("keypoints")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white"
                >
                  <ListChecks className="h-4 w-4 text-green-400" />
                  Extract Key Points
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => handleAction("quiz")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white"
                >
                  <Brain className="h-4 w-4 text-purple-400" />
                  Generate Quiz
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => handleAction("course")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white"
                >
                  <GraduationCap className="h-4 w-4 text-orange-400" />
                  Add to Course
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-white/10" />
                <DropdownMenu.Item
                  onClick={() => handleAction("generateImage")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white"
                >
                  <Wand2 className="h-4 w-4 text-pink-400" />
                  Generate Image
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <p className="text-sm text-gray-300 line-clamp-3 mb-3">
          {bookmark.summary || bookmark.tweetText}
        </p>

        {/* Topics */}
        {bookmark.topics && bookmark.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {bookmark.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400"
              >
                {topic}
              </span>
            ))}
            {bookmark.topics.length > 3 && (
              <span className="text-xs text-gray-500">
                +{bookmark.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* AI Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("analyze")}
            disabled={isProcessing}
            className="flex-1 h-8 text-xs border-white/10 bg-white/5 text-gray-300 hover:bg-purple-500/20 hover:border-purple-500/30 hover:text-purple-300"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            {bookmark.summary ? "Re-analyze" : "Analyze"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("chat")}
            className="h-8 w-8 p-0 border-white/10 bg-white/5 text-gray-300 hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-300"
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction("learn")}
            className="h-8 w-8 p-0 border-white/10 bg-white/5 text-gray-300 hover:bg-green-500/20 hover:border-green-500/30 hover:text-green-300"
          >
            <BookOpen className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BookmarksKanban() {
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks-kanban"],
    queryFn: fetchBookmarks,
  });

  const handleAiAction = async (action: string, bookmarkId: string) => {
    setActiveAction(`${action}-${bookmarkId}`);

    try {
      // TODO: Implement actual AI actions via API
      switch (action) {
        case "analyze":
        case "summarize":
          await fetch(`/api/bookmarks/${bookmarkId}/analyze`, { method: "POST" });
          break;
        case "keypoints":
          await fetch(`/api/bookmarks/${bookmarkId}/keypoints`, { method: "POST" });
          break;
        case "quiz":
          await fetch(`/api/bookmarks/${bookmarkId}/quiz`, { method: "POST" });
          break;
        case "course":
          // Open course selection modal
          break;
        case "generateImage":
          await fetch(`/api/bookmarks/${bookmarkId}/generate-image`, { method: "POST" });
          break;
        case "chat":
          // Open chat modal
          break;
        case "learn":
          // Navigate to learning view
          break;
      }

      // Refresh bookmarks
      queryClient.invalidateQueries({ queryKey: ["bookmarks-kanban"] });
    } catch (error) {
      console.error("AI action failed:", error);
    } finally {
      setActiveAction(null);
    }
  };

  const bookmarks = data?.data || [];

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8 text-center">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Bookmarks Yet</h3>
          <p className="text-gray-400 max-w-sm">
            Sync your X bookmarks to start using AI-powered features to analyze, summarize, and learn from your saved content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Kanban Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          AI Learning Board
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <Brain className="h-4 w-4 mr-2" />
            Analyze All New
          </Button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const columnBookmarks = bookmarks.filter(column.filter);

          return (
            <div key={column.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${column.bgColor}`} />
                  <h3 className={`font-medium ${column.color}`}>{column.title}</h3>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {columnBookmarks.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="space-y-3 min-h-[200px]">
                {columnBookmarks.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-white/10 p-6 text-center">
                    <p className="text-sm text-gray-500">No bookmarks</p>
                  </div>
                ) : (
                  columnBookmarks.map((bookmark) => (
                    <BookmarkCard
                      key={bookmark.id}
                      bookmark={bookmark}
                      onAiAction={handleAiAction}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
