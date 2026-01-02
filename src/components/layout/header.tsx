"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BookOpen,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-500 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden ml-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-slate-900">XLearner</span>
      </div>

      {/* Search bar - centered */}
      <div className="flex-1 flex justify-center px-4 lg:px-8">
        <div className="w-full max-w-lg">
          <div className="relative">
            <Input
              type="text"
              placeholder="Type to Search..."
              className="h-10 w-full rounded-lg border-slate-200 bg-slate-50 pl-4 pr-12 text-sm placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-primary"
            />
            <Button
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md bg-primary p-0 hover:bg-primary/90"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right side - notifications and user */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification icons */}
        <div className="hidden sm:flex items-center gap-1">
          <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-medium text-white">
              4
            </span>
          </button>
          <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <MessageSquare className="h-5 w-5" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-medium text-white">
              2
            </span>
          </button>
          <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <HelpCircle className="h-5 w-5" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-medium text-white">
              1
            </span>
          </button>
        </div>

        {/* Separator */}
        <div className="hidden sm:block h-8 w-px bg-slate-200" />

        {/* User dropdown */}
        {user ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                <Avatar className="h-9 w-9 ring-2 ring-slate-100">
                  <AvatarImage
                    src={user.twitterAvatar || user.image || undefined}
                    alt={user.name || "User"}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium text-slate-900">
                    {user.name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user.twitterUsername ? `@${user.twitterUsername}` : "Free Plan"}
                  </p>
                </div>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95"
                align="end"
                sideOffset={8}
              >
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-medium text-slate-900">
                    {user.name || user.email?.split("@")[0]}
                  </p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/profile"
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:bg-slate-100"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    Profile
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 outline-none transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : (
          <Button asChild size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
