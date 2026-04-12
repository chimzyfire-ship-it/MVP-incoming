"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import Image from "next/image";
import { Star, LayoutGrid, Activity, Eye, Bookmark, Settings, Search, User, Store, Server, Rss, Cpu, Home } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSkillLevel } from "../hooks/useSkillLevel";

export type Tab = "home" | "discover" | "categories" | "shop" | "feed" | "runtime" | "trending" | "runnable" | "viewed" | "bookmarks" | "settings";


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
      label: getLabel("home", "Home"),
      id: "home" as Tab,
      icon: <Home className={getIconClass("home")} />,
    },
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
    <>
    <aside className="hidden lg:flex w-[260px] flex-col border-r border-white/5 bg-[#031d24] h-[100dvh]">
      {/* ── GITMURPH Brand ── */}
      <div className="px-5 pt-6 pb-1">
        <div className="flex items-center gap-2.5">
          {/* Rocket-G Logo Mark */}
          <div className="relative flex shrink-0 items-center justify-center drop-shadow-sm">
            <Image
              src="/logo.png"
              alt="Gitmurph Logo"
              width={42}
              height={42}
              className="object-contain"
            />
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

    {/* ── MOBILE BOTTOM NAVIGATION (App Store Vibe) ── */}
    <nav className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 h-[84px] bg-[#031d24]/95 backdrop-blur-3xl border-t border-white/10 px-2 pb-6 pt-2 overflow-x-auto hide-scrollbars items-center gap-1 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        // Exclude some strictly-desktop or redundant links to keep mobile nav clean
        if (["viewed", "bookmarks"].includes(item.id)) return null;

        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`relative flex flex-col items-center justify-center min-w-[76px] flex-shrink-0 gap-1 rounded-xl px-1 py-1.5 transition-all ${
              isActive 
                ? "text-[#00e5ff]" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {/* Active Indicator Glow */}
            {isActive && (
              <div className="absolute -top-2 w-8 h-0.5 rounded-full bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,1)]" />
            )}
            
            {/* Icon */}
            <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
               {/* We clone the icon to override its color manually because getIconClass enforces blue-400 */}
               {React.cloneElement(item.icon as React.ReactElement, {
                 className: `h-5 w-5 ${isActive ? "text-[#00e5ff]" : "text-zinc-500"}`
               })}
            </div>
            
            <span className={`text-[10px] tracking-tight whitespace-nowrap transition-all duration-300 ${isActive ? "font-bold" : "font-semibold"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
    </>
  );
}
