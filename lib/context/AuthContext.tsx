import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  signUp: (email: string, password: string, name: string) => Promise<{ 
    error: any; 
    needsEmailVerification?: boolean; 
    user?: User | null;
  }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkOnboardingStatus(session.user.id);
      } else {
        setOnboardingCompleted(false);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setOnboardingCompleted(null); // Reset to unknown while checking
        setLoading(true); // Set loading while checking status
        checkOnboardingStatus(session.user.id);
      } else {
        setOnboardingCompleted(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding status:', error);
        setOnboardingCompleted(false);
      } else if (data) {
        setOnboardingCompleted(data.onboarding_completed || false);
      } else {
        // User doesn't exist in users table - try to create a basic record
        // This can happen if user was deleted or if there was an issue during sign-up
        console.log('User record not found, attempting to create basic user record...');
        
        // Get user email from auth metadata
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            });

          if (insertError) {
            // If insert fails due to duplicate email, try to fetch by email instead
            if (insertError.code === '23505') {
              console.log('Email already exists, fetching user by email...');
              const { data: existingUser } = await supabase
                .from('users')
                .select('onboarding_completed, id')
                .eq('email', authUser.email || '')
                .maybeSingle();
              
              if (existingUser) {
                // Use the existing user's onboarding status
                // Note: If IDs don't match, the onboarding flow will handle creating/updating the record
                setOnboardingCompleted(existingUser.onboarding_completed || false);
              } else {
                // User exists but we can't fetch it - treat as needs onboarding
                setOnboardingCompleted(false);
              }
            } else {
              console.error('Error creating user record:', insertError);
              // If we can't create the record, sign them out
              await supabase.auth.signOut();
              setOnboardingCompleted(false);
            }
          } else {
            // New user record created, they need onboarding
            setOnboardingCompleted(false);
          }
        } else {
          // Can't get user info, sign out
          await supabase.auth.signOut();
          setOnboardingCompleted(false);
        }
      }
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
      setOnboardingCompleted(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshOnboardingStatus = async () => {
    if (user) {
      await checkOnboardingStatus(user.id);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Optional: redirect URL after email confirmation
          // emailRedirectTo: 'your-app-scheme://auth/callback',
        },
      });

      if (error) return { error };

      // Check if email confirmation is required
      // When email confirmation is enabled, data.session will be null
      // and the user needs to verify their email first
      const needsEmailVerification = !data.session && data.user;

      if (data.user) {
        // Create user record in users table
        // Note: This happens even if email is not verified yet
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email,
            name: name,
          });

        if (userError) {
          console.error('Error creating user record:', userError);
        }
      }

      // Return information about email verification status
      return { 
        error: null, 
        needsEmailVerification,
        user: data.user,
      };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        onboardingCompleted,
        signUp,
        signIn,
        signOut,
        refreshOnboardingStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

