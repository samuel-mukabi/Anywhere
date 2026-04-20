/**
 * Tab navigator layout — app/(tabs)/_layout.tsx
 *
 * Custom tab bar: parchment background, no top border,
 * terracotta active icon + label, Feather icon set.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface TabIconProps {
  name:    FeatherName;
  color:   string;
  label:   string;
  focused: boolean;
}

function TabIcon({ name, color, label, focused }: TabIconProps) {
  return (
    <View style={styles.iconWrapper}>
      <Feather name={name} size={22} color={color} />
      <Text
        style={[
          styles.tabLabel,
          { color, fontFamily: focused ? 'CeraPro-Medium' : 'CeraPro-Regular' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle:  styles.tabBar,
        tabBarShowLabel: false,  // we render custom label inside icon component
        tabBarActiveTintColor:   Colors.terracotta,
        tabBarInactiveTintColor: Colors.grey400,
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="compass" color={color} label="Explore" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bookmark" color={color} label="Trips" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="users" color={color} label="Group" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={color} label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.nearBlack,
    borderTopWidth:  0,
    height:          Platform.OS === 'ios' ? 84 : 64,
    paddingBottom:   Platform.OS === 'ios' ? 24 : 8,
    paddingTop:      spacing.sm,
    // Remove default shadow/elevation
    elevation:       0,
    shadowOpacity:   0,
  },
  iconWrapper: {
    alignItems:  'center',
    gap:          4,
  },
  tabLabel: {
    fontSize:     10,
    letterSpacing: 0.3,
    marginTop:    1,
  },
});
