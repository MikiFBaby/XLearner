"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Bookmark,
  GraduationCap,
  Home,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { name: "Courses", href: "/courses", icon: GraduationCap },
  { name: "Explore", href: "/explore", icon: Sparkles },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-full max-w-xs overflow-y-auto bg-[#0a0118] border-r border-white/10 px-6 pb-4 shadow-xl lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">XLearner</span>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-white transition-colors"
              >
                <span className="sr-only">Close sidebar</span>
                <X className="h-6 w-6" />
              </button>
            </Dialog.Close>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-colors",
                            isActive
                              ? "bg-purple-500/20 text-purple-400"
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0",
                              isActive
                                ? "text-purple-400"
                                : "text-gray-500 group-hover:text-gray-300"
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              <li className="mt-auto">
                <ul role="list" className="-mx-2 space-y-1">
                  {secondaryNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-colors",
                            isActive
                              ? "bg-purple-500/20 text-purple-400"
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          <item.icon className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-purple-400"
                              : "text-gray-500 group-hover:text-gray-300"
                          )} />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
