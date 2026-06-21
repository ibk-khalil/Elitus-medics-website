CREATE POLICY "Authenticated can read resource files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resources');

CREATE POLICY "Reps and admins can upload resource files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'representative')));

CREATE POLICY "Reps and admins can update resource files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'representative') OR owner = auth.uid()));

CREATE POLICY "Reps and admins can delete resource files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'representative') OR owner = auth.uid()));