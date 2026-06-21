import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Users, BookOpen, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { listGroups, createGroup, joinGroup, leaveGroup } from "@/lib/groups.functions";

export const Route = createFileRoute("/_authenticated/groups/")({
  component: GroupsIndex,
  errorComponent: ({ error, reset }) => (
    <StudentShell><div className="p-6 text-sm text-destructive">Failed: {error.message} <button onClick={reset} className="underline">retry</button></div></StudentShell>
  ),
  notFoundComponent: () => <StudentShell><div className="p-6">Not found</div></StudentShell>,
});

function GroupsIndex() {
  const router = useRouter();
  const list = useServerFn(listGroups);
  const create = useServerFn(createGroup);
  const join = useServerFn(joinGroup);
  const leave = useServerFn(leaveGroup);
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => list() });
  const [open, setOpen] = useState(false);

  return (
    <StudentShell>
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Study Groups</h1>
            <p className="text-sm text-muted-foreground mt-1">Form your circle. Quiz together, climb together.</p>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)] hover:brightness-110">
            <Plus className="h-4 w-4" /> New group
          </button>
        </div>

        {isLoading ? (
          <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-border bg-surface/40 p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No groups yet. Start the first circle.</p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to="/groups/$groupId" params={{ groupId: g.id }} className="font-display text-lg hover:text-gold truncate block">{g.name}</Link>
                    {g.subject && <div className="text-xs uppercase tracking-wider text-gold-soft mt-1">{g.subject}</div>}
                    {g.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{g.description}</p>}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{g.member_count}</span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        if (g.is_member) await leave({ data: { groupId: g.id } });
                        else await join({ data: { groupId: g.id } });
                        router.invalidate();
                      } catch (e) { toast.error(String((e as Error).message)); }
                    }}
                    className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${g.is_member ? "border border-border bg-secondary" : "bg-gold text-[var(--gold-foreground)]"}`}
                  >
                    {g.is_member ? "Leave" : "Join"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg">Create study group</h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await create({ data: {
                    name: String(fd.get("name")),
                    subject: (fd.get("subject") as string) || undefined,
                    description: (fd.get("description") as string) || undefined,
                  }});
                  setOpen(false); router.invalidate();
                } catch (err) { toast.error(String((err as Error).message)); }
              }}
            >
              <input name="name" required placeholder="Group name" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input name="subject" placeholder="Subject (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <textarea name="description" rows={3} placeholder="What's this group about?" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
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
