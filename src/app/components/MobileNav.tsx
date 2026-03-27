"use client";

import { Compass, LayoutGrid, Flame, Eye, Store, Rocket, Rss } from "lucide-react";
import type { Tab } from "./Sidebar";

interface MobileNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "discover", label: "Explore", icon: <Compass className="h-5 w-5" /> },
  { id: "categories", label: "Types", icon: <LayoutGrid className="h-5 w-5" /> },
  { id: "shop", label: "Market", icon: <Store className="h-5 w-5" /> },
  { id: "feed", label: "Feed", icon: <Rss className="h-5 w-5" /> },
  { id: "runtime", label: "Try", icon: <Rocket className="h-5 w-5" /> },
  { id: "trending", label: "Popular", icon: <Flame className="h-5 w-5" /> },
  { id: "viewed", label: "Recently", icon: <Eye className="h-5 w-5" /> },
];

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 z-50 w-full border-t border-white/10 bg-[#031d24]/90 pb-safe pt-2 backdrop-blur-xl lg:hidden">
      <div className="flex h-14 w-full items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="group flex flex-1 flex-col items-center justify-center gap-1"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
