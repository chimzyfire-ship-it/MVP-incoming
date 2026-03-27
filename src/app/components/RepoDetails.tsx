"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, Package, Share, Play, GitFork, Users } from "lucide-react";

import { type Repo } from "./RepoCard";
import { summarizeRepoForBeginners } from "@/lib/repoSummary";

interface RepoDetailsProps {
  repo: Repo;
  onClose: () => void;
  showShopActions?: boolean;
  onRun?: (repo: Repo) => void;
}

function compactStat(value?: number) {
  if (typeof value !== "number") return "N/A";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${value}`;
}

function getHeroPalette(language?: string) {
  const key = (language || "").toLowerCase();
  if (key.includes("typescript") || key.includes("ts")) return { primary: "#38bdf8", secondary: "#0f766e", accent: "#0ea5e9" };
  if (key.includes("javascript") || key.includes("js")) return { primary: "#facc15", secondary: "#ca8a04", accent: "#eab308" };
  if (key.includes("python")) return { primary: "#60a5fa", secondary: "#1d4ed8", accent: "#3b82f6" };
  if (key.includes("rust")) return { primary: "#fb923c", secondary: "#9a3412", accent: "#f97316" };
  if (key.includes("go")) return { primary: "#22d3ee", secondary: "#155e75", accent: "#06b6d4" };
  if (key.includes("java")) return { primary: "#f97316", secondary: "#7c2d12", accent: "#ea580c" };
  if (key.includes("react") || key.includes("next")) return { primary: "#67e8f9", secondary: "#155e75", accent: "#22d3ee" };
  return { primary: "#8b5cf6", secondary: "#1d4ed8", accent: "#8b5cf6" };
}

export default function RepoDetails({ repo, onClose, showShopActions = false, onRun }: RepoDetailsProps) {
  const computedPrice = repo.stars > 100000 ? "$29.99" : repo.stars > 50000 ? "$19.99" : repo.stars > 10000 ? "$9.99" : "$0";
  const priceLabel = computedPrice === "$0" ? "Get free" : `Get for ${computedPrice}`;
  const [stats, setStats] = useState({
    stars: repo.stars,
    forks: repo.forks || 0,
    collaborators: repo.collaborators || 0,
  });
  const summary = summarizeRepoForBeginners(repo);

  useEffect(() => {
    const owner = repo.owner?.trim();
    const name = repo.title?.trim();
    if (!owner || !name) return;

    let cancelled = false;

    async function hydrateStats() {
      try {
        const [repoRes, contribRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${owner}/${name}`),
          fetch(`https://api.github.com/repos/${owner}/${name}/contributors?per_page=1&anon=true`),
        ]);

        if (cancelled) return;
        const nextStats = {
          stars: repo.stars,
          forks: repo.forks || 0,
          collaborators: repo.collaborators || 0,
        };

        if (repoRes.ok) {
          const repoData = await repoRes.json();
          nextStats.stars = typeof repoData.stargazers_count === "number" ? repoData.stargazers_count : nextStats.stars;
          nextStats.forks = typeof repoData.forks_count === "number" ? repoData.forks_count : nextStats.forks;
        }

        if (contribRes.ok) {
          const link = contribRes.headers.get("link");
          if (link) {
            const match = link.match(/&page=(\d+)>; rel="last"/);
            nextStats.collaborators = match ? Number.parseInt(match[1], 10) : 1;
          } else {
            const firstPage = await contribRes.json();
            nextStats.collaborators = Array.isArray(firstPage) ? firstPage.length : nextStats.collaborators;
          }
        }

        if (!cancelled) setStats(nextStats);
      } catch {
      }
    }

    hydrateStats();
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.title, repo.stars, repo.forks, repo.collaborators]);

  const titleOwner = repo.fullName || `${repo.owner}/${repo.title}`;
  const heroPalette = getHeroPalette(repo.language);

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300 w-full max-w-[800px] mx-auto pb-24 text-white">
      <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-[17px]">Back to list</span>
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 border border-white/10 text-blue-400 hover:bg-black/50 transition-colors">
          <Share className="h-4 w-4" />
        </button>
      </div>

      <header className="flex flex-row gap-6 mb-10 w-full">
        <div className="relative shrink-0 overflow-hidden squircle shadow-[0_4px_30px_rgba(0,0,0,0.5)] h-28 w-28 sm:h-36 sm:w-36 bg-black/40 border border-white/10 flex flex-col justify-center items-center">
          {repo.avatar ? (
            <Image
              src={repo.avatar}
              alt={repo.owner || repo.title}
              fill
              sizes="(max-width: 640px) 112px, 144px"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Package className="h-12 w-12 text-zinc-500" />
          )}
        </div>

        <div className="flex flex-col justify-between flex-1 py-1">
          <div>
            <h1 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-white leading-tight">
              {repo.title}
            </h1>
            <h2 className="text-[17px] font-medium text-zinc-400 mt-0.5">
              {repo.owner || "Creator"}
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-auto">
            <button
              onClick={() => {
                if (onRun) {
                  onRun(repo);
                  return;
                }
                window.open(repo.url, "_blank");
              }}
              className="flex h-[38px] sm:h-[44px] items-center justify-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/20 px-6 text-[15px] sm:text-[17px] font-bold tracking-wide text-blue-400 transition-all hover:bg-blue-500/30 hover:border-blue-500/60 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            >
              <Play className="h-4 w-4 fill-blue-400" /> Run
            </button>

            {showShopActions ? (
              <button
                onClick={() => alert(`Getting premium access for ${priceLabel}`)}
                className="flex h-[38px] sm:h-[44px] items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 text-[14px] sm:text-[15px] font-bold tracking-wide text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-inner"
              >
                {priceLabel}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex w-full items-center justify-start gap-8 border-y border-white/10 py-4 mb-10 overflow-x-auto hide-scrollbars">
        <div className="flex flex-col items-center min-w-max">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Likes</span>
          <span className="text-xl font-bold text-zinc-300 mt-1 flex items-center gap-1">
            {compactStat(stats.stars)} <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5">{stats.stars.toLocaleString()} Total likes</span>
        </div>
        <div className="w-px h-10 bg-white/10 shrink-0" />
        <div className="flex flex-col items-center min-w-max">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Copies</span>
          <span className="text-xl font-bold text-zinc-300 mt-1 flex items-center gap-1">
            {compactStat(stats.forks)} <GitFork className="h-4 w-4" />
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Community copies</span>
        </div>
        <div className="w-px h-10 bg-white/10 shrink-0" />
        <div className="flex flex-col items-center min-w-max">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">People</span>
          <span className="text-xl font-bold text-zinc-300 mt-1 flex items-center gap-1">
            {compactStat(stats.collaborators)} <Users className="h-4 w-4" />
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5">People helping</span>
        </div>
        <div className="w-px h-10 bg-white/10 shrink-0" />
        <div className="flex flex-col items-center min-w-max">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Tech</span>
          <span className="text-xl font-bold text-zinc-300 mt-1">
            {repo.language && repo.language !== "Unknown" ? repo.language : "Tool"}
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5">Main tech</span>
        </div>
      </div>

      <section className="mb-10 w-full">
        <h3 className="text-xl font-bold tracking-tight text-white mb-4">Quick look</h3>
        <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/10 bg-[#0a0c10]">
          <div className="relative aspect-[2/1]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at top right, ${heroPalette.accent}55, transparent 45%), radial-gradient(circle at 20% 80%, ${heroPalette.primary}40, transparent 55%), linear-gradient(135deg, ${heroPalette.primary}22 0%, ${heroPalette.secondary}18 55%, rgba(4,28,36,1) 100%)`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#042a33]/95 via-[#042a33]/60 to-transparent" />
            <div className="absolute right-[-60px] top-[-60px] h-72 w-72 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute left-[-70px] bottom-[-70px] h-72 w-72 rounded-full bg-white/4 blur-2xl" />
          </div>

          <div className="relative p-5 sm:p-7 -mt-[46px]">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-zinc-100">
                {repo.language && repo.language !== "Unknown" ? repo.language : summary.typeLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-zinc-100">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {stats.stars.toLocaleString()} likes
              </span>
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-200">{titleOwner}</p>
              <h4 className="mt-1 text-[26px] leading-[1.1] font-bold tracking-tight text-white sm:text-[34px]">
                {repo.title}
              </h4>
              <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-zinc-200">
                <span className="font-semibold text-blue-200/90">{summary.typeLabel}:</span>{" "}
                {summary.short}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {summary.goodForPills.slice(0, 3).map((pill) => (
                <span
                  key={pill}
                  className="text-[12px] font-medium text-blue-300 bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-full"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10 w-full relative">
        <h3 className="text-lg font-bold tracking-tight text-white mb-3">In plain words</h3>
        <p className="text-[16px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {summary.deep}
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Tap <span className="text-zinc-200 font-semibold">Run</span> and we set it up for you. If an app needs extra time, it will open once it&apos;s ready.
        </p>
      </section>

      {repo.topics && repo.topics.length > 0 && (
        <section className="mb-10 w-full">
          <h3 className="text-xl font-bold tracking-tight text-white mb-4">About this app</h3>
          <div className="flex flex-col gap-0 border-t border-white/10">
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[15px] text-zinc-400">Made by</span>
              <span className="text-[15px] font-medium text-zinc-200">{repo.owner}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/10">
              <span className="text-[15px] text-zinc-400">Tech tags</span>
              <details className="max-w-[60%]">
                <summary className="cursor-pointer list-none text-[11px] font-semibold text-zinc-500">
                  Show technical tags
                </summary>
                <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                  {repo.topics.map((t) => (
                    <span
                      key={t}
                      className="text-[13px] font-medium text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
