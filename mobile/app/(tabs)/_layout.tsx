import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Compass, Map, Users, MessageSquare, User } from 'lucide-react-native';
import { COLORS } from '../../src/theme';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          height: Platform.OS === 'ios' ? 88 : 76,
          paddingBottom: Platform.OS === 'ios' ? 28 : 14,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarBackground: () => (
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
        },
        // Show labels only when active for a modern minimal look with 6 tabs
        tabBarShowLabel: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color }) => <Compass size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orientation"
        options={{
          title: 'Định hướng',
          tabBarIcon: ({ color }) => <Map size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mentor"
        options={{
          title: 'Mentor',
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Cộng đồng',
          tabBarIcon: ({ color }) => <MessageSquare size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}


