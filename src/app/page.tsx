import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { BookOpen, ArrowRight, Bookmark, Brain, Headphones, Sparkles, CheckCircle } from "lucide-react";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/40 via-[#0a0118] to-[#0a0118] pointer-events-none" />
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed top-1/2 right-0 w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] translate-x-1/2 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">XLearner</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm text-gray-300 hover:text-white transition-colors">Pricing</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 px-5 py-2.5 rounded-full transition-all"
              >
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Transform Your
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                  Twitter Bookmarks
                </span>
                <br />
                Into Real Learning
              </h1>
              <p className="mt-6 text-lg text-gray-400 max-w-lg">
                Stop letting valuable content sit forgotten. Turn your saved tweets into
                personalized courses with AI-powered summaries and audio lessons.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-full hover:bg-gray-100 transition-all"
                >
                  Start Learning
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 border border-white/20 px-6 py-3 rounded-full hover:bg-white/5 transition-all"
                >
                  See How It Works
                </a>
              </div>

              {/* Stats */}
              <div className="mt-12 flex gap-8">
                <div>
                  <div className="text-3xl font-bold">10k+</div>
                  <div className="text-sm text-gray-500">Bookmarks Processed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm text-gray-500">Courses Created</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">98%</div>
                  <div className="text-sm text-gray-500">Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              {/* Orbital rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[400px] h-[400px] rounded-full border border-white/10 animate-[spin_60s_linear_infinite]" />
                <div className="absolute w-[300px] h-[300px] rounded-full border border-white/10 animate-[spin_45s_linear_infinite_reverse]" />
                <div className="absolute w-[200px] h-[200px] rounded-full border border-purple-500/30 animate-[spin_30s_linear_infinite]" />
              </div>

              {/* Center stat */}
              <div className="relative flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    AI-Powered
                  </div>
                  <div className="text-gray-400 mt-1">Learning Platform</div>
                </div>

                {/* Floating elements */}
                <div className="absolute top-8 left-12 p-3 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-sm rounded-2xl border border-white/10">
                  <Bookmark className="h-6 w-6 text-purple-400" />
                </div>
                <div className="absolute top-20 right-8 p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl border border-white/10">
                  <Brain className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="absolute bottom-32 left-4 p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl border border-white/10">
                  <Headphones className="h-6 w-6 text-pink-400" />
                </div>
                <div className="absolute bottom-20 right-16 p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl border border-white/10">
                  <Sparkles className="h-6 w-6 text-blue-400" />
                </div>

                {/* Avatar bubbles */}
                <div className="absolute top-4 right-24 h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-sm font-bold">
                  JD
                </div>
                <div className="absolute bottom-8 left-20 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-xs font-bold">
                  MK
                </div>
                <div className="absolute top-1/2 right-0 h-14 w-14 rounded-full bg-gradient-to-br from-pink-400 to-red-400 flex items-center justify-center font-bold">
                  AS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold">
                Everything You Need to Learn
              </h2>
              <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
                Powerful features to transform how you consume and retain information from social media
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Bookmark,
                  title: "Smart Sync",
                  description: "Automatically sync your Twitter bookmarks and organize them by topic",
                  color: "from-purple-500 to-indigo-500"
                },
                {
                  icon: Brain,
                  title: "AI Analysis",
                  description: "Get instant summaries, key takeaways, and topic categorization",
                  color: "from-indigo-500 to-blue-500"
                },
                {
                  icon: Headphones,
                  title: "Audio Lessons",
                  description: "Listen to your bookmarks as podcast-style audio on the go",
                  color: "from-pink-500 to-purple-500"
                }
              ].map((feature, i) => (
                <div key={i} className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 bg-gradient-to-b from-transparent to-purple-900/20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold">
                How It Works
              </h2>
              <p className="mt-4 text-gray-400">
                Three simple steps to start learning from your bookmarks
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Create Account", desc: "Sign up with your email in seconds" },
                { step: "02", title: "Connect Twitter", desc: "Link your X account to sync bookmarks" },
                { step: "03", title: "Start Learning", desc: "Get AI-generated courses instantly" }
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-2xl font-bold mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl lg:text-5xl font-bold">
              Ready to Transform Your
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Bookmarks Into Knowledge?
              </span>
            </h2>
            <p className="mt-6 text-lg text-gray-400">
              Join learners who are finally making use of their saved content
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 font-medium px-8 py-4 rounded-full transition-all text-lg"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">No credit card required</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">XLearner</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <a href="mailto:hello@xlearner.app" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-sm text-gray-500">
              © 2024 XLearner. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
