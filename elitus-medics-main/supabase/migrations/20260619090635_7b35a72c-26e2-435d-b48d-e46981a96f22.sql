-- Badges catalog (public read) and user_badges (per-user unlocks)
CREATE TABLE public.badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are readable by everyone" ON public.badges FOR SELECT USING (true);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all badges" ON public.user_badges FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed catalog
INSERT INTO public.badges (id, name, description, icon, tier) VALUES
  ('first_pulse', 'First Pulse', 'Completed onboarding and joined the cohort.', 'heart-pulse', 'bronze'),
  ('first_quiz', 'First Diagnosis', 'Submitted your first weekly quiz.', 'stethoscope', 'bronze'),
  ('perfect_score', 'Perfect Pulse', 'Scored 100% on a weekly quiz.', 'crown', 'gold'),
  ('streak_3', '3-Day Streak', 'Studied 3 days in a row.', 'flame', 'bronze'),
  ('streak_7', '7-Day Streak', 'A full week of consistency.', 'flame', 'silver'),
  ('streak_30', '30-Day Streak', 'A month of unbroken discipline.', 'flame', 'gold'),
  ('top_10', 'Top 10', 'Ranked top 10 on the leaderboard.', 'trophy', 'silver'),
  ('top_3', 'Podium', 'Stood on the leaderboard podium.', 'trophy', 'gold')
ON CONFLICT (id) DO NOTHING;

-- Allow students to read minimal public leaderboard fields from profiles
-- (assumes existing select policy on profiles only allows self; add a public-projection-safe policy)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Authenticated users can read leaderboard') THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read leaderboard" ON public.profiles FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;