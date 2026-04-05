#!/bin/bash

# Supabase Setup Script for Sonic Bloom Player
# This script helps you set up the database schema in your Supabase project

echo "🎵 Sonic Bloom Player - Supabase Setup"
echo "======================================="
echo ""

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "⚠️  SUPABASE_ACCESS_TOKEN not found in environment."
  echo "   Please set it by running:"
  echo "   export SUPABASE_ACCESS_TOKEN=your-access-token"
  echo ""
  echo "   Or create a .env file with:"
  echo "   SUPABASE_ACCESS_TOKEN=sbp_xxxxx"
  exit 1
fi

echo "📋 Loading database schema..."

# Read the schema file
SCHEMA_FILE="$(dirname "$0")/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "❌ Schema file not found at: $SCHEMA_FILE"
  exit 1
fi

echo "✅ Schema file found. Applying to Supabase..."
echo ""

# Use Supabase CLI if available
if command -v supabase &> /dev/null; then
  echo "🔧 Using Supabase CLI..."
  supabase db execute --file "$SCHEMA_FILE"
  echo "✅ Database schema applied successfully!"
else
  echo "⚠️  Supabase CLI not installed."
  echo ""
  echo "📝 Manual Setup Instructions:"
  echo "   1. Go to https://supabase.com/dashboard"
  echo "   2. Select your project (hcutwzcybidywtmmbehq)"
  echo "   3. Go to SQL Editor"
  echo "   4. Copy the contents of supabase/schema.sql"
  echo "   5. Paste and run the SQL"
  echo ""
  echo "📦 Or install Supabase CLI:"
  echo "   brew install supabase/tap/supabase  (macOS)"
  echo "   npm install -g supabase             (npm)"
fi

echo ""
echo "🎉 Setup complete!"
