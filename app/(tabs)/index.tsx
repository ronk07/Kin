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

  const fetchUserData = async () => {
    if (!user || !familyId) return;

    try {
      // Fetch streak
      const { count } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('verification_status', 'verified')
        .gte('completed_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      setStreakDays(count || 0);

      // Check today's completions
      const today = new Date().toISOString().split('T')[0];
      const { data: completions } = await supabase
        .from('task_completions')
        .select('user_task_id')
        .eq('user_id', user.id)
        .eq('completed_date', today)
        .eq('verification_status', 'verified');

      const completed: Record<string, boolean> = {};
      completions?.forEach(c => {
        completed[c.user_task_id] = true;
      });
      setCompletedTasks(completed);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskVerify = async (taskName: 'workout' | 'bible_reading', imageUri: string) => {
    if (!user || !familyId) return;

    try {
      // Upload image to Supabase Storage
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

      // Create task completion
      const today = new Date().toISOString().split('T')[0];
      const { error: completionError } = await supabase
        .from('task_completions')
        .insert({
          task_name: taskName,
          user_id: user.id,
          family_id: familyId,
          completed_date: today,
          proof_url: urlData.publicUrl,
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
      await fetchUserData();

      Alert.alert('Success', 'Task verified successfully!');
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

  const fetchWeekCompletions = async () => {
    if (!user) return;

    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (currentWeekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const { data } = await supabase
      .from('task_completions')
      .select('completed_date')
      .eq('user_id', user.id)
      .eq('verification_status', 'verified')
      .gte('completed_date', startOfWeek.toISOString().split('T')[0])
      .lte('completed_date', endOfWeek.toISOString().split('T')[0]);

    const completions: Record<string, boolean> = {};
    data?.forEach(c => {
      completions[c.completed_date] = true;
    });
    setWeekCompletions(completions);
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
          />

          {/* Daily Scripture */}
          <DailyScripture />

          {/* Step Counter */}
          <StepCounter 
            steps={steps} 
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
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                title={task.title}
                subtitle={task.subtitle}
                verified={completedTasks[task.name] || false}
                onVerify={(imageUri) => handleTaskVerify(task.name, imageUri)}
              />
            ))
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
