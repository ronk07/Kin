import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface ProfileCardProps {
  name: string;
  email?: string;
  points: number;
  role: string;
  avatarUrl?: string;
}

export function ProfileCard({ name, email, points, role, avatarUrl }: ProfileCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {avatarUrl ? (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          {email && <Text style={styles.email}>{email}</Text>}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{role}</Text>
          </View>
        </View>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsLabel}>Total Points</Text>
        <Text style={styles.pointsValue}>{points}</Text>
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
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.beige,
    fontWeight: Typography.bold,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginTop: Spacing.xs,
  },
  badgeText: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.medium,
    textTransform: 'capitalize',
  },
  pointsContainer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.textSecondary + '30',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  pointsValue: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
  },
});

