"use client";

import { useState } from "react";
import {
  Twitter,
  Youtube,
  MessageSquare,
  Link2,
  RefreshCw,
  Plus,
  Check,
  AlertCircle,
  ChevronDown,
  Loader2,
  ExternalLink,
  Clipboard,
} from "lucide-react";

type Platform = "twitter" | "youtube" | "reddit" | "manual";

interface SyncStatus {
  platform: Platform;
  connected: boolean;
  lastSync?: Date;
  count?: number;
  syncing?: boolean;
}

interface SyncHubProps {
  twitterConnected?: boolean;
  twitterUsername?: string;
  lastSyncAt?: Date | null;
  bookmarkCount?: number;
  onSyncTwitter?: () => Promise<void>;
  onAddResource?: (url: string, platform: Platform) => Promise<void>;
}

export function SyncHub({
  twitterConnected = false,
  twitterUsername,
  lastSyncAt,
  bookmarkCount = 0,
  onSyncTwitter,
  onAddResource,
}: SyncHubProps) {
  const [expanded, setExpanded] = useState<Platform | null>(null);
  const [syncing, setSyncing] = useState<Platform | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addStatus, setAddStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleSync = async (platform: Platform) => {
    setSyncing(platform);
    try {
      if (platform === "twitter" && onSyncTwitter) {
        await onSyncTwitter();
      }
      // YouTube and Reddit sync would go here
    } finally {
      setSyncing(null);
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    const url = urlInput.trim();
    let platform: Platform = "manual";

    // Detect platform from URL
    if (/youtube\.com|youtu\.be/i.test(url)) {
      platform = "youtube";
    } else if (/reddit\.com|redd\.it/i.test(url)) {
      platform = "reddit";
    } else if (/twitter\.com|x\.com/i.test(url)) {
      platform = "twitter";
    }

    try {
      if (onAddResource) {
        await onAddResource(url, platform);
      }
      setAddStatus({ success: true, message: "Resource added!" });
      setUrlInput("");
    } catch {
      setAddStatus({ success: false, message: "Failed to add" });
    }

    setTimeout(() => setAddStatus(null), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrlInput(text);
    } catch {
      // Clipboard access denied
    }
  };

  const platforms = [
    {
      id: "twitter" as Platform,
      name: "X / Twitter",
      icon: Twitter,
      color: "text-sky-400",
      bgColor: "bg-sky-500/10 hover:bg-sky-500/20",
      borderColor: "border-sky-500/20",
      connected: twitterConnected,
      username: twitterUsername,
      count: bookmarkCount,
      lastSync: lastSyncAt,
    },
    {
      id: "youtube" as Platform,
      name: "YouTube",
      icon: Youtube,
      color: "text-red-400",
      bgColor: "bg-red-500/10 hover:bg-red-500/20",
      borderColor: "border-red-500/20",
      connected: false,
      description: "Add YouTube videos to learn from",
    },
    {
      id: "reddit" as Platform,
      name: "Reddit",
      icon: MessageSquare,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
      borderColor: "border-orange-500/20",
      connected: false,
      description: "Import educational Reddit posts",
    },
  ];

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
      {/* Header with Quick Add */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
              placeholder="Paste any URL to learn from..."
              className="w-full pl-10 pr-20 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
            />
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={handlePaste}
                className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white/60 transition-colors"
                title="Paste from clipboard"
              >
                <Clipboard className="h-4 w-4" />
              </button>
              <button
                onClick={handleAddUrl}
                disabled={!urlInput.trim()}
                className="px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-xs font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
          {addStatus && (
            <span className={`text-xs ${addStatus.success ? "text-emerald-400" : "text-red-400"}`}>
              {addStatus.message}
            </span>
          )}
        </div>
      </div>

      {/* Platform Buttons */}
      <div className="p-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {platforms.map((platform) => (
          <button
            key={platform.id}
            onClick={() => setExpanded(expanded === platform.id ? null : platform.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shrink-0 ${
              expanded === platform.id
                ? `${platform.bgColor} ${platform.borderColor}`
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <platform.icon className={`h-4 w-4 ${platform.color}`} />
            <span className="text-sm text-white font-medium">{platform.name}</span>
            {platform.connected && (
              <span className="flex items-center justify-center w-4 h-4 bg-emerald-500 rounded-full">
                <Check className="h-2.5 w-2.5 text-white" />
              </span>
            )}
            {platform.count !== undefined && platform.count > 0 && (
              <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-white/70">
                {platform.count}
              </span>
            )}
            <ChevronDown className={`h-3 w-3 text-white/40 transition-transform ${expanded === platform.id ? "rotate-180" : ""}`} />
          </button>
        ))}
      </div>

      {/* Expanded Platform Section */}
      {expanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          {expanded === "twitter" && (
            <div className="p-4 rounded-lg bg-sky-500/5 border border-sky-500/20">
              {twitterConnected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <Twitter className="h-5 w-5 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">@{twitterUsername}</p>
                      <p className="text-xs text-white/50">
                        {lastSyncAt
                          ? `Synced ${new Date(lastSyncAt).toLocaleDateString()}`
                          : "Never synced"}
                        {bookmarkCount > 0 && ` · ${bookmarkCount} bookmarks`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSync("twitter")}
                    disabled={syncing === "twitter"}
                    className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    {syncing === "twitter" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Sync Now
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-white/70 mb-3">Connect your X account to sync bookmarks</p>
                  <a
                    href="/api/auth/signin"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                    Connect X Account
                  </a>
                </div>
              )}
            </div>
          )}

          {expanded === "youtube" && (
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Paste YouTube video URL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-red-500/50"
                  />
                  <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm font-medium transition-colors">
                    Add Video
                  </button>
                </div>
                <p className="text-xs text-white/40">
                  Supports: youtube.com, youtu.be links, playlists, and channels
                </p>
              </div>
            </div>
          )}

          {expanded === "reddit" && (
            <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Paste Reddit post URL or search subreddits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-orange-500/50"
                  />
                  <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm font-medium transition-colors">
                    Add Post
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["r/learnprogramming", "r/datascience", "r/MachineLearning", "r/webdev"].map((sub) => (
                    <button
                      key={sub}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white/60 hover:text-white/80 transition-colors"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
