"use client";

import { type Repo } from "@/app/components/RepoCard";
import { Play, Star, Code2, User, ArrowRight, CheckCircle2, Flame } from "lucide-react";

interface ExplainerFeedProps {
  repos: Repo[];
  isLoading?: boolean;
  onRun: (repo: Repo) => void;
}

export default function ExplainerFeed({ repos, isLoading, onRun }: ExplainerFeedProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center flex-col items-center py-32 gap-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-[#042a33] to-[#042a33] opacity-50 pointer-events-none" />
        <div className="relative flex items-center justify-center w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Flame className="w-8 h-8 text-cyan-400 animate-pulse" />
        </div>
        <span className="text-cyan-400 font-bold tracking-widest text-sm uppercase">Curating Feed...</span>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex justify-center flex-col items-center py-32 text-center gap-4">
        <p className="text-zinc-400 font-medium tracking-wide">No content available.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Dynamic Header for the Activity/Feed tab */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(0,229,255,0.3)]">
            <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">For You Feed</h1>
            <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Endless discovery</p>
          </div>
        </div>
      </div>

      <div 
        className="relative w-full h-[78vh] min-h-[600px] snap-y snap-mandatory overflow-y-auto rounded-[40px] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] bg-black overflow-hidden"
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
    </div>
  );
}

function FeedItem({ repo, onRun }: { repo: Repo; onRun: (repo: Repo) => void }) {
  // Use coverImage or default to a high quality open graph image dynamically
  const imageUrl = repo.coverImage || `https://opengraph.githubassets.com/1/${repo.fullName}`;

  return (
    <div className="group relative w-full h-full snap-start snap-always shrink-0 bg-[#060D13] overflow-hidden flex flex-col justify-end">
      
      {/* Background Cover Image with parallax scale effect */}
      <img
        src={imageUrl}
        alt={repo.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-60 group-hover:opacity-80"
      />
      
      {/* Deep Gradient overlay for perfect text legibility */}
      <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-[#02080a] via-[#02080a]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* BIG CENTERED PLAY BUTTON */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <button 
          onClick={() => onRun(repo)}
          className="pointer-events-auto group/play relative flex items-center justify-center w-28 h-28 rounded-full bg-black/40 border-[1.5px] border-white/20 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:scale-[1.15] hover:bg-white/10 active:scale-95"
        >
          {/* Subtle spinning glow ring behind the button */}
          <div className="absolute inset-[-10px] rounded-full border border-cyan-500/0 group-hover/play:border-cyan-400/50 group-hover/play:rotate-180 transition-all duration-1000" />
          <div className="absolute inset-0 rounded-full bg-cyan-400/20 opacity-0 group-hover/play:opacity-100 blur-2xl transition-opacity duration-500" />
          <Play className="w-12 h-12 text-white ml-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" fill="currentColor" />
        </button>
      </div>

      {/* Premium Description Overlay Panel */}
      <div className="relative z-20 w-full bg-[#051116]/80 backdrop-blur-2xl border-t border-white/5 rounded-t-[48px] p-8 md:p-10 -mb-[1px] shadow-[0_-20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-6">
        
        {/* Glow effect on top edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[36px] font-extrabold text-white tracking-tight truncate drop-shadow-md">
                {repo.title}
              </h2>
              {repo.easyToRun && (
                <span className="hidden sm:flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[11px] font-bold text-emerald-400 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="text-[17px] leading-relaxed font-medium text-zinc-400 line-clamp-2 md:line-clamp-3">
              {repo.plainEnglishDescription}
            </p>
          </div>
          
          {/* Action Button */}
          <button
            onClick={() => onRun(repo)}
            className="shrink-0 w-full md:w-auto group/btn relative flex items-center justify-center bg-white hover:bg-zinc-100 rounded-full px-10 py-4 text-black font-extrabold tracking-tight transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] focus:outline-none"
          >
            <span className="relative z-10 text-[16px] flex items-center gap-2">
              LAUNCH APP <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" strokeWidth={3} />
            </span>
          </button>
        </div>

        {/* Dynamic Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 gap-y-2 mt-2">
          <div className="flex items-center gap-2 text-zinc-300 text-[14px] font-semibold bg-white/5 rounded-full px-4 py-1.5 border border-white/5">
            <User className="w-4 h-4 text-zinc-500" /> {repo.owner || "Community"}
          </div>
          
          {repo.language && repo.language !== "Unknown" && (
            <div className="flex items-center gap-2 text-blue-300 text-[14px] font-semibold bg-blue-500/10 rounded-full px-4 py-1.5 border border-blue-500/20">
              <Code2 className="w-4 h-4 text-blue-400" /> {repo.language}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-amber-300 text-[14px] font-semibold bg-amber-500/10 rounded-full px-4 py-1.5 border border-amber-500/20">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {repo.stars?.toLocaleString() || 0}
          </div>

          {repo.topics && repo.topics.length > 0 && (
            <>
              <div className="hidden md:block w-px h-6 bg-white/10 mx-2" />
              <div className="hidden md:flex items-center gap-2">
                {repo.topics.slice(0, 3).map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full bg-transparent border border-white/10 text-zinc-400 text-[11px] font-bold uppercase tracking-widest hover:text-white transition-colors cursor-default">
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
