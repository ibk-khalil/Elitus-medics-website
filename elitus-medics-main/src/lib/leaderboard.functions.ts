import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  name: string | null;
  points_total: number;
  streak_count: number;
  is_me: boolean;
};

/**
 * Top 100 students by points, plus the caller's row (with rank) if outside top 100.
 */
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("public_profiles")
      .select("id,name,points_total,streak_count")
      .order("points_total", { ascending: false })
      .order("streak_count", { ascending: false })
      .limit(100);
    if (error) throw error;

    const rows: LeaderboardRow[] = (data ?? []).map((p, i) => ({
      rank: i + 1,
      user_id: p.id!,
      name: p.name,
      points_total: p.points_total ?? 0,
      streak_count: p.streak_count ?? 0,
      is_me: p.id === userId,
    }));

    let me = rows.find((r) => r.is_me) ?? null;
    if (!me) {
      const { data: meRow } = await supabase
        .from("public_profiles")
        .select("id,name,points_total,streak_count")
        .eq("id", userId)
        .maybeSingle();
      if (meRow) {
        const { count } = await supabase
          .from("public_profiles")
          .select("id", { count: "exact", head: true })
          .gt("points_total", meRow.points_total ?? 0);
        me = {
          rank: (count ?? 0) + 1,
          user_id: meRow.id!,
          name: meRow.name,
          points_total: meRow.points_total ?? 0,
          streak_count: meRow.streak_count ?? 0,
          is_me: true,
        };
      }
    }

    return { rows, me };
  });
