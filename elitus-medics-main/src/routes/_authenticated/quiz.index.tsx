import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Clock, CheckCircle2, PlayCircle, Lock } from "lucide-react";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { listQuizzes } from "@/lib/quiz.functions";

export const Route = createFileRoute("/_authenticated/quiz/")({
  head: () => ({ meta: [{ title: "Weekly Quiz — ELITUS MEDICS U25" }] }),
  component: QuizIndex,
});

function QuizIndex() {
  const fetchQuizzes = useServerFn(listQuizzes);
  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes"],
    queryFn: () => fetchQuizzes(),
  });

  const live = (quizzes ?? []).filter((q) => q.status === "live");
  const upcoming = (quizzes ?? []).filter((q) => q.status === "scheduled");
  const past = (quizzes ?? []).filter((q) => q.status === "closed");

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8"
      >
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pulse Check</p>
          <h1 className="font-display text-3xl md:text-4xl mt-1">Weekly Quiz</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xl">
            One quiz a week. Earn points, hold your streak, climb the leaderboard.
          </p>
        </header>
        <ECGLine height={20} />

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <Section title="Live now" empty="No live quiz right now.">
              {live.map((q) => <QuizCard key={q.id} quiz={q} primary />)}
            </Section>
            <Section title="Upcoming" empty="No upcoming quizzes scheduled.">
              {upcoming.map((q) => <QuizCard key={q.id} quiz={q} />)}
            </Section>
            <Section title="Past" empty="No past quizzes yet.">
              {past.map((q) => <QuizCard key={q.id} quiz={q} />)}
            </Section>
          </>
        )}
      </motion.div>
    </StudentShell>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  const hasItems = arr.filter(Boolean).length > 0;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg text-gold-soft">{title}</h2>
      {hasItems ? <div className="grid gap-3">{children}</div> : (
        <div className="card-elevated p-5 text-sm text-muted-foreground">{empty}</div>
      )}
    </section>
  );
}

function QuizCard({ quiz, primary }: { quiz: Awaited<ReturnType<typeof listQuizzes>>[number]; primary?: boolean }) {
  const submitted = quiz.attempt?.status === "submitted";
  const inProgress = quiz.attempt?.status === "in_progress";

  return (
    <div className={`card-elevated card-hover relative overflow-hidden p-5 md:p-6 ${primary ? "gold-glow" : ""}`}>
      {primary && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.10),transparent_60%)]" />
      )}
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Activity className="h-3 w-3 text-gold" />
            {quiz.subject ?? "General"} · {quiz.question_count} questions
          </div>
          <h3 className="font-display mt-2 text-xl md:text-2xl">{quiz.title}</h3>
          {quiz.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quiz.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {Math.round(quiz.time_limit_seconds / 60)} min
            </span>
            {submitted && (
              <span className="inline-flex items-center gap-1.5 text-gold">
                <CheckCircle2 className="h-3.5 w-3.5" /> {quiz.attempt!.score}/{quiz.attempt!.max_score}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {quiz.status === "scheduled" ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Opens soon
            </span>
          ) : submitted ? (
            <Link
              to="/quiz/$quizId"
              params={{ quizId: quiz.id }}
              search={{ review: true }}
              className="inline-flex items-center gap-2 rounded-md border border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/10 px-4 py-2 text-xs font-semibold text-gold hover:bg-gold/15"
            >
              Review
            </Link>
          ) : (
            <Link
              to="/quiz/$quizId"
              params={{ quizId: quiz.id }}
              search={{ review: false }}
              className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-xs font-semibold text-[var(--gold-foreground)] hover:opacity-95"
            >
              <PlayCircle className="h-4 w-4" /> {inProgress ? "Resume" : "Start"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
