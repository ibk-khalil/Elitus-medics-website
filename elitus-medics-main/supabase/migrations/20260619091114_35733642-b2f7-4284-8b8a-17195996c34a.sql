CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  resource_type TEXT NOT NULL DEFAULT 'document',
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources readable by authenticated" ON public.resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reps and admins can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'representative'));
CREATE POLICY "Owners or admins can update resources" ON public.resources FOR UPDATE TO authenticated USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners or admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER resources_touch BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements readable by authenticated" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reps and admins can insert announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'representative'));
CREATE POLICY "Authors or admins update announcements" ON public.announcements FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors or admins delete announcements" ON public.announcements FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER announcements_touch BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  capacity INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events readable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reps and admins can insert events" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'representative'));
CREATE POLICY "Creators or admins update events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin')) WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Creators or admins delete events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER events_touch BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','interested','not_going')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RSVPs visible to authenticated" ON public.event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own RSVP insert" ON public.event_rsvps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own RSVP update" ON public.event_rsvps FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own RSVP delete" ON public.event_rsvps FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER event_rsvps_touch BEFORE UPDATE ON public.event_rsvps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();