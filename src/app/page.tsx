import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Headphones, Brain } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">XLearner</span>
          </div>
          <Button asChild>
            <Link href="/login">Sign in with X</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Transform Your Bookmarks
            <br />
            <span className="text-primary">Into Learning</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Turn your Twitter/X bookmarks into personalized learning courses
            with AI-generated podcasts, summaries, and quizzes. Learn from the
            content you&apos;ve saved, on your terms.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/login">
                Get Started Free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Three simple steps to transform your bookmarks into structured learning
            </p>

            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">1. Sync Your Bookmarks</h3>
                <p className="mt-2 text-muted-foreground">
                  Connect your X account and import all your saved bookmarks
                  instantly.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">2. AI Analysis</h3>
                <p className="mt-2 text-muted-foreground">
                  Our AI analyzes, categorizes, and extracts key insights from
                  your content.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Headphones className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">3. Learn & Listen</h3>
                <p className="mt-2 text-muted-foreground">
                  Get personalized courses with audio podcasts you can listen to
                  anywhere.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">
              Ready to Start Learning?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join thousands of learners who are turning their saved content
              into knowledge.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/login">
                Get Started Free
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>XLearner</span>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
