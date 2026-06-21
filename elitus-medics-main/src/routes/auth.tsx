import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { validateInviteCode } from "@/lib/invite.functions";
import { ECGLine } from "@/components/ecg-line";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).default("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ELITUS MEDICS U25" },
      { name: "description", content: "Sign in or join the ELITUS MEDICS U25 platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <ThemeToggle className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6" />

      {/* Left: brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-surface p-12 lg:flex">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <div>
          <Logo size="lg" showWordmark={false} className="mb-6" />
          <h1 className="font-display text-4xl leading-tight">
            Welcome to <span className="text-gold">ELITUS MEDICS U25</span>
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Your academic ecosystem. Sign in to compete in this week's quiz, climb the leaderboard,
            and access the vault.
          </p>
          <div className="mt-10 max-w-md">
            <ECGLine height={28} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Registration is invite-only. Ask your class rep for the code.
        </p>
      </aside>

      {/* Right: form */}
      <main className="flex flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <Logo size="lg" showWordmark={false} />
            <h1 className="font-display mt-4 text-2xl">ELITUS MEDICS U25</h1>
          </div>

          <div className="mb-6 flex rounded-lg border border-border bg-surface p-1">
            <TabButton active={mode === "login"} to={{ search: { mode: "login" as const } }}>Sign in</TabButton>
            <TabButton active={mode === "register"} to={{ search: { mode: "register" as const } }}>Join</TabButton>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {mode === "login" ? (
                <LoginForm busy={busy} setBusy={setBusy} onSuccess={() => navigate({ to: "/dashboard", replace: true })} />
              ) : (
                <RegisterForm busy={busy} setBusy={setBusy} onSuccess={() => navigate({ to: "/dashboard", replace: true })} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, to, children }: { active: boolean; to: { search: { mode: "login" | "register" } }; children: React.ReactNode }) {
  return (
    <Link
      to="/auth"
      search={to.search}
      className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition ${
        active ? "bg-gold text-[var(--gold-foreground)]" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function LoginForm({ busy, setBusy, onSuccess }: { busy: boolean; setBusy: (b: boolean) => void; onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    onSuccess();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email">
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="input" placeholder="you@university.edu" autoComplete="email"
        />
      </Field>
      <Field label="Password">
        <input
          type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          className="input" placeholder="••••••••" autoComplete="current-password"
        />
      </Field>
      <SubmitBtn busy={busy}>Sign in</SubmitBtn>
    </form>
  );
}

function RegisterForm({ busy, setBusy, onSuccess }: { busy: boolean; setBusy: (b: boolean) => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      const { ok, reason } = await validateInviteCode({ data: { code } });
      if (!ok) {
        setBusy(false);
        return toast.error(reason ?? "Invalid invite code");
      }
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      toast.success("Account created");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Full name">
        <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Ibrahim Abdallah" autoComplete="name" />
      </Field>
      <Field label="Email">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@university.edu" autoComplete="email" />
      </Field>
      <Field label="Password">
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="At least 8 characters" autoComplete="new-password" />
      </Field>
      <Field label="Invite code" hint="Ask your class rep">
        <input value={code} onChange={(e) => setCode(e.target.value)} required className="input" placeholder="••••••" autoComplete="off" />
      </Field>
      <SubmitBtn busy={busy}>Create account</SubmitBtn>
      <p className="text-center text-xs text-muted-foreground">
        By joining you agree this platform is for our class only.
      </p>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      <style>{`
        .input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--input);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 14px;
          color: var(--foreground);
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px var(--ring);
        }
        .input::placeholder { color: var(--muted-foreground); }
      `}</style>
    </label>
  );
}

function SubmitBtn({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit" disabled={busy}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] transition hover:brightness-110 disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
