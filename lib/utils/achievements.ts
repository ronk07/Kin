import { supabase } from '@/lib/supabase/client';

/**
 * Checks if the user has achieved their weekly workout goal and records it if so
 * @param userId - The user's ID
 * @param familyId - The family ID
 * @param workoutGoal - The weekly workout goal (number of workouts per week)
 * @returns Promise<boolean> - true if goal was just achieved (new achievement recorded)
 */
export async function checkWeeklyWorkoutGoal(
  userId: string,
  familyId: string,
  workoutGoal: number
): Promise<boolean> {
  try {
    // Get the start and end of the current week (Sunday to Saturday)
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];

    // Find the workout task template
    const { data: workoutTemplate } = await supabase
      .from('task_templates')
      .select('id')
      .eq('name', 'workout')
      .single();

    if (!workoutTemplate) {
      console.log('Workout template not found');
      return false;
    }

    // Get the family_task_id for workout in this family
    const { data: workoutFamilyTask } = await supabase
      .from('family_tasks')
      .select('id')
      .eq('family_id', familyId)
      .eq('task_template_id', workoutTemplate.id)
      .eq('is_active', true)
      .single();

    if (!workoutFamilyTask) {
      console.log('Workout task not found in family');
      return false;
    }

    // Count verified workout completions for this week
    const { data: completions, error } = await supabase
      .from('task_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .eq('family_task_id', workoutFamilyTask.id)
      .eq('verification_status', 'verified')
      .gte('completed_date', startDateStr)
      .lte('completed_date', endDateStr);

    if (error) {
      console.error('Error checking workout goal:', error);
      return false;
    }

    // Count unique days with workouts
    const uniqueDays = new Set(completions?.map(c => c.completed_date) || []);
    const workoutCount = uniqueDays.size;

    console.log(`Weekly workout goal check: ${workoutCount}/${workoutGoal} workouts this week`);

    // If goal is achieved, check if we've already recorded this achievement
    if (workoutCount >= workoutGoal) {
      // Check if achievement already exists for this week
      const { data: existingAchievement } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .eq('achievement_type', 'weekly_workout_goal')
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString())
        .maybeSingle();

      if (existingAchievement) {
        // Already recorded this week
        return false;
      }

      // Record the achievement
      const { error: insertError } = await supabase
        .from('achievements')
        .insert({
          user_id: userId,
          family_id: familyId,
          achievement_type: 'weekly_workout_goal',
          achievement_data: {
            goal: workoutGoal,
            actual: workoutCount,
            week_start: startDateStr,
            week_end: endDateStr,
          },
        });

      if (insertError) {
        console.error('Error recording workout goal achievement:', insertError);
        return false;
      }

      // Award points for achieving weekly goal
      await supabase.from('points').insert({
        user_id: userId,
        family_id: familyId,
        points: 20,
        source: 'weekly workout goal',
      });

      console.log(`Weekly workout goal achieved! ${workoutCount} workouts completed.`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error in checkWeeklyWorkoutGoal:', error);
    return false;
  }
}

