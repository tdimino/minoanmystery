#!/bin/bash
# Reingest dossiers to vector database
# Usage: ./scripts/reingest-dossiers.sh

set -e

cd "$(dirname "$0")/.."

echo "📦 Chunking dossiers..."
npx ts-node scripts/chunk-dossiers.ts

echo ""
echo "🚀 Ingesting to Supabase..."
# Source env vars from .env and .env.local
export $(grep -E '^[A-Z]' .env | xargs)
[ -f .env.local ] && export $(grep -E '^[A-Z]' .env.local | xargs)
npx ts-node scripts/ingest-embeddings.ts

echo ""
echo "✅ Done! Dossiers reingested to vector database."
