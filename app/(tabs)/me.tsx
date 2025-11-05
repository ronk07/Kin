import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert, ActivityIndicator, TouchableOpacity, Share, Platform, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Share2, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { Container } from '@/lib/components/Container';
import { ProfileCard } from '@/lib/components/ProfileCard';
import { SettingsSection } from '@/lib/components/SettingsSection';
import { Button } from '@/lib/components/Button';
import { Card } from '@/lib/components/Card';
import { TaskManagementSection } from '@/lib/components/TaskManagementSection';
import { AddTaskModal } from '@/lib/components/AddTaskModal';
import { useAuth } from '@/lib/context/AuthContext';
import { useUser } from '@/lib/context/UserContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { useHealthKit } from '@/lib/hooks/useHealthKit';
import { generateFamilyInviteCode, formatFamilyCode } from '@/lib/utils/familyCode';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Activity } from 'lucide-react-native';

export default function MeScreen() {
  const { user, signOut } = useAuth();
  const { profile, tasks, updatePreferences, refreshProfile, loading: userLoading } = useUser();
  const { family, userRole, familyId, loading: familyLoading, updateFamilySettings } = useFamily();
  const { isAvailable, isAuthorized, requestAuthorization, loading: healthKitLoading } = useHealthKit({ autoRequest: false });
  const [totalPoints, setTotalPoints] = useState(0);
  const [familyCode, setFamilyCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [showReminderTimeModal, setShowReminderTimeModal] = useState(false);
  const [tempReminderTime, setTempReminderTime] = useState<Date>(new Date());
  const [showWorkoutGoalModal, setShowWorkoutGoalModal] = useState(false);
  const [showStepGoalModal, setShowStepGoalModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
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
      fetchFamilyCode(); // Fetch for all family members
    }
  }, [userLoading, familyLoading, user, familyId, fetchTotalPoints, fetchFamilyCode]);

  // Refresh points and family code whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!userLoading && !familyLoading && user && familyId) {
        fetchTotalPoints();
        fetchFamilyCode(); // Fetch for all family members
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
    }, [userLoading, familyLoading, user, familyId, fetchTotalPoints, fetchFamilyCode, loading])
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
      // Use raw code without formatting (no dash) to match database format
      const message = `Join the ${family.name} family on Kin! 🏋️\n\nUse this invite code: ${familyCode}\n\nDownload Kin and let's stay accountable together!`;
      
      await Share.share({
        message,
        title: `Join ${family.name} on Kin`,
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const handleCopyCode = async () => {
    if (!familyCode) return;

    try {
      await Clipboard.setStringAsync(familyCode);
      Alert.alert('Copied!', 'Family invite code copied to clipboard');
    } catch (error) {
      console.error('Error copying code:', error);
      Alert.alert('Error', 'Failed to copy code');
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
    // Initialize temp time with current reminder time
    setTempReminderTime(parseReminderTime(profile?.reminder_time));
    
    if (Platform.OS === 'ios') {
      // iOS: Show modal with DateTimePicker and confirm button
      setShowReminderTimeModal(true);
    } else {
      // Android: Show native picker (has built-in confirm/cancel)
      setShowReminderTimePicker(true);
    }
  };

  const handleReminderTimeChange = async (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      // Android: Save immediately when user confirms
      if (event.type === 'set' && selectedTime) {
        try {
          const hours = selectedTime.getHours().toString().padStart(2, '0');
          const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
          const timeString = `${hours}:${minutes}:00`;
          await updatePreferences({ reminder_time: timeString });
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to update reminder time');
        }
      }
      setShowReminderTimePicker(false);
    } else {
      // iOS: Only update temp time, don't save yet
      if (selectedTime) {
        setTempReminderTime(selectedTime);
      }
    }
  };

  const handleConfirmReminderTime = async () => {
    try {
      const hours = tempReminderTime.getHours().toString().padStart(2, '0');
      const minutes = tempReminderTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;
      await updatePreferences({ reminder_time: timeString });
      setShowReminderTimeModal(false);
      Alert.alert('Success', 'Reminder time updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update reminder time');
    }
  };

  const handleToggleRequireProof = async (value: boolean) => {
    if (!familyId) return;

    try {
      await updateFamilySettings({ require_photo_proof: value });
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

  const handleRequestHealthKitAccess = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Not Available',
        'HealthKit is only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isAvailable) {
      Alert.alert(
        'HealthKit Not Available',
        'HealthKit requires a development or production build. Please build the app using EAS Build or run it locally.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (isAuthorized) {
      Alert.alert(
        'Already Enabled',
        'HealthKit access has already been granted. Your step count is being tracked automatically.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await requestAuthorization();
      
      // Wait a moment for authorization state to update
      setTimeout(() => {
        // The isAuthorized state should update automatically from the hook
        // Show feedback based on the result
        if (isAuthorized) {
          Alert.alert(
            'Success!',
            'HealthKit access granted. Your step count will now be tracked automatically.',
            [{ text: 'OK' }]
          );
        } else {
          // User denied or permission not granted
          Alert.alert(
            'Permission Needed',
            'To track your daily steps, please enable HealthKit access in Settings > Privacy & Security > Health > Kin.',
            [{ text: 'OK' }]
          );
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error requesting HealthKit permission:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to request HealthKit permission. You can enable it in Settings > Privacy & Security > Health > Kin.',
        [{ text: 'OK' }]
      );
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

  const handleAddTask = () => {
    console.log('Add task button pressed, userRole:', userRole, 'familyId:', familyId);
    setShowAddTaskModal(true);
  };

  const handleTaskAdded = async () => {
    await refreshProfile();
  };

  const handleRemoveTask = async (familyTaskId: string) => {
    if (!familyId) return;

    console.log('Remove task called, familyTaskId:', familyTaskId, 'userRole:', userRole);
    try {
      const { error } = await supabase.rpc('remove_family_task', {
        p_family_id: familyId,
        p_family_task_id: familyTaskId,
      });

      if (error) throw error;

      Alert.alert('Success', 'Task removed successfully');
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove task');
      console.error('Error removing task:', error);
    }
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

  const preferencesSettings = [
    ...(familyId ? [{
      id: 'proof',
      label: 'Require Photo Proof',
      description: 'Verify tasks with photos.',
      type: 'toggle' as const,
      value: family?.require_photo_proof ?? false,
      onToggle: handleToggleRequireProof,
    }] : []),
    {
      id: 'reminders',
      label: 'Reminders',
      description: profile?.reminder_enabled 
        ? `Daily reminder at ${formatReminderTime(profile?.reminder_time)}`
        : 'Reminders disabled',
      type: 'button' as const,
      onPress: handleReminderPress,
    },
    // Only show HealthKit option on iOS
    ...(Platform.OS === 'ios' ? [{
      id: 'healthkit',
      label: 'Step Tracking',
      description: isAuthorized 
        ? 'HealthKit access enabled - tracking your steps'
        : isAvailable
        ? 'Enable to track your daily step count automatically'
        : 'Requires a development or production build',
      type: 'button' as const,
      onPress: handleRequestHealthKitAccess,
    }] : []),
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

          {familyId && (
            <Animated.View style={sectionsAnimatedStyle}>
              <Card style={styles.familyCodeCard}>
                <Text style={styles.familyCodeTitle}>Family Invite Code</Text>
                <Text style={styles.familyCodeDescription}>
                  Share this code with family members to invite them
                </Text>
                
                {familyCode ? (
                  <>
                    <TouchableOpacity 
                      style={styles.codeContainer}
                      onPress={handleCopyCode}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.codeText}>{formatFamilyCode(familyCode)}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.shareButton}
                      onPress={handleShareCode}
                    >
                      <Share2 size={20} color={Colors.accent} />
                      <Text style={styles.shareButtonText}>Share Code</Text>
                    </TouchableOpacity>

                    {userRole === 'owner' && (
                      <TouchableOpacity onPress={handleGenerateNewCode} disabled={loadingCode}>
                        <Text style={styles.generateNewText}>
                          {loadingCode ? 'Generating...' : 'Generate New Code'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    {userRole === 'owner' ? (
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
                    ) : (
                      <View style={styles.codeContainer}>
                        <Text style={styles.noCodeText}>No invite code available</Text>
                      </View>
                    )}
                  </>
                )}
              </Card>
            </Animated.View>
          )}

          {familyId && (
            <Animated.View style={sectionsAnimatedStyle}>
              <TaskManagementSection
                tasks={tasks}
                onAddTask={handleAddTask}
                onRemoveTask={handleRemoveTask}
                canManage={true}
              />
            </Animated.View>
          )}

          <Animated.View style={sectionsAnimatedStyle}>
            <View style={styles.goalsSection}>
              <Text style={styles.goalsSectionTitle}>Goals</Text>
              <View style={styles.goalsList}>
                <Card style={styles.goalCard}>
                  <TouchableOpacity 
                    style={styles.goalContent}
                    onPress={handleWorkoutGoalChange}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName}>Weekly Workout Goal</Text>
                      <Text style={styles.goalDescription}>
                        {profile?.weekly_workout_goal || 5} workouts per week
                      </Text>
                    </View>
                    <View style={styles.goalRight}>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>+20 pts</Text>
                      </View>
                      <Text style={styles.arrowText}>→</Text>
                    </View>
                  </TouchableOpacity>
                </Card>

                <Card style={styles.goalCard}>
                  <TouchableOpacity 
                    style={styles.goalContent}
                    onPress={handleStepGoalChange}
                    activeOpacity={0.7}
                  >
                    <View style={styles.goalInfo}>
                      <Text style={styles.goalName}>Daily Step Goal</Text>
                      <Text style={styles.goalDescription}>
                        {(profile?.daily_step_goal || 10000).toLocaleString()} steps
                      </Text>
                    </View>
                    <View style={styles.goalRight}>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.pointsText}>+5 pts</Text>
                      </View>
                      <Text style={styles.arrowText}>→</Text>
                    </View>
                  </TouchableOpacity>
                </Card>
              </View>
            </View>
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

      {/* Reminder Time Picker - Android (native) */}
      {showReminderTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseReminderTime(profile?.reminder_time)}
          mode="time"
          display="default"
          onChange={handleReminderTimeChange}
          is24Hour={false}
        />
      )}

      {/* Reminder Time Modal - iOS (with confirm button) */}
      <Modal
        visible={showReminderTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReminderTimeModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setShowReminderTimeModal(false)}
            />
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Reminder Time</Text>
                <TouchableOpacity
                  onPress={() => setShowReminderTimeModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalDescription}>
                Choose when you'd like to receive daily reminders
              </Text>

              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={tempReminderTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedTime) => {
                    if (selectedTime) {
                      setTempReminderTime(selectedTime);
                    }
                  }}
                  is24Hour={false}
                  textColor={Colors.text}
                />
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowReminderTimeModal(false)}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleConfirmReminderTime}
                >
                  <Text style={styles.modalButtonConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

      {/* Add Task Modal */}
      {familyId && user && (
        <AddTaskModal
          visible={showAddTaskModal}
          onClose={() => setShowAddTaskModal(false)}
          onTaskAdded={handleTaskAdded}
          familyId={familyId}
          userId={user.id}
        />
      )}
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
  modalButtonConfirm: {
    backgroundColor: Colors.accent,
  },
  modalButtonConfirmText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
  timePickerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  goalsSection: {
    marginBottom: Spacing.xl,
  },
  goalsSectionTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  goalsList: {
    gap: Spacing.sm,
  },
  goalCard: {
    padding: Spacing.md,
  },
  goalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  goalName: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
    marginBottom: Spacing.xs,
  },
  goalDescription: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  goalRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pointsBadge: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  pointsText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  arrowText: {
    fontSize: Typography.h4,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
  },
});

