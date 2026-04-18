"use client";

import { type Repo } from "@/app/components/RepoCard";

interface ExplainerFeedProps {
  repos: Repo[];
  isLoading?: boolean;
  onRun: (repo: Repo) => void;
}

export default function ExplainerFeed({ repos, isLoading, onRun }: ExplainerFeedProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center flex-col items-center py-20 gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <span className="text-zinc-400 font-medium tracking-wide">Loading feed...</span>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex justify-center flex-col items-center py-20 text-center gap-4">
        <p className="text-zinc-400 font-medium tracking-wide">No content available.</p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-[75vh] min-h-[500px] snap-y snap-mandatory overflow-y-auto rounded-3xl border border-white/10 shadow-2xl bg-black overflow-hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      <div className="flex flex-col h-full scrollbar-hide">
        {repos.map((repo) => (
          <FeedItem key={repo.id} repo={repo} onRun={onRun} />
        ))}
      </div>
    </div>
  );
}

function FeedItem({ repo, onRun }: { repo: Repo; onRun: (repo: Repo) => void }) {
  return (
    <div className="group relative w-full h-full snap-start snap-always shrink-0 bg-[#060D13] overflow-hidden flex flex-col justify-end">
      {/* Video */}
      <video
        src="/videos/demo.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      
      {/* Dark overlay at bottom for readability */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

      {/* The 'App Store' Overlay */}
      <div className="relative z-10 w-full bg-black/40 backdrop-blur-2xl border-t border-white/5 rounded-t-[40px] p-8 -mb-[1px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between">
        <div className="flex flex-col pr-6 min-w-0 flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight truncate pb-1">
            {repo.title}
          </h2>
          <p className="text-[15px] font-medium text-gray-400 truncate">
            {repo.owner || "Unknown Author"}
          </p>
        </div>
        
        {/* The 'RUN' Button */}
        <button
          onClick={() => onRun(repo)}
          className="shrink-0 group/btn relative flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-full px-8 py-3.5 text-white font-extrabold tracking-tight transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] focus:outline-none"
        >
          {/* Hover-glow in purple */}
          <span className="absolute inset-0 rounded-full animate-pulse bg-indigo-400/50 blur-md opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 text-[15px]">RUN</span>
        </button>
      </div>
    </div>
  );
}
