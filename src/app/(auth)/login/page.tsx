"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function LoginPage() {
  const handleSignIn = () => {
    signIn("twitter", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="mb-8 flex items-center gap-3">
        <BookOpen className="h-12 w-12 text-primary" />
        <h1 className="text-4xl font-bold">XLearner</h1>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Transform your Twitter bookmarks into personalized learning courses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={handleSignIn}
            size="lg"
            className="w-full gap-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Sign in with X
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              By signing in, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 grid max-w-3xl gap-8 text-center md:grid-cols-3">
        <div>
          <div className="mb-2 text-3xl">1</div>
          <h3 className="font-semibold">Sync Bookmarks</h3>
          <p className="text-sm text-muted-foreground">
            Connect your X account and import your bookmarks
          </p>
        </div>
        <div>
          <div className="mb-2 text-3xl">2</div>
          <h3 className="font-semibold">AI Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Our AI analyzes and categorizes your content
          </p>
        </div>
        <div>
          <div className="mb-2 text-3xl">3</div>
          <h3 className="font-semibold">Learn & Grow</h3>
          <p className="text-sm text-muted-foreground">
            Get personalized courses with audio lessons
          </p>
        </div>
      </div>
    </div>
  );
}
