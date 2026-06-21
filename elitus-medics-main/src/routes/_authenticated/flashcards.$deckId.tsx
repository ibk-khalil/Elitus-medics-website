import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, RotateCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { getDeck, addCard, deleteCard, deleteDeck } from "@/lib/flashcards.functions";

export const Route = createFileRoute("/_authenticated/flashcards/$deckId")({
  component: DeckDetail,
  errorComponent: ({ error, reset }) => (
    <StudentShell><div className="p-6 text-sm text-destructive">Failed: {error.message} <button onClick={reset} className="underline">retry</button></div></StudentShell>
  ),
  notFoundComponent: () => <StudentShell><div className="p-6">Deck not found</div></StudentShell>,
});

function DeckDetail() {
  const { deckId } = Route.useParams();
  const router = useRouter();
  const get = useServerFn(getDeck);
  const add = useServerFn(addCard);
  const del = useServerFn(deleteCard);
  const delDeck = useServerFn(deleteDeck);
  const { data, isLoading } = useQuery({ queryKey: ["deck", deckId], queryFn: () => get({ data: { deckId } }) });
  const [mode, setMode] = useState<"study" | "manage">("study");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (isLoading || !data) return <StudentShell><div className="p-6 text-muted-foreground">Loading…</div></StudentShell>;

  const cards = data.cards;
  const card = cards[idx];

  return (
    <StudentShell>
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/flashcards" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All decks</Link>
            <h1 className="mt-1 font-display text-2xl truncate">{data.deck.title}</h1>
            {data.deck.subject && <div className="text-xs uppercase tracking-wider text-gold-soft mt-0.5">{data.deck.subject}</div>}
          </div>
          {data.deck.mine && (
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-md border border-border bg-surface text-xs">
                <button onClick={() => setMode("study")} className={`px-3 py-1.5 ${mode === "study" ? "bg-gold text-[var(--gold-foreground)]" : ""}`}>Study</button>
                <button onClick={() => setMode("manage")} className={`px-3 py-1.5 ${mode === "manage" ? "bg-gold text-[var(--gold-foreground)]" : ""}`}>Manage</button>
              </div>
            </div>
          )}
        </div>

        {mode === "study" && (
          <div className="mt-8">
            {cards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No cards yet. Switch to Manage to add some.</div>
            ) : (
              <>
                <div
                  onClick={() => setFlipped((f) => !f)}
                  className="min-h-[280px] cursor-pointer rounded-xl border border-border bg-surface p-8 flex items-center justify-center text-center shadow-lg"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{flipped ? "Back" : "Front"}</div>
                    <p className="text-xl font-medium whitespace-pre-wrap">{flipped ? card.back : card.front}</p>
                    <div className="mt-4 inline-flex items-center gap-1 text-[10px] text-muted-foreground"><RotateCw className="h-3 w-3" /> tap to flip</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }} disabled={idx === 0} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
                  <span className="text-sm text-muted-foreground">{idx + 1} / {cards.length}</span>
                  <button onClick={() => { setIdx((i) => Math.min(cards.length - 1, i + 1)); setFlipped(false); }} disabled={idx >= cards.length - 1} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
                </div>
              </>
            )}
          </div>
        )}

        {mode === "manage" && data.deck.mine && (
          <div className="mt-6 space-y-6">
            <form
              className="rounded-lg border border-border bg-surface p-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                try {
                  await add({ data: { deckId, front: String(fd.get("front")), back: String(fd.get("back")) } });
                  form.reset();
                  router.invalidate();
                } catch (err) { toast.error(String((err as Error).message)); }
              }}
            >
              <h3 className="text-sm font-medium">Add card</h3>
              <textarea name="front" required placeholder="Front (question/term)" rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <textarea name="back" required placeholder="Back (answer/definition)" rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)]"><Plus className="h-4 w-4" /> Add</button>
            </form>

            <ul className="space-y-2">
              {cards.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3">
                  <div className="min-w-0 text-sm">
                    <div className="font-medium truncate">{c.front}</div>
                    <div className="text-muted-foreground truncate">{c.back}</div>
                  </div>
                  <button
                    onClick={async () => { await del({ data: { cardId: c.id } }); router.invalidate(); }}
                    className="text-muted-foreground hover:text-destructive"
                  ><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>

            <button
              onClick={async () => {
                if (!confirm("Delete this whole deck?")) return;
                await delDeck({ data: { deckId } });
                router.navigate({ to: "/flashcards" });
              }}
              className="text-xs text-destructive hover:underline"
            >Delete deck</button>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
