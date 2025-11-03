import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface MemberCardProps {
  name: string;
  streak: number;
  points: number;
  role?: 'owner' | 'member';
}

export function MemberCard({ name, streak, points, role = 'member' }: MemberCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        {role === 'owner' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Owner</Text>
          </View>
        )}
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>day streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{points}</Text>
          <Text style={styles.statLabel}>points</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
  },
  badge: {
    backgroundColor: Colors.accent + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.medium,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
});

