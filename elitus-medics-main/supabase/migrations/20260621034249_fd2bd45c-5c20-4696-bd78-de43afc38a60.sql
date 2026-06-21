-- Recompute on any UPDATE, not only when selected_choice_id changes
DROP TRIGGER IF EXISTS trg_compute_quiz_answer_score ON public.quiz_answers;
CREATE TRIGGER trg_compute_quiz_answer_score
BEFORE INSERT OR UPDATE ON public.quiz_answers
FOR EACH ROW EXECUTE FUNCTION public.compute_quiz_answer_score();

-- Block updates after submission
DROP POLICY IF EXISTS "Users update own answers" ON public.quiz_answers;
CREATE POLICY "Users update own answers pre-submit"
ON public.quiz_answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = quiz_answers.attempt_id
      AND a.user_id = auth.uid()
      AND a.submitted_at IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = quiz_answers.attempt_id
      AND a.user_id = auth.uid()
      AND a.submitted_at IS NULL
  )
);

-- Block inserts on a submitted attempt
DROP POLICY IF EXISTS "Users insert own answers" ON public.quiz_answers;
CREATE POLICY "Users insert own answers pre-submit"
ON public.quiz_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = quiz_answers.attempt_id
      AND a.user_id = auth.uid()
      AND a.submitted_at IS NULL
  )
);