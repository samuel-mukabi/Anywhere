import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';

import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useAuthStore, selectIsPro } from '@/stores/authStore';

const MOCK_ROOMS = [
  { id: 'rm_x84', name: 'Alps Escapade', members: 4, budget: 3200 },
  { id: 'rm_p91', name: 'Tokyo 2026', members: 3, budget: 11500 },
];

export default function GroupTripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPro = useAuthStore(selectIsPro);

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%'], []);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    sheetRef.current?.close();
    // Simulate POST /rooms resolving routing layout
    const nextId = Math.random().toString(36).substring(7);
    router.push(`/group/${nextId}`);
  };

  if (!isPro) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xxl, paddingHorizontal: spacing.xl }]}>
        <StatusBar style="dark" />
        <Feather name="users" size={48} color={Colors.terracotta} style={{ marginBottom: spacing.md }} />
        <Text style={styles.upsellHeadline}>Sync Your Squad</Text>
        <Text style={styles.upsellSub}>
          Create private synchronization hubs. Map shared properties natively and lock down your budgets collectively using our real-time budget equalizer engine.
        </Text>
        
        <View style={styles.upsellCard}>
          <Text style={styles.upsellProBadge}>PRO FEATURE</Text>
          <Text style={styles.upsellTitle}>Upgrade to The Architect</Text>
          <Text style={styles.upsellDetails}>Access unlimited Room generation setups alongside exclusive cost-of-living constraints.</Text>
          <TouchableOpacity style={styles.upsellBtn} activeOpacity={0.8}>
            <Text style={styles.upsellBtnText}>Start free trial</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <Text style={styles.headerTitle}>Group sync</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={() => sheetRef.current?.expand()}>
          <Feather name="plus" size={24} color={Colors.terracotta} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MOCK_ROOMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.roomCard} 
            activeOpacity={0.7}
            onPress={() => router.push(`/group/${item.id}`)}
          >
            <View style={styles.roomHeaderRow}>
              <Text style={styles.roomName}>{item.name}</Text>
              <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
            </View>
            <View style={styles.roomMetaRow}>
              <View style={styles.metaChip}>
                <Feather name="users" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{item.members} members</Text>
              </View>
              <View style={styles.metaChip}>
                <Feather name="dollar-sign" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>${item.budget} shared</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No active group syncs yet</Text>
          </View>
        }
      />

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Create a new room</Text>
          <TextInput
            style={styles.sheetInput}
            placeholder="e.g. Kyoto Cherry Blossoms 2027"
            placeholderTextColor={Colors.textSecondary}
            value={newRoomName}
            onChangeText={setNewRoomName}
            autoFocus={false}
          />
          <TouchableOpacity 
            style={[styles.sheetCreateBtn, !newRoomName.trim() && { opacity: 0.5 }]} 
            activeOpacity={0.8}
            onPress={handleCreateRoom}
            disabled={!newRoomName.trim()}
          >
            <Text style={styles.sheetCreateBtnText}>Create room</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.parchment, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontFamily: 'Astoria', fontSize: 32, color: Colors.nearBlack },
  headerBtn: { padding: spacing.xs },
  
  listContent: { padding: spacing.lg },
  roomCard: { backgroundColor: Colors.parchment, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: Colors.border },
  roomHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  roomName: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack },
  roomMetaRow: { flexDirection: 'row', gap: spacing.md },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: Colors.border },
  metaText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.nearBlack },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: spacing.md },
  emptyText: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.textSecondary },

  upsellHeadline: { fontFamily: 'Astoria', fontSize: 36, color: Colors.nearBlack, marginBottom: spacing.sm },
  upsellSub: { fontFamily: 'CeraPro-Regular', fontSize: 16, color: Colors.textSecondary, lineHeight: 22, marginBottom: spacing.xxl },
  upsellCard: { backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.lg, borderWidth: 2, borderColor: Colors.terracotta },
  upsellProBadge: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: Colors.terracotta, letterSpacing: 1, marginBottom: spacing.sm },
  upsellTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginBottom: 8 },
  upsellDetails: { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: spacing.xl },
  upsellBtn: { backgroundColor: Colors.terracotta, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  upsellBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.white },

  sheetBackground: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: Colors.textSecondary, width: 40, height: 4 },
  sheetContent: { padding: spacing.xl },
  sheetTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginBottom: spacing.lg },
  sheetInput: { fontFamily: 'CeraPro-Medium', fontSize: 16, color: Colors.nearBlack, backgroundColor: Colors.parchment, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: spacing.md, marginBottom: spacing.xl },
  sheetCreateBtn: { backgroundColor: Colors.terracotta, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetCreateBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.white },
});
