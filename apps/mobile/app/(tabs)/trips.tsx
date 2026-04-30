import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Circle, Path } from 'react-native-svg';

import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';
import { useTripsStore } from '@/features/trips/trips-store';
import { DestinationResultCard } from '@/features/destination/destination-result-card';

const MOCK_BOOKINGS = [
  { id: 'b1', city: 'Lisbon', country: 'Portugal', dates: 'Jun 12 – Jun 19', totalPaid: 1450, orderId: 'ORD-DF-982' },
];

function EmptyGlobeIcon() {
  return (
    <Svg width="80" height="80" viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="45" fill="none" stroke={Colors.border} strokeWidth="2" />
      <Path d="M50 5 Q70 50 50 95" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M50 5 Q30 50 50 95" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M5 50 L95 50" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M15 25 L85 25" stroke={Colors.border} strokeWidth="2" fill="none" />
      <Path d="M15 75 L85 75" stroke={Colors.border} strokeWidth="2" fill="none" />
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
          <Feather name="trash-2" size={20} color={Colors.white} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const EmptySaved = () => (
    <View style={styles.emptyContainer}>
      <EmptyGlobeIcon />
      <Text style={styles.emptyTitle}>No saved destinations</Text>
      <Text style={styles.emptySub}>Search for a destination and save it here</Text>
      <TouchableOpacity onPress={() => router.navigate('/explore')} style={styles.exploreLink}>
        <Text style={styles.exploreLinkText}>Start exploring →</Text>
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

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <Text style={styles.headerTitle}>Trips</Text>

        {/* X-style underline tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('saved')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              Saved
            </Text>
            {activeTab === 'saved' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('bookings')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.tabTextActive]}>
              Bookings
            </Text>
            {activeTab === 'bookings' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>
      </View>

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
            <View style={styles.bookingRow}>
              <View style={styles.bookingMain}>
                <Text style={styles.bookingCity}>{item.city}</Text>
                <Text style={styles.bookingCountry}>{item.country.toUpperCase()}</Text>
                <View style={styles.bookingMeta}>
                  <Text style={styles.bookingMetaText}>{item.dates}</Text>
                  <Text style={styles.bookingMetaDot}>·</Text>
                  <Text style={styles.bookingMetaText}>#{item.orderId}</Text>
                </View>
              </View>
              <Text style={styles.bookingPrice}>${item.totalPaid.toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.parchment },

  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'Astoria',
    fontSize: 34,
    color: Colors.nearBlack,
    marginBottom: spacing.lg,
  },

  // X-style underline tabs
  tabRow: {
    flexDirection: 'row',
  },
  tabItem: {
    marginRight: spacing.xxl,
    paddingBottom: spacing.sm,
    position: 'relative',
  },
  tabText: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    fontFamily: 'CeraPro-Bold',
    color: Colors.nearBlack,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.terracotta,
    borderRadius: 1,
  },

  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  deleteAction: {
    backgroundColor: '#D15858',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },

  // Empty states
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'Astoria',
    fontSize: 22,
    color: Colors.nearBlack,
    marginTop: spacing.lg,
  },
  emptySub: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  exploreLink: {
    marginTop: spacing.md,
  },
  exploreLinkText: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 15,
    color: Colors.terracotta,
  },

  // Booking row — flat, no card
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  bookingMain: {
    gap: 3,
  },
  bookingCity: {
    fontFamily: 'Astoria',
    fontSize: 22,
    color: Colors.nearBlack,
  },
  bookingCountry: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.7,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  bookingMetaText: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bookingMetaDot: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  bookingPrice: {
    fontFamily: 'Astoria',
    fontSize: 22,
    color: Colors.nearBlack,
  },
});
