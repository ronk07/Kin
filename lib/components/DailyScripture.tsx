import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

const scriptures = [
  {
    verse: "Whatever you do, work at it with all your heart.",
    reference: "Colossians 3:23",
  },
  {
    verse: "I can do all things through Christ who strengthens me.",
    reference: "Philippians 4:13",
  },
  {
    verse: "Do you not know that your bodies are temples of the Holy Spirit?",
    reference: "1 Corinthians 6:19",
  },
  {
    verse: "Train yourself to be godly. Physical training is of some value, but godliness has value for all things.",
    reference: "1 Timothy 4:7-8",
  },
  {
    verse: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.",
    reference: "Psalm 28:7",
  },
];

export function DailyScripture() {
  // Get scripture based on day of year for rotation
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const scripture = scriptures[dayOfYear % scriptures.length];

  return (
    <Card style={styles.card}>
      <Text style={styles.verse}>"{scripture.verse}"</Text>
      <Text style={styles.reference}>— {scripture.reference}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  verse: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  reference: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});

