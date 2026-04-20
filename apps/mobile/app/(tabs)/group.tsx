/**
 * Group tab — app/(tabs)/group.tsx
 * Group travel rooms — Pro feature gated screen (shell).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const PLACEHOLDER_ROOMS = [
  { id: 'r1', name: 'Summer 2025 Squad', members: 4 },
  { id: 'r2', name: 'Work Offsite',       members: 8 },
];

export default function GroupScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Group Trips</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={22} color={Colors.nearBlack} />
        </TouchableOpacity>
      </View>

      {/* Pro badge */}
      <View style={styles.proBadge}>
        <Feather name="zap" size={12} color={Colors.terracotta} />
        <Text style={styles.proLabel}>Pro feature</Text>
      </View>

      {PLACEHOLDER_ROOMS.map((room) => (
        <TouchableOpacity
          key={room.id}
          onPress={() => router.push(`/group/${room.id}`)}
          style={styles.cardWrapper}
        >
          <Card elevated>
            <Text style={styles.roomName}>{room.name}</Text>
            <View style={styles.memberRow}>
              <Feather name="users" size={13} color={Colors.textSecondary} />
              <Text style={styles.memberCount}>{room.members} members</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      <Button
        label="Create a Room"
        variant="ghost"
        size="md"
        onPress={() => {}}
        style={styles.createBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.parchment, paddingHorizontal: spacing.xl },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: spacing.md },
  title:       { fontFamily: 'Astoria', fontSize: 28, color: Colors.nearBlack },
  addBtn:      { padding: spacing.sm },
  proBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
  proLabel:    { fontFamily: 'CeraPro-Medium', fontSize: 11, color: Colors.terracotta, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardWrapper: { marginBottom: spacing.md },
  roomName:    { fontFamily: 'Astoria', fontSize: 20, color: Colors.nearBlack },
  memberRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  memberCount: { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary },
  createBtn:   { marginTop: spacing.lg },
});
