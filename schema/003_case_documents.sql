-- Case document vault
-- Requires: cases, users, case_event_visibility (from 001_core_cases.sql)

CREATE TABLE IF NOT EXISTS case_documents (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (case_id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(120),
  file_size_bytes BIGINT,
  visible_to case_event_visibility NOT NULL DEFAULT 'both',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT case_documents_title_not_empty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT case_documents_file_name_not_empty CHECK (char_length(trim(file_name)) > 0),
  CONSTRAINT case_documents_url_not_empty CHECK (char_length(trim(file_url)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_case_documents_case_id ON case_documents (case_id);
CREATE INDEX IF NOT EXISTS idx_case_documents_uploaded_by ON case_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_case_documents_created_at ON case_documents (created_at DESC);
