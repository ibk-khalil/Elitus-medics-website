import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Users, Plus, X, Loader2, Trash2, Check, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { useRole } from "@/hooks/use-profile";
import { listEvents, createEvent, deleteEvent, setRsvp, type EventRow } from "@/lib/events.functions";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events — ELITUS MEDICS U25" }] }),
  component: EventsPage,
  errorComponent: ({ error }) => (
    <StudentShell><div className="p-8 text-destructive">{String(error.message)}</div></StudentShell>
  ),
});

function EventsPage() {
  const fn = useServerFn(listEvents);
  const { data } = useSuspenseQuery(queryOptions({ queryKey: ["events"], queryFn: () => fn() }));
  const { data: role } = useRole();
  const canCreate = role === "admin" || role === "representative";
  const [open, setOpen] = useState(false);

  const upcoming = data.filter((e) => new Date(e.starts_at) >= new Date());
  const past = data.filter((e) => new Date(e.starts_at) < new Date());

  return (
    <StudentShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Class calendar</p>
            <h1 className="font-display text-3xl md:text-4xl">Events</h1>
          </div>
          {canCreate && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110">
              <Plus className="h-4 w-4" /> New event
            </button>
          )}
        </header>
        <ECGLine height={20} />

        {data.length === 0 && <Empty />}

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Upcoming</h2>
            {upcoming.map((e) => <EventCard key={e.id} e={e} canManage={canCreate} />)}
          </section>
        )}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Past</h2>
            <div className="opacity-60">{past.map((e) => <EventCard key={e.id} e={e} canManage={canCreate} />)}</div>
          </section>
        )}
      </motion.div>

      <AnimatePresence>{open && <ComposerModal onClose={() => setOpen(false)} />}</AnimatePresence>
    </StudentShell>
  );
}

function EventCard({ e, canManage }: { e: EventRow; canManage: boolean }) {
  const qc = useQueryClient();
  const rsvpFn = useServerFn(setRsvp);
  const delFn = useServerFn(deleteEvent);
  const rsvp = useMutation({
    mutationFn: (status: "going" | "interested" | "not_going") => rsvpFn({ data: { eventId: e.id, status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
    onError: (er: any) => toast.error(er.message),
  });
  const del = useMutation({
    mutationFn: () => delFn({ data: { id: e.id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Deleted"); },
    onError: (er: any) => toast.error(er.message),
  });

  const dt = new Date(e.starts_at);

  return (
    <div className="card-elevated card-hover relative p-5 md:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/5">
          <span className="text-[10px] uppercase tracking-wider text-gold">{dt.toLocaleDateString(undefined, { month: "short" })}</span>
          <span className="font-display text-2xl text-gold">{dt.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl">{e.title}</h3>
          {e.description && <p className="mt-1 text-sm text-muted-foreground">{e.description}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gold" /> {dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
            {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gold" /> {e.location}</span>}
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-gold" /> {e.going_count} going{e.capacity ? ` / ${e.capacity}` : ""}</span>
          </div>
        </div>
        {canManage && (
          <button onClick={() => del.mutate()} className="text-destructive/80 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <RSVPButton label="Going" value="going" current={e.my_status} onClick={(v) => rsvp.mutate(v)} />
        <RSVPButton label="Interested" value="interested" current={e.my_status} onClick={(v) => rsvp.mutate(v)} />
        <RSVPButton label="Can't make it" value="not_going" current={e.my_status} onClick={(v) => rsvp.mutate(v)} />
      </div>
    </div>
  );
}

function RSVPButton({ label, value, current, onClick }: { label: string; value: "going" | "interested" | "not_going"; current: string | null; onClick: (v: "going" | "interested" | "not_going") => void }) {
  const active = current === value;
  return (
    <button onClick={() => onClick(value)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-[color-mix(in_oklch,var(--gold)_50%,transparent)] bg-gold/15 text-gold" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}>
      {active && <Check className="h-3 w-3" />} {label}
    </button>
  );
}

function Empty() {
  return (
    <div className="card-elevated flex flex-col items-center gap-2 p-10 text-center">
      <Calendar className="h-8 w-8 text-gold" />
      <p className="font-display text-lg">No events scheduled</p>
      <p className="text-sm text-muted-foreground">Reps will post lectures, study sessions, and meetings here.</p>
    </div>
  );
}

function ComposerModal({ onClose }: { onClose: () => void }) {
  const create = useServerFn(createEvent);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");

  const m = useMutation({
    mutationFn: () => create({
      data: {
        title,
        description: description || null,
        location: location || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: null,
        capacity: capacity ? parseInt(capacity, 10) : null,
      },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast.success("Created"); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="glass relative w-full max-w-lg rounded-2xl p-6">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-2 hover:bg-secondary"><X className="h-4 w-4" /></button>
        <h2 className="font-display text-2xl">New event</h2>
        <div className="mt-5 space-y-3">
          <input className="input-field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-field min-h-24" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="input-field" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <input type="datetime-local" className="input-field" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <input className="input-field" type="number" placeholder="Capacity (optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending || title.length < 2 || !startsAt}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-50"
        >
          {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
        </button>
      </motion.div>
    </div>
  );
}
