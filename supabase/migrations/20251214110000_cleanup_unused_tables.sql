-- Cleanup unused legacy tables
-- These tables were created during early development but are not used in production

-- Drop unused user profile related tables
DROP TABLE IF EXISTS user_profile_creative_dna CASCADE;
DROP TABLE IF EXISTS user_profile_niches CASCADE;
DROP TABLE IF EXISTS user_profile_objectives CASCADE;
DROP TABLE IF EXISTS user_profile_platforms CASCADE;

-- Drop unused video_segments table (replaced by video_generation_jobs workflow)
DROP TABLE IF EXISTS video_segments CASCADE;

-- Drop unused final_videos table (data now stored in planned_content.final_video_url)
DROP TABLE IF EXISTS final_videos CASCADE;

-- Drop unused gallery_items table (replaced by query to planned_content)
DROP TABLE IF EXISTS gallery_items CASCADE;

-- Drop unused topics table (topics generated on-the-fly, cached in localStorage)
DROP TABLE IF EXISTS topics CASCADE;

-- Log cleanup
DO $do_block$
BEGIN
    RAISE NOTICE 'Cleaned up 8 unused legacy tables';
END $do_block$;
