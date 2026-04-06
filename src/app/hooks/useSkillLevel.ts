import { useAuth } from "../context/AuthContext";
import type { SkillLevel } from "@/lib/repoSummary";

/**
 * Returns the current user's skill level, defaulting to "beginner"
 * for unauthenticated or new users.
 */
export function useSkillLevel(): SkillLevel {
  const { user } = useAuth();
  return user?.skillLevel ?? "beginner";
}
