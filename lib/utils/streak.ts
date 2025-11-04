import { supabase } from '@/lib/supabase/client';

/**
 * Calculates the current streak for a user based on consecutive days
 * where both 'workout' and 'bible_reading' tasks are completed.
 * 
 * @param userId - The user's ID
 * @returns The number of consecutive days with both tasks completed
 */
export async function calculateStreak(userId: string): Promise<number> {
  try {
    // Get all verified task completions, ordered by date descending
    const { data, error } = await supabase
      .from('task_completions')
      .select('completed_date, task_name')
      .eq('user_id', userId)
      .eq('verification_status', 'verified')
      .in('task_name', ['workout', 'bible_reading'])
      .order('completed_date', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return 0;
    }

    // Group completions by date
    const completionsByDate: Record<string, Set<string>> = {};
    data.forEach((completion) => {
      const date = completion.completed_date;
      if (!completionsByDate[date]) {
        completionsByDate[date] = new Set();
      }
      completionsByDate[date].add(completion.task_name);
    });

    // Calculate consecutive days starting from today going backwards
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check each day going backwards from today
    // Start from today (i=0) and go backwards
    for (let i = 0; i < 365; i++) { // Check up to 365 days back
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const tasks = completionsByDate[dateStr];
      
      // A day counts if it has BOTH workout and bible_reading
      if (tasks && tasks.has('workout') && tasks.has('bible_reading')) {
        streak++;
      } else {
        // If any day doesn't have both tasks, break the streak
        // This includes today - if today is incomplete, streak is 0
        break;
      }
    }

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

