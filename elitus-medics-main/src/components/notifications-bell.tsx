import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, BookOpen, Calendar, Megaphone, Zap, Info } from "lucide-react";
import { listNotifications, markRead, type Notification } from "@/lib/notifications.functions";

const ICONS: Record<string, typeof Bell> = {
  info: Info, quiz: Zap, event: Calendar, vault: BookOpen, announcement: Megaphone,
};

export function NotificationsBell() {
  const list = useServerFn(listNotifications);
  const mark = useServerFn(markRead);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    refetchInterval: 60_000,
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const unread = (data ?? []).filter((n) => !n.read).length;

  const markAll = useMutation({
    mutationFn: () => mark({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-[var(--gold-foreground)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-display text-sm">Notifications</p>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-[11px] text-gold hover:underline">Mark all read</button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {!data || data.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">No notifications yet.</p>
              ) : (
                data.map((n) => <Row key={n.id} n={n} onClose={() => setOpen(false)} />)
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ n, onClose }: { n: Notification; onClose: () => void }) {
  const mark = useServerFn(markRead);
  const qc = useQueryClient();
  const Icon = ICONS[n.type] ?? Info;

  const click = async () => {
    if (!n.read) {
      await mark({ data: { id: n.id } });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    onClose();
  };

  const inner = (
    <div className={`flex gap-3 border-b border-border/40 px-4 py-3 text-sm transition hover:bg-secondary/40 ${n.read ? "" : "bg-gold/5"}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-tight">{n.title}</p>
        {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>
      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />}
      {n.read && <Check className="mt-1 h-3 w-3 text-muted-foreground" />}
    </div>
  );

  return n.link ? <Link to={n.link} onClick={click}>{inner}</Link> : <button onClick={click} className="block w-full text-left">{inner}</button>;
}
