import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container } from '@/lib/components/Container';
import { MemberCard } from '@/lib/components/MemberCard';
import { Leaderboard } from '@/lib/components/Leaderboard';
import { Feed } from '@/lib/components/Feed';
import { Button } from '@/lib/components/Button';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface FamilyMember {
  id: string;
  name: string;
  streak: number;
  points: number;
  role: 'owner' | 'member';
}

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
}

interface FeedItem {
  id: string;
  message: string;
  timestamp: string;
}

export default function FamilyScreen() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Replace with actual family ID from context/auth
  const mockFamilyId = 'mock-family-id';

  useEffect(() => {
    fetchFamilyData();
  }, []);

  const fetchFamilyData = async () => {
    setIsLoading(true);
    try {
      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select(`
          user_id,
          role,
          users:user_id (
            id,
            name
          )
        `)
        .eq('family_id', mockFamilyId);

      if (membersError) throw membersError;

      // Fetch points and streaks for each member
      const membersWithStats = await Promise.all(
        (membersData || []).map(async (member: any) => {
          const userId = member.user_id;
          
          // Get points (weekly)
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);

          const { data: pointsData } = await supabase
            .from('points')
            .select('points')
            .eq('user_id', userId)
            .eq('family_id', mockFamilyId)
            .gte('created_at', weekStart.toISOString());

          const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

          // Get streak
          const { data: checkins } = await supabase
            .from('checkins')
            .select('date')
            .eq('user_id', userId)
            .eq('family_id', mockFamilyId)
            .eq('verification_status', 'verified')
            .order('date', { ascending: false });

          let streak = 0;
          if (checkins && checkins.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < checkins.length; i++) {
              const checkInDate = new Date(checkins[i].date);
              checkInDate.setHours(0, 0, 0, 0);
              const daysDiff = Math.floor((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysDiff === i) {
                streak++;
              } else {
                break;
              }
            }
          }

          return {
            id: userId,
            name: member.users?.name || 'Unknown',
            streak,
            points: totalPoints,
            role: member.role,
          };
        })
      );

      setMembers(membersWithStats);

      // Build leaderboard (sorted by points)
      const sorted = [...membersWithStats].sort((a, b) => b.points - a.points);
      const leaderboardEntries: LeaderboardEntry[] = sorted.map((member, index) => ({
        id: member.id,
        name: member.name,
        points: member.points,
        rank: index + 1,
      }));
      setLeaderboard(leaderboardEntries);

      // Build feed (mock for now - can be enhanced with real activity logs)
      const feed: FeedItem[] = membersWithStats
        .filter(m => m.streak > 0)
        .map((member, index) => ({
          id: `feed-${member.id}-${index}`,
          message: `${member.name} reached a ${member.streak}-day streak!`,
          timestamp: new Date().toISOString(),
        }))
        .slice(0, 10);
      
      setFeedItems(feed);
    } catch (error) {
      console.error('Error fetching family data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = () => {
    // TODO: Implement add member flow (invitation)
    console.log('Add member pressed');
  };

  return (
    <Container>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Family</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isLoading ? (
              <Text style={styles.loading}>Loading...</Text>
            ) : members.length === 0 ? (
              <Text style={styles.empty}>No family members yet</Text>
            ) : (
              members.map((member) => (
                <MemberCard
                  key={member.id}
                  name={member.name}
                  streak={member.streak}
                  points={member.points}
                  role={member.role}
                />
              ))
            )}
          </View>

          <Leaderboard entries={leaderboard} period="weekly" />

          <Feed items={feedItems} />

          <Button
            title="Add Family Member"
            onPress={handleAddMember}
            variant="outline"
            fullWidth
          />
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
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.md,
  },
  loading: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
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

