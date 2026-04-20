/**
 * Profile tab — app/(tabs)/profile.tsx
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Card } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const AUTH_TOKEN_KEY = 'anywhere_auth_token';

interface MenuRowProps { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void }
function MenuRow({ icon, label, onPress }: MenuRowProps) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Feather name={icon} size={18} color={Colors.nearBlack} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Feather name="chevron-right" size={16} color={Colors.grey300} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const handleLogout = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Avatar placeholder */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>S</Text>
        </View>
        <View>
          <Text style={styles.name}>Samuel Mukabi</Text>
          <Text style={styles.email}>samuel@anywhere.travel</Text>
        </View>
      </View>

      {/* Menu */}
      <Card style={styles.menuCard}>
        <MenuRow icon="settings"    label="Preferences"       onPress={() => {}} />
        <MenuRow icon="credit-card" label="Subscription & billing" onPress={() => {}} />
        <MenuRow icon="bell"        label="Notifications"     onPress={() => {}} />
        <MenuRow icon="shield"      label="Privacy & security" onPress={() => {}} />
        <MenuRow icon="help-circle" label="Help & support"    onPress={() => {}} />
      </Card>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutLabel}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.parchment, paddingHorizontal: spacing.xl },
  header:        { paddingTop: 60, paddingBottom: spacing.lg },
  title:         { fontFamily: 'Astoria', fontSize: 28, color: Colors.nearBlack },
  avatarRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  avatar:        { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.terracotta, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Astoria', fontSize: 24, color: Colors.white },
  name:          { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.nearBlack },
  email:         { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  menuCard:      { gap: spacing.xs },
  menuRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  menuLabel:     { flex: 1, fontFamily: 'CeraPro-Regular', fontSize: 15, color: Colors.nearBlack },
  logoutBtn:     { marginTop: spacing.xl, alignItems: 'center', paddingVertical: spacing.md },
  logoutLabel:   { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.error },
});
