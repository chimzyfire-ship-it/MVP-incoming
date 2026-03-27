"use client";

import { useState, useMemo } from "react";
import { Rss, Sparkles } from "lucide-react";
import { type Repo } from "./RepoCard";
import FeedCard, { StoryCircle, StoryOverlay, type FeedCardVariant } from "./FeedCard";

interface FeedViewProps {
  repos: Repo[];
  isLoading: boolean;
  onRepoView: (repo: Repo) => void;
  onRun: (repo: Repo) => void;
}

/* Assign feed card variants in a repeating engaging pattern */
const variantPattern: FeedCardVariant[] = [
  "spotlight",
  "ai-summary",
  "video",
  "trending",
  "ai-summary",
  "didyouknow",
  "video",
  "ai-summary",
  "trending",
  "didyouknow",
];

export default function FeedView({ repos, isLoading, onRepoView, onRun }: FeedViewProps) {
  const [activeStory, setActiveStory] = useState<Repo | null>(null);

  const storyRepos = repos.slice(0, 12);

  const feedItems = useMemo(() => {
    return repos.map((repo, idx) => ({
      repo,
      variant: variantPattern[idx % variantPattern.length],
    }));
  }, [repos]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400" />
        <span className="text-sm text-zinc-400 font-medium">Loading feed...</span>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-center bg-black/20 rounded-2xl border border-white/5">
        <Rss className="h-10 w-10 text-zinc-600" />
        <p className="text-sm font-medium text-zinc-400">No feed content yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">

      {/* ═══ Stories Bar ═══ */}
      {storyRepos.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 pl-1">
            <Sparkles className="h-4 w-4 text-blue-300" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500">Explainer Videos</span>
          </div>
          <div
            className="flex gap-4 overflow-x-auto pb-2 hide-scrollbars"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {storyRepos.map((repo) => (
              <StoryCircle
                key={`story-${repo.id}`}
                repo={repo}
                isActive={activeStory?.id === repo.id}
                onClick={() => setActiveStory(repo)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ═══ Feed Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-bold tracking-tight text-white">Your Feed</h2>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1">
          <Sparkles className="h-3 w-3 text-blue-300" />
          <span className="text-[11px] font-semibold text-blue-300">AI-Powered</span>
        </div>
      </div>

      {/* ═══ Feed Cards ═══ */}
      <div className="flex flex-col gap-4">
        {feedItems.map(({ repo, variant }, idx) => (
          <FeedCard
            key={`feed-${repo.id}-${idx}`}
            repo={repo}
            variant={variant}
            index={idx}
            onView={() => onRepoView(repo)}
            onRun={() => onRun(repo)}
          />
        ))}
      </div>

      {/* ═══ GITMURPH Watermark ═══ */}
      <div className="flex items-center justify-center py-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
          GITMURPH Feed
        </span>
      </div>

      {/* ═══ Story Overlay ═══ */}
      {activeStory && (
        <StoryOverlay
          repo={activeStory}
          onClose={() => setActiveStory(null)}
          onRun={() => {
            onRun(activeStory);
            setActiveStory(null);
          }}
        />
      )}
    </div>
  );
}
