import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  specialty_interest: string | null;
  career_goal: string | null;
  weak_subjects: string[] | null;
  streak_count: number;
  streak_last_date: string | null;
  points_total: number;
  onboarding_completed: boolean;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useRole() {
  return useQuery({
    queryKey: ["role"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      const roles = (data ?? []).map((r) => r.role as string);
      if (roles.includes("admin")) return "admin" as const;
      if (roles.includes("representative")) return "representative" as const;
      return "student" as const;
    },
  });
}
