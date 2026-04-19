
ALTER TABLE public.inventory ADD COLUMN weight_kg NUMERIC;

INSERT INTO storage.buckets (id, name, public) VALUES ('equipment-photos', 'equipment-photos', true);

CREATE POLICY "Authenticated users can upload equipment photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'equipment-photos');

CREATE POLICY "Anyone can view equipment photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'equipment-photos');

CREATE POLICY "Authenticated users can delete equipment photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'equipment-photos');
