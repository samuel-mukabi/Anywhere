import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useTripsStore } from '@/stores/tripsStore';
import { DestinationResultCard } from '@/components/destination/DestinationResultCard';

// Simulated Bookings Payload
const MOCK_BOOKINGS = [
  { id: 'b1', city: 'Lisbon', country: 'Portugal', dates: 'Jun 12 – Jun 19', totalPaid: 1450, orderId: 'ORD-DF-982' },
];

function EmptyGlobeIcon() {
  return (
    <Svg width="100" height="100" viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="45" fill={Colors.surface} stroke={Colors.border} strokeWidth="2" />
      <Path d="M50 5 Q70 50 50 95" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M50 5 Q30 50 50 95" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M5 50 L95 50" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M15 25 L85 25" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M15 75 L85 75" stroke={Colors.border} strokeWidth="2" fill="none" />
      {/* Pin */}
      <Circle cx="50" cy="30" r="8" fill={Colors.terracotta} />
      <Path d="M50 38 L50 55" stroke={Colors.terracotta} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'saved' | 'bookings'>('saved');
  const savedTrips = useTripsStore((s) => s.savedTrips);
  const removeTrip = useTripsStore((s) => s.removeTrip);

  const renderRightActions = (progress: any, dragX: any, id: string) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => removeTrip(id)} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Feather name="trash-2" size={24} color={Colors.white} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const EmptySaved = () => (
    <View style={styles.emptyContainer}>
      <EmptyGlobeIcon />
      <Text style={styles.emptyTitle}>No saved destinations yet</Text>
      <Text style={styles.emptySub}>Search for a destination and save it here</Text>
      <TouchableOpacity style={styles.exploreBtn} onPress={() => router.navigate('/explore')}>
        <Text style={styles.exploreBtnText}>Start exploring</Text>
      </TouchableOpacity>
    </View>
  );

  const EmptyBookings = () => (
    <View style={styles.emptyContainer}>
      <EmptyGlobeIcon />
      <Text style={styles.emptyTitle}>No past bookings</Text>
      <Text style={styles.emptySub}>Your booked trips will appear here</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      
      {/* Custom Header Tab Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <Text style={styles.headerTitle}>Trips</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]} 
            onPress={() => setActiveTab('saved')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bookings' && styles.activeTab]} 
            onPress={() => setActiveTab('bookings')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body */}
      {activeTab === 'saved' ? (
        <FlatList
          data={savedTrips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptySaved />}
          renderItem={({ item }) => (
            <Swipeable 
              renderRightActions={(prog, drag) => renderRightActions(prog, drag, item.id)}
              overshootRight={false}
            >
              <DestinationResultCard destination={item} actionsVariant="trips" />
            </Swipeable>
          )}
        />
      ) : (
        <FlatList
          data={MOCK_BOOKINGS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyBookings />}
          renderItem={({ item }) => (
            <View style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingCity}>{item.city}, {item.country}</Text>
                <Text style={styles.bookingPrice}>${item.totalPaid}</Text>
              </View>
              <View style={styles.bookingMetaRow}>
                <Feather name="calendar" size={14} color={Colors.textSecondary} />
                <Text style={styles.bookingMetaText}>{item.dates}</Text>
              </View>
              <View style={[styles.bookingMetaRow, { marginTop: spacing.xs }]}>
                <Feather name="hash" size={14} color={Colors.textSecondary} />
                <Text style={styles.bookingMetaText}>ID: {item.orderId}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, backgroundColor: Colors.parchment, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontFamily: 'Astoria', fontSize: 32, color: Colors.nearBlack, marginBottom: spacing.md },
  
  tabContainer: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: Colors.border },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
  activeTab: { backgroundColor: Colors.nearBlack },
  tabText: { fontFamily: 'CeraPro-Medium', fontSize: 14, color: Colors.textSecondary },
  activeTabText: { color: Colors.white },

  listContent: { padding: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  
  deleteAction: {
    backgroundColor: '#D15858',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: spacing.md, 
  },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: 40 },
  emptyTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginTop: spacing.md },
  emptySub: { fontFamily: 'CeraPro-Medium', fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  exploreBtn: { marginTop: spacing.lg, backgroundColor: Colors.terracotta, paddingHorizontal: spacing.xl, paddingVertical: 14, borderRadius: 12 },
  exploreBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.white },

  bookingCard: {
    backgroundColor: Colors.parchment, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  bookingCity: { fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack },
  bookingPrice: { fontFamily: 'Astoria', fontSize: 22, color: Colors.terracotta },
  bookingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookingMetaText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.textSecondary },
});
