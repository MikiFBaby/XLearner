"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Brain,
  FileText,
  GraduationCap,
  Loader2,
  ExternalLink,
  MoreHorizontal,
  Image as ImageIcon,
  Wand2,
  MessageSquare,
  ListChecks,
  BookOpen,
  Play,
  Heart,
  Repeat2,
  Filter,
  LayoutGrid,
  List,
  Search,
  Plus,
  Youtube,
  Twitter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";

// Platform types
type Platform = "twitter" | "reddit" | "youtube" | "manual";

// Category types with colors
const CATEGORIES = {
  technology: { label: "Technology", color: "bg-blue-500", textColor: "text-blue-400" },
  business: { label: "Business", color: "bg-green-500", textColor: "text-green-400" },
  science: { label: "Science", color: "bg-purple-500", textColor: "text-purple-400" },
  design: { label: "Design", color: "bg-pink-500", textColor: "text-pink-400" },
  productivity: { label: "Productivity", color: "bg-orange-500", textColor: "text-orange-400" },
  ai: { label: "AI & ML", color: "bg-cyan-500", textColor: "text-cyan-400" },
  programming: { label: "Programming", color: "bg-indigo-500", textColor: "text-indigo-400" },
  finance: { label: "Finance", color: "bg-emerald-500", textColor: "text-emerald-400" },
  health: { label: "Health", color: "bg-red-500", textColor: "text-red-400" },
  other: { label: "Other", color: "bg-gray-500", textColor: "text-gray-400" },
} as const;

type CategoryKey = keyof typeof CATEGORIES;

// Platform configs
const PLATFORMS = {
  twitter: {
    name: "X",
    icon: Twitter,
    color: "bg-black",
    borderColor: "border-gray-700",
  },
  reddit: {
    name: "Reddit",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
    color: "bg-orange-600",
    borderColor: "border-orange-500",
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    color: "bg-red-600",
    borderColor: "border-red-500",
  },
  manual: {
    name: "Manual",
    icon: BookOpen,
    color: "bg-purple-600",
    borderColor: "border-purple-500",
  },
};

interface ResourceData {
  id: string;
  platform: Platform;
  sourceId: string;
  title: string;
  content: string;
  authorName: string;
  authorHandle: string;
  sourceUrl: string;
  likes: number;
  shares: number;
  savedAt: string;
  summary: string | null;
  topics: string[];
  category: CategoryKey | null;
  hasMedia: boolean;
  mediaUrls: string[] | null;
  isProcessed: boolean;
  thumbnailUrl?: string;
  duration?: number; // For videos
}

// Map bookmarks to resources
function mapBookmarkToResource(bookmark: any): ResourceData {
  // Infer category from topics
  const inferCategory = (topics: string[]): CategoryKey | null => {
    if (!topics || topics.length === 0) return null;
    const topicLower = topics.map(t => t.toLowerCase());
    if (topicLower.some(t => t.includes("ai") || t.includes("machine learning") || t.includes("gpt"))) return "ai";
    if (topicLower.some(t => t.includes("code") || t.includes("programming") || t.includes("developer"))) return "programming";
    if (topicLower.some(t => t.includes("tech") || t.includes("software"))) return "technology";
    if (topicLower.some(t => t.includes("design") || t.includes("ui") || t.includes("ux"))) return "design";
    if (topicLower.some(t => t.includes("business") || t.includes("startup"))) return "business";
    if (topicLower.some(t => t.includes("productivity"))) return "productivity";
    if (topicLower.some(t => t.includes("finance") || t.includes("crypto") || t.includes("money"))) return "finance";
    if (topicLower.some(t => t.includes("health") || t.includes("fitness"))) return "health";
    if (topicLower.some(t => t.includes("science"))) return "science";
    return "other";
  };

  return {
    id: bookmark.id,
    platform: "twitter",
    sourceId: bookmark.tweetId,
    title: bookmark.tweetText?.slice(0, 100) + (bookmark.tweetText?.length > 100 ? "..." : ""),
    content: bookmark.tweetText,
    authorName: bookmark.tweetAuthorName,
    authorHandle: bookmark.tweetAuthorHandle,
    sourceUrl: bookmark.tweetUrl,
    likes: bookmark.tweetLikes || 0,
    shares: bookmark.tweetRetweets || 0,
    savedAt: bookmark.bookmarkedAt,
    summary: bookmark.summary,
    topics: bookmark.topics || [],
    category: inferCategory(bookmark.topics || []),
    hasMedia: bookmark.hasMedia,
    mediaUrls: bookmark.mediaUrls,
    isProcessed: !!bookmark.lastProcessedAt || !!bookmark.summary,
  };
}

async function fetchResources(): Promise<ResourceData[]> {
  const res = await fetch("/api/bookmarks?pageSize=100");
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return (data.data || []).map(mapBookmarkToResource);
}

// Platform Badge Component
function PlatformBadge({ platform }: { platform: Platform }) {
  const config = PLATFORMS[platform];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1 rounded-full ${config.color} px-2 py-1 text-xs font-medium text-white`}>
      <Icon className="h-3 w-3" />
      {config.name}
    </div>
  );
}

// Category Badge Component
function CategoryBadge({ category }: { category: CategoryKey }) {
  const config = CATEGORIES[category];

  return (
    <span className={`inline-flex items-center rounded-full ${config.color}/20 px-2 py-1 text-xs font-medium ${config.textColor}`}>
      {config.label}
    </span>
  );
}

// Resource Card Component
function ResourceCard({
  resource,
  onAiAction,
  view,
}: {
  resource: ResourceData;
  onAiAction: (action: string, resourceId: string) => void;
  view: "grid" | "list";
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);

  const mediaUrl = resource.mediaUrls?.[0] || resource.thumbnailUrl;
  const hasValidMedia = (resource.hasMedia && mediaUrl && !imageError) || resource.thumbnailUrl;

  // Generate gradient placeholder
  const getPlaceholderGradient = () => {
    const hash = resource.id.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    const gradients = [
      "from-purple-600 via-pink-500 to-red-500",
      "from-blue-600 via-cyan-500 to-teal-500",
      "from-orange-600 via-amber-500 to-yellow-500",
      "from-green-600 via-emerald-500 to-cyan-500",
      "from-indigo-600 via-purple-500 to-pink-500",
      "from-rose-600 via-pink-500 to-purple-500",
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  const handleAction = async (action: string) => {
    setIsProcessing(true);
    try {
      await onAiAction(action, resource.id);
    } finally {
      setIsProcessing(false);
    }
  };

  if (view === "list") {
    return (
      <div className="group flex gap-4 rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-all">
        {/* Thumbnail */}
        <div className="relative w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
          {hasValidMedia ? (
            <img
              src={mediaUrl}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderGradient()}`} />
          )}
          <div className="absolute top-1 left-1">
            <PlatformBadge platform={resource.platform} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white line-clamp-2">{resource.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">@{resource.authorHandle}</span>
                {resource.category && <CategoryBadge category={resource.category} />}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction("analyze")}
              disabled={isProcessing}
              className="h-8 border-white/10 bg-white/5 text-gray-300 hover:bg-purple-500/20"
            >
              {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (card)
  return (
    <div className="group rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
      {/* Image Section */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {hasValidMedia ? (
          <img
            src={mediaUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderGradient()} flex items-center justify-center`}>
            <div className="text-center text-white/60 p-4">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
            </div>
          </div>
        )}

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Platform Badge */}
        <div className="absolute top-3 left-3">
          <PlatformBadge platform={resource.platform} />
        </div>

        {/* AI Processed Badge */}
        {resource.isProcessed && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-purple-500/90 backdrop-blur-sm px-2 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3 w-3" />
            AI
          </div>
        )}

        {/* Duration for videos */}
        {resource.duration && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
            <Play className="h-3 w-3" />
            {Math.floor(resource.duration / 60)}:{(resource.duration % 60).toString().padStart(2, "0")}
          </div>
        )}

        {/* External Link */}
        <a
          href={resource.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 left-3 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Author & Category */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-purple-400">@{resource.authorHandle}</span>
          {resource.category && <CategoryBadge category={resource.category} />}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-300 line-clamp-3 mb-3">
          {resource.summary || resource.content}
        </p>

        {/* Topics */}
        {resource.topics && resource.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {resource.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400"
              >
                #{topic}
              </span>
            ))}
            {resource.topics.length > 3 && (
              <span className="text-xs text-gray-500">+{resource.topics.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {resource.likes.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 className="h-3 w-3" />
            {resource.shares.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleAction("analyze")}
            disabled={isProcessing}
            className="flex-1 h-9 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0 text-xs"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            {resource.isProcessed ? "Re-analyze" : "Analyze"}
          </Button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-9 p-0 border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
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
                  Key Points
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
                  onClick={() => handleAction("chat")}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white"
                >
                  <MessageSquare className="h-4 w-4 text-cyan-400" />
                  Chat About This
                </DropdownMenu.Item>
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
      </div>
    </div>
  );
}

// Add Resource Modal Placeholder
function AddResourceButton() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-0">
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[200px] rounded-xl border border-white/10 bg-[#1a0a2e] p-1.5 shadow-xl"
          align="end"
          sideOffset={5}
        >
          <DropdownMenu.Item className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white">
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              <Youtube className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium">YouTube Video</p>
              <p className="text-xs text-gray-500">Paste a video URL</p>
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white">
            <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center">
              {PLATFORMS.reddit.icon({ className: "h-4 w-4 text-white" })}
            </div>
            <div>
              <p className="font-medium">Reddit Post</p>
              <p className="text-xs text-gray-500">Search or paste URL</p>
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none cursor-pointer hover:bg-white/10 hover:text-white">
            <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium">Manual Entry</p>
              <p className="text-xs text-gray-500">Add any content</p>
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function LearningWall() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | "all">("all");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | "all">("all");

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["learning-resources"],
    queryFn: fetchResources,
  });

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!r.content.toLowerCase().includes(query) && !r.authorHandle.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
      if (selectedPlatform !== "all" && r.platform !== selectedPlatform) return false;
      return true;
    });
  }, [resources, searchQuery, selectedCategory, selectedPlatform]);

  const handleAiAction = async (action: string, resourceId: string) => {
    try {
      switch (action) {
        case "analyze":
        case "summarize":
          await fetch(`/api/bookmarks/${resourceId}/analyze`, { method: "POST" });
          break;
        case "keypoints":
          await fetch(`/api/bookmarks/${resourceId}/keypoints`, { method: "POST" });
          break;
        case "quiz":
          await fetch(`/api/bookmarks/${resourceId}/quiz`, { method: "POST" });
          break;
      }
      queryClient.invalidateQueries({ queryKey: ["learning-resources"] });
    } catch (error) {
      console.error("AI action failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-12">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400 mb-4" />
          <p className="text-gray-400">Loading your learning resources...</p>
        </div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-12 text-center">
        <div className="flex flex-col items-center max-w-md mx-auto">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Build Your Learning Library</h3>
          <p className="text-gray-400 mb-6">
            Sync your X bookmarks, add YouTube videos, Reddit posts, and more to create your personalized curriculum.
          </p>
          <AddResourceButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Learning Library
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {filteredResources.length} resources from {new Set(resources.map(r => r.platform)).size} platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddResourceButton />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
          <Button
            size="sm"
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className={selectedCategory === "all"
              ? "bg-purple-500 hover:bg-purple-600 border-0"
              : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            }
          >
            All
          </Button>
          {Object.entries(CATEGORIES).slice(0, 6).map(([key, config]) => (
            <Button
              key={key}
              size="sm"
              variant={selectedCategory === key ? "default" : "outline"}
              onClick={() => setSelectedCategory(key as CategoryKey)}
              className={selectedCategory === key
                ? `${config.color} hover:opacity-90 border-0`
                : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              }
            >
              {config.label}
            </Button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-white/10 rounded-lg p-1 bg-white/5">
          <button
            onClick={() => setView("grid")}
            className={`p-2 rounded-md transition-colors ${view === "grid" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2 rounded-md transition-colors ${view === "list" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Resource Wall */}
      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onAiAction={handleAiAction}
              view="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onAiAction={handleAiAction}
              view="list"
            />
          ))}
        </div>
      )}

      {/* Empty State for Filters */}
      {filteredResources.length === 0 && resources.length > 0 && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
          <Filter className="h-10 w-10 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No matching resources</h3>
          <p className="text-gray-400">Try adjusting your filters or search query</p>
        </div>
      )}
    </div>
  );
}
