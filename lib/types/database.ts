export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          age: number | null;
          gender: 'male' | 'female' | 'other' | null;
          // Family relationship
          family_id: string | null;
          family_role: 'owner' | 'member' | null;
          // Preferences
          weekly_workout_goal: number;
          daily_step_goal: number;
          reminder_enabled: boolean;
          reminder_time: string;
          require_photo_proof: boolean;
          privacy_opt_out: boolean;
          onboarding_completed: boolean;
          // Stats
          total_points: number;
          current_streak: number;
          // Task configuration
          workout_task_enabled: boolean;
          workout_task_subtitle: string;
          bible_task_enabled: boolean;
          bible_task_subtitle: string;
          // Timestamps
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          age?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          family_id?: string | null;
          family_role?: 'owner' | 'member' | null;
          weekly_workout_goal?: number;
          daily_step_goal?: number;
          reminder_enabled?: boolean;
          reminder_time?: string;
          require_photo_proof?: boolean;
          privacy_opt_out?: boolean;
          onboarding_completed?: boolean;
          total_points?: number;
          current_streak?: number;
          workout_task_enabled?: boolean;
          workout_task_subtitle?: string;
          bible_task_enabled?: boolean;
          bible_task_subtitle?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          age?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          family_id?: string | null;
          family_role?: 'owner' | 'member' | null;
          weekly_workout_goal?: number;
          daily_step_goal?: number;
          reminder_enabled?: boolean;
          reminder_time?: string;
          require_photo_proof?: boolean;
          privacy_opt_out?: boolean;
          onboarding_completed?: boolean;
          total_points?: number;
          current_streak?: number;
          workout_task_enabled?: boolean;
          workout_task_subtitle?: string;
          bible_task_enabled?: boolean;
          bible_task_subtitle?: string;
          updated_at?: string;
        };
      };
      families: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          active_invite_code: string | null;
          invite_code_created_at: string | null;
          total_members: number;
          total_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          active_invite_code?: string | null;
          invite_code_created_at?: string | null;
          total_members?: number;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          active_invite_code?: string | null;
          invite_code_created_at?: string | null;
          total_members?: number;
          total_points?: number;
          updated_at?: string;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          task_name: string;
          completed_date: string;
          proof_url: string | null;
          verification_status: 'pending' | 'verified' | 'rejected';
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          task_name: string;
          completed_date: string;
          proof_url?: string | null;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          task_name?: string;
          completed_date?: string;
          proof_url?: string | null;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verified_at?: string | null;
        };
      };
      points: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          points: number;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          points: number;
          source: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          points?: number;
          source?: string;
        };
      };
      family_invite_codes: {
        Row: {
          id: string;
          family_id: string;
          code: string;
          created_by: string;
          expires_at: string | null;
          max_uses: number | null;
          times_used: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          code: string;
          created_by: string;
          expires_at?: string | null;
          max_uses?: number | null;
          times_used?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          code?: string;
          created_by?: string;
          expires_at?: string | null;
          max_uses?: number | null;
          times_used?: number;
          active?: boolean;
        };
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          family_id: string;
          date: string;
          proof_url: string | null;
          verification_status: 'pending' | 'verified' | 'rejected';
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_id: string;
          date: string;
          proof_url?: string | null;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          family_id?: string;
          date?: string;
          proof_url?: string | null;
          verification_status?: 'pending' | 'verified' | 'rejected';
          verified_at?: string | null;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['users']['Row'];
export type Family = Database['public']['Tables']['families']['Row'];
export type TaskCompletion = Database['public']['Tables']['task_completions']['Row'];
export type Point = Database['public']['Tables']['points']['Row'];
export type FamilyInviteCode = Database['public']['Tables']['family_invite_codes']['Row'];
export type CheckIn = Database['public']['Tables']['checkins']['Row'];
