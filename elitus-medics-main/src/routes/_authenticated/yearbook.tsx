import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Quote, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { listYearbook, getMyYearbook, upsertMyYearbook } from "@/lib/yearbook.functions";

export const Route = createFileRoute("/_authenticated/yearbook")({
  component: Yearbook,
  errorComponent: ({ error, reset }) => (
    <StudentShell><div className="p-6 text-sm text-destructive">Failed: {error.message} <button onClick={reset} className="underline">retry</button></div></StudentShell>
  ),
  notFoundComponent: () => <StudentShell><div className="p-6">Not found</div></StudentShell>,
});

function Yearbook() {
  const router = useRouter();
  const list = useServerFn(listYearbook);
  const getMine = useServerFn(getMyYearbook);
  const upsert = useServerFn(upsertMyYearbook);
  const { data: entries = [] } = useQuery({ queryKey: ["yearbook"], queryFn: () => list() });
  const { data: mine } = useQuery({ queryKey: ["yearbook", "mine"], queryFn: () => getMine() });
  const [edit, setEdit] = useState(false);

  return (
    <StudentShell>
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Yearbook</h1>
            <p className="text-sm text-muted-foreground mt-1">The class of U25. One quote each. Make it count.</p>
          </div>
          <button onClick={() => setEdit(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)]">
            <Pencil className="h-4 w-4" /> {mine ? "Edit entry" : "Create entry"}
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-border bg-surface/40 p-12 text-center">
            <Quote className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No entries yet. Be the first to write yours.</p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e) => (
              <li key={e.id} className="rounded-lg border border-border bg-surface p-5">
                <div className="flex items-center gap-3">
                  {e.photo_url ? (
                    <img src={e.photo_url} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold uppercase text-gold-soft">
                      {(e.profile?.name ?? "?").slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-display truncate">{e.profile?.name ?? "Student"}</div>
                    {e.superlative && (
                      <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gold-soft mt-0.5">
                        <Sparkles className="h-3 w-3" />{e.superlative}
                      </div>
                    )}
                  </div>
                </div>
                {e.quote && <blockquote className="mt-4 border-l-2 border-gold/40 pl-3 text-sm italic text-foreground/90">"{e.quote}"</blockquote>}
                {e.fun_fact && <p className="mt-3 text-xs text-muted-foreground"><span className="uppercase tracking-wider text-gold-soft">Fun fact · </span>{e.fun_fact}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => setEdit(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg">Your yearbook entry</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await upsert({ data: {
                    quote: (fd.get("quote") as string) || null,
                    superlative: (fd.get("superlative") as string) || null,
                    fun_fact: (fd.get("fun_fact") as string) || null,
                    photo_url: (fd.get("photo_url") as string) || null,
                    graduation_year: fd.get("graduation_year") ? Number(fd.get("graduation_year")) : null,
                  }});
                  setEdit(false); router.invalidate();
                } catch (err) { toast.error(String((err as Error).message)); }
              }}
            >
              <textarea name="quote" defaultValue={mine?.quote ?? ""} rows={2} placeholder="Your quote (max 300 chars)" maxLength={300} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input name="superlative" defaultValue={mine?.superlative ?? ""} placeholder="Superlative (e.g. Most likely to diagnose at a dinner party)" maxLength={120} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <textarea name="fun_fact" defaultValue={mine?.fun_fact ?? ""} rows={2} placeholder="Fun fact" maxLength={300} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input name="photo_url" defaultValue={mine?.photo_url ?? ""} type="url" placeholder="Photo URL (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input name="graduation_year" defaultValue={mine?.graduation_year ?? ""} type="number" placeholder="Grad year" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEdit(false)} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
                <button type="submit" className="rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StudentShell>
  );
}
