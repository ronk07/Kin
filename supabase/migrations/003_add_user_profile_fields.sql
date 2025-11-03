-- Add age and gender fields to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Create an index on gender for potential filtering
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

