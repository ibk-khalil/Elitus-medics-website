import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  created_by: string | null;
  creator_name: string | null;
  going_count: number;
  my_status: "going" | "interested" | "not_going" | null;
};

async function assertRepOrAdmin(ctx: { supabase: any; userId: string }) {
  const [{ data: a }, { data: r }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "representative" }),
  ]);
  if (!a && !r) throw new Error("Forbidden");
}

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EventRow[]> => {
    const { supabase, userId } = context;
    const { data: events, error } = await supabase
      .from("events")
      .select("id,title,description,location,starts_at,ends_at,capacity,created_by,profiles:created_by(name)")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    const ids = (events ?? []).map((e: any) => e.id);
    const rsvpsByEvent = new Map<string, { going: number; mine: string | null }>();
    if (ids.length) {
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id,user_id,status")
        .in("event_id", ids);
      for (const r of rsvps ?? []) {
        const cur = rsvpsByEvent.get(r.event_id) ?? { going: 0, mine: null };
        if (r.status === "going") cur.going += 1;
        if (r.user_id === userId) cur.mine = r.status;
        rsvpsByEvent.set(r.event_id, cur);
      }
    }
    return (events ?? []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      capacity: e.capacity,
      created_by: e.created_by,
      creator_name: e.profiles?.name ?? null,
      going_count: rsvpsByEvent.get(e.id)?.going ?? 0,
      my_status: (rsvpsByEvent.get(e.id)?.mine as EventRow["my_status"]) ?? null,
    }));
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      title: z.string().min(2).max(200),
      description: z.string().max(2000).optional().nullable(),
      location: z.string().max(200).optional().nullable(),
      starts_at: z.string().min(1),
      ends_at: z.string().optional().nullable(),
      capacity: z.number().int().positive().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertRepOrAdmin(context);
    const { data: row, error } = await context.supabase
      .from("events")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const setRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      eventId: z.string().uuid(),
      status: z.enum(["going", "interested", "not_going"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("event_rsvps")
      .upsert(
        { event_id: data.eventId, user_id: context.userId, status: data.status },
        { onConflict: "event_id,user_id" },
      );
    if (error) throw error;
    return { ok: true };
  });
