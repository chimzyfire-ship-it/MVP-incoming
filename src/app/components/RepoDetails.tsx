"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ShieldCheck, Smartphone, HardDrive, Grid2x2 } from "lucide-react";

import { type Repo } from "./RepoCard";

interface RepoDetailsProps {
  repo: Repo;
  onClose: () => void;
  showShopActions?: boolean;
  onRun?: (repo: Repo) => void;
}

function formatCompact(value?: number) {
  if (typeof value !== "number") return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function normalize(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function getSimpleSummary(repo: Repo) {
  const raw = normalize(repo.plainEnglishDescription || "");
  const source = `${repo.title} ${raw} ${(repo.topics || []).join(" ")} ${repo.language || ""}`.toLowerCase();

  const typeLabel =
    source.includes("ai") || source.includes("llm") ? "AI Tool" :
    source.includes("next") || source.includes("react") || source.includes("web") ? "Web App" :
    source.includes("api") || source.includes("server") ? "Server App" :
    source.includes("data") || source.includes("analytics") ? "Data Tool" :
    "Open Source App";

  const short = raw || `${repo.title} is a community-built app you can run in one tap.`;
  const bestFor = [
    source.includes("ai") ? "chat, automation, and smart assistant tasks" : "",
    source.includes("dev") || source.includes("tool") ? "building and shipping faster" : "",
    source.includes("data") ? "exploring data and insights" : "",
    source.includes("web") || source.includes("react") || source.includes("next") ? "browser-based app experiences" : "",
    "trying useful open-source products quickly",
  ].filter(Boolean).slice(0, 3);

  const howToUse = [
    "Tap RUN to launch it.",
    "Wait for setup to finish in the Try Apps tab.",
    "Press Open app and start exploring.",
  ];

  return { typeLabel, short, bestFor, howToUse };
}

export default function RepoDetails({ repo, onClose, onRun }: RepoDetailsProps) {
  const [stars, setStars] = useState<number>(repo.stars || 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const summary = getSimpleSummary(repo);
  const appIcon = repo.avatar || "";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const owner = repo.owner?.trim();
    const name = repo.title?.trim();
    if (!owner || !name) return;
    let cancelled = false;

    async function hydrateStars() {
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${name}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      } catch {
        // Keep fallback stars
      }
    }

    hydrateStars();
    return () => {
      cancelled = true;
    };
  }, [repo.owner, repo.title]);

  const desc = summary.short;
  const isLong = desc.length > 170;
  const displayedDesc = expanded || !isLong ? desc : `${desc.slice(0, 170)}...`;
  const version = `v${Math.max(1, Math.min(9, (stars % 9) + 1))}.${(stars % 10) || 1}.${(repo.forks || 0) % 10}`;
  const ageRating = "4+";
  const category = summary.typeLabel;
  const size = `${Math.max(18, Math.min(480, Math.round((repo.stars || 1000) / 500)))} MB`;

  return (
    <div className="w-full bg-zinc-950 text-white">
      <div
        className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled ? "bg-zinc-950/90 backdrop-blur-xl border-b border-white/10" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 w-full max-w-[860px] items-center justify-between px-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 hover:bg-white/10"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-400 to-cyan-500" />
            <span className="text-sm font-semibold tracking-tight text-zinc-100">Gitmurph</span>
          </div>
          <div className="h-9 w-9" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-6 sm:px-6">
        <section className="mb-8 flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-800 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 sm:h-28 sm:w-28">
            {appIcon ? (
              <Image src={appIcon} alt={repo.title} fill sizes="112px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-400">
                <Grid2x2 className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white">{repo.title}</h1>
            <p className="mt-1 text-sm font-medium text-zinc-400">{repo.owner || "Open Source Community"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-blue-300/90">{summary.typeLabel}</p>
            <button
              onClick={() => {
                if (onRun) {
                  onRun(repo);
                  return;
                }
                window.open(repo.url, "_blank");
              }}
              className="mt-4 inline-flex h-12 min-w-[150px] items-center justify-center rounded-full bg-blue-500 px-8 text-base font-bold tracking-wide text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)] transition-all hover:bg-blue-400 active:scale-[0.98]"
            >
              {onRun ? "RUN" : "GET"}
            </button>
          </div>
        </section>

        <section className="mb-8 overflow-x-auto">
          <div className="inline-flex min-w-full items-stretch rounded-2xl border border-white/10 bg-zinc-900/70 px-2 py-3">
            <div className="min-w-[130px] px-3 text-center">
              <p className="text-xs font-medium text-zinc-500">Rating</p>
              <p className="mt-1 text-sm font-semibold text-white">4.8 <span className="text-zinc-400">Stars</span></p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="min-w-[130px] px-3 text-center">
              <p className="text-xs font-medium text-zinc-500">Category</p>
              <p className="mt-1 text-sm font-semibold text-white">{category}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="min-w-[130px] px-3 text-center">
              <p className="text-xs font-medium text-zinc-500">Age</p>
              <p className="mt-1 text-sm font-semibold text-white">{ageRating}+</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="min-w-[130px] px-3 text-center">
              <p className="text-xs font-medium text-zinc-500">Likes</p>
              <p className="mt-1 text-sm font-semibold text-white">{formatCompact(stars)}</p>
            </div>
          </div>
        </section>

        <section className="mb-9 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">What&apos;s New</h2>
            <span className="text-sm font-semibold text-zinc-400">{version}</span>
          </div>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <li>- Easier first-time setup and clearer run flow.</li>
            <li>- Simpler wording for non-technical users.</li>
            <li>- Better app details layout and readability polish.</li>
          </ul>
        </section>

        <section className="mb-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">Preview</h2>
            <span className="text-xs text-zinc-500">Swipe</span>
          </div>
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-96 w-64 shrink-0 snap-start rounded-xl border border-white/10 bg-zinc-800"
              />
            ))}
          </div>
        </section>

        <section className="mb-9">
          <h2 className="mb-3 text-xl font-bold tracking-tight text-white">In Plain English</h2>
          <p className="text-[15px] leading-7 text-zinc-300">{displayedDesc}</p>
          {isLong ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              {expanded ? "less" : "more"}
            </button>
          ) : null}
        </section>

        <section className="mb-9 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4">
          <h2 className="mb-3 text-xl font-bold tracking-tight text-white">How to use this app (easy)</h2>
          <div className="space-y-2 text-sm text-zinc-200">
            {summary.howToUse.map((step) => (
              <p key={step} className="leading-relaxed">• {step}</p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-xl font-bold tracking-tight text-white">Information</h2>
          <div className="divide-y divide-white/10">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-zinc-500">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm">Seller</span>
              </div>
              <span className="text-sm font-medium text-zinc-100">{repo.owner || "Open Source Community"}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-zinc-500">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm">Size</span>
              </div>
              <span className="text-sm font-medium text-zinc-100">{size}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-zinc-500">
                <Grid2x2 className="h-4 w-4" />
                <span className="text-sm">Category</span>
              </div>
              <span className="text-sm font-medium text-zinc-100">{category}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-zinc-500">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm">Compatibility</span>
              </div>
              <span className="text-sm font-medium text-zinc-100">Web browser (desktop + mobile)</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
