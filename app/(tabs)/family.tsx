import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Container } from '@/lib/components/Container';
import { Leaderboard } from '@/lib/components/Leaderboard';
import { Feed } from '@/lib/components/Feed';
import { useFamily } from '@/lib/context/FamilyContext';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
  avatar_url?: string | null;
  streak?: number;
}

interface FeedItem {
  id: string;
  message: string;
  timestamp: string;
}

export default function FamilyScreen() {
  const { family, members, activities, loading, refreshAll } = useFamily();
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        try {
          await refreshAll();
        } catch (error) {
          console.error('Error auto-refreshing family data:', error);
        }
      };
      
      refreshData();
    }, [refreshAll])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error('Error refreshing family data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const leaderboard: LeaderboardEntry[] = members
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
    .map((member, index) => ({
      id: member.id,
      name: member.name,
      points: member.total_points || 0,
      rank: index + 1,
      avatar_url: member.avatar_url,
      streak: member.current_streak || 0,
    }));

  const feedItems: FeedItem[] = activities.map((activity) => ({
    id: activity.id,
    message: `${activity.userName} ${activity.action}`,
    timestamp: activity.timestamp,
  }));

  if (loading) {
    return (
      <Container>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
        >
          <Text style={styles.title}>{family?.name ? `${family.name} Family` : 'Family'}</Text>

          <Leaderboard entries={leaderboard} period="weekly" />

          <Feed items={feedItems} />
        </ScrollView>
      </SafeAreaView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.lg,
  },
});

