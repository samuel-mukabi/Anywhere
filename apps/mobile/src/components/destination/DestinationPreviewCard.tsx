import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Feather } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { DestinationResult } from '@/stores/searchStore';
import { useTripsStore } from '@/stores/tripsStore';

interface Props {
  destination: DestinationResult;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05';

function DestinationPreviewCardInner({ destination }: Props) {
  const router = useRouter();
  const saveTrip = useTripsStore((s) => s.saveTrip);

  // Reanimated runs entirely on the UI thread (useNativeDriver: true equivalent)
  const translateY = useSharedValue(200);

  useEffect(() => {
    translateY.value = 200;
    translateY.value = withSpring(0, { damping: 15, stiffness: 150, mass: 0.8 });
  }, [destination.id, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Stable memoised calculations
  const isLive = !!destination.flightPrice;
  const flightCost = destination.flightPrice || 0;
  const estHotel = Math.floor((destination.totalCost - flightCost) * 0.75);
  const estFood = Math.floor((destination.totalCost - flightCost) * 0.25);
  const isPerfectMatch = destination.climateScore >= 80;

  const handleSave = useCallback(() => {
    saveTrip(destination);
    Toast.show({
      type: 'success',
      text1: 'Destination Saved',
      text2: `${destination.city} added to your trips.`,
      position: 'top',
      visibilityTime: 3000,
    });
  }, [destination, saveTrip]);

  const handleOpenDetails = useCallback(() => {
    router.push(`/destination/${destination.id}`);
  }, [destination.id, router]);

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <Image
        source={{ uri: destination.imageUrl || FALLBACK_IMAGE }}
        style={styles.heroImage}
        contentFit="cover"
        // blurhash stored on the destination document in MongoDB
        placeholder={destination.blurhash || 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH'}
        transition={300}
        cachePolicy="memory-disk"
      />

      <View style={styles.content}>
        {/* Header Block */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cityText}>{destination.city}</Text>
            <Text style={styles.countryText}>📍 {destination.country}</Text>
          </View>

          <View style={[styles.climatePill, { backgroundColor: isPerfectMatch ? Colors.terracotta : Colors.textSecondary }]}>
            <Text style={styles.climateText}>{isPerfectMatch ? 'Perfect match' : 'Good conditions'}</Text>
          </View>
        </View>

        {/* Pricing & Freshness */}
        <View style={styles.priceRow}>
          <Text style={styles.priceText}>${destination.totalCost}</Text>
          <View style={[styles.freshnessBadge, { backgroundColor: isLive ? Colors.sage : Colors.terracotta }]}>
            <Text style={styles.freshnessText}>{isLive ? 'Live' : 'Estimated'}</Text>
          </View>
        </View>

        {/* Stat Chips */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}><Text style={styles.statChipText}>✈️ ${flightCost}</Text></View>
          <View style={styles.statChip}><Text style={styles.statChipText}>🏨 ${estHotel}</Text></View>
          <View style={styles.statChip}><Text style={styles.statChipText}>🍽 ${estFood}</Text></View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7}>
            <Feather name="bookmark" size={18} color={Colors.nearBlack} />
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.detailsBtn} onPress={handleOpenDetails} activeOpacity={0.85}>
            <Text style={styles.detailsBtnText}>View full details →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export const DestinationPreviewCard = React.memo(DestinationPreviewCardInner, (prev, next) =>
  prev.destination.id === next.destination.id &&
  prev.destination.totalCost === next.destination.totalCost,
);

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.parchment,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    shadowColor: Colors.nearBlack,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  heroImage: { width: '100%', height: 150, backgroundColor: Colors.surface },
  content: { padding: spacing.lg },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.md,
  },
  cityText: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginBottom: 4 },
  countryText: {
    fontFamily: 'CeraPro-Medium', fontSize: 13,
    color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  climatePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  climateText: { fontFamily: 'CeraPro-Bold', fontSize: 10, color: Colors.white, textTransform: 'uppercase' },
  priceRow: {
    flexDirection: 'row', justifyContent: 'flex-start',
    alignItems: 'baseline', marginBottom: spacing.md, gap: spacing.sm,
  },
  priceText: { fontFamily: 'Astoria', fontSize: 28, color: Colors.nearBlack },
  freshnessBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  freshnessText: { fontFamily: 'CeraPro-Medium', fontSize: 11, color: Colors.white, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  statChip: {
    backgroundColor: Colors.surface, paddingHorizontal: 10,
    paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  statChipText: { fontFamily: 'CeraPro-Medium', fontSize: 12, color: Colors.nearBlack },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderRadius: 12, backgroundColor: 'transparent',
    borderWidth: 1, borderColor: Colors.border,
  },
  saveBtnText: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.nearBlack },
  detailsBtn: {
    flex: 1, backgroundColor: Colors.nearBlack,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
  },
  detailsBtnText: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.parchment },
});
