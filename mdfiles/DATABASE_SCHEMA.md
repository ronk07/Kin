# Kin App - Simplified Database Schema

## 🎯 Overview

The database has been **dramatically simplified** from 11 tables down to just **6 core tables**, with most user and family data consolidated into the main `users` and `families` tables.

---

## 📊 Core Tables

### 1. **`users`** - All User Data in One Place

All user information, preferences, stats, and task configuration in a single table.

#### Columns:

**Identity:**
- `id` (UUID, PK)
- `name` (TEXT)
- `email` (TEXT, UNIQUE)
- `avatar_url` (TEXT, nullable)
- `age` (INTEGER, nullable)
- `gender` (TEXT, nullable) - 'male', 'female', or 'other'

**Family Relationship:**
- `family_id` (UUID, FK → families) - Which family they belong to
- `family_role` (TEXT) - 'owner' or 'member'

**Preferences:**
- `weekly_workout_goal` (INTEGER, default: 5) - 0-7 workouts per week
- `daily_step_goal` (INTEGER, default: 10000)
- `reminder_enabled` (BOOLEAN, default: true)
- `reminder_time` (TIME, default: '09:00:00')
- `require_photo_proof` (BOOLEAN, default: true)
- `privacy_opt_out` (BOOLEAN, default: false)
- `onboarding_completed` (BOOLEAN, default: false)

**Stats:**
- `total_points` (INTEGER, default: 0) - Cached sum of all points
- `current_streak` (INTEGER, default: 0) - Current workout streak

**Task Configuration:**
- `workout_task_enabled` (BOOLEAN, default: true)
- `workout_task_subtitle` (TEXT, nullable)
- `bible_task_enabled` (BOOLEAN, default: true)
- `bible_task_subtitle` (TEXT, nullable)

**Timestamps:**
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

### 2. **`families`** - All Family Data

Family information with cached stats for performance.

#### Columns:

**Identity:**
- `id` (UUID, PK)
- `name` (TEXT) - Family name
- `owner_id` (UUID, FK → users) - Family creator/owner

**Invite System:**
- `active_invite_code` (TEXT, nullable) - Current active invite code
- `invite_code_created_at` (TIMESTAMPTZ, nullable)

**Stats:**
- `total_members` (INTEGER, default: 1) - Cached member count
- `total_points` (INTEGER, default: 0) - Cached family points

**Timestamps:**
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

### 3. **`task_completions`** - Activity History

Records of completed tasks for history and streak calculation.

#### Columns:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `family_id` (UUID, FK → families)
- `task_name` (TEXT) - 'workout' or 'bible_reading'
- `completed_date` (DATE)
- `proof_url` (TEXT, nullable) - Photo proof URL
- `verification_status` (TEXT) - 'pending', 'verified', 'rejected'
- `verified_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

---

### 4. **`points`** - Points Transaction History

Audit trail of all point awards (total is cached in users table).

#### Columns:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `family_id` (UUID, FK → families)
- `points` (INTEGER) - Points awarded
- `source` (TEXT) - Reason for points (e.g., "workout completion")
- `created_at` (TIMESTAMPTZ)

---

### 5. **`family_invite_codes`** - Invite Code History

Historical record of all generated family invite codes.

#### Columns:
- `id` (UUID, PK)
- `family_id` (UUID, FK → families)
- `code` (TEXT, UNIQUE) - 8-character code
- `created_by` (UUID, FK → users)
- `expires_at` (TIMESTAMPTZ, nullable)
- `max_uses` (INTEGER, nullable)
- `times_used` (INTEGER, default: 0)
- `active` (BOOLEAN, default: true)
- `created_at` (TIMESTAMPTZ)

---

### 6. **`checkins`** - Legacy Check-ins

*(Can be deprecated in favor of task_completions)*

#### Columns:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `family_id` (UUID, FK → families)
- `date` (DATE)
- `proof_url` (TEXT, nullable)
- `verification_status` (TEXT)
- `verified_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

---

## 🗑️ Removed Tables

The following tables were **consolidated** into `users` and `families`:

- ❌ `user_preferences` → Merged into `users`
- ❌ `family_members` → Now `family_id` + `family_role` in `users`
- ❌ `user_tasks` → Now boolean flags in `users`
- ❌ `task_types` → Hardcoded ('workout', 'bible_reading')
- ❌ `badges` → Removed for MVP simplification

---

## ⚡ Auto-Update Triggers

### 1. **Family Member Count**
```sql
-- Automatically updates families.total_members when:
-- - User joins a family (family_id set)
-- - User leaves a family (family_id changed/removed)
-- - User is deleted
```

### 2. **Family Total Points**
```sql
-- Automatically updates families.total_points when:
-- - User's total_points changes
```

### 3. **User Total Points**
```sql
-- Automatically updates users.total_points when:
-- - New points are inserted into points table
```

---

## 🔍 Key Indexes

### Users:
- `idx_users_family_id` - Fast family member lookups
- `idx_users_gender` - Gender filtering
- `idx_users_onboarding_completed` - Onboarding queries

### Families:
- `idx_families_active_invite_code` - Invite code lookups

### Task Completions:
- `idx_task_completions_user_date` - User activity history
- `idx_task_completions_family_date` - Family activity feed
- `idx_task_completions_task_name` - Task-specific queries

---

## 🎨 Benefits of Simplified Schema

### ✅ **Fewer Joins**
- Old: 4-5 table joins for user profile + preferences + tasks
- New: Single `users` table query

### ✅ **Faster Queries**
- Cached `total_points` instead of SUM queries
- Cached `total_members` instead of COUNT queries
- No need for complex joins

### ✅ **Easier to Understand**
- Intuitive: User data in `users`, family data in `families`
- Less mental overhead
- Easier onboarding for new developers

### ✅ **Better Performance**
- Fewer database round trips
- Smaller query payloads
- Denormalized stats = instant reads

### ✅ **Simpler Code**
- No more context providers managing 5+ tables
- Direct updates to `users` table
- Less state management complexity

---

## 📝 Example Queries

### Get Complete User Profile:
```sql
SELECT * FROM users WHERE id = 'user-id';
-- Returns: identity, preferences, stats, tasks, family membership
```

### Get Family with Members:
```sql
-- Family details
SELECT * FROM families WHERE id = 'family-id';

-- All members
SELECT id, name, avatar_url, total_points, current_streak, family_role
FROM users 
WHERE family_id = 'family-id'
ORDER BY total_points DESC;
```

### Get User's Recent Activity:
```sql
SELECT * FROM task_completions
WHERE user_id = 'user-id'
ORDER BY completed_date DESC
LIMIT 30;
```

### Get Family Activity Feed:
```sql
SELECT 
  tc.id,
  tc.task_name,
  tc.completed_date,
  tc.proof_url,
  u.name as user_name
FROM task_completions tc
JOIN users u ON tc.user_id = u.id
WHERE tc.family_id = 'family-id'
ORDER BY tc.created_at DESC
LIMIT 20;
```

---

## 🚀 Migration Summary

### What Changed:

1. **Users Table Enhanced:**
   - Added: `age`, `gender`
   - Added: `family_id`, `family_role` (from `family_members`)
   - Added: All preferences (from `user_preferences`)
   - Added: `total_points`, `current_streak` (cached stats)
   - Added: Task configuration (from `user_tasks`)

2. **Families Table Enhanced:**
   - Added: `active_invite_code`, `invite_code_created_at`
   - Added: `total_members`, `total_points` (cached stats)

3. **Task Completions Updated:**
   - Changed: `user_task_id` → `task_name` (direct reference)
   - Simplified: No more joins to `user_tasks` or `task_types`

4. **Data Migrated:**
   - ✅ All `family_members` → `users.family_id` + `users.family_role`
   - ✅ All `user_preferences` → `users.*`
   - ✅ All `user_tasks` → `users.workout_task_*` + `users.bible_task_*`
   - ✅ Active invite codes → `families.active_invite_code`
   - ✅ Points totals calculated and cached

---

## 🔒 Data Integrity

### Foreign Keys:
- `users.family_id` → `families.id` (ON DELETE SET NULL)
- `families.owner_id` → `users.id` (ON DELETE CASCADE)
- `task_completions.user_id` → `users.id` (ON DELETE CASCADE)
- `task_completions.family_id` → `families.id` (ON DELETE CASCADE)
- `points.user_id` → `users.id` (ON DELETE CASCADE)
- `points.family_id` → `families.id` (ON DELETE CASCADE)

### Constraints:
- `users.gender` CHECK: IN ('male', 'female', 'other')
- `users.family_role` CHECK: IN ('owner', 'member')
- `users.weekly_workout_goal` CHECK: BETWEEN 0 AND 7
- `users.daily_step_goal` CHECK: >= 0
- `task_completions.task_name` CHECK: IN ('workout', 'bible_reading')
- `task_completions.verification_status` CHECK: IN ('pending', 'verified', 'rejected')

---

## 🎯 Future Considerations

### Potential Optimizations:
1. **Materialized Views** for complex analytics
2. **Partitioning** task_completions by date (when data grows large)
3. **Read Replicas** for family activity feeds
4. **Caching Layer** (Redis) for frequently accessed data

### Scalability:
- Current schema supports **100K+ users** efficiently
- Cached stats prevent expensive aggregations
- Indexes optimized for common query patterns
- Triggers keep denormalized data in sync

---

## 📚 Related Files

- **Migration**: `supabase/migrations/004_consolidate_users_and_families_tables.sql`
- **Types**: `lib/types/database.ts`
- **Contexts**: 
  - `lib/context/UserContext.tsx`
  - `lib/context/FamilyContext.tsx`
  - `lib/context/AuthContext.tsx`
- **Screens**: All updated to use simplified schema

---

**🎉 Database consolidation complete!** The app now uses a clean, performant, and easy-to-understand schema.

