# Apple HealthKit Integration Setup

## 📱 Overview

The Kin app now integrates with Apple HealthKit to automatically pull your daily step count from the Health app. This provides a seamless experience without manual step entry.

## ⚠️ Important: Building with Native Modules

Since `react-native-health` is a native module, **you cannot run this app in Expo Go**. You need to build a development build or production build.

### Option 1: Local Development Build (Recommended for Development)

1. **Install iOS dependencies:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

2. **Run prebuild:**
   ```bash
   npx expo prebuild
   ```

3. **Open in Xcode:**
   ```bash
   open ios/Kin.xcworkspace
   ```

4. **In Xcode:**
   - Select your team in "Signing & Capabilities"
   - Ensure "HealthKit" capability is enabled (should be automatic from app.json)
   - Build and run on your device or simulator

5. **Or run from terminal:**
   ```bash
   npx expo run:ios
   ```

### Option 2: EAS Build (Recommended for Distribution)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS:**
   ```bash
   eas build:configure
   ```

4. **Build for iOS:**
   ```bash
   # Development build
   eas build --profile development --platform ios

   # Production build
   eas build --profile production --platform ios
   ```

5. **Install on device:**
   - Download the build from Expo dashboard
   - Install on your device via TestFlight or direct installation

---

## 🔐 HealthKit Permissions

The app requests the following HealthKit permissions:

- **Read**: Step Count data
- **Write**: None (we only read data)

### Permission Flow:

1. When the app launches, it checks if HealthKit is available
2. If available, it requests authorization to read step count
3. User is prompted by iOS to grant/deny access
4. If granted, the app fetches today's step count
5. Steps are refreshed every minute automatically

### User Experience:

- **First Launch**: User sees system permission prompt
- **Permission Granted**: Step count displays automatically
- **Permission Denied**: User sees message to enable in Settings
- **Not Available**: Shows "HealthKit not available" (e.g., on Android or simulator without Health app)

---

## 📝 Configuration Files

### app.json (Already Configured)

```json
{
  "ios": {
    "bundleIdentifier": "com.kin.app",
    "infoPlist": {
      "NSHealthShareUsageDescription": "Kin needs access to your step count data to track your daily fitness goals and display your progress.",
      "NSHealthUpdateUsageDescription": "Kin may update your health data to record your workouts."
    },
    "entitlements": {
      "com.apple.developer.healthkit": true,
      "com.apple.developer.healthkit.access": ["health-records"]
    }
  }
}
```

---

## 🛠️ Implementation Details

### useHealthKit Hook

Location: `lib/hooks/useHealthKit.ts`

**Features:**
- Checks HealthKit availability
- Requests authorization
- Fetches today's step count
- Handles errors gracefully
- Returns authorization status

**Usage:**
```typescript
const { steps, isAvailable, isAuthorized, fetchTodaySteps } = useHealthKit();
```

### StepCounter Component

Location: `lib/components/StepCounter.tsx`

**Features:**
- Displays real step count from HealthKit
- Shows progress toward daily goal
- Circular progress chart
- Helpful messages when HealthKit is unavailable/unauthorized

### Home Screen Integration

Location: `app/(tabs)/index.tsx`

**Features:**
- Integrates useHealthKit hook
- Refreshes steps every minute
- Passes step data to StepCounter
- Uses user's configured daily step goal

---

## 🔍 Testing

### On Real Device (Recommended):
1. Build and install the app on your iPhone
2. Open the app
3. Grant HealthKit permission when prompted
4. Walk around and check the Health app to see steps recorded
5. Return to Kin app and see steps update

### On Simulator:
- HealthKit **is available** on simulator
- You can manually add step data in the Health app
- Perfect for testing the UI and permission flow

### Debugging:

Enable HealthKit logs:
```typescript
// In useHealthKit.ts, logs are already added:
console.log('HealthKit authorized successfully');
console.log('Step count fetched:', results.value);
```

Check console for:
- Authorization status
- Step count values
- Any errors

---

## 🎯 Features

### Automatic Step Tracking
- ✅ Reads step count from Apple Health
- ✅ Updates every minute automatically
- ✅ Shows progress toward daily goal
- ✅ Displays percentage completion

### User-Friendly
- ✅ Clear permission messaging
- ✅ Helpful error states
- ✅ Works on iOS devices and simulator
- ✅ Graceful handling when unavailable

### Privacy-Focused
- ✅ Only requests read permission
- ✅ Clear usage description
- ✅ No data sent to external servers
- ✅ Complies with Apple's HealthKit guidelines

---

## 📱 Testing Checklist

- [ ] App builds successfully with HealthKit
- [ ] Permission prompt appears on first launch
- [ ] Step count displays when permission granted
- [ ] Helpful message shows when permission denied
- [ ] Steps update automatically every minute
- [ ] Progress chart reflects actual step count
- [ ] Goal percentage calculates correctly
- [ ] Works on both device and simulator

---

## 🚫 Common Issues

### Issue: "HealthKit not available"
**Solution:** Ensure you're running on an iOS device or simulator with iOS 8+

### Issue: Steps always show 0
**Solution:** 
1. Check Health app has step data
2. Verify permission was granted
3. Check console logs for errors
4. Try revoking and re-granting permission

### Issue: Can't build in Expo Go
**Solution:** HealthKit requires native modules. Use `expo prebuild` or EAS build.

### Issue: Permission prompt doesn't appear
**Solution:**
1. Check `app.json` has correct `infoPlist` entries
2. Rebuild the app completely
3. Reset simulator/device if needed

---

## 📚 Resources

- [React Native Health Documentation](https://github.com/agencyenterprise/react-native-health)
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

---

## ✅ Summary

Your Kin app now has full Apple HealthKit integration! Users can see their real step count automatically without manual entry. The integration:

- Works seamlessly with Apple Health
- Respects user privacy
- Handles permissions properly
- Provides helpful feedback
- Updates automatically

Build the app using `expo prebuild` or EAS Build to test on your device! 🚀

