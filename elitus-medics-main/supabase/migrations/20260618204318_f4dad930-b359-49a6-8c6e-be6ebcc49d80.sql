
DROP POLICY IF EXISTS "Authenticated view choices of visible quizzes" ON public.quiz_choices;
CREATE POLICY "Admins view choices" ON public.quiz_choices
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
