import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Switch } from 'react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface SettingsItem {
  id: string;
  label: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  type: 'toggle' | 'button';
  description?: string;
}

interface SettingsSectionProps {
  title: string;
  items: SettingsItem[];
}

export function SettingsSection({ title, items }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            {item.description && (
              <Text style={styles.itemDescription}>{item.description}</Text>
            )}
          </View>
          {item.type === 'toggle' ? (
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: Colors.textSecondary + '40', true: Colors.accent }}
              thumbColor={item.value ? Colors.surface : Colors.beige}
            />
          ) : (
            <TouchableOpacity 
              onPress={item.onPress}
              style={styles.arrowButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.buttonText}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.textSecondary + '30',
  },
  itemContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  itemLabel: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  itemDescription: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  arrowButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: Typography.h4,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
  },
});

