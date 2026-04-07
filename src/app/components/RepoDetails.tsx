"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  Heart,
  Star,
  Globe,
  Shield,
  BookOpen,
  Users,
  User,
  Activity,
  Info,
  Play,
  X,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

import { type Repo } from "./RepoCard";
import { buildLongBeginnerStory, friendlyCategoryLabel } from "@/lib/repoSummary";
import { useAuth } from "../context/AuthContext";
import { getRepoBackdrop, getRepoPalette } from "./RepoCard";
import { useSkillLevel } from "../hooks/useSkillLevel";

interface RepoDetailsProps {
  repo: Repo;
  showShopActions?: boolean;
  onRun: (repo: Repo) => void;
  onClose: () => void;
}

function formatLikes(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Friendly plain-English names for tech stack items
const TECH_PLAIN: Record<string, { label: string; color: string }> = {
  "typescript":  { label: "Typed scripting language",   color: "#38bdf8" },
  "javascript":  { label: "Web scripting language",     color: "#facc15" },
  "python":      { label: "General-purpose language",   color: "#60a5fa" },
  "rust":        { label: "Systems programming language", color: "#fb923c" },
  "go":          { label: "Compiled, concurrent language", color: "#22d3ee" },
  "java":        { label: "Cross-platform language",    color: "#f97316" },
  "next.js":     { label: "React-based web framework",  color: "#a3a3a3" },
  "react":       { label: "UI component library",       color: "#67e8f9" },
  "vue":         { label: "Progressive UI framework",   color: "#4ade80" },
  "angular":     { label: "Full-scale UI framework",    color: "#f87171" },
  "svelte":      { label: "Compiled UI framework",      color: "#fb923c" },
  "tailwind css":{ label: "Utility-first CSS framework", color: "#38bdf8" },
  "node.js":     { label: "Server-side JavaScript runtime", color: "#4ade80" },
  "express":     { label: "Minimal web server framework", color: "#a3a3a3" },
  "django":      { label: "Python web framework",       color: "#34d399" },
  "laravel":     { label: "PHP web framework",          color: "#f87171" },
};

function friendlyTech(tech: string) {
  const key = tech.toLowerCase();
  return TECH_PLAIN[key] ?? { label: "Programming language or tool", color: "#a3a3a3" };
}

export default function RepoDetails({
  repo,
  showShopActions = false,
  onRun,
  onClose,
}: RepoDetailsProps) {
  const { user, openAuthModal } = useAuth();
  const skillLevel = useSkillLevel();
  const [expanded, setExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [likes, setLikes] = useState(repo.stars || 0);
  const [showIframe, setShowIframe] = useState(false);
  const [copied, setCopied] = useState(false);

  const githubPath = useMemo(() => {
    if (!repo.url) return `${repo.owner}/${repo.title}`;
    return repo.url.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  }, [repo.url, repo.owner, repo.title]);

  const story = useMemo(() => buildLongBeginnerStory(repo, skillLevel), [repo, skillLevel]);
  const category = friendlyCategoryLabel(repo, skillLevel);
  const fullText = useMemo(() => story.paragraphs.join("\n\n"), [story.paragraphs]);
  const previewLength = 700;
  const needsMore = fullText.length > previewLength;
  const shownText =
    expanded || !needsMore ? fullText : `${fullText.slice(0, previewLength).trim()}…`;

  const version = useMemo(() => {
    const n = repo.id || 0;
    return `1.${(n % 12) + 1}.${(n % 20) + 1}`;
  }, [repo.id]);

  const sizeLabel = useMemo(() => {
    const mb = Math.max(12, Math.min(420, Math.round((repo.stars || 800) / 400)));
    return `${mb} MB`;
  }, [repo.stars]);

  const techStack = useMemo(() => {
    const identified: string[] = [];
    const t = (repo.topics || []).join(" ").toLowerCase();

    if (t.includes("next")) identified.push("Next.js");
    else if (t.includes("react")) identified.push("React");
    else if (t.includes("vue")) identified.push("Vue");
    else if (t.includes("angular")) identified.push("Angular");
    else if (t.includes("svelte")) identified.push("Svelte");

    if (t.includes("tailwind")) identified.push("Tailwind CSS");
    if (t.includes("node")) identified.push("Node.js");
    if (t.includes("express")) identified.push("Express");
    if (t.includes("django")) identified.push("Django");
    if (t.includes("laravel")) identified.push("Laravel");

    const lang = repo.language && repo.language !== "Unknown" ? repo.language : null;
    if (lang && !identified.some((i) => i.toLowerCase() === lang.toLowerCase())) {
      identified.push(lang);
    }

    return identified.length > 0 ? identified : ["Standard codebase"];
  }, [repo.topics, repo.language]);

  const backdrop = useMemo(() => getRepoBackdrop(repo), [repo]);
  const palette = useMemo(() => getRepoPalette(repo), [repo]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const owner = repo.owner?.trim();
    const name = repo.title?.trim();
    if (!owner || !name) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${name}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.stargazers_count === "number") {
          setLikes(data.stargazers_count);
        }
      } catch {
        /* keep local */
      }
    })();
    return () => { cancelled = true; };
  }, [repo.owner, repo.title]);

  function handleRun() {
    if (!user) {
      openAuthModal("run_gate", repo);
      return;
    }
    if (showShopActions) {
      window.open(repo.url, "_blank");
      return;
    }
    setShowIframe(true);
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(repo.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Rating derived from likes
  const rating = likes > 50000 ? "4.9" : likes > 10000 ? "4.7" : likes > 1000 ? "4.5" : "4.2";

  return (
    <>
      {showIframe && githubPath && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl">
          <div className="flex min-h-[56px] items-center justify-between border-b border-white/10 bg-black px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Running natively</h3>
                <p className="text-[11px] text-zinc-400 leading-none mt-0.5">Powered by CodeSandbox</p>
              </div>
            </div>
            <button
              onClick={() => setShowIframe(false)}
              className="rounded-full bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 w-full bg-[#151515]">
            <iframe
              src={`https://codesandbox.io/p/github/${githubPath}?embed=1&theme=dark&view=preview`}
              className="h-full w-full border-none"
              allow="clipboard-read; clipboard-write; cross-origin-isolated; display-capture; geolocation; microphone; midi; payment; sync-xhr; camera; xr-spatial-tracking; fullscreen"
            />
          </div>
        </div>
      )}

      <div className="min-h-screen bg-[#042a33] text-white antialiased">

        {/* ─── Sticky Header ─── */}
        <header
          className={`sticky top-0 z-40 transition-all duration-200 ${
            scrolled ? "border-b border-white/10 bg-[#031d24]/90 backdrop-blur-xl" : "bg-transparent"
          }`}
        >
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
              <span className="font-medium">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shadow-sm" />
              <span className="text-[15px] font-bold tracking-tight">Gitmurph</span>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 pb-28 pt-2">

          {/* ─── Hero Banner ─── */}
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            {/* Backdrop */}
            <div className="absolute inset-0">
              <Image src={backdrop} alt="" fill className="object-cover opacity-60" sizes="672px" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#042a33]/60 to-[#042a33]" />
            </div>

            {/* Content */}
            <div className="relative px-5 pt-12 pb-6 sm:px-7 sm:pt-16">
              <span
                className="mb-3 inline-block rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm"
              >
                {category}
              </span>

              <div className="flex items-end gap-4">
                {/* Icon */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.5)] sm:h-24 sm:w-24">
                  {repo.avatar ? (
                    <Image src={repo.avatar} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-3xl font-black"
                      style={{ background: `linear-gradient(135deg, ${palette.primary}33, ${palette.secondary}66)` }}
                    >
                      {repo.title?.slice(0, 1) || "?"}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-1">
                  <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-white sm:text-[2rem]">
                    {repo.title}
                  </h1>
                  <p className="mt-1 text-[14px] text-zinc-400">
                    By <span className="text-zinc-300 font-medium">{repo.owner || "the open community"}</span>
                  </p>
                </div>
              </div>

              {/* CTA row */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRun}
                  className="inline-flex min-h-[50px] min-w-[150px] items-center justify-center gap-2.5 rounded-2xl px-8 text-[16px] font-bold tracking-wide text-white transition-all active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                    boxShadow: `0 6px 24px ${palette.glow}44`,
                  }}
                >
                  {!user ? (
                    <>
                      <User className="h-4 w-4" />
                      Sign up to run
                    </>
                  ) : showShopActions ? (
                    <>
                      <ExternalLink className="h-4 w-4" />
                      View project
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      Run this app
                    </>
                  )}
                </button>

                <a
                  href={repo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[50px] items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-zinc-300 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Source code
                </a>
              </div>

              {!user && (
                <p className="mt-3 text-[12px] text-zinc-500">
                  Free account needed to run apps — takes 30 seconds.
                </p>
              )}
            </div>
          </section>

          {/* ─── Stats Row ─── */}
          <section className="mb-8 grid grid-cols-4 gap-2">
            {[
              { label: "Rating",    value: rating,           sub: "out of 5",           icon: <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> },
              { label: "Fans",      value: formatLikes(likes), sub: "people starred this" },
              { label: "Type",      value: category,         sub: "category" },
              { label: "Size",      value: sizeLabel,        sub: "to download" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 rounded-2xl border border-white/8 bg-black/20 px-2 py-4 text-center"
              >
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{stat.label}</span>
                <div className="flex items-center gap-1">
                  {stat.icon}
                  <span className="text-[16px] font-bold text-white">{stat.value}</span>
                </div>
                <span className="text-[10px] text-zinc-500">{stat.sub}</span>
              </div>
            ))}
          </section>

          {/* ─── Plain English Summary ─── */}
          <section className="mb-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-bold">What is this?</h2>
            </div>
            <div className="space-y-4 text-[15px] leading-[1.9] text-zinc-300">
              {shownText.split("\n\n").map((block, i) => (
                <p key={i}>{block}</p>
              ))}
            </div>
            {story.techFootnote && (
              <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-zinc-400">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">For the curious</span>
                </div>
                {story.techFootnote}
              </div>
            )}
            {needsMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-4 text-[14px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </section>

          {/* ─── How It's Built ─── */}
          <section className="mb-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <h2 className="text-lg font-bold mb-1">Under the hood</h2>
            <p className="text-[13px] text-zinc-500 mb-4">
              Here&apos;s what this app is built with — explained without the jargon.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {techStack.map((tech, idx) => {
                const { label, color } = friendlyTech(tech);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3"
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}88` }}
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white">{tech}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>



          {/* ─── Who Made This ─── */}
          <section className="mb-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold">Who made this</h2>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
                {repo.avatar ? (
                  <Image src={repo.avatar} alt={repo.owner || ""} width={56} height={56} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-500">
                    {(repo.owner || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-white">{repo.owner || "The open community"}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">
                  This was made by {repo.owner || "volunteers"} and shared with the world for free.
                  Real people — not a big company — decided to give away their work so you can use it,
                  learn from it, or just enjoy it.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-[13px] text-zinc-300 font-medium">
                    {formatLikes(likes)} people love this project
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Open Source Note ─── */}
          <section className="mb-8 rounded-2xl border border-white/8 overflow-hidden">
            <div className="flex gap-4 p-5 bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                <Heart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-white">{repo.title} is open source</p>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
                  This project is free and publicly available. Anyone can view the source code, report issues,
                  or contribute improvements. Hit <span className="text-white font-semibold">Run</span> to
                  launch it instantly — no installation required.
                </p>
              </div>
            </div>
            <div className="border-t border-white/8 px-5 py-4">
              <a
                href={repo.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-[13px] text-blue-400 font-medium hover:text-blue-300 transition-colors"
              >
                <Globe className="h-4 w-4" />
                View the original project page
              </a>
            </div>
          </section>

          {/* ─── Quick Facts ─── */}
          <section className="mb-8 rounded-2xl border border-white/8 bg-black/20 p-5">
            <h2 className="text-lg font-bold mb-4">Quick facts</h2>
            <div className="divide-y divide-white/5">
              {[
                { label: "Made by",     value: repo.owner || "Open source community" },
                { label: "Rough size",  value: sizeLabel },
                { label: "Category",    value: category },
                { label: "Works on",    value: "Any device with a web browser" },
                { label: "Language",    value: "Mostly in English",              icon: <Globe className="h-4 w-4 text-zinc-500" /> },
                { label: "Your privacy", value: "Check the project page",        icon: <Shield className="h-4 w-4 text-zinc-500" /> },
              ].map((fact) => (
                <div key={fact.label} className="flex items-center justify-between gap-4 py-3">
                  <span className="text-[13px] text-zinc-500">{fact.label}</span>
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-white text-right">
                    {fact.icon}
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ─── Bottom CTA ─── */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRun}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-bold text-white transition-all active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                boxShadow: `0 6px 24px ${palette.glow}33`,
              }}
            >
              {!user ? (
                <><User className="h-4 w-4" /> Sign up to run</>
              ) : showShopActions ? (
                <><ExternalLink className="h-4 w-4" /> View project</>
              ) : (
                <><Play className="h-4 w-4 fill-white" /> Run this app</>
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
            >
              Back
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
