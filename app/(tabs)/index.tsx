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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type TaskVerificationDetail = {
  confidence: number | null;
  reason: string | null;
  proofUrl: string | null;
  verifiedAt: string | null;
  model: string | null;
  metrics: Record<string, any>; // Flexible metrics storage
  completionId: string | null;
  familyTaskId: string | null;
};

const INTERNAL_METRIC_KEYS = new Set(['points_entry_id', 'points_awarded']);

const sanitizeCompletionMetrics = (rawMetrics?: Record<string, any>): Record<string, any> => {
  if (!rawMetrics || typeof rawMetrics !== 'object') {
    return {};
  }

  const sanitized: Record<string, any> = {};
  Object.entries(rawMetrics).forEach(([key, value]) => {
    if (!INTERNAL_METRIC_KEYS.has(key)) {
      sanitized[key] = value;
    }
  });

  return sanitized;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { tasks, profile, loading: userLoading, refreshProfile } = useUser();
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
  const [verificationFamilyTaskId, setVerificationFamilyTaskId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [pendingCompletionDate, setPendingCompletionDate] = useState<string | null>(null);
  const [verificationModalMode, setVerificationModalMode] = useState<'decision' | 'review'>('decision');
  
  // Task details form state
  const [taskDetailsFormVisible, setTaskDetailsFormVisible] = useState(false);
  const [editingTaskDetails, setEditingTaskDetails] = useState<{ familyTaskId: string; completionId: string } | null>(null);
  const [pendingCompletionId, setPendingCompletionId] = useState<string | null>(null);
  const [pendingFamilyTaskId, setPendingFamilyTaskId] = useState<string | null>(null);

  const requiresPhotoProof = family?.require_photo_proof ?? false;

  const fetchUserData = useCallback(async () => {
    if (!user || !familyId) return;

    try {
      // Calculate and update streak based on tasks being completed
      const streak = await calculateStreak(user.id);
      await updateStreakInDatabase(user.id);
      setStreakDays(streak);

      // Check today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('task_completions')
        .select('id, family_task_id, proof_url, verification_confidence, verification_reason, verification_model, verified_at, metrics')
        .eq('user_id', user.id)
        .eq('completed_date', today)
        .eq('verification_status', 'verified');

      const completed: Record<string, boolean> = {};
      const details: Record<string, TaskVerificationDetail> = {};
      completions?.forEach(c => {
        if (c.family_task_id) {
          // Use family_task_id as the key
          completed[c.family_task_id] = true;
          details[c.family_task_id] = {
            confidence: c.verification_confidence ?? null,
            reason: c.verification_reason ?? null,
            proofUrl: c.proof_url ?? null,
            verifiedAt: c.verified_at ?? null,
            model: c.verification_model ?? null,
            metrics: sanitizeCompletionMetrics(c.metrics),
            completionId: c.id ?? null,
            familyTaskId: c.family_task_id ?? null,
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
  }, [user, familyId]);

  useEffect(() => {
    if (!userLoading && !familyLoading && user && familyId) {
      fetchUserData();
    }
  }, [userLoading, familyLoading, user, familyId, fetchUserData]);

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

  const handleMarkIncomplete = async (familyTaskId: string, dateOverride?: string) => {
    if (!user || !familyId) return;

    try {
      // Use provided date, selected date if viewing a different day, otherwise use today
      const completionDate = dateOverride || selectedDate || new Date().toISOString().split('T')[0];
      const todayDate = new Date().toISOString().split('T')[0];

      // Get the task template name for points removal
      const task = tasks.find(t => t.familyTaskId === familyTaskId);
      const taskTemplateName = task?.templateName || 'task';

      // Fetch the completion record before deleting so we can remove related points
      const { data: completionRecord, error: completionFetchError } = await supabase
        .from('task_completions')
        .select('id, metrics, family_task_id, completed_date')
        .eq('family_task_id', familyTaskId)
        .eq('user_id', user.id)
        .eq('completed_date', completionDate)
        .single();

      if (completionFetchError && completionFetchError.code !== 'PGRST116') throw completionFetchError;

      const completionMetrics = (completionRecord?.metrics && typeof completionRecord.metrics === 'object')
        ? completionRecord.metrics
        : {};

      const linkedPointsId: string | null = completionMetrics?.points_entry_id ?? null;
      const linkedPointsValue: number | null = typeof completionMetrics?.points_awarded === 'number'
        ? completionMetrics.points_awarded
        : null;

      // Delete task completion for the selected date
      const { error: deleteError } = await supabase
        .from('task_completions')
        .delete()
        .eq('family_task_id', familyTaskId)
        .eq('user_id', user.id)
        .eq('completed_date', completionDate);

      if (deleteError) throw deleteError;

      // Remove points if they were awarded
      let pointsToRemove = linkedPointsValue ?? 0;
      let pointsRecordId: string | null = linkedPointsId;

      if (!pointsRecordId) {
        // Fallback: find the most plausible points record for this task and date
        const { data: possiblePoints } = await supabase
          .from('points')
          .select('id, points, created_at')
          .eq('user_id', user.id)
          .eq('family_id', familyId)
          .eq('source', `${taskTemplateName} completion`)
          .order('created_at', { ascending: false });

        if (possiblePoints && possiblePoints.length > 0) {
          const completionStart = new Date(completionDate);
          completionStart.setHours(0, 0, 0, 0);
          const completionEnd = new Date(completionDate);
          completionEnd.setHours(23, 59, 59, 999);

          const matchedPoint = possiblePoints.find(point => {
            const createdAt = new Date(point.created_at);
            return createdAt >= completionStart && createdAt <= completionEnd;
          }) || possiblePoints[0];

          pointsRecordId = matchedPoint.id;
          pointsToRemove = matchedPoint.points;
        }
      }

      if (pointsRecordId) {
        const { error: pointDeleteError } = await supabase
          .from('points')
          .delete()
          .eq('id', pointsRecordId);

        if (pointDeleteError) {
          console.error('Error removing points:', pointDeleteError);
        } else if (pointsToRemove > 0) {
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
          delete updated[familyTaskId];
        }
        return updated;
      });
      setTodayTaskDetails(prev => {
        if (completionDate !== todayDate) return prev;
        const updated = { ...prev };
        delete updated[familyTaskId];
        return updated;
      });
      if (selectedDate || dateOverride) {
        setSelectedDayTasks(prev => {
          const updated = { ...prev };
          updated[familyTaskId] = false;
          return updated;
        });
        setSelectedDayDetails(prev => {
          const updated = { ...prev };
          delete updated[familyTaskId];
          return updated;
        });
      }
      
      // Update streak after marking incomplete
      if (user) {
        const newStreak = await calculateStreak(user.id);
        await updateStreakInDatabase(user.id);
        setStreakDays(newStreak);
        console.log('Streak updated after marking incomplete:', newStreak);
      }
      
      await fetchUserData();
      
      // Refresh week completions to update circle indicators
      await fetchWeekCompletions();
    } catch (error: any) {
      console.error('Error marking task incomplete:', error);
      Alert.alert('Error', error.message || 'Failed to mark task incomplete');
    }
  };

  const handleTaskVerify = async (familyTaskId: string, imageUri?: string) => {
    if (!user || !familyId) return;

    if (requiresPhotoProof && !imageUri) {
      Alert.alert(
        'Photo Proof Required',
        'Your family requires a photo to verify this task. Please take or upload a photo.'
      );
      return;
    }

    const completionDate = selectedDate || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Find the task to get template name for verification
    const task = tasks.find(t => t.familyTaskId === familyTaskId);
    if (!task) {
      Alert.alert('Error', 'Task not found');
      return;
    }
    
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
                  const completionId = await performTaskVerification(familyTaskId, undefined, completionDate, manualVerification);
                  if (completionId) {
                    setPendingCompletionId(completionId);
                    setPendingFamilyTaskId(familyTaskId);
                    setTaskDetailsFormVisible(true);
                  }
                  resolve();
                },
              },
            ]
          );
        });
      }
      const completionId = await performTaskVerification(familyTaskId, undefined, completionDate, manualVerification);
      if (completionId) {
        setPendingCompletionId(completionId);
        setPendingFamilyTaskId(familyTaskId);
        setTaskDetailsFormVisible(true);
      }
      return;
    }

    // If image is provided, verify with OpenAI first
    setVerificationImageUri(imageUri);
    setVerificationFamilyTaskId(familyTaskId);
    setPendingCompletionDate(completionDate);
    setVerificationResult(null);
    setVerificationLoading(true);
    setVerificationModalMode('decision');
    setVerificationModalVisible(true);

    try {
      // Map template name to TaskType for backward compatibility
      const taskType: 'workout' | 'bible_reading' = 
        task.templateName === 'workout' ? 'workout' :
        task.templateName === 'bible_reading' ? 'bible_reading' :
        'workout'; // Default fallback
      const result = await verifyTaskImage(imageUri, taskType);
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
                const completionId = await performTaskVerification(familyTaskId, imageUri, completionDate, fallbackVerification);
                if (completionId) {
                  setPendingCompletionId(completionId);
                  setPendingFamilyTaskId(familyTaskId);
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
    familyTaskId: string,
    completionId: string,
    metrics: Record<string, any>
  ) => {
    if (!user || !familyId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const completionDate = selectedDate || today;

      // Get the completion record to check its current status
      const { data: completionData, error: fetchError } = await supabase
        .from('task_completions')
        .select('completed_date, verification_status, family_task_id, metrics')
        .eq('id', completionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Find the task to get points value
      const task = tasks.find(t => t.familyTaskId === familyTaskId);
      const pointsValue = task?.pointsValue || 10;
      const taskTemplateName = task?.templateName || 'task';

      const existingMetrics = (completionData?.metrics && typeof completionData.metrics === 'object')
        ? completionData.metrics
        : {};

      let pointsEntryId: string | null = existingMetrics?.points_entry_id ?? null;
      let awardedPoints = existingMetrics?.points_awarded ?? null;

      const updateData: {
        metrics?: Record<string, any>;
        verification_status?: 'verified';
        verified_at?: string;
      } = {
      };

      // If this is a pending completion (just created), mark it as verified and award points
      const isPendingCompletion = completionData?.verification_status === 'pending';
      
      if (isPendingCompletion) {
        updateData.verification_status = 'verified';
        updateData.verified_at = new Date().toISOString();

        // Award points when marking as verified
        const { data: insertedPoint, error: insertPointsError } = await supabase
          .from('points')
          .insert({
            user_id: user.id,
            family_id: familyId,
            points: pointsValue,
            source: `${taskTemplateName} completion`,
          })
          .select('id, points')
          .single();

        if (insertPointsError) throw insertPointsError;

        pointsEntryId = insertedPoint?.id ?? null;
        awardedPoints = insertedPoint?.points ?? pointsValue;

        // Update UI to show task as completed
        const todayDate = new Date().toISOString().split('T')[0];
        if (completionDate === todayDate) {
          setCompletedTasks(prev => ({ ...prev, [familyTaskId]: true }));
        }
        if (selectedDate === completionDate) {
          setSelectedDayTasks(prev => ({ ...prev, [familyTaskId]: true }));
        }
      }

      const mergedMetrics: Record<string, any> = {
        ...existingMetrics,
        ...(metrics || {}),
      };

      if (pointsEntryId) {
        mergedMetrics.points_entry_id = pointsEntryId;
      }
      if (typeof awardedPoints === 'number') {
        mergedMetrics.points_awarded = awardedPoints;
      }

      updateData.metrics = mergedMetrics;

      const { error } = await supabase
        .from('task_completions')
        .update(updateData)
        .eq('id', completionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update streak after saving task details
      if (user) {
        // Recalculate streak from scratch to ensure it's accurate
        const newStreak = await calculateStreak(user.id);
        await updateStreakInDatabase(user.id);
        setStreakDays(newStreak);
        console.log('Streak updated after task completion:', newStreak);

        // Check weekly workout goal if this was a workout task
        if (taskTemplateName === 'workout' && profile?.weekly_workout_goal) {
          const { checkWeeklyWorkoutGoal } = await import('@/lib/utils/achievements');
          await checkWeeklyWorkoutGoal(user.id, familyId, profile.weekly_workout_goal);
        }
      }

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

  const handleEditTaskDetails = (familyTaskId: string) => {
    // Close verification modal first
    setVerificationModalVisible(false);
    
    const dateForDetails = selectedDate || new Date().toISOString().split('T')[0];
    const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
    const detail = detailSource[familyTaskId];

    if (!detail || !detail.completionId) {
      // If no detail found, try using pendingCompletionId if available
      if (pendingCompletionId && verificationFamilyTaskId === familyTaskId) {
        setEditingTaskDetails({
          familyTaskId,
          completionId: pendingCompletionId,
        });
        setPendingFamilyTaskId(familyTaskId);
        setTaskDetailsFormVisible(true);
      } else {
        Alert.alert('Error', 'Unable to find task completion to edit.');
      }
      return;
    }

    setEditingTaskDetails({
      familyTaskId,
      completionId: detail.completionId,
    });
    setPendingFamilyTaskId(familyTaskId);
    setTaskDetailsFormVisible(true);
  };

  const handleAcceptVerification = async () => {
    if (!verificationFamilyTaskId) {
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
        const currentFamilyTaskId = verificationFamilyTaskId; // Store before reset
        const completionId = await performTaskVerification(
          verificationFamilyTaskId,
          verificationImageUri || undefined,
          completionDate,
          verificationResult || undefined
        );
        resetVerificationState();
        
        // Show task details form after verification
        if (completionId && currentFamilyTaskId) {
          setPendingCompletionId(completionId);
          setPendingFamilyTaskId(currentFamilyTaskId);
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

    if (!verificationFamilyTaskId) {
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
            await handleMarkIncomplete(verificationFamilyTaskId, completionDate);
            resetVerificationState();
          },
        },
      ]
    );
  };

  const resetVerificationState = () => {
    setVerificationImageUri(null);
    setVerificationFamilyTaskId(null);
    setVerificationResult(null);
    setVerificationLoading(false);
    setPendingCompletionDate(null);
    setVerificationModalMode('decision');
  };

  const performTaskVerification = async (
    familyTaskId: string,
    imageUri?: string,
    completionDate?: string,
    verificationResultOverride?: VerificationResponse
  ) => {
    if (!user || !familyId) return null;

    // Find the task to get its template name for backward compatibility
    const task = tasks.find(t => t.familyTaskId === familyTaskId);
    if (!task) {
      Alert.alert('Error', 'Task not found');
      return null;
    }

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
          family_task_id: familyTaskId,
          task_name: task.templateName, // Required for backward compatibility
          user_id: user.id,
          family_id: familyId,
          completed_date: dateToUse,
          proof_url: proofUrl,
          verification_status: isVerified ? 'pending' : 'rejected',
          verification_confidence: verificationInfo.confidence ?? null,
          verification_reason: verificationInfo.reason ?? null,
          verification_model: verificationInfo.model ?? null,
          verified_at: null, // Will be set when details are submitted
          metrics: {}, // Empty metrics, will be filled when details are submitted
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
  
  // Track if animations have been initialized
  const animationsInitialized = useRef(false);
  const hasAnimatedForFocus = useRef(false);
  
  // Track previous task IDs and week offset to prevent infinite loops
  const prevTaskIdsRef = useRef<string>('');
  const prevWeekOffsetRef = useRef<number>(currentWeekOffset);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Create a stable string representation of task IDs to prevent infinite loops
  // This will recalculate when tasks array reference changes, but we use ref comparison
  // in useEffect to only call fetchWeekCompletions when IDs actually change
  const taskIdsString = useMemo(() => {
    if (tasks.length === 0) return '';
    const ids = tasks.map(t => t.familyTaskId).filter(Boolean).sort();
    return ids.join(',');
  }, [tasks]);

  // Fetch week completions function - defined early so it can be used in useEffect
  // Note: We access tasks directly inside the function, not from dependencies
  // to prevent infinite loops from array reference changes
  const fetchWeekCompletions = useCallback(async () => {
    if (!user || !familyId) return;

    // Get all active family tasks for this family
    const taskList = tasksRef.current || [];
    const activeFamilyTaskIds = taskList.map(t => t.familyTaskId).filter(Boolean);

    if (activeFamilyTaskIds.length === 0) {
      setWeekCompletions({});
      return;
    }

    // Calculate week boundaries in local timezone to avoid date shifts
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Sunday) with timezone-safe date manipulation
    // currentWeekOffset: 0 = current week, 1 = next week, -1 = previous week
    const startOfWeek = new Date(today);
    const daysToSubtract = currentDay - (currentWeekOffset * 7);
    startOfWeek.setDate(today.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Format dates in YYYY-MM-DD format using local timezone (not UTC)
    // This prevents timezone shifts that cause dates to appear on wrong days
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatLocalDate(startOfWeek);
    const endDateStr = formatLocalDate(endOfWeek);

    // Fetch all task completions for the week
    const { data, error } = await supabase
      .from('task_completions')
      .select('completed_date, family_task_id')
      .eq('user_id', user.id)
      .eq('verification_status', 'verified')
      .in('family_task_id', activeFamilyTaskIds)
      .gte('completed_date', startDateStr)
      .lte('completed_date', endDateStr);

    if (error) {
      console.error('Error fetching week completions:', error);
      return;
    }

    // Group by date and check if ALL active tasks are completed
    const completionsByDate: Record<string, Set<string>> = {};
    data?.forEach(c => {
      if (c.family_task_id) {
        if (!completionsByDate[c.completed_date]) {
          completionsByDate[c.completed_date] = new Set();
        }
        completionsByDate[c.completed_date].add(c.family_task_id);
      }
    });

    // A day is completed if ALL active family tasks are completed
    const completions: Record<string, boolean> = {};
    Object.keys(completionsByDate).forEach(date => {
      const completedTasks = completionsByDate[date];
      // Check if all active tasks are completed
      const allCompleted = activeFamilyTaskIds.every(taskId => completedTasks.has(taskId));
      completions[date] = allCompleted;
    });

    setWeekCompletions(completions);
  }, [user, familyId, currentWeekOffset]); // Don't include tasks to prevent loops

  // Fetch week completions when user, task IDs, or week offset changes
  // Only trigger when taskIdsString actually changes (not on every render)
  useEffect(() => {
    const taskIdsChanged = taskIdsString && taskIdsString !== prevTaskIdsRef.current;
    const weekOffsetChanged = currentWeekOffset !== prevWeekOffsetRef.current;
    
    if (user && (taskIdsChanged || weekOffsetChanged)) {
      if (taskIdsChanged) {
        prevTaskIdsRef.current = taskIdsString;
      }
      if (weekOffsetChanged) {
        prevWeekOffsetRef.current = currentWeekOffset;
      }
      fetchWeekCompletions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, taskIdsString, currentWeekOffset]); // Only depend on stable values

  // Initialize animations once on mount
  useEffect(() => {
    if (!animationsInitialized.current && !loading && !userLoading && !familyLoading) {
      animationsInitialized.current = true;
      
      // Play initial animations
      headerOpacity.value = withTiming(1, { duration: 500 });
      headerTranslateY.value = withTiming(0, { duration: 500 });
      sectionsOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
      
      // Subtle pulse animation for streak badge (only start once)
      streakScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [loading, userLoading, familyLoading, headerOpacity, headerTranslateY, sectionsOpacity, streakScale]);

  // Refresh data when screen comes into focus (but don't re-animate)
  useFocusEffect(
    React.useCallback(() => {
      // Refresh user data (including tasks) when screen comes into focus
      // This ensures tasks are loaded after onboarding
      if (user && familyId && !userLoading && !familyLoading) {
        refreshProfile().then(() => {
          if (user && familyId) {
            fetchUserData().then(() => {
              // Fetch week completions after user data is loaded
              // Wait a bit for tasks to be available from UserContext
              setTimeout(() => {
                // Call fetchWeekCompletions directly without including it in deps
                // to prevent infinite loops
                if (user && familyId && tasks.length > 0) {
                  fetchWeekCompletions();
                }
              }, 100);
            });
          }
        });
      }
      
      // Reset the focus flag when screen loses focus
      return () => {
        hasAnimatedForFocus.current = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, familyId, userLoading, familyLoading]) // Only depend on stable values
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

  const fetchDailyDetails = async (date: string) => {
    if (!user) return;

    try {
      // Fetch tasks completed on this date
      const { data: tasksData } = await supabase
        .from('task_completions')
        .select('id, family_task_id, proof_url, verification_confidence, verification_reason, verification_model, verified_at, metrics')
        .eq('user_id', user.id)
        .eq('completed_date', date)
        .eq('verification_status', 'verified');

      const tasks: Record<string, boolean> = {};
      const details: Record<string, TaskVerificationDetail> = {};

      tasksData?.forEach((record) => {
        if (record.family_task_id) {
          // Use family_task_id as the key
          tasks[record.family_task_id] = true;
          details[record.family_task_id] = {
            confidence: record.verification_confidence ?? null,
            reason: record.verification_reason ?? null,
            proofUrl: record.proof_url ?? null,
            verifiedAt: record.verified_at ?? null,
            model: record.verification_model ?? null,
            metrics: sanitizeCompletionMetrics(record.metrics),
            completionId: record.id ?? null,
            familyTaskId: record.family_task_id ?? null,
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
  
  const openVerificationReview = (familyTaskId: string) => {
    const dateForDetails = selectedDate || new Date().toISOString().split('T')[0];
    const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
    const detail = detailSource[familyTaskId];

    if (!detail) {
      Alert.alert('No Verification Data', 'This task does not have AI verification details yet.');
      return;
    }

    setVerificationFamilyTaskId(familyTaskId);
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
    today.setHours(0, 0, 0, 0);
    const currentDay = today.getDay();

    // Align with fetchWeekCompletions week calculation
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - currentDay + (currentWeekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const weekData = [];
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dateStr = formatLocalDate(date);
      const isToday = dateStr === formatLocalDate(today);
      
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
            <Text style={styles.tasksTitle}>Tasks</Text>
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
              // Use family_task_id as the key
              const taskKey = task.familyTaskId;

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
                  metrics={taskDetails?.metrics || {}}
                  requiresPhotoProof={requiresPhotoProof}
                />
              );
            })
          )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
      
      {/* Verification Modal */}
      {verificationModalVisible && verificationFamilyTaskId && (() => {
        const task = tasks.find(t => t.familyTaskId === verificationFamilyTaskId);
        const taskDetail = verificationFamilyTaskId 
          ? (selectedDate ? selectedDayDetails : todayTaskDetails)[verificationFamilyTaskId]
          : null;
        
        return (
          <VerificationModal
            visible={verificationModalVisible}
            imageUri={verificationImageUri}
            taskName={task?.title || 'Task'}
            verificationResult={verificationResult}
            loading={verificationLoading}
            onAccept={handleAcceptVerification}
            onReject={handleRejectVerification}
            primaryButtonLabel={verificationModalMode === 'decision' ? 'Accept' : 'Close'}
            secondaryButtonLabel={verificationModalMode === 'decision' ? 'Reject' : 'Mark Incomplete'}
            metrics={verificationModalMode === 'review' && taskDetail ? taskDetail.metrics : undefined}
            onEditDetails={
              verificationModalMode === 'review' && verificationFamilyTaskId
                ? () => handleEditTaskDetails(verificationFamilyTaskId)
                : undefined
            }
          />
        );
      })()}
      
      {/* Task Details Form */}
      {taskDetailsFormVisible && (pendingFamilyTaskId || editingTaskDetails) && (() => {
        const familyTaskId = editingTaskDetails?.familyTaskId || pendingFamilyTaskId;
        const task = tasks.find(t => t.familyTaskId === familyTaskId);
        
        if (!task || !familyTaskId) return null;
        
        return (
          <TaskDetailsForm
            visible={taskDetailsFormVisible}
            task={task}
            onSubmit={async (metrics) => {
              const completionId = editingTaskDetails?.completionId || pendingCompletionId;
              const taskFamilyId = editingTaskDetails?.familyTaskId || pendingFamilyTaskId || familyTaskId;
              
              // Close modal immediately for better UX
              setTaskDetailsFormVisible(false);
              setEditingTaskDetails(null);
              setPendingCompletionId(null);
              setPendingFamilyTaskId(null);
              
              // Save task details in the background
              if (completionId && taskFamilyId) {
                // Don't await - let it run in background
                handleSaveTaskDetails(taskFamilyId, completionId, metrics).catch((error) => {
                  console.error('Error saving task details:', error);
                  Alert.alert('Error', 'Failed to save task details. Please try again.');
                });
              }
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
              setPendingFamilyTaskId(null);
            }}
            initialValues={
              editingTaskDetails
                ? (() => {
                    const detailSource = selectedDate ? selectedDayDetails : todayTaskDetails;
                    const detail = detailSource[editingTaskDetails.familyTaskId];
                    return detail?.metrics || {};
                  })()
                : {}
            }
          />
        );
      })()}
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
  tasksTitle: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
