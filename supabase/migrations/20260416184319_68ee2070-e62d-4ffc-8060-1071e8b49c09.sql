
-- Make buckets private (objects only accessible via signed URLs or RLS policies)
UPDATE storage.buckets SET public = false WHERE id IN ('equipment-photos', 'promotion-images');

-- Drop any existing permissive policies for these buckets
DROP POLICY IF EXISTS "Public read equipment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read promotion-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list equipment-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list promotion-images" ON storage.objects;

-- Authenticated users can READ individual objects (no listing of arbitrary paths)
CREATE POLICY "Authenticated read equipment-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'equipment-photos');

CREATE POLICY "Authenticated read promotion-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'promotion-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated upload equipment-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'equipment-photos');

CREATE POLICY "Authenticated upload promotion-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'promotion-images');

-- Owners can update/delete their own files
CREATE POLICY "Owners update equipment-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'equipment-photos' AND owner = auth.uid());

CREATE POLICY "Owners delete equipment-photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'equipment-photos' AND owner = auth.uid());

CREATE POLICY "Owners update promotion-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'promotion-images' AND owner = auth.uid());

CREATE POLICY "Owners delete promotion-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'promotion-images' AND owner = auth.uid());
