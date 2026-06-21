import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Layers, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { listDecks, createDeck } from "@/lib/flashcards.functions";

export const Route = createFileRoute("/_authenticated/flashcards/")({
  component: FlashcardsIndex,
  errorComponent: ({ error, reset }) => (
    <StudentShell><div className="p-6 text-sm text-destructive">Failed: {error.message} <button onClick={reset} className="underline">retry</button></div></StudentShell>
  ),
  notFoundComponent: () => <StudentShell><div className="p-6">Not found</div></StudentShell>,
});

function FlashcardsIndex() {
  const router = useRouter();
  const list = useServerFn(listDecks);
  const create = useServerFn(createDeck);
  const { data: decks = [], isLoading } = useQuery({ queryKey: ["decks"], queryFn: () => list() });
  const [open, setOpen] = useState(false);

  const mine = decks.filter((d) => d.mine);
  const others = decks.filter((d) => !d.mine && d.is_public);

  return (
    <StudentShell>
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Flashcards</h1>
            <p className="text-sm text-muted-foreground mt-1">Build decks. Drill them. Share with the cohort.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)]">
            <Plus className="h-4 w-4" /> New deck
          </button>
        </div>

        {isLoading ? <div className="mt-8 text-sm text-muted-foreground">Loading…</div> : (
          <>
            <Section title="Your decks" decks={mine} empty="No personal decks yet." />
            <Section title="Public from cohort" decks={others} empty="No public decks shared yet." />
          </>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg">Create deck</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  const deck = await create({ data: {
                    title: String(fd.get("title")),
                    subject: (fd.get("subject") as string) || undefined,
                    is_public: fd.get("is_public") === "on",
                  }});
                  setOpen(false); router.invalidate();
                  router.navigate({ to: "/flashcards/$deckId", params: { deckId: deck.id } });
                } catch (err) { toast.error(String((err as Error).message)); }
              }}
            >
              <input name="title" required placeholder="Deck title" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input name="subject" placeholder="Subject (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_public" /> Make public to cohort</label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
                <button type="submit" className="rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)]">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudentShell>
  );
}

function Section({ title, decks, empty }: { title: string; decks: Array<{ id: string; title: string; subject: string | null; is_public: boolean; card_count: number }>; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground">{title}</h2>
      {decks.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <li key={d.id}>
              <Link to="/flashcards/$deckId" params={{ deckId: d.id }} className="block rounded-lg border border-border bg-surface p-4 hover:border-gold/40">
                <div className="flex items-center justify-between">
                  <Layers className="h-5 w-5 text-gold" />
                  {d.is_public ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="mt-3 font-medium truncate">{d.title}</div>
                {d.subject && <div className="text-[10px] uppercase tracking-wider text-gold-soft mt-0.5">{d.subject}</div>}
                <div className="mt-2 text-xs text-muted-foreground">{d.card_count} cards</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
