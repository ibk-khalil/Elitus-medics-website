import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  resource_type: string;
  file_url: string;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  download_count: number;
  created_at: string;
};

async function assertCanUpload(ctx: { supabase: any; userId: string }) {
  const [{ data: a }, { data: r }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "representative" }),
  ]);
  if (!a && !r) throw new Error("Forbidden");
}

export const listResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Resource[]> => {
    const { data, error } = await context.supabase
      .from("resources")
      .select("id,title,description,subject,resource_type,file_url,file_size_bytes,uploaded_by,download_count,created_at,profiles:uploaded_by(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      ...r,
      uploader_name: r.profiles?.name ?? null,
    }));
  });

export const createResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      title: z.string().min(2).max(200),
      description: z.string().max(1000).optional().nullable(),
      subject: z.string().max(80).optional().nullable(),
      resource_type: z.enum(["document", "slides", "video", "link", "image"]).default("document"),
      file_url: z.string().min(1),
      file_size_bytes: z.number().int().min(0).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertCanUpload(context);
    const { data: row, error } = await context.supabase
      .from("resources")
      .insert({ ...data, uploaded_by: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("resources").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Generates a signed download URL for a stored file path (or returns external link as-is). */
export const getResourceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("resources").select("file_url,download_count").eq("id", data.id).maybeSingle();
    if (!r) throw new Error("Not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("resources")
      .update({ download_count: (r.download_count ?? 0) + 1 })
      .eq("id", data.id);

    if (/^https?:\/\//.test(r.file_url)) {
      return { url: r.file_url };
    }
    const { data: signed, error } = await supabaseAdmin.storage.from("resources").createSignedUrl(r.file_url, 300);
    if (error) throw error;
    return { url: signed.signedUrl };
  });

