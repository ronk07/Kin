import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface StepCounterProps {
  steps?: number;
  goal?: number;
}

export function StepCounter({ steps = 0, goal = 10000 }: StepCounterProps) {
  const progress = Math.min(steps / goal, 1);
  const percentage = Math.round(progress * 100);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Steps Today</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
      </View>
      <Text style={styles.steps}>{steps.toLocaleString()}</Text>
      <Text style={styles.goal}>Goal: {goal.toLocaleString()} steps</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  percentage: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  steps: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
  },
  goal: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.accent + '30',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
});

