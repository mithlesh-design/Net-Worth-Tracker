-- ═══════════════════════════════════════════════════════════
-- Networth Planner — Supabase Migration
-- ═══════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ═══════════════════════════════════════════════════════════
-- Accounts — the next_auth schema @auth/supabase-adapter uses
-- ═══════════════════════════════════════════════════════════
-- Needed for the email sign-in link (its one-time tokens live here) and so a
-- person has ONE user id whether they sign in with Google or by email. The
-- column names are exactly the ones the adapter reads and writes.
--
-- After running this file: Dashboard → Project Settings → API → "Exposed
-- schemas", add next_auth. The adapter cannot reach it otherwise.

CREATE SCHEMA IF NOT EXISTS next_auth;
GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO postgres;

CREATE TABLE IF NOT EXISTS next_auth.users (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" UUID,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT "sessionToken_unique" UNIQUE ("sessionToken"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
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
  oauth_token_secret TEXT,
  oauth_token TEXT,
  "userId" UUID,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier TEXT,
  token TEXT,
  expires TIMESTAMPTZ NOT NULL,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
  CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO postgres, service_role;

-- ═══════════════════════════════════════════════════════════
-- Profiles table — stores saved planner configurations
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
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
