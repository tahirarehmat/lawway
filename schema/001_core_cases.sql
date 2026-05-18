-- Lawway core case workflow schema
-- Run against your Neon PostgreSQL database (SQL Editor or: npm run db:migrate)
-- Requires existing tables: users, client_profiles, lawyer_profiles

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE case_request_status AS ENUM ('pending', 'accepted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_status AS ENUM ('active', 'on_hold', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_event_type AS ENUM (
    'hearing',
    'meeting',
    'deadline',
    'document_required',
    'filing_update',
    'status_update',
    'reminder',
    'general_note'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_event_priority AS ENUM ('normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_event_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_event_visibility AS ENUM ('client_only', 'lawyer_only', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_stage_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE case_stage_action AS ENUM (
    'stage_created',
    'stage_updated',
    'stage_started',
    'stage_completed',
    'moved_forward',
    'moved_back',
    'stage_skipped'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- case_requests — client submits before a case exists
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  brief_description TEXT NOT NULL,
  special_conditions TEXT,
  status case_request_status NOT NULL DEFAULT 'pending',
  accepted_by_lawyer_id UUID REFERENCES users (user_id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_requests_title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT case_requests_brief_not_empty CHECK (char_length(trim(brief_description)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_case_requests_client_id ON case_requests (client_id);
CREATE INDEX IF NOT EXISTS idx_case_requests_status ON case_requests (status);
CREATE INDEX IF NOT EXISTS idx_case_requests_pending ON case_requests (created_at DESC)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- cases — created when a lawyer accepts a request
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cases (
  case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES case_requests (request_id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  brief_description TEXT NOT NULL,
  special_conditions TEXT,
  status case_status NOT NULL DEFAULT 'active',
  current_stage_id UUID,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cases_title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT cases_brief_not_empty CHECK (char_length(trim(brief_description)) > 0),
  CONSTRAINT cases_client_lawyer_different CHECK (client_id <> lawyer_id)
);

CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases (client_id);
CREATE INDEX IF NOT EXISTS idx_cases_lawyer_id ON cases (lawyer_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);

-- ---------------------------------------------------------------------------
-- case_stages — ordered progress pipeline per case
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_stages (
  stage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (case_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL,
  status case_stage_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_stages_title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT case_stages_sort_order_positive CHECK (sort_order > 0),
  CONSTRAINT case_stages_unique_order UNIQUE (case_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_case_stages_case_id ON case_stages (case_id);
CREATE INDEX IF NOT EXISTS idx_case_stages_case_sort ON case_stages (case_id, sort_order);

-- Only one in-progress stage per case
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_stages_one_in_progress
  ON case_stages (case_id)
  WHERE status = 'in_progress';

-- cases.current_stage_id → case_stages
DO $$ BEGIN
  ALTER TABLE cases
    ADD CONSTRAINT cases_current_stage_id_fkey
    FOREIGN KEY (current_stage_id) REFERENCES case_stages (stage_id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- case_stage_transitions — audit log for stage changes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_stage_transitions (
  transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (case_id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES case_stages (stage_id) ON DELETE CASCADE,
  from_status case_stage_status,
  to_status case_stage_status NOT NULL,
  action case_stage_action NOT NULL,
  changed_by UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_stage_transitions_case_id
  ON case_stage_transitions (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_stage_transitions_stage_id
  ON case_stage_transitions (stage_id);

-- ---------------------------------------------------------------------------
-- case_events — hearings, deadlines, alerts, notes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (case_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users (user_id) ON DELETE RESTRICT,
  event_type case_event_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  location VARCHAR(500),
  priority case_event_priority NOT NULL DEFAULT 'normal',
  status case_event_status NOT NULL DEFAULT 'scheduled',
  visible_to case_event_visibility NOT NULL DEFAULT 'client_only',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_events_title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT case_events_ends_after_starts CHECK (
    ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at
  )
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events (case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_case_starts ON case_events (case_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_case_events_visible ON case_events (case_id, visible_to);

-- ---------------------------------------------------------------------------
-- case_event_reads — unread / read state for alerts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS case_event_reads (
  event_id UUID NOT NULL REFERENCES case_events (event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_case_event_reads_user_unread
  ON case_event_reads (user_id)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION lawway_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_case_requests_updated_at ON case_requests;
CREATE TRIGGER trg_case_requests_updated_at
  BEFORE UPDATE ON case_requests
  FOR EACH ROW EXECUTE FUNCTION lawway_set_updated_at();

DROP TRIGGER IF EXISTS trg_cases_updated_at ON cases;
CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION lawway_set_updated_at();

DROP TRIGGER IF EXISTS trg_case_stages_updated_at ON case_stages;
CREATE TRIGGER trg_case_stages_updated_at
  BEFORE UPDATE ON case_stages
  FOR EACH ROW EXECUTE FUNCTION lawway_set_updated_at();

DROP TRIGGER IF EXISTS trg_case_events_updated_at ON case_events;
CREATE TRIGGER trg_case_events_updated_at
  BEFORE UPDATE ON case_events
  FOR EACH ROW EXECUTE FUNCTION lawway_set_updated_at();
