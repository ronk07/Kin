import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
  avatar_url?: string | null;
  streak?: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  period?: 'weekly' | 'monthly';
}

export function Leaderboard({ entries, period = 'weekly' }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Your leaderboard gives you instant reference</Text>
        <Text style={styles.empty}>No rankings yet</Text>
      </Card>
    );
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Your leaderboard gives you instant reference</Text>
        
        {/* List View for All Members */}
        {entries.map((entry, index) => {
          const rank = entry.rank;
          const isTopThree = rank <= 3;

          return (
            <View 
              key={entry.id} 
              style={[
                styles.listItem,
                index === entries.length - 1 && styles.lastItem
              ]}
            >
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials(entry.name)}</Text>
                </View>
              </View>

              {/* Name and Points */}
              <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {entry.name}
                  </Text>
                  {isTopThree && (
                    <Text style={styles.medal}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </Text>
                  )}
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.pointsText}>{entry.points.toLocaleString()} points</Text>
                  {entry.streak !== undefined && (
                    <View style={styles.streakContainer}>
                      <Flame size={16} color={Colors.accent} fill={Colors.accent} />
                      <Text style={styles.streakText}>{entry.streak}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary + '20',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  avatarContainer: {
    marginRight: Spacing.md,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
  },
  avatarInitials: {
    fontSize: Typography.body,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  memberName: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    flex: 1,
  },
  medal: {
    fontSize: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pointsText: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  streakText: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  empty: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
