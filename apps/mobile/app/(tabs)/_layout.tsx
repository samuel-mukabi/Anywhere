/**
 * Tab navigator layout — app/(tabs)/_layout.tsx
 *
 * Custom tab bar: parchment background, no top border,
 * terracotta active icon and label, Feather icon set.
 */

import React from 'react';
import {Tabs} from 'expo-router';
import {Platform, StyleSheet, View, Text} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {Colors} from '@/core/theme/colors';
import {spacing} from '@/core/theme/spacing';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface TabIconProps {
    name: FeatherName;
    color: string;
    label: string;
    focused: boolean;
}

function TabIcon({name, color, label, focused}: TabIconProps) {
    return (
        <View style={styles.iconWrapper}>
            <Feather name={name} size={26} color={color}/>
            <Text
                style={[
                    styles.tabLabel,
                    {color, fontFamily: focused ? 'CeraPro-Medium' : 'CeraPro-Regular'},
                ]}
                numberOfLines={2}
            >
                {label}
            </Text>
        </View>
    );
}

const TAB_SCREEN_OPTIONS = {
    headerShown: false,
    tabBarShowLabel: false,
    tabBarActiveTintColor: Colors.terracotta,
    tabBarInactiveTintColor: Colors.grey400,
};

export default function TabsLayout() {
    const screenOptions = React.useMemo(() => ({
        ...TAB_SCREEN_OPTIONS,
        tabBarStyle: styles.tabBar,
    }), []);

    return (
        <Tabs screenOptions={screenOptions}>

            <Tabs.Screen
                name="explore"
                options={{
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon name="compass" color={color} label="Explore" focused={focused}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="trips"
                options={{
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon name="bookmark" color={color} label="Trips" focused={focused}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="group"
                options={{
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon name="users" color={color} label="Groups" focused={focused}/>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({color, focused}) => (
                        <TabIcon name="user" color={color} label="Profile" focused={focused}/>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.nearBlack,
        borderTopWidth: 0,
        height:          Platform.OS === 'ios' ? 92 : 72,
        paddingBottom:   Platform.OS === 'ios' ? 28 : 12,
        paddingTop: spacing.md,
        // Remove default shadow/elevation
        elevation: 0,
        shadowOpacity: 0,
    },
    iconWrapper: {
        alignItems: 'center',
        gap: 2,
        width: 70, // Ensure enough width for labels
    },
    tabLabel: {
        fontSize: 12,
        letterSpacing: 0.2,
        marginTop: 0,
        textAlign: 'center',
        lineHeight: 14,
    },
});
