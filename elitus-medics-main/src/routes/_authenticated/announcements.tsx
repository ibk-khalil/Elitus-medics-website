import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Pin, Trash2, Plus, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { useRole } from "@/hooks/use-profile";
import {
  listAnnouncements, createAnnouncement, deleteAnnouncement,
  type Announcement,
} from "@/lib/announcements.functions";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — ELITUS MEDICS U25" }] }),
  component: AnnouncementsPage,
  errorComponent: ({ error }) => (
    <StudentShell><div className="p-8 text-destructive">{String(error.message)}</div></StudentShell>
  ),
});

function AnnouncementsPage() {
  const fn = useServerFn(listAnnouncements);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["announcements"], queryFn: () => fn() }));
  const { data: role } = useRole();
  const canPost = role === "admin" || role === "representative";
  const [open, setOpen] = useState(false);

  return (
    <StudentShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">News from the ward</p>
            <h1 className="font-display text-3xl md:text-4xl">Announcements</h1>
          </div>
          {canPost && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110">
              <Plus className="h-4 w-4" /> New post
            </button>
          )}
        </header>
        <ECGLine height={20} />

        {data.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-4">
            {data.map((a) => <Card key={a.id} a={a} canManage={canPost} />)}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {open && <ComposerModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </StudentShell>
  );
}

function Card({ a, canManage }: { a: Announcement; canManage: boolean }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteAnnouncement);
  const m = useMutation({
    mutationFn: () => del({ data: { id: a.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div className={`card-elevated relative p-6 ${a.pinned ? "gold-glow" : ""}`}>
      {a.pinned && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
          <Pin className="h-3 w-3" /> Pinned
        </span>
      )}
      <h2 className="font-display text-xl">{a.title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span>{a.author_name ?? "Staff"} · {new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        {canManage && (
          <button onClick={() => m.mutate()} disabled={m.isPending} className="text-destructive/80 hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="card-elevated flex flex-col items-center gap-2 p-10 text-center">
      <Megaphone className="h-8 w-8 text-gold" />
      <p className="font-display text-lg">No announcements yet</p>
      <p className="text-sm text-muted-foreground">Class reps and admins will post updates here.</p>
    </div>
  );
}

function ComposerModal({ onClose }: { onClose: () => void }) {
  const create = useServerFn(createAnnouncement);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const m = useMutation({
    mutationFn: () => create({ data: { title, body, pinned } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Posted");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="glass relative w-full max-w-lg rounded-2xl p-6">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-2 hover:bg-secondary"><X className="h-4 w-4" /></button>
        <h2 className="font-display text-2xl">New announcement</h2>
        <div className="mt-5 space-y-3">
          <input className="input-field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-field min-h-32" placeholder="Body…" value={body} onChange={(e) => setBody(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-[var(--gold)]" />
            Pin to top
          </label>
        </div>
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending || title.length < 2 || body.length < 2}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-50"
        >
          {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Post
        </button>
      </motion.div>
    </div>
  );
}
