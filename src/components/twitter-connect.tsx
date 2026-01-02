"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unlink
} from "lucide-react";

interface TwitterConnectProps {
  isConnected?: boolean;
  twitterUsername?: string;
  lastSyncAt?: Date | null;
  enableRealtimeSync?: boolean;
  onConnectionChange?: () => void;
}

export function TwitterConnect({
  isConnected = false,
  twitterUsername,
  lastSyncAt,
  enableRealtimeSync = false,
  onConnectionChange,
}: TwitterConnectProps) {
  const { update } = useSession();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(enableRealtimeSync);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleConnect = async () => {
    setError("");
    setIsConnecting(true);

    // Use signIn to start Twitter OAuth - it will redirect back after completion
    await signIn("twitter", {
      callbackUrl: "/dashboard?twitter_connected=true",
    });
  };

  const handleDisconnect = async () => {
    setError("");
    setSuccess("");
    setIsDisconnecting(true);

    try {
      const res = await fetch("/api/auth/twitter/connect", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      setSuccess("Twitter disconnected successfully");
      await update(); // Refresh session
      onConnectionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSync = async () => {
    setError("");
    setSuccess("");
    setIsSyncing(true);

    try {
      const res = await fetch("/api/bookmarks/sync", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }

      setSuccess("Bookmarks synced successfully!");
      onConnectionChange?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRealtimeToggle = async (enabled: boolean) => {
    setRealtimeEnabled(enabled);

    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableRealtimeSync: enabled }),
      });
    } catch {
      // Revert on error
      setRealtimeEnabled(!enabled);
    }
  };

  const formatLastSync = (date: Date | null | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X (Twitter) Connection
        </CardTitle>
        <CardDescription>
          Connect your X account to sync and analyze your bookmarks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </div>
        )}

        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">@{twitterUsername}</p>
                  <p className="text-sm text-muted-foreground">
                    Last sync: {formatLastSync(lastSyncAt)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Unlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="realtime-sync" className="font-medium">
                  Real-time Updates
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically sync new bookmarks
                </p>
              </div>
              <Switch
                id="realtime-sync"
                checked={realtimeEnabled}
                onCheckedChange={handleRealtimeToggle}
              />
            </div>

            <Button onClick={handleSync} disabled={isSyncing} className="w-full">
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Bookmarks Now
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <svg
                viewBox="0 0 24 24"
                className="mx-auto h-12 w-12 fill-muted-foreground/50"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <h3 className="mt-4 font-medium">Not Connected</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect your X account to start syncing your bookmarks
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              )}
              Connect X Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
