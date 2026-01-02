"use client";

import { useState, useEffect } from "react";
import {
  Flame,
  Zap,
  Trophy,
  Clock,
  Target,
  Star,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  UserProgress,
  getLevelFromXp,
  getLevelProgress,
  getXpToNextLevel,
  formatLearningTime,
  getStreakMessage,
  getDailyGoalMessage,
  ACHIEVEMENTS,
  DEFAULT_PROGRESS,
} from "@/lib/gamification";

interface GamificationBarProps {
  progress?: UserProgress;
  compact?: boolean;
}

export function GamificationBar({ progress = DEFAULT_PROGRESS, compact = false }: GamificationBarProps) {
  const [showAchievements, setShowAchievements] = useState(false);
  const [animateXp, setAnimateXp] = useState(false);

  const levelInfo = getLevelFromXp(progress.xp);
  const levelProgress = getLevelProgress(progress.xp);
  const xpToNext = getXpToNextLevel(progress.xp);

  // Animate XP bar on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateXp(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const earnedAchievements = ACHIEVEMENTS.filter(a => progress.achievements.includes(a.id));

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        {/* Level Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r ${levelInfo.gradient}`}>
          <Star className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Lvl {levelInfo.level}</span>
        </div>

        {/* XP Progress Mini */}
        <div className="flex-1 max-w-32">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${levelInfo.gradient} transition-all duration-1000 ease-out`}
              style={{ width: animateXp ? `${levelProgress}%` : "0%" }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1.5 text-orange-400">
          <Flame className="h-4 w-4" />
          <span className="text-sm font-semibold">{progress.streak}</span>
        </div>

        {/* Today's Time */}
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-semibold">{formatLearningTime(progress.todayTimeMinutes)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-purple-900/30 to-slate-900/90 border border-white/10 backdrop-blur-xl">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 animate-pulse" />

      <div className="relative p-5">
        <div className="flex flex-wrap items-center gap-6">
          {/* Level & XP Section */}
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            {/* Level Badge with Glow */}
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${levelInfo.gradient} blur-lg opacity-50`} />
              <div className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${levelInfo.gradient} shadow-lg`}>
                <span className="text-2xl font-black text-white">{levelInfo.level}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/80 font-medium">Level</span>
              </div>
            </div>

            {/* XP Progress */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-white">{levelInfo.name}</span>
                <span className="text-xs text-white/60">{progress.xp.toLocaleString()} XP</span>
              </div>
              <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${levelInfo.gradient} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: animateXp ? `${levelProgress}%` : "0%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
              </div>
              <p className="text-xs text-white/50 mt-1">
                {xpToNext > 0 ? `${xpToNext.toLocaleString()} XP to next level` : "Max level reached!"}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="relative group">
              <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                <div className="flex items-center gap-1.5 text-orange-400">
                  <Flame className={`h-5 w-5 ${progress.streak > 0 ? "animate-bounce" : ""}`} />
                  <span className="text-xl font-bold">{progress.streak}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Streak</span>
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {getStreakMessage(progress.streak)}
              </div>
            </div>

            {/* Today's Learning Time */}
            <div className="relative group">
              <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Clock className="h-5 w-5" />
                  <span className="text-xl font-bold">{formatLearningTime(progress.todayTimeMinutes)}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Today</span>
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {getDailyGoalMessage(progress.todayTimeMinutes)}
              </div>
            </div>

            {/* Resources Completed */}
            <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Target className="h-5 w-5" />
                <span className="text-xl font-bold">{progress.resourcesCompleted}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Done</span>
            </div>

            {/* Achievements Button */}
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
            >
              <div className="flex items-center gap-1.5 text-amber-400">
                <Trophy className="h-5 w-5" />
                <span className="text-xl font-bold">{earnedAchievements.length}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-white/50 mt-0.5">Awards</span>
            </button>
          </div>
        </div>

        {/* Achievements Panel */}
        {showAchievements && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Achievements
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {ACHIEVEMENTS.slice(0, 12).map((achievement) => {
                const earned = progress.achievements.includes(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-2 rounded-lg text-center transition-all ${
                      earned
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                        : "bg-white/5 border border-white/5 opacity-50"
                    }`}
                  >
                    <span className="text-2xl">{achievement.icon}</span>
                    <p className={`text-[10px] font-medium mt-1 ${earned ? "text-white" : "text-white/50"}`}>
                      {achievement.name}
                    </p>
                    {earned && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Zap className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mini XP notification popup
export function XpPopup({ amount, onComplete }: { amount: number; onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed top-20 right-8 z-50 animate-bounce-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/30">
        <Zap className="h-5 w-5 text-white" />
        <span className="text-white font-bold">+{amount} XP</span>
      </div>
    </div>
  );
}
