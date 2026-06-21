import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listYearbook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: entries, error } = await context.supabase
      .from("yearbook_entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const ids = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } = ids.length
      ? await context.supabase.from("public_profiles").select("id, name, avatar_url").in("id", ids)
      : { data: [] as { id: string | null; name: string | null; avatar_url: string | null }[] };
    return (entries ?? []).map((e) => ({
      ...e,
      profile: (profiles ?? []).find((p) => p.id === e.user_id) ?? null,
    }));
  });

export const getMyYearbook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("yearbook_entries")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    return data;
  });

export const upsertMyYearbook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      quote: z.string().max(300).optional().nullable(),
      superlative: z.string().max(120).optional().nullable(),
      fun_fact: z.string().max(300).optional().nullable(),
      photo_url: z.string().url().optional().nullable(),
      graduation_year: z.number().int().min(2000).max(2100).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("yearbook_entries")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });
