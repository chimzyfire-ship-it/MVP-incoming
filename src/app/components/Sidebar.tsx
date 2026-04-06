"use client";

import { Star, LayoutGrid, Flame, Eye, Bookmark, Settings, Search, User, Store, Rocket, Rss, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

  const navItems = [
    {
      label: "Explore",
      id: "discover" as Tab,
      icon: <Star className={getIconClass("discover")} />,
    },
    {
      label: "Types",
      id: "categories" as Tab,
      icon: <LayoutGrid className={getIconClass("categories")} />,
    },
    {
      label: "Marketplace",
      id: "shop" as Tab,
      icon: <Store className={getIconClass("shop")} />,
    },
    {
      label: "Feed",
      id: "feed" as Tab,
      icon: <Rss className={getIconClass("feed")} />,
    },
    {
      label: "Try Apps",
      id: "runtime" as Tab,
      icon: <Rocket className={getIconClass("runtime")} />,
    },
    {
      label: "Popular now",
      id: "trending" as Tab,
      icon: <Flame className={getIconClass("trending")} />,
    },
    {
      label: "Easy to Run",
      id: "runnable" as Tab,
      icon: <Zap className={getIconClass("runnable")} />,
    },
    {
      label: "Recently Viewed",
      id: "viewed" as Tab,
      icon: <Eye className={getIconClass("viewed")} />,
    },
    {
      label: "Saved",
      id: "bookmarks" as Tab,
      icon: <Bookmark className={getIconClass("bookmarks")} />,
    },
    {
      label: "Options",
      id: "settings" as Tab,
      icon: <Settings className={getIconClass("settings")} />,
    },
  ];

  return (
    <aside className="hidden lg:flex w-[260px] flex-col border-r border-white/5 bg-[#031d24] h-[100dvh]">
      {/* ── GITMURPH Brand ── */}
      <div className="px-5 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <span className="text-[15px] font-black text-white tracking-tight">G</span>
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
