import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Activity, Trophy, BookOpen, Users, Zap, Flame } from "lucide-react";
import { ECGLine } from "@/components/ecg-line";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELITUS MEDICS U25 — Your academic ecosystem" },
      { name: "description", content: "Weekly quizzes, leaderboards, a resource vault, and community — built by a student, for medical students." },
      { property: "og:title", content: "ELITUS MEDICS U25" },
      { property: "og:description", content: "Your academic ecosystem starts here." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Logo size="md" />
          </Link>
          <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground sm:px-4"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)] transition hover:brightness-110 sm:px-4"
            >
              Join U25
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(201,168,76,0.15),transparent)]" />
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-20 md:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-gold-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gold gold-shine" />
            For Medical Students
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display mt-6 text-4xl leading-[1.1] sm:text-5xl sm:leading-[1.05] md:text-7xl"
          >
            Your academic ecosystem.
            <br />
            <span className="text-gold">Built for the ward.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground md:text-lg"
          >
            ELITUS MEDICS U25 is the private platform for our class — weekly quizzes, a shared resource vault,
            a live leaderboard, and the community that keeps you sharp.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-10 flex flex-wrap justify-center gap-3"
          >
            <Link
              to="/auth"
              search={{ mode: "register" }}
              className="group inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-[var(--gold-foreground)] transition hover:brightness-110 gold-glow"
            >
              Get started <Zap className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold transition hover:border-[color-mix(in_oklch,var(--gold)_30%,transparent)]"
            >
              I already have an invite
            </Link>
          </motion.div>

          <div className="mx-auto mt-16 max-w-2xl">
            <ECGLine height={36} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="card-elevated card-hover p-6"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-gold">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6 sm:pb-24">
        <ECGLine height={28} />
        <h2 className="font-display mt-10 text-3xl md:text-4xl">
          Built by a student, for our class.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Registration is invite-only. Ask your class rep for the code.
        </p>
        <Link
          to="/auth"
          search={{ mode: "register" }}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-[var(--gold-foreground)] transition hover:brightness-110"
        >
          Enter the platform <Zap className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-xs text-muted-foreground sm:px-6 md:flex-row">
          <p>© 2026 ELITUS MEDICS U25</p>
          <p>Powered by our community 💛</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: Zap, title: "Weekly quizzes", body: "Timed challenges with live leaderboards. Speed bonuses, instant explanations, no excuses." },
  { icon: Trophy, title: "Leaderboards", body: "Weekly, monthly, all-time. Climb the podium, earn badges, leave your name in the Hall of Fame." },
  { icon: BookOpen, title: "Resource vault", body: "Lecture notes, past questions, study guides — organized by course, downloadable any time." },
  { icon: Flame, title: "Streaks & badges", body: "Show up every day. Unlock 10+ badges, from First Pulse to Flame Lord." },
  { icon: Users, title: "Study groups", body: "Private 6-person groups with shared notes and chat. Your real study circle, online." },
  { icon: Activity, title: "Built around the ECG", body: "A design language that feels like medicine. Every screen, intentional." },
];
