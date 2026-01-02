"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Twitter,
  Youtube,
  MessageSquare,
  Globe,
  Play,
  BookOpen,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Heart,
  ExternalLink,
  CheckCircle,
  Clock,
  Code,
  Lightbulb,
  Zap,
  Flame,
  Star,
  TrendingUp,
} from "lucide-react";

type Platform = "twitter" | "youtube" | "reddit" | "manual" | "all";
type Category = "all" | "tech" | "science" | "business" | "creative" | "language" | "other";

interface Resource {
  id: string;
  title: string;
  description: string;
  platform: Platform;
  category: Category;
  thumbnailUrl?: string;
  mediaUrls?: string[];
  hasMedia: boolean;
  url: string;
  author: string;
  authorHandle?: string;
  createdAt: Date;
  isCompleted?: boolean;
  progress?: number; // 0-100
  xpReward?: number;
}

interface ResourceGridProps {
  initialResources?: Resource[];
  columns?: 3 | 4 | 5;
  rows?: 2 | 3 | 4;
}

// Platform badge component
function PlatformBadge({ platform }: { platform: Platform }) {
  const config = {
    twitter: { icon: Twitter, bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/30" },
    youtube: { icon: Youtube, bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    reddit: { icon: MessageSquare, bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    manual: { icon: Globe, bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    all: { icon: Globe, bg: "bg-white/20", text: "text-white", border: "border-white/30" },
  }[platform];

  const Icon = config.icon;

  return (
    <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${config.bg} border ${config.border} backdrop-blur-sm`}>
      <Icon className={`h-3.5 w-3.5 ${config.text}`} />
    </div>
  );
}

// Category pill component
function CategoryPill({ category, active, onClick }: { category: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active
          ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
          : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
      }`}
    >
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </button>
  );
}

// Helper to extract YouTube video ID and get thumbnail
function getYouTubeThumbnail(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/i,
    /youtube\.com\/shorts\/([^&?/]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }
  return null;
}

// Platform-specific placeholder component
function PlatformPlaceholder({ platform, category }: { platform: Platform; category: Category }) {
  const platformConfig = {
    twitter: {
      gradient: "from-sky-600 via-blue-600 to-indigo-700",
      icon: Twitter,
      pattern: "radial-gradient(circle at 20% 80%, rgba(56, 189, 248, 0.3) 0%, transparent 50%)",
    },
    youtube: {
      gradient: "from-red-600 via-rose-600 to-pink-700",
      icon: Youtube,
      pattern: "radial-gradient(circle at 80% 20%, rgba(248, 113, 113, 0.3) 0%, transparent 50%)",
    },
    reddit: {
      gradient: "from-orange-600 via-amber-600 to-yellow-700",
      icon: MessageSquare,
      pattern: "radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.3) 0%, transparent 50%)",
    },
    manual: {
      gradient: "from-purple-600 via-violet-600 to-fuchsia-700",
      icon: Globe,
      pattern: "radial-gradient(circle at 30% 70%, rgba(167, 139, 250, 0.3) 0%, transparent 50%)",
    },
    all: {
      gradient: "from-slate-600 via-gray-600 to-zinc-700",
      icon: Globe,
      pattern: "none",
    },
  };

  const categoryIcons = {
    tech: Code,
    science: Lightbulb,
    business: TrendingUp,
    creative: Star,
    language: BookOpen,
    other: Zap,
    all: Sparkles,
  };

  const config = platformConfig[platform];
  const CategoryIcon = categoryIcons[category] || Flame;
  const PlatformIcon = config.icon;

  return (
    <div
      className={`w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center relative overflow-hidden`}
      style={{ backgroundImage: config.pattern }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 left-4 w-16 h-16 border border-white/20 rounded-full" />
        <div className="absolute bottom-4 right-4 w-24 h-24 border border-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white/10 rounded-full" />
      </div>

      {/* Main icon */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 shadow-xl">
          <PlatformIcon className="h-8 w-8 text-white" />
        </div>
        <div className="mt-2 flex items-center gap-1 px-2 py-1 bg-black/20 rounded-full">
          <CategoryIcon className="h-3 w-3 text-white/70" />
          <span className="text-[10px] text-white/70 font-medium uppercase tracking-wider">
            {category === "all" ? "Resource" : category}
          </span>
        </div>
      </div>
    </div>
  );
}

// Resource card component
function ResourceCard({ resource, onAction }: { resource: Resource; onAction: (action: string) => void }) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Try to get thumbnail - prioritize media URLs, then YouTube auto-thumbnail
  const getDisplayImage = (): string | null => {
    // First try existing media URLs
    if (resource.mediaUrls?.[0] && !imageError) {
      return resource.mediaUrls[0];
    }
    if (resource.thumbnailUrl && !imageError) {
      return resource.thumbnailUrl;
    }
    // For YouTube, auto-generate thumbnail
    if (resource.platform === "youtube" || resource.url?.includes("youtube") || resource.url?.includes("youtu.be")) {
      return getYouTubeThumbnail(resource.url);
    }
    return null;
  };

  const displayImage = getDisplayImage();
  const hasValidMedia = displayImage && !imageError;

  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-video overflow-hidden">
        {hasValidMedia ? (
          <img
            src={displayImage}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <PlatformPlaceholder platform={resource.platform} category={resource.category} />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        {/* Platform Badge */}
        <div className="absolute top-2 left-2">
          <PlatformBadge platform={resource.platform} />
        </div>

        {/* Progress indicator */}
        {resource.progress !== undefined && resource.progress > 0 && !resource.isCompleted && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-black/50 rounded-full backdrop-blur-sm">
              <Clock className="h-3 w-3 text-cyan-400" />
              <span className="text-xs text-white font-medium">{resource.progress}%</span>
            </div>
          </div>
        )}

        {/* Completed badge */}
        {resource.isCompleted && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/80 rounded-full backdrop-blur-sm">
              <CheckCircle className="h-3 w-3 text-white" />
              <span className="text-xs text-white font-medium">Done</span>
            </div>
          </div>
        )}

        {/* XP Reward */}
        {resource.xpReward && !resource.isCompleted && (
          <div className="absolute bottom-2 right-2">
            <div className="px-2 py-1 bg-purple-500/80 rounded-full backdrop-blur-sm">
              <span className="text-xs text-white font-bold">+{resource.xpReward} XP</span>
            </div>
          </div>
        )}

        {/* Hover Actions */}
        <div className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
          <button
            onClick={() => window.open(resource.url, "_blank")}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            title="Open"
          >
            <ExternalLink className="h-5 w-5" />
          </button>
          <button
            onClick={() => onAction("learn")}
            className="p-3 bg-purple-500 hover:bg-purple-600 rounded-full text-white transition-colors shadow-lg shadow-purple-500/30"
            title="Start Learning"
          >
            <Play className="h-5 w-5" />
          </button>
          <button
            onClick={() => onAction("bookmark")}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            title="Save"
          >
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1 group-hover:text-purple-300 transition-colors">
          {resource.title || resource.description?.slice(0, 60) || "Untitled Resource"}
        </h3>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="truncate">{resource.author}</span>
          {resource.authorHandle && (
            <>
              <span>·</span>
              <span className="text-white/40">@{resource.authorHandle}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResourceGrid({ columns = 4, rows = 4 }: ResourceGridProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("all");
  const [selectedCategory, setSelectedCategory] = useState<Category>("all");
  const [currentPage, setCurrentPage] = useState(0);

  // Fetch bookmarks (Twitter)
  const { data: bookmarksData, isLoading: loadingBookmarks } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const res = await fetch("/api/bookmarks?pageSize=100");
      const data = await res.json();
      return data.data || [];
    },
  });

  // Fetch resources (YouTube, Reddit, Manual)
  const { data: resourcesData, isLoading: loadingResources } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/resources?pageSize=100");
        if (!res.ok) return [];
        const data = await res.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
  });

  const isLoading = loadingBookmarks || loadingResources;

  // Transform bookmarks to resources
  const bookmarkResources: Resource[] = (bookmarksData || []).map((b: any) => {
    // Check if the tweet contains a YouTube link
    const youtubeMatch = b.tweetText?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]+)/i);
    const hasYouTubeLink = !!youtubeMatch;

    return {
      id: b.id,
      title: b.tweetText?.slice(0, 100) || "",
      description: b.tweetText || "",
      platform: "twitter" as Platform,
      category: detectCategory(b.topics || []),
      thumbnailUrl: hasYouTubeLink
        ? `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`
        : b.mediaUrls?.[0],
      mediaUrls: b.mediaUrls,
      hasMedia: b.hasMedia || hasYouTubeLink,
      url: b.tweetUrl,
      author: b.tweetAuthorName,
      authorHandle: b.tweetAuthorHandle,
      createdAt: new Date(b.createdAt || b.bookmarkedAt),
      isCompleted: false,
      progress: 0,
      xpReward: 25,
    };
  });

  // Transform resources from resources API
  const otherResources: Resource[] = (resourcesData || []).map((r: any) => ({
    id: r.id,
    title: r.title || r.url,
    description: r.description || "",
    platform: r.platform as Platform,
    category: detectCategory(r.topics || []),
    thumbnailUrl: r.thumbnailUrl || (r.platform === "youtube" ? getYouTubeThumbnail(r.url) : null),
    mediaUrls: r.thumbnailUrl ? [r.thumbnailUrl] : undefined,
    hasMedia: !!r.thumbnailUrl || r.platform === "youtube",
    url: r.url,
    author: r.authorName || "Unknown",
    authorHandle: r.authorHandle,
    createdAt: new Date(r.addedAt || r.createdAt),
    isCompleted: false,
    progress: 0,
    xpReward: r.platform === "youtube" ? 50 : 25,
  }));

  // Combine all resources
  const resources: Resource[] = [...bookmarkResources, ...otherResources].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Filter resources
  const filteredResources = resources.filter((r) => {
    if (selectedPlatform !== "all" && r.platform !== selectedPlatform) return false;
    if (selectedCategory !== "all" && r.category !== selectedCategory) return false;
    return true;
  });

  // Pagination
  const itemsPerPage = columns * rows;
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const currentResources = filteredResources.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const platforms: Platform[] = ["all", "twitter", "youtube", "reddit"];
  const categories: Category[] = ["all", "tech", "science", "business", "creative", "language"];

  const handleAction = (action: string, resourceId: string) => {
    console.log("Action:", action, "Resource:", resourceId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Learning Resources
          </h2>
          <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/60">
            {filteredResources.length} items
          </span>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
          {platforms.map((platform) => {
            const Icon = platform === "all" ? Grid3X3 :
              platform === "twitter" ? Twitter :
              platform === "youtube" ? Youtube : MessageSquare;
            return (
              <button
                key={platform}
                onClick={() => {
                  setSelectedPlatform(platform);
                  setCurrentPage(0);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedPlatform === platform
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline capitalize">{platform}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <CategoryPill
            key={category}
            category={category}
            active={selectedCategory === category}
            onClick={() => {
              setSelectedCategory(category);
              setCurrentPage(0);
            }}
          />
        ))}
      </div>

      {/* Resource Grid */}
      {currentResources.length > 0 ? (
        <>
          <div
            className={`grid gap-4`}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {currentResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onAction={(action) => handleAction(action, resource.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pageNum = totalPages <= 5 ? i :
                    currentPage < 3 ? i :
                    currentPage > totalPages - 3 ? totalPages - 5 + i :
                    currentPage - 2 + i;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-purple-500 text-white"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-white/30" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No resources yet</h3>
          <p className="text-sm text-white/50 max-w-md">
            Sync your bookmarks or paste a URL above to start building your learning library
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to detect category from topics
function detectCategory(topics: string[]): Category {
  const topicsLower = topics.map(t => t.toLowerCase());

  if (topicsLower.some(t => ["programming", "coding", "javascript", "python", "react", "ai", "ml", "software", "web", "data"].includes(t))) {
    return "tech";
  }
  if (topicsLower.some(t => ["science", "physics", "biology", "chemistry", "research", "math"].includes(t))) {
    return "science";
  }
  if (topicsLower.some(t => ["business", "startup", "marketing", "finance", "investing", "entrepreneur"].includes(t))) {
    return "business";
  }
  if (topicsLower.some(t => ["design", "art", "creative", "music", "writing", "photo"].includes(t))) {
    return "creative";
  }
  if (topicsLower.some(t => ["language", "english", "spanish", "learn", "vocabulary"].includes(t))) {
    return "language";
  }

  return "other";
}
