import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ShieldAlert, ArrowLeft, Check } from "lucide-react";
import { StudentShell } from "@/components/student-shell";
import { useRole } from "@/hooks/use-profile";
import { adminGetQuiz, adminSaveQuiz } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/admin/quizzes/$quizId")({
  head: () => ({ meta: [{ title: "Edit Quiz · Admin" }] }),
  component: EditQuiz,
});

type LocalChoice = { text: string; is_correct: boolean };
type LocalQuestion = { prompt: string; explanation: string; points: number; choices: LocalChoice[] };
type LocalMeta = {
  title: string;
  description: string;
  subject: string;
  time_minutes: number;
  status: "draft" | "scheduled" | "live" | "closed";
  opens_at: string;
  closes_at: string;
};

function EditQuiz() {
  const { quizId } = Route.useParams();
  const { data: role, isLoading: roleLoading } = useRole();
  const fetchQuiz = useServerFn(adminGetQuiz);
  const save = useServerFn(adminSaveQuiz);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-quiz", quizId],
    queryFn: () => fetchQuiz({ data: { quizId } }),
    enabled: role === "admin",
  });

  const [meta, setMeta] = useState<LocalMeta | null>(null);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMeta({
      title: data.quiz.title,
      description: data.quiz.description ?? "",
      subject: data.quiz.subject ?? "",
      time_minutes: Math.round(data.quiz.time_limit_seconds / 60),
      status: data.quiz.status as LocalMeta["status"],
      opens_at: data.quiz.opens_at ?? "",
      closes_at: data.quiz.closes_at ?? "",
    });
    setQuestions(
      data.questions.length
        ? data.questions.map((q) => ({
            prompt: q.prompt,
            explanation: q.explanation ?? "",
            points: q.points,
            choices: q.quiz_choices.map((c) => ({ text: c.text, is_correct: c.is_correct })),
          }))
        : [emptyQuestion()],
    );
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!meta) throw new Error("Meta not loaded");
      return save({
        data: {
          quizId,
          meta: {
            title: meta.title,
            description: meta.description || null,
            subject: meta.subject || null,
            time_limit_seconds: meta.time_minutes * 60,
            status: meta.status,
            opens_at: meta.opens_at || null,
            closes_at: meta.closes_at || null,
          },
          questions: questions.map((q, qi) => ({
            prompt: q.prompt,
            explanation: q.explanation || null,
            points: q.points,
            order_index: qi,
            choices: q.choices.map((c, ci) => ({
              text: c.text,
              is_correct: c.is_correct,
              order_index: ci,
            })),
          })),
        },
      });
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["admin-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-quiz", quizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (roleLoading || isLoading || !meta) {
    return <StudentShell><div className="p-8 text-sm text-muted-foreground">Loading…</div></StudentShell>;
  }
  if (role !== "admin") {
    return (
      <StudentShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-3">
          <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="font-display text-2xl">Admins only</h1>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8"
      >
        <Link to="/admin/quizzes" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All quizzes
        </Link>

        {/* Meta */}
        <div className="card-elevated p-5 space-y-3">
          <h2 className="font-display text-lg">Quiz details</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="input-field" placeholder="Title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            <input className="input-field" placeholder="Subject" value={meta.subject} onChange={(e) => setMeta({ ...meta, subject: e.target.value })} />
            <textarea className="input-field md:col-span-2" placeholder="Description (optional)" rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Time limit
              <input type="number" min={1} max={120} value={meta.time_minutes} onChange={(e) => setMeta({ ...meta, time_minutes: Number(e.target.value) })} className="input-field w-20" /> min
            </label>
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Status
              <select value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as LocalMeta["status"] })} className="input-field">
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Questions ({questions.length})</h2>
            <button
              onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <Plus className="h-3.5 w-3.5" /> Add question
            </button>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="card-elevated p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Question {qi + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== qi))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Question prompt"
                value={q.prompt}
                onChange={(e) => updateQ(setQuestions, qi, { prompt: e.target.value })}
              />
              <div className="space-y-2">
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateQ(setQuestions, qi, {
                          choices: q.choices.map((cc, i) => ({ ...cc, is_correct: i === ci })),
                        })
                      }
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                        c.is_correct ? "border-gold bg-gold text-[var(--gold-foreground)]" : "border-border text-muted-foreground"
                      }`}
                      title="Mark as correct"
                    >
                      {c.is_correct ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + ci)}
                    </button>
                    <input
                      className="input-field flex-1"
                      placeholder={`Choice ${String.fromCharCode(65 + ci)}`}
                      value={c.text}
                      onChange={(e) =>
                        updateQ(setQuestions, qi, {
                          choices: q.choices.map((cc, i) => (i === ci ? { ...cc, text: e.target.value } : cc)),
                        })
                      }
                    />
                    {q.choices.length > 2 && (
                      <button
                        onClick={() =>
                          updateQ(setQuestions, qi, {
                            choices: q.choices.filter((_, i) => i !== ci),
                          })
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {q.choices.length < 6 && (
                  <button
                    onClick={() => updateQ(setQuestions, qi, { choices: [...q.choices, { text: "", is_correct: false }] })}
                    className="text-xs text-gold hover:underline"
                  >
                    + Add choice
                  </button>
                )}
              </div>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Explanation (shown post-quiz, optional)"
                value={q.explanation}
                onChange={(e) => updateQ(setQuestions, qi, { explanation: e.target.value })}
              />
              <label className="text-xs text-muted-foreground flex items-center gap-2">
                Points
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={q.points}
                  onChange={(e) => updateQ(setQuestions, qi, { points: Number(e.target.value) })}
                  className="input-field w-20"
                />
              </label>
            </div>
          ))}
        </div>

        {/* Save bar */}
        <div className="sticky bottom-20 md:bottom-4 z-20 flex items-center justify-end gap-3 rounded-lg border border-border bg-surface/95 p-3 backdrop-blur-xl">
          {saved && <span className="text-xs text-gold">Saved ✓</span>}
          {mutation.isError && <span className="text-xs text-destructive">{(mutation.error as Error).message}</span>}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-md bg-gold px-5 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:opacity-95 disabled:opacity-60"
          >
            {mutation.isPending ? "Saving…" : "Save quiz"}
          </button>
        </div>
      </motion.div>
    </StudentShell>
  );
}

function emptyQuestion(): LocalQuestion {
  return {
    prompt: "",
    explanation: "",
    points: 10,
    choices: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  };
}

function updateQ(setQuestions: React.Dispatch<React.SetStateAction<LocalQuestion[]>>, idx: number, patch: Partial<LocalQuestion>) {
  setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
}
