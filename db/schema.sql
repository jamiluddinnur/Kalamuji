-- ============================================================================
-- Kalamuji — Neon PostgreSQL Schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE plan_tier AS ENUM ('free_trial', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE scenario_type AS ENUM ('preset', 'custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pressure_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE feedback_sentiment AS ENUM ('positive', 'neutral', 'negative');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  full_name           TEXT,
  role                user_role NOT NULL DEFAULT 'user',
  plan_tier           plan_tier NOT NULL DEFAULT 'free_trial',
  trial_scenario      TEXT NOT NULL DEFAULT 'job_interview',
  remaining_sessions  INTEGER NOT NULL DEFAULT 5 CHECK (remaining_sessions >= 0),
  monthly_quota       INTEGER NOT NULL DEFAULT 5 CHECK (monthly_quota > 0),
  cycle_started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cycle_renews_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_plan_tier ON users (plan_tier);
CREATE INDEX IF NOT EXISTS idx_users_cycle_renews_at ON users (cycle_renews_at)
  WHERE plan_tier = 'pro';

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_type       scenario_type NOT NULL,
  scenario_key        TEXT,
  counterpart_role    TEXT NOT NULL,
  situation_goal      TEXT NOT NULL,
  pressure_level      pressure_level NOT NULL DEFAULT 'medium',
  voice_persona       TEXT NOT NULL DEFAULT 'professional_calm',
  status              session_status NOT NULL DEFAULT 'active',
  transcript          JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds    INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_preset_requires_key CHECK (
    (scenario_type = 'preset' AND scenario_key IS NOT NULL)
    OR (scenario_type = 'custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status
  ON sessions (user_id, status);

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON sessions;
CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS evaluations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clarity                  SMALLINT NOT NULL CHECK (clarity BETWEEN 0 AND 100),
  relevance                SMALLINT NOT NULL CHECK (relevance BETWEEN 0 AND 100),
  persuasion               SMALLINT NOT NULL CHECK (persuasion BETWEEN 0 AND 100),
  tone_composure           SMALLINT NOT NULL CHECK (tone_composure BETWEEN 0 AND 100),
  overall_score            NUMERIC(5,2) NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  strongest_point          TEXT NOT NULL,
  priority_improvement     TEXT NOT NULL,
  better_phrasing_example  TEXT NOT NULL,
  recurring_weakness_tag   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_user_created
  ON evaluations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluations_weakness_tag
  ON evaluations (user_id, recurring_weakness_tag)
  WHERE recurring_weakness_tag IS NOT NULL;

CREATE TABLE IF NOT EXISTS coaching_memories (
  user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  summary                 TEXT NOT NULL DEFAULT '',
  recurring_weaknesses    JSONB NOT NULL DEFAULT '[]'::jsonb,
  notable_strengths       JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_session_id         UUID REFERENCES sessions(id) ON DELETE SET NULL,
  sessions_analyzed_count INTEGER NOT NULL DEFAULT 0 CHECK (sessions_analyzed_count >= 0),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_coaching_memories_updated_at ON coaching_memories;
CREATE TRIGGER trg_coaching_memories_updated_at
  BEFORE UPDATE ON coaching_memories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id  UUID REFERENCES sessions(id) ON DELETE SET NULL,
  sentiment   feedback_sentiment NOT NULL,
  quick_tag   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_created
  ON user_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_sentiment
  ON user_feedback (sentiment, created_at DESC);
