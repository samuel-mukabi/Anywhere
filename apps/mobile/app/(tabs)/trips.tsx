/**
 * Trips tab — app/(tabs)/trips.tsx
 * Saved trips list (shell — populated from API in later sprint).
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Trip = { id: string; city: string; dates: string; status: 'planning' | 'booked' };

const PLACEHOLDER_TRIPS: Trip[] = [
  { id: '1', city: 'Lisbon',    dates: 'Jun 12 – Jun 19', status: 'booked' },
  { id: '2', city: 'Medellín',  dates: 'Aug 5  – Aug 15', status: 'planning' },
];

export default function TripsScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Your Trips</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Feather name="plus" size={22} color={Colors.nearBlack} />
        </TouchableOpacity>
      </View>

      {PLACEHOLDER_TRIPS.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="map" size={48} color={Colors.grey300} />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyText}>Search destinations and save them here.</Text>
        </View>
      ) : (
        <FlatList
          data={PLACEHOLDER_TRIPS}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card elevated style={styles.card}>
              <Text style={styles.cardCity}>{item.city}</Text>
              <Text style={styles.cardDates}>{item.dates}</Text>
              <View style={[styles.statusBadge, item.status === 'booked' ? styles.statusBooked : styles.statusPlanning]}>
                <Text style={styles.statusLabel}>{item.status}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.parchment },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
  title:          { fontFamily: 'Astoria', fontSize: 28, color: Colors.nearBlack },
  addBtn:         { padding: spacing.sm },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyTitle:     { fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack },
  emptyText:      { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  list:           { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  card:           { marginBottom: spacing.md },
  cardCity:       { fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack },
  cardDates:      { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  statusBadge:    { alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 99 },
  statusBooked:   { backgroundColor: 'rgba(74,140,92,0.12)' },
  statusPlanning: { backgroundColor: 'rgba(196,113,58,0.12)' },
  statusLabel:    { fontFamily: 'CeraPro-Medium', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: Colors.nearBlack },
});
