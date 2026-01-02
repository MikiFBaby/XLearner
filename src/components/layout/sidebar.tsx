"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Bookmark,
  ChevronDown,
  GraduationCap,
  Home,
  Lightbulb,
  MessageCircle,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Folder,
  FileText,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  children?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: Home },
  {
    name: "My Learning",
    icon: GraduationCap,
    children: [
      { name: "Active Courses", href: "/courses" },
      { name: "Completed", href: "/courses/completed" },
      { name: "Certificates", href: "/courses/certificates" },
    ],
  },
  {
    name: "Bookmarks",
    icon: Bookmark,
    children: [
      { name: "All Bookmarks", href: "/bookmarks" },
      { name: "Unprocessed", href: "/bookmarks/unprocessed" },
      { name: "Favorites", href: "/bookmarks/favorites" },
    ],
  },
  {
    name: "Topics",
    icon: Folder,
    children: [
      { name: "Browse Topics", href: "/topics" },
      { name: "My Interests", href: "/topics/interests" },
    ],
  },
  { name: "Explore", href: "/explore", icon: Sparkles },
];

const secondaryNavigation: NavItem[] = [
  { name: "Insights", href: "/insights", icon: TrendingUp },
  { name: "Community", href: "/community", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

function NavItemComponent({ item, isActive, isExpanded, onToggle }: NavItemProps) {
  const pathname = usePathname();

  if (item.children) {
    return (
      <li>
        <button
          onClick={onToggle}
          className={cn(
            "group flex w-full items-center justify-between gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            isExpanded
              ? "bg-primary/10 text-primary"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <div className="flex items-center gap-x-3">
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0",
                isExpanded ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
              )}
            />
            {item.name}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded ? "rotate-180 text-primary" : "text-slate-400"
            )}
          />
        </button>
        {isExpanded && (
          <ul className="mt-1 space-y-1 pl-10">
            {item.children.map((child) => {
              const isChildActive = pathname === child.href;
              return (
                <li key={child.name}>
                  <Link
                    href={child.href}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      isChildActive
                        ? "font-medium text-primary"
                        : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {child.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.href!}
        className={cn(
          "group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0",
            isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
          )}
        />
        {item.name}
      </Link>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["My Learning"]);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const isItemActive = (item: NavItem) => {
    if (item.href) {
      return pathname === item.href;
    }
    if (item.children) {
      return item.children.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
    }
    return false;
  };

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">XLearner</span>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-1 flex-col pt-4">
          <ul role="list" className="flex flex-1 flex-col gap-y-6">
            <li>
              <ul role="list" className="space-y-1">
                {navigation.map((item) => (
                  <NavItemComponent
                    key={item.name}
                    item={item}
                    isActive={isItemActive(item)}
                    isExpanded={expandedItems.includes(item.name)}
                    onToggle={() => toggleExpanded(item.name)}
                  />
                ))}
              </ul>
            </li>

            {/* Secondary Navigation */}
            <li>
              <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                More
              </div>
              <ul role="list" className="space-y-1">
                {secondaryNavigation.map((item) => (
                  <NavItemComponent
                    key={item.name}
                    item={item}
                    isActive={isItemActive(item)}
                    isExpanded={expandedItems.includes(item.name)}
                    onToggle={() => toggleExpanded(item.name)}
                  />
                ))}
              </ul>
            </li>

            {/* Help Button */}
            <li className="mt-auto">
              <Button className="w-full gap-2 bg-primary hover:bg-primary/90">
                <MessageCircle className="h-4 w-4" />
                Chat with us
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
