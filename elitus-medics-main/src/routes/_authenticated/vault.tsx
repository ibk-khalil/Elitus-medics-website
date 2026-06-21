import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Download, FileText, Trash2, Plus, X, Loader2, Search, Link as LinkIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { useRole } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import {
  listResources, createResource, deleteResource, getResourceSignedUrl,
  type Resource,
} from "@/lib/vault.functions";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({ meta: [{ title: "Resource Vault — ELITUS MEDICS U25" }] }),
  component: VaultPage,
  errorComponent: ({ error }) => (
    <StudentShell><div className="p-8 text-destructive">{String(error.message)}</div></StudentShell>
  ),
});

function VaultPage() {
  const fn = useServerFn(listResources);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["resources"], queryFn: () => fn() }));
  const { data: role } = useRole();
  const canUpload = role === "admin" || role === "representative";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("");

  const subjects = useMemo(() => {
    const s = new Set<string>();
    data.forEach((r) => r.subject && s.add(r.subject));
    return Array.from(s);
  }, [data]);

  const filtered = data.filter(
    (r) =>
      (!subject || r.subject === subject) &&
      (!q || (r.title + (r.description ?? "")).toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <StudentShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Knowledge base</p>
            <h1 className="font-display text-3xl md:text-4xl">Resource Vault</h1>
            <p className="mt-1 text-sm text-muted-foreground">Lecture notes, past papers, slides, and study guides.</p>
          </div>
          {canUpload && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110">
              <Plus className="h-4 w-4" /> Add resource
            </button>
          )}
        </header>
        <ECGLine height={20} />

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className="input-field pl-9" placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {subjects.length > 0 && (
            <select className="input-field max-w-48" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {filtered.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => <ResourceCard key={r.id} r={r} canManage={canUpload} />)}
          </div>
        )}
      </motion.div>

      <AnimatePresence>{open && <UploadModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </StudentShell>
  );
}

function ResourceCard({ r, canManage }: { r: Resource; canManage: boolean }) {
  const qc = useQueryClient();
  const getUrl = useServerFn(getResourceSignedUrl);
  const del = useServerFn(deleteResource);

  const open = useMutation({
    mutationFn: () => getUrl({ data: { id: r.id } }),
    onSuccess: (res) => window.open(res.url, "_blank", "noopener"),
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => del({ data: { id: r.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resources"] }); toast.success("Removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const isLink = /^https?:\/\//.test(r.file_url);

  return (
    <div className="card-elevated card-hover relative flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/10">
          {isLink ? <LinkIcon className="h-5 w-5 text-gold" /> : <FileText className="h-5 w-5 text-gold" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base leading-tight">{r.title}</h3>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">{r.subject ?? r.resource_type}</p>
        </div>
        {canManage && (
          <button onClick={() => remove.mutate()} className="text-destructive/70 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {r.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>}
      <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
        <span>{r.uploader_name ?? "Staff"} · {r.download_count} dl</span>
        <button onClick={() => open.mutate()} disabled={open.isPending} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs hover:border-[color-mix(in_oklch,var(--gold)_30%,transparent)] hover:text-gold">
          {open.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {isLink ? "Open" : "Download"}
        </button>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="card-elevated flex flex-col items-center gap-2 p-10 text-center">
      <BookOpen className="h-8 w-8 text-gold" />
      <p className="font-display text-lg">Vault is empty</p>
      <p className="text-sm text-muted-foreground">Class reps upload study materials here.</p>
    </div>
  );
}

const SUBJECTS = ["Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology", "Other"];

function UploadModal({ onClose }: { onClose: () => void }) {
  const create = useServerFn(createResource);
  const qc = useQueryClient();
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<"document" | "slides" | "video" | "link" | "image">("document");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title) return toast.error("Title required");
    setBusy(true);
    try {
      let file_url = linkUrl;
      let file_size_bytes: number | null = null;
      if (mode === "file") {
        if (!file) { setBusy(false); return toast.error("Pick a file"); }
        const { data: userData } = await supabase.auth.getUser();
        const path = `${userData.user!.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("resources").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        file_url = path;
        file_size_bytes = file.size;
      } else {
        if (!linkUrl.startsWith("http")) { setBusy(false); return toast.error("Use a full https:// URL"); }
      }
      await create({
        data: {
          title,
          description: description || null,
          subject: subject || null,
          resource_type: mode === "link" ? "link" : type,
          file_url,
          file_size_bytes,
        },
      });
      qc.invalidateQueries({ queryKey: ["resources"] });
      toast.success("Added to vault");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="glass relative w-full max-w-lg rounded-2xl p-6">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-2 hover:bg-secondary"><X className="h-4 w-4" /></button>
        <h2 className="font-display text-2xl">Add resource</h2>

        <div className="mt-4 inline-flex rounded-md border border-border bg-surface p-0.5">
          {(["file", "link"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded px-3 py-1 text-xs uppercase tracking-wider ${mode === m ? "bg-gold/15 text-gold" : "text-muted-foreground"}`}>{m}</button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <input className="input-field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-field min-h-20" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Subject…</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {mode === "file" && (
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="document">Document</option>
                <option value="slides">Slides</option>
                <option value="video">Video</option>
                <option value="image">Image</option>
              </select>
            )}
          </div>
          {mode === "file" ? (
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-gold/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gold hover:file:brightness-110" />
          ) : (
            <input className="input-field" placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          )}
        </div>

        <button onClick={submit} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </motion.div>
    </div>
  );
}
