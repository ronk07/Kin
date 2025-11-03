import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  period?: 'weekly' | 'monthly';
}

export function Leaderboard({ entries, period = 'weekly' }: LeaderboardProps) {
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}.`;
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Leaderboard ({period})</Text>
      {entries.length === 0 ? (
        <Text style={styles.empty}>No rankings yet</Text>
      ) : (
        entries.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <Text style={styles.rank}>{getRankEmoji(entry.rank)}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {entry.name}
            </Text>
            <Text style={styles.points}>{entry.points} pts</Text>
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary + '30',
  },
  rank: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    width: 40,
  },
  name: {
    flex: 1,
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  points: {
    fontSize: Typography.body,
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

