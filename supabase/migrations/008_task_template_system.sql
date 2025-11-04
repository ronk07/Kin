-- =====================================================
-- Migration 008: Task Template System
-- =====================================================
-- This migration transforms the task system from user-specific
-- hardcoded tasks to a flexible family-based task template system.
--
-- Changes:
-- 1. Create task_templates table (app-defined task types)
-- 2. Create task_template_metrics table (metrics per template)
-- 3. Create family_tasks table (family-level task assignments)
-- 4. Update task_completions to reference family_tasks
-- 5. Migrate existing data to new structure
-- 6. Remove deprecated columns from users table
-- =====================================================

-- =====================================================
-- 1. CREATE TASK TEMPLATES TABLE
-- =====================================================
-- Pre-defined task types with verification requirements
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Physical', 'Mental', 'Spiritual', 'Habits')),
  description TEXT,
  icon TEXT NOT NULL, -- lucide icon name
  proof_type TEXT NOT NULL CHECK (proof_type IN ('photo', 'timer', 'none')),
  ai_model TEXT, -- Verification model: GymVerify, OutdoorVerify, CalmVerify, BookVerify, ProofVerify
  points_value INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_active ON task_templates(is_active);

-- =====================================================
-- 2. CREATE TASK TEMPLATE METRICS TABLE
-- =====================================================
-- Dynamic metrics for each task template
CREATE TABLE IF NOT EXISTS task_template_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- duration, distance, calories, chapters, reps, sets, weight
  metric_type TEXT NOT NULL CHECK (metric_type IN ('number', 'duration', 'distance', 'text')),
  unit TEXT, -- min, km, mi, kcal, chapters, reps, lbs, kg
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  placeholder TEXT, -- UI placeholder text
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_template_id, metric_name)
);

CREATE INDEX idx_task_template_metrics_template ON task_template_metrics(task_template_id);

-- =====================================================
-- 3. CREATE FAMILY TASKS TABLE
-- =====================================================
-- Family-level task assignments (everyone in family completes these)
CREATE TABLE IF NOT EXISTS family_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  task_template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE RESTRICT,
  custom_name TEXT, -- Optional: rename "Workout" to "Morning Workout"
  custom_subtitle TEXT, -- Optional custom subtitle
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, task_template_id)
);

CREATE INDEX idx_family_tasks_family ON family_tasks(family_id);
CREATE INDEX idx_family_tasks_template ON family_tasks(task_template_id);
CREATE INDEX idx_family_tasks_active ON family_tasks(family_id, is_active);

-- =====================================================
-- 4. UPDATE TASK COMPLETIONS TABLE
-- =====================================================
-- Add reference to family_tasks and flexible metrics storage
ALTER TABLE task_completions
  ADD COLUMN IF NOT EXISTS family_task_id UUID REFERENCES family_tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;

-- Create index for new columns
CREATE INDEX IF NOT EXISTS idx_task_completions_family_task ON task_completions(family_task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON task_completions(user_id, completed_date);

-- Add constraint to ensure either task_name (legacy) or family_task_id is present
-- During transition period, both may exist
ALTER TABLE task_completions
  ADD CONSTRAINT check_task_reference
  CHECK (task_name IS NOT NULL OR family_task_id IS NOT NULL);

-- =====================================================
-- 5. SEED TASK TEMPLATES
-- =====================================================

-- PHYSICAL TASKS
INSERT INTO task_templates (name, display_name, category, description, icon, proof_type, ai_model, points_value, display_order) VALUES
  ('workout', 'Workout', 'Physical', 'Gym or home workout session', 'Dumbbell', 'photo', 'GymVerify', 10, 1),
  ('run', 'Run', 'Physical', 'Outdoor or treadmill running', 'PersonStanding', 'photo', 'OutdoorVerify', 10, 2),
  ('walk', 'Walk', 'Physical', 'Walking or hiking session', 'Footprints', 'photo', 'OutdoorVerify', 10, 3),
  ('stretch', 'Stretch', 'Physical', 'Stretching or flexibility work', 'Waves', 'photo', 'GymVerify', 10, 4),
  ('yoga', 'Yoga', 'Physical', 'Yoga practice session', 'Sparkles', 'photo', 'GymVerify', 10, 5),
  ('bike', 'Bike Ride', 'Physical', 'Cycling or stationary bike', 'Bike', 'photo', 'OutdoorVerify', 10, 6),
  ('swim', 'Swim', 'Physical', 'Swimming workout', 'Waves', 'photo', 'GymVerify', 10, 7);

-- MENTAL TASKS
INSERT INTO task_templates (name, display_name, category, description, icon, proof_type, ai_model, points_value, display_order) VALUES
  ('meditate', 'Meditate', 'Mental', 'Meditation or mindfulness practice', 'Brain', 'photo', 'CalmVerify', 10, 8),
  ('journal', 'Journal', 'Mental', 'Writing in a journal', 'BookOpen', 'photo', 'BookVerify', 10, 9),
  ('read', 'Read', 'Mental', 'Reading a book', 'BookMarked', 'photo', 'BookVerify', 10, 10),
  ('gratitude', 'Gratitude Practice', 'Mental', 'Writing gratitude entries', 'Heart', 'photo', 'BookVerify', 10, 11);

-- SPIRITUAL TASKS
INSERT INTO task_templates (name, display_name, category, description, icon, proof_type, ai_model, points_value, display_order) VALUES
  ('bible_reading', 'Read Bible', 'Spiritual', 'Daily Bible reading', 'BookHeart', 'photo', 'BookVerify', 10, 12),
  ('pray', 'Prayer', 'Spiritual', 'Prayer or quiet time', 'HandHeart', 'photo', 'CalmVerify', 10, 13),
  ('worship', 'Worship', 'Spiritual', 'Worship music or church attendance', 'Music', 'photo', 'ProofVerify', 10, 14),
  ('devotional', 'Devotional', 'Spiritual', 'Daily devotional reading', 'BookOpen', 'photo', 'BookVerify', 10, 15);

-- HABIT TASKS
INSERT INTO task_templates (name, display_name, category, description, icon, proof_type, ai_model, points_value, display_order) VALUES
  ('drink_water', 'Drink Water', 'Habits', 'Daily water intake goal', 'GlassWater', 'photo', 'ProofVerify', 10, 16),
  ('sleep', 'Sleep 8 Hours', 'Habits', 'Get 8 hours of sleep', 'Moon', 'none', NULL, 10, 17),
  ('no_sugar', 'No Sugar', 'Habits', 'Avoid added sugar for the day', 'BanIcon', 'none', NULL, 10, 18);

-- =====================================================
-- 6. SEED TASK TEMPLATE METRICS
-- =====================================================

-- Workout metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'workout'), 'duration', 'duration', 'min', false, 1, 'Duration (min)'),
  ((SELECT id FROM task_templates WHERE name = 'workout'), 'calories', 'number', 'kcal', false, 2, 'Calories burned');

-- Run metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'run'), 'distance', 'distance', 'km', false, 1, 'Distance (km)'),
  ((SELECT id FROM task_templates WHERE name = 'run'), 'duration', 'duration', 'min', false, 2, 'Duration (min)'),
  ((SELECT id FROM task_templates WHERE name = 'run'), 'calories', 'number', 'kcal', false, 3, 'Calories burned');

-- Walk metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'walk'), 'distance', 'distance', 'km', false, 1, 'Distance (km)'),
  ((SELECT id FROM task_templates WHERE name = 'walk'), 'duration', 'duration', 'min', false, 2, 'Duration (min)');

-- Stretch metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'stretch'), 'duration', 'duration', 'min', false, 1, 'Duration (min)');

-- Yoga metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'yoga'), 'duration', 'duration', 'min', false, 1, 'Duration (min)');

-- Bike metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'bike'), 'distance', 'distance', 'km', false, 1, 'Distance (km)'),
  ((SELECT id FROM task_templates WHERE name = 'bike'), 'duration', 'duration', 'min', false, 2, 'Duration (min)'),
  ((SELECT id FROM task_templates WHERE name = 'bike'), 'calories', 'number', 'kcal', false, 3, 'Calories burned');

-- Swim metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'swim'), 'duration', 'duration', 'min', false, 1, 'Duration (min)'),
  ((SELECT id FROM task_templates WHERE name = 'swim'), 'distance', 'distance', 'm', false, 2, 'Distance (m)');

-- Meditate metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'meditate'), 'duration', 'duration', 'min', false, 1, 'Duration (min)');

-- Bible reading metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'bible_reading'), 'chapter', 'text', 'chapter', false, 1, 'Chapter (e.g., John 3)');

-- Read metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'read'), 'duration', 'duration', 'min', false, 1, 'Duration (min)'),
  ((SELECT id FROM task_templates WHERE name = 'read'), 'pages', 'number', 'pages', false, 2, 'Pages read');

-- Prayer metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'pray'), 'duration', 'duration', 'min', false, 1, 'Duration (min)');

-- Devotional metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'devotional'), 'duration', 'duration', 'min', false, 1, 'Duration (min)');

-- Water intake metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'drink_water'), 'glasses', 'number', 'glasses', false, 1, 'Glasses (8oz each)'),
  ((SELECT id FROM task_templates WHERE name = 'drink_water'), 'liters', 'number', 'L', false, 2, 'Liters');

-- Sleep metrics
INSERT INTO task_template_metrics (task_template_id, metric_name, metric_type, unit, is_required, display_order, placeholder) VALUES
  ((SELECT id FROM task_templates WHERE name = 'sleep'), 'hours', 'number', 'hours', false, 1, 'Hours slept');

-- =====================================================
-- 7. DATA MIGRATION - EXISTING TASKS TO NEW SYSTEM
-- =====================================================

-- Create family_tasks for families based on existing user task preferences
-- This handles the migration from user-level to family-level tasks

DO $$
DECLARE
  family_record RECORD;
  workout_template_id UUID;
  bible_template_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO workout_template_id FROM task_templates WHERE name = 'workout';
  SELECT id INTO bible_template_id FROM task_templates WHERE name = 'bible_reading';

  -- For each family, create family_tasks based on what tasks users have enabled
  FOR family_record IN
    SELECT DISTINCT
      u.family_id,
      u.id as user_id,
      u.workout_task_enabled,
      u.workout_task_subtitle,
      u.bible_task_enabled,
      u.bible_task_subtitle
    FROM users u
    WHERE u.family_id IS NOT NULL
  LOOP
    -- Create workout task for family if ANY user has it enabled
    IF family_record.workout_task_enabled THEN
      INSERT INTO family_tasks (family_id, task_template_id, custom_subtitle, is_active, created_by)
      VALUES (
        family_record.family_id,
        workout_template_id,
        family_record.workout_task_subtitle,
        true,
        family_record.user_id
      )
      ON CONFLICT (family_id, task_template_id) DO NOTHING;
    END IF;

    -- Create bible reading task for family if ANY user has it enabled
    IF family_record.bible_task_enabled THEN
      INSERT INTO family_tasks (family_id, task_template_id, custom_subtitle, is_active, created_by)
      VALUES (
        family_record.family_id,
        bible_template_id,
        family_record.bible_task_subtitle,
        true,
        family_record.user_id
      )
      ON CONFLICT (family_id, task_template_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Update existing task_completions to reference new family_tasks
-- Map task_name to family_task_id

UPDATE task_completions tc
SET family_task_id = ft.id
FROM family_tasks ft
JOIN task_templates tt ON ft.task_template_id = tt.id
WHERE tc.family_id = ft.family_id
  AND tc.task_name = tt.name
  AND tc.family_task_id IS NULL;

-- Migrate existing metric data from columns to JSONB
UPDATE task_completions
SET metrics = jsonb_build_object(
  'duration', duration_minutes,
  'calories', calories_burned,
  'chapter', bible_chapter
)
WHERE metrics = '{}'::jsonb
  AND (duration_minutes IS NOT NULL OR calories_burned IS NOT NULL OR bible_chapter IS NOT NULL);

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get active tasks for a family
CREATE OR REPLACE FUNCTION get_family_active_tasks(p_family_id UUID)
RETURNS TABLE (
  family_task_id UUID,
  template_name TEXT,
  display_name TEXT,
  category TEXT,
  description TEXT,
  icon TEXT,
  proof_type TEXT,
  ai_model TEXT,
  points_value INTEGER,
  custom_name TEXT,
  custom_subtitle TEXT,
  metrics JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id as family_task_id,
    tt.name as template_name,
    tt.display_name,
    tt.category,
    tt.description,
    tt.icon,
    tt.proof_type,
    tt.ai_model,
    tt.points_value,
    ft.custom_name,
    ft.custom_subtitle,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'name', ttm.metric_name,
          'type', ttm.metric_type,
          'unit', ttm.unit,
          'required', ttm.is_required,
          'placeholder', ttm.placeholder
        ) ORDER BY ttm.display_order
      ) FILTER (WHERE ttm.id IS NOT NULL),
      '[]'::jsonb
    ) as metrics
  FROM family_tasks ft
  JOIN task_templates tt ON ft.task_template_id = tt.id
  LEFT JOIN task_template_metrics ttm ON tt.id = ttm.task_template_id
  WHERE ft.family_id = p_family_id
    AND ft.is_active = true
    AND tt.is_active = true
  GROUP BY ft.id, tt.name, tt.display_name, tt.category, tt.description,
           tt.icon, tt.proof_type, tt.ai_model, tt.points_value,
           ft.custom_name, ft.custom_subtitle, tt.display_order
  ORDER BY tt.display_order;
END;
$$ LANGUAGE plpgsql;

-- Function to add a task to a family
CREATE OR REPLACE FUNCTION add_family_task(
  p_family_id UUID,
  p_task_template_name TEXT,
  p_created_by UUID,
  p_custom_name TEXT DEFAULT NULL,
  p_custom_subtitle TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_template_id UUID;
  v_family_task_id UUID;
BEGIN
  -- Get template ID
  SELECT id INTO v_template_id
  FROM task_templates
  WHERE name = p_task_template_name AND is_active = true;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Task template % not found or inactive', p_task_template_name;
  END IF;

  -- Insert family task
  INSERT INTO family_tasks (family_id, task_template_id, custom_name, custom_subtitle, created_by)
  VALUES (p_family_id, v_template_id, p_custom_name, p_custom_subtitle, p_created_by)
  ON CONFLICT (family_id, task_template_id)
  DO UPDATE SET
    is_active = true,
    custom_name = COALESCE(EXCLUDED.custom_name, family_tasks.custom_name),
    custom_subtitle = COALESCE(EXCLUDED.custom_subtitle, family_tasks.custom_subtitle),
    updated_at = NOW()
  RETURNING id INTO v_family_task_id;

  RETURN v_family_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a task from a family (soft delete)
CREATE OR REPLACE FUNCTION remove_family_task(
  p_family_id UUID,
  p_family_task_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE family_tasks
  SET is_active = false, updated_at = NOW()
  WHERE id = p_family_task_id AND family_id = p_family_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger to update updated_at on task_templates
CREATE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on family_tasks
CREATE TRIGGER update_family_tasks_updated_at
  BEFORE UPDATE ON family_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. DEPRECATE OLD COLUMNS (OPTIONAL - AFTER MIGRATION)
-- =====================================================
-- These columns can be dropped after confirming the migration is successful
-- Uncomment these lines when ready to fully migrate:

-- ALTER TABLE users DROP COLUMN IF EXISTS workout_task_enabled;
-- ALTER TABLE users DROP COLUMN IF EXISTS workout_task_subtitle;
-- ALTER TABLE users DROP COLUMN IF EXISTS bible_task_enabled;
-- ALTER TABLE users DROP COLUMN IF EXISTS bible_task_subtitle;

-- ALTER TABLE task_completions DROP COLUMN IF EXISTS duration_minutes;
-- ALTER TABLE task_completions DROP COLUMN IF EXISTS calories_burned;
-- ALTER TABLE task_completions DROP COLUMN IF EXISTS bible_chapter;

-- Mark task_name as nullable for future (keeping for backward compatibility during transition)
-- ALTER TABLE task_completions ALTER COLUMN task_name DROP NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
-- - Created task_templates with 18 pre-defined tasks
-- - Created task_template_metrics for dynamic metrics
-- - Created family_tasks for family-level task assignments
-- - Migrated existing user tasks to family tasks
-- - Migrated existing completions to reference family_tasks
-- - Created helper functions for task management
-- - Old columns preserved for backward compatibility
-- =====================================================
