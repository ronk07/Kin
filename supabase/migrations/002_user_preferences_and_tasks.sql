-- User Preferences and Tasks Schema Migration

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  weekly_workout_goal INTEGER DEFAULT 5 CHECK (weekly_workout_goal >= 0 AND weekly_workout_goal <= 7),
  daily_step_goal INTEGER DEFAULT 10000 CHECK (daily_step_goal >= 0),
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TIME DEFAULT '09:00:00',
  require_photo_proof BOOLEAN DEFAULT true,
  privacy_opt_out BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task types table (predefined task types)
CREATE TABLE IF NOT EXISTS task_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT,
  requires_proof BOOLEAN DEFAULT true,
  default_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User tasks table (user's active tasks)
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE CASCADE,
  custom_subtitle TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, task_type_id)
);

-- Task completions table (daily task completion tracking)
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_task_id UUID NOT NULL REFERENCES user_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  proof_url TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_task_id, completed_date)
);

-- Family invite codes table
CREATE TABLE IF NOT EXISTS family_invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT NULL,
  times_used INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_type_id ON user_tasks(task_type_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_task_id ON task_completions(user_task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_family_id ON task_completions(family_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(completed_date);
CREATE INDEX IF NOT EXISTS idx_family_invite_codes_code ON family_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_family_invite_codes_family_id ON family_invite_codes(family_id);

-- Triggers to auto-update updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default task types
INSERT INTO task_types (name, display_name, icon, requires_proof, default_enabled) VALUES
  ('workout', 'Workout', 'dumbbell', true, true),
  ('bible_reading', 'Read Bible', 'book', true, true)
ON CONFLICT (name) DO NOTHING;

-- Function to create default user preferences on user creation
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences when user is created
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_preferences();

-- Function to generate unique family invite code
CREATE OR REPLACE FUNCTION generate_family_invite_code()
RETURNS TEXT AS $$
DECLARE
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create default tasks for user
CREATE OR REPLACE FUNCTION create_default_user_tasks(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_tasks (user_id, task_type_id, custom_subtitle, enabled)
  SELECT 
    p_user_id,
    id,
    NULL,
    default_enabled
  FROM task_types
  WHERE default_enabled = true
  ON CONFLICT (user_id, task_type_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

