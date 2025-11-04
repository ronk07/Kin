import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, ChevronLeft } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase/client';
import type { TaskTemplate } from '@/lib/types/database';
import { getTaskIcon } from '@/lib/utils/taskIcons';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskAdded: () => void;
  familyId: string;
  userId: string;
}

const CATEGORIES = [
  { value: 'Physical', label: 'Physical', emoji: '🏋️' },
  { value: 'Mental', label: 'Mental', emoji: '🧘' },
  { value: 'Spiritual', label: 'Spiritual', emoji: '🙏' },
  { value: 'Habits', label: 'Habits', emoji: '🪴' },
];

export function AddTaskModal({
  visible,
  onClose,
  onTaskAdded,
  familyId,
  userId,
}: AddTaskModalProps) {
  const [step, setStep] = useState<'category' | 'template'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null);
  const [availableTemplates, setAvailableTemplates] = useState<TaskTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setStep('category');
      setSelectedCategory(null);
      setSelectedTemplate(null);
      setAvailableTemplates([]);
    }
  }, [visible]);

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
    if (!selectedTemplate || !familyId || !userId) {
      Alert.alert('Error', 'Please select a task template');
      return;
    }

    setAddingTask(true);
    try {
      const { error } = await supabase.rpc('add_family_task', {
        p_family_id: familyId,
        p_task_template_name: selectedTemplate.name,
        p_created_by: userId,
        p_custom_name: null,
        p_custom_subtitle: null,
      });

      if (error) throw error;

      Alert.alert('Success', 'Task added successfully!');
      onTaskAdded();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add task');
      console.error('Error adding task:', error);
    } finally {
      setAddingTask(false);
    }
  };

  const renderCategorySelection = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.modalTitle}>Select Category</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.modalDescription}>
        Choose a category for your task
      </Text>

      <View style={styles.categoriesContainer}>
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
    </ScrollView>
  );

  const renderTemplateSelection = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.modalTitle}>Select Task</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.modalDescription}>
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
          <View style={styles.templatesContainer}>
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
          </View>


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
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={onClose}
          />
          <Card style={styles.modalCard}>
            {step === 'category' ? renderCategorySelection() : renderTemplateSelection()}
          </Card>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalDescription: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  categoriesContainer: {
    gap: Spacing.md,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
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
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '30',
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
    marginTop: Spacing.lg,
  },
});

