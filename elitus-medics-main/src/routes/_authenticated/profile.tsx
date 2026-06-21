import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, Star, Trophy, Stethoscope, Target, Heart, Lock, HeartPulse, Crown, Award } from "lucide-react";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { useProfile } from "@/hooks/use-profile";
import { listMyBadges, type UserBadge } from "@/lib/badges.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — ELITUS MEDICS U25" }] }),
  component: ProfilePage,
  errorComponent: ({ error }) => (
    <StudentShell><div className="p-8 text-destructive">{String(error.message)}</div></StudentShell>
  ),
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const fn = useServerFn(listMyBadges);
  const { data: badges } = useSuspenseQuery(
    queryOptions({ queryKey: ["badges", "me"], queryFn: () => fn() }),
  );

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8"
      >
        {/* Header card */}
        <div className="card-elevated relative overflow-hidden p-6 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.10),transparent_60%)]" />
          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/15 text-2xl font-semibold uppercase text-gold-soft border-2 border-[color-mix(in_oklch,var(--gold)_35%,transparent)] pulse-ring">
              {(profile?.name ?? profile?.email ?? "?").slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Student profile</p>
              <h1 className="font-display text-3xl md:text-4xl truncate">{profile?.name ?? "Student"}</h1>
              <p className="mt-1 text-sm text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Star} label="Points" value={`${profile?.points_total ?? 0}`} />
            <Stat icon={Flame} label="Streak" value={`${profile?.streak_count ?? 0}d`} />
            <Stat icon={Trophy} label="Badges" value={`${unlockedCount}/${badges.length}`} />
            <Stat icon={Stethoscope} label="Specialty" value={profile?.specialty_interest ?? "—"} small />
          </div>
        </div>

        <ECGLine height={20} />

        {/* Goals + interests */}
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard icon={Target} title="Career goal" body={profile?.career_goal ?? "Set a goal in your settings."} />
          <InfoCard
            icon={Heart}
            title="Focus subjects"
            body={
              profile?.weak_subjects && profile.weak_subjects.length > 0
                ? profile.weak_subjects.join(" · ")
                : "No focus areas selected yet."
            }
          />
        </div>

        {/* Badges */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Badges</h2>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{unlockedCount} of {badges.length} unlocked</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((b) => <BadgeCard key={b.id} badge={b} />)}
          </div>
        </section>
      </motion.div>
    </StudentShell>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: typeof Star; label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className={`mt-1.5 font-display ${small ? "text-base truncate" : "text-2xl"}`}>{value}</p>
    </div>
  );
}

function InfoCard({ icon: Icon, title, body }: { icon: typeof Target; title: string; body: string }) {
  return (
    <div className="card-elevated p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <h3 className="font-display text-base">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

const ICONS: Record<string, typeof Award> = {
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  crown: Crown,
  flame: Flame,
  trophy: Trophy,
  award: Award,
};

function BadgeCard({ badge }: { badge: UserBadge }) {
  const Icon = ICONS[badge.icon] ?? Award;
  const tierColor =
    badge.tier === "gold" ? "text-gold border-[color-mix(in_oklch,var(--gold)_40%,transparent)]" :
    badge.tier === "silver" ? "text-zinc-300 border-zinc-700" :
    "text-amber-700/90 border-amber-900/40";

  return (
    <div className={`card-elevated relative flex flex-col items-center gap-2 p-5 text-center transition ${badge.unlocked ? "card-hover" : "opacity-50"}`}>
      {!badge.unlocked && <Lock className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground" />}
      <div className={`flex h-14 w-14 items-center justify-center rounded-full border-2 bg-background ${tierColor} ${badge.unlocked ? "gold-shine" : "grayscale"}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display text-sm">{badge.name}</p>
      <p className="text-[11px] text-muted-foreground leading-snug">{badge.description}</p>
      {badge.unlocked && badge.awarded_at && (
        <p className="text-[10px] uppercase tracking-wider text-gold/70">
          {new Date(badge.awarded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      )}
    </div>
  );
}
