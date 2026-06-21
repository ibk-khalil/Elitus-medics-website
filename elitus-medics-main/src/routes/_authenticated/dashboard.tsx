import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Flame, Trophy, Star, BookOpen, Zap, Calendar, Megaphone, Quote, ArrowRight } from "lucide-react";
import { StudentShell } from "@/components/student-shell";
import { OnboardingModal } from "@/components/onboarding-modal";
import { useProfile } from "@/hooks/use-profile";
import { ECGLine } from "@/components/ecg-line";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ELITUS MEDICS U25" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading } = useProfile();

  const showOnboarding = !isLoading && profile && !profile.onboarding_completed;

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-7xl space-y-6 px-4 py-8 md:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Welcome back</p>
            <h1 className="font-display text-3xl md:text-4xl">
              {profile?.name ?? "Student"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <ECGLine height={20} />

        {/* Weekly quiz banner */}
        <div className="card-elevated relative overflow-hidden p-6 md:p-8 gold-glow">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.12),transparent_60%)]" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-gold/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-gold gold-shine" /> Pulse Check
              </div>
              <h2 className="font-display mt-3 text-2xl md:text-3xl">Weekly quiz</h2>
              <p className="mt-1 text-sm text-muted-foreground">Earn points, hold your streak, climb the leaderboard.</p>
            </div>
            <Link to="/quiz" className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] hover:opacity-95">
              Take the quiz <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Flame} label="Current Streak" value={`${profile?.streak_count ?? 0} days`} />
          <StatCard icon={Trophy} label="Your Rank" value="—" hint="Awaits first quiz" />
          <StatCard icon={Star} label="Total Points" value={`${profile?.points_total ?? 0}`} />
          <StatCard icon={BookOpen} label="Resources" value="0" />
        </div>

        {/* Coming-soon grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/leaderboard" className="card-elevated card-hover relative block p-6">
            <Trophy className="h-5 w-5 text-gold" />
            <h3 className="font-display mt-3 text-lg">Leaderboard</h3>
            <p className="mt-1 text-sm text-muted-foreground">See where you stand against the cohort.</p>
          </Link>
          <DashCard to="/announcements" icon={Megaphone} title="Announcements" body="Class news, pinned posts, and updates from your reps." />
          <DashCard to="/events" icon={Calendar} title="Upcoming events" body="RSVP to lectures, study sessions, and class meetings." />
          <DashCard to="/vault" icon={BookOpen} title="Resource vault" body="Lecture notes, past questions, and study guides by course." />
        </div>

        {/* Motivation */}
        <div className="card-elevated relative overflow-hidden p-6 md:p-8">
          <Quote className="absolute right-6 top-6 h-10 w-10 text-gold/15" />
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Motivation of the week</p>
          <p className="font-display mt-3 text-xl md:text-2xl leading-snug">
            "Every patient you'll ever treat is somewhere out there, hoping you studied hard enough today."
          </p>
        </div>
      </motion.div>

      {showOnboarding && <OnboardingModal userId={user.id} defaultName={profile?.name ?? ""} />}
    </StudentShell>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof Flame; label: string; value: string; hint?: string }) {
  return (
    <div className="card-elevated card-hover p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DashCard({ to, icon: Icon, title, body }: { to: string; icon: typeof Zap; title: string; body: string }) {
  return (
    <Link to={to} className="card-elevated card-hover relative block p-6">
      <Icon className="h-5 w-5 text-gold" />
      <h3 className="font-display mt-3 text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}

