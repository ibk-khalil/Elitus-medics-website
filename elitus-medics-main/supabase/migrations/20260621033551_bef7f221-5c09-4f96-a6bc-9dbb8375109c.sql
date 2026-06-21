CREATE OR REPLACE FUNCTION public.compute_quiz_answer_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_correct boolean := false;
  v_points integer := 0;
  v_question_points integer := 0;
BEGIN
  SELECT COALESCE(is_correct, false) INTO v_is_correct
  FROM public.quiz_choices
  WHERE id = NEW.selected_choice_id AND question_id = NEW.question_id;

  IF v_is_correct THEN
    SELECT COALESCE(points, 1) INTO v_question_points
    FROM public.quiz_questions WHERE id = NEW.question_id;
    v_points := COALESCE(v_question_points, 1);
  END IF;

  NEW.is_correct := COALESCE(v_is_correct, false);
  NEW.points_awarded := v_points;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_quiz_answer_score ON public.quiz_answers;
CREATE TRIGGER trg_compute_quiz_answer_score
BEFORE INSERT OR UPDATE OF selected_choice_id ON public.quiz_answers
FOR EACH ROW EXECUTE FUNCTION public.compute_quiz_answer_score();