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

export type AuthModalTrigger = "run_gate" | "manual" | "signup_prompt";

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
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GitmurphUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTrigger, setAuthModalTrigger] = useState<AuthModalTrigger | null>(null);
  const [pendingRunRepo, setPendingRunRepo] = useState<unknown | null>(null);

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
