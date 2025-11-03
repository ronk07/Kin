import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame } from 'lucide-react-native';
import { Container } from '@/lib/components/Container';
import { DailyScripture } from '@/lib/components/DailyScripture';
import { WeekTracker } from '@/lib/components/WeekTracker';
import { CheckInButton } from '@/lib/components/CheckInButton';
import { StepCounter } from '@/lib/components/StepCounter';
import { WorkoutCard } from '@/lib/components/WorkoutCard';
import { useCheckIn } from '@/lib/hooks/useCheckIn';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  // TODO: Replace with actual user context/auth
  const mockUserId = 'mock-user-id';
  const mockFamilyId = 'mock-family-id';
  const familyName = "Kommoji's";

  const { streakDays, isLoading, handleCheckIn } = useCheckIn({
    userId: mockUserId,
    familyId: mockFamilyId,
  });

  // Generate week data (current week)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  
  const getWeekData = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (currentWeekOffset * 7));

    const weekData = [];
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const isToday = date.toDateString() === today.toDateString();
      
      // TODO: Check actual workout completion from database
      const completed = Math.random() > 0.5; // Mock data
      
      weekData.push({
        dayLetter: dayLetters[i],
        dayNumber: date.getDate(),
        completed,
        isToday,
      });
    }

    return weekData;
  };

  const weekData = getWeekData();

  const handlePreviousWeek = () => {
    setCurrentWeekOffset(currentWeekOffset - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(currentWeekOffset + 1);
  };

  return (
    <Container>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with family name and streak */}
          <View style={styles.header}>
            <Text style={styles.familyName}>{familyName}</Text>
            <View style={styles.streakBadge}>
              <Flame size={20} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.streakCount}>{streakDays}</Text>
            </View>
          </View>

          {/* Week Tracker */}
          <WeekTracker
            weekData={weekData}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
          />

          {/* Daily Scripture */}
          <DailyScripture />

          {/* Check-in Button */}
          <View style={styles.checkInSection}>
            <CheckInButton 
              onCheckIn={handleCheckIn}
              disabled={isLoading}
            />
          </View>

          {/* Step Counter */}
          <StepCounter steps={8432} goal={10000} />

          {/* Workout Card */}
          <WorkoutCard
            type="Lift/Weights"
            duration="1hr"
            verified={true}
          />
        </ScrollView>
      </SafeAreaView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  familyName: {
    fontSize: Typography.h1,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  streakCount: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
  },
  checkInSection: {
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
});
