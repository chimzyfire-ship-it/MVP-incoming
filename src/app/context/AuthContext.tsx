"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SkillLevel = "beginner" | "intermediate" | "expert";

export interface GitmurphUser {
  name: string;
  email: string;
  skillLevel: SkillLevel;
  interests: string[]; // category IDs
  joinedAt: number;
}

export type AuthModalTrigger = "run_gate" | "manual" | "signup_prompt" | "signin_prompt";

interface AuthContextValue {
  user: GitmurphUser | null;
  isLoaded: boolean;
  // Modal control
  authModalOpen: boolean;
  authModalTrigger: AuthModalTrigger | null;
  pendingRunRepo: unknown | null;
  openAuthModal: (trigger: AuthModalTrigger, pendingRepo?: unknown) => void;
  closeAuthModal: () => void;
  // Actions
  signUp: (user: GitmurphUser) => void;
  updateUser: (partial: Partial<GitmurphUser>) => void;
  signOut: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "gitmurph-user";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: false,
  authModalOpen: false,
  authModalTrigger: null,
  pendingRunRepo: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signUp: () => {},
  updateUser: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GitmurphUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTrigger, setAuthModalTrigger] = useState<AuthModalTrigger | null>(null);
  const [pendingRunRepo, setPendingRunRepo] = useState<unknown | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    
    // Support ?onboarding=1 to demonstrate compulsory onboarding
    if (params.has("onboarding")) {
      params.delete("onboarding");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", newUrl);
      setTimeout(() => {
        openAuthModal("manual");
      }, 500);
    }
    
    if (params.has("reset")) {
      try {
        localStorage.clear();
      } catch { /* ignore */ }
      // Remove the ?reset param and reload cleanly
      params.delete("reset");
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.location.replace(newUrl);
    }
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
    setIsLoaded(true);
  }, []);

  // ── Cmd+Shift+L = instant sign-out & reload (Mac shortcut) ───────────────
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        try { localStorage.clear(); } catch { /* ignore */ }
        window.location.replace(window.location.pathname);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const openAuthModal = useCallback((trigger: AuthModalTrigger, pendingRepo?: unknown) => {
    setAuthModalTrigger(trigger);
    setPendingRunRepo(pendingRepo ?? null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalTrigger(null);
    // Don't clear pendingRunRepo here — let caller consume it
  }, []);

  const signUp = useCallback((newUser: GitmurphUser) => {
    setUser(newUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {
      /* ignore */
    }
    setAuthModalOpen(false);
    setAuthModalTrigger(null);
  }, []);

  const updateUser = useCallback((partial: Partial<GitmurphUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      return updated;
    });
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setPendingRunRepo(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        authModalOpen,
        authModalTrigger,
        pendingRunRepo,
        openAuthModal,
        closeAuthModal,
        signUp,
        updateUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
