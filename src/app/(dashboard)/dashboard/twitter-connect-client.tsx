"use client";

import { TwitterConnect } from "@/components/twitter-connect";
import { useRouter } from "next/navigation";

interface TwitterConnectClientProps {
  isConnected: boolean;
  twitterUsername?: string;
  lastSyncAt?: Date | null;
  enableRealtimeSync: boolean;
}

export function TwitterConnectClient(props: TwitterConnectClientProps) {
  const router = useRouter();

  const handleConnectionChange = () => {
    router.refresh();
  };

  return (
    <TwitterConnect
      {...props}
      onConnectionChange={handleConnectionChange}
    />
  );
}
