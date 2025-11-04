import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/lib/components/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
  const { profile, loading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (userLoading) {
      setLoading(true);
    } else {
      // Once UserContext has finished loading (even if profile is null), allow user to proceed
      if (profile) {
        setName(profile.name || '');
      }
      setLoading(false);
    }
  }, [profile, userLoading]);

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setSaving(true);

    try {
      // First, check if a user record exists with the auth user ID
      const { data: existingUserById } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      // Also check if a user exists with this email but different ID
      const { data: existingUserByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email || '')
        .maybeSingle();

      // If user exists with same email but different ID, delete the old record
      if (existingUserByEmail && existingUserByEmail.id !== user.id) {
        console.log('User exists with different ID, deleting old record...');
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', existingUserByEmail.id);
        
        if (deleteError) {
          console.error('Error deleting old user record:', deleteError);
          // Continue anyway - try to create/update with auth user ID
        }
      }

      // Now create or update user record with auth user ID
      const userData: any = {
        id: user.id,
        email: user.email || '',
        name: name.trim(),
      };
      if (age) userData.age = parseInt(age);
      if (gender) userData.gender = gender;

      // Use upsert to create or update
      const { error } = await supabase
        .from('users')
        .upsert(userData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      router.push('/onboarding/family');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Welcome to Kin! 👋</Text>
                <Text style={styles.subtitle}>
                  Complete your profile
                </Text>
              </View>

              {/* Form */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your name"
                      placeholderTextColor={Colors.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Age (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your age"
                      placeholderTextColor={Colors.textSecondary}
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Gender (Optional)</Text>
                    <View style={styles.genderButtons}>
                      <TouchableOpacity
                        style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                        onPress={() => setGender('male')}
                      >
                        <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextActive]}>
                          Male
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                        onPress={() => setGender('female')}
                      >
                        <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextActive]}>
                          Female
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderButton, gender === 'other' && styles.genderButtonActive]}
                        onPress={() => setGender('other')}
                      >
                        <Text style={[styles.genderButtonText, gender === 'other' && styles.genderButtonTextActive]}>
                          Other
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Button */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Continue"
                  onPress={handleContinue}
                  loading={saving}
                  disabled={saving || loading}
                  fullWidth
                  variant="primary"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary + '40',
  },
  progressDotActive: {
    backgroundColor: Colors.accent,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.bodyLarge,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  genderButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  genderButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  genderButtonTextActive: {
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
});

