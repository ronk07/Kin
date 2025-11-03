import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Container } from '@/lib/components/Container';
import { ProfileCard } from '@/lib/components/ProfileCard';
import { SettingsSection } from '@/lib/components/SettingsSection';
import { Button } from '@/lib/components/Button';
import { Card } from '@/lib/components/Card';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function MeScreen() {
  const [workoutGoal, setWorkoutGoal] = useState(5);
  const [stepGoal, setStepGoal] = useState(10000);
  const [requireProof, setRequireProof] = useState(true);
  const [privateFeed, setPrivateFeed] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [userRole, setUserRole] = useState('member');

  // TODO: Replace with actual user context/auth
  const mockUserId = 'mock-user-id';
  const mockFamilyId = 'mock-family-id';

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch user points
      const { data: pointsData } = await supabase
        .from('points')
        .select('points')
        .eq('user_id', mockUserId)
        .eq('family_id', mockFamilyId);

      const points = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;
      setTotalPoints(points);

      // TODO: Fetch actual user data from context/auth
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleWorkoutGoalChange = () => {
    // TODO: Implement workout goal picker
    Alert.alert('Workout Goal', 'Goal picker coming soon');
  };

  const handleStepGoalChange = () => {
    // TODO: Implement step goal picker
    Alert.alert('Step Goal', 'Goal picker coming soon');
  };

  const handleReminderPress = () => {
    // TODO: Implement reminder time picker
    Alert.alert('Reminders', 'Reminder settings coming soon');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement actual sign out
            console.log('Sign out');
          },
        },
      ]
    );
  };

  const goalsSettings = [
    {
      id: 'workout',
      label: 'Weekly Workout Goal',
      description: `${workoutGoal} workouts per week`,
      type: 'button' as const,
      onPress: handleWorkoutGoalChange,
    },
    {
      id: 'steps',
      label: 'Daily Step Goal',
      description: `${stepGoal.toLocaleString()} steps`,
      type: 'button' as const,
      onPress: handleStepGoalChange,
    },
  ];

  const preferencesSettings = [
    {
      id: 'proof',
      label: 'Require Photo Proof',
      description: 'Verify workouts with photos',
      type: 'toggle' as const,
      value: requireProof,
      onToggle: setRequireProof,
    },
    {
      id: 'privacy',
      label: 'Private Feed',
      description: 'Hide your activity from family feed',
      type: 'toggle' as const,
      value: privateFeed,
      onToggle: setPrivateFeed,
    },
    {
      id: 'reminders',
      label: 'Reminders',
      description: 'Set daily check-in times',
      type: 'button' as const,
      onPress: handleReminderPress,
    },
  ];

  return (
    <Container>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Me</Text>

          <ProfileCard
            name={userName}
            email={userEmail}
            points={totalPoints}
            role={userRole}
          />

          <SettingsSection title="Goals" items={goalsSettings} />

          <SettingsSection title="Preferences" items={preferencesSettings} />

          <View style={styles.signOutContainer}>
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
              fullWidth
            />
          </View>
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
  signOutContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});

