-- ============================================================================
-- Sparkfluence RAG Vector Database Schema
-- ============================================================================
-- Purpose: Create pgvector-enabled database for knowledge embeddings
-- Usage: Run this entire file in Supabase SQL Editor
-- Database: PostgreSQL with pgvector extension
-- Embedding Model: Google Gemini text-embedding-004 (768 dimensions)
-- ============================================================================

-- 1. Enable pgvector extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create table: knowledge_embeddings
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL CHECK (project_type IN ('viral_script', 'image_video')),
  file_name TEXT NOT NULL,
  section_title TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(768),  -- Gemini text-embedding-004 = 768 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert operations
  UNIQUE(project_type, file_name, section_title)
);

-- 3. Create index for vector similarity search
-- ============================================================================
-- Using IVFFlat for efficient approximate nearest neighbor search
-- Lists parameter: 100 (good for up to 10K vectors)
-- For larger datasets (>100K vectors), increase lists to sqrt(total_rows)
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Create index for filtering by project_type
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_knowledge_project_type
ON knowledge_embeddings(project_type);

-- 5. Create index for file_name lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_knowledge_file_name
ON knowledge_embeddings(file_name);

-- 6. Create similarity search function
-- ============================================================================
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_project_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  project_type TEXT,
  file_name TEXT,
  section_title TEXT,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.project_type,
    ke.file_name,
    ke.section_title,
    ke.chunk_text,
    ke.metadata,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_embeddings ke
  WHERE
    (filter_project_type IS NULL OR ke.project_type = filter_project_type)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Create updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for automatic updated_at timestamp
-- ============================================================================
DROP TRIGGER IF EXISTS knowledge_embeddings_updated_at ON knowledge_embeddings;

CREATE TRIGGER knowledge_embeddings_updated_at
  BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 9. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policy for service role full access
-- ============================================================================
DROP POLICY IF EXISTS "Service role full access" ON knowledge_embeddings;

CREATE POLICY "Service role full access"
  ON knowledge_embeddings
  FOR ALL
  USING (auth.role() = 'service_role');

-- 11. Create RLS policy for authenticated users (read-only)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can read" ON knowledge_embeddings;

CREATE POLICY "Authenticated users can read"
  ON knowledge_embeddings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- Verification Queries (Optional - Comment out if not needed)
-- ============================================================================

-- Check if extension is enabled
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'knowledge_embeddings';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'knowledge_embeddings';

-- Check RLS policies
-- SELECT policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'knowledge_embeddings';

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Search for viral script knowledge about hooks
-- SELECT * FROM match_knowledge(
--   query_embedding := (SELECT embedding FROM knowledge_embeddings LIMIT 1),
--   match_threshold := 0.5,
--   match_count := 10,
--   filter_project_type := 'viral_script'
-- );

-- Example 2: Count chunks per project type
-- SELECT project_type, COUNT(*) as chunk_count
-- FROM knowledge_embeddings
-- GROUP BY project_type;

-- Example 3: List all files in a project
-- SELECT DISTINCT file_name
-- FROM knowledge_embeddings
-- WHERE project_type = 'viral_script'
-- ORDER BY file_name;

-- ============================================================================
-- Schema Complete
-- ============================================================================
-- Next steps:
-- 1. Run this file in Supabase SQL Editor
-- 2. Verify no errors
-- 3. Run chunk_and_embed.py to populate the database:
--    python chunk_and_embed.py --folder "D:\Projects\Sparkfluence_n8n\Viral_Script_Generator" --project-type viral_script
-- ============================================================================
