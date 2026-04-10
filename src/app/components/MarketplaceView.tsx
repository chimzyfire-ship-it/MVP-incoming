"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import {
  Search,
  Play,
  Star,
  TrendingUp,
  Award,
  Sparkles,
  Filter,
  Package,
  ArrowUpDown,
  Shield,
  Clock,
  Flame,
  ChevronRight,
} from "lucide-react";
import { type Repo, getRepoBackdrop } from "./RepoCard";
import { summarizeRepoForBeginners } from "@/lib/repoSummary";

interface MarketplaceViewProps {
  repos: Repo[];
  isLoading: boolean;
  onRepoView: (repo: Repo) => void;
  onRun: (repo: Repo) => void;
}

/* ── Price & rating helpers ── */
function getPrice(repo: Repo) {
  if (repo.stars > 100000) return "$29.99";
  if (repo.stars > 50000) return "$19.99";
  if (repo.stars > 10000) return "$9.99";
  return "Free";
}

function getRating(repo: Repo) {
  if (repo.stars > 100000) return 5.0;
  if (repo.stars > 50000) return 4.8;
  if (repo.stars > 10000) return 4.5;
  if (repo.stars > 5000) return 4.2;
  if (repo.stars > 1000) return 4.0;
  return 3.8;
}

function getBadge(repo: Repo, idx: number) {
  if (idx < 2) return "Editor's Choice";
  if (repo.stars > 100000) return "Popular";
  if (repo.stars > 50000) return "Featured";
  return "New";
}

function getLicense(repo: Repo) {
  const source = `${repo.title} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (source.includes("mit")) return "MIT";
  if (source.includes("apache")) return "Apache 2.0";
  if (source.includes("gpl")) return "GPL";
  return "MIT";
}

function getInstalls(repo: Repo) {
  const base = Math.floor(repo.stars * 2.3);
  if (base >= 1000000) return `${(base / 1000000).toFixed(1)}M`;
  if (base >= 1000) return `${(base / 1000).toFixed(0)}K`;
  return `${base}`;
}

const categories = [
  { id: "all", label: "Everything", emoji: "🔥" },
  { id: "ai", label: "Smart helpers", emoji: "🤖" },
  { id: "web", label: "Websites", emoji: "🌐" },
  { id: "mobile", label: "Phone apps", emoji: "📱" },
  { id: "devtools", label: "Handy tools", emoji: "🛠" },
  { id: "data", label: "Numbers & charts", emoji: "📊" },
  { id: "creative", label: "Creative stuff", emoji: "🎨" },
  { id: "security", label: "Safety & privacy", emoji: "🔒" },
  { id: "cloud", label: "Setup helpers", emoji: "☁️" },
];

const collections = [
  { name: "Make your first website", emoji: "🚀", count: 12 },
  { name: "Smart helpers you can talk to", emoji: "🤖", count: 8 },
  { name: "Behind-the-scenes workers", emoji: "⚙️", count: 15 },
  { name: "Play with numbers and charts", emoji: "📈", count: 10 },
];

type SortOption = "popular" | "newest" | "price-low" | "price-high" | "stars";

function categorizeRepo(repo: Repo): string {
  const source = `${repo.title} ${repo.plainEnglishDescription} ${repo.language || ""} ${(repo.topics || []).join(" ")}`.toLowerCase();
  if (["ai", "llm", "gpt", "neural", "transformer", "langchain", "agent"].some((k) => source.includes(k))) return "ai";
  if (["react", "next", "vue", "angular", "frontend", "ui", "css", "web", "html"].some((k) => source.includes(k))) return "web";
  if (["mobile", "ios", "android", "flutter", "react-native", "swift"].some((k) => source.includes(k))) return "mobile";
  if (["cli", "sdk", "plugin", "developer", "devtool", "build", "testing", "debug"].some((k) => source.includes(k))) return "devtools";
  if (["data", "analytics", "pandas", "spark", "ml", "dataset", "chart"].some((k) => source.includes(k))) return "data";
  if (["image", "video", "audio", "design", "creative", "editor", "media"].some((k) => source.includes(k))) return "creative";
  if (["security", "auth", "oauth", "encryption", "privacy", "jwt"].some((k) => source.includes(k))) return "security";
  if (["docker", "kubernetes", "terraform", "cloud", "devops", "aws", "deploy"].some((k) => source.includes(k))) return "cloud";
  return "all";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${star <= Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : star - 0.5 <= rating ? "fill-yellow-400/50 text-yellow-400" : "text-zinc-600"}`}
        />
      ))}
      <span className="ml-1 text-[11px] font-semibold text-zinc-300">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ── Marketplace Card ── */
function MarketplaceCard({
  repo,
  badge,
  onView,
  onRun,
}: {
  repo: Repo;
  badge: string;
  onView: () => void;
  onRun: () => void;
}) {
  const price = getPrice(repo);
  const rating = getRating(repo);
  const license = getLicense(repo);
  const installs = getInstalls(repo);
  const summary = summarizeRepoForBeginners(repo);

  const badgeColors: Record<string, string> = {
    "Editor's Choice": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    "Popular": "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "Featured": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "New": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  return (
    <article
      onClick={onView}
      className="card-3d-inner group relative flex w-full cursor-pointer items-start gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-all duration-300 hover:bg-white/[0.07] hover:border-white/15 hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)]"
    >
      {/* Icon with palette glow halo */}
      <div className="relative shrink-0 overflow-hidden squircle h-[80px] w-[80px] bg-black/40 border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:border-white/25">
        <div className="absolute inset-0 rounded-[22%] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: '0 0 22px rgba(59,130,246,0.35), inset 0 0 10px rgba(59,130,246,0.15)' }} />
        {repo.avatar ? (
          <Image
            src={repo.avatar}
            alt={repo.owner || repo.title}
            fill
            sizes="80px"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Package className="h-9 w-9 text-zinc-500" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 min-w-0 gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-white group-hover:text-blue-300 transition-colors">
              {repo.title}
            </h3>
            <p className="text-[12px] text-zinc-500">{repo.owner}</p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeColors[badge] || badgeColors["New"]}`}>
            {badge}
          </span>
        </div>

        <p className="line-clamp-2 text-[13px] leading-snug text-zinc-400">
          {summary.short}
        </p>

        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <StarRating rating={rating} />
          <span className="text-[11px] text-zinc-500">{installs} installs</span>
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Shield className="h-3 w-3" />
            {license}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            className="flex h-[30px] items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 text-[12px] font-bold text-blue-400 transition-all hover:bg-blue-500/20"
          >
            <Play className="h-3 w-3 fill-blue-400" /> Run
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(repo.url, "_blank");
            }}
            className={`flex h-[30px] items-center justify-center rounded-lg border px-3 text-[12px] font-bold transition-all ${
              price === "Free"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
            }`}
          >
            {price === "Free" ? "Free" : `Get ${price}`}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ── Main MarketplaceView ── */
export default function MarketplaceView({ repos, isLoading, onRepoView, onRun }: MarketplaceViewProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [marketSearch, setMarketSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  const spotlightRepos = repos.slice(0, 3);

  const filteredRepos = useMemo(() => {
    let result = [...repos];

    // Category filter
    if (activeCategory !== "all") {
      result = result.filter((r) => categorizeRepo(r) === activeCategory);
    }

    // Search filter
    if (marketSearch.trim()) {
      const q = marketSearch.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.plainEnglishDescription.toLowerCase().includes(q) ||
          r.owner?.toLowerCase().includes(q)
      );
    }

    // Free only filter
    if (freeOnly) {
      result = result.filter((r) => getPrice(r) === "Free");
    }

    // Sort
    switch (sortBy) {
      case "popular":
        result.sort((a, b) => b.stars - a.stars);
        break;
      case "newest":
        result.sort((a, b) => b.id - a.id);
        break;
      case "price-low":
        result.sort((a, b) => {
          const pa = getPrice(a) === "Free" ? 0 : parseFloat(getPrice(a).replace("$", ""));
          const pb = getPrice(b) === "Free" ? 0 : parseFloat(getPrice(b).replace("$", ""));
          return pa - pb;
        });
        break;
      case "price-high":
        result.sort((a, b) => {
          const pa = getPrice(a) === "Free" ? 0 : parseFloat(getPrice(a).replace("$", ""));
          const pb = getPrice(b) === "Free" ? 0 : parseFloat(getPrice(b).replace("$", ""));
          return pb - pa;
        });
        break;
      case "stars":
        result.sort((a, b) => b.stars - a.stars);
        break;
    }

    return result;
  }, [repos, activeCategory, sortBy, marketSearch, freeOnly]);

  const staffPicks = repos.filter((r) => r.stars > 50000).slice(0, 6);
  const trendingNow = repos.filter((r) => r.stars > 20000).slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400" />
        <span className="text-sm text-zinc-400 font-medium">Loading marketplace...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-300">

      {/* ═══ Hero Spotlight — CASH-style diagonal depth stack ═══ */}
      {spotlightRepos.length > 0 && (
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-cyan-500/10 to-purple-600/10 p-6 sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(147,51,234,0.12),transparent_55%)]" />
          <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-blue-300" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-300/80">Spotlight</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Today&apos;s Top Picks</h2>
            <p className="mt-1 text-sm text-zinc-300">Hand-picked apps ready to run instantly</p>

            {/* Diagonal depth-stack layout: centre card elevated, side cards tilted */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-start">
              {spotlightRepos.map((repo, idx) => {
                const backdrop = getRepoBackdrop(repo);
                /* CASH-style: centre card sits highest, flanking cards tilt inward */
                const tiltClass =
                  idx === 0 ? "sm:rotate-[-2deg] sm:translate-y-3 sm:origin-bottom-right" :
                  idx === 1 ? "sm:-translate-y-3 sm:scale-[1.04] sm:z-10" :
                  "sm:rotate-[2deg] sm:translate-y-3 sm:origin-bottom-left";
                const delay = idx === 0 ? "0ms" : idx === 1 ? "80ms" : "160ms";
                return (
                  <button
                    key={repo.id}
                    onClick={() => onRepoView(repo)}
                    style={{ animationDelay: delay }}
                    className={`card-float-in group relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 text-left transition-all duration-300 hover:border-white/25 hover:shadow-[0_20px_60px_rgba(0,0,0,0.55)] hover:-translate-y-2 hover:scale-[1.02] ${tiltClass}`}
                  >
                    {/* neon top-edge shimmer on hover */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image src={backdrop} alt="" fill sizes="33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
                        {idx === 0 ? "🏆 #1 Pick" : idx === 1 ? "⚡ Hot" : "✨ New"}
                      </div>
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 shrink-0 squircle overflow-hidden border border-white/15 bg-black/30">
                          {repo.avatar && (
                            <Image src={repo.avatar} alt={repo.owner || ""} width={32} height={32} className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-white group-hover:text-blue-200 transition-colors">{repo.title}</p>
                          <p className="text-[11px] text-zinc-400">{repo.owner}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <StarRating rating={getRating(repo)} />
                        <span className={`text-[12px] font-bold ${getPrice(repo) === "Free" ? "text-emerald-400" : "text-cyan-300"}`}>
                          {getPrice(repo)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Category Filter Bar ═══ */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbars pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
                activeCategory === cat.id
                  ? "border-blue-500/40 bg-blue-500/15 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  : "border-white/8 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort/Filter Row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={marketSearch}
              onChange={(e) => setMarketSearch(e.target.value)}
              placeholder="Search marketplace..."
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition-all focus:border-blue-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-semibold transition-all ${
              showFilters ? "border-blue-500/40 bg-blue-500/15 text-blue-300" : "border-white/8 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 rounded-xl border border-white/8 bg-white/[0.03] px-3 text-[13px] font-semibold text-zinc-300 outline-none transition-all focus:border-blue-500/40 cursor-pointer"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="stars">Most Stars</option>
            <option value="price-low">Price: Low → High</option>
            <option value="price-high">Price: High → Low</option>
          </select>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 animate-in slide-in-from-top-2 duration-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/30 text-blue-500 accent-blue-500"
              />
              <span className="text-[13px] font-medium text-zinc-300">Free only</span>
            </label>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-[12px] text-zinc-500">{filteredRepos.length} results</span>
          </div>
        )}
      </div>

      {/* ═══ Staff Picks ═══ */}
      {staffPicks.length > 0 && activeCategory === "all" && !marketSearch.trim() && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-400" />
              <h2 className="text-xl font-bold tracking-tight text-white">Staff Picks</h2>
            </div>
            <span className="text-[12px] text-zinc-500">Curated by GITMURPH</span>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {staffPicks.map((repo, idx) => (
              <MarketplaceCard
                key={repo.id}
                repo={repo}
                badge={getBadge(repo, idx)}
                onView={() => onRepoView(repo)}
                onRun={() => onRun(repo)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Collections ═══ */}
      {activeCategory === "all" && !marketSearch.trim() && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Collections</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {collections.map((col) => (
              <button
                key={col.name}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.07] hover:border-white/15 text-left"
              >
                <span className="text-2xl">{col.emoji}</span>
                <span className="text-[13px] font-semibold text-white group-hover:text-blue-300 transition-colors leading-tight">{col.name}</span>
                <span className="text-[11px] text-zinc-500">{col.count} apps</span>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-blue-400 transition-colors mt-auto" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Trending Now ═══ */}
      {trendingNow.length > 0 && activeCategory === "all" && !marketSearch.trim() && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">Trending Now</h2>
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {trendingNow.map((repo, idx) => (
              <MarketplaceCard
                key={repo.id}
                repo={repo}
                badge={repo.stars > 80000 ? "Popular" : "Featured"}
                onView={() => onRepoView(repo)}
                onRun={() => onRun(repo)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ All Marketplace Items ═══ */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-zinc-500" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {marketSearch.trim()
                ? `Results for "${marketSearch}"`
                : activeCategory !== "all"
                  ? `${categories.find((c) => c.id === activeCategory)?.label || "All"} Apps`
                  : "All Apps"}
            </h2>
          </div>
          <span className="text-[12px] text-zinc-500">{filteredRepos.length} apps</span>
        </div>

        {filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center bg-black/20 rounded-2xl border border-white/5">
            <Search className="h-10 w-10 text-zinc-600" />
            <p className="text-sm font-medium text-zinc-400">No apps match your filters.</p>
            <button
              onClick={() => {
                setActiveCategory("all");
                setMarketSearch("");
                setFreeOnly(false);
              }}
              className="text-[13px] font-semibold text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredRepos.slice(0, 30).map((repo, idx) => (
              <MarketplaceCard
                key={repo.id}
                repo={repo}
                badge={getBadge(repo, idx)}
                onView={() => onRepoView(repo)}
                onRun={() => onRun(repo)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══ GITMURPH Watermark ═══ */}
      <div className="flex items-center justify-center py-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          GITMURPH Marketplace
        </span>
      </div>
    </div>
  );
}
