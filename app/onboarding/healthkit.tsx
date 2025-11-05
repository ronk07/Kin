import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';
import { Button } from '@/lib/components/Button';
import { useHealthKit } from '@/lib/hooks/useHealthKit';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Activity } from 'lucide-react-native';

export default function HealthKitSetupScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  
  const { 
    isAvailable, 
    isAuthorized, 
    loading: healthKitLoading,
    requestAuthorization,
    error 
  } = useHealthKit({ autoRequest: false }); // Don't auto-request in onboarding

  // Update button state when authorization changes
  useEffect(() => {
    if (isAuthorized && !requesting) {
      // Auto-continue if authorized
      handleContinue();
    }
  }, [isAuthorized]);

  const handleRequestPermission = async () => {
    if (!isAvailable) {
      Alert.alert(
        'HealthKit Not Available',
        'HealthKit is only available on iOS devices with a development or production build. Please build the app using EAS Build or run it locally.',
        [{ text: 'OK', onPress: handleSkip }]
      );
      return;
    }

    setRequesting(true);
    try {
      await requestAuthorization();
      
      // Wait a moment for authorization state to update
      setTimeout(() => {
        // Re-check authorization status
        if (isAuthorized) {
          // Permission granted, proceed
          handleContinue();
        } else {
          // Permission denied or error
          Alert.alert(
            'Permission Needed',
            'To track your daily steps, please enable HealthKit access in Settings > Privacy & Security > Health > Kin.',
            [
              { text: 'Skip', onPress: handleSkip },
              { text: 'OK', onPress: handleSkip }
            ]
          );
        }
        setRequesting(false);
      }, 500);
    } catch (err: any) {
      console.error('Error requesting HealthKit permission:', err);
      Alert.alert(
        'Error',
        err.message || 'Failed to request HealthKit permission. You can enable it later in Settings.',
        [{ text: 'OK', onPress: () => {
          setRequesting(false);
          handleSkip();
        }}]
      );
    }
  };

  const handleSkip = () => {
    // User can skip and enable later
    handleContinue();
  };

  const handleContinue = () => {
    const isJoining = params.isJoining === 'true';
    const createdFamilyId = params.createdFamilyId as string | undefined;
    
    if (isJoining) {
      router.push({
        pathname: '/onboarding/reminders',
        params: {
          workoutGoal: (params.workoutGoal as string) || '5',
          stepGoal: (params.stepGoal as string) || '10000',
        },
      });
    } else {
      router.push({
        pathname: '/onboarding/tasks',
        params: {
          workoutGoal: (params.workoutGoal as string) || '5',
          stepGoal: (params.stepGoal as string) || '10000',
          familyId: createdFamilyId,
        },
      });
    }
  };

  // Only show on iOS
  if (Platform.OS !== 'ios') {
    // Skip this screen on Android
    handleContinue();
    return null;
  }

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <View style={[styles.progressDot, styles.progressDotActive]} />
              {params.isJoining !== 'true' && <View style={[styles.progressDot]} />}
              <View style={[styles.progressDot]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Activity size={48} color={Colors.accent} />
              </View>
              <Text style={styles.title}>Track Your Steps 📱</Text>
              <Text style={styles.subtitle}>
                Connect to Apple Health to automatically track your daily step count and progress toward your goals.
              </Text>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>📊</Text>
                <Text style={styles.benefitText}>Automatic step tracking from your iPhone or Apple Watch</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>🎯</Text>
                <Text style={styles.benefitText}>See your progress toward your daily step goal</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>🔒</Text>
                <Text style={styles.benefitText}>Your health data stays private and secure</Text>
              </View>
            </View>

            {/* Status */}
            {healthKitLoading ? (
              <View style={styles.statusContainer}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.statusText}>Checking HealthKit availability...</Text>
              </View>
            ) : isAuthorized ? (
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusSuccess]}>
                  ✓ HealthKit access granted
                </Text>
              </View>
            ) : !isAvailable ? (
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusError]}>
                  HealthKit is not available. This requires a development or production build.
                </Text>
              </View>
            ) : error ? (
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, styles.statusError]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {isAuthorized ? (
                <Button
                  title="Continue"
                  onPress={handleContinue}
                  fullWidth
                  variant="primary"
                />
              ) : (
                <>
                  <Button
                    title={isAvailable ? "Enable HealthKit Access" : "Continue"}
                    onPress={isAvailable ? handleRequestPermission : handleSkip}
                    loading={requesting}
                    disabled={requesting || healthKitLoading}
                    fullWidth
                    variant="primary"
                  />
                  {isAvailable && (
                    <Button
                      title="Skip for Now"
                      onPress={handleSkip}
                      disabled={requesting}
                      fullWidth
                      variant="secondary"
                      style={styles.skipButton}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary + '40',
  },
  progressDotActive: {
    backgroundColor: Colors.accent,
  },
  header: {
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  benefitsContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    lineHeight: 20,
  },
  statusContainer: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
    padding: Spacing.md,
  },
  statusText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    textAlign: 'center',
  },
  statusSuccess: {
    color: Colors.accent,
  },
  statusError: {
    color: '#E07A5F',
  },
  buttonContainer: {
    marginTop: 'auto',
    gap: Spacing.md,
  },
  skipButton: {
    marginTop: Spacing.sm,
  },
});

