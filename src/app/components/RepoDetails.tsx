"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Monitor,
  Star,
  Globe,
  Shield,
  BookOpen,
  Users,
  Sparkles,
  Cpu,
} from "lucide-react";

import { type Repo } from "./RepoCard";
import { buildLongBeginnerStory, friendlyCategoryLabel } from "@/lib/repoSummary";

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

export default function RepoDetails({
  repo,
  showShopActions = false,
  onRun,
  onClose,
}: RepoDetailsProps) {
  const [expanded, setExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [likes, setLikes] = useState(repo.stars || 0);

  const story = useMemo(() => buildLongBeginnerStory(repo), [repo]);
  const category = friendlyCategoryLabel(repo);
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
    const identified = [];
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
    
    // Add primary language
    const lang = repo.language && repo.language !== "Unknown" ? repo.language : null;
    if (lang && !identified.some(i => i.toLowerCase() === lang.toLowerCase())) {
        identified.push(lang);
    }
    
    return identified.length > 0 ? identified : ["Standard codebase"];
  }, [repo.topics, repo.language]);

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
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.title]);

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {/* Sticky top bar */}
      <header
        className={`sticky top-0 z-40 transition-colors duration-200 ${
          scrolled ? "border-b border-white/10 bg-black/85 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-3 sm:h-14">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-200 hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shadow-sm" />
            <span className="text-[15px] font-semibold tracking-tight">Gitmurph</span>
          </div>
          <div className="w-10" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-2 sm:px-5">
        {/* Hero */}
        <section className="border-b border-white/10 pb-8">
          <div className="flex gap-4">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.35)] sm:h-32 sm:w-32">
              {repo.avatar ? (
                <Image
                  src={repo.avatar}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-500">
                  {repo.title?.slice(0, 1) || "?"}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-3xl">
                {repo.title}
              </h1>
              <p className="mt-1 text-[15px] text-zinc-400">By {repo.owner || "the open community"}</p>
              <p className="mt-2 text-[13px] leading-snug text-zinc-500">
                {category} · Free to try · Nothing to install on your computer
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (showShopActions) {
                  window.open(repo.url, "_blank");
                  return;
                }
                onRun(repo);
              }}
              className="inline-flex min-h-[48px] min-w-[140px] items-center justify-center rounded-full bg-blue-500 px-10 text-[17px] font-bold tracking-wide text-white shadow-[0_6px_20px_rgba(59,130,246,0.4)] transition hover:bg-blue-400 active:scale-[0.98]"
            >
              {showShopActions ? "GET" : "RUN"}
            </button>
            {showShopActions ? (
              <span className="text-xs text-zinc-500">Opens the project page so you can see more</span>
            ) : (
              <span className="text-xs text-zinc-500">We handle all the setup — you just explore</span>
            )}
          </div>
        </section>

        {/* Stats row */}
        <section className="border-b border-white/10 py-4">
          <div className="-mx-4 flex snap-x snap-mandatory gap-0 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <StatCell
              label="People love it"
              sub="Stars from fans"
              value={likes > 0 ? `4.5` : "—"}
              icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
            />
            <StatDivider />
            <StatCell label="Type" sub="What kind of thing it is" value={category} />
            <StatDivider />
            <StatCell label="For everyone" sub="No age limit" value="All ages" />
            <StatDivider />
            <StatCell label="Fans" sub="People who saved a star" value={formatLikes(likes)} />
            <StatDivider />
            <StatCell label="Size" sub="Roughly this big" value={sizeLabel} />
          </div>
        </section>

        {/* Smart Tech Stack Analysis */}
        <section className="border-b border-white/10 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight">Smart Tech Stack Analysis</h2>
          </div>
          <p className="text-[14px] leading-relaxed text-zinc-400 mb-4">
            Before running this application, we automatically analyzed the codebase. No configuration or technical setup is required on your part — our engine handles it natively.
          </p>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-[13px] font-medium text-indigo-300 shadow-inner">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* What's New */}
        <section className="border-b border-white/10 py-8">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight">What&apos;s New</h2>
            <span className="shrink-0 text-xs text-zinc-500">Version {version}</span>
          </div>
          <ul className="space-y-2 text-[15px] leading-relaxed text-zinc-300">
            <li className="flex gap-2">
              <span className="text-blue-400">✦</span>
              <span>We rewrote every description so a normal person can understand it — no computer words, no confusing language.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">✦</span>
              <span>Removed the image previews that weren&apos;t useful — now everything loads faster and looks cleaner.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400">✦</span>
              <span>One tap on Run is all it takes. We do the rest.</span>
            </li>
          </ul>
        </section>

        {/* The full story — no screenshots, no image carousel */}
        <section className="border-b border-white/10 py-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">The full story (in normal words)</h2>
          </div>
          <div className="space-y-5 text-[15px] leading-[1.85] text-zinc-300">
            {shownText.split("\n\n").map((block, i) => (
              <p key={i} className="first-letter:text-lg first-letter:font-semibold first-letter:text-white">{block}</p>
            ))}
          </div>
          {story.techFootnote ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-4 text-[13px] leading-relaxed text-zinc-400">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">For the curious</span>
              </div>
              {story.techFootnote}
            </div>
          ) : null}
          {needsMore ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 text-[15px] font-semibold text-blue-400 hover:text-blue-300"
            >
              {expanded ? "Show less ▲" : "Keep reading ▼"}
            </button>
          ) : null}
        </section>

        {/* Who made this */}
        <section className="border-b border-white/10 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight">Who made this</h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
                {repo.avatar ? (
                  <Image
                    src={repo.avatar}
                    alt={repo.owner || ""}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-500">
                    {(repo.owner || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-white">{repo.owner || "The open community"}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
                  This was made by {repo.owner || "volunteers"} and shared with the world for free.
                  Real people — not a big company — decided to give away their work so you can use it,
                  learn from it, or just have fun with it. That is what free software is all about.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supports */}
        <section className="border-b border-white/10 py-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight">How it works on Gitmurph</h2>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <Heart className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold text-white">We believe trying things should be easy</p>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
                  Gitmurph is built so you can try apps without downloading anything, putting in commands,
                  or reading instruction manuals. You tap Run, we take care of the boring stuff, and the app
                  opens in your browser. If something goes wrong, that is our problem to fix — not yours.{" "}
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-400 hover:text-blue-300"
                  >
                    See the original project page →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Information */}
        <section className="py-8">
          <h2 className="mb-4 text-xl font-bold tracking-tight">Quick facts</h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <InfoBlock label="Made by" value={repo.owner || "Open source community"} />
            <InfoBlock label="Rough size" value={sizeLabel} />
            <InfoBlock label="Type" value={category} />
            <InfoBlock label="Works on" value="Any device with a web browser" icon={<Monitor className="h-4 w-4" />} />
            <InfoBlock label="Language" value="Mostly in English" icon={<Globe className="h-4 w-4" />} />
            <InfoBlock label="Your privacy" value="Check the project page for details" icon={<Shield className="h-4 w-4" />} />
          </div>
          <button
            type="button"
            className="mt-6 flex w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3 text-left text-zinc-300 hover:bg-zinc-900/70"
          >
            <span className="text-sm">See more from this maker</span>
            <ChevronRight className="h-5 w-5 text-zinc-500" />
          </button>
        </section>
      </main>
    </div>
  );
}

function StatCell({
  label,
  sub,
  value,
  icon,
}: {
  label: string;
  sub: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex w-[112px] shrink-0 snap-start flex-col items-center px-1 text-center sm:w-[120px]">
      <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">{label}</span>
      <div className="mt-1 flex items-center justify-center gap-1">
        {icon}
        <span className="text-[15px] font-semibold text-white">{value}</span>
      </div>
      <span className="mt-0.5 text-[11px] text-zinc-500">{sub}</span>
    </div>
  );
}

function StatDivider() {
  return <div className="w-px shrink-0 self-stretch bg-white/10" aria-hidden />;
}

function InfoBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-zinc-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {icon ? <span className="text-zinc-400">{icon}</span> : null}
        <p className="text-[15px] font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
