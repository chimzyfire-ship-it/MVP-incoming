import Image from "next/image";
import { Package, Play, Activity, Star } from "lucide-react";
import { friendlyCategoryLabel, summarizeRepoForBeginners } from "@/lib/repoSummary";
import { useAuth } from "../context/AuthContext";
import { useSkillLevel } from "../hooks/useSkillLevel";

export interface Repo {
  id: number;
  title: string;
  plainEnglishDescription: string;
  stars: number;
  forks?: number;
  collaborators?: number;
  fullName?: string;
  url: string;
  language?: string;
  owner?: string;
  avatar?: string;
  coverImage?: string;
  topics?: string[];
  /** True when the repo is known to start without API keys or a database */
  easyToRun?: boolean;
}

interface RepoCardProps {
  repo: Repo;
  showPrice?: boolean;
  onRun?: (repo: Repo) => void;
  variant?: "list" | "widget";
}

const paletteMap: Record<string, { primary: string; secondary: string; accent: string; glow: string }> = {
  typescript: { primary: "#38bdf8", secondary: "#0f766e", accent: "#a5f3fc", glow: "#0ea5e9" },
  javascript: { primary: "#facc15", secondary: "#ca8a04", accent: "#fde68a", glow: "#eab308" },
  python: { primary: "#60a5fa", secondary: "#1d4ed8", accent: "#bfdbfe", glow: "#3b82f6" },
  rust: { primary: "#fb923c", secondary: "#9a3412", accent: "#fdba74", glow: "#f97316" },
  go: { primary: "#22d3ee", secondary: "#155e75", accent: "#a5f3fc", glow: "#06b6d4" },
  java: { primary: "#f97316", secondary: "#7c2d12", accent: "#fdba74", glow: "#ea580c" },
  react: { primary: "#67e8f9", secondary: "#155e75", accent: "#cffafe", glow: "#22d3ee" },
  default: { primary: "#8b5cf6", secondary: "#1d4ed8", accent: "#ddd6fe", glow: "#8b5cf6" },
};

function getRepoKey(repo: Repo) {
  return `${repo.language || ""} ${(repo.topics || []).join(" ")} ${repo.title}`.toLowerCase();
}

export function getRepoPalette(repo: Repo) {
  const source = getRepoKey(repo);
  if (source.includes("react") || source.includes("next")) return paletteMap.react;
  if (source.includes("typescript")) return paletteMap.typescript;
  if (source.includes("javascript")) return paletteMap.javascript;
  if (source.includes("python")) return paletteMap.python;
  if (source.includes("rust")) return paletteMap.rust;
  if (source.includes("go")) return paletteMap.go;
  if (source.includes("java")) return paletteMap.java;
  return paletteMap.default;
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* Backdrop SVG for widget cards — dynamic, premium, noisy mesh gradients */
export function getRepoBackdrop(repo: Repo) {
  const palette = getRepoPalette(repo);
  const label = friendlyCategoryLabel(repo, "beginner");
  const topic = repo.topics?.find(Boolean)?.replace(/-/g, " ") || repo.owner || repo.language || "Open Source";
  
  let seedVal = repo.id || 0;
  if (!seedVal && repo.title) {
    seedVal = repo.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
  const seed = seedVal % 5;
  const layout = seedVal % 3;

  const patterns = [
    `<circle cx="1200" cy="-100" r="700" fill="${palette.glow}" opacity="0.4" filter="blur(160px)" />
     <circle cx="200" cy="800" r="600" fill="${palette.accent}" opacity="0.3" filter="blur(140px)" />
     <path d="M-200 450 Q 800 -200 1800 450" fill="none" stroke="white" opacity="0.05" stroke-width="2" stroke-dasharray="10 20" />`,
    `<polygon points="0,0 1600,900 1600,0" fill="${palette.secondary}" opacity="0.2" />
     <rect x="-400" y="300" width="2400" height="200" fill="${palette.glow}" opacity="0.2" transform="rotate(-15 800 450)" filter="blur(40px)" />
     <rect x="-400" y="450" width="2400" height="100" fill="${palette.primary}" opacity="0.4" transform="rotate(-15 800 450)" filter="blur(80px)" />`,
    `<circle cx="1400" cy="900" r="800" fill="${palette.glow}" opacity="0.2" filter="blur(100px)" />
     <path d="M0 0 L1600 900 M0 900 L1600 0" stroke="${palette.accent}" stroke-width="40" opacity="0.05" />
     <circle cx="800" cy="450" r="300" fill="none" stroke="${palette.primary}" stroke-width="80" opacity="0.1" />`,
    `<path d="M-100 600 C 400 300, 1200 800, 1700 200 L1700 900 L-100 900 Z" fill="${palette.secondary}" opacity="0.3" filter="blur(90px)" />
     <path d="M-100 800 C 600 500, 1000 900, 1700 400 L1700 900 L-100 900 Z" fill="${palette.glow}" opacity="0.4" filter="blur(120px)" />`,
    `<circle cx="1500" cy="100" r="400" fill="none" stroke="${palette.primary}" stroke-width="2" opacity="0.4" stroke-dasharray="4 12" />
     <circle cx="1500" cy="100" r="600" fill="none" stroke="${palette.primary}" stroke-width="1" opacity="0.2" />
     <circle cx="100" cy="800" r="450" fill="${palette.glow}" opacity="0.3" filter="blur(140px)" />`
  ];

  const typographyVars = [
    `<text x="80" y="140" font-family="Inter, system-ui, sans-serif" font-size="38" font-weight="700" fill="rgba(255,255,255,0.7)" letter-spacing="8">${escapeSvg(label.toUpperCase())}</text>
     <text x="80" y="800" font-family="Inter, system-ui, sans-serif" font-size="48" font-weight="500" fill="rgba(255,255,255,0.5)">${escapeSvg(topic)}</text>`,
    `<text x="-40" y="420" font-family="Inter, system-ui, sans-serif" font-size="280" font-weight="900" fill="rgba(255,255,255,0.03)" letter-spacing="-4">${escapeSvg(label.toUpperCase())}</text>
     <text x="1520" y="820" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="600" fill="rgba(255,255,255,0.6)" letter-spacing="4">${escapeSvg(topic.toUpperCase())}</text>`,
    `<text transform="rotate(-90 80 820)" x="80" y="820" font-family="Inter, system-ui, sans-serif" font-size="44" font-weight="800" fill="rgba(255,255,255,0.6)" letter-spacing="6">${escapeSvg(topic.toUpperCase())}</text>
     <text x="180" y="120" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="600" fill="${palette.accent}" opacity="0.8" letter-spacing="2">${escapeSvg(label)}</text>`
  ];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#020f13" />
          <stop offset="60%" stop-color="#051921" />
          <stop offset="100%" stop-color="#082531" />
        </linearGradient>
        <radialGradient id="meshCenter" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="${palette.secondary}" stop-opacity="0.3" />
          <stop offset="100%" stop-color="${palette.secondary}" stop-opacity="0" />
        </radialGradient>
        <filter id="noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.12 0" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#bg)" />
      <rect width="1600" height="900" fill="url(#meshCenter)" />
      ${patterns[seed]}
      ${typographyVars[layout]}
      <rect width="1600" height="900" style="mix-blend-mode: overlay;" fill="url(#noise)" opacity="0.6" />
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function RepoCard({ repo, showPrice = false, onRun, variant = "list" }: RepoCardProps) {
  const { user, openAuthModal } = useAuth();
  const skillLevel = useSkillLevel();
  const computedPrice = repo.stars > 100000 ? "$29.99" : repo.stars > 50000 ? "$19.99" : repo.stars > 10000 ? "$9.99" : "$0";
  const priceLabel = computedPrice === "$0" ? "Free" : `Get ${computedPrice}`;
  const backdrop = getRepoBackdrop(repo);
  const palette = getRepoPalette(repo);
  const eyebrow = friendlyCategoryLabel(repo, skillLevel);
  const summary = summarizeRepoForBeginners(repo, skillLevel);

  function handleRun(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user) {
      openAuthModal("run_gate", repo);
      return;
    }
    if (onRun) {
      onRun(repo);
      return;
    }
    window.open(repo.url, "_blank");
  }

  if (variant === "widget") {
    return (
      <article
        style={{ '--accent': palette.glow } as React.CSSProperties}
        className="card-3d-wrap group relative flex min-h-[248px] w-full overflow-hidden rounded-[30px] border border-white/10 bg-[#062a34] p-0 shadow-[0_24px_70px_rgba(0,0,0,0.34)] card-float-in"
      >
        {/* Animated neon top-edge accent */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] rounded-t-[30px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${palette.glow}CC, transparent)` }}
        />
        <div className="card-3d-inner relative min-h-[248px] w-full">
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, rgba(4, 20, 28, 0.18) 0%, rgba(4, 20, 28, 0.36) 34%, rgba(4, 20, 28, 0.88) 100%)`,
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_24%)]" />

          <div className="relative flex h-full min-h-[248px] flex-col justify-between p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                    {eyebrow}
                  </span>
                  {repo.easyToRun && (
                    <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 tracking-wide">
                      ✓ Easy to run
                    </span>
                  )}
                </div>
                <div className="max-w-[20rem]">
                  <h3 className="text-[29px] font-semibold leading-[1.05] tracking-tight text-white text-balance sm:text-[33px]">
                    {repo.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 max-w-[24rem] text-sm leading-6 text-zinc-200/90 sm:text-[15px]">
                    {summary.short}
                  </p>
                  {summary.goodForPills[0] ? (
                    <p className="mt-2 line-clamp-1 text-[11px] text-zinc-400">
                      — {summary.goodForPills[0]}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:flex">
                  {repo.avatar ? (
                    <Image
                      src={repo.avatar}
                      alt={repo.owner || repo.title}
                      width={80}
                      height={80}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-white/70" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/30 backdrop-blur-md">
                  {repo.avatar ? (
                    <Image
                      src={repo.avatar}
                      alt={repo.owner || repo.title}
                      width={56}
                      height={56}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <Activity className="h-6 w-6 text-white/80" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{repo.owner || "Open Source Studio"}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-200/85">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] font-medium text-white/85">
                      <Star className="h-3 w-3 fill-current" />
                      {repo.stars.toLocaleString()} fans
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={handleRun}
                  className="flex h-11 min-w-[92px] items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/12 px-4 text-sm font-semibold tracking-wide text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                  aria-label={`Run ${repo.title}`}
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  Run
                </button>
                {showPrice ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(repo.url, "_blank");
                    }}
                    className="hidden h-11 min-w-[84px] items-center justify-center rounded-full border px-4 text-sm font-semibold tracking-wide backdrop-blur-md md:flex"
                    style={{
                      borderColor: `${palette.accent}44`,
                      backgroundColor: `${palette.primary}22`,
                      color: palette.accent,
                    }}
                    aria-label={`Get ${repo.title}`}
                  >
                    {priceLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      style={{ '--glow': palette.glow } as React.CSSProperties}
      className="card-3d-inner group flex w-full items-start gap-4 border-b border-white/5 py-4 transition-all duration-300 hover:bg-white/[0.04] px-2 rounded-xl hover:border-white/10 hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
    >
      {/* Squircle icon with glow accent on hover */}
      <div
        className="relative shrink-0 overflow-hidden squircle h-[88px] w-[88px] bg-black/40 border border-white/10 flex flex-col justify-center items-center transition-all duration-300 group-hover:border-white/20"
        style={{ boxShadow: 'none' }}
      >
        {/* glow halo */}
        <div
          className="absolute inset-0 rounded-[22%] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ boxShadow: `0 0 24px ${palette.glow}55, inset 0 0 12px ${palette.glow}22` }}
        />
        {repo.avatar ? (
          <Image
            src={repo.avatar}
            alt={repo.owner || repo.title}
            fill
            sizes="88px"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Package className="h-10 w-10 text-zinc-500" />
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0 justify-center h-full pt-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
            {repo.title}
          </h3>
          {repo.easyToRun && (
            <span className="shrink-0 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 tracking-wide">
              ✓ Easy to run
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-zinc-400 mt-0.5">
          {summary.short}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {summary.goodForPills.slice(0, 2).map((pill, i) => (
            <span key={i} className="text-[10px] rounded-full border border-white/8 bg-white/[0.04] px-2 py-0.5 text-zinc-500">
              — {pill}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col justify-center items-end gap-2 pl-2">
        <button
          onClick={handleRun}
          className="flex h-[34px] min-w-[80px] items-center justify-center gap-1.5 rounded-[8px] border border-blue-500/30 bg-blue-500/10 px-4 text-[13px] font-bold tracking-wide text-blue-400 transition-all duration-200 hover:bg-blue-500/25 hover:border-blue-500/60 hover:shadow-[0_0_16px_rgba(59,130,246,0.3)] active:scale-95"
          aria-label={`Run ${repo.title}`}
        >
          <Play className="h-3 w-3 fill-blue-400" /> Run
        </button>
        {showPrice ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(repo.url, "_blank");
            }}
            className="flex h-[34px] min-w-[76px] items-center justify-center rounded-[8px] border border-emerald-500/30 bg-emerald-500/10 px-4 text-[13px] font-bold tracking-wide text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-inner"
            aria-label={`Get ${repo.title}`}
          >
            {priceLabel}
          </button>
        ) : null}
      </div>
    </article>
  );
}
