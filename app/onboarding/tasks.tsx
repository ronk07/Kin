import { Colors, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/lib/components/Button';
import { useAuth } from '@/lib/context/AuthContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { useUser } from '@/lib/context/UserContext';
import { supabase } from '@/lib/supabase/client';
import type { TaskTemplate } from '@/lib/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const INITIAL_TASKS_TO_SHOW = 10;

export default function TasksSetupScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { familyId: contextFamilyId } = useFamily();
  const { refreshProfile } = useUser();
  const router = useRouter();
  
  // Use familyId from params if available (for onboarding), otherwise use from context
  const familyId = (params.familyId as string) || contextFamilyId;

  const [allTemplates, setAllTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [addingTasks, setAddingTasks] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchAllTemplates();
  }, []);

  const fetchAllTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAllTemplates(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load templates');
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTaskToggle = (templateId: string) => {
    setSelectedTemplateIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const handleContinue = async () => {
    if (selectedTemplateIds.size < 2) {
      Alert.alert('Select More Tasks', 'Please select at least 2 tasks before continuing.');
      return;
    }

    if (!familyId || !user) {
      Alert.alert('Error', 'Family or user information missing');
      return;
    }

    setAddingTasks(true);
    try {
      // Add all selected tasks
      const selectedTemplates = allTemplates.filter(t => selectedTemplateIds.has(t.id));
      
      for (const template of selectedTemplates) {
        const { error } = await supabase.rpc('add_family_task', {
          p_family_id: familyId,
          p_task_template_name: template.name,
          p_created_by: user.id,
          p_custom_name: null,
          p_custom_subtitle: null,
        });

        if (error) {
          console.error(`Error adding task ${template.name}:`, error);
          // Continue with other tasks even if one fails
        }
      }

      // Refresh user profile and tasks to ensure they're loaded
      await refreshProfile();

      // Navigate to next screen
      router.push({
        pathname: '/onboarding/reminders',
        params: {
          workoutGoal: params.workoutGoal as string,
          stepGoal: params.stepGoal as string,
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add tasks');
      console.error('Error adding tasks:', error);
    } finally {
      setAddingTasks(false);
    }
  };

  const displayedTemplates = showAll ? allTemplates : allTemplates.slice(0, INITIAL_TASKS_TO_SHOW);
  const hasMore = allTemplates.length > INITIAL_TASKS_TO_SHOW;

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot]} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Tasks 📋</Text>
      </View>

      {loadingTemplates ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <>
          <View style={styles.tasksContainer}>
            {displayedTemplates.map((template) => {
              const isSelected = selectedTemplateIds.has(template.id);
              return (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.taskPill,
                    isSelected && styles.taskPillSelected,
                  ]}
                  onPress={() => handleTaskToggle(template.id)}
                >
                  <Text style={[
                    styles.taskPillText,
                    isSelected && styles.taskPillTextSelected,
                  ]}>
                    {template.display_name}
                  </Text>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {hasMore && !showAll && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAll(true)}
            >
              <Text style={styles.showMoreText}>Show More</Text>
            </TouchableOpacity>
          )}

          {selectedTemplateIds.size > 0 && (
            <Text style={styles.selectionCount}>
              {selectedTemplateIds.size} task{selectedTemplateIds.size !== 1 ? 's' : ''} selected
            </Text>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title={addingTasks ? 'Adding Tasks...' : 'Continue'}
              onPress={handleContinue}
              disabled={selectedTemplateIds.size < 2 || addingTasks}
              fullWidth
              variant="primary"
            />
            {selectedTemplateIds.size < 2 && (
              <Text style={styles.minSelectionText}>
                Please select at least 2 tasks
              </Text>
            )}
          </View>
        </>
      )}
    </View>
  );

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: Spacing.xs,
    zIndex: 1,
  },
  title: {
    fontSize: Typography.h1,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  tasksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  taskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 999, // Full pill shape
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
    gap: Spacing.sm,
  },
  taskPillSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  taskPillText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
  taskPillTextSelected: {
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
  checkmark: {
    fontSize: 16,
    color: Colors.beige,
    fontWeight: 'bold',
  },
  showMoreButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  showMoreText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  selectionCount: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  minSelectionText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});

