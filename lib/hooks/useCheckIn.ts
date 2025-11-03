import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { verifyWorkoutImage } from '@/lib/api/gemini';
import { Alert } from 'react-native';

interface UseCheckInProps {
  userId?: string;
  familyId?: string;
}

export function useCheckIn({ userId, familyId }: UseCheckInProps = {}) {
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | null>(null);

  // Fetch current streak
  useEffect(() => {
    if (userId && familyId) {
      fetchStreak();
    }
  }, [userId, familyId]);

  const fetchStreak = async () => {
    if (!userId || !familyId) return;

    try {
      // Get all verified check-ins, ordered by date descending
      const { data, error } = await supabase
        .from('checkins')
        .select('date')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .eq('verification_status', 'verified')
        .order('date', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setStreakDays(0);
        setLastCheckInDate(null);
        return;
      }

      // Calculate consecutive days
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < data.length; i++) {
        const checkInDate = new Date(data[i].date);
        checkInDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === i) {
          streak++;
        } else {
          break;
        }
      }

      setStreakDays(streak);
      setLastCheckInDate(data[0]?.date || null);
    } catch (error) {
      console.error('Error fetching streak:', error);
    }
  };

  const handleCheckIn = async (imageUri: string) => {
    if (!userId || !familyId) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setIsLoading(true);

    try {
      // Upload image to Supabase Storage
      const FileSystem = require('expo-file-system');
      const fileBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const fileName = `${userId}/${Date.now()}.jpg`;
      
      // Convert base64 to ArrayBuffer for Supabase
      const byteCharacters = atob(fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('workout-proofs')
        .upload(fileName, byteArray, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('workout-proofs')
        .getPublicUrl(fileName);

      const proofUrl = urlData.publicUrl;

      // Verify with Gemini
      const verification = await verifyWorkoutImage(imageUri);

      const today = new Date().toISOString().split('T')[0];
      const verificationStatus = verification.isWorkout && verification.confidence > 0.8 
        ? 'verified' 
        : 'rejected';

      // Create check-in record
      const { error: checkInError } = await supabase
        .from('checkins')
        .upsert({
          user_id: userId,
          family_id: familyId,
          date: today,
          proof_url: proofUrl,
          verification_status: verificationStatus,
          verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
        }, {
          onConflict: 'user_id,date',
        });

      if (checkInError) throw checkInError;

      // Award points if verified
      if (verificationStatus === 'verified') {
        await supabase.from('points').insert({
          user_id: userId,
          family_id: familyId,
          points: 10,
          source: 'workout',
        });

        Alert.alert(
          'Success! 🎉',
          `Workout verified! +10 points. Your streak is now ${streakDays + 1} days.`,
          [{ text: 'OK' }]
        );

        // Refresh streak
        await fetchStreak();
      } else {
        Alert.alert(
          'Verification Failed',
          'The image could not be verified as a workout. Please try again with a clearer photo.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Error', error.message || 'Failed to process workout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getEncouragementText = (): string => {
    if (streakDays === 0) {
      return "Your strength is renewed each morning. Start your journey today!";
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCheckIn = lastCheckInDate ? new Date(lastCheckInDate) : null;
    
    if (lastCheckIn) {
      lastCheckIn.setHours(0, 0, 0, 0);
      const daysSinceLastCheckIn = Math.floor((today.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastCheckIn > 1) {
        return "Your strength is renewed each morning. Get back on track today!";
      }
    }

    return "Keep going strong — the family's cheering you on!";
  };

  return {
    streakDays,
    isLoading,
    handleCheckIn,
    getEncouragementText,
    refreshStreak: fetchStreak,
  };
}

