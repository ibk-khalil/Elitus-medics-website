import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDecks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flashcard_decks")
      .select("id, title, subject, is_public, user_id, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const ids = (data ?? []).map((d) => d.id);
    const { data: cards } = ids.length
      ? await context.supabase.from("flashcards").select("deck_id").in("deck_id", ids)
      : { data: [] as { deck_id: string }[] };
    const counts = new Map<string, number>();
    for (const c of cards ?? []) counts.set(c.deck_id, (counts.get(c.deck_id) ?? 0) + 1);
    return (data ?? []).map((d) => ({
      ...d,
      mine: d.user_id === context.userId,
      card_count: counts.get(d.id) ?? 0,
    }));
  });

export const createDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(2).max(120),
      subject: z.string().max(80).optional(),
      is_public: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: deck, error } = await context.supabase
      .from("flashcard_decks")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw error;
    return deck;
  });

export const getDeck = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deckId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: deck, error } = await context.supabase
      .from("flashcard_decks")
      .select("*")
      .eq("id", data.deckId)
      .single();
    if (error) throw error;
    const { data: cards } = await context.supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", data.deckId)
      .order("position", { ascending: true });
    return { deck: { ...deck, mine: deck.user_id === context.userId }, cards: cards ?? [] };
  });

export const addCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      deckId: z.string().uuid(),
      front: z.string().min(1).max(2000),
      back: z.string().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("deck_id", data.deckId);
    const { error } = await context.supabase.from("flashcards").insert({
      deck_id: data.deckId,
      front: data.front,
      back: data.back,
      position: count ?? 0,
    });
    if (error) throw error;
    return { ok: true };
  });

export const deleteCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ cardId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("flashcards").delete().eq("id", data.cardId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ deckId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("flashcard_decks").delete().eq("id", data.deckId);
    if (error) throw error;
    return { ok: true };
  });
