#!/bin/bash
# Reingest dossiers to vector database
# Usage: ./scripts/reingest-dossiers.sh

set -e

cd "$(dirname "$0")/.."

echo "📦 Chunking dossiers..."
npx ts-node scripts/chunk-dossiers.ts

echo ""
echo "🚀 Ingesting to Supabase..."
export $(grep -E '^(VOYAGE_API_KEY|SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)' .env | xargs)
npx ts-node scripts/ingest-embeddings.ts

echo ""
echo "✅ Done! Dossiers reingested to vector database."
