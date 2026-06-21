import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { awardBadge } from "@/lib/badges.functions";


export type QuizSummary = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  status: "scheduled" | "live" | "closed";
  time_limit_seconds: number;
  opens_at: string | null;
  closes_at: string | null;
  question_count: number;
  attempt?: { id: string; status: string; score: number; max_score: number } | null;
};

export type SanitizedChoice = { id: string; text: string; order_index: number };
export type SanitizedQuestion = {
  id: string;
  prompt: string;
  order_index: number;
  points: number;
  choices: SanitizedChoice[];
};

/* List quizzes visible to the user, with their own attempt summary. */
export const listQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: quizzes, error } = await supabase
      .from("quizzes")
      .select("id,title,description,subject,status,time_limit_seconds,opens_at,closes_at,quiz_questions(count)")
      .neq("status", "draft")
      .order("opens_at", { ascending: false, nullsFirst: false });
    if (error) throw error;

    const ids = (quizzes ?? []).map((q) => q.id);
    const attemptsByQuiz = new Map<string, { id: string; status: string; score: number; max_score: number }>();
    if (ids.length) {
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id,quiz_id,status,score,max_score")
        .in("quiz_id", ids)
        .eq("user_id", userId);
      for (const a of attempts ?? []) attemptsByQuiz.set(a.quiz_id, a);
    }

    return (quizzes ?? []).map<QuizSummary>((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      subject: q.subject,
      status: q.status as QuizSummary["status"],
      time_limit_seconds: q.time_limit_seconds,
      opens_at: q.opens_at,
      closes_at: q.closes_at,
      question_count: (q.quiz_questions as unknown as { count: number }[])?.[0]?.count ?? 0,
      attempt: attemptsByQuiz.get(q.id) ?? null,
    }));
  });

/* Fetch sanitized quiz + start/resume the user's attempt. Hides is_correct. */
export const startQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ quizId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: quiz, error: qErr } = await supabase
      .from("quizzes")
      .select("id,title,description,subject,status,time_limit_seconds,opens_at,closes_at")
      .eq("id", data.quizId)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!quiz) throw new Error("Quiz not found");
    if (quiz.status === "closed") throw new Error("This quiz is closed");
    if (quiz.status === "scheduled") throw new Error("This quiz hasn't opened yet");

    // Check existing attempt
    const { data: existing } = await supabase
      .from("quiz_attempts")
      .select("id,status,started_at,submitted_at,score,max_score,time_spent_seconds")
      .eq("quiz_id", data.quizId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.status === "submitted") {
      throw new Error("You have already submitted this quiz");
    }

    let attemptId = existing?.id;
    let startedAt = existing?.started_at;
    if (!attemptId) {
      const { data: created, error: aErr } = await supabase
        .from("quiz_attempts")
        .insert({ quiz_id: data.quizId, user_id: userId })
        .select("id,started_at")
        .single();
      if (aErr) throw aErr;
      attemptId = created.id;
      startedAt = created.started_at;
    }

    // Fetch questions via admin client to also get choices (without is_correct)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions, error: qsErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id,prompt,order_index,points,quiz_choices(id,text,order_index)")
      .eq("quiz_id", data.quizId)
      .order("order_index", { ascending: true });
    if (qsErr) throw qsErr;

    const sanitized: SanitizedQuestion[] = (questions ?? []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      order_index: q.order_index,
      points: q.points,
      choices: ((q.quiz_choices as unknown as SanitizedChoice[]) ?? [])
        .map((c) => ({ id: c.id, text: c.text, order_index: c.order_index }))
        .sort((a, b) => a.order_index - b.order_index),
    }));

    return {
      quiz,
      attempt: { id: attemptId!, started_at: startedAt! },
      questions: sanitized,
    };
  });

/* Submit quiz: scores server-side, updates points + streak. */
export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        attemptId: z.string().uuid(),
        timeSpentSeconds: z.number().int().min(0),
        answers: z
          .array(
            z.object({
              questionId: z.string().uuid(),
              choiceId: z.string().uuid().nullable(),
            }),
          )
          .min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: attempt, error: atErr } = await supabase
      .from("quiz_attempts")
      .select("id,quiz_id,user_id,status")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (atErr) throw atErr;
    if (!attempt || attempt.user_id !== userId) throw new Error("Attempt not found");
    if (attempt.status === "submitted") throw new Error("Already submitted");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: questions, error: qErr } = await supabaseAdmin
      .from("quiz_questions")
      .select("id,points,quiz_choices(id,is_correct)")
      .eq("quiz_id", attempt.quiz_id);
    if (qErr) throw qErr;

    const correctMap = new Map<string, { points: number; correctId: string | null }>();
    for (const q of questions ?? []) {
      const correct = (q.quiz_choices as unknown as { id: string; is_correct: boolean }[]).find((c) => c.is_correct);
      correctMap.set(q.id, { points: q.points, correctId: correct?.id ?? null });
    }

    let score = 0;
    let maxScore = 0;
    for (const [, info] of correctMap) maxScore += info.points;

    const answerRows = data.answers.map((a) => {
      const info = correctMap.get(a.questionId);
      const isCorrect = !!(info && a.choiceId && info.correctId && a.choiceId === info.correctId);
      const pts = isCorrect ? info!.points : 0;
      score += pts;
      return {
        attempt_id: data.attemptId,
        question_id: a.questionId,
        selected_choice_id: a.choiceId,
        is_correct: isCorrect,
        points_awarded: pts,
      };
    });

    // Replace any prior answers, then insert
    await supabaseAdmin.from("quiz_answers").delete().eq("attempt_id", data.attemptId);
    const { error: insErr } = await supabaseAdmin.from("quiz_answers").insert(answerRows);
    if (insErr) throw insErr;

    const { error: upErr } = await supabaseAdmin
      .from("quiz_attempts")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        time_spent_seconds: data.timeSpentSeconds,
        score,
        max_score: maxScore,
      })
      .eq("id", data.attemptId);
    if (upErr) throw upErr;

    // Update profile points + streak
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("points_total,streak_count,streak_last_date")
      .eq("id", userId)
      .maybeSingle();

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    let newStreak = (profile?.streak_count ?? 0);
    const last = profile?.streak_last_date ? new Date(profile.streak_last_date) : null;
    if (!last) {
      newStreak = 1;
    } else {
      const diffDays = Math.floor((today.getTime() - last.getTime()) / 86400000);
      if (diffDays === 0) {
        // same day — keep streak
      } else if (diffDays === 1) {
        newStreak = newStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        points_total: (profile?.points_total ?? 0) + score,
        streak_count: newStreak,
        streak_last_date: todayIso,
      })
      .eq("id", userId);

    // Award badges
    const earned: string[] = [];
    await awardBadge(userId, "first_quiz");
    earned.push("first_quiz");
    if (maxScore > 0 && score === maxScore) {
      await awardBadge(userId, "perfect_score");
      earned.push("perfect_score");
    }
    if (newStreak >= 30) { await awardBadge(userId, "streak_30"); earned.push("streak_30"); }
    else if (newStreak >= 7) { await awardBadge(userId, "streak_7"); earned.push("streak_7"); }
    else if (newStreak >= 3) { await awardBadge(userId, "streak_3"); earned.push("streak_3"); }

    // Top-rank badges (compare to current standings)
    const { count: ahead } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("points_total", (profile?.points_total ?? 0) + score);
    const rank = (ahead ?? 0) + 1;
    if (rank <= 3) { await awardBadge(userId, "top_3"); earned.push("top_3"); }
    if (rank <= 10) { await awardBadge(userId, "top_10"); earned.push("top_10"); }

    return { score, maxScore, newStreak, rank, badgesEarned: earned };
  });

/* Post-quiz review: full data with correct answers + explanations + user's picks. */
export const getQuizReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ quizId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: attempt, error: aErr } = await supabase
      .from("quiz_attempts")
      .select("id,score,max_score,submitted_at,time_spent_seconds,status,quiz_id")
      .eq("quiz_id", data.quizId)
      .eq("user_id", userId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!attempt || attempt.status !== "submitted") throw new Error("No submitted attempt");

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id,title,subject")
      .eq("id", data.quizId)
      .maybeSingle();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: questions } = await supabaseAdmin
      .from("quiz_questions")
      .select("id,prompt,explanation,order_index,points,quiz_choices(id,text,is_correct,order_index)")
      .eq("quiz_id", data.quizId)
      .order("order_index", { ascending: true });

    const { data: answers } = await supabaseAdmin
      .from("quiz_answers")
      .select("question_id,selected_choice_id,is_correct,points_awarded")
      .eq("attempt_id", attempt.id);

    const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a]));

    return {
      quiz,
      attempt,
      questions: (questions ?? []).map((q) => ({
        id: q.id,
        prompt: q.prompt,
        explanation: q.explanation,
        points: q.points,
        choices: ((q.quiz_choices as unknown as { id: string; text: string; is_correct: boolean; order_index: number }[]) ?? [])
          .sort((a, b) => a.order_index - b.order_index),
        userAnswer: answerMap.get(q.id) ?? null,
      })),
    };
  });

/* Admin: list all quizzes incl. drafts */
export const adminListQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("quizzes")
      .select("id,title,subject,status,opens_at,closes_at,created_at,quiz_questions(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((q) => ({
      ...q,
      question_count: (q.quiz_questions as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
  });

/* Admin: create a quiz */
export const adminCreateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        title: z.string().min(2).max(160),
        description: z.string().max(2000).optional().nullable(),
        subject: z.string().max(80).optional().nullable(),
        time_limit_seconds: z.number().int().min(60).max(7200),
        opens_at: z.string().nullable().optional(),
        closes_at: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: q, error } = await supabase
      .from("quizzes")
      .insert({
        title: data.title,
        description: data.description ?? null,
        subject: data.subject ?? null,
        time_limit_seconds: data.time_limit_seconds,
        opens_at: data.opens_at ?? null,
        closes_at: data.closes_at ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return q;
  });

/* Admin: get a single quiz w/ questions + choices (incl. is_correct) */
export const adminGetQuiz = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ quizId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", data.quizId).maybeSingle();
    if (!quiz) throw new Error("Not found");
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id,prompt,explanation,order_index,points,quiz_choices(id,text,is_correct,order_index)")
      .eq("quiz_id", data.quizId)
      .order("order_index", { ascending: true });
    return {
      quiz,
      questions: (questions ?? []).map((q) => ({
        ...q,
        quiz_choices: ((q.quiz_choices as unknown as { id: string; text: string; is_correct: boolean; order_index: number }[]) ?? [])
          .sort((a, b) => a.order_index - b.order_index),
      })),
    };
  });

/* Admin: upsert quiz + replace questions/choices */
export const adminSaveQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        quizId: z.string().uuid(),
        meta: z
          .object({
            title: z.string().min(2),
            description: z.string().nullable().optional(),
            subject: z.string().nullable().optional(),
            time_limit_seconds: z.number().int().min(60),
            status: z.enum(["draft", "scheduled", "live", "closed"]),
            opens_at: z.string().nullable().optional(),
            closes_at: z.string().nullable().optional(),
          }),
        questions: z
          .array(
            z.object({
              prompt: z.string().min(1),
              explanation: z.string().nullable().optional(),
              points: z.number().int().min(1).max(100),
              order_index: z.number().int().min(0),
              choices: z
                .array(
                  z.object({
                    text: z.string().min(1),
                    is_correct: z.boolean(),
                    order_index: z.number().int().min(0),
                  }),
                )
                .min(2)
                .max(8),
            }),
          )
          .min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    // Ensure each question has exactly one correct choice
    for (const q of data.questions) {
      const correct = q.choices.filter((c) => c.is_correct).length;
      if (correct !== 1) throw new Error("Each question needs exactly one correct choice");
    }

    const { error: upErr } = await supabase
      .from("quizzes")
      .update({
        title: data.meta.title,
        description: data.meta.description ?? null,
        subject: data.meta.subject ?? null,
        time_limit_seconds: data.meta.time_limit_seconds,
        status: data.meta.status,
        opens_at: data.meta.opens_at ?? null,
        closes_at: data.meta.closes_at ?? null,
      })
      .eq("id", data.quizId);
    if (upErr) throw upErr;

    // Replace questions (cascades to choices/answers — answers from previous attempts wiped, acceptable for v1)
    await supabase.from("quiz_questions").delete().eq("quiz_id", data.quizId);

    for (const q of data.questions) {
      const { data: qRow, error: qErr } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: data.quizId,
          prompt: q.prompt,
          explanation: q.explanation ?? null,
          points: q.points,
          order_index: q.order_index,
        })
        .select("id")
        .single();
      if (qErr) throw qErr;
      const { error: cErr } = await supabase.from("quiz_choices").insert(
        q.choices.map((c) => ({
          question_id: qRow.id,
          text: c.text,
          is_correct: c.is_correct,
          order_index: c.order_index,
        })),
      );
      if (cErr) throw cErr;
    }

    return { ok: true };
  });
