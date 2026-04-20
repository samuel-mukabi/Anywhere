/**
 * Group room — app/group/[roomId].tsx
 * Full-screen stack route for a collaborative group trip room.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Card, Button } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const PLACEHOLDER_VOTES = [
  { id: 'v1', city: 'Lisbon',   votes: 3, selected: false },
  { id: 'v2', city: 'Bali',     votes: 2, selected: true  },
  { id: 'v3', city: 'Medellín', votes: 1, selected: false },
];

export default function GroupRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Nav header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.nearBlack} />
        </TouchableOpacity>
        <Text style={styles.title}>Room · {roomId}</Text>
        <TouchableOpacity style={styles.menuBtn}>
          <Feather name="more-horizontal" size={22} color={Colors.nearBlack} />
        </TouchableOpacity>
      </View>

      {/* Members row */}
      <View style={styles.memberRow}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={[styles.memberAvatar, { marginLeft: i > 0 ? -10 : 0 }]}>
            <Text style={styles.memberInitial}>{String.fromCharCode(65 + i)}</Text>
          </View>
        ))}
        <Text style={styles.memberCount}>4 members</Text>
      </View>

      {/* Destination votes */}
      <Text style={styles.sectionLabel}>Voting</Text>
      <FlatList
        data={PLACEHOLDER_VOTES}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card
            elevated
            style={[styles.voteCard, item.selected ? styles.voteCardSelected : null]}
          >
            <Text style={styles.voteCity}>{item.city}</Text>
            <View style={styles.voteRow}>
              <Feather name="thumbs-up" size={14} color={item.selected ? Colors.terracotta : Colors.grey400} />
              <Text style={[styles.voteCount, item.selected && styles.voteCountActive]}>
                {item.votes} votes
              </Text>
            </View>
          </Card>
        )}
      />

      <Button
        label="Suggest Destination"
        variant="terracotta"
        size="md"
        fullWidth
        onPress={() => {}}
        style={styles.suggestBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.parchment },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
  backBtn:      { padding: spacing.xs },
  menuBtn:      { padding: spacing.xs },
  title:        { fontFamily: 'Astoria', fontSize: 20, color: Colors.nearBlack },
  memberRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  memberAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.nearBlack, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.parchment },
  memberInitial:{ fontFamily: 'CeraPro-Bold', fontSize: 12, color: Colors.parchment },
  memberCount:  { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary, marginLeft: spacing.md },
  sectionLabel: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm, paddingHorizontal: spacing.xl },
  list:         { paddingHorizontal: spacing.xl },
  voteCard:     { marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voteCardSelected: { borderColor: Colors.terracotta, borderWidth: 1 },
  voteCity:     { fontFamily: 'Astoria', fontSize: 20, color: Colors.nearBlack },
  voteRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  voteCount:    { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary },
  voteCountActive: { color: Colors.terracotta, fontFamily: 'CeraPro-Medium' },
  suggestBtn:   { marginHorizontal: spacing.xl, marginTop: spacing.xl, marginBottom: 48 },
});
