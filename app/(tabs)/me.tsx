import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Share2 } from 'lucide-react-native';
import { Container } from '@/lib/components/Container';
import { ProfileCard } from '@/lib/components/ProfileCard';
import { SettingsSection } from '@/lib/components/SettingsSection';
import { Button } from '@/lib/components/Button';
import { Card } from '@/lib/components/Card';
import { useAuth } from '@/lib/context/AuthContext';
import { useUser } from '@/lib/context/UserContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { generateFamilyInviteCode, formatFamilyCode } from '@/lib/utils/familyCode';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function MeScreen() {
  const { user, signOut } = useAuth();
  const { profile, updatePreferences, loading: userLoading } = useUser();
  const { family, userRole, familyId, loading: familyLoading } = useFamily();
  const [totalPoints, setTotalPoints] = useState(0);
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !familyLoading && user && familyId) {
      fetchTotalPoints();
      if (userRole === 'owner') {
        fetchFamilyCode();
      }
    }
  }, [userLoading, familyLoading, user, familyId, userRole]);

  const fetchTotalPoints = async () => {
    if (!user) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('total_points')
        .eq('id', user.id)
        .single();

      setTotalPoints(userData?.total_points || 0);
    } catch (error) {
      console.error('Error fetching points:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyCode = async () => {
    if (!familyId) return;

    try {
      // First try to get from families table
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .select('active_invite_code')
        .eq('id', familyId)
        .single();

      if (familyData && familyData.active_invite_code) {
        setFamilyCode(familyData.active_invite_code);
        return;
      }

      // Fallback: try to get from family_invite_codes table
      const { data: codeData, error: codeError } = await supabase
        .from('family_invite_codes')
        .select('code')
        .eq('family_id', familyId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (codeData) {
        setFamilyCode(codeData.code);
      }
    } catch (error) {
      console.error('Error fetching family code:', error);
    }
  };

  const handleGenerateNewCode = async () => {
    if (!user || !familyId) return;

    setLoadingCode(true);
    try {
      const code = await generateFamilyInviteCode(familyId, user.id);
      setFamilyCode(code);
      Alert.alert('Success', 'New invite code generated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate code');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleShareCode = async () => {
    if (!familyCode || !family) return;

    try {
      const message = `Join the ${family.name} family on Kin! 🏋️\n\nUse this invite code: ${formatFamilyCode(familyCode)}\n\nDownload Kin and let's stay accountable together!`;
      
      await Share.share({
        message,
        title: `Join ${family.name} on Kin`,
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const handleWorkoutGoalChange = () => {
    Alert.prompt(
      'Weekly Workout Goal',
      'How many workouts per week?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            const goal = parseInt(value || '5');
            if (goal >= 0 && goal <= 7) {
              try {
                await updatePreferences({ weekly_workout_goal: goal });
                Alert.alert('Success', 'Workout goal updated!');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to update goal');
              }
            } else {
              Alert.alert('Error', 'Please enter a number between 0 and 7');
            }
          },
        },
      ],
      'plain-text',
      profile?.weekly_workout_goal?.toString() || '5'
    );
  };

  const handleStepGoalChange = () => {
    Alert.prompt(
      'Daily Step Goal',
      'How many steps per day?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (value) => {
            const goal = parseInt(value || '10000');
            if (goal >= 0) {
              try {
                await updatePreferences({ daily_step_goal: goal });
                Alert.alert('Success', 'Step goal updated!');
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to update goal');
              }
            } else {
              Alert.alert('Error', 'Please enter a valid number');
            }
          },
        },
      ],
      'plain-text',
      profile?.daily_step_goal?.toString() || '10000'
    );
  };

  const handleReminderPress = () => {
    Alert.alert('Reminders', 'Reminder time picker coming soon');
  };

  const handleToggleRequireProof = async (value: boolean) => {
    try {
      await updatePreferences({ require_photo_proof: value });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update preference');
    }
  };

  const handleTogglePrivateFeed = async (value: boolean) => {
    try {
      await updatePreferences({ privacy_opt_out: value });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update preference');
    }
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
            await signOut();
            router.replace('/welcome');
          },
        },
      ]
    );
  };

  if (loading || userLoading || familyLoading) {
    return (
      <Container>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      </Container>
    );
  }

  const goalsSettings = [
    {
      id: 'workout',
      label: 'Weekly Workout Goal',
      description: `${profile?.weekly_workout_goal || 5} workouts per week`,
      type: 'button' as const,
      onPress: handleWorkoutGoalChange,
    },
    {
      id: 'steps',
      label: 'Daily Step Goal',
      description: `${(profile?.daily_step_goal || 10000).toLocaleString()} steps`,
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
      value: profile?.require_photo_proof ?? true,
      onToggle: handleToggleRequireProof,
    },
    {
      id: 'privacy',
      label: 'Private Feed',
      description: 'Hide your activity from family feed',
      type: 'toggle' as const,
      value: profile?.privacy_opt_out ?? false,
      onToggle: handleTogglePrivateFeed,
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
            name={profile?.name || 'User'}
            email={profile?.email || user?.email || ''}
            points={totalPoints}
            role={userRole || 'member'}
          />

          {userRole === 'owner' && (
            <Card style={styles.familyCodeCard}>
              <Text style={styles.familyCodeTitle}>Family Invite Code</Text>
              <Text style={styles.familyCodeDescription}>
                Share this code with family members to invite them
              </Text>
              
              {familyCode ? (
                <>
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{formatFamilyCode(familyCode)}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={handleShareCode}
                  >
                    <Share2 size={20} color={Colors.accent} />
                    <Text style={styles.shareButtonText}>Share Code</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleGenerateNewCode} disabled={loadingCode}>
                    <Text style={styles.generateNewText}>
                      {loadingCode ? 'Generating...' : 'Generate New Code'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.codeContainer}>
                    <Text style={styles.noCodeText}>No code generated yet</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.generateButton}
                    onPress={handleGenerateNewCode}
                    disabled={loadingCode}
                  >
                    <Text style={styles.generateButtonText}>
                      {loadingCode ? 'Generating...' : 'Generate Invite Code'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </Card>
          )}

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
  familyCodeCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  familyCodeTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
  },
  familyCodeDescription: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  codeContainer: {
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  codeText: {
    fontSize: 24,
    fontFamily: Typography.headingFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
    letterSpacing: 3,
  },
  generateNewText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  noCodeText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  generateButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent + '20',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginVertical: Spacing.sm,
  },
  shareButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
});

