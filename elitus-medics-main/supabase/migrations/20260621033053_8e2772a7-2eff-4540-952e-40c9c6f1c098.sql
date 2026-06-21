DROP POLICY IF EXISTS "Users view own answers" ON public.quiz_answers;

CREATE POLICY "Users view own answers after submit"
ON public.quiz_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = quiz_answers.attempt_id
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR (a.user_id = auth.uid() AND a.submitted_at IS NOT NULL)
      )
  )
);