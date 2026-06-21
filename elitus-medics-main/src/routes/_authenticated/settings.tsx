import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Save, Loader2, Check, LogOut, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { StudentShell } from "@/components/student-shell";
import { ECGLine } from "@/components/ecg-line";
import { useProfile } from "@/hooks/use-profile";
import { updateMyProfile } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — ELITUS MEDICS U25" }] }),
  component: SettingsPage,
});

const SPECIALTIES = ["General Medicine", "Surgery", "Paediatrics", "Obstetrics & Gynaecology", "Cardiology", "Neurology", "Other"];
const SUBJECTS = ["Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology"];

function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const updateFn = useServerFn(updateMyProfile);

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [goal, setGoal] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setSpecialty(profile.specialty_interest ?? "");
      setGoal(profile.career_goal ?? "");
      setSubjects(profile.weak_subjects ?? []);
    }
  }, [profile]);

  const m = useMutation({
    mutationFn: () => updateFn({
      data: { name: name || null, specialty_interest: specialty || null, career_goal: goal || null, weak_subjects: subjects },
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  };

  const toggle = (s: string) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  if (isLoading) return <StudentShell><div className="p-8 text-muted-foreground">Loading…</div></StudentShell>;

  return (
    <StudentShell>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-8">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account</p>
          <h1 className="font-display text-3xl md:text-4xl">Settings</h1>
        </header>
        <ECGLine height={20} />

        {/* Account info */}
        <section className="card-elevated p-6">
          <h2 className="font-display text-lg">Account</h2>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 text-gold" /> {profile?.email}
          </div>
        </section>

        {/* Profile */}
        <section className="card-elevated p-6">
          <h2 className="font-display text-lg">Profile</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Display name">
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Specialty interest">
              <select className="input-field" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">Select…</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Career goal" full>
              <input className="input-field" value={goal} onChange={(e) => setGoal(e.target.value.slice(0, 160))} placeholder="e.g. Become a Neurosurgeon" />
            </Field>
            <Field label="Focus subjects" full>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => {
                  const on = subjects.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggle(s)} className={`rounded-full border px-3 py-1.5 text-xs transition ${on ? "border-[color-mix(in_oklch,var(--gold)_50%,transparent)] bg-gold/15 text-gold" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}>
                      {on && <Check className="mr-1 inline h-3 w-3" />}{s}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <button onClick={() => m.mutate()} disabled={m.isPending} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-50">
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </section>

        {/* Danger zone */}
        <section className="card-elevated p-6">
          <h2 className="font-display text-lg">Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign out of this device.</p>
          <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </section>
      </motion.div>
    </StudentShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <div className="mb-1.5 text-xs font-medium">{label}</div>
      {children}
    </label>
  );
}
