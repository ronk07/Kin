import { Colors } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { Home, Settings, Users } from 'lucide-react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.textSecondary + '30',
          paddingBottom: 10,
          paddingTop: 10,
          height: 77,
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
          headerTintColor: Colors.text,
        headerTitleStyle: {
          fontFamily: 'Inter',
          fontWeight: '600',
        },
        headerShown: false, // Hide headers since pages have their own titles
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
