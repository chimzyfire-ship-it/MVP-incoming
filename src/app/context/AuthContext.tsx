"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SkillLevel = "beginner" | "intermediate" | "expert";

export interface GitmurphUser {
  id: string;
  name: string;
  email: string;
  skillLevel: SkillLevel | null;
  interests: string[];
  credits: number;
  joinedAt: number;
}

export type AuthModalTrigger = "run_gate" | "manual" | "signup_prompt" | "signin_prompt";

interface AuthContextValue {
  user: GitmurphUser | null;
  isLoaded: boolean;
  authModalOpen: boolean;
  authModalTrigger: AuthModalTrigger | null;
  pendingRunRepo: unknown | null;
  openAuthModal: (trigger: AuthModalTrigger, pendingRepo?: unknown) => void;
  closeAuthModal: () => void;
  signUp: (user: any) => Promise<void>;
  updateUser: (partial: Partial<GitmurphUser>) => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: false,
  authModalOpen: false,
  authModalTrigger: null,
  pendingRunRepo: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signUp: async () => {},
  updateUser: async () => {},
  signOut: async () => {},
  signIn: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GitmurphUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTrigger, setAuthModalTrigger] = useState<AuthModalTrigger | null>(null);
  const [pendingRunRepo, setPendingRunRepo] = useState<unknown | null>(null);

  // Re-fetch user profile from public.users table
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();
    if (data) {
      setUser({
        id: data.id,
        name: data.name || "User",
        email: data.email || "",
        skillLevel: data.skill_level as SkillLevel | null,
        interests: data.interests || [],
        credits: data.credits ?? 50,
        joinedAt: new Date(data.created_at).getTime(),
      });
    }
  }, []);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
      setIsLoaded(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const openAuthModal = useCallback((trigger: AuthModalTrigger, pendingRepo?: unknown) => {
    setAuthModalTrigger(trigger);
    setPendingRunRepo(pendingRepo ?? null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalTrigger(null);
  }, []);

  const signUp = useCallback(async (newUser: any) => {
    // In our simplified flow, we'll auto-generate a password if not provided 
    // to keep the frontend working mostly identically for MVP purposes, 
    // or we use the provided password if UI sends it.
    const pass = newUser.password || 'gitmorph123!'; 
    
    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: pass,
      options: {
        data: {
          name: newUser.name,
        }
      }
    });

    if (error) {
      console.error("SignUp error:", error.message);
      return;
    }

    if (data.user) {
      // Extract userId to satisfy TypeScript's strict null checks inside async timeout
      const userId = data.user.id;
      
      // The trigger handles inserting into public.users. We wait a moment and then update interests
      setTimeout(async () => {
        if (newUser.skillLevel || newUser.interests) {
          await supabase.from("users").update({
            skill_level: newUser.skillLevel,
            interests: newUser.interests
          }).eq("id", userId);
          await fetchProfile(userId);
        }
      }, 1000);
    }
    
    setAuthModalOpen(false);
    setAuthModalTrigger(null);
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error("SignIn error:", error.message);
    }
  }, []);

  const updateUser = useCallback(async (partial: Partial<GitmurphUser>) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, ...partial } : null);
    
    // Sync to Supabase
    const updateData: any = {};
    if (partial.skillLevel !== undefined) updateData.skill_level = partial.skillLevel;
    if (partial.interests !== undefined) updateData.interests = partial.interests;
    if (partial.name !== undefined) updateData.name = partial.name;
    
    if (Object.keys(updateData).length > 0) {
      await supabase.from("users").update(updateData).eq("id", user.id);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPendingRunRepo(null);
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
        signIn
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
