-- ============================================================================
-- Add 'market_intel' project_type for TIER 3 Knowledge Embeddings
-- ============================================================================
-- Purpose: Extend knowledge_embeddings to support market intelligence content
-- This enables RAG for trending topics, case studies, industry facts
-- ============================================================================

-- 1. Drop the existing constraint
ALTER TABLE knowledge_embeddings 
DROP CONSTRAINT IF EXISTS knowledge_embeddings_project_type_check;

-- 2. Add new constraint with 'market_intel' option
ALTER TABLE knowledge_embeddings 
ADD CONSTRAINT knowledge_embeddings_project_type_check 
CHECK (project_type IN ('market_intel'));

-- 3. Update match_knowledge function to support new project_type
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

-- 4. Add comment for documentation
COMMENT ON TABLE knowledge_embeddings IS 
'RAG knowledge base with 3 project types:
- market_intel: Market intelligence for Indonesia/India (TIER 3 - semantic search)';

-- ============================================================================
-- After applying, run the embedding script:
-- python embed_market_intel.py --file "path/to/market_intel.md"
-- ============================================================================
