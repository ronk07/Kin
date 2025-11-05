import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/lib/components/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { useUser } from '@/lib/context/UserContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function RemindersSetupScreen() {
  const params = useLocalSearchParams();
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user, refreshOnboardingStatus } = useAuth();
  const { refreshProfile } = useUser();
  const { refreshAll } = useFamily();
  const router = useRouter();

  const handleComplete = async () => {
    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      // Save preferences directly to users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          weekly_workout_goal: parseInt(params.workoutGoal as string) || 5,
          daily_step_goal: parseInt(params.stepGoal as string) || 10000,
          reminder_enabled: reminderEnabled,
          reminder_time: reminderTime.toTimeString().split(' ')[0],
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh onboarding status in AuthContext
      await refreshOnboardingStatus();

      // Refresh user profile and family data to ensure tasks are loaded
      await refreshProfile();
      await refreshAll();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setReminderTime(selectedTime);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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
              <View style={[styles.progressDot, styles.progressDotActive]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Set Reminders 🔔</Text>
              <Text style={styles.subtitle}>
                Stay on track with daily reminders
              </Text>
            </View>

          {/* Reminder Settings */}
          <View style={styles.settingsContainer}>
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Daily Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Get notified to complete your tasks
                  </Text>
                </View>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: Colors.textSecondary + '40', true: Colors.accent }}
                  thumbColor={Colors.text}
                />
              </View>

              {reminderEnabled && (
                <View style={styles.timeSection}>
                  <Text style={styles.timeLabel}>Reminder Time</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker
                      value={reminderTime}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      textColor={Colors.text}
                      style={styles.timePicker}
                    />
                  ) : (
                    <>
                      <Button
                        title={formatTime(reminderTime)}
                        onPress={() => setShowTimePicker(true)}
                        variant="secondary"
                      />
                      {showTimePicker && (
                        <DateTimePicker
                          value={reminderTime}
                          mode="time"
                          display="default"
                          onChange={onTimeChange}
                        />
                      )}
                    </>
                  )}
                </View>
              )}
            </View>
          </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
              <Button
                title="Complete Setup"
                onPress={handleComplete}
                loading={loading}
                disabled={loading}
                fullWidth
                variant="primary"
              />
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
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  settingsContainer: {
    flex: 1,
  },
  settingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  timeSection: {
    gap: Spacing.sm,
  },
  timeLabel: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  timePicker: {
    width: '100%',
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});

