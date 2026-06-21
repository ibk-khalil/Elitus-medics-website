import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Notification[]> => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id,title,body,type,link,read,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid().optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const q = context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId);
    if (data.id) await q.eq("id", data.id);
    else await q.eq("read", false);
    return { ok: true };
  });

/** Admin: broadcast a notification to every user. */
export const broadcastNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      title: z.string().min(2).max(160),
      body: z.string().max(2000).optional().nullable(),
      type: z.enum(["info", "quiz", "event", "vault"]).default("info"),
      link: z.string().max(500).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users, error } = await supabaseAdmin.from("profiles").select("id");
    if (error) throw error;
    const rows = (users ?? []).map((u: any) => ({
      user_id: u.id,
      title: data.title,
      body: data.body ?? null,
      type: data.type,
      link: data.link ?? null,
    }));
    if (rows.length === 0) return { sent: 0 };
    const { error: insErr } = await supabaseAdmin.from("notifications").insert(rows);
    if (insErr) throw insErr;
    return { sent: rows.length };
  });
