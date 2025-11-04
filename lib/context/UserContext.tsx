import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import type { User } from '@/lib/types/database';

interface Task {
  id: string;
  name: 'workout' | 'bible_reading';
  title: string;
  subtitle: string;
  enabled: boolean;
}

interface UserContextType {
  profile: User | null;
  tasks: Task[];
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<Pick<User, 'weekly_workout_goal' | 'daily_step_goal' | 'reminder_enabled' | 'reminder_time'>>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      setProfile(null);
      setTasks([]);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        
        // Build tasks from user profile
        const userTasks: Task[] = [];
        
        if (data.workout_task_enabled) {
          userTasks.push({
            id: 'workout',
            name: 'workout',
            title: 'Workout',
            subtitle: data.workout_task_subtitle || '',
            enabled: true,
          });
        }
        
        if (data.bible_task_enabled) {
          userTasks.push({
            id: 'bible_reading',
            name: 'bible_reading',
            title: 'Read Bible',
            subtitle: data.bible_task_subtitle || '',
            enabled: true,
          });
        }
        
        setTasks(userTasks);
      } else {
        // User doesn't exist in users table yet
        setProfile(null);
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const updatePreferences = async (preferences: Partial<Pick<User, 'weekly_workout_goal' | 'daily_step_goal' | 'reminder_enabled' | 'reminder_time'>>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(preferences)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        tasks,
        loading,
        refreshProfile,
        updateProfile,
        updatePreferences,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
