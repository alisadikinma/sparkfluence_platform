-- ============================================================================
-- Sparkfluence RAG Vector Database Schema - RESET & FIX
-- ============================================================================
-- Purpose: Fix dimension mismatch (1536 → 768) for Gemini embeddings
-- Embedding Model: Google Gemini text-embedding-004 (768 dimensions)
-- 
-- ⚠️ WARNING: This will DELETE all existing embeddings!
-- After running this, you MUST re-run chunk_and_embed.py
-- ============================================================================

-- 1. Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing function first (depends on VECTOR type)
DROP FUNCTION IF EXISTS match_knowledge(VECTOR(1536), FLOAT, INT, TEXT);
DROP FUNCTION IF EXISTS match_knowledge(VECTOR(768), FLOAT, INT, TEXT);
DROP FUNCTION IF EXISTS match_knowledge(VECTOR, FLOAT, INT, TEXT);

-- 3. Drop existing table (this deletes all data!)
DROP TABLE IF EXISTS knowledge_embeddings CASCADE;

-- 4. Create table with CORRECT dimensions (768 for Gemini)
CREATE TABLE knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL CHECK (project_type IN ('viral_script', 'image_video')),
  file_name TEXT NOT NULL,
  section_title TEXT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(768),  -- ✅ Gemini text-embedding-004 = 768 dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert operations
  UNIQUE(project_type, file_name, section_title)
);

-- 5. Create index for vector similarity search (IVFFlat)
-- Note: Index will be built after data is inserted
CREATE INDEX idx_knowledge_embeddings_vector
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 6. Create index for filtering by project_type
CREATE INDEX idx_knowledge_project_type
ON knowledge_embeddings(project_type);

-- 7. Create index for file_name lookups
CREATE INDEX idx_knowledge_file_name
ON knowledge_embeddings(file_name);

-- 8. Create similarity search function with CORRECT 768 dimensions
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

-- 9. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger for automatic updated_at timestamp
DROP TRIGGER IF EXISTS knowledge_embeddings_updated_at ON knowledge_embeddings;
CREATE TRIGGER knowledge_embeddings_updated_at
  BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- 11. Enable Row Level Security (RLS)
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
DROP POLICY IF EXISTS "Service role full access" ON knowledge_embeddings;
CREATE POLICY "Service role full access"
  ON knowledge_embeddings
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read" ON knowledge_embeddings;
CREATE POLICY "Authenticated users can read"
  ON knowledge_embeddings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check table dimensions:
-- SELECT column_name, udt_name, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'knowledge_embeddings';

-- Check function signature:
-- SELECT proname, pg_get_function_arguments(oid) 
-- FROM pg_proc 
-- WHERE proname = 'match_knowledge';

-- ============================================================================
-- NEXT STEPS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. cd D:\Projects\Sparkfluence_n8n\docs\n8n
-- 3. python chunk_and_embed.py --folder "D:\Projects\Sparkfluence_n8n\Viral_Script_Generator" --project-type viral_script
-- ============================================================================
