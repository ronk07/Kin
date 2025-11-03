import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface FeedItem {
  id: string;
  message: string;
  timestamp: string;
}

interface FeedProps {
  items: FeedItem[];
}

export function Feed({ items }: FeedProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Family Feed</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No updates yet. Start working out!</Text>
      ) : (
        <ScrollView style={styles.feedList} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View key={item.id} style={styles.feedItem}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
    maxHeight: 300,
  },
  title: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  feedList: {
    maxHeight: 250,
  },
  feedItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary + '30',
  },
  message: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
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

