-- ═══════════════════════════════════════════════════════════
-- Networth Planner — Supabase Migration
-- ═══════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- NextAuth required tables (if not using Supabase Auth adapter auto-creation)
-- The @auth/supabase-adapter usually creates these automatically.
-- If not, uncomment the block below:

/*
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" UUID NOT NULL,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);
*/

-- ═══════════════════════════════════════════════════════════
-- Profiles table — stores saved planner configurations
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Profile',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own profiles
CREATE POLICY "Users can view own profiles"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profiles"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profiles"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own profiles"
  ON profiles FOR DELETE
  USING (user_id = auth.uid());

-- Service role bypass (for API routes using service key)
-- The service role key bypasses RLS by default in Supabase.
