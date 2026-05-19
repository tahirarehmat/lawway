-- Add target lawyer for directed case requests (Book consultation from Search)

ALTER TABLE case_requests
  ADD COLUMN IF NOT EXISTS requested_lawyer_id UUID REFERENCES users (user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_requests_requested_lawyer
  ON case_requests (requested_lawyer_id)
  WHERE status = 'pending';
