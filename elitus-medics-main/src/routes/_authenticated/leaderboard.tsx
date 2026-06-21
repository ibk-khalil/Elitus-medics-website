import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Flame, ArrowUp } from "lucide-react";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { getLeaderboard, type LeaderboardRow } from "@/lib/leaderboard.functions";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — ELITUS MEDICS U25" }] }),
  component: LeaderboardPage,
  errorComponent: ({ error }) => (
    <StudentShell><div className="p-8 text-destructive">{String(error.message)}</div></StudentShell>
  ),
});

function LeaderboardPage() {
  const fn = useServerFn(getLeaderboard);
  const { data } = useSuspenseQuery(
    queryOptions({ queryKey: ["leaderboard"], queryFn: () => fn() }),
  );

  const top3 = data.rows.slice(0, 3);
  const rest = data.rows.slice(3);
  const meInTop = data.me && data.me.rank <= 100;

  return (
    <StudentShell>
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:px-8"
      >
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cohort standings</p>
          <h1 className="font-display text-3xl md:text-4xl">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Points climb with every quiz. Streaks break ties.</p>
        </header>
        <ECGLine height={20} />

        {/* Podium */}
        {top3.length > 0 && (
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[1, 0, 2].map((idx, pos) => {
              const r = top3[idx];
              if (!r) return <div key={pos} />;
              const heights = ["h-28", "h-36", "h-24"];
              const icons = [<Medal key="s" className="h-5 w-5" />, <Crown key="g" className="h-5 w-5" />, <Medal key="b" className="h-5 w-5" />];
              const tints = ["text-zinc-300", "text-gold", "text-amber-700"];
              return (
                <div key={r.user_id} className="flex flex-col items-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${r.is_me ? "border-gold gold-glow" : "border-border"} bg-surface text-sm font-semibold uppercase text-gold-soft`}>
                    {(r.name ?? "??").slice(0, 2)}
                  </div>
                  <p className="mt-2 max-w-full truncate text-sm">{r.name ?? "Unnamed"}</p>
                  <p className="text-[11px] text-muted-foreground">{r.points_total} pts</p>
                  <div className={`mt-2 flex w-full ${heights[pos]} items-start justify-center rounded-t-lg border border-b-0 border-border bg-surface pt-2 ${tints[pos]}`}>
                    {icons[pos]}
                    <span className="ml-1 font-display text-sm">{r.rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List */}
        <div className="card-elevated overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_80px_80px] gap-2 border-b border-border px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>#</span><span>Student</span><span className="text-right">Streak</span><span className="text-right">Points</span>
          </div>
          {rest.length === 0 && top3.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No standings yet. Take the first quiz to claim rank #1.</p>
          ) : (
            rest.map((r) => <Row key={r.user_id} r={r} />)
          )}
        </div>

        {/* Floating "you" card when outside top 100 */}
        {data.me && !meInTop && (
          <div className="card-elevated gold-glow flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <ArrowUp className="h-4 w-4 text-gold" />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Your rank</p>
                <p className="font-display text-lg">#{data.me.rank} · {data.me.name ?? "You"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-xl text-gold">{data.me.points_total}</p>
              <p className="text-[11px] text-muted-foreground">{data.me.streak_count}d streak</p>
            </div>
          </div>
        )}

        {data.rows.length === 0 && (
          <div className="card-elevated flex flex-col items-center gap-2 p-8 text-center">
            <Trophy className="h-8 w-8 text-gold" />
            <p className="font-display text-lg">The board is empty</p>
            <p className="text-sm text-muted-foreground">Submit the weekly quiz to break the silence.</p>
          </div>
        )}
      </motion.div>
    </StudentShell>
  );
}

function Row({ r }: { r: LeaderboardRow }) {
  return (
    <div className={`grid grid-cols-[48px_1fr_80px_80px] items-center gap-2 border-b border-border/50 px-4 py-3 text-sm ${r.is_me ? "bg-gold/5" : ""}`}>
      <span className={`font-display ${r.rank <= 10 ? "text-gold" : "text-muted-foreground"}`}>{r.rank}</span>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/10 text-[10px] font-semibold uppercase text-gold-soft border border-[color-mix(in_oklch,var(--gold)_25%,transparent)]">
          {(r.name ?? "??").slice(0, 2)}
        </div>
        <span className="truncate">{r.name ?? "Unnamed"} {r.is_me && <span className="ml-1 text-[10px] uppercase tracking-wider text-gold">You</span>}</span>
      </div>
      <span className="flex items-center justify-end gap-1 text-muted-foreground">
        <Flame className="h-3.5 w-3.5 text-gold/70" />{r.streak_count}
      </span>
      <span className="text-right font-display text-base">{r.points_total}</span>
    </div>
  );
}
