import { Colors, Spacing, Typography } from '@/constants/theme';
import { VerificationResponse, verifyTaskImage } from '@/lib/api/openai';
import { Container } from '@/lib/components/Container';
import { DailyScripture } from '@/lib/components/DailyScripture';
import { StepCounter } from '@/lib/components/StepCounter';
import { TaskCard } from '@/lib/components/TaskCard';
import { TaskDetailsForm } from '@/lib/components/TaskDetailsForm';
import { VerificationModal } from '@/lib/components/VerificationModal';
import { WeekTracker } from '@/lib/components/WeekTracker';
import { useAuth } from '@/lib/context/AuthContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { useUser } from '@/lib/context/UserContext';
import { useHealthKit } from '@/lib/hooks/useHealthKit';
import { supabase } from '@/lib/supabase/client';
import { calculateStreak, updateStreakInDatabase } from '@/lib/utils/streak';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type TaskVerificationDetail = {
  confidence: number | null;
  reason: string | null;
  proofUrl: string | null;
  verifiedAt: string | null;
  model: string | null;
  caloriesBurned: number | null;
  durationMinutes: number | null;
  bibleChapter: string | null;
  completionId: string | null;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { tasks, profile, loading: userLoading } = useUser();
  const { family, familyId, loading: familyLoading } = useFamily();
  const { steps, isAvailable, isAuthorized, fetchTodaySteps } = useHealthKit();
  
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Record<string, boolean>>({});
  const [selectedDaySteps, setSelectedDaySteps] = useState(0);
  const [todayTaskDetails, setTodayTaskDetails] = useState<Record<string, TaskVerificationDetail>>({});
  const [selectedDayDetails, setSelectedDayDetails] = useState<Record<string, TaskVerificationDetail>>({});
  
  // Verification modal state
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationImageUri, setVerificationImageUri] = useState<string | null>(null);
  const [verificationTaskName, setVerificationTaskName] = useState<'workout' | 'bible_reading' | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [pendingCompletionDate, setPendingCompletionDate] = useState<string | null>(null);
  const [verificationModalMode, setVerificationModalMode] = useState<'decision' | 'review'>('decision');
  
  // Task details form state
  const [taskDetailsFormVisible, setTaskDetailsFormVisible] = useState(false);
  const [editingTaskDetails, setEditingTaskDetails] = useState<{ taskName: 'workout' | 'bible_reading'; completionId: string } | null>(null);
  const [pendingCompletionId, setPendingCompletionId] = useState<string | null>(null);
  const [taskDetailsTaskName, setTaskDetailsTaskName] = useState<'workout' | 'bible_reading' | null>(null);

  useEffect(() => {
    if (!userLoading && !familyLoading && user && familyId) {
      fetchUserData();
    }
  }, [userLoading, familyLoading, user, familyId]);

  useEffect(() => {
    console.log('User tasks loaded:', tasks.length, tasks);
  }, [tasks]);

  useEffect(() => {
    // Refresh steps every time the screen is focused
    const interval = setInterval(() => {
      if (isAuthorized && isAvailable) {
        fetchTodaySteps();
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [isAuthorized, isAvailable]);

  // Store daily steps in database
  useEffect(() => {
    const storeDailySteps = async () => {
      if (!user || !steps || steps === 0) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Upsert daily steps
        await supabase
          .from('daily_steps')
          .upsert({
            user_id: user.id,
            date: today,
            steps: steps,
            source: 'healthkit',
          }, {
            onConflict: 'user_id,date',
          });
      } catch (error) {
        console.error('Error storing daily steps:', error);
      }
    };

    if (steps > 0 && user) {
      storeDailySteps();
    }
  }, [steps, user]);

  const fetchUserData = async () => {
    if (!user || !familyId) return;

    try {
      // Calculate and update streak based on both tasks being completed
      const streak = await calculateStreak(user.id);
      await updateStreakInDatabase(user.id);
      setStreakDays(streak);

      // Check today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('task_completions')
        .select('id, task_name, proof_url, verification_confidence, verification_reason, verification_model, verified_at, calories_burned, duration_minutes, bible_chapter')
        .eq('user_id', user.id)
        .eq('completed_date', today)
        .eq('verification_status', 'verified');

      const completed: Record<string, boolean> = {};
      const details: Record<string, TaskVerificationDetail> = {};
      completions?.forEach(c => {
        if (c.task_name === 'workout' || c.task_name === 'bible_reading') {
          completed[c.task_name] = true;
          details[c.task_name] = {
            confidence: c.verification_confidence ?? null,
            reason: c.verification_reason ?? null,
            proofUrl: c.proof_url ?? null,
            verifiedAt: c.verified_at ?? null,
            model: c.verification_model ?? null,
            caloriesBurned: c.calories_burned ?? null,
            durationMinutes: c.duration_minutes ?? null,
            bibleChapter: c.bible_chapter ?? null,
            completionId: c.id ?? null,
          };
        }
      });
      setCompletedTasks(completed);
      setTodayTaskDetails(details);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkIncomplete = async (taskName: 'workout' | 'bible_reading', dateOverride?: string) => {
    if (!user || !familyId) return;

    try {
      // Use provided date, selected date if viewing a different day, otherwise use today
      const completionDate = dateOverride || selectedDate || new Date().toISOString().split('T')[0];
      const todayDate = new Date().toISOString().split('T')[0];
      
      // Delete task completion for the selected date
      const { error: deleteError } = await supabase
        .from('task_completions')
        .delete()
        .eq('task_name', taskName)
        .eq('user_id', user.id)
        .eq('completed_date', completionDate);

      if (deleteError) throw deleteError;

      // Remove points if they were awarded today (we'll need to track this better, but for now just remove last 10 points)
      // Note: In a production app, you'd want to track which points came from which completion
      const { data: pointsData } = await supabase
        .from('points')
        .select('id, points')
        .eq('user_id', user.id)
        .eq('family_id', familyId)
        .eq('source', `${taskName} completion`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pointsData && pointsData.length > 0) {
        const pointsToRemove = pointsData[0].points;
        
        // Delete the points record
        const { error: pointDeleteError } = await supabase
          .from('points')
          .delete()
          .eq('id', pointsData[0].id);

        if (pointDeleteError) {
          console.error('Error removing points:', pointDeleteError);
        } else {
          // Update user's total_points
          const { data: currentUser } = await supabase
            .from('users')
            .select('total_points')
            .eq('id', user.id)
            .single();

          if (currentUser) {
            const newTotal = Math.max(0, (currentUser.total_points || 0) - pointsToRemove);
            await supabase
              .from('users')
              .update({ total_points: newTotal })
              .eq('id', user.id);
          }
        }
      }

      setCompletedTasks(prev => {
        const updated = { ...prev };
        if (!dateOverride && !selectedDate) {
          delete updated[taskName];
        }
        return updated;
      });
      setTodayTaskDetails(prev => {
        if (completionDate !== todayDate) return prev;
        const updated = { ...prev };
        delete updated[taskName];
        return updated;
      });
      if (selectedDate || dateOverride) {
        setSelectedDayTasks(prev => {
          const updated = { ...prev };
          updated[taskName] = false;
          return updated;
        });
        setSelectedDayDetails(prev => {
          const updated = { ...prev };
          delete updated[taskName];
          return updated;
        });
      }
      
      await fetchUserData();
      
      // Refresh week completions to update circle indicators
      await fetchWeekCompletions();
    } catch (error: any) {
      console.error('Error marking task incomplete:', error);
      Alert.alert('Error', error.message || 'Failed to mark task incomplete');
    }
  };

  const handleTaskVerify = async (taskName: 'workout' | 'bible_reading', imageUri?: string) => {
    if (!user || !familyId) return;

    const completionDate = selectedDate || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // If no image provided, complete immediately without verification
    if (!imageUri) {
      const manualVerification: VerificationResponse = {
        isVerified: true,
        confidence: 1,
        reason: 'Marked complete without photo verification',
        model: 'manual',
      };
      if (completionDate < today) {
        // Show confirmation for past day
        return new Promise<void>((resolve) => {
          Alert.alert(
            'Mark Past Task Complete',
            'You are marking a task from the past as complete. Are you sure you want to do this?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(),
              },
              {
                text: 'Yes, Mark Complete',
                onPress: async () => {
                  const completionId = await performTaskVerification(taskName, undefined, completionDate, manualVerification);
                  if (completionId) {
                    setPendingCompletionId(completionId);
                    setTaskDetailsTaskName(taskName);
                    setTaskDetailsFormVisible(true);
                  }
                  resolve();
                },
              },
            ]
          );
        });
      }
      const completionId = await performTaskVerification(taskName, undefined, completionDate, manualVerification);
      if (completionId) {
        setPendingCompletionId(completionId);
        setTaskDetailsTaskName(taskName);
        setTaskDetailsFormVisible(true);
      }
      return;
    }

    // If image is provided, verify with OpenAI first
    setVerificationImageUri(imageUri);
    setVerificationTaskName(taskName);
    setPendingCompletionDate(completionDate);
    setVerificationResult(null);
    setVerificationLoading(true);
    setVerificationModalMode('decision');
    setVerificationModalVisible(true);

    try {
      const result = await verifyTaskImage(imageUri, taskName);
      setVerificationResult(result);
    } catch (error: any) {
      console.error('Error verifying image:', error);
      const fallbackVerification: VerificationResponse = {
        isVerified: true,
        confidence: 0,
        reason: 'User bypassed AI verification',
        model: 'manual-override',
      };
      Alert.alert(
        'Verification Error',
        error.message || 'Failed to verify image. Would you like to continue anyway?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setVerificationModalVisible(false);
              setVerificationLoading(false);
              resetVerificationState();
            },
          },
          {
            text: 'Continue Anyway',
            onPress: () => {
              setVerificationModalVisible(false);
              setVerificationLoading(false);
              resetVerificationState();

              const proceed = async () => {
                const completionId = await performTaskVerification(taskName, imageUri, completionDate, fallbackVerification);
                if (completionId) {
                  setPendingCompletionId(completionId);
                  setTaskDetailsTaskName(taskName);
                  setTaskDetailsFormVisible(true);
                }
              };

              if (completionDate < today) {
                Alert.alert(
                  'Mark Past Task Complete',
                  'You are marking a task from the past as complete. Are you sure you want to do this?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, Mark Complete',
                      onPress: () => {
                        void proceed();
                      },
                    },
                  ]
                );
              } else {
                void proceed();
              }
            },
          },
        ]
      );
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleSaveTaskDetails = async (
    taskName: 'workout' | 'bible_reading',
    completionId: string,
    details: { caloriesBurned?: number; durationMinutes?: number; bibleChapter?: string }
  ) => {
    if (!user || !familyId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const completionDate = selectedDate || today;

      // Get the completion record to check its current status
      const { data: completionData, error: fetchError } = await supabase
        .from('task_completions')
        .select('completed_date, verification_status')
        .eq('id', completionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const updateData: {
        calories_burned?: number | null;
        duration_minutes?: number | null;
        bible_chapter?: string | null;
        verification_status?: 'verified';
        verified_at?: string;
      } = {};

      if (taskName === 'workout') {
        updateData.calories_burned = details.caloriesBurned ?? null;
        updateData.duration_minutes = details.durationMinutes ?? null;
      } else {
        updateData.bible_chapter = details.bibleChapter ?? null;
      }

      // If this is a pending completion (just created), mark it as verified and award points
      const isPendingCompletion = completionData?.verification_status === 'pending';
      
      if (isPendingCompletion) {
        updateData.verification_status = 'verified';
        updateData.verified_at = new Date().toISOString();

        // Award points when marking as verified
        await supabase
          .from('points')
          .insert({
            user_id: user.id,
            family_id: familyId,
            points: 10,
            source: `${taskName} completion`,
          });

        // Update UI to show task as completed
        const todayDate = new Date().toISOString().split('T')[0];
        if (completionDate === todayDate) {
          setCompletedTasks(prev => ({ ...prev, [taskName]: true }));
        }
        if (selectedDate === completionDate) {
          setSelectedDayTasks(prev => ({ ...prev, [taskName]: true }));
        }
      }

      const { error } = await supabase
        .from('task_completions')
        .update(updateData)
        .eq('id', completionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh data to show updated details and completion status
      await fetchUserData();
      if (selectedDate) {
        await fetchDailyDetails(selectedDate);
      }

      // Refresh week completions to update circle indicators
      await fetchWeekCompletions();
    } catch (error: any) {
      console.error('Error saving task details:', error);
      Alert.alert('Error', error.message || 'Failed to save task details');
    }
  };

  const handleEditTaskDetails = (taskName: 'workout' | 'bible_reading') => {
    // Close verification modal first
    setVerificationModalVisible(false);
    
    const dateForDetails = selectedDate || new Date().toISOString().split('T')[0];
    const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
    const detail = detailSource[taskName];

    if (!detail || !detail.completionId) {
      // If no detail found, try using pendingCompletionId if available
      if (pendingCompletionId && verificationTaskName === taskName) {
        setEditingTaskDetails({
          taskName,
          completionId: pendingCompletionId,
        });
        setTaskDetailsTaskName(taskName);
        setTaskDetailsFormVisible(true);
      } else {
        Alert.alert('Error', 'Unable to find task completion to edit.');
      }
      return;
    }

    setEditingTaskDetails({
      taskName,
      completionId: detail.completionId,
    });
    setTaskDetailsTaskName(taskName);
    setTaskDetailsFormVisible(true);
  };

  const handleAcceptVerification = async () => {
    if (!verificationTaskName) {
      setVerificationModalVisible(false);
      resetVerificationState();
      return;
    }

    if (verificationModalMode === 'decision') {
      if (!pendingCompletionDate) {
        setVerificationModalVisible(false);
        resetVerificationState();
        return;
      }

      setVerificationModalVisible(false);
      const completionDate = pendingCompletionDate;
      const today = new Date().toISOString().split('T')[0];

      const execute = async () => {
        const currentTaskName = verificationTaskName; // Store before reset
        const completionId = await performTaskVerification(
          verificationTaskName,
          verificationImageUri || undefined,
          completionDate,
          verificationResult || undefined
        );
        resetVerificationState();
        
        // Show task details form after verification
        if (completionId && currentTaskName) {
          setPendingCompletionId(completionId);
          setTaskDetailsTaskName(currentTaskName);
          setTaskDetailsFormVisible(true);
        }
      };

      if (completionDate < today) {
        Alert.alert(
          'Mark Past Task Complete',
          'You are marking a task from the past as complete. Are you sure you want to do this?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resetVerificationState(),
            },
            {
              text: 'Yes, Mark Complete',
              onPress: async () => {
                await execute();
              },
            },
          ]
        );
      } else {
        await execute();
      }
    } else {
      // Review mode primary action just closes the modal
      setVerificationModalVisible(false);
      resetVerificationState();
    }
  };

  const handleRejectVerification = () => {
    if (verificationModalMode === 'decision') {
      setVerificationModalVisible(false);
      resetVerificationState();
      return;
    }

    if (!verificationTaskName) {
      setVerificationModalVisible(false);
      resetVerificationState();
      return;
    }

    const completionDate = pendingCompletionDate || selectedDate || new Date().toISOString().split('T')[0];

    Alert.alert(
      'Mark Incomplete',
      'Are you sure you want to mark this task as incomplete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Incomplete',
          style: 'destructive',
          onPress: async () => {
            setVerificationModalVisible(false);
            await handleMarkIncomplete(verificationTaskName, completionDate);
            resetVerificationState();
          },
        },
      ]
    );
  };

  const resetVerificationState = () => {
    setVerificationImageUri(null);
    setVerificationTaskName(null);
    setVerificationResult(null);
    setVerificationLoading(false);
    setPendingCompletionDate(null);
    setVerificationModalMode('decision');
  };

  const performTaskVerification = async (
    taskName: 'workout' | 'bible_reading', 
    imageUri?: string,
    completionDate?: string,
    verificationResultOverride?: VerificationResponse
  ) => {
    if (!user || !familyId) return;

    const dateToUse = completionDate || selectedDate || new Date().toISOString().split('T')[0];
    const verificationInfo: VerificationResponse = verificationResultOverride ?? (
      imageUri
        ? {
            isVerified: true,
            confidence: 0,
            reason: 'Verification details unavailable',
            model: 'unknown',
          }
        : {
            isVerified: true,
            confidence: 1,
            reason: 'Marked complete without photo verification',
            model: 'manual',
          }
    );
    const isVerified = verificationInfo.isVerified !== false;

    try {
      let proofUrl: string | null = null;

      // Upload image if provided
      if (imageUri) {
        const timestamp = Date.now();
        const fileExt = imageUri.split('.').pop();
        const fileName = `${user.id}/${timestamp}.${fileExt}`;

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: 'base64',
        });

        // Convert base64 to ArrayBuffer
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('workout-photos')
          .upload(fileName, byteArray, {
            contentType: `image/${fileExt}`,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('workout-photos')
          .getPublicUrl(fileName);

        proofUrl = urlData.publicUrl;
      }

      // Create task completion with 'pending' status - will be verified after details are added
      const { data: completionData, error: completionError } = await supabase
        .from('task_completions')
        .insert({
          task_name: taskName,
          user_id: user.id,
          family_id: familyId,
          completed_date: dateToUse,
          proof_url: proofUrl,
          verification_status: isVerified ? 'pending' : 'rejected',
          verification_confidence: verificationInfo.confidence ?? null,
          verification_reason: verificationInfo.reason ?? null,
          verification_model: verificationInfo.model ?? null,
          verified_at: null, // Will be set when details are submitted
        })
        .select('id')
        .single();

      if (completionError) throw completionError;
      const completionId = completionData?.id || null;

      // Don't award points yet - will be awarded when details are submitted
      // Don't update UI yet - task will be marked complete after details are submitted
      
      return completionId;
    } catch (error: any) {
      console.error('Error verifying task:', error);
      Alert.alert('Error', error.message || 'Failed to verify task');
      return null;
    }
  };

  // Generate week data (current week)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [weekCompletions, setWeekCompletions] = useState<Record<string, boolean>>({});

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const streakScale = useSharedValue(1);
  const sectionsOpacity = useSharedValue(0);

  useEffect(() => {
    fetchWeekCompletions();
  }, [currentWeekOffset, user]);

  // Animate whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!loading && !userLoading && !familyLoading) {
        // Reset animation values
        headerOpacity.value = 0;
        headerTranslateY.value = -20;
        sectionsOpacity.value = 0;
        streakScale.value = 1;
        
        // Play animations
        headerOpacity.value = withTiming(1, { duration: 500 });
        headerTranslateY.value = withTiming(0, { duration: 500 });
        sectionsOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
        
        // Subtle pulse animation for streak badge
        streakScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          false
        );
      }
    }, [loading, userLoading, familyLoading])
  );

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const streakAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
  }));

  const sectionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sectionsOpacity.value,
  }));

  // Initialize selected date to today on mount
  useEffect(() => {
    if (!selectedDate && user) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      fetchDailyDetails(today);
    }
  }, [user]);

  // Update selected day data when steps change (for today)
  useEffect(() => {
    if (selectedDate) {
      const today = new Date().toISOString().split('T')[0];
      if (selectedDate === today && isAuthorized && isAvailable) {
        setSelectedDaySteps(steps);
      }
    }
  }, [steps, selectedDate, isAuthorized, isAvailable]);

  const fetchWeekCompletions = async () => {
    if (!user) return;

    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (currentWeekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Fetch all task completions for the week
    const { data } = await supabase
      .from('task_completions')
      .select('completed_date, task_name')
      .eq('user_id', user.id)
      .eq('verification_status', 'verified')
      .gte('completed_date', startOfWeek.toISOString().split('T')[0])
      .lte('completed_date', endOfWeek.toISOString().split('T')[0]);

    // Group by date and check if BOTH tasks are completed
    const completionsByDate: Record<string, Set<string>> = {};
    data?.forEach(c => {
      if (!completionsByDate[c.completed_date]) {
        completionsByDate[c.completed_date] = new Set();
      }
      completionsByDate[c.completed_date].add(c.task_name);
    });

    // A day is completed if it has BOTH workout and bible_reading
    const completions: Record<string, boolean> = {};
    Object.keys(completionsByDate).forEach(date => {
      const tasks = completionsByDate[date];
      completions[date] = tasks.has('workout') && tasks.has('bible_reading');
    });

    setWeekCompletions(completions);
  };

  const fetchDailyDetails = async (date: string) => {
    if (!user) return;

    try {
      // Fetch tasks completed on this date
      const { data: tasksData } = await supabase
        .from('task_completions')
        .select('id, task_name, proof_url, verification_confidence, verification_reason, verification_model, verified_at, calories_burned, duration_minutes, bible_chapter')
        .eq('user_id', user.id)
        .eq('completed_date', date)
        .eq('verification_status', 'verified');

      const tasks: Record<string, boolean> = {
        workout: false,
        bible_reading: false,
      };
      const details: Record<string, TaskVerificationDetail> = {};

      tasksData?.forEach((record) => {
        if (record.task_name === 'workout' || record.task_name === 'bible_reading') {
          tasks[record.task_name] = true;
          details[record.task_name] = {
            confidence: record.verification_confidence ?? null,
            reason: record.verification_reason ?? null,
            proofUrl: record.proof_url ?? null,
            verifiedAt: record.verified_at ?? null,
            model: record.verification_model ?? null,
            caloriesBurned: record.calories_burned ?? null,
            durationMinutes: record.duration_minutes ?? null,
            bibleChapter: record.bible_chapter ?? null,
            completionId: record.id ?? null,
          };
        }
      });

      setSelectedDayTasks(tasks);
      setSelectedDayDetails(details);

      // Fetch steps for this date
      const today = new Date().toISOString().split('T')[0];
      if (date === today && isAuthorized && isAvailable) {
        // For today, use current HealthKit data
        setSelectedDaySteps(steps);
      } else {
        // For past days, fetch from database
        const { data: stepsData } = await supabase
          .from('daily_steps')
          .select('steps')
          .eq('user_id', user.id)
          .eq('date', date)
          .single();

        setSelectedDaySteps(stepsData?.steps || 0);
      }
    } catch (error) {
      console.error('Error fetching daily details:', error);
      setSelectedDaySteps(0);
      setSelectedDayTasks({});
      setSelectedDayDetails({});
    }
  };

  const handleDayPress = async (date: string) => {
    setSelectedDate(date);
    await fetchDailyDetails(date);
  };
  
  const openVerificationReview = (taskName: 'workout' | 'bible_reading') => {
    const dateForDetails = selectedDate || new Date().toISOString().split('T')[0];
    const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
    const detail = detailSource[taskName];

    if (!detail) {
      Alert.alert('No Verification Data', 'This task does not have AI verification details yet.');
      return;
    }

    setVerificationTaskName(taskName);
    setVerificationImageUri(detail.proofUrl || null);
    setVerificationResult({
      isVerified: true,
      confidence: detail.confidence ?? 0,
      reason: detail.reason ?? 'No reasoning provided',
      model: detail.model ?? undefined,
    });
    setVerificationLoading(false);
    setPendingCompletionDate(dateForDetails);
    setVerificationModalMode('review');
    setVerificationModalVisible(true);
  };
  
  const getWeekData = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (currentWeekOffset * 7));

    const weekData = [];
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const isToday = date.toDateString() === today.toDateString();
      const dateStr = date.toISOString().split('T')[0];
      
      weekData.push({
        dayLetter: dayLetters[i],
        dayNumber: date.getDate(),
        date: dateStr,
        completed: weekCompletions[dateStr] || false,
        isToday,
      });
    }

    return weekData;
  };

  const weekData = getWeekData();

  const handlePreviousWeek = () => {
    setCurrentWeekOffset(currentWeekOffset - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeekOffset(currentWeekOffset + 1);
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

  const familyName = family?.name || "Family";
  const userName = profile?.name?.split(' ')[0] || "User";
  const stepGoal = profile?.daily_step_goal || 10000;

  return (
    <Container>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with welcome message and streak */}
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back, {userName}</Text>
              <Text style={styles.familySubtext}>{familyName} Family</Text>
            </View>
            <Animated.View style={[styles.streakBadge, streakAnimatedStyle]}>
              <Flame size={20} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.streakCount}>{streakDays}</Text>
            </Animated.View>
          </Animated.View>

          {/* Week Tracker */}
          <Animated.View style={sectionsAnimatedStyle}>
            <WeekTracker
              weekData={weekData}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              onDayPress={handleDayPress}
              selectedDate={selectedDate || undefined}
            />
          </Animated.View>

          {/* Daily Scripture */}
          <Animated.View style={sectionsAnimatedStyle}>
            <DailyScripture />
          </Animated.View>

          {/* Step Counter */}
          <Animated.View style={sectionsAnimatedStyle}>
            <StepCounter
              steps={selectedDate ? selectedDaySteps : steps}
              goal={stepGoal}
              isHealthKitAvailable={isAvailable}
              isHealthKitAuthorized={isAuthorized}
            />
          </Animated.View>

          {/* User Tasks */}
          <Animated.View style={sectionsAnimatedStyle}>
            {tasks.length === 0 ? (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: Typography.body, 
                  fontFamily: Typography.bodyFont, 
                  color: Colors.textSecondary,
                  textAlign: 'center' 
                }}>
                  No tasks configured yet. Please contact support if this persists.
                </Text>
              </View>
            ) : (
              tasks.map((task) => {
              const taskKey = (task.name === 'workout' || task.name === 'bible_reading')
                ? task.name
                : null;
              if (!taskKey) {
                return null;
              }

              // Show completion status for selected day, or today if no day selected
              const taskCompleted = selectedDate 
                ? selectedDayTasks[taskKey] || false
                : completedTasks[taskKey] || false;
              
              // Get task details for display
              const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
              const taskDetails = detailSource[taskKey];
              
              return (
                <TaskCard
                  key={task.id}
                  title={task.title}
                  subtitle={task.subtitle}
                  verified={taskCompleted}
                  onVerify={(imageUri) => handleTaskVerify(taskKey, imageUri)}
                  onViewDetails={() => openVerificationReview(taskKey)}
                  caloriesBurned={taskDetails?.caloriesBurned ?? null}
                  durationMinutes={taskDetails?.durationMinutes ?? null}
                  bibleChapter={taskDetails?.bibleChapter ?? null}
                />
              );
            })
          )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Verification Modal */}
      {verificationModalVisible && verificationTaskName && (
        <VerificationModal
          visible={verificationModalVisible}
          imageUri={verificationImageUri}
          taskName={verificationTaskName === 'workout' ? 'Workout' : 'Read Bible'}
          verificationResult={verificationResult}
          loading={verificationLoading}
          onAccept={handleAcceptVerification}
          onReject={handleRejectVerification}
          primaryButtonLabel={verificationModalMode === 'decision' ? 'Accept' : 'Close'}
          secondaryButtonLabel={verificationModalMode === 'decision' ? 'Reject' : 'Mark Incomplete'}
          caloriesBurned={
            verificationModalMode === 'review' && verificationTaskName
              ? (selectedDate ? selectedDayDetails : todayTaskDetails)[verificationTaskName]?.caloriesBurned ?? null
              : null
          }
          durationMinutes={
            verificationModalMode === 'review' && verificationTaskName
              ? (selectedDate ? selectedDayDetails : todayTaskDetails)[verificationTaskName]?.durationMinutes ?? null
              : null
          }
          bibleChapter={
            verificationModalMode === 'review' && verificationTaskName
              ? (selectedDate ? selectedDayDetails : todayTaskDetails)[verificationTaskName]?.bibleChapter ?? null
              : null
          }
          onEditDetails={
            verificationModalMode === 'review' && verificationTaskName
              ? () => handleEditTaskDetails(verificationTaskName)
              : undefined
          }
        />
      )}
      
      {/* Task Details Form */}
      {taskDetailsFormVisible && (taskDetailsTaskName || editingTaskDetails) && (
        <TaskDetailsForm
          visible={taskDetailsFormVisible}
          taskName={editingTaskDetails?.taskName || taskDetailsTaskName || 'workout'}
          onSubmit={async (details) => {
            const taskName = editingTaskDetails?.taskName || taskDetailsTaskName || 'workout';
            const completionId = editingTaskDetails?.completionId || pendingCompletionId;
            
            if (completionId) {
              await handleSaveTaskDetails(taskName, completionId, details);
            }
            
            setTaskDetailsFormVisible(false);
            setEditingTaskDetails(null);
            setPendingCompletionId(null);
            setTaskDetailsTaskName(null);
          }}
          onCancel={async () => {
            // If this is a new pending completion (not editing), delete it on cancel
            if (pendingCompletionId && !editingTaskDetails && user) {
              try {
                // Check if it's pending before deleting
                const { data: completionData } = await supabase
                  .from('task_completions')
                  .select('verification_status')
                  .eq('id', pendingCompletionId)
                  .eq('user_id', user.id)
                  .single();

                // Only delete if it's still pending (not verified)
                if (completionData?.verification_status === 'pending') {
                  await supabase
                    .from('task_completions')
                    .delete()
                    .eq('id', pendingCompletionId)
                    .eq('user_id', user.id);
                }
              } catch (error) {
                console.error('Error deleting pending completion on cancel:', error);
              }
            }

            setTaskDetailsFormVisible(false);
            setEditingTaskDetails(null);
            setPendingCompletionId(null);
            setTaskDetailsTaskName(null);
          }}
          initialValues={
            editingTaskDetails
              ? (() => {
                  const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
                  const detail = detailSource[editingTaskDetails.taskName];
                  return detail
                    ? {
                        caloriesBurned: detail.caloriesBurned,
                        durationMinutes: detail.durationMinutes,
                        bibleChapter: detail.bibleChapter,
                      }
                    : undefined;
                })()
              : undefined
          }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
  },
  familySubtext: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    gap: Spacing.xs,
  },
  streakCount: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
  },
});
