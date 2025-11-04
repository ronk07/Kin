-- Create storage bucket for workout photos
-- This bucket will store user-uploaded task verification photos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workout-photos',
  'workout-photos',
  true, -- Public bucket but with RLS policies for security
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] -- Only allow image types
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;

-- Create policy to allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workout-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to read their own photos
CREATE POLICY "Users can read their own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'workout-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workout-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
