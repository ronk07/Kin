import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface StreakRingProps {
  streakDays: number;
  size?: number;
}

export function StreakRing({ streakDays, size = 120 }: StreakRingProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(streakDays / 30, 1); // Cap at 30 days for visual
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.accent + '30'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.accent}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={styles.number}>{streakDays}</Text>
        <Text style={styles.label}>days</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: Typography.h1,
    fontWeight: Typography.bold,
    color: Colors.text,
    fontFamily: Typography.headingFont,
  },
  label: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontFamily: Typography.bodyFont,
    marginTop: -Spacing.xs,
  },
});

