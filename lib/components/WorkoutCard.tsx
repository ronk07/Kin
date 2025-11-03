import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface WorkoutCardProps {
  type: string;
  duration: string;
  verified: boolean;
}

export function WorkoutCard({ type, duration, verified }: WorkoutCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.type}>{type}</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
        {verified && (
          <View style={styles.verifiedBadge}>
            <Check size={16} color={Colors.beige} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  type: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
  },
  duration: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  verifiedText: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.medium,
  },
});

