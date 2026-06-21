import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { StudentShell } from "@/components/student-shell";
import { getGroup, postGroupMessage, joinGroup } from "@/lib/groups.functions";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  component: GroupDetail,
  errorComponent: ({ error, reset }) => (
    <StudentShell><div className="p-6 text-sm text-destructive">Failed: {error.message} <button onClick={reset} className="underline">retry</button></div></StudentShell>
  ),
  notFoundComponent: () => <StudentShell><div className="p-6">Group not found</div></StudentShell>,
});

function GroupDetail() {
  const { groupId } = Route.useParams();
  const router = useRouter();
  const get = useServerFn(getGroup);
  const post = useServerFn(postGroupMessage);
  const join = useServerFn(joinGroup);
  const { data, isLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => get({ data: { groupId } }),
    refetchInterval: 5000,
  });
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages.length]);

  if (isLoading || !data) return <StudentShell><div className="p-6 text-muted-foreground">Loading…</div></StudentShell>;

  return (
    <StudentShell>
      <div className="mx-auto flex max-w-5xl flex-col p-4 sm:p-6" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link to="/groups" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All groups</Link>
            <h1 className="mt-1 font-display text-2xl truncate">{data.group.name}</h1>
            {data.group.subject && <div className="text-xs uppercase tracking-wider text-gold-soft mt-0.5">{data.group.subject}</div>}
          </div>
          <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" />{data.members.length}</div>
        </div>

        {!data.is_member ? (
          <div className="mt-8 rounded-lg border border-dashed border-border bg-surface/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">Join this group to read and post messages.</p>
            <button
              onClick={async () => { await join({ data: { groupId } }); router.invalidate(); }}
              className="mt-4 rounded-md bg-gold px-4 py-2 text-sm font-medium text-[var(--gold-foreground)]"
            >Join group</button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex-1 overflow-y-auto rounded-lg border border-border bg-surface/40 p-4 space-y-3">
              {data.messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-12">No messages yet. Say hi.</p>
              ) : data.messages.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-semibold uppercase text-gold-soft">
                    {(m.profile?.name ?? "?").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{m.profile?.name ?? "Member"}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const v = body.trim();
                if (!v) return;
                setBody("");
                try { await post({ data: { groupId, body: v } }); router.invalidate(); }
                catch (err) { toast.error(String((err as Error).message)); }
              }}
              className="mt-3 flex gap-2"
            >
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-gold px-3 py-2 text-sm font-medium text-[var(--gold-foreground)]"><Send className="h-4 w-4" /></button>
            </form>
          </>
        )}
      </div>
    </StudentShell>
  );
}
