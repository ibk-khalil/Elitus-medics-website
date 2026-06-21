import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FileText, ShieldAlert } from "lucide-react";
import { StudentShell } from "@/components/student-shell";
import { useRole } from "@/hooks/use-profile";
import { adminCreateQuiz, adminListQuizzes } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/admin/quizzes")({
  head: () => ({ meta: [{ title: "Admin · Quizzes" }] }),
  component: AdminQuizzes,
});

function AdminQuizzes() {
  const { data: role, isLoading: roleLoading } = useRole();
  const fetchAll = useServerFn(adminListQuizzes);
  const create = useServerFn(adminCreateQuiz);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", subject: "", time_minutes: 10 });

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["admin-quizzes"],
    queryFn: () => fetchAll(),
    enabled: role === "admin",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          title: form.title,
          subject: form.subject || null,
          time_limit_seconds: form.time_minutes * 60,
        },
      }),
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      setCreating(false);
      navigate({ to: "/admin/quizzes/$quizId", params: { quizId: q.id } });
    },
  });

  if (roleLoading) {
    return <StudentShell><div className="p-8 text-sm text-muted-foreground">Loading…</div></StudentShell>;
  }
  if (role !== "admin") {
    return (
      <StudentShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-3">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="font-display text-2xl">Admins only</h1>
          <p className="text-sm text-muted-foreground">This area is restricted.</p>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
            <h1 className="font-display text-3xl">Quizzes</h1>
          </div>
          <button
            onClick={() => setCreating((s) => !s)}
            className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> New quiz
          </button>
        </div>

        {creating && (
          <div className="card-elevated p-5 space-y-3">
            <h3 className="font-display text-lg">New quiz</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm md:col-span-2"
              />
              <input
                placeholder="Subject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Time limit
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.time_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, time_minutes: Number(e.target.value) }))}
                  className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-sm"
                />
                min
              </label>
            </div>
            <div className="flex gap-2">
              <button
                disabled={!form.title || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating…" : "Create draft"}
              </button>
              <button onClick={() => setCreating(false)} className="text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid gap-2">
            {(quizzes ?? []).map((q) => (
              <Link
                key={q.id}
                to="/admin/quizzes/$quizId"
                params={{ quizId: q.id }}
                className="card-elevated card-hover flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gold" />
                    <span className="font-display text-base truncate">{q.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {q.subject ?? "—"} · {q.question_count} questions
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  q.status === "live"
                    ? "bg-gold/15 text-gold"
                    : q.status === "scheduled"
                    ? "bg-secondary text-foreground"
                    : q.status === "closed"
                    ? "bg-secondary text-muted-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {q.status}
                </span>
              </Link>
            ))}
            {(quizzes ?? []).length === 0 && (
              <div className="card-elevated p-6 text-sm text-muted-foreground">No quizzes yet.</div>
            )}
          </div>
        )}
      </motion.div>
    </StudentShell>
  );
}
