import { supabase } from '@/lib/supabase/client';

/**
 * Calculates the current streak for a user based on consecutive days
 * where ALL active family tasks are completed (solid circle).
 * 
 * @param userId - The user's ID
 * @returns The number of consecutive days with all tasks completed
 */
export async function calculateStreak(userId: string): Promise<number> {
  try {
    // First, get the user's family_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('family_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!userData?.family_id) {
      return 0; // No family, no streak
    }

    const familyId = userData.family_id;

    // Get all active family tasks for this family
    const { data: familyTasksData, error: familyTasksError } = await supabase
      .from('family_tasks')
      .select('id')
      .eq('family_id', familyId)
      .eq('is_active', true);

    if (familyTasksError) {
      console.error('Error fetching family tasks for streak:', familyTasksError);
      throw familyTasksError;
    }

    if (!familyTasksData || familyTasksData.length === 0) {
      console.log('No family tasks found for streak calculation');
      return 0; // No tasks assigned to family
    }

    const activeFamilyTaskIds = familyTasksData.map(ft => ft.id);
    console.log('Streak calculation - activeFamilyTaskIds:', activeFamilyTaskIds.length, 'tasks');

    if (activeFamilyTaskIds.length === 0) {
      return 0; // No active tasks
    }

    // Get all verified task completions for all active family tasks
    const { data, error } = await supabase
      .from('task_completions')
      .select('completed_date, family_task_id')
      .eq('user_id', userId)
      .eq('verification_status', 'verified')
      .in('family_task_id', activeFamilyTaskIds)
      .order('completed_date', { ascending: false });

    if (error) {
      console.error('Error fetching task completions for streak:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No verified completions found for streak calculation');
      return 0;
    }

    console.log('Found completions for streak:', data.length, 'completions');

    // Group completions by date and track which tasks were completed
    const completionsByDate: Record<string, Set<string>> = {};
    data.forEach((completion) => {
      const date = completion.completed_date;
      if (!completionsByDate[date]) {
        completionsByDate[date] = new Set();
      }
      // Store the family_task_id to check if all are present
      if (completion.family_task_id) {
        completionsByDate[date].add(completion.family_task_id);
      }
    });

    // Calculate consecutive days starting from today going backwards
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check each day going backwards from today
    for (let i = 0; i < 365; i++) { // Check up to 365 days back
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const completedTasks = completionsByDate[dateStr];
      
      // A day counts if ALL active family tasks are completed (solid circle)
      const allTasksCompleted = activeFamilyTaskIds.every(taskId => 
        completedTasks?.has(taskId) || false
      );
      
      if (allTasksCompleted) {
        streak++;
      } else {
        // If any day doesn't have all tasks completed, break the streak
        // This includes today - if today is incomplete, streak is 0
        if (i === 0) {
          const completedCount = completedTasks?.size || 0;
          console.log(`Today is incomplete - ${completedCount}/${activeFamilyTaskIds.length} tasks completed`);
        }
        break;
      }
    }

    console.log('Calculated streak:', streak, 'days');
    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}

/**
 * Updates the current_streak field in the users table for a given user
 * 
 * @param userId - The user's ID
 */
export async function updateStreakInDatabase(userId: string): Promise<void> {
  try {
    const streak = await calculateStreak(userId);
    
    const { error } = await supabase
      .from('users')
      .update({ current_streak: streak })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating streak in database:', error);
  }
}

