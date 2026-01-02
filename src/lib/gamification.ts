// Gamification system for XLearner - XP, Levels, Streaks, Achievements

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  totalTimeMinutes: number;
  todayTimeMinutes: number;
  resourcesCompleted: number;
  quizzesTaken: number;
  perfectQuizzes: number;
  lastActiveDate: string;
  achievements: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  requirement: (progress: UserProgress) => boolean;
}

export interface LevelInfo {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  gradient: string;
}

// XP rewards for different actions
export const XP_REWARDS = {
  syncBookmarks: 10,
  addResource: 5,
  readResource: 15,
  completeResource: 50,
  takeQuiz: 25,
  perfectQuiz: 100,
  dailyStreak: 20,
  weekStreak: 150,
  monthStreak: 500,
  shareProgress: 10,
  firstResource: 25,
  tenResources: 100,
  fiftyResources: 500,
  hundredResources: 1000,
} as const;

// Level definitions with fun names
export const LEVELS: LevelInfo[] = [
  { level: 1, name: "Curious Starter", minXp: 0, maxXp: 100, color: "#94a3b8", gradient: "from-slate-400 to-slate-500" },
  { level: 2, name: "Knowledge Seeker", minXp: 100, maxXp: 300, color: "#22c55e", gradient: "from-green-400 to-emerald-500" },
  { level: 3, name: "Info Hunter", minXp: 300, maxXp: 600, color: "#3b82f6", gradient: "from-blue-400 to-blue-500" },
  { level: 4, name: "Learning Machine", minXp: 600, maxXp: 1000, color: "#8b5cf6", gradient: "from-violet-400 to-purple-500" },
  { level: 5, name: "Wisdom Collector", minXp: 1000, maxXp: 1500, color: "#f59e0b", gradient: "from-amber-400 to-orange-500" },
  { level: 6, name: "Scholar", minXp: 1500, maxXp: 2200, color: "#ec4899", gradient: "from-pink-400 to-rose-500" },
  { level: 7, name: "Expert Learner", minXp: 2200, maxXp: 3000, color: "#14b8a6", gradient: "from-teal-400 to-cyan-500" },
  { level: 8, name: "Knowledge Master", minXp: 3000, maxXp: 4000, color: "#f43f5e", gradient: "from-rose-400 to-red-500" },
  { level: 9, name: "Enlightened Mind", minXp: 4000, maxXp: 5500, color: "#6366f1", gradient: "from-indigo-400 to-violet-500" },
  { level: 10, name: "Grand Scholar", minXp: 5500, maxXp: 7500, color: "#fbbf24", gradient: "from-yellow-400 to-amber-500" },
  { level: 11, name: "Sage", minXp: 7500, maxXp: 10000, color: "#a855f7", gradient: "from-purple-400 to-fuchsia-500" },
  { level: 12, name: "Legendary Learner", minXp: 10000, maxXp: Infinity, color: "#facc15", gradient: "from-yellow-300 via-amber-400 to-orange-500" },
];

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Add your first learning resource",
    icon: "🎯",
    xpReward: 25,
    requirement: (p) => p.resourcesCompleted >= 1,
  },
  {
    id: "bookworm",
    name: "Bookworm",
    description: "Complete 10 resources",
    icon: "📚",
    xpReward: 100,
    requirement: (p) => p.resourcesCompleted >= 10,
  },
  {
    id: "knowledge_hoarder",
    name: "Knowledge Hoarder",
    description: "Complete 50 resources",
    icon: "🏆",
    xpReward: 500,
    requirement: (p) => p.resourcesCompleted >= 50,
  },
  {
    id: "streak_starter",
    name: "Streak Starter",
    description: "Learn for 3 days in a row",
    icon: "🔥",
    xpReward: 50,
    requirement: (p) => p.streak >= 3,
  },
  {
    id: "week_warrior",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: "⚡",
    xpReward: 150,
    requirement: (p) => p.streak >= 7,
  },
  {
    id: "month_master",
    name: "Month Master",
    description: "Maintain a 30-day streak",
    icon: "👑",
    xpReward: 500,
    requirement: (p) => p.streak >= 30,
  },
  {
    id: "quiz_whiz",
    name: "Quiz Whiz",
    description: "Take 10 quizzes",
    icon: "🧠",
    xpReward: 100,
    requirement: (p) => p.quizzesTaken >= 10,
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Get 5 perfect quiz scores",
    icon: "💯",
    xpReward: 250,
    requirement: (p) => p.perfectQuizzes >= 5,
  },
  {
    id: "time_investor",
    name: "Time Investor",
    description: "Spend 10 hours learning",
    icon: "⏰",
    xpReward: 200,
    requirement: (p) => p.totalTimeMinutes >= 600,
  },
  {
    id: "dedicated_learner",
    name: "Dedicated Learner",
    description: "Spend 50 hours learning",
    icon: "🌟",
    xpReward: 1000,
    requirement: (p) => p.totalTimeMinutes >= 3000,
  },
  {
    id: "daily_grinder",
    name: "Daily Grinder",
    description: "Learn for 1 hour today",
    icon: "💪",
    xpReward: 50,
    requirement: (p) => p.todayTimeMinutes >= 60,
  },
  {
    id: "marathon_learner",
    name: "Marathon Learner",
    description: "Learn for 3 hours in one day",
    icon: "🏃",
    xpReward: 150,
    requirement: (p) => p.todayTimeMinutes >= 180,
  },
];

// Calculate level from XP
export function getLevelFromXp(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Calculate progress to next level (0-100)
export function getLevelProgress(xp: number): number {
  const currentLevel = getLevelFromXp(xp);
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);

  if (!nextLevel) return 100; // Max level

  const xpIntoLevel = xp - currentLevel.minXp;
  const xpForLevel = nextLevel.minXp - currentLevel.minXp;

  return Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100));
}

// Calculate XP needed for next level
export function getXpToNextLevel(xp: number): number {
  const currentLevel = getLevelFromXp(xp);
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);

  if (!nextLevel) return 0; // Max level

  return nextLevel.minXp - xp;
}

// Check for new achievements
export function checkNewAchievements(progress: UserProgress): Achievement[] {
  return ACHIEVEMENTS.filter(
    achievement =>
      !progress.achievements.includes(achievement.id) &&
      achievement.requirement(progress)
  );
}

// Format time display
export function formatLearningTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Calculate streak (check if last active was yesterday or today)
export function calculateStreak(lastActiveDate: string, currentStreak: number): number {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (lastActiveDate === today) {
    return currentStreak; // Already active today
  } else if (lastActiveDate === yesterday) {
    return currentStreak + 1; // Streak continues
  } else {
    return 1; // Streak broken, start fresh
  }
}

// Default progress for new users
export const DEFAULT_PROGRESS: UserProgress = {
  xp: 0,
  level: 1,
  streak: 0,
  longestStreak: 0,
  totalTimeMinutes: 0,
  todayTimeMinutes: 0,
  resourcesCompleted: 0,
  quizzesTaken: 0,
  perfectQuizzes: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  achievements: [],
};

// Motivational messages based on streak
export function getStreakMessage(streak: number): string {
  if (streak === 0) return "Start your learning streak today!";
  if (streak === 1) return "Great start! Keep it going!";
  if (streak < 3) return "You're building momentum!";
  if (streak < 7) return "Impressive dedication!";
  if (streak < 14) return "You're on fire! 🔥";
  if (streak < 30) return "Unstoppable learner!";
  if (streak < 60) return "Learning legend in the making!";
  return "You're absolutely incredible! 🌟";
}

// Daily goal messages
export function getDailyGoalMessage(todayMinutes: number, goalMinutes: number = 30): string {
  const percentage = (todayMinutes / goalMinutes) * 100;

  if (percentage === 0) return "Ready to learn something new?";
  if (percentage < 25) return "Good start! Keep going!";
  if (percentage < 50) return "You're making progress!";
  if (percentage < 75) return "Halfway there!";
  if (percentage < 100) return "Almost at your goal!";
  if (percentage === 100) return "Daily goal achieved! 🎉";
  return "Exceeding expectations! 🚀";
}
