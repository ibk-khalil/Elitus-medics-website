import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { awardFirstPulse } from "@/lib/badges.functions";
import { ECGLine, ECGProgress } from "@/components/ecg-line";

const SPECIALTIES = [
  "General Medicine", "Surgery", "Paediatrics", "Obstetrics & Gynaecology",
  "Cardiology", "Neurology", "Other",
];

const SUBJECTS = [
  "Anatomy", "Physiology", "Biochemistry", "Pathology", "Pharmacology", "Microbiology",
];

export function OnboardingModal({ userId, defaultName }: { userId: string; defaultName: string }) {
  const queryClient = useQueryClient();
  const awardFn = useServerFn(awardFirstPulse);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [specialty, setSpecialty] = useState("");
  const [goal, setGoal] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (s: string) =>
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim() || null,
        specialty_interest: specialty || null,
        career_goal: goal.trim() || null,
        weak_subjects: subjects,
        onboarding_completed: true,
      })
      .eq("id", userId);
    if (error) { setSaving(false); return toast.error(error.message); }
    try { await awardFn(); } catch { /* non-fatal */ }
    setSaving(false);
    toast.success("🩺 First Pulse — Welcome to the ward");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    queryClient.invalidateQueries({ queryKey: ["badges"] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass relative w-full max-w-lg overflow-hidden rounded-2xl"
      >
        <div className="px-7 pt-7">
          <ECGProgress value={((step + 1) / 4) * 100} />
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Step {step + 1} of 4
          </p>
        </div>

        <div className="px-7 pb-7 pt-4 min-h-[360px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              {step === 0 && (
                <div className="text-center">
                  <h2 className="font-display text-3xl">Welcome to <span className="text-gold">ELITUS MEDICS U25</span></h2>
                  <p className="mt-3 text-muted-foreground">Your academic ecosystem starts here.</p>
                  <div className="my-8"><ECGLine height={48} /></div>
                  <button onClick={next} className="inline-flex w-full items-center justify-center rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110">
                    Get started
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-display text-2xl">Profile setup</h2>
                  <Field label="Display name">
                    <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="How should we call you?" />
                  </Field>
                  <Field label="Specialty interest">
                    <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="input">
                      <option value="">Select a specialty…</option>
                      {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label={`Career goal (${60 - goal.length} chars left)`}>
                    <input value={goal} onChange={(e) => setGoal(e.target.value.slice(0, 60))} className="input" placeholder="e.g. Become a Neurosurgeon" maxLength={60} />
                  </Field>
                  <Nav onBack={back} onNext={next} canNext={!!name.trim()} />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-display text-2xl">Weak subjects</h2>
                  <p className="text-sm text-muted-foreground">We'll highlight relevant resources for you.</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {SUBJECTS.map((s) => {
                      const on = subjects.includes(s);
                      return (
                        <button
                          key={s} type="button" onClick={() => toggle(s)}
                          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                            on
                              ? "border-[color-mix(in_oklch,var(--gold)_60%,transparent)] bg-gold/15 text-gold-soft"
                              : "border-border bg-surface text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {on && <Check className="mr-1 inline h-3.5 w-3.5" />}
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-4"><Nav onBack={back} onNext={next} /></div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/10 border-2 border-[color-mix(in_oklch,var(--gold)_40%,transparent)] pulse-ring"
                  >
                    <Stethoscope className="h-10 w-10 text-gold" />
                  </motion.div>
                  <h2 className="font-display mt-5 text-2xl">You're ready</h2>
                  <p className="mt-2 text-sm text-muted-foreground">First badge unlocked.</p>

                  <div className="card-elevated mt-6 p-5 text-left">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">🩺</div>
                      <div>
                        <p className="text-sm font-semibold">First Pulse</p>
                        <p className="text-xs text-muted-foreground">Welcome to the ward</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <Summary label="Name" value={name || "—"} />
                      <Summary label="Specialty" value={specialty || "—"} />
                      <Summary label="Goal" value={goal || "—"} />
                      <Summary label="Focus" value={subjects.length ? `${subjects.length} subjects` : "—"} />
                    </div>
                  </div>

                  <button
                    onClick={finish} disabled={saving}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enter Dashboard
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <style>{`
          .input {
            width: 100%;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--input);
            border-radius: 8px;
            padding: 10px 12px;
            font-size: 14px;
            color: var(--foreground);
          }
          .input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 3px var(--ring); }
          .input::placeholder { color: var(--muted-foreground); }
        `}</style>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium">{label}</div>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-sm">{value}</p>
    </div>
  );
}

function Nav({ onBack, onNext, canNext = true }: { onBack: () => void; onNext: () => void; canNext?: boolean }) {
  return (
    <div className="flex justify-between pt-2">
      <button onClick={onBack} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Back</button>
      <button onClick={onNext} disabled={!canNext} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-[var(--gold-foreground)] hover:brightness-110 disabled:opacity-50">
        Continue
      </button>
    </div>
  );
}
