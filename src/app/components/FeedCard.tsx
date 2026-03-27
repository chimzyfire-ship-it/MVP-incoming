"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Star,
  Video,
  Flame,
  X,
} from "lucide-react";
import { type Repo, getRepoBackdrop } from "./RepoCard";
import { summarizeRepoForBeginners } from "@/lib/repoSummary";

export type FeedCardVariant = "ai-summary" | "video" | "spotlight" | "trending" | "didyouknow";

interface FeedCardProps {
  repo: Repo;
  variant: FeedCardVariant;
  index: number;
  onView: () => void;
  onRun: () => void;
}

/* ── AI-generated content ── */
function getAIContent(repo: Repo) {
  const summary = summarizeRepoForBeginners(repo);
  const hooks = [
    `Ever wondered how ${repo.title} works? Here's the quick version.`,
    `If you've never heard of ${repo.title}, you're missing out.`,
    `${repo.title} is one of those tools that changes how you work.`,
    `Here's why ${repo.owner || "developers"} built ${repo.title} — and why you should care.`,
    `In 30 seconds: what ${repo.title} does and why it matters.`,
  ];
  const randomHook = hooks[repo.id % hooks.length];
  return { hook: randomHook, summary: summary.deep, short: summary.short };
}

function getDidYouKnow(repo: Repo) {
  const facts = [
    `${repo.title} has more than ${repo.stars.toLocaleString()} stars on GitHub — that's more popular than most apps in the App Store!`,
    `The team behind ${repo.title} includes contributors from around the world, all building it together.`,
    `${repo.title} is completely open-source — you can read every line of code and even contribute.`,
    `If you run ${repo.title}, it sets up automatically — no terminal or coding knowledge needed.`,
    `${repo.title} is used by developers at companies you've definitely heard of.`,
  ];
  return facts[repo.id % facts.length];
}

function getTrendingCopy(repo: Repo) {
  const deltas = ["2.1K", "1.5K", "3.2K", "890", "1.8K", "4.1K"];
  const delta = deltas[repo.id % deltas.length];
  return `${repo.title} gained ${delta} stars this week`;
}

function getVideoDuration() {
  const durations = ["0:45", "1:12", "2:03", "1:38", "0:58", "3:15"];
  return durations[Math.floor(Math.random() * durations.length)];
}

/* ── Engagement Bar ── */
function EngagementBar({ repo, onRun }: { repo: Repo; onRun: () => void }) {
  const [liked, setLiked] = useState(false);
  const likeCount = Math.floor(repo.stars / 100) + (liked ? 1 : 0);

  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
          className="flex items-center gap-1.5 transition-all"
        >
          <Heart
            className={`h-4 w-4 transition-all duration-300 ${
              liked ? "fill-rose-500 text-rose-500 scale-110" : "text-zinc-400 hover:text-rose-400"
            }`}
          />
          <span className={`text-[12px] font-medium ${liked ? "text-rose-400" : "text-zinc-500"}`}>
            {likeCount.toLocaleString()}
          </span>
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-[12px] font-medium text-zinc-500">{Math.floor(repo.stars / 500)}</span>
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRun();
        }}
        className="flex h-[28px] items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 text-[11px] font-bold text-blue-400 transition-all hover:bg-blue-500/20"
      >
        <Play className="h-3 w-3 fill-blue-400" /> Run it
      </button>
    </div>
  );
}

/* ── Feed Card Component ── */
export default function FeedCard({ repo, variant, index, onView, onRun }: FeedCardProps) {
  const summary = summarizeRepoForBeginners(repo);

  const cardClasses = "cursor-pointer rounded-2xl border border-white/8 overflow-hidden transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)] feed-card-enter";
  const cardStyle = { animationDelay: `${index * 80}ms` };

  /* ── AI Summary Card ── */
  if (variant === "ai-summary") {
    const ai = getAIContent(repo);
    const gradients = [
      "from-blue-600/15 via-cyan-500/8 to-transparent",
      "from-purple-600/15 via-pink-500/8 to-transparent",
      "from-emerald-600/15 via-teal-500/8 to-transparent",
      "from-orange-600/15 via-amber-500/8 to-transparent",
    ];
    const gradient = gradients[index % gradients.length];

    return (
      <article onClick={onView} className={cardClasses} style={cardStyle}>
        <div className={`bg-gradient-to-br ${gradient} bg-white/[0.02] p-5`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-black/30">
              {repo.avatar && (
                <Image src={repo.avatar} alt={repo.owner || ""} width={40} height={40} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{repo.owner}</p>
              <p className="text-[11px] text-zinc-500">via GITMURPH AI</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/20 px-2.5 py-1">
              <Sparkles className="h-3 w-3 text-blue-300" />
              <span className="text-[10px] font-semibold text-blue-300">AI Generated</span>
            </div>
          </div>

          <h3 className="text-[16px] font-bold text-white leading-snug mb-2">{repo.title}</h3>
          <p className="text-[14px] text-zinc-200 leading-relaxed mb-2">{ai.hook}</p>
          <p className="text-[13px] text-zinc-400 leading-relaxed line-clamp-3">{ai.short}</p>

          <EngagementBar repo={repo} onRun={onRun} />
        </div>
      </article>
    );
  }

  /* ── Video Card ── */
  if (variant === "video") {
    const backdrop = getRepoBackdrop(repo);
    const duration = getVideoDuration();

    return (
      <article onClick={onView} className={cardClasses} style={cardStyle}>
        <div className="bg-white/[0.02]">
          <div className="flex items-center gap-3 p-4 pb-3">
            <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-black/30">
              {repo.avatar && (
                <Image src={repo.avatar} alt={repo.owner || ""} width={36} height={36} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{repo.owner}</p>
              <p className="text-[11px] text-zinc-500">Explainer · {duration}</p>
            </div>
            <Video className="h-4 w-4 text-zinc-500" />
          </div>

          <div className="relative aspect-video w-full overflow-hidden bg-black/40">
            <Image src={backdrop} alt="" fill sizes="100%" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/20 transition-transform hover:scale-110">
                <Play className="h-6 w-6 fill-white text-white ml-0.5" />
              </div>
            </div>
            <div className="absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              {duration}
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <div className="rounded-md bg-black/50 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur">
                {repo.title}
              </div>
            </div>
          </div>

          <div className="p-4 pt-3">
            <h3 className="text-[15px] font-semibold text-white">How {repo.title} works — explained simply</h3>
            <p className="text-[13px] text-zinc-400 mt-1 line-clamp-2">{summary.short}</p>
            <EngagementBar repo={repo} onRun={onRun} />
          </div>
        </div>
      </article>
    );
  }

  /* ── Spotlight Card ── */
  if (variant === "spotlight") {
    const backdrop = getRepoBackdrop(repo);

    return (
      <article onClick={onView} className={cardClasses} style={cardStyle}>
        <div className="relative overflow-hidden">
          <div className="relative aspect-[2/1] w-full overflow-hidden">
            <Image src={backdrop} alt="" fill sizes="100%" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#042a33] via-[#042a33]/50 to-transparent" />
            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-500/30 to-orange-500/20 border border-yellow-500/30 px-3 py-1 backdrop-blur">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-[11px] font-bold text-yellow-200">App of the Day</span>
            </div>
          </div>
          <div className="p-5 -mt-10 relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-14 w-14 overflow-hidden squircle border-2 border-white/15 bg-black/40 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                {repo.avatar && (
                  <Image src={repo.avatar} alt={repo.owner || ""} width={56} height={56} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-white">{repo.title}</h3>
                <p className="text-[13px] text-zinc-400">{repo.owner}</p>
              </div>
            </div>
            <p className="text-[14px] text-zinc-300 leading-relaxed">{summary.short}</p>
            <EngagementBar repo={repo} onRun={onRun} />
          </div>
        </div>
      </article>
    );
  }

  /* ── Trending Card ── */
  if (variant === "trending") {
    const copy = getTrendingCopy(repo);

    return (
      <article onClick={onView} className={cardClasses} style={cardStyle}>
        <div className="bg-gradient-to-r from-orange-500/8 to-transparent bg-white/[0.02] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 border border-orange-500/20">
              <Flame className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">Trending</span>
              </div>
              <p className="text-[14px] font-semibold text-white">{copy}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-6 w-6 overflow-hidden rounded-full border border-white/10 bg-black/30">
                  {repo.avatar && (
                    <Image src={repo.avatar} alt={repo.owner || ""} width={24} height={24} className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="text-[12px] text-zinc-400">{repo.owner}/{repo.title}</span>
                <span className="text-[12px] text-zinc-500">· {repo.stars.toLocaleString()} ★</span>
              </div>
            </div>
          </div>
          <EngagementBar repo={repo} onRun={onRun} />
        </div>
      </article>
    );
  }

  /* ── Did You Know Card ── */
  if (variant === "didyouknow") {
    const fact = getDidYouKnow(repo);

    return (
      <article onClick={onView} className={cardClasses} style={cardStyle}>
        <div className="bg-gradient-to-br from-violet-500/8 to-transparent bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/20">
              <Lightbulb className="h-4 w-4 text-violet-300" />
            </div>
            <span className="text-[12px] font-semibold text-violet-300 uppercase tracking-wider">Did You Know?</span>
          </div>
          <p className="text-[14px] text-zinc-200 leading-relaxed mb-3">{fact}</p>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border border-white/10 bg-black/30">
              {repo.avatar && (
                <Image src={repo.avatar} alt={repo.owner || ""} width={32} height={32} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{repo.title}</p>
              <p className="text-[11px] text-zinc-500">{repo.owner}</p>
            </div>
          </div>
          <EngagementBar repo={repo} onRun={onRun} />
        </div>
      </article>
    );
  }

  return null;
}

/* ── Video Story Circle (for the stories bar) ── */
export function StoryCircle({
  repo,
  isActive,
  onClick,
}: {
  repo: Repo;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1.5 group"
    >
      <div
        className={`relative h-16 w-16 rounded-full p-[2px] transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-tr from-blue-500 via-cyan-400 to-purple-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : "bg-gradient-to-tr from-zinc-600 to-zinc-700 group-hover:from-blue-500/50 group-hover:to-cyan-400/50"
        }`}
      >
        <div className="absolute inset-[2px] overflow-hidden rounded-full border-2 border-[#042a33] bg-black/40">
          {repo.avatar ? (
            <Image
              src={repo.avatar}
              alt={repo.owner || repo.title}
              width={60}
              height={60}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-500">
              <Play className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 border-2 border-[#042a33]">
          <Play className="h-2.5 w-2.5 fill-white text-white ml-[1px]" />
        </div>
      </div>
      <span className="max-w-[64px] truncate text-[10px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
        {repo.title}
      </span>
    </button>
  );
}

/* ── Full-screen story overlay ── */
export function StoryOverlay({
  repo,
  onClose,
  onRun,
}: {
  repo: Repo;
  onClose: () => void;
  onRun: () => void;
}) {
  const backdrop = getRepoBackdrop(repo);
  const summary = summarizeRepoForBeginners(repo);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-4 aspect-[9/16] max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0e14]">
        <Image src={backdrop} alt="" fill className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress bar */}
        <div className="absolute top-3 left-4 right-14 h-0.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-full rounded-full bg-white/80 animate-[story-progress_5s_linear_forwards]" />
        </div>

        {/* Owner */}
        <div className="absolute top-8 left-4 flex items-center gap-2">
          <div className="h-8 w-8 overflow-hidden rounded-full border border-white/20 bg-black/30">
            {repo.avatar && (
              <Image src={repo.avatar} alt={repo.owner || ""} width={32} height={32} className="h-full w-full object-cover" />
            )}
          </div>
          <span className="text-[13px] font-semibold text-white">{repo.owner}</span>
          <span className="text-[11px] text-zinc-400">· Just now</span>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-2xl font-bold text-white mb-2">{repo.title}</h2>
          <p className="text-[14px] text-zinc-200 leading-relaxed mb-4 line-clamp-4">{summary.short}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onRun}
              className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-full bg-blue-500 font-bold text-white text-[15px] transition-all hover:bg-blue-400 active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" /> Run this app
            </button>
            <button className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/10 text-white backdrop-blur border border-white/10">
              <Heart className="h-5 w-5" />
            </button>
            <button className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/10 text-white backdrop-blur border border-white/10">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
