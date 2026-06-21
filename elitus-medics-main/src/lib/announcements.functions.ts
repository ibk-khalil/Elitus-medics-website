import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
};

async function assertRepOrAdmin(ctx: { supabase: any; userId: string }) {
  const [{ data: a }, { data: r }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "representative" }),
  ]);
  if (!a && !r) throw new Error("Forbidden");
}

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Announcement[]> => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id,title,body,pinned,author_id,created_at,profiles:author_id(name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((a: any) => ({ ...a, author_name: a.profiles?.name ?? null }));
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      title: z.string().min(2).max(200),
      body: z.string().min(2).max(5000),
      pinned: z.boolean().default(false),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertRepOrAdmin(context);
    const { data: row, error } = await context.supabase
      .from("announcements")
      .insert({ ...data, author_id: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
