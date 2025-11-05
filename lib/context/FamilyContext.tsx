import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import type { Family, User } from '@/lib/types/database';

interface FamilyMember extends Pick<User, 'id' | 'name' | 'avatar_url' | 'total_points' | 'current_streak' | 'family_role'> {}

interface Activity {
  id: string;
  userName: string;
  action: string;
  timestamp: string;
  proof_url?: string;
}

interface FamilyContextType {
  family: Family | null;
  familyId: string | null;
  members: FamilyMember[];
  activities: Activity[];
  userRole: 'owner' | 'member' | null;
  loading: boolean;
  refreshFamily: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshAll: () => Promise<void>;
  updateFamilySettings: (updates: Partial<Pick<Family, 'require_photo_proof'>>) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFamilyData();
    } else {
      resetState();
    }
  }, [user]);

  const resetState = () => {
    setFamily(null);
    setFamilyId(null);
    setMembers([]);
    setActivities([]);
    setUserRole(null);
    setLoading(false);
  };

  const fetchFamilyData = async () => {
    if (!user) return;

    try {
      // Get user's family info from their profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('family_id, family_role')
        .eq('id', user.id)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (!userData || !userData.family_id) {
        console.log('User is not in a family yet');
        resetState();
        return;
      }

      setFamilyId(userData.family_id);
      setUserRole(userData.family_role);

      // Fetch family details
      await fetchFamily(userData.family_id);
      await fetchMembers(userData.family_id);
      await fetchActivities(userData.family_id);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching family data:', error);
      resetState();
    }
  };

  const fetchFamily = async (fId?: string) => {
    const targetFamilyId = fId || familyId;
    if (!targetFamilyId) return;

    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', targetFamilyId)
        .single();

      if (error) throw error;
      setFamily(data);
    } catch (error) {
      console.error('Error fetching family:', error);
    }
  };

  const fetchMembers = async (fId?: string) => {
    const targetFamilyId = fId || familyId;
    if (!targetFamilyId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url, total_points, current_streak, family_role')
        .eq('family_id', targetFamilyId)
        .order('total_points', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const fetchActivities = async (fId?: string) => {
    const targetFamilyId = fId || familyId;
    if (!targetFamilyId) return;

    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select(`
          id,
          family_task_id,
          completed_date,
          proof_url,
          created_at,
          users:user_id (name),
          family_tasks!inner (
            task_templates!inner (
              display_name
            )
          )
        `)
        .eq('family_id', targetFamilyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedActivities: Activity[] = (data || []).map((item: any) => {
        const taskName = item.family_tasks?.task_templates?.display_name || 'a task';
        return {
          id: item.id,
          userName: item.users?.name || 'Unknown',
          action: `completed ${taskName.toLowerCase()}`,
          timestamp: item.created_at,
          proof_url: item.proof_url,
        };
      });

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const refreshFamily = async () => {
    await fetchFamily();
  };

  const refreshMembers = async () => {
    await fetchMembers();
  };

  const refreshAll = async () => {
    await fetchFamilyData();
  };

  const updateFamilySettings = async (updates: Partial<Pick<Family, 'require_photo_proof'>>) => {
    if (!familyId) return;

    try {
      const { error } = await supabase
        .from('families')
        .update(updates)
        .eq('id', familyId);

      if (error) throw error;

      await fetchFamily();
    } catch (error) {
      console.error('Error updating family settings:', error);
      throw error;
    }
  };

  return (
    <FamilyContext.Provider
      value={{
        family,
        familyId,
        members,
        activities,
        userRole,
        loading,
        refreshFamily,
        refreshMembers,
        refreshAll,
        updateFamilySettings,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
