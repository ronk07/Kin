import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Container } from '@/lib/components/Container';
import { DailyScripture } from '@/lib/components/DailyScripture';
import { WeekTracker } from '@/lib/components/WeekTracker';
import { StepCounter } from '@/lib/components/StepCounter';
import { TaskCard } from '@/lib/components/TaskCard';
import { useAuth } from '@/lib/context/AuthContext';
import { useUser } from '@/lib/context/UserContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { useHealthKit } from '@/lib/hooks/useHealthKit';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing } from '@/constants/theme';

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
      // Fetch user's current streak from profile
      const { data: userData } = await supabase
        .from('users')
        .select('current_streak')
        .eq('id', user.id)
        .single();

      setStreakDays(userData?.current_streak || 0);

      // Check today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('task_completions')
        .select('task_name')
        .eq('user_id', user.id)
        .eq('completed_date', today)
        .eq('verification_status', 'verified');

      const completed: Record<string, boolean> = {};
      completions?.forEach(c => {
        completed[c.task_name] = true;
      });
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkIncomplete = async (taskName: 'workout' | 'bible_reading') => {
    if (!user || !familyId) return;

    try {
      // Use selected date if viewing a different day, otherwise use today
      const completionDate = selectedDate || new Date().toISOString().split('T')[0];
      
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
        delete updated[taskName];
        return updated;
      });
      
      // Update selected day tasks if viewing a specific day
      if (selectedDate) {
        setSelectedDayTasks(prev => {
          const updated = { ...prev };
          updated[taskName] = false;
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

    // Check if marking a task for a past day
    const completionDate = selectedDate || new Date().toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
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
                await performTaskVerification(taskName, imageUri, completionDate);
                resolve();
              },
            },
          ]
        );
      });
    }

    // Proceed normally for today or future dates
    await performTaskVerification(taskName, imageUri, completionDate);
  };

  const performTaskVerification = async (
    taskName: 'workout' | 'bible_reading', 
    imageUri?: string,
    completionDate?: string
  ) => {
    if (!user || !familyId) return;

    const dateToUse = completionDate || selectedDate || new Date().toISOString().split('T')[0];

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
        const { data: uploadData, error: uploadError } = await supabase.storage
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

      // Create task completion
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert({
          task_name: taskName,
          user_id: user.id,
          family_id: familyId,
          completed_date: dateToUse,
          proof_url: proofUrl,
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        });

      if (completionError) throw completionError;

      // Award points
      await supabase
        .from('points')
        .insert({
          user_id: user.id,
          family_id: familyId,
          points: 10,
          source: `${taskName} completion`,
        });

      setCompletedTasks(prev => ({ ...prev, [taskName]: true }));
      
      // Update selected day tasks if viewing a specific day
      if (selectedDate) {
        setSelectedDayTasks(prev => ({ ...prev, [taskName]: true }));
      }
      
      await fetchUserData();
      
      // Refresh week completions to update circle indicators
      await fetchWeekCompletions();
    } catch (error: any) {
      console.error('Error verifying task:', error);
      Alert.alert('Error', error.message || 'Failed to verify task');
    }
  };

  // Generate week data (current week)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [weekCompletions, setWeekCompletions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchWeekCompletions();
  }, [currentWeekOffset, user]);

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
        .select('task_name')
        .eq('user_id', user.id)
        .eq('completed_date', date)
        .eq('verification_status', 'verified');

      const tasks: Record<string, boolean> = {
        workout: tasksData?.some(t => t.task_name === 'workout') || false,
        bible_reading: tasksData?.some(t => t.task_name === 'bible_reading') || false,
      };

      setSelectedDayTasks(tasks);

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
    }
  };

  const handleDayPress = async (date: string) => {
    setSelectedDate(date);
    await fetchDailyDetails(date);
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
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>Welcome back, {userName}</Text>
              <Text style={styles.familySubtext}>{familyName} Family</Text>
            </View>
            <View style={styles.streakBadge}>
              <Flame size={20} color={Colors.accent} fill={Colors.accent} />
              <Text style={styles.streakCount}>{streakDays}</Text>
            </View>
          </View>

          {/* Week Tracker */}
          <WeekTracker
            weekData={weekData}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onDayPress={handleDayPress}
            selectedDate={selectedDate || undefined}
          />

          {/* Daily Scripture */}
          <DailyScripture />

          {/* Step Counter */}
          <StepCounter
            steps={selectedDate ? selectedDaySteps : steps}
            goal={stepGoal}
            isHealthKitAvailable={isAvailable}
            isHealthKitAuthorized={isAuthorized}
          />

          {/* User Tasks */}
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
              // Show completion status for selected day, or today if no day selected
              const taskCompleted = selectedDate 
                ? selectedDayTasks[task.name] || false
                : completedTasks[task.name] || false;
              
              return (
                <TaskCard
                  key={task.id}
                  title={task.title}
                  subtitle={task.subtitle}
                  verified={taskCompleted}
                  onVerify={(imageUri) => handleTaskVerify(task.name, imageUri)}
                  onMarkIncomplete={() => handleMarkIncomplete(task.name)}
                />
              );
            })
          )}
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
