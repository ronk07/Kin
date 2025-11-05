-- Add verification metadata columns to task_completions
ALTER TABLE task_completions
  ADD COLUMN IF NOT EXISTS verification_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS verification_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_model TEXT;

-- Add verification metadata columns to checkins
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS verification_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS verification_reason TEXT,
  ADD COLUMN IF NOT EXISTS verification_model TEXT;



