import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Home, Zap, Trophy, BookOpen, Calendar, Megaphone, User, Settings, LogOut,
  Menu, X, Shield, Users, Layers, GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRole } from "@/hooks/use-profile";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationsBell } from "@/components/notifications-bell";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/quiz", label: "Quiz", icon: Zap },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/vault", label: "Vault", icon: BookOpen },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/announcements", label: "News", icon: Megaphone },
  { to: "/yearbook", label: "Yearbook", icon: GraduationCap },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const MOBILE_NAV = NAV.slice(0, 5);

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const { data: role } = useRole();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <Link to="/dashboard" className="flex h-16 items-center gap-2.5 px-5 border-b border-border">
          <Logo size="md" wordmarkClassName="text-sm" />
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item, i) => (
            <NavItem key={i} {...item} active={isActive(pathname, item.to)} />
          ))}
          {role === "admin" && (
            <>
              <NavItem to="/admin" label="Admin · Overview" icon={Shield} active={pathname === "/admin"} />
              <NavItem to="/admin/quizzes" label="Admin · Quizzes" icon={Zap} active={pathname.startsWith("/admin/quizzes")} />
            </>
          )}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <NavItem to="/settings" label="Settings" icon={Settings} active={pathname.startsWith("/settings")} />
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-destructive">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <button onClick={() => setDrawer(true)} className="shrink-0 rounded-md p-2 hover:bg-secondary" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <Logo size="sm" wordmark={<>ELITUS <span className="text-gold">U25</span></>} />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />
            <NotificationsBell />
            <Link to="/profile" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold uppercase text-gold-soft border border-[color-mix(in_oklch,var(--gold)_25%,transparent)] hover:brightness-110">
              {(profile?.name ?? profile?.email ?? "?").slice(0, 2)}
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item, i) => {
            const active = isActive(pathname, item.to);
            return (
              <Link
                key={i}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] transition ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setDrawer(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
            >
              <div className="flex items-center justify-between">
                <Logo size="sm" wordmark={<>ELITUS <span className="text-gold">U25</span></>} />
                <button onClick={() => setDrawer(false)} className="rounded-md p-2 hover:bg-secondary" aria-label="Close menu"><X className="h-4 w-4" /></button>
              </div>
              <nav className="mt-6 flex-1 space-y-1 overflow-y-auto" onClick={() => setDrawer(false)}>
                {NAV.map((item, i) => <NavItem key={i} {...item} active={isActive(pathname, item.to)} />)}
                {role === "admin" && (
                  <>
                    <NavItem to="/admin" label="Admin · Overview" icon={Shield} active={pathname === "/admin"} />
                    <NavItem to="/admin/quizzes" label="Admin · Quizzes" icon={Zap} active={pathname.startsWith("/admin/quizzes")} />
                  </>
                )}
                <NavItem to="/settings" label="Settings" icon={Settings} active={pathname.startsWith("/settings")} />
              </nav>
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-destructive hover:bg-secondary">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(to);
}

function NavItem({ to, label, icon: Icon, soon, active }: { to: string; label: string; icon: typeof Home; soon?: boolean; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
        active ? "bg-accent text-gold-soft" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {soon && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">Soon</span>}
    </Link>
  );
}
