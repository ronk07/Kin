import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import type { User, FamilyTask, TaskTemplate, TaskTemplateMetric } from '@/lib/types/database';

export interface Task {
  id: string; // family_task_id
  familyTaskId: string;
  templateName: string;
  name: string; // For backward compatibility, same as templateName
  title: string; // display_name or custom_name
  subtitle: string; // description or custom_subtitle
  enabled: boolean;
  category: string;
  icon: string;
  proofType: string;
  aiModel: string | null;
  pointsValue: number;
  metrics: TaskTemplateMetric[];
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
  const { familyId } = useFamily();
  const [profile, setProfile] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFamilyTasks();
    } else {
      setProfile(null);
      setTasks([]);
      setLoading(false);
    }
  }, [user, familyId]);

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
      } else {
        // User doesn't exist in users table yet
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    }
  };

  const fetchFamilyTasks = async () => {
    if (!user || !familyId) {
      setTasks([]);
      return;
    }

    try {
      // Use the helper function to get family tasks
      const { data, error } = await supabase.rpc('get_family_active_tasks', {
        p_family_id: familyId
      });

      if (error) throw error;

      // Transform the data to match our Task interface
      const familyTasks: Task[] = (data || []).map((task: any) => ({
        id: task.family_task_id,
        familyTaskId: task.family_task_id,
        templateName: task.template_name,
        name: task.template_name, // For backward compatibility
        title: task.custom_name || task.display_name,
        subtitle: task.custom_subtitle || task.description || '',
        enabled: true,
        category: task.category,
        icon: task.icon,
        proofType: task.proof_type,
        aiModel: task.ai_model,
        pointsValue: task.points_value,
        metrics: Array.isArray(task.metrics) ? task.metrics : [],
      }));

      setTasks(familyTasks);
    } catch (error) {
      console.error('Error fetching family tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
    await fetchFamilyTasks();
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
