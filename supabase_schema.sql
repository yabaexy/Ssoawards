-- IMPORTANT: If you see "column does not exist" errors, 
-- COPY AND RUN THIS ENTIRE SCRIPT in your Supabase SQL Editor.
-- It will safely create missing tables or add missing columns.

-- Supabase Schema for Unsource One Muse App

-- 1. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  story TEXT NOT NULL,
  reason TEXT NOT NULL,
  year INT4 NOT NULL,
  image_url TEXT,
  video_url TEXT,
  is_published BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Migration: Add missing columns if table already exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candidates' AND column_name='is_published') THEN
    ALTER TABLE public.candidates ADD COLUMN is_published BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candidates' AND column_name='archived') THEN
    ALTER TABLE public.candidates ADD COLUMN archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Topics Table (Prediction Markets)
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of strings
  status TEXT DEFAULT 'open',
  winner_index INT4,
  creator_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Votes Table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  voter_address TEXT NOT NULL,
  option_index INT4 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(topic_id, voter_address)
);

-- 4. User Points & Muse Progress Table
CREATE TABLE IF NOT EXISTS user_points (
  wallet_address TEXT PRIMARY KEY,
  points INT4 DEFAULT 0,
  muse_level INT4 DEFAULT 1,
  unlocked_skins JSONB DEFAULT '["default"]',
  current_skin TEXT DEFAULT 'default',
  completed_missions JSONB DEFAULT '[]'
);

-- Enable Row Level Security (RLS) - Optional but recommended
-- For this prototype, we'll keep it simple, but in production you'd add policies.
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Simple "Allow All" policies for prototype (WARNING: Not for production)
CREATE POLICY "Allow all candidates" ON candidates FOR ALL USING (true);
CREATE POLICY "Allow all topics" ON topics FOR ALL USING (true);
CREATE POLICY "Allow all votes" ON votes FOR ALL USING (true);
CREATE POLICY "Allow all user_points" ON user_points FOR ALL USING (true);
