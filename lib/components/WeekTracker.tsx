import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface DayData {
  dayLetter: string;
  dayNumber: number;
  date: string; // ISO date string (YYYY-MM-DD)
  completed: boolean; // true if BOTH tasks completed
  isToday: boolean;
}

interface WeekTrackerProps {
  weekData: DayData[];
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onDayPress?: (date: string) => void;
  selectedDate?: string;
}

export function WeekTracker({ 
  weekData, 
  onPreviousWeek, 
  onNextWeek,
  onDayPress,
  selectedDate 
}: WeekTrackerProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPreviousWeek} style={styles.arrow}>
        <ChevronLeft size={24} color={Colors.text} />
      </TouchableOpacity>

      <View style={styles.daysContainer}>
        {weekData.map((day, index) => {
          const isSelected = selectedDate === day.date;
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.dayColumn}
              onPress={() => onDayPress?.(day.date)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.circle,
                day.completed ? styles.circleFilled : styles.circleDotted,
                day.isToday && styles.circleToday,
                isSelected && styles.circleSelected,
              ]}>
                <Text style={[
                  styles.dayLetter,
                  day.completed && styles.dayLetterCompleted
                ]}>
                  {day.dayLetter}
                </Text>
              </View>
              <Text style={styles.dayNumber}>{day.dayNumber}</Text>
            </TouchableOpacity>
          );
        })}
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
    position: 'relative',
  },
  circleFilled: {
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: Colors.accent,
  },
  circleDotted: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.textSecondary,
    backgroundColor: 'transparent',
  },
  circleToday: {
    borderWidth: 3,
  },
  circleSelected: {
    borderWidth: 3,
    borderColor: Colors.accent,
    backgroundColor: Colors.accent + '30',
  },
  dayLetterCompleted: {
    color: Colors.beige,
  },
  dayNumber: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
});
