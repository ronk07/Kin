import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert, ActivityIndicator, TouchableOpacity, Share, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Share2, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [showWorkoutGoalModal, setShowWorkoutGoalModal] = useState(false);
  const [showStepGoalModal, setShowStepGoalModal] = useState(false);
  const [tempWorkoutGoal, setTempWorkoutGoal] = useState(5);
  const [tempStepGoal, setTempStepGoal] = useState(10000);
  const router = useRouter();

  const STEP_GOALS = [
    { value: 5000, label: '5,000 steps' },
    { value: 8000, label: '8,000 steps' },
    { value: 10000, label: '10,000 steps' },
    { value: 15000, label: '15,000 steps' },
  ];

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const sectionsOpacity = useSharedValue(0);

  // Helper function to format reminder time from TIME string (HH:MM:SS) to readable format
  const formatReminderTime = (timeString: string | null | undefined): string => {
    if (!timeString) return 'Not set';
    
    try {
      // Parse TIME string (HH:MM:SS format)
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting reminder time:', error);
      return 'Not set';
    }
  };

  // Helper function to parse TIME string to Date object
  const parseReminderTime = (timeString: string | null | undefined): Date => {
    const defaultDate = new Date();
    defaultDate.setHours(9, 0, 0, 0); // Default to 9:00 AM
    
    if (!timeString) return defaultDate;
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (error) {
      console.error('Error parsing reminder time:', error);
      return defaultDate;
    }
  };

  const fetchTotalPoints = React.useCallback(async () => {
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
  }, [user]);

  const fetchFamilyCode = React.useCallback(async () => {
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
  }, [familyId]);

  useEffect(() => {
    if (!userLoading && !familyLoading && user && familyId) {
      fetchTotalPoints();
      if (userRole === 'owner') {
        fetchFamilyCode();
      }
    }
  }, [userLoading, familyLoading, user, familyId, userRole, fetchTotalPoints, fetchFamilyCode]);

  // Refresh points and family code whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!userLoading && !familyLoading && user && familyId) {
        fetchTotalPoints();
        if (userRole === 'owner') {
          fetchFamilyCode();
        }
      }

      // Animate whenever screen comes into focus
      if (!loading && !userLoading && !familyLoading) {
        // Reset animation values
        headerOpacity.value = 0;
        headerTranslateY.value = -20;
        sectionsOpacity.value = 0;
        
        // Play animations
        headerOpacity.value = withTiming(1, { duration: 500 });
        headerTranslateY.value = withTiming(0, { duration: 500 });
        sectionsOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
      }
    }, [userLoading, familyLoading, user, familyId, userRole, fetchTotalPoints, fetchFamilyCode, loading])
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const sectionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sectionsOpacity.value,
  }));

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
    setTempWorkoutGoal(profile?.weekly_workout_goal || 5);
    setShowWorkoutGoalModal(true);
  };

  const handleStepGoalChange = () => {
    setTempStepGoal(profile?.daily_step_goal || 10000);
    setShowStepGoalModal(true);
  };

  const handleSaveWorkoutGoal = async () => {
    try {
      await updatePreferences({ weekly_workout_goal: tempWorkoutGoal });
      setShowWorkoutGoalModal(false);
      Alert.alert('Success', 'Workout goal updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update goal');
    }
  };

  const handleSaveStepGoal = async () => {
    try {
      await updatePreferences({ daily_step_goal: tempStepGoal });
      setShowStepGoalModal(false);
      Alert.alert('Success', 'Step goal updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update goal');
    }
  };

  const handleReminderPress = () => {
    if (Platform.OS === 'ios') {
      // iOS: Show DateTimePicker directly
      setShowReminderTimePicker(true);
    } else {
      // Android: Show alert with options
      Alert.alert(
        'Reminder Settings',
        `Current reminder time: ${formatReminderTime(profile?.reminder_time)}\n\nWould you like to change it?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Change Time',
            onPress: () => setShowReminderTimePicker(true),
          },
        ]
      );
    }
  };

  const handleReminderTimeChange = async (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowReminderTimePicker(false);
    }

    if (event.type === 'set' && selectedTime) {
      try {
        // Convert Date to TIME string format (HH:MM:SS)
        const hours = selectedTime.getHours().toString().padStart(2, '0');
        const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}:00`;

        await updatePreferences({ reminder_time: timeString });
        
        if (Platform.OS === 'ios') {
          setShowReminderTimePicker(false);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to update reminder time');
      }
    } else if (event.type === 'dismissed') {
      setShowReminderTimePicker(false);
    }
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
      id: 'reminders',
      label: 'Reminders',
      description: profile?.reminder_enabled 
        ? `Daily reminder at ${formatReminderTime(profile?.reminder_time)}`
        : 'Reminders disabled',
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
          <Animated.View style={headerAnimatedStyle}>
            <Text style={styles.title}>Me</Text>
          </Animated.View>

          <Animated.View style={sectionsAnimatedStyle}>
            <ProfileCard
              name={profile?.name || 'User'}
              email={profile?.email || user?.email || ''}
              points={totalPoints}
              role={userRole || 'member'}
            />
          </Animated.View>

          {userRole === 'owner' && (
            <Animated.View style={sectionsAnimatedStyle}>
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
            </Animated.View>
          )}

          <Animated.View style={sectionsAnimatedStyle}>
            <SettingsSection title="Goals" items={goalsSettings} />
          </Animated.View>

          <Animated.View style={sectionsAnimatedStyle}>
            <SettingsSection title="Preferences" items={preferencesSettings} />
          </Animated.View>

          <Animated.View style={sectionsAnimatedStyle}>
            <View style={styles.signOutContainer}>
              <Button
                title="Sign Out"
                onPress={handleSignOut}
                variant="outline"
                fullWidth
              />
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Reminder Time Picker */}
      {showReminderTimePicker && (
        <DateTimePicker
          value={parseReminderTime(profile?.reminder_time)}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleReminderTimeChange}
          is24Hour={false}
        />
      )}

      {/* Workout Goal Modal */}
      <Modal
        visible={showWorkoutGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWorkoutGoalModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setShowWorkoutGoalModal(false)}
            />
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Weekly Workout Goal</Text>
                <TouchableOpacity
                  onPress={() => setShowWorkoutGoalModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDescription}>
                How many days per week do you want to workout?
              </Text>

              <View style={styles.daysContainer}>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      tempWorkoutGoal >= day && styles.dayButtonActive,
                    ]}
                    onPress={() => setTempWorkoutGoal(day)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        tempWorkoutGoal >= day && styles.dayButtonTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalValue}>{tempWorkoutGoal} days per week</Text>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowWorkoutGoalModal(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveWorkoutGoal}
                >
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Step Goal Modal */}
      <Modal
        visible={showStepGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStepGoalModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setShowStepGoalModal(false)}
            />
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Daily Step Goal</Text>
                <TouchableOpacity
                  onPress={() => setShowStepGoalModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDescription}>
                How many steps do you want to take each day?
              </Text>

              <View style={styles.stepOptionsContainer}>
                {STEP_GOALS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.stepOption,
                      tempStepGoal === option.value && styles.stepOptionActive,
                    ]}
                    onPress={() => setTempStepGoal(option.value)}
                  >
                    <Text
                      style={[
                        styles.stepOptionText,
                        tempStepGoal === option.value && styles.stepOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowStepGoalModal(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSaveStepGoal}
                >
                  <Text style={styles.modalButtonSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    flex: 1,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalDescription: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  dayButtonText: {
    fontSize: Typography.h3,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  dayButtonTextActive: {
    color: Colors.accent,
  },
  modalValue: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  stepOptionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  stepOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
  },
  stepOptionActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  stepOptionText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.medium,
  },
  stepOptionTextActive: {
    color: Colors.accent,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '50',
  },
  modalButtonCancelText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  modalButtonSave: {
    backgroundColor: Colors.accent,
  },
  modalButtonSaveText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
});

