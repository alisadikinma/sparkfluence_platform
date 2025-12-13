-- ============================================================================
-- Sparkfluence RAG Vector Database Schema (Gemini 768 Dimensions)
-- ============================================================================
-- Purpose: Create pgvector-enabled database for knowledge embeddings
-- Embedding Model: Google Gemini text-embedding-004 (768 dimensions)
-- ============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop existing table and function if they exist (for clean slate)
DROP FUNCTION IF EXISTS match_knowledge(VECTOR, FLOAT, INT, TEXT);
DROP TABLE IF EXISTS knowledge_embeddings;

-- 3. Create table: knowledge_embeddings (768 dimensions for Gemini)
CREATE TABLE knowledge_embeddings (
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

-- 4. Create index for vector similarity search (IVFFlat)
CREATE INDEX idx_knowledge_embeddings_vector
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 5. Create index for filtering by project_type
CREATE INDEX idx_knowledge_project_type
ON knowledge_embeddings(project_type);

-- 6. Create index for file_name lookups
CREATE INDEX idx_knowledge_file_name
ON knowledge_embeddings(file_name);

-- 7. Create similarity search function (768 dimensions for Gemini)
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

-- 8. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for automatic updated_at timestamp
CREATE TRIGGER knowledge_embeddings_updated_at
  BEFORE UPDATE ON knowledge_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- 10. Enable Row Level Security (RLS)
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policy for service role full access
CREATE POLICY "Service role full access"
  ON knowledge_embeddings
  FOR ALL
  USING (auth.role() = 'service_role');

-- 12. Create RLS policy for authenticated users (read-only)
CREATE POLICY "Authenticated users can read"
  ON knowledge_embeddings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- IMPORTANT: After applying this migration, run chunk_and_embed.py to populate:
-- python chunk_and_embed.py --folder "path/to/knowledge" --project-type viral_script
-- ============================================================================
