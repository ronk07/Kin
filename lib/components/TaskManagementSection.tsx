import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Plus } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import type { Task } from '@/lib/context/UserContext';

interface TaskManagementSectionProps {
  tasks: Task[];
  onAddTask: () => void;
  onRemoveTask: (familyTaskId: string) => void;
  canManage?: boolean; // Whether user can add/remove tasks (defaults to true for backward compatibility)
}

export function TaskManagementSection({
  tasks,
  onAddTask,
  onRemoveTask,
  canManage = true,
}: TaskManagementSectionProps) {
  const handleRemovePress = (task: Task) => {
    Alert.alert(
      'Remove Task',
      `Are you sure you want to remove "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemoveTask(task.familyTaskId),
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        {canManage && (
          <TouchableOpacity onPress={onAddTask} style={styles.addButton}>
            <Plus size={18} color={Colors.accent} />
            <Text style={styles.addButtonText}>Add Task</Text>
          </TouchableOpacity>
        )}
      </View>

      {tasks.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tasks added yet</Text>
          {canManage && (
            <Button
              title="Add Your First Task"
              onPress={onAddTask}
              variant="secondary"
              style={styles.emptyButton}
            />
          )}
        </Card>
      ) : (
        <View style={styles.tasksList}>
          {tasks.map((task) => (
            <Card key={task.familyTaskId} style={styles.taskCard}>
              <View style={styles.taskContent}>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskName}>{task.title}</Text>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>{task.pointsValue} pts</Text>
                  </View>
                </View>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => handleRemovePress(task)}
                    style={styles.removeButton}
                  >
                    <Trash2 size={18} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  addButtonText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  emptyCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  tasksList: {
    gap: Spacing.sm,
  },
  taskCard: {
    padding: Spacing.md,
  },
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  taskName: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: Colors.accent + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  pointsText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  removeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});

