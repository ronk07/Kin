import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { X } from 'lucide-react-native';
import type { Task } from '@/lib/context/UserContext';

interface TaskDetailsFormProps {
  visible: boolean;
  taskName?: 'workout' | 'bible_reading'; // Legacy support
  task?: Task; // New: task with metrics configuration
  onSubmit: (details: Record<string, any>) => void; // Changed to flexible metrics
  onCancel: () => void;
  initialValues?: Record<string, any>; // Changed to flexible metrics
}

export function TaskDetailsForm({
  visible,
  taskName, // Legacy prop
  task, // New prop
  onSubmit,
  onCancel,
  initialValues,
}: TaskDetailsFormProps) {
  // Use task if provided, otherwise fall back to taskName for backward compatibility
  const activeTask = task;
  const isLegacyMode = !activeTask && taskName;
  
  // Dynamic state for metrics
  const [metrics, setMetrics] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      if (initialValues) {
        const newMetrics: Record<string, string> = {};
        if (activeTask?.metrics) {
          // Use task metrics configuration
          activeTask.metrics.forEach(metric => {
            // RPC returns 'name' field, not 'metric_name'
            const metricName = (metric as any).name || metric.metric_name;
            newMetrics[metricName] = initialValues[metricName]?.toString() || '';
          });
        } else if (isLegacyMode) {
          // Legacy mode: use old props
          newMetrics['caloriesBurned'] = initialValues.caloriesBurned?.toString() || '';
          newMetrics['durationMinutes'] = initialValues.durationMinutes?.toString() || '';
          newMetrics['bibleChapter'] = initialValues.bibleChapter || '';
        } else {
          // Fallback: use all initialValues
          Object.entries(initialValues).forEach(([key, value]) => {
            newMetrics[key] = value?.toString() || '';
          });
        }
        setMetrics(newMetrics);
      } else {
        setMetrics({});
      }
    }
  }, [visible, initialValues, activeTask, isLegacyMode]);

  const handleSubmit = () => {
    if (activeTask?.metrics) {
      // New mode: build metrics from task configuration
      const submittedMetrics: Record<string, any> = {};
      activeTask.metrics.forEach(metric => {
        // RPC returns 'name' and 'type' fields
        const metricName = (metric as any).name || metric.metric_name;
        const metricType = (metric as any).type || metric.metric_type;
        const value = metrics[metricName];
        if (value && value.trim() !== '') {
          // Convert based on metric type
          if (metricType === 'number' || metricType === 'duration' || metricType === 'distance') {
            submittedMetrics[metricName] = parseFloat(value);
          } else {
            submittedMetrics[metricName] = value.trim();
          }
        }
      });
      onSubmit(submittedMetrics);
    } else if (isLegacyMode) {
      // Legacy mode
      if (taskName === 'workout') {
        onSubmit({
          caloriesBurned: metrics['caloriesBurned'] ? parseInt(metrics['caloriesBurned'], 10) : undefined,
          durationMinutes: metrics['durationMinutes'] ? parseInt(metrics['durationMinutes'], 10) : undefined,
        });
      } else {
        onSubmit({
          bibleChapter: metrics['bibleChapter']?.trim() || undefined,
        });
      }
    } else {
      // Fallback: submit all metrics
      const submittedMetrics: Record<string, any> = {};
      Object.entries(metrics).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          submittedMetrics[key] = isNaN(Number(value)) ? value.trim() : Number(value);
        }
      });
      onSubmit(submittedMetrics);
    }
  };

  const isWorkout = isLegacyMode ? taskName === 'workout' : activeTask?.templateName === 'workout';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdropWrapper}>
          <TouchableOpacity 
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={onCancel}
          />

          <View style={styles.modalContainer}>
            <Card style={styles.modal}>
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {activeTask ? `${activeTask.title} Details` : isWorkout ? 'Workout Details' : 'Bible Reading Details'}
                </Text>
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                {activeTask?.metrics && activeTask.metrics.length > 0
                  ? `Add details about your ${activeTask.title.toLowerCase()} (optional)`
                  : isWorkout
                  ? 'Add details about your workout (optional)'
                  : 'Add the chapter you read (optional)'}
              </Text>

              {/* Form Fields */}
              {activeTask?.metrics && activeTask.metrics.length > 0 ? (
                // New dynamic mode: render fields based on task metrics
                <View style={styles.form}>
                  {activeTask.metrics.map((metric, index) => {
                    // RPC returns 'name', 'type', 'required' instead of 'metric_name', 'metric_type', 'is_required'
                    const metricName = (metric as any).name || metric.metric_name;
                    const metricType = (metric as any).type || metric.metric_type;
                    const isRequired = (metric as any).required ?? metric.is_required;
                    const placeholder = metric.placeholder;
                    const unit = metric.unit;
                    
                    return (
                      <View key={`metric-${metric.id || metricName || index}`} style={styles.inputContainer}>
                        <Text style={styles.label}>
                          {placeholder || metricName.charAt(0).toUpperCase() + metricName.slice(1)}
                          {isRequired && <Text key={`required-${metric.id || metricName || index}`} style={{ color: Colors.accent }}> *</Text>}
                        </Text>
                        <TextInput
                          key={`input-${metric.id || metricName || index}`}
                          style={styles.input}
                          placeholder={placeholder || `Enter ${metricName}`}
                          placeholderTextColor={Colors.textSecondary}
                          value={metrics[metricName] || ''}
                          onChangeText={(value) => {
                            setMetrics(prev => {
                              const updated = { ...prev };
                              updated[metricName] = value;
                              return updated;
                            });
                          }}
                          keyboardType={
                            metricType === 'number' || metricType === 'duration' || metricType === 'distance'
                              ? 'number-pad'
                              : 'default'
                          }
                          returnKeyType="done"
                        />
                      </View>
                    );
                  })}
                </View>
              ) : isWorkout ? (
                // Legacy workout mode
                <View style={styles.form}>
                  <View key="calories" style={styles.inputContainer}>
                    <Text style={styles.label}>Calories Burned</Text>
                    <TextInput
                      key="calories-input"
                      style={styles.input}
                      placeholder="Enter calories burned"
                      placeholderTextColor={Colors.textSecondary}
                      value={metrics['caloriesBurned'] || ''}
                      onChangeText={(value) => {
                        setMetrics(prev => {
                          const updated = { ...prev };
                          updated.caloriesBurned = value;
                          return updated;
                        });
                      }}
                      keyboardType="number-pad"
                      returnKeyType="next"
                    />
                  </View>

                  <View key="duration" style={styles.inputContainer}>
                    <Text style={styles.label}>Duration (minutes)</Text>
                    <TextInput
                      key="duration-input"
                      style={styles.input}
                      placeholder="Enter duration (minutes)"
                      placeholderTextColor={Colors.textSecondary}
                      value={metrics['durationMinutes'] || ''}
                      onChangeText={(value) => {
                        setMetrics(prev => {
                          const updated = { ...prev };
                          updated.durationMinutes = value;
                          return updated;
                        });
                      }}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              ) : (
                // Legacy bible reading mode
                <View style={styles.form}>
                  <View key="bibleChapter" style={styles.inputContainer}>
                    <Text style={styles.label}>Book and Chapter</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter book and chapter"
                      placeholderTextColor={Colors.textSecondary}
                      value={metrics['bibleChapter'] || ''}
                      onChangeText={(value) => setMetrics(prev => ({ ...prev, bibleChapter: value }))}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </Card>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'transparent',
  },
  backdropWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    alignSelf: 'center',
  },
  modal: {
    width: '100%',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '50',
  },
  cancelButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  submitButton: {
    backgroundColor: Colors.accent,
  },
  submitButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
});

