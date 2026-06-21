import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BadgeId =
  | "first_pulse"
  | "first_quiz"
  | "perfect_score"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "top_10"
  | "top_3";

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: "bronze" | "silver" | "gold";
};

export type UserBadge = Badge & { awarded_at: string | null; unlocked: boolean };

/** Internal helper: award a badge to a user via admin client. Idempotent. */
export async function awardBadge(userId: string, badgeId: BadgeId) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("user_badges")
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: "user_id,badge_id" });
}

/** Award the First Pulse badge after onboarding completes. */
export const awardFirstPulse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await awardBadge(context.userId, "first_pulse");
    return { ok: true };
  });

/** Fetch full badge catalog merged with the user's unlocks. */
export const listMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserBadge[]> => {
    const { supabase, userId } = context;
    const [catalog, unlocks] = await Promise.all([
      supabase.from("badges").select("id,name,description,icon,tier").order("created_at", { ascending: true }),
      supabase.from("user_badges").select("badge_id,awarded_at").eq("user_id", userId),
    ]);
    if (catalog.error) throw catalog.error;
    const map = new Map((unlocks.data ?? []).map((u) => [u.badge_id, u.awarded_at]));
    return (catalog.data ?? []).map((b) => ({
      ...(b as Badge),
      awarded_at: map.get(b.id) ?? null,
      unlocked: map.has(b.id),
    }));
  });

/** Get badges for an arbitrary user (used on profile views). */
export const getUserBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<UserBadge[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [catalog, unlocks] = await Promise.all([
      supabaseAdmin.from("badges").select("id,name,description,icon,tier").order("created_at", { ascending: true }),
      supabaseAdmin.from("user_badges").select("badge_id,awarded_at").eq("user_id", data.userId),
    ]);
    const map = new Map((unlocks.data ?? []).map((u) => [u.badge_id, u.awarded_at]));
    return (catalog.data ?? []).map((b) => ({
      ...(b as Badge),
      awarded_at: map.get(b.id) ?? null,
      unlocked: map.has(b.id),
    }));
  });
