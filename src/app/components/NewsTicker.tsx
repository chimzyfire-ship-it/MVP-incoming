"use client";

import Image from "next/image";
import { useRef } from "react";
import { Play } from "lucide-react";
import { getRepoBackdrop, type Repo } from "./RepoCard";
import { friendlyCategoryLabel, summarizeRepoForBeginners } from "@/lib/repoSummary";

interface NewsTickerProps {
  repos: Repo[];
}

export default function NewsTicker({ repos }: NewsTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!repos || repos.length === 0) return null;

  const desktopRepos = repos.slice(0, 3);

  const renderCard = (repo: Repo, idx: number, mode: "mobile" | "desktop") => {
    const summary = summarizeRepoForBeginners(repo);
    const tag = idx === 0 ? "Top pick" : idx === 1 ? "Popular" : idx === 2 ? "New" : "Try now";
    const backdrop = getRepoBackdrop(repo);
    const toneClass =
      idx % 3 === 0
        ? "from-cyan-400/25"
        : idx % 3 === 1
          ? "from-violet-400/25"
          : "from-emerald-400/25";

    return (
      <article
        key={`${mode}-${repo.id}`}
        className={`card-3d-inner relative group overflow-hidden rounded-3xl border border-white/10 bg-[#052f3a] shadow-[0_14px_40px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_28px_70px_rgba(0,0,0,0.5)] ${mode === "mobile" ? "w-[92vw] max-w-[560px] shrink-0 snap-center" : "w-full"}`}
      >
        {/* neon top-edge shimmer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-3xl bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
        <button
          onClick={() => window.open(repo.url, "_blank")}
          className="block w-full text-left"
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0c1f28]">
            <Image
              src={backdrop}
              alt=""
              fill
              sizes={mode === "mobile" ? "92vw" : "33vw"}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${toneClass} via-transparent to-transparent`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-zinc-100 backdrop-blur">
              {tag}
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black/35 backdrop-blur">
                {repo.avatar ? (
                  <Image
                    src={repo.avatar}
                    alt={repo.owner || repo.title}
                    width={44}
                    height={44}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-white/15 bg-black/40">
              {repo.avatar ? (
                <Image
                  src={repo.avatar}
                  alt={repo.owner || repo.title}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-300/80">
                {friendlyCategoryLabel(repo)}
              </p>
              <h3 className="truncate text-[22px] font-semibold tracking-tight text-white group-hover:text-blue-100 transition-colors">
                {repo.title}
              </h3>
              <p className="line-clamp-2 text-sm leading-snug text-zinc-300">
                {summary.short}
              </p>
            </div>
            <div className="flex h-9 min-w-[78px] items-center justify-center gap-1.5 rounded-full border border-blue-400/40 bg-blue-500/15 px-3 text-xs font-semibold tracking-wide text-blue-200 transition-all duration-200 group-hover:bg-blue-500/25 group-hover:border-blue-400/60 group-hover:shadow-[0_0_16px_rgba(59,130,246,0.3)]">
              <Play className="h-3 w-3 fill-blue-200" />
              Run
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 sm:px-5">
            <p className="truncate text-xs text-zinc-400">By {repo.owner}</p>
            <p className="text-xs font-medium text-zinc-300">{repo.stars.toLocaleString()} fans</p>
          </div>
        </button>
      </article>
    );
  };

  return (
    <div className="relative w-full mb-4">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300/80">Featured Picks</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Top picks you can try now</h2>
        </div>
      </div>
      <div className="relative overflow-visible pb-2">
        <div 
          ref={scrollRef} 
          className="flex w-full gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbars md:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {repos.map((repo, idx) => renderCard(repo, idx, "mobile"))}
        </div>
        <div className="hidden grid-cols-3 gap-5 md:grid">
          {desktopRepos.map((repo, idx) => renderCard(repo, idx, "desktop"))}
        </div>
      </div>
    </div>
  );
}
