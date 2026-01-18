-- Kothar RAG: Supabase pgvector Setup
--
-- Run this SQL in your Supabase SQL Editor to set up the
-- kothar_dossiers table and match function.
--
-- Prerequisites:
--   1. Enable pgvector extension in Supabase dashboard
--   2. Run this SQL

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the kothar_dossiers table
CREATE TABLE IF NOT EXISTS kothar_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1024),  -- voyage-4-large default dimension
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
-- Using ivfflat for good balance of speed and accuracy
CREATE INDEX IF NOT EXISTS kothar_dossiers_embedding_idx
  ON kothar_dossiers
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS kothar_dossiers_metadata_idx
  ON kothar_dossiers
  USING gin (metadata);

-- RPC function for semantic search with optional filters
CREATE OR REPLACE FUNCTION match_kothar_dossiers(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 3,
  filter_source_types TEXT[] DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.content,
    kd.metadata,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM kothar_dossiers kd
  WHERE
    -- Similarity threshold
    1 - (kd.embedding <=> query_embedding) > match_threshold
    -- Optional source type filter
    AND (
      filter_source_types IS NULL
      OR kd.metadata->>'source_type' = ANY(filter_source_types)
    )
    -- Optional tags filter (any tag matches)
    AND (
      filter_tags IS NULL
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(kd.metadata->'tags') AS tag
        WHERE tag = ANY(filter_tags)
      )
    )
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable Row Level Security (optional but recommended)
ALTER TABLE kothar_dossiers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for all (public knowledge base)
DROP POLICY IF EXISTS "Allow public read access" ON kothar_dossiers;
CREATE POLICY "Allow public read access"
  ON kothar_dossiers
  FOR SELECT
  USING (true);

-- Policy: Restrict write access to authenticated users with service role
-- (The ingestion script should use SUPABASE_SERVICE_ROLE_KEY)
DROP POLICY IF EXISTS "Allow service role write access" ON kothar_dossiers;
CREATE POLICY "Allow service role write access"
  ON kothar_dossiers
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow service role delete" ON kothar_dossiers;
CREATE POLICY "Allow service role delete"
  ON kothar_dossiers
  FOR DELETE
  USING (auth.role() = 'service_role');

-- Grant usage to anon role for reading
GRANT SELECT ON kothar_dossiers TO anon;
GRANT EXECUTE ON FUNCTION match_kothar_dossiers TO anon;

-- Summary
COMMENT ON TABLE kothar_dossiers IS 'Kothar RAG knowledge base - embedded dossier chunks';
COMMENT ON FUNCTION match_kothar_dossiers IS 'Semantic search with VoyageAI voyage-4 embeddings';
