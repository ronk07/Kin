import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface DayData {
  dayLetter: string;
  dayNumber: number;
  completed: boolean;
  isToday: boolean;
}

interface WeekTrackerProps {
  weekData: DayData[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export function WeekTracker({ weekData, onPreviousWeek, onNextWeek }: WeekTrackerProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPreviousWeek} style={styles.arrow}>
        <ChevronLeft size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.daysContainer}>
        {weekData.map((day, index) => (
          <View key={index} style={styles.dayColumn}>
            <View style={[
              styles.circle,
              day.completed && styles.circleFilled,
              !day.completed && styles.circleDotted,
              day.isToday && styles.circleToday,
            ]}>
              <Text style={styles.dayLetter}>{day.dayLetter}</Text>
            </View>
            <Text style={styles.dayNumber}>{day.dayNumber}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onNextWeek} style={styles.arrow}>
        <ChevronRight size={24} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  arrow: {
    padding: Spacing.xs,
  },
  daysContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayLetter: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  circleDotted: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.textSecondary,
  },
  circleToday: {
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  innerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  dayNumber: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
});

