"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Check, Compass, Settings2, Code2, User, Mail, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, type GitmurphUser, type SkillLevel } from "../context/AuthContext";

// ─── Interest Categories ──────────────────────────────────────────────────────

export interface InterestCategory {
  id: string;
  label: string;
  color: string;
  /** Maps to discover section ids */
  sectionIds: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  { id: "ai",          label: "AI & Smart Tools",        color: "#818cf8", sectionIds: ["ai"] },
  { id: "creative",    label: "Creative & Design",       color: "#f472b6", sectionIds: ["creative"] },
  { id: "chat",        label: "Chat & Communication",    color: "#34d399", sectionIds: ["productivity", "frontend"] },
  { id: "games",       label: "Games & Interactive",     color: "#fb923c", sectionIds: ["creative", "frontend"] },
  { id: "security",    label: "Security & Privacy",      color: "#f87171", sectionIds: ["security"] },
  { id: "data",        label: "Data & Analytics",        color: "#38bdf8", sectionIds: ["data"] },
  { id: "web",         label: "Web Apps & Sites",        color: "#a78bfa", sectionIds: ["frontend"] },
  { id: "music",       label: "Music & Audio",           color: "#e879f9", sectionIds: ["creative"] },
  { id: "mobile",      label: "Mobile Tools",            color: "#22d3ee", sectionIds: ["frontend", "productivity"] },
  { id: "home",        label: "Home & Lifestyle",        color: "#4ade80", sectionIds: ["productivity"] },
  { id: "finance",     label: "Finance & Money",         color: "#facc15", sectionIds: ["data", "backend"] },
  { id: "learning",    label: "Learning & Education",    color: "#60a5fa", sectionIds: ["productivity", "ai"] },
  { id: "devtools",    label: "Developer Tools",         color: "#94a3b8", sectionIds: ["devtools", "infra"] },
  { id: "news",        label: "News & Information",      color: "#fdba74", sectionIds: ["productivity", "data"] },
  { id: "health",      label: "Health & Fitness",        color: "#86efac", sectionIds: ["productivity"] },
  { id: "backend",     label: "Infrastructure & APIs",   color: "#cbd5e1", sectionIds: ["backend", "infra"] },
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
    icon: <Compass className="h-7 w-7" />,
    label: "Just getting started",
    tagline: "Regular phone & computer user",
    desc: "I use apps every day but I've never built one. I just want to discover cool stuff and see what's out there.",
    color: "text-emerald-300",
    border: "border-emerald-400/40",
    glow: "bg-emerald-500/10 hover:bg-emerald-500/20",
  },
  {
    id: "intermediate",
    icon: <Settings2 className="h-7 w-7" />,
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
  const { authModalOpen, closeAuthModal, signUp, updateUser, authModalTrigger, user, signIn } = useAuth();

  const [step, setStep] = useState(1);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (authModalOpen) {
      if (user) {
        setName(user.name);
        setEmail(user.email);
        setSkillLevel(user.skillLevel || null);
        setInterests(user.interests || []);
        if (!user.skillLevel) {
          setStep(2);
        } else if (!user.interests || user.interests.length === 0) {
          setStep(3);
        } else {
          setStep(2); // Showing modal again for complete user -> edit preferences
        }
      } else {
        setStep(1);
        setName("");
        setEmail("");
        setSkillLevel(null);
        setInterests([]);
      }
      setNameError("");
      setMounted(true);
      setIsLaunching(false);
      
      if (authModalTrigger === "signin_prompt") {
        setAuthMode("signin");
      } else {
        setAuthMode("signup");
      }
    } else {
      setTimeout(() => setMounted(false), 300);
    }
  }, [authModalOpen]);

  if (!mounted && !authModalOpen) return null;

  function handleStep1Next() {
    setNameError("");
    if (authMode === "signin") {
      if (!email.trim()) { setNameError("Please enter your email address."); return; }
      if (!password) { setNameError("Please enter your password."); return; }
      setIsLaunching(true);
      setTimeout(async () => {
        if (signIn) await signIn(email.trim(), password);
        setIsLaunching(false);
        closeAuthModal();
      }, 1400);
      return;
    }
    // Sign-up validation
    if (!name.trim()) { setNameError("Please enter your name."); return; }
    if (!email.trim()) { setNameError("Please enter your email address."); return; }
    if (!password || password.length < 6) { setNameError("Password must be at least 6 characters."); return; }
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
    
    setIsLaunching(true);
    
    setTimeout(() => {
      if (user) {
        updateUser({ skillLevel: skillLevel!, interests });
        closeAuthModal();
      } else {
        const newUser: any = {
          name: name.trim(),
          email: email.trim(),
          password: password,
          skillLevel: skillLevel!,
          interests,
          joinedAt: Date.now(),
        };
        signUp(newUser);
      }
      setIsLaunching(false);
    }, 1400); // Wait for rocket launch animation
  }

  const isGated = authModalTrigger === "run_gate";
  const isCompulsory = !user || !user.skillLevel || !user.interests || user.interests.length === 0;

  return (
    <>
      <AnimatePresence>
        {isLaunching && (
          <motion.div 
            key="global-launch-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-3xl bg-[#031116]/95"
          >
            <motion.div
              initial={{ y: 150, opacity: 0, scale: 0.8 }}
              animate={{ y: -800, opacity: 1, scale: 1.5 }}
              transition={{ 
                duration: 1.5, 
                ease: [0.4, 0, 0.2, 1], // ease-in-out curve
                times: [0, 0.2, 1] // keyframes for pop-in then shoot up
              }}
              className="relative flex items-center justify-center transform-gpu"
            >
              {/* Thruster Flame/Exhaust */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 2, 3], opacity: [0, 1, 0] }}
                transition={{ duration: 1, delay: 0.2, repeat: Infinity }}
                className="absolute -bottom-24 w-32 h-48 rounded-[100%] bg-gradient-to-t from-[#ff4d00] via-[#ffaa00] to-cyan-300 blur-2xl opacity-90 mix-blend-screen"
              />
              
              {/* Core Engine Light */}
              <div className="absolute -bottom-8 w-16 h-16 rounded-full bg-white blur-md" />
              
              {/* The Rocket */}
              <div className="relative flex h-32 w-32 items-center justify-center text-cyan-300 drop-shadow-[0_0_50px_rgba(34,211,238,1)]">
                <Rocket className="h-24 w-24 fill-cyan-400 stroke-cyan-200" strokeWidth={1} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300 ${
          authModalOpen && !isLaunching ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        // Prevent click-away dismissing for compulsory onboarding
        onClick={isGated || isCompulsory ? undefined : closeAuthModal}
      />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-[#062e3a] to-[#031d24] shadow-[0_40px_120px_rgba(0,0,0,0.6)] transition-all duration-300 ${
          authModalOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Close (only if not gated and not compulsory onboarding) */}
        {!isGated && !isCompulsory && (
          <button
            onClick={closeAuthModal}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Back Button for Step 2 & 3 */}
        {!isGated && !isCompulsory && !isLaunching && step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="absolute left-6 top-6 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition hover:text-white z-10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}

        {/* Step indicators */}
        {!isLaunching && (
          <div className="flex items-center justify-center gap-2 pt-7 pb-5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`transition-all duration-300 rounded-full ${
                  s === step
                    ? "h-2 w-8 bg-cyan-400"
                    : s < step
                    ? "h-2 w-2 bg-cyan-400/60"
                    : "h-2 w-2 bg-white/10"
                }`}
              />
            ))}
          </div>
        )}

        <div className="px-6 pb-8 relative">

          {/* ─── Step 1: Name + Email + Password ─── */}
          {step === 1 && !isLaunching && (
            <div className="flex flex-col gap-6">
              <div className="text-center">
                {isGated && (
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_0_30px_rgba(59,130,246,0.35)]">
                    <span className="text-2xl font-black text-white">G</span>
                  </div>
                )}
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                  {isGated ? "Sign up to run apps" : "Welcome to GITMURPH"}
                </h2>
                
                {/* Auth Tabs */}
                <div className="flex p-1 bg-black/30 rounded-xl border border-white/5 mx-auto max-w-xs mt-4 mb-2">
                  <button
                    onClick={() => setAuthMode("signin")}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                      authMode === "signin"
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthMode("signup")}
                    className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                      authMode === "signup"
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {authMode === "signup" && (
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setNameError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                      className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                      autoFocus
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                    className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                    autoFocus={authMode === "signin"}
                  />
                </div>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
                    className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  />
                  {nameError && (
                    <p className="mt-1 text-xs text-rose-400 absolute -bottom-5 left-0">{nameError}</p>
                  )}
                </div>
              </div>

              <div className="mt-2 text-right">
                {authMode === "signin" && (
                  <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">Forgot password?</button>
                )}
              </div>

              <button
                onClick={handleStep1Next}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-3.5 mt-1 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 active:scale-[0.98]"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 w-full max-w-xs mx-auto opacity-50 mt-2">
                <div className="h-px bg-white flex-1"></div>
                <span className="text-xs text-white">OR</span>
                <div className="h-px bg-white flex-1"></div>
              </div>

              <button
                onClick={handleStep1Next}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-[14px] font-medium text-white transition hover:bg-white/10 active:scale-[0.98]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          )}

          {/* ─── Step 2: Skill Level ─── */}
          {step === 2 && !isLaunching && (
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
                      className={`group relative flex w-full items-start gap-4 p-4 text-left transition-all duration-300 transform-gpu ${
                        isSelected
                          ? `rounded-2xl border ${level.border} ${level.glow} shadow-[0_10px_30px_rgba(34,211,238,0.15)] -translate-y-1`
                          : "rounded-xl border border-white/10 bg-[#0a1f26] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:bg-[#0c262f]"
                      }`}
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
                          isSelected
                            ? `${level.border} ${level.color} shadow-[0_0_15px_currentColor]`
                            : "border-white/10 bg-white/5 text-zinc-500 group-hover:text-zinc-300"
                        }`}
                      >
                        {level.icon}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-[15px] transition-colors ${isSelected ? "text-white drop-shadow-md" : "text-zinc-300 group-hover:text-white"}`}>
                            {level.label}
                          </p>
                          <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold uppercase tracking-wide transition-all ${isSelected ? `${level.border} ${level.color} bg-black/20` : "bg-white/5 text-zinc-500"}`}>
                            {level.tagline}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          {level.desc}
                        </p>
                      </div>
                      <div className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${
                        isSelected ? "border-cyan-400 bg-cyan-400 scale-100 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "border-white/20 scale-90"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleStep2Next}
                disabled={!skillLevel}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-[15px] font-bold text-black shadow-[0_0_20px_rgba(34,211,238,0.4)] transition hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── Step 3: Interests ─── */}
          {step === 3 && !isLaunching && (
            <div className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  What are you into?
                </h2>
                <p className="mt-2 text-[14px] text-zinc-400">
                  Pick at least one — we&apos;ll curate a <span className="text-blue-300 font-semibold">For You</span> section with apps you&apos;ll actually like.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {INTEREST_CATEGORIES.map((cat) => {
                  const isSelected = interests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleInterest(cat.id)}
                      className={`flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-left transition-all duration-300 transform-gpu ${
                        isSelected
                          ? "border-cyan-400/60 bg-cyan-900/30 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)] -translate-y-1"
                          : "border-white/10 bg-[#0a1f26] text-zinc-400 hover:border-white/20 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
                      }`}
                    >
                      <div
                        className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all ${isSelected ? 'scale-110' : 'scale-100 opacity-60'}`}
                        style={{ backgroundColor: cat.color, boxShadow: isSelected ? `0 0 10px ${cat.color}` : 'none' }}
                      />
                      <span className={`text-[14px] leading-none transition-colors ${isSelected ? 'font-bold': 'font-medium'}`}>{cat.label}</span>
                      {isSelected && (
                        <Check className="ml-1 h-3.5 w-3.5 shrink-0 text-cyan-400" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleFinish}
                disabled={interests.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 py-3.5 mt-4 text-[15px] font-bold text-black shadow-[0_0_24px_rgba(34,211,238,0.5)] transition hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Compass className="h-4 w-4" />
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
    </>
  );
}
