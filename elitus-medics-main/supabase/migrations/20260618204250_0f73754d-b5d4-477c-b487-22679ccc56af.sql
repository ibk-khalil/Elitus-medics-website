
-- ENUMS
CREATE TYPE public.quiz_status AS ENUM ('draft','scheduled','live','closed');
CREATE TYPE public.attempt_status AS ENUM ('in_progress','submitted','abandoned');

-- QUIZZES
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text,
  status public.quiz_status NOT NULL DEFAULT 'draft',
  time_limit_seconds integer NOT NULL DEFAULT 600,
  points_per_question integer NOT NULL DEFAULT 10,
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view non-draft quizzes" ON public.quizzes
  FOR SELECT TO authenticated USING (status <> 'draft' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage quizzes" ON public.quizzes
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_quizzes_updated BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- QUESTIONS
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  explanation text,
  order_index integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view questions of visible quizzes" ON public.quiz_questions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id
      AND (q.status <> 'draft' OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Admins manage questions" ON public.quiz_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);

-- CHOICES
CREATE TABLE public.quiz_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_choices TO authenticated;
GRANT ALL ON public.quiz_choices TO service_role;
ALTER TABLE public.quiz_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view choices of visible quizzes" ON public.quiz_choices
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quiz_questions qq
      JOIN public.quizzes q ON q.id = qq.quiz_id
      WHERE qq.id = question_id
        AND (q.status <> 'draft' OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Admins manage choices" ON public.quiz_choices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_quiz_choices_question ON public.quiz_choices(question_id, order_index);

-- ATTEMPTS
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attempts" ON public.quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own attempts" ON public.quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own attempts" ON public.quiz_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage attempts" ON public.quiz_attempts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);

-- ANSWERS
CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_choice_id uuid REFERENCES public.quiz_choices(id) ON DELETE SET NULL,
  is_correct boolean NOT NULL DEFAULT false,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_answers TO authenticated;
GRANT ALL ON public.quiz_answers TO service_role;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own answers" ON public.quiz_answers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id
      AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );
CREATE POLICY "Users insert own answers" ON public.quiz_answers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Users update own answers" ON public.quiz_answers
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Admins manage answers" ON public.quiz_answers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_quiz_answers_attempt ON public.quiz_answers(attempt_id);
