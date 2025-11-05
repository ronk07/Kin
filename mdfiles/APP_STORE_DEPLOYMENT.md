# App Store Deployment Guide for Kin

This guide walks you through deploying the Kin app to the Apple App Store using Expo Application Services (EAS).

## Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program

2. **EAS Account**
   - Sign up at [expo.dev](https://expo.dev) (free tier available)
   - Install EAS CLI: `npm install -g eas-cli`

3. **Environment Variables**
   - Create a `.env.production` file with your production API keys
   - Ensure `.env.production` is in `.gitignore` (never commit secrets!)

## Step-by-Step Deployment Process

### Step 1: Install and Configure EAS CLI

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure your project (if not already done)
eas build:configure
```

### Step 2: Set Up Environment Variables for Production

Create a `.env.production` file in your project root:

```bash
# Copy your example file
cp env.example .env.production

# Edit .env.production and add your production values:
EXPO_PUBLIC_SUPABASE_URL=your_production_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
EXPO_PUBLIC_OPENAI_API_KEY=your_production_openai_key
```

**Important:** For EAS builds, you'll need to configure these in EAS Secrets (see Step 4).

### Step 3: Configure App Store Connect

1. **Go to [App Store Connect](https://appstoreconnect.apple.com)**
2. **Create a new app:**
   - Click "My Apps" → "+" → "New App"
   - Platform: iOS
   - Name: Kin
   - Primary Language: English
   - Bundle ID: `com.kin.app` (must match your app.json)
   - SKU: `kin-ios-app` (any unique identifier)
   - User Access: Full Access

3. **Complete App Information:**
   - App Privacy (required): Configure privacy settings for:
     - Health & Fitness (HealthKit)
     - Photos (for workout proof uploads)
     - Camera (for taking photos)
   - Pricing: Set your price (or Free)
   - App Review Information: Fill in contact details

### Step 4: Configure EAS Secrets

Set your environment variables as EAS secrets so they're included in the build:

```bash
# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your_supabase_url"

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_supabase_anon_key"

# Set OpenAI API Key
eas secret:create --scope project --name EXPO_PUBLIC_OPENAI_API_KEY --value "your_openai_api_key"

# Verify secrets are set
eas secret:list
```

### Step 5: Update App Metadata

Before building, ensure your `app.json` has all required information:

```json
{
  "expo": {
    "name": "Kin",
    "slug": "kin",
    "version": "1.0.0",  // Update for each release
    "ios": {
      "bundleIdentifier": "com.kin.app",
      "buildNumber": "1"  // Increment for each build
    }
  }
}
```

**Note:** For each new version:
- Increment `version` (e.g., 1.0.0 → 1.0.1)
- Increment `buildNumber` (e.g., 1 → 2)

### Step 6: Build for App Store

```bash
# Build for iOS App Store (production profile)
eas build --platform ios --profile production

# This will:
# 1. Ask you to create an Apple App Store Connect API key (if not done)
# 2. Build your app in the cloud
# 3. Generate an .ipa file ready for submission
```

**First-time setup:**
- EAS will prompt you to create an App Store Connect API key
- Follow the prompts to generate the key in App Store Connect
- EAS will store it securely

### Step 7: Submit to App Store

Once the build completes, submit it to App Store Connect:

```bash
# Submit the latest production build
eas submit --platform ios --profile production

# Or specify a build ID
eas submit --platform ios --latest
```

**Alternative:** You can also download the `.ipa` from the EAS dashboard and upload manually via Transporter or App Store Connect.

### Step 8: Complete App Store Listing

In App Store Connect, complete the required information:

1. **App Information:**
   - Category: Health & Fitness, Lifestyle
   - Subtitle: (optional, 30 characters)
   - Privacy Policy URL: (required if you collect data)

2. **Pricing and Availability:**
   - Set price and availability by country

3. **App Preview and Screenshots:**
   - Required screenshots for iPhone (6.7", 6.5", 5.5")
   - Optional: iPad screenshots
   - Optional: App Preview video

4. **App Description:**
   - Description (up to 4,000 characters)
   - Keywords (up to 100 characters)
   - Support URL
   - Marketing URL (optional)

### App Store Copy

**Promotional Text (170 characters max):**
```
Build stronger families through faith and fitness. Track workouts, read scripture, complete tasks together, and celebrate wins with your family. Stay accountable, stay grounded, stay strong.
```

**Description (4,000 characters max):**
```
Kin — Faith, Family, Wellness

Transform your family's health journey with Kin, the Christian-inspired wellness app that combines faith, fitness, and family accountability in one beautiful platform.

🌟 WHAT IS KIN?

Kin is more than a fitness tracker—it's a family accountability hub designed to help you and your loved ones stay consistent, spiritually grounded, and physically active. Built with Christian families in mind, Kin integrates daily scripture, workout tracking, task completion, and family-friendly competition into a single, easy-to-use app.

✨ KEY FEATURES

• Daily Scripture & Affirmations
Start each day with inspiring Bible verses and faith-based encouragement. Rotating daily scriptures keep your family spiritually centered and motivated.

• Streak Tracking & Visual Progress
Watch your dedication grow with beautiful streak rings that show your consecutive days of consistency. Build momentum and celebrate every milestone together.

• AI-Powered Task Verification
Complete tasks like workouts and Bible reading with optional photo verification. Our intelligent system helps ensure accountability while maintaining trust within your family.

• Family Leaderboard & Points System
Friendly competition meets accountability. Earn points for completing tasks, achieving goals, and maintaining streaks. See how your family members are doing on the weekly leaderboard.

• HealthKit Integration
Seamlessly sync your daily step count from Apple Health. Track your activity goals and see your progress in real-time.

• Weekly Goal Tracking
Set personalized goals for workouts, steps, and spiritual practices. Track your progress throughout the week with intuitive visual indicators.

• Family Activity Feed
Stay connected with your family's journey. See when members complete tasks, hit milestones, or achieve new streaks. Celebrate together, grow together.

• Customizable Tasks
Set up family tasks that matter to you—from daily workouts to Bible reading, prayer time, or any other wellness goal. Customize points, frequency, and verification requirements.

• Beautiful, Peaceful Design
Experience a calm, earth-tone aesthetic that reflects the grounded, purposeful nature of your wellness journey. Kin's design promotes focus and reduces digital clutter.

• Privacy First
Your family's data stays private. All verification photos and personal information are securely stored and only accessible to your family members.

🎯 PERFECT FOR:

• Christian families seeking to integrate faith and fitness
• Families wanting accountability for wellness goals
• Parents looking to model healthy habits for their children
• Anyone wanting to grow spiritually while improving physical health
• Groups wanting to support each other's wellness journey

💪 HOW IT WORKS

1. Create or join a family group
2. Set up your daily tasks (workouts, Bible reading, etc.)
3. Complete tasks and optionally upload photo proof
4. Earn points and build streaks
5. Watch your family grow stronger together

📱 REQUIREMENTS

• iOS 13.0 or later
• Apple HealthKit (for step tracking)
• Camera access (for optional photo verification)

🔒 PRIVACY & SECURITY

We take your privacy seriously. Kin uses industry-standard encryption and secure storage. Your family's data is never shared with third parties. HealthKit data remains on your device and is only accessed with your explicit permission.

🌟 WHY KIN?

In a world full of distractions, Kin helps your family focus on what truly matters: faith, health, and each other. Whether you're a family of athletes, spiritual seekers, or simply people wanting to build better habits together, Kin provides the structure, motivation, and community support you need.

Join thousands of families who are building stronger bonds through shared wellness goals and spiritual growth. Download Kin today and start your family's journey toward better health, deeper faith, and stronger relationships.

Questions or feedback? We'd love to hear from you! Reach out through our support channels.

---

Kin: Where faith, family, and wellness come together.
```

**Keywords (100 characters max):**
```
fitness,family,wellness,faith,Christian,workout,accountability,streak,health,Bible,scripture,family app
```

5. **Version Information:**
   - What's New in This Version
   - Build: Select the build you just submitted

### Step 9: Submit for Review

1. **Review all information** in App Store Connect
2. **Add Review Notes** (if needed):
   - Demo account credentials
   - Special instructions for testers
3. **Click "Submit for Review"**
4. **Wait for review** (typically 24-48 hours)

### Step 10: Monitor Submission

- Check App Store Connect for review status
- Respond to any feedback from Apple reviewers
- Once approved, your app will be live in the App Store!

## Important Notes

### HealthKit Entitlements
Your app uses HealthKit, which requires special approval:
- Ensure HealthKit usage descriptions are clear (already in your Info.plist)
- Be prepared to explain why you need HealthKit access
- Apple may ask for additional justification

### App Store Review Guidelines
Make sure your app complies with:
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Privacy requirements (HealthKit, Photos, Camera)
- Content guidelines
- No broken functionality

### Version Management
- **Version (CFBundleShortVersionString):** User-facing version (1.0.0, 1.0.1, etc.)
- **Build Number (CFBundleVersion):** Internal build number (1, 2, 3, etc.)
- Increment build number for every submission, even if version stays the same

### Testing Before Submission

1. **Test on a physical device:**
   ```bash
   eas build --platform ios --profile preview
   ```
   Install the preview build via TestFlight or direct link

2. **Test all features:**
   - HealthKit integration
   - Photo uploads
   - Supabase connectivity
   - OpenAI verification

3. **Test on different iOS versions** (if possible)

## Troubleshooting

### Build Fails
- Check EAS build logs: `eas build:list`
- Verify all environment variables are set: `eas secret:list`
- Ensure Apple Developer account is properly configured

### Submission Fails
- Verify bundle identifier matches App Store Connect
- Check that build is in "Ready to Submit" status
- Ensure all required metadata is filled in App Store Connect

### App Rejected
- Read the rejection reason carefully
- Address all issues mentioned
- Update and resubmit with a new build number

## Useful Commands

```bash
# List all builds
eas build:list

# View build details
eas build:view [BUILD_ID]

# Cancel a build
eas build:cancel [BUILD_ID]

# List secrets
eas secret:list

# Update a secret
eas secret:delete --name SECRET_NAME
eas secret:create --name SECRET_NAME --value "new_value"

# Check submission status
eas submit:list
```

## Next Steps After Approval

1. **Monitor app performance** in App Store Connect analytics
2. **Respond to user reviews**
3. **Plan updates** using the same process (increment version/build)
4. **Set up TestFlight** for beta testing future releases

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

**Good luck with your App Store submission! 🚀**

