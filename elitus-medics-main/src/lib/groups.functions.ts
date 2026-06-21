import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: groups, error } = await context.supabase
      .from("study_groups")
      .select("id, name, description, subject, created_by, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: members } = await context.supabase
      .from("study_group_members")
      .select("group_id, user_id");
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const m of members ?? []) {
      counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
      if (m.user_id === context.userId) mine.add(m.group_id);
    }
    return (groups ?? []).map((g) => ({
      ...g,
      member_count: counts.get(g.id) ?? 0,
      is_member: mine.has(g.id),
    }));
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(2).max(80),
      description: z.string().max(500).optional(),
      subject: z.string().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: group, error } = await context.supabase
      .from("study_groups")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw error;
    await context.supabase
      .from("study_group_members")
      .insert({ group_id: group.id, user_id: context.userId, role: "owner" });
    return group;
  });

export const joinGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("study_group_members")
      .insert({ group_id: data.groupId, user_id: context.userId });
    if (error && !error.message.includes("duplicate")) throw error;
    return { ok: true };
  });

export const leaveGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("study_group_members")
      .delete()
      .eq("group_id", data.groupId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getGroup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ groupId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: group, error } = await context.supabase
      .from("study_groups")
      .select("*")
      .eq("id", data.groupId)
      .single();
    if (error) throw error;

    const { data: members } = await context.supabase
      .from("study_group_members")
      .select("user_id, role, created_at")
      .eq("group_id", data.groupId);

    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await context.supabase.from("public_profiles").select("id, name, avatar_url").in("id", userIds)
      : { data: [] as { id: string | null; name: string | null; avatar_url: string | null }[] };

    const isMember = (members ?? []).some((m) => m.user_id === context.userId);

    const { data: messages } = isMember
      ? await context.supabase
          .from("study_group_messages")
          .select("id, body, user_id, created_at")
          .eq("group_id", data.groupId)
          .order("created_at", { ascending: true })
          .limit(200)
      : { data: [] };

    const msgUserIds = Array.from(new Set((messages ?? []).map((m) => m.user_id)));
    const { data: msgProfiles } = msgUserIds.length
      ? await context.supabase.from("public_profiles").select("id, name, avatar_url").in("id", msgUserIds)
      : { data: [] as { id: string | null; name: string | null; avatar_url: string | null }[] };

    return {
      group,
      members: (members ?? []).map((m) => ({
        ...m,
        profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? null,
      })),
      is_member: isMember,
      messages: (messages ?? []).map((m) => ({
        ...m,
        profile: (msgProfiles ?? []).find((p) => p.id === m.user_id) ?? null,
      })),
    };
  });

export const postGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ groupId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("study_group_messages").insert({
      group_id: data.groupId,
      user_id: context.userId,
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });
