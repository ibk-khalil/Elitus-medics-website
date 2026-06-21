import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, XCircle, Trophy, Sparkles } from "lucide-react";
import { z } from "zod";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { startQuiz, submitQuiz, getQuizReview } from "@/lib/quiz.functions";

const searchSchema = z.object({ review: z.boolean().optional() });

export const Route = createFileRoute("/_authenticated/quiz/$quizId")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Quiz — ELITUS MEDICS U25" }] }),
  component: QuizPage,
});

function QuizPage() {
  const { quizId } = Route.useParams();
  const { review } = Route.useSearch();
  return review ? <ReviewView quizId={quizId} /> : <TakeView quizId={quizId} />;
}

/* ------------------ Take view ------------------ */

function TakeView({ quizId }: { quizId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const start = useServerFn(startQuiz);
  const submit = useServerFn(submitQuiz);

  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-take", quizId],
    queryFn: () => start({ data: { quizId } }),
    retry: false,
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const startedRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!data) return;
    startedRef.current = new Date(data.attempt.started_at).getTime();
    const elapsed = Math.floor((Date.now() - startedRef.current) / 1000);
    setTimeLeft(Math.max(0, data.quiz.time_limit_seconds - elapsed));
  }, [data]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof submit>[0]) => submit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      navigate({ to: "/quiz/$quizId", params: { quizId }, search: { review: true }, replace: true });
    },
  });

  function handleSubmit() {
    if (!data || mutation.isPending) return;
    const elapsed = Math.floor((Date.now() - startedRef.current) / 1000);
    const payload = {
      attemptId: data.attempt.id,
      timeSpentSeconds: elapsed,
      answers: data.questions.map((q) => ({
        questionId: q.id,
        choiceId: answers[q.id] ?? null,
      })),
    };
    mutation.mutate({ data: payload });
  }

  if (isLoading) {
    return <StudentShell><div className="p-8 text-sm text-muted-foreground">Loading quiz…</div></StudentShell>;
  }
  if (error) {
    return (
      <StudentShell>
        <div className="mx-auto max-w-xl space-y-4 px-4 py-12 text-center">
          <h2 className="font-display text-2xl">Can't start this quiz</h2>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          <Link to="/quiz" className="inline-block text-sm text-gold hover:underline">← Back to quizzes</Link>
        </div>
      </StudentShell>
    );
  }
  if (!data) return null;

  const q = data.questions[index];
  const answered = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const progress = ((index + 1) / data.questions.length) * 100;

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8 md:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{data.quiz.subject ?? "Quiz"}</p>
            <h1 className="font-display text-xl md:text-2xl">{data.quiz.title}</h1>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-mono ${
            timeLeft !== null && timeLeft < 60 ? "border-destructive/40 text-destructive" : "border-border text-foreground"
          }`}>
            <Clock className="h-4 w-4" /> {formatTime(timeLeft ?? 0)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>Question {index + 1} of {data.questions.length}</span>
          <span>{answered} answered</span>
        </div>

        {/* Question card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="card-elevated mt-6 p-6 md:p-8"
          >
            <p className="text-sm leading-relaxed text-foreground/95">{q.prompt}</p>
            <div className="mt-5 space-y-2">
              {q.choices.map((c, i) => {
                const selected = answers[q.id] === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: c.id }))}
                    className={`group flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition ${
                      selected
                        ? "border-[color-mix(in_oklch,var(--gold)_60%,transparent)] bg-gold/10"
                        : "border-border bg-surface hover:border-[color-mix(in_oklch,var(--gold)_30%,transparent)] hover:bg-secondary"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      selected ? "border-gold bg-gold text-[var(--gold-foreground)]" : "border-border text-muted-foreground"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1 leading-relaxed">{c.text}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav controls */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          {index === data.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:opacity-95 disabled:opacity-60"
            >
              {mutation.isPending ? "Submitting…" : "Submit quiz"}
            </button>
          ) : (
            <button
              onClick={() => setIndex((i) => Math.min(data.questions.length - 1, i + 1))}
              className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:opacity-95"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Question pager */}
        <div className="mt-5 flex flex-wrap gap-2">
          {data.questions.map((qq, i) => {
            const isAnswered = !!answers[qq.id];
            return (
              <button
                key={qq.id}
                onClick={() => setIndex(i)}
                className={`h-8 w-8 rounded-md border text-[11px] font-semibold transition ${
                  i === index
                    ? "border-gold bg-gold text-[var(--gold-foreground)]"
                    : isAnswered
                    ? "border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/10 text-gold"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </StudentShell>
  );
}

/* ------------------ Review view ------------------ */

function ReviewView({ quizId }: { quizId: string }) {
  const fetchReview = useServerFn(getQuizReview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["quiz-review", quizId],
    queryFn: () => fetchReview({ data: { quizId } }),
    retry: false,
  });

  const pct = useMemo(() => {
    if (!data?.attempt.max_score) return 0;
    return Math.round((data.attempt.score / data.attempt.max_score) * 100);
  }, [data]);

  if (isLoading) return <StudentShell><div className="p-8 text-sm text-muted-foreground">Loading review…</div></StudentShell>;
  if (error) return (
    <StudentShell>
      <div className="mx-auto max-w-xl space-y-4 px-4 py-12 text-center">
        <h2 className="font-display text-2xl">Review unavailable</h2>
        <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        <Link to="/quiz" className="inline-block text-sm text-gold hover:underline">← Back to quizzes</Link>
      </div>
    </StudentShell>
  );
  if (!data) return null;

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-8"
      >
        {/* Result summary */}
        <div className="card-elevated relative overflow-hidden p-6 md:p-8 gold-glow">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.12),transparent_60%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold">
              <Sparkles className="h-3 w-3" /> Quiz complete
            </div>
            <h1 className="font-display mt-3 text-3xl md:text-4xl">{data.quiz?.title}</h1>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <Stat icon={Trophy} label="Score" value={`${data.attempt.score}/${data.attempt.max_score}`} />
              <Stat icon={CheckCircle2} label="Accuracy" value={`${pct}%`} />
              <Stat icon={Clock} label="Time" value={formatTime(data.attempt.time_spent_seconds)} />
            </div>
            <ECGLine height={18} className="mt-5" />
          </div>
        </div>

        {/* Question-by-question */}
        <section className="space-y-4">
          <h2 className="font-display text-lg text-gold-soft">Review</h2>
          {data.questions.map((q, idx) => {
            const userChoiceId = q.userAnswer?.selected_choice_id ?? null;
            const correctId = q.choices.find((c) => c.is_correct)?.id ?? null;
            const isCorrect = q.userAnswer?.is_correct;
            return (
              <div key={q.id} className="card-elevated p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Question {idx + 1}
                  </div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs text-gold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> +{q.userAnswer?.points_awarded} pts
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Incorrect
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed">{q.prompt}</p>
                <div className="mt-4 space-y-2">
                  {q.choices.map((c, i) => {
                    const isUser = c.id === userChoiceId;
                    const isCorrectChoice = c.id === correctId;
                    return (
                      <div
                        key={c.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                          isCorrectChoice
                            ? "border-[color-mix(in_oklch,var(--gold)_50%,transparent)] bg-gold/10"
                            : isUser
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border"
                        }`}
                      >
                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          isCorrectChoice
                            ? "bg-gold text-[var(--gold-foreground)]"
                            : isUser
                            ? "bg-destructive text-destructive-foreground"
                            : "border border-border text-muted-foreground"
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1">{c.text}</span>
                        {isCorrectChoice && <CheckCircle2 className="h-4 w-4 text-gold" />}
                        {isUser && !isCorrectChoice && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Why: </span>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div className="flex justify-center">
          <Link to="/quiz" className="text-sm text-gold hover:underline">← Back to all quizzes</Link>
        </div>
      </motion.div>
    </StudentShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-gold" /> {label}
      </div>
      <div className="font-display mt-1 text-lg">{value}</div>
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
