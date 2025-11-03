import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/lib/components/Button';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

const STEP_GOALS = [
  { value: 5000, label: '5,000 steps' },
  { value: 8000, label: '8,000 steps' },
  { value: 10000, label: '10,000 steps' },
  { value: 15000, label: '15,000 steps' },
];

export default function GoalsSetupScreen() {
  const [workoutGoal, setWorkoutGoal] = useState(5);
  const [stepGoal, setStepGoal] = useState(10000);
  
  const router = useRouter();

  const handleContinue = () => {
    // Store goals in temporary state (will be saved in the last onboarding step)
    router.push({
      pathname: '/onboarding/reminders',
      params: {
        workoutGoal: workoutGoal.toString(),
        stepGoal: stepGoal.toString(),
      },
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
              <View style={[styles.progressDot]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Set Your Goals 🎯</Text>
              <Text style={styles.subtitle}>
                Let's establish your fitness targets
              </Text>
            </View>

            {/* Goals */}
            <View style={styles.goalsContainer}>
              {/* Workout Goal */}
              <View style={styles.goalSection}>
                <Text style={styles.goalLabel}>Weekly Workout Goal</Text>
                <Text style={styles.goalDescription}>
                  How many days per week do you want to workout?
                </Text>
                
                <View style={styles.daysContainer}>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayButton,
                        workoutGoal >= day && styles.dayButtonActive,
                      ]}
                      onPress={() => setWorkoutGoal(day)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          workoutGoal >= day && styles.dayButtonTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.goalValue}>{workoutGoal} days per week</Text>
              </View>

              {/* Step Goal */}
              <View style={styles.goalSection}>
                <Text style={styles.goalLabel}>Daily Step Goal</Text>
                <Text style={styles.goalDescription}>
                  How many steps do you want to take each day?
                </Text>
                
                <View style={styles.stepOptionsContainer}>
                  {STEP_GOALS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.stepOption,
                        stepGoal === option.value && styles.stepOptionActive,
                      ]}
                      onPress={() => setStepGoal(option.value)}
                    >
                      <Text
                        style={[
                          styles.stepOptionText,
                          stepGoal === option.value && styles.stepOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
              <Button
                title="Continue"
                onPress={handleContinue}
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
  goalsContainer: {
    flex: 1,
    gap: Spacing.xxl,
  },
  goalSection: {
    gap: Spacing.md,
  },
  goalLabel: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
  },
  goalDescription: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  dayButtonText: {
    fontSize: Typography.h3,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  dayButtonTextActive: {
    color: Colors.accent,
  },
  goalValue: {
    fontSize: Typography.bodyLarge,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
    textAlign: 'center',
  },
  stepOptionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stepOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
  },
  stepOptionActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  stepOptionText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.medium,
  },
  stepOptionTextActive: {
    color: Colors.accent,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});

