import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { Button } from '@/lib/components/Button';
import { Card } from '@/lib/components/Card';
import { useAuth } from '@/lib/context/AuthContext';
import { useFamily } from '@/lib/context/FamilyContext';
import { supabase } from '@/lib/supabase/client';
import type { TaskTemplate } from '@/lib/types/database';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Trash2 } from 'lucide-react-native';
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

const CATEGORIES = [
  { value: 'Physical', label: 'Physical', emoji: '🏋️' },
  { value: 'Mental', label: 'Mental', emoji: '🧘' },
  { value: 'Spiritual', label: 'Spiritual', emoji: '🙏' },
  { value: 'Habits', label: 'Habits', emoji: '🪴' },
];

interface SelectedTask {
  familyTaskId: string;
  templateName: string;
  displayName: string;
}

export default function TasksSetupScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const { familyId: contextFamilyId } = useFamily();
  const router = useRouter();
  
  // Use familyId from params if available (for onboarding), otherwise use from context
  const familyId = (params.familyId as string) || contextFamilyId;

  const [step, setStep] = useState<'category' | 'template'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<TaskTemplate[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<SelectedTask[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (selectedCategory && step === 'template') {
      fetchTemplates(selectedCategory);
    }
  }, [selectedCategory, step]);


  const fetchTemplates = async (category: string) => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true)
        .eq('category', category)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setAvailableTemplates(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load templates');
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setStep('template');
  };

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template);
  };

  const handleBack = () => {
    if (step === 'template') {
      setStep('category');
      setSelectedTemplate(null);
      setAvailableTemplates([]);
    }
  };

  const handleAddTask = async () => {
    if (!selectedTemplate || !familyId || !user) {
      Alert.alert('Error', 'Please select a task template');
      return;
    }

    setAddingTask(true);
    try {
      const { data: familyTaskId, error } = await supabase.rpc('add_family_task', {
        p_family_id: familyId,
        p_task_template_name: selectedTemplate.name,
        p_created_by: user.id,
        p_custom_name: null,
        p_custom_subtitle: null,
      });

      if (error) throw error;

      // Add to selected tasks list
      setSelectedTasks([
        ...selectedTasks,
        {
          familyTaskId: familyTaskId as string,
          templateName: selectedTemplate.name,
          displayName: selectedTemplate.display_name,
        },
      ]);

      // Reset form
      setSelectedTemplate(null);
      setStep('category');
      setSelectedCategory(null);
      setAvailableTemplates([]);

      Alert.alert('Success', 'Task added! You can add more or continue.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add task');
      console.error('Error adding task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  const handleRemoveTask = async (familyTaskId: string) => {
    if (!familyId) return;

    try {
      const { error } = await supabase.rpc('remove_family_task', {
        p_family_id: familyId,
        p_family_task_id: familyTaskId,
      });

      if (error) throw error;

      setSelectedTasks(selectedTasks.filter((task) => task.familyTaskId !== familyTaskId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove task');
      console.error('Error removing task:', error);
    }
  };

  const handleContinue = () => {
    router.push({
      pathname: '/onboarding/reminders',
      params: {
        workoutGoal: params.workoutGoal as string,
        stepGoal: params.stepGoal as string,
      },
    });
  };

  const renderCategorySelection = () => (
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
        <Text style={styles.subtitle}>
          Select tasks that your family will complete daily. You can add more later!
        </Text>
      </View>

      {selectedTasks.length > 0 && (
        <View style={styles.selectedTasksContainer}>
          <Text style={styles.selectedTasksTitle}>Selected Tasks</Text>
          {selectedTasks.map((task) => (
            <Card key={task.familyTaskId} style={styles.taskCard}>
              <View style={styles.taskCardContent}>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{task.displayName}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveTask(task.familyTaskId)}
                  style={styles.removeButton}
                >
                  <Trash2 size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Select Category</Text>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.value}
              style={styles.categoryButton}
              onPress={() => handleCategorySelect(category.value)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          fullWidth
          variant="primary"
        />
      </View>
    </View>
  );

  const renderTemplateSelection = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Task</Text>
      </View>

      <Text style={styles.subtitle}>
        Choose a task from {selectedCategory}
      </Text>

      {loadingTemplates ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : availableTemplates.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No templates available</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.templatesContainer} showsVerticalScrollIndicator={false}>
            {availableTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateButton,
                  selectedTemplate?.id === template.id && styles.templateButtonActive,
                ]}
                onPress={() => handleTemplateSelect(template)}
              >
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{template.display_name}</Text>
                  {template.description && (
                    <Text style={styles.templateDescription}>{template.description}</Text>
                  )}
                </View>
                {selectedTemplate?.id === template.id && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>


          <View style={styles.buttonContainer}>
            <Button
              title={addingTask ? 'Adding...' : 'Add Task'}
              onPress={handleAddTask}
              disabled={!selectedTemplate || addingTask}
              fullWidth
              variant="primary"
            />
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
          {step === 'category' ? renderCategorySelection() : renderTemplateSelection()}
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
  subtitle: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  selectedTasksContainer: {
    marginBottom: Spacing.xl,
  },
  selectedTasksTitle: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.md,
  },
  taskCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  taskCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
    marginBottom: Spacing.xs,
  },
  taskSubtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  removeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  categoriesContainer: {
    flex: 1,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.sm,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
  },
  categoryEmoji: {
    fontSize: 32,
  },
  categoryLabel: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    flex: 1,
  },
  loadingContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  templatesContainer: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
    marginBottom: Spacing.sm,
  },
  templateButtonActive: {
    backgroundColor: Colors.accent + '20',
    borderColor: Colors.accent,
  },
  templateEmoji: {
    fontSize: 24,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
  },
  templateDescription: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: Colors.beige,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});

