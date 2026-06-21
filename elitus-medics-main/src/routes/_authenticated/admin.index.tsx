import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Zap, BookOpen, Calendar, Megaphone, Flame, Shield, Send, Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { useRole } from "@/hooks/use-profile";
import { adminStats, adminListUsers, adminSetRole, type AdminUser } from "@/lib/admin.functions";
import { broadcastNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — ELITUS MEDICS U25" }] }),
  component: AdminHome,
  errorComponent: ({ error }) => (
    <StudentShell><div className="p-8 text-destructive">{String(error.message)}</div></StudentShell>
  ),
});

function AdminHome() {
  const { data: role } = useRole();
  const statsFn = useServerFn(adminStats);
  const usersFn = useServerFn(adminListUsers);
  const { data: stats } = useSuspenseQuery(queryOptions({ queryKey: ["admin", "stats"], queryFn: () => statsFn() }));
  const { data: users } = useSuspenseQuery(queryOptions({ queryKey: ["admin", "users"], queryFn: () => usersFn() }));

  if (role !== "admin") {
    return (
      <StudentShell>
        <div className="mx-auto max-w-md p-10 text-center">
          <Shield className="mx-auto h-10 w-10 text-gold" />
          <h1 className="font-display mt-4 text-2xl">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You need admin access to view this page.</p>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Operations</p>
            <h1 className="font-display text-3xl md:text-4xl">Admin dashboard</h1>
          </div>
          <Link to="/admin/quizzes" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-[color-mix(in_oklch,var(--gold)_30%,transparent)] hover:text-gold">
            <Zap className="h-4 w-4" /> Manage quizzes
          </Link>
        </header>
        <ECGLine height={20} />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={Users} label="Students" value={stats.total_students} sub={`${stats.total_admins} admin · ${stats.total_reps} rep`} />
          <Stat icon={Flame} label="Active today" value={stats.active_today} />
          <Stat icon={Zap} label="Quiz attempts" value={stats.total_attempts} sub={`${stats.live_quizzes} live`} />
          <Stat icon={Trophy} label="Total quizzes" value={stats.total_quizzes} />
          <Stat icon={BookOpen} label="Resources" value={stats.total_resources} />
          <Stat icon={Calendar} label="Upcoming events" value={stats.upcoming_events} sub={`${stats.total_events} total`} />
          <Stat icon={Megaphone} label="Announcements" value={stats.total_announcements} />
          <Stat icon={Send} label="Broadcast" value="—" sub="Compose below" />
        </div>

        <BroadcastForm />

        {/* User management */}
        <section>
          <h2 className="font-display text-2xl">Cohort</h2>
          <p className="text-sm text-muted-foreground">Top 200 students. Tap a role chip to change it.</p>
          <div className="card-elevated mt-3 overflow-hidden">
            <div className="hidden grid-cols-[1fr_120px_90px_120px] gap-2 border-b border-border px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>Student</span><span>Role</span><span className="text-right">Points</span><span className="text-right">Streak</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {users.map((u) => <UserRow key={u.id} u={u} />)}
            </div>
          </div>
        </section>
      </motion.div>
    </StudentShell>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: number | string; sub?: string }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-gold" /><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span></div>
      <p className="mt-1.5 font-display text-2xl">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function UserRow({ u }: { u: AdminUser }) {
  const setRole = useServerFn(adminSetRole);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (role: "admin" | "representative" | "student") => setRole({ data: { userId: u.id, role } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const cycle = () => {
    const next = u.role === "student" ? "representative" : u.role === "representative" ? "admin" : "student";
    m.mutate(next);
  };

  const tint = u.role === "admin" ? "text-gold border-[color-mix(in_oklch,var(--gold)_40%,transparent)] bg-gold/10" :
               u.role === "representative" ? "text-zinc-200 border-zinc-700 bg-zinc-900/40" :
               "text-muted-foreground border-border bg-surface";

  return (
    <div className="grid grid-cols-[1fr_120px_90px_120px] items-center gap-2 border-b border-border/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-[10px] font-semibold uppercase text-gold-soft border border-[color-mix(in_oklch,var(--gold)_25%,transparent)]">
          {(u.name ?? u.email ?? "?").slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="truncate">{u.name ?? "Unnamed"}</p>
          <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
        </div>
      </div>
      <button onClick={cycle} disabled={m.isPending} className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider transition ${tint} disabled:opacity-50`}>
        {u.role}
      </button>
      <span className="text-right font-display">{u.points_total}</span>
      <span className="text-right text-muted-foreground">{u.streak_count}d</span>
    </div>
  );
}

function BroadcastForm() {
  const bc = useServerFn(broadcastNotification);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"info" | "quiz" | "event" | "vault">("info");
  const m = useMutation({
    mutationFn: () => bc({ data: { title, body: body || null, type, link: null } }),
    onSuccess: (r) => { toast.success(`Sent to ${r.sent} students`); setTitle(""); setBody(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <section className="card-elevated p-6">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-gold" />
        <h2 className="font-display text-lg">Broadcast notification</h2>
      </div>
      <p className="text-xs text-muted-foreground">Sends an in-app notification to every student.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px]">
        <input className="input-field" placeholder="Title (e.g. Weekly quiz is live)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input-field" value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="info">Info</option><option value="quiz">Quiz</option>
          <option value="event">Event</option><option value="vault">Vault</option>
        </select>
      </div>
      <textarea className="input-field mt-3 min-h-20" placeholder="Optional message body" value={body} onChange={(e) => setBody(e.target.value)} />
      <button onClick={() => m.mutate()} disabled={m.isPending || title.length < 2} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-50">
        {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Broadcast
      </button>
    </section>
  );
}
