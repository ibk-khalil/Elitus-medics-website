import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminStats = {
  total_students: number;
  total_admins: number;
  total_reps: number;
  active_today: number;
  total_quizzes: number;
  live_quizzes: number;
  total_attempts: number;
  total_resources: number;
  total_events: number;
  upcoming_events: number;
  total_announcements: number;
};

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  points_total: number;
  streak_count: number;
  onboarding_completed: boolean;
  created_at: string | null;
  role: "admin" | "representative" | "student";
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const todayIso = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    const [
      profiles, roles, activeToday,
      quizzes, liveQuizzes, attempts,
      resources, events, upcomingEvents, announcements,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_roles").select("role"),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("streak_last_date", todayIso),
      supabaseAdmin.from("quizzes").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("quizzes").select("id", { count: "exact", head: true }).eq("status", "live"),
      supabaseAdmin.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabaseAdmin.from("resources").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("events").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("events").select("id", { count: "exact", head: true }).gte("starts_at", nowIso),
      supabaseAdmin.from("announcements").select("id", { count: "exact", head: true }),
    ]);

    const roleRows = (roles.data ?? []) as { role: string }[];
    const total_admins = roleRows.filter((r) => r.role === "admin").length;
    const total_reps = roleRows.filter((r) => r.role === "representative").length;

    return {
      total_students: profiles.count ?? 0,
      total_admins,
      total_reps,
      active_today: activeToday.count ?? 0,
      total_quizzes: quizzes.count ?? 0,
      live_quizzes: liveQuizzes.count ?? 0,
      total_attempts: attempts.count ?? 0,
      total_resources: resources.count ?? 0,
      total_events: events.count ?? 0,
      upcoming_events: upcomingEvents.count ?? 0,
      total_announcements: announcements.count ?? 0,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,email,name,points_total,streak_count,onboarding_completed,created_at")
      .order("points_total", { ascending: false })
      .limit(200);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id,role");
    const roleMap = new Map<string, "admin" | "representative" | "student">();
    for (const r of roles ?? []) {
      const existing = roleMap.get(r.user_id);
      if (r.role === "admin") roleMap.set(r.user_id, "admin");
      else if (r.role === "representative" && existing !== "admin") roleMap.set(r.user_id, "representative");
      else if (!existing) roleMap.set(r.user_id, "student");
    }
    return (profiles ?? []).map((p: any) => ({
      ...p, role: roleMap.get(p.id) ?? "student",
    }));
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin", "representative", "student"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Wipe non-student roles, then add the new one if not 'student'
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    return { ok: true };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      name: z.string().min(1).max(80).optional().nullable(),
      specialty_interest: z.string().max(80).optional().nullable(),
      career_goal: z.string().max(160).optional().nullable(),
      weak_subjects: z.array(z.string()).max(20).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update(data)
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
