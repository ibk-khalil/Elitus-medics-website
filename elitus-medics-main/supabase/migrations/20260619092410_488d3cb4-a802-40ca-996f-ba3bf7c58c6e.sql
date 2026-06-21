-- Study groups
CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT ALL ON public.study_groups TO service_role;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view groups" ON public.study_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create groups" ON public.study_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or admin can update" ON public.study_groups FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Creator or admin can delete" ON public.study_groups FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER study_groups_touch BEFORE UPDATE ON public.study_groups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.study_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members readable to authed" ON public.study_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "User can join" ON public.study_group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can leave" ON public.study_group_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.study_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.study_group_messages TO authenticated;
GRANT ALL ON public.study_group_messages TO service_role;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read messages" ON public.study_group_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_messages.group_id AND m.user_id = auth.uid())
);
CREATE POLICY "Members can post messages" ON public.study_group_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = study_group_messages.group_id AND m.user_id = auth.uid())
);
CREATE POLICY "Author or admin can delete msg" ON public.study_group_messages FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Flashcards
CREATE TABLE public.flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_decks TO authenticated;
GRANT ALL ON public.flashcard_decks TO service_role;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or public visible" ON public.flashcard_decks FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Owner inserts" ON public.flashcard_decks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates" ON public.flashcard_decks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner deletes" ON public.flashcard_decks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER flashcard_decks_touch BEFORE UPDATE ON public.flashcard_decks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cards follow deck visibility" ON public.flashcards FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.flashcard_decks d WHERE d.id = flashcards.deck_id AND (d.user_id = auth.uid() OR d.is_public = true))
);
CREATE POLICY "Owner manages cards" ON public.flashcards FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.flashcard_decks d WHERE d.id = flashcards.deck_id AND d.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.flashcard_decks d WHERE d.id = flashcards.deck_id AND d.user_id = auth.uid())
);

-- Yearbook entries (cohort year scoped to profile)
CREATE TABLE public.yearbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  quote TEXT,
  superlative TEXT,
  fun_fact TEXT,
  photo_url TEXT,
  graduation_year INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yearbook_entries TO authenticated;
GRANT ALL ON public.yearbook_entries TO service_role;
ALTER TABLE public.yearbook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authed can view yearbook" ON public.yearbook_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner manages yearbook" ON public.yearbook_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates yearbook" ON public.yearbook_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner or admin deletes yearbook" ON public.yearbook_entries FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER yearbook_entries_touch BEFORE UPDATE ON public.yearbook_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
