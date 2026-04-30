import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/core/theme/colors';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, color, focused }: { name: FeatherName; color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      <Feather name={name} size={24} color={color} />
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.nearBlack,
        tabBarInactiveTintColor: Colors.grey400,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="compass" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bookmark" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="users" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.parchment,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  iconWrapper: {
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.terracotta,
  },
});
