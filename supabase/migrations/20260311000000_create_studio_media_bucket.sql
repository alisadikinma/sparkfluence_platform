-- ============================================================================
-- Create studio-media storage bucket + RLS policies + 7-day cleanup function
-- ============================================================================

-- 1. Create the bucket (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-media',
  'studio-media',
  true,
  52428800, -- 50MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS: Public read
CREATE POLICY "Public read studio-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'studio-media');

-- 3. RLS: Authenticated users can upload to their own folder
CREATE POLICY "Auth upload studio-media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'studio-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS: Users can delete their own files
CREATE POLICY "Auth delete own studio-media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'studio-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Cleanup function: delete files older than 7 days
CREATE OR REPLACE FUNCTION cleanup_studio_media_bucket(days_old INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  file_record RECORD;
BEGIN
  FOR file_record IN
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'studio-media'
      AND created_at < NOW() - (days_old || ' days')::INTERVAL
  LOOP
    DELETE FROM storage.objects
    WHERE bucket_id = 'studio-media' AND name = file_record.name;
    deleted_count := deleted_count + 1;
  END LOOP;

  RETURN deleted_count;
END;
$$;

-- Usage: SELECT cleanup_studio_media_bucket(7);
-- Schedule via pg_cron (weekly Sunday 3AM UTC):
-- SELECT cron.schedule('cleanup-studio-media', '0 3 * * 0', $$SELECT cleanup_studio_media_bucket(7)$$);
