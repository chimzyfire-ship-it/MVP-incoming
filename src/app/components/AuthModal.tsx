"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, Check, Sparkles, Zap, Code2, User, Mail } from "lucide-react";
import { useAuth, type GitmurphUser, type SkillLevel } from "../context/AuthContext";

// ─── Interest Categories ──────────────────────────────────────────────────────

export interface InterestCategory {
  id: string;
  label: string;
  emoji: string;
  /** Maps to discover section ids */
  sectionIds: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  { id: "ai",          label: "Smart AI helpers",       emoji: "🤖", sectionIds: ["ai"] },
  { id: "creative",    label: "Creative & Design",       emoji: "🎨", sectionIds: ["creative"] },
  { id: "chat",        label: "Chat & Communication",    emoji: "💬", sectionIds: ["productivity", "frontend"] },
  { id: "games",       label: "Games & Fun",             emoji: "🎮", sectionIds: ["creative", "frontend"] },
  { id: "security",    label: "Safety & Privacy",        emoji: "🛡️", sectionIds: ["security"] },
  { id: "data",        label: "Numbers & Charts",        emoji: "📊", sectionIds: ["data"] },
  { id: "web",         label: "Websites & Web Apps",     emoji: "💻", sectionIds: ["frontend"] },
  { id: "music",       label: "Music & Sound",           emoji: "🎵", sectionIds: ["creative"] },
  { id: "mobile",      label: "Mobile Tools",            emoji: "📱", sectionIds: ["frontend", "productivity"] },
  { id: "home",        label: "Home & Lifestyle",        emoji: "🏠", sectionIds: ["productivity"] },
  { id: "finance",     label: "Finance & Money",         emoji: "💰", sectionIds: ["data", "backend"] },
  { id: "learning",    label: "Learning & Education",    emoji: "📚", sectionIds: ["productivity", "ai"] },
  { id: "devtools",    label: "Nerdy Dev Tools",         emoji: "🔧", sectionIds: ["devtools", "infra"] },
  { id: "news",        label: "News & Information",      emoji: "🌍", sectionIds: ["productivity", "data"] },
  { id: "health",      label: "Health & Fitness",        emoji: "🏋️", sectionIds: ["productivity"] },
  { id: "backend",     label: "Behind the Scenes",       emoji: "⚙️", sectionIds: ["backend", "infra"] },
];

// ─── Skill Level Config ───────────────────────────────────────────────────────

const SKILL_LEVELS: {
  id: SkillLevel;
  icon: React.ReactNode;
  label: string;
  tagline: string;
  desc: string;
  color: string;
  border: string;
  glow: string;
}[] = [
  {
    id: "beginner",
    icon: <Sparkles className="h-7 w-7" />,
    label: "Just getting started",
    tagline: "Regular phone & computer user",
    desc: "I use apps every day but I've never built one. I just want to discover cool stuff and see what's out there.",
    color: "text-emerald-300",
    border: "border-emerald-400/40",
    glow: "bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    id: "intermediate",
    icon: <Zap className="h-7 w-7" />,
    label: "I know my way around",
    tagline: "Tech-comfortable, some tinkering",
    desc: "I understand how apps work, maybe set up something once or twice, or I've done a little bit of coding before.",
    color: "text-blue-300",
    border: "border-blue-400/40",
    glow: "bg-blue-500/10 hover:bg-blue-500/20",
  },
  {
    id: "expert",
    icon: <Code2 className="h-7 w-7" />,
    label: "I build things",
    tagline: "Developer / tech professional",
    desc: "I write code, run servers, or work in tech for a living. Show me the good stuff — I can handle the nerdy details.",
    color: "text-violet-300",
    border: "border-violet-400/40",
    glow: "bg-violet-500/10 hover:bg-violet-500/20",
  },
];

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function AuthModal() {
  const { authModalOpen, closeAuthModal, signUp, authModalTrigger } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (authModalOpen) {
      setStep(1);
      setName("");
      setEmail("");
      setSkillLevel(null);
      setInterests([]);
      setNameError("");
      setMounted(true);
    } else {
      setTimeout(() => setMounted(false), 300);
    }
  }, [authModalOpen]);

  if (!mounted && !authModalOpen) return null;

  function handleStep1Next() {
    if (!name.trim()) {
      setNameError("Please enter your first name");
      return;
    }
    setNameError("");
    setStep(2);
  }

  function handleStep2Next() {
    if (!skillLevel) return;
    setStep(3);
  }

  function toggleInterest(id: string) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function handleFinish() {
    if (interests.length === 0) return;
    const newUser: GitmurphUser = {
      name: name.trim(),
      email: email.trim(),
      skillLevel: skillLevel!,
      interests,
      joinedAt: Date.now(),
    };
    signUp(newUser);
  }

  const isGated = authModalTrigger === "run_gate";

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300 ${
        authModalOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={isGated ? undefined : closeAuthModal}
      />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-[#062e3a] to-[#031d24] shadow-[0_40px_120px_rgba(0,0,0,0.6)] transition-all duration-300 ${
          authModalOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Close (only if not gated) */}
        {!isGated && (
          <button
            onClick={closeAuthModal}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 pt-7 pb-5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`transition-all duration-300 rounded-full ${
                s === step
                  ? "h-2 w-8 bg-blue-400"
                  : s < step
                  ? "h-2 w-2 bg-blue-400/60"
                  : "h-2 w-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="px-6 pb-8">
          {/* ─── Step 1: Name + Email ─── */}
          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                {isGated && (
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_0_30px_rgba(59,130,246,0.35)]">
                    <span className="text-2xl font-black text-white">G</span>
                  </div>
                )}
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {isGated ? "Sign up to run apps" : "Welcome to GITMURPH"}
                </h2>
                <p className="mt-2 text-[14px] text-zinc-400 leading-relaxed">
                  {isGated
                    ? "Create a free account to run apps and get personalised picks."
                    : "Discover, run and enjoy open-source apps — no tech knowledge needed."}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="First name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                    className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                  {nameError && (
                    <p className="mt-1 text-xs text-rose-400">{nameError}</p>
                  )}
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                    className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <button
                onClick={handleStep1Next}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 active:scale-[0.98]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-center text-[12px] text-zinc-600">
                No passwords, no spam. Your info stays on your device.
              </p>
            </div>
          )}

          {/* ─── Step 2: Skill Level ─── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  How would you describe yourself?
                </h2>
                <p className="mt-2 text-[14px] text-zinc-400">
                  We&apos;ll use this to explain things at the right level.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {SKILL_LEVELS.map((level) => {
                  const isSelected = skillLevel === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => setSkillLevel(level.id)}
                      className={`group relative flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? `${level.border} ${level.glow} shadow-lg`
                          : "border-white/8 bg-black/10 hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                          isSelected
                            ? `${level.border} ${level.color}`
                            : "border-white/10 text-zinc-500"
                        }`}
                      >
                        {level.icon}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-[15px] transition-colors ${isSelected ? "text-white" : "text-zinc-300"}`}>
                            {level.label}
                          </p>
                          <span className={`text-[11px] rounded-full border px-2 py-0.5 font-medium ${isSelected ? `${level.border} ${level.color}` : "border-white/10 text-zinc-500"}`}>
                            {level.tagline}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                          {level.desc}
                        </p>
                      </div>
                      <div className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                        isSelected ? "border-current bg-current scale-100" : "border-white/20 scale-90"
                      } ${level.color}`}>
                        {isSelected && <Check className="h-3 w-3 text-[#031d24]" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleStep2Next}
                disabled={!skillLevel}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── Step 3: Interests ─── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  What are you into?
                </h2>
                <p className="mt-2 text-[14px] text-zinc-400">
                  Pick at least one — we&apos;ll curate a <span className="text-blue-300 font-semibold">For You</span> section with apps you&apos;ll actually like.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {INTEREST_CATEGORIES.map((cat) => {
                  const isSelected = interests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                        isSelected
                          ? "border-blue-400/50 bg-blue-500/15 text-white shadow-[0_0_12px_rgba(59,130,246,0.2)]"
                          : "border-white/8 bg-black/10 text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      <span className="text-[13px] font-medium leading-snug">{cat.label}</span>
                      {isSelected && (
                        <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-blue-400" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleFinish}
                disabled={interests.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 py-3.5 text-[15px] font-bold text-white shadow-[0_4px_24px_rgba(59,130,246,0.4)] transition hover:from-blue-400 hover:to-cyan-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                Show my picks
              </button>

              {interests.length > 0 && (
                <p className="text-center text-[12px] text-zinc-500">
                  {interests.length} categor{interests.length === 1 ? "y" : "ies"} selected
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
