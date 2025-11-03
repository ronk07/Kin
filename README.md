# Kin — Family Faith & Fitness Tracker App

A mobile-first React Native app built with Expo, designed to help families stay consistent, spiritually grounded, and physically active through streaks, points, photo proof, and faith-based motivation.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Google Gemini API key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `env.example` to `.env.local`
   - Fill in your Supabase and Gemini API credentials:
     ```
     EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
     EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
     ```

3. **Set up Supabase:**
   - Create a new Supabase project
   - Run the migration file `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor
   - Create a storage bucket named `workout-proofs` with private access

4. **Run the app:**
   ```bash
   npm start
   ```

   Then press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - Scan QR code with Expo Go app on your device

## 📱 Features (MVP)

### Home Page
- Daily scripture/affirmation rotation
- Streak ring visualization
- "I Worked Out" check-in button with photo upload
- AI-powered workout verification (Gemini Vision API)
- Step counter (placeholder for MVP)
- Dynamic encouragement messages

### Family Page
- Family member summary cards with streaks and points
- Weekly leaderboard
- Activity feed
- Add member button (UI only)

### Me Page
- Profile card with points and role
- Goals settings (workout frequency, step goal)
- Preferences (photo proof toggle, privacy settings)
- Reminders UI
- Sign out button

## 🎨 Design System

**Color Palette:**
- Dark Brown (#3B2F2F) — grounding, strength, faith
- Beige (#F5E9D5) — simplicity, warmth
- Sage Green (#A3B18A) — growth, renewal
- Burnt Orange (#E07A5F) — energy, motivation

**Typography:**
- Headings: Playfair Display (serif)
- Body: Inter (sans-serif)

## 🗂️ Project Structure

```
/app
  /(tabs)
    index.tsx        # Home page
    family.tsx       # Family page
    me.tsx          # Me page
/lib
  /api
    gemini.ts       # Gemini Vision API integration
  /components       # Reusable UI components
  /hooks           # Custom React hooks
  /supabase
    client.ts       # Supabase client setup
  /types           # TypeScript types
/constants
  theme.ts         # Design system constants
/supabase
  /migrations      # Database schema
```

## 🔧 Tech Stack

- **Frontend:** React Native (Expo SDK 54)
- **Navigation:** Expo Router
- **Backend:** Supabase (Auth, DB, Storage)
- **AI Vision:** Google Gemini API
- **State Management:** React Hooks + Context (to be added)
- **Styling:** StyleSheet

## 📝 Notes

- Authentication and onboarding are out of scope for MVP (will be added later)
- Apple HealthKit integration is placeholder for MVP
- Photo verification requires Gemini API key
- Mock user/family IDs are used - replace with actual auth context when implementing authentication

## 🐛 Known Issues

- Supabase storage upload may need adjustment for React Native file handling
- Font loading for Playfair Display and Inter needs to be configured (currently using system fonts)

## 📄 License

Private project - All rights reserved

