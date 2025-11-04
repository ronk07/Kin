# Task Template System - Migration Guide

## Overview

This document describes the new Task Template System that replaces the hardcoded user-level task system with a flexible family-based task customization system.

## What Changed

### Before (Old System)
- **Hardcoded tasks**: Only "Workout" and "Read Bible" were available
- **User-level tasks**: Each user enabled/disabled tasks independently
- **Fixed metrics**: Only `duration_minutes`, `calories_burned`, and `bible_chapter` columns
- **String-based identification**: Tasks identified by `task_name` string ('workout', 'bible_reading')

### After (New System)
- **Template-based tasks**: 18 pre-defined task templates across 4 categories
- **Family-level tasks**: Tasks assigned at family level; all members complete the same tasks
- **Flexible metrics**: Dynamic metrics stored in JSONB, configured per task template
- **Relational identification**: Tasks referenced via `family_task_id` foreign key

---

## Database Schema Changes

### New Tables

#### 1. `task_templates`
Pre-defined task types created by the app owner.

**Columns:**
- `id` - UUID primary key
- `name` - Unique identifier (e.g., 'workout', 'meditate')
- `display_name` - Display name (e.g., 'Workout', 'Meditate')
- `category` - Task category: Physical, Mental, Spiritual, Habits
- `description` - Task description
- `icon` - Lucide icon name
- `proof_type` - Verification type: photo, timer, none
- `ai_model` - AI verification model: GymVerify, OutdoorVerify, CalmVerify, BookVerify, ProofVerify
- `points_value` - Points awarded on completion (default: 10)
- `is_active` - Whether template is active
- `display_order` - Sort order for UI display

**Seeded Templates (18 total):**

| Category | Templates |
|----------|-----------|
| Physical | Workout, Run, Walk, Stretch, Yoga, Bike, Swim |
| Mental | Meditate, Journal, Read, Gratitude |
| Spiritual | Read Bible, Prayer, Worship, Devotional |
| Habits | Drink Water, Sleep 8 Hours, No Sugar |

#### 2. `task_template_metrics`
Dynamic metrics for each task template.

**Columns:**
- `id` - UUID primary key
- `task_template_id` - Reference to task_templates
- `metric_name` - Metric identifier (e.g., 'duration', 'distance', 'calories')
- `metric_type` - Data type: number, duration, distance, text
- `unit` - Unit label (e.g., 'min', 'km', 'kcal')
- `is_required` - Whether metric is required
- `display_order` - Sort order in UI
- `placeholder` - Placeholder text for input

**Example Metrics:**
```
Workout: duration (min), calories (kcal)
Run: distance (km), duration (min), calories (kcal)
Meditate: duration (min)
Bible Reading: chapter (text)
Drink Water: glasses (count), liters (L)
```

#### 3. `family_tasks`
Family-level task assignments. All family members complete these tasks.

**Columns:**
- `id` - UUID primary key
- `family_id` - Reference to families
- `task_template_id` - Reference to task_templates
- `custom_name` - Optional custom name (e.g., "Morning Workout")
- `custom_subtitle` - Optional custom subtitle
- `is_active` - Whether task is active for family
- `created_by` - User who added the task
- `created_at`, `updated_at` - Timestamps

**Key Features:**
- One task per family per template (unique constraint)
- Soft delete via `is_active` flag
- Custom naming support

### Modified Tables

#### `task_completions`
Added new columns for the template system:

**New Columns:**
- `family_task_id` - Reference to family_tasks (nullable during transition)
- `metrics` - JSONB for flexible metric storage

**Deprecated Columns (kept for backward compatibility):**
- `task_name` - String-based task identifier (nullable)
- `duration_minutes`, `calories_burned`, `bible_chapter` - Migrated to JSONB metrics

---

## Migration Strategy

### Phase 1: Add New Tables (✅ Automatic)
The migration creates:
1. `task_templates` with 18 seeded templates
2. `task_template_metrics` with metrics for each template
3. `family_tasks` table

### Phase 2: Data Migration (✅ Automatic)
The migration automatically:
1. Creates `family_tasks` entries for each family based on user preferences
2. Maps existing `task_completions` to new `family_tasks`
3. Migrates metric data from columns to JSONB

**Example:**
```sql
-- Before migration:
users: { workout_task_enabled: true, workout_task_subtitle: "Morning routine" }
task_completions: { task_name: "workout", duration_minutes: 30, calories_burned: 200 }

-- After migration:
family_tasks: { family_id: "...", task_template_id: "workout-template-id", custom_subtitle: "Morning routine" }
task_completions: { family_task_id: "...", metrics: { "duration": 30, "calories": 200 } }
```

### Phase 3: Application Updates (⚠️ Manual Required)
Update your application code to use the new system:

1. **Query family tasks instead of user task flags**
2. **Use `family_task_id` instead of `task_name`**
3. **Store/retrieve metrics from JSONB field**
4. **UI updates for task customization**

### Phase 4: Cleanup (⏳ Future)
After confirming the migration is successful, drop deprecated columns:
```sql
ALTER TABLE users DROP COLUMN workout_task_enabled;
ALTER TABLE users DROP COLUMN workout_task_subtitle;
ALTER TABLE users DROP COLUMN bible_task_enabled;
ALTER TABLE users DROP COLUMN bible_task_subtitle;

ALTER TABLE task_completions DROP COLUMN duration_minutes;
ALTER TABLE task_completions DROP COLUMN calories_burned;
ALTER TABLE task_completions DROP COLUMN bible_chapter;
ALTER TABLE task_completions DROP COLUMN task_name;
```

---

## Helper Functions

The migration includes SQL functions to simplify task management:

### 1. `get_family_active_tasks(family_id)`
Retrieves all active tasks for a family with template details and metrics.

**Usage:**
```sql
SELECT * FROM get_family_active_tasks('family-uuid');
```

**Returns:**
```json
{
  "family_task_id": "...",
  "template_name": "workout",
  "display_name": "Workout",
  "category": "Physical",
  "description": "Gym or home workout session",
  "icon": "Dumbbell",
  "proof_type": "photo",
  "ai_model": "GymVerify",
  "points_value": 10,
  "custom_name": null,
  "custom_subtitle": "Morning routine",
  "metrics": [
    { "name": "duration", "type": "duration", "unit": "min", "required": false, "placeholder": "Duration (min)" },
    { "name": "calories", "type": "number", "unit": "kcal", "required": false, "placeholder": "Calories burned" }
  ]
}
```

### 2. `add_family_task(family_id, template_name, created_by, custom_name, custom_subtitle)`
Adds a task to a family from a template.

**Usage:**
```sql
SELECT add_family_task(
  'family-uuid',
  'meditate',
  'user-uuid',
  'Evening Meditation',
  'Before bed'
);
```

### 3. `remove_family_task(family_id, family_task_id)`
Soft-deletes a task from a family.

**Usage:**
```sql
SELECT remove_family_task('family-uuid', 'family-task-uuid');
```

---

## TypeScript API Changes

### New Types

```typescript
// New table types
export type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];
export type TaskTemplateMetric = Database['public']['Tables']['task_template_metrics']['Row'];
export type FamilyTask = Database['public']['Tables']['family_tasks']['Row'];

// Extended types with relations
export interface FamilyTaskWithTemplate extends FamilyTask {
  task_template?: TaskTemplate;
  metrics?: TaskTemplateMetric[];
}

export interface TaskCompletionWithTask extends TaskCompletion {
  family_task?: FamilyTaskWithTemplate;
}

// Enum types
export type TaskCategory = 'Physical' | 'Mental' | 'Spiritual' | 'Habits';
export type ProofType = 'photo' | 'timer' | 'none';
export type AIModel = 'GymVerify' | 'OutdoorVerify' | 'CalmVerify' | 'BookVerify' | 'ProofVerify' | null;
```

### Updated Types

```typescript
// task_completions now includes:
interface TaskCompletion {
  // ... existing fields
  family_task_id: string | null; // NEW: Reference to family_tasks
  metrics: Record<string, any>; // NEW: Flexible metric storage

  // DEPRECATED (but still present):
  task_name: string | null;
  duration_minutes: number | null;
  calories_burned: number | null;
  bible_chapter: string | null;
}
```

---

## Application Integration Guide

### 1. Fetching Family Tasks

**Old Way:**
```typescript
// Check user preferences
const { workout_task_enabled, bible_task_enabled } = user;
```

**New Way:**
```typescript
// Fetch family tasks
const { data: familyTasks } = await supabase
  .from('family_tasks')
  .select(`
    *,
    task_template:task_templates (
      *,
      metrics:task_template_metrics (*)
    )
  `)
  .eq('family_id', familyId)
  .eq('is_active', true);
```

### 2. Creating Task Completion

**Old Way:**
```typescript
await supabase.from('task_completions').insert({
  user_id: userId,
  family_id: familyId,
  task_name: 'workout',
  completed_date: new Date().toISOString(),
  duration_minutes: 30,
  calories_burned: 200
});
```

**New Way:**
```typescript
await supabase.from('task_completions').insert({
  user_id: userId,
  family_id: familyId,
  family_task_id: familyTaskId,
  completed_date: new Date().toISOString(),
  metrics: {
    duration: 30,
    calories: 200
  }
});
```

### 3. Adding a Task to Family (Onboarding/Settings)

```typescript
const { data: familyTask } = await supabase.rpc('add_family_task', {
  p_family_id: familyId,
  p_task_template_name: 'meditate',
  p_created_by: userId,
  p_custom_name: 'Evening Meditation',
  p_custom_subtitle: 'Before bed'
});
```

### 4. Rendering Dynamic Metrics Form

```typescript
function TaskDetailsForm({ familyTask }: { familyTask: FamilyTaskWithTemplate }) {
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  return (
    <View>
      {familyTask.metrics?.map((metric) => (
        <Input
          key={metric.metric_name}
          label={metric.placeholder || metric.metric_name}
          placeholder={metric.placeholder}
          required={metric.is_required}
          value={metrics[metric.metric_name] || ''}
          onChangeText={(value) => setMetrics({
            ...metrics,
            [metric.metric_name]: value
          })}
        />
      ))}
    </View>
  );
}
```

---

## UI Flow Examples

### Onboarding: Task Selection

**Step 1: Browse Templates by Category**
```
🏋️ Physical  🧘 Mental  🙏 Spiritual  🪴 Habits

[Selected: Physical]

• Workout (Gym or home workout session)
• Run (Outdoor or treadmill running)
• Walk (Walking or hiking session)
• Stretch (Stretching or flexibility work)
• Yoga (Yoga practice session)
• Bike Ride (Cycling or stationary bike)
• Swim (Swimming workout)
```

**Step 2: Customize (Optional)**
```
Task: Workout

Custom Name (optional): [Morning Workout]
Subtitle (optional): [Before breakfast]

[Add Task]
```

### Home Screen: Dynamic Task Cards

```typescript
familyTasks.map((task) => (
  <TaskCard
    key={task.id}
    title={task.custom_name || task.task_template.display_name}
    subtitle={task.custom_subtitle || task.task_template.description}
    icon={task.task_template.icon}
    onVerify={() => handleVerify(task)}
  />
))
```

### Me Page: Manage Tasks

```
Your Tasks

✅ Workout (10 pts)
✅ Read Bible (10 pts)
✅ Meditate (10 pts)

[+ Add New Task]

Available Templates
• Run
• Walk
• Journal
• Prayer
• Drink Water
...
```

---

## AI Verification Models

The new system organizes verification into context-based models:

| AI Model | Context | Example Tasks |
|----------|---------|---------------|
| **GymVerify** | Gym/Exercise | Workout, Yoga, Stretch, Swim |
| **OutdoorVerify** | Outdoor Movement | Run, Walk, Bike |
| **CalmVerify** | Stillness/Mindfulness | Meditate, Prayer |
| **BookVerify** | Reading/Study | Bible, Journal, Read, Devotional |
| **ProofVerify** | Object Detection | Drink Water, Meal prep |

### Implementation Notes

Each model will have specialized prompts for OpenAI Vision API:

```typescript
const AI_PROMPTS = {
  GymVerify: "Verify this is a photo of someone exercising in a gym or home workout setting...",
  OutdoorVerify: "Verify this is a photo of someone doing outdoor physical activity...",
  CalmVerify: "Verify this is a photo showing meditation, prayer, or quiet contemplation...",
  BookVerify: "Verify this is a photo of someone reading or studying...",
  ProofVerify: "Verify the object shown in the photo matches the task requirement..."
};
```

---

## Testing the Migration

### 1. Verify Template Seeding
```sql
SELECT category, COUNT(*)
FROM task_templates
WHERE is_active = true
GROUP BY category;
```

Expected:
```
Physical   | 7
Mental     | 4
Spiritual  | 4
Habits     | 3
```

### 2. Verify Data Migration
```sql
-- Check family_tasks were created
SELECT f.name, COUNT(ft.id) as task_count
FROM families f
LEFT JOIN family_tasks ft ON f.id = ft.family_id
GROUP BY f.id, f.name;

-- Check task_completions were linked
SELECT
  COUNT(*) as total,
  COUNT(family_task_id) as linked,
  COUNT(task_name) as legacy
FROM task_completions;
```

### 3. Test Helper Functions
```sql
-- Get tasks for a family
SELECT * FROM get_family_active_tasks('your-family-uuid');

-- Add a new task
SELECT add_family_task(
  'your-family-uuid',
  'meditate',
  'your-user-uuid'
);
```

---

## Rollback Plan

If issues arise, the migration preserves all original data:

1. **Old columns still exist** - `task_name`, `duration_minutes`, etc.
2. **Revert application code** to use old columns
3. **Drop new tables** if needed:
```sql
DROP TABLE IF EXISTS task_template_metrics CASCADE;
DROP TABLE IF EXISTS family_tasks CASCADE;
DROP TABLE IF EXISTS task_templates CASCADE;
```

---

## Next Steps

### Immediate (Required)
1. ✅ Run migration on development database
2. ⬜ Update application code to use new schema
3. ⬜ Update UI components for task customization
4. ⬜ Update onboarding flow to include task selection
5. ⬜ Update me page to include task management

### Short-term
1. ⬜ Implement AI model routing based on `task_template.ai_model`
2. ⬜ Create task selection modal with categories
3. ⬜ Add task management UI on me page
4. ⬜ Update streak calculation to work with family_tasks

### Long-term
1. ⬜ Add custom task templates (user-defined)
2. ⬜ Add task scheduling (specific days of week)
3. ⬜ Add task goals (e.g., "Run 5km")
4. ⬜ Add task streaks per task (not just global streak)

---

## FAQs

### Q: Can users still use the old Workout and Bible Reading tasks?
**A:** Yes! The migration automatically creates `family_tasks` entries for existing families based on their current user preferences. No functionality is lost.

### Q: What happens to existing task completions?
**A:** They are preserved and automatically linked to the new `family_tasks` via the `family_task_id` column. Old data remains in the `task_name` column for backward compatibility.

### Q: Can families have different tasks?
**A:** Yes! Each family can select which task templates to enable via the `family_tasks` table.

### Q: Can users customize task names?
**A:** Yes! The `family_tasks.custom_name` and `custom_subtitle` fields allow families to personalize task names.

### Q: What if I want to add a new task template?
**A:** Insert into `task_templates` and `task_template_metrics` tables. Then families can add it via `add_family_task()` function.

### Q: Are tasks still verified with OpenAI?
**A:** Yes! The `task_template.ai_model` field specifies which verification model to use. Each model has a specialized prompt for different task types.

### Q: When should I drop the deprecated columns?
**A:** After confirming:
1. All families have migrated to `family_tasks`
2. All completions use `family_task_id`
3. Application no longer references old columns
4. Production testing is complete

---

## Support

For questions or issues with the migration:
1. Check the migration logs in Supabase
2. Review this documentation
3. Test queries against development database first
4. Backup production data before running migration

---

**Migration Version:** 008
**Created:** 2025-11-04
**Status:** Ready for deployment
