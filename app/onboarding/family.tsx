import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2 } from 'lucide-react-native';
import { Button } from '@/lib/components/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { supabase } from '@/lib/supabase/client';
import { generateFamilyInviteCode, formatFamilyCode, validateAndUseInviteCode } from '@/lib/utils/familyCode';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

export default function FamilySetupScreen() {
  const [mode, setMode] = useState<'choose' | 'create' | 'join' | 'success'>('choose');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdFamilyCode, setCreatedFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { refreshAll } = useFamily();
  const router = useRouter();

  const handleShareCode = async () => {
    try {
      const message = `Join my family on Kin! 🏋️\n\nUse this invite code: ${formatFamilyCode(createdFamilyCode)}\n\nDownload Kin and let's stay accountable together!`;
      
      await Share.share({
        message,
        title: 'Join My Family on Kin',
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      // Create family with owner_id
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ 
          name: familyName.trim(),
          owner_id: user.id 
        })
        .select()
        .single();

      if (familyError) throw familyError;

      // Update user's family_id and role
      const { error: userError } = await supabase
        .from('users')
        .update({
          family_id: family.id,
          family_role: 'owner',
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Generate invite code for the family
      const code = await generateFamilyInviteCode(family.id, user.id);
      
      // Refresh family context to load the new family data
      await refreshAll();

      // Show success screen with invite code
      setCreatedFamilyCode(code);
      setMode('success');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      const result = await validateAndUseInviteCode(inviteCode.trim(), user.id);

      if (!result.valid) {
        Alert.alert('Error', result.error || 'Invalid invite code');
        return;
      }

      // Refresh family context to load the new family data
      await refreshAll();

      router.push('/onboarding/goals');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join family');
    } finally {
      setLoading(false);
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
                <View style={[styles.progressDot, styles.progressDotActive]} />
                <View style={styles.progressDot} />
                <View style={styles.progressDot} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Join Your Family</Text>
                <Text style={styles.subtitle}>
                  Create a new family or join an existing one
                </Text>
              </View>

              {mode === 'choose' && (
                <View style={styles.choiceContainer}>
                  <TouchableOpacity
                    style={styles.choiceCard}
                    onPress={() => setMode('create')}
                  >
                    <Text style={styles.choiceTitle}>Create Family</Text>
                    <Text style={styles.choiceDescription}>
                      Start a new family and invite members
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.choiceCard}
                    onPress={() => setMode('join')}
                  >
                    <Text style={styles.choiceTitle}>Join Family</Text>
                    <Text style={styles.choiceDescription}>
                      Use an invite code to join an existing family
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {mode === 'create' && (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Family Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your family name"
                      placeholderTextColor={Colors.textSecondary}
                      value={familyName}
                      onChangeText={setFamilyName}
                      autoCapitalize="words"
                      autoFocus
                    />
                  </View>

                  <View style={styles.buttonGroup}>
                    <Button
                      title="Create Family"
                      onPress={handleCreateFamily}
                      loading={loading}
                      disabled={loading}
                      fullWidth
                      variant="primary"
                    />
                    <Button
                      title="Back"
                      onPress={() => setMode('choose')}
                      fullWidth
                      variant="secondary"
                    />
                  </View>
                </View>
              )}

              {mode === 'success' && (
                <View style={styles.successContainer}>
                  <Text style={styles.successTitle}>Family Created! 🎉</Text>
                  <Text style={styles.successMessage}>
                    Share this code with your family members so they can join:
                  </Text>
                  
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeText}>{formatFamilyCode(createdFamilyCode)}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={handleShareCode}
                  >
                    <Share2 size={20} color={Colors.accent} />
                    <Text style={styles.shareButtonText}>Share Code</Text>
                  </TouchableOpacity>

                  <Text style={styles.codeHint}>
                    You can find this code anytime in Settings
                  </Text>

                  <Button
                    title="Continue"
                    onPress={() => router.push('/onboarding/goals')}
                    fullWidth
                    variant="primary"
                  />
                </View>
              )}

              {mode === 'join' && (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Invite Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter invite code"
                      placeholderTextColor={Colors.textSecondary}
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>

                  <View style={styles.buttonGroup}>
                    <Button
                      title="Join Family"
                      onPress={handleJoinFamily}
                      loading={loading}
                      disabled={loading}
                      fullWidth
                      variant="primary"
                    />
                    <Button
                      title="Back"
                      onPress={() => setMode('choose')}
                      fullWidth
                      variant="secondary"
                    />
                  </View>
                </View>
              )}
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
  choiceContainer: {
    gap: Spacing.lg,
  },
  choiceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  choiceTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
  },
  choiceDescription: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.xl,
  },
  inputContainer: {
    gap: Spacing.sm,
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
  buttonGroup: {
    gap: Spacing.md,
  },
  successContainer: {
    gap: Spacing.lg,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  codeContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 32,
    fontFamily: Typography.headingFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
    letterSpacing: 4,
  },
  codeHint: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent + '20',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    marginVertical: Spacing.md,
  },
  shareButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
});

