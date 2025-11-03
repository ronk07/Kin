export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      families: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          user_id: string;
          role: 'owner' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          user_id?: string;
          role?: 'owner' | 'member';
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
      badges: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
        };
      };
    };
  };
}

