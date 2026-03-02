-- ============================================
-- LangTalk: Supabase PostgreSQL Schema
-- Google Sheets → Supabase Migration
-- ============================================

-- 1. Auto updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Users table (1 row per user)
-- Maps to Google Sheets "Users" sheet
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  subscription JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Merged from Subscriptions sheet (session-count route)
  session_count INTEGER NOT NULL DEFAULT 0,
  evaluated_grade TEXT,
  level_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- ============================================
-- 3. Learning Data table (1 row per user)
-- Maps to Google Sheets "LearningData" sheet
-- ============================================
CREATE TABLE IF NOT EXISTS learning_data (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  recent_sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
  corrections JSONB NOT NULL DEFAULT '[]'::jsonb,
  topics_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  debate_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  vocab_book JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER learning_data_updated_at
  BEFORE UPDATE ON learning_data
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- ============================================
-- 4. Debate Topics table
-- Maps to Google Sheets "DebateTopics" sheet
-- ============================================
CREATE TABLE IF NOT EXISTS debate_topics (
  topic_id TEXT PRIMARY KEY,
  age_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'daily',
  topic_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  trend_score REAL NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_from TEXT
);

-- ============================================
-- 5. Indexes for common queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_learning_data_updated_at ON learning_data(updated_at);
CREATE INDEX IF NOT EXISTS idx_debate_topics_active ON debate_topics(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_debate_topics_category ON debate_topics(category);
CREATE INDEX IF NOT EXISTS idx_debate_topics_trend ON debate_topics(trend_score DESC);
