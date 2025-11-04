# Kin - Codebase Documentation

## Project Overview

**Kin** is a family faith & fitness tracker mobile application that helps families stay consistent, spiritually grounded, and physically active through streaks, points, photo proof validation, and faith-based motivation.

- **Type:** Cross-platform mobile app (iOS, Android, Web)
- **Framework:** React Native with Expo
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **AI Integration:** OpenAI Vision API for photo verification
- **Status:** MVP with authentication, onboarding, and core features implemented

---

## Technology Stack

### Frontend
- **React Native** v0.81.5 - Mobile UI framework
- **Expo** v54.0.22 - Development platform
- **Expo Router** v6.0.13 - File-based routing
- **React** v19.1.0 - Core UI library
- **TypeScript** v5.9.2 - Type safety

### State Management
- **React Context API** - Global state (Auth, User, Family)
- **Custom Hooks** - Business logic encapsulation

### UI & Styling
- **React Native StyleSheet** - Native styling
- **expo-linear-gradient** - Gradient backgrounds
- **lucide-react-native** - Icon library
- **react-native-reanimated** v4.1.1 - Animations

### Backend & Services
- **Supabase** - Database, authentication, file storage
- **OpenAI API** (GPT-4o-mini) - Photo verification
- **Apple HealthKit** - Step counting (iOS only)

### Development Tools
- **TypeScript** - Type safety
- **Expo CLI** - Development server and builds
- **EAS Build** - Cloud build system

---

## Directory Structure

```
/home/user/Kin/
├── app/                          # Expo Router screens and navigation
│   ├── (tabs)/                  # Main app tabs
│   │   ├── index.tsx            # Home/Dashboard (Line 1+)
│   │   ├── family.tsx           # Family community page
│   │   ├── me.tsx              # Profile & settings
│   │   └── _layout.tsx          # Tab navigation config
│   ├── onboarding/              # 5-step onboarding flow
│   │   ├── profile.tsx          # Step 1: Name setup
│   │   ├── family.tsx           # Step 2: Create/join family
│   │   ├── goals.tsx            # Step 3: Set goals
│   │   ├── reminders.tsx        # Step 5: Configure reminders
│   │   └── _layout.tsx          # Onboarding stack
│   ├── _layout.tsx              # Root layout with providers
│   ├── auth.tsx                 # Login/Signup screen
│   ├── welcome.tsx              # Landing screen
│   └── modal.tsx                # Modal template
│
├── lib/                          # Core business logic
│   ├── api/
│   │   └── openai.ts            # OpenAI Vision API integration
│   ├── components/              # Reusable UI components
│   │   ├── Button.tsx           # Styled button
│   │   ├── Card.tsx             # Card container
│   │   ├── CheckInButton.tsx    # Check-in button
│   │   ├── Container.tsx        # Page container with gradient
│   │   ├── DailyScripture.tsx   # Scripture display
│   │   ├── Feed.tsx             # Activity feed
│   │   ├── Leaderboard.tsx      # Family leaderboard
│   │   ├── MemberCard.tsx       # Family member card
│   │   ├── ProfileCard.tsx      # User profile display
│   │   ├── SettingsSection.tsx  # Settings UI section
│   │   ├── StepCounter.tsx      # Step count tracker
│   │   ├── StreakRing.tsx       # Visual streak ring
│   │   ├── TaskCard.tsx         # Task completion card
│   │   ├── TaskDetailsForm.tsx  # Task details form
│   │   ├── VerificationModal.tsx # Photo verification results
│   │   ├── WeekTracker.tsx      # Weekly completion grid
│   │   └── WorkoutCard.tsx      # Workout history card
│   ├── context/                 # React Context providers
│   │   ├── AuthContext.tsx      # Authentication & session
│   │   ├── UserContext.tsx      # User profile & preferences
│   │   └── FamilyContext.tsx    # Family data & members
│   ├── hooks/                   # Custom React hooks
│   │   ├── useCheckIn.ts        # Check-in logic with verification
│   │   └── useHealthKit.ts      # Apple HealthKit integration
│   ├── supabase/
│   │   └── client.ts            # Supabase client config
│   ├── types/
│   │   └── database.ts          # TypeScript database types
│   └── utils/
│       ├── streak.ts            # Streak calculation logic
│       └── familyCode.ts        # Family code generation
│
├── supabase/
│   └── migrations/              # Database schema migrations
│       ├── 001_initial_schema.sql
│       ├── 002_user_preferences_and_tasks.sql
│       ├── 003_add_user_profile_fields.sql
│       ├── 006_create_storage_bucket.sql
│       └── 007_add_task_verification_details.sql
│
├── constants/
│   ├── Colors.ts               # Color exports
│   └── theme.ts                # Design system tokens
│
├── assets/                      # Images, fonts, icons
├── mdfiles/                     # Documentation
├── package.json                 # Dependencies & scripts
├── app.json                     # Expo configuration
├── tsconfig.json               # TypeScript config
└── eas.json                    # EAS Build config
```

---

## Application Architecture

### Navigation Flow

```
Root (_layout.tsx)
├── Not Authenticated
│   ├── /welcome
│   └── /auth (Login/Signup)
│
├── Authenticated but Not Onboarded
│   └── /onboarding (5 steps)
│       ├── /profile
│       ├── /family
│       ├── /goals
│       ├── /tasks
│       └── /reminders
│
└── Authenticated & Onboarded
    └── /(tabs)
        ├── index (Home)
        ├── family (Family)
        └── me (Profile)
```

### State Management Architecture

**Context Providers:**
1. **AuthContext** (`lib/context/AuthContext.tsx`)
   - User session management
   - Login/logout/signup methods
   - Onboarding status tracking
   - Session persistence with AsyncStorage

2. **UserContext** (`lib/context/UserContext.tsx`)
   - User profile data
   - Preferences (photo proof, privacy, reminders)
   - Task configuration (workout, bible reading)
   - Goals (weekly workouts, daily steps)

3. **FamilyContext** (`lib/context/FamilyContext.tsx`)
   - Family information
   - Family members list
   - User role (owner/member)
   - Recent activities

### Data Flow

```
User Action → Component → Context Update → Supabase → Component Re-render
                   ↓
            OpenAI (photo verification)
```

---

## Database Schema

### Core Tables

1. **users** - All user data
   - Identity: id, name, email, avatar_url, age, gender
   - Family: family_id, family_role
   - Preferences: weekly_workout_goal, daily_step_goal, reminder_enabled, require_photo_proof, privacy_opt_out
   - Stats: total_points, current_streak
   - Tasks: workout_task_enabled, bible_task_enabled + subtitles

2. **families** - Family data
   - Identity: id, name, owner_id
   - Invites: active_invite_code, invite_code_created_at
   - Stats: total_members, total_points

3. **task_completions** - Daily task tracking
   - user_id, family_id, task_name (workout/bible_reading)
   - completed_date, proof_url
   - Verification: verification_status, verified_at, verification_confidence, verification_reason
   - Details: calories_burned, duration_minutes, bible_chapter

4. **points** - Points transaction log
   - user_id, family_id, points, source

5. **family_invite_codes** - Invite system
   - family_id, code, created_by, expires_at, max_uses, times_used

6. **daily_steps** - Step count history
   - user_id, date, steps, source

7. **checkins** - (Legacy, being replaced by task_completions)

### Storage Buckets

- **workout-proofs** - Private bucket for photo proof storage

---

## Key Features

### 1. User Authentication & Onboarding
- Email/password authentication via Supabase Auth
- 5-step onboarding flow for new users
- Session persistence with AsyncStorage

**Files:**
- `app/auth.tsx` - Login/signup screen
- `app/onboarding/*` - Onboarding steps
- `lib/context/AuthContext.tsx` - Auth state management

### 2. Task Management System

**Workout Task:**
- Photo proof requirement
- OpenAI Vision API verification
- Optional details: calories burned, duration
- 10 points awarded on verification

**Bible Reading Task:**
- Photo proof requirement
- Bible chapter input required
- OpenAI Vision verification
- 10 points awarded on verification

**Files:**
- `lib/components/TaskCard.tsx` - Task UI component
- `lib/components/TaskDetailsForm.tsx` - Additional info form
- `lib/hooks/useCheckIn.ts` - Check-in logic
- `lib/api/openai.ts` - Photo verification

### 3. Photo Verification System

**Process:**
1. User captures/selects photo
2. Image converted to Base64
3. Sent to OpenAI GPT-4o-mini Vision API
4. AI analyzes image with task-specific prompt
5. Returns: `{ isVerified: boolean, confidence: 0-1, reason: string }`
6. If verified + confidence > 0.8 → award points
7. Display results in VerificationModal

**Files:**
- `lib/api/openai.ts` - OpenAI integration
- `lib/components/VerificationModal.tsx` - Results display
- `lib/hooks/useCheckIn.ts` - Verification orchestration

### 4. Streak System

**Calculation:**
- Requires BOTH workout AND bible_reading completed daily
- Consecutive day tracking
- Resets if any day is missed
- Visual ring indicator on home screen

**Files:**
- `lib/utils/streak.ts` - Streak calculation logic
- `lib/components/StreakRing.tsx` - Visual display

### 5. Points & Gamification

**Point Sources:**
- Verified workout: 10 points
- Verified bible reading: 10 points
- Weekly goal completion: bonus points

**Features:**
- Transaction-based logging
- Family-wide aggregation
- Leaderboard ranking

**Files:**
- `lib/components/Leaderboard.tsx` - Points display
- Database: `points` table

### 6. Family System

**Features:**
- Create family (user becomes owner)
- Join family via 8-character invite code
- Member roles (owner/member)
- Shared activity feed
- Family leaderboard

**Files:**
- `app/onboarding/family.tsx` - Family creation/joining
- `app/(tabs)/family.tsx` - Family page
- `lib/context/FamilyContext.tsx` - Family state
- `lib/utils/familyCode.ts` - Code generation

### 7. HealthKit Integration (iOS only)

**Features:**
- Step count tracking from Apple Health
- Daily step goal setting
- Stored in `daily_steps` table
- Graceful degradation on non-iOS platforms

**Files:**
- `lib/hooks/useHealthKit.ts` - HealthKit integration
- `lib/components/StepCounter.tsx` - Step display
- `mdfiles/HEALTHKIT_SETUP.md` - Setup instructions

---

## Design System

**Location:** `constants/theme.ts`

### Color Palette
- **Dark Brown** (#3B2F2F) - Primary background
- **Dark Brown Darker** (#2A1F1F) - Gradient start
- **Dark Brown Lighter** (#4A3D3D) - Elevated surfaces
- **Beige** (#F5E9D5) - Primary text
- **Burnt Orange** (#E07A5F) - Accent/highlights

### Typography
- **Headings:** Playfair Display (serif)
- **Body:** Inter (sans-serif)
- **Sizes:** h1 (32px) → caption (12px)

### Spacing Scale
- xs (4px) → xxl (48px)

### Animations
- React Native Reanimated for complex animations
- Fade-in, scale, and spring effects

---

## Key Custom Hooks

### useAuth()
Access authentication context:
```typescript
const { user, session, loading, signIn, signUp, signOut, isOnboarded } = useAuth();
```

### useUser()
Access user profile and preferences:
```typescript
const { profile, preferences, updateProfile, updatePreferences } = useUser();
```

### useFamily()
Access family data and members:
```typescript
const { family, members, activities, userRole, refreshFamily } = useFamily();
```

### useCheckIn()
Workout/Bible check-in logic:
```typescript
const { submitCheckIn, uploading, verifying } = useCheckIn();
```

### useHealthKit()
Apple HealthKit integration:
```typescript
const { steps, requestPermission, isAuthorized } = useHealthKit();
```

---

## Environment Variables

Required environment variables (see `.env.example`):

```bash
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_OPENAI_API_KEY=<your-openai-api-key>
```

---

## Development Scripts

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web browser
npm run web

# Type checking
npx tsc --noEmit
```

---

## Important File References

### Entry Points
- `app/_layout.tsx:1` - Root layout with all context providers
- `app/(tabs)/index.tsx:1` - Home screen (main app entry)

### Core Context
- `lib/context/AuthContext.tsx:1` - Authentication management
- `lib/context/UserContext.tsx:1` - User data management
- `lib/context/FamilyContext.tsx:1` - Family data management

### Key Components
- `lib/components/TaskCard.tsx:1` - Task display and check-in
- `lib/components/VerificationModal.tsx:1` - Photo verification results
- `lib/components/StreakRing.tsx:1` - Streak visualization

### Business Logic
- `lib/hooks/useCheckIn.ts:1` - Check-in workflow
- `lib/api/openai.ts:1` - OpenAI Vision integration
- `lib/utils/streak.ts:1` - Streak calculation

### Database
- `supabase/migrations/` - Database schema evolution
- `lib/types/database.ts:1` - TypeScript types for DB

---

## Recent Development Focus

Based on recent commits:
- UI/UX enhancements (selector modals, animations)
- Loading screens with logo
- Task verification flow improvements
- Points refresh on home page
- Tab bar styling to match gradient theme
- Task detail modal for additional information

---

## Architecture Patterns

### Separation of Concerns
- **lib/api/** - External service integrations
- **lib/context/** - Global state management
- **lib/hooks/** - Custom logic encapsulation
- **lib/components/** - Reusable UI components
- **lib/utils/** - Utility functions
- **app/** - Screen/page definitions
- **constants/** - Design tokens and theme

### Component Architecture
- Functional components with hooks
- Context API for global state
- Custom hooks for business logic
- Reusable styled components

### Data Persistence
- Supabase PostgreSQL for relational data
- Supabase Storage for files (photos)
- AsyncStorage for session persistence
- HealthKit for step data (iOS)

---

## Deployment

### Build Configuration
- **EAS Build** configured in `eas.json`
- **iOS:** Requires HealthKit entitlements
- **Android:** Edge-to-edge display enabled
- **Web:** Static output with Metro bundler

### Platform Requirements
- **iOS:** HealthKit permissions in Info.plist
- **Android:** Camera and storage permissions
- **All platforms:** Network access for Supabase/OpenAI

---

## Testing Approach

Current testing setup:
- React Test Renderer available
- No test files yet implemented

Recommended testing strategy:
- Unit tests for utilities (`lib/utils/*`)
- Integration tests for hooks (`lib/hooks/*`)
- Component tests for UI (`lib/components/*`)
- E2E tests for critical flows (auth, onboarding, check-in)

---

## Known Considerations

1. **HealthKit** - iOS only; requires native development build
2. **Photo Verification** - Depends on OpenAI API availability and costs
3. **Push Notifications** - Configured but not fully implemented
4. **Offline Support** - Limited; requires network for most operations
5. **Legacy Table** - `checkins` table being phased out in favor of `task_completions`

---

## Quick Start Guide

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Add Supabase and OpenAI credentials

3. **Run database migrations:**
   - Execute SQL files in `supabase/migrations/` order

4. **Start development server:**
   ```bash
   npm start
   ```

5. **Run on platform:**
   - Press `i` for iOS
   - Press `a` for Android
   - Press `w` for web

---

## Additional Documentation

- `mdfiles/IMPLEMENTATION_SUMMARY.md` - Implementation details
- `mdfiles/DATABASE_SCHEMA.md` - Database schema documentation
- `mdfiles/HEALTHKIT_SETUP.md` - HealthKit integration guide
- `README.md` - Project README

---

## Summary

**Kin** is a well-architected React Native application that combines:
- Family-based social accountability
- Faith and fitness tracking
- AI-powered photo verification
- Gamification through points and streaks
- HealthKit integration for passive tracking

The codebase demonstrates production-ready patterns with clear separation of concerns, type safety, and thoughtful UX design. The application is built on a solid foundation of modern tools (Expo, Supabase, OpenAI) and follows React Native best practices.
