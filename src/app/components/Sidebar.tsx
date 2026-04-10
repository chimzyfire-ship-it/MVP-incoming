"use client";

import { Star, LayoutGrid, Activity, Eye, Bookmark, Settings, Search, User, Store, Server, Rss, Cpu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSkillLevel } from "../hooks/useSkillLevel";

export type Tab = "discover" | "categories" | "shop" | "feed" | "runtime" | "trending" | "runnable" | "viewed" | "bookmarks" | "settings";


interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  searchQuery = "",
  onSearchChange,
  onSearchSubmit,
}: SidebarProps) {
  const { user, openAuthModal } = useAuth();

  const skillBadge =
    user?.skillLevel === "expert" ? { label: "Expert", color: "text-violet-300 border-violet-400/40 bg-violet-500/10" }
    : user?.skillLevel === "intermediate" ? { label: "Intermediate", color: "text-blue-300 border-blue-400/40 bg-blue-500/10" }
    : null; // beginners get no badge — keeps it simple

  const getIconClass = (id: string) => 
    `h-4 w-4 shrink-0 transition-colors duration-200 ${
      activeTab === id ? "text-blue-400" : "text-blue-400/60"
    }`;

  const skillLevel = useSkillLevel();

  const getLabel = (id: Tab, defaultLabel: string) => {
    if (skillLevel === "expert") {
      switch(id) {
        case "categories": return "Categories";
        case "feed": return "Activity Feed";
        case "runtime": return "Runtimes";
        case "trending": return "Trending Stars";
        case "runnable": return "Zero Config";
        case "viewed": return "History";
        case "bookmarks": return "Bookmarks";
        case "settings": return "Preferences";
        default: return defaultLabel;
      }
    } else if (skillLevel === "intermediate") {
      switch(id) {
        case "categories": return "App Types";
        case "feed": return "Activity";
        case "runtime": return "Environments";
        case "trending": return "Popular";
        case "runnable": return "Easy Setup";
        case "viewed": return "History";
        case "bookmarks": return "Saved";
        case "settings": return "Settings";
        default: return defaultLabel;
      }
    } else {
      // Beginner
      switch(id) {
        case "shop": return "Free Shop";
        case "settings": return "Options";
        default: return defaultLabel;
      }
    }
  };

  const navItems = [
    {
      label: getLabel("discover", "Explore"),
      id: "discover" as Tab,
      icon: <Star className={getIconClass("discover")} />,
    },
    {
      label: getLabel("categories", "Types"),
      id: "categories" as Tab,
      icon: <LayoutGrid className={getIconClass("categories")} />,
    },
    {
      label: getLabel("shop", "Marketplace"),
      id: "shop" as Tab,
      icon: <Store className={getIconClass("shop")} />,
    },
    {
      label: getLabel("feed", "Feed"),
      id: "feed" as Tab,
      icon: <Rss className={getIconClass("feed")} />,
    },
    {
      label: getLabel("runtime", "Try Apps"),
      id: "runtime" as Tab,
      icon: <Server className={getIconClass("runtime")} />,
    },
    {
      label: getLabel("trending", "Popular now"),
      id: "trending" as Tab,
      icon: <Activity className={getIconClass("trending")} />,
    },
    {
      label: getLabel("runnable", "Easy to Run"),
      id: "runnable" as Tab,
      icon: <Cpu className={getIconClass("runnable")} />,
    },
    {
      label: getLabel("viewed", "Recently Viewed"),
      id: "viewed" as Tab,
      icon: <Eye className={getIconClass("viewed")} />,
    },
    {
      label: getLabel("bookmarks", "Saved"),
      id: "bookmarks" as Tab,
      icon: <Bookmark className={getIconClass("bookmarks")} />,
    },
    {
      label: getLabel("settings", "Settings"),
      id: "settings" as Tab,
      icon: <Settings className={getIconClass("settings")} />,
    },
  ];

  return (
    <aside className="hidden lg:flex w-[260px] flex-col border-r border-white/5 bg-[#031d24] h-[100dvh]">
      {/* ── GITMURPH Brand ── */}
      <div className="px-5 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          {/* Rocket-G Logo Mark */}
          <div className="logo-pulse relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[22%] bg-[#0f1c22] border border-white/10">
            {/* Outer G ring */}
            <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" fill="none">
              <path
                d="M34 20a14 14 0 1 1-14-14c4.5 0 8.5 2.1 11.1 5.4H26v4h9V6h-4v3.2A18 18 0 1 0 38 20H34z"
                fill="url(#ggrad)"
                opacity="0.9"
              />
              <defs>
                <linearGradient id="ggrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
              </defs>
            </svg>
            {/* Teal rocket */}
            <svg viewBox="0 0 20 20" className="relative z-10 h-4 w-4" fill="none">
              <path d="M10 2C7 2 4.5 5 4.5 8.5c0 2.5 1.3 4.7 3.3 5.9L7 17h6l-.8-2.6c2-.3 3.3-2.4 3.3-5.9C15.5 5 13 2 10 2z" fill="#2dd4bf" />
              <ellipse cx="10" cy="9" rx="2" ry="2.5" fill="#0f766e" />
              <path d="M7.5 16.5c0 1.5 1 2.5 2.5 2.5s2.5-1 2.5-2.5H7.5z" fill="#5eead4" opacity="0.7" />
            </svg>
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-white leading-none">GITMURPH</h1>
            <p className="text-[10px] font-medium text-zinc-500 tracking-wide mt-0.5">Discover · Run · Build</p>
          </div>
        </div>
      </div>

      {/* ── Search Bar Area ── */}
      <div className="p-4 pt-4">
        <form onSubmit={onSearchSubmit} className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full rounded-md border border-white/10 bg-black/20 py-1.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 shadow-inner outline-none transition-all focus:border-blue-500/50 focus:bg-black/40 focus:ring-2 focus:ring-blue-500/20"
          />
        </form>
      </div>

      {/* ── Navigation List ── */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2 overflow-y-auto">
        {navItems.map((item) => {
          // Add visual separators
          const isDivider = item.id === "viewed" || item.id === "settings";
          
          return (
            <div key={item.id} className="w-full">
              {isDivider && <div className="mx-2 my-3 border-t border-white/5" />}
              <button
                onClick={() => onTabChange(item.id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>

      {/* ── Profile Bottom Region ── */}
      <div className="mt-auto p-4 border-t border-white/5">
        {user ? (
          <div className="flex w-full items-center gap-3 rounded-lg p-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 border border-white/10 shrink-0">
              <span className="text-xs font-bold text-white">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-200 tracking-tight">{user.name}</p>
              {skillBadge && (
                <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${skillBadge.color}`}>
                  {skillBadge.label}
                </span>
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal("manual")}
            className="flex w-full items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-black/40 border border-white/10">
              <User className="h-4 w-4 text-zinc-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-300 tracking-tight">
              Sign up free
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
