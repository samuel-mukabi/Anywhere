import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { DestinationResult } from '@/features/search/search-store';
import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';
import { useMapStore } from '@/features/map/map-store';

export const RESULT_CARD_HEIGHT = 96;
export const RESULT_CARD_HEIGHT_TRIPS = 140;

interface Props {
  destination: DestinationResult;
  rank?: number;
  actionsVariant?: 'explore' | 'trips';
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05';

function DestinationResultCardInner({ destination, rank, actionsVariant = 'explore' }: Props) {
  const router = useRouter();
  const setSelected = useMapStore((s) => s.setSelected);
  const isPerfectMatch = destination.climateScore >= 80;

  const handlePress = useCallback(() => {
    setSelected(destination.id);
  }, [destination.id, setSelected]);

  const handleView = useCallback(() => {
    router.push(`/destination/${destination.id}`);
  }, [destination.id, router]);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.6}
      onPress={handlePress}
      disabled={actionsVariant === 'trips'}
    >
      <Image
        source={{ uri: destination.imageUrl || FALLBACK_IMAGE }}
        style={styles.thumbnail}
        contentFit="cover"
        placeholder={destination.blurhash || 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH'}
        transition={200}
        cachePolicy="memory-disk"
      />

      <View style={styles.content}>
        <View style={styles.topRow}>
          {rank != null && (
            <Text style={styles.rank}>{rank < 10 ? `0${rank}` : rank}</Text>
          )}
          <Text style={styles.city} numberOfLines={1}>{destination.city}</Text>
        </View>

        <Text style={styles.country} numberOfLines={1}>{destination.country}</Text>

        <View style={styles.bottomRow}>
          <Text style={styles.price}>${destination.totalCost.toLocaleString()}</Text>
          <View style={styles.matchRow}>
            <View style={[styles.dot, { backgroundColor: isPerfectMatch ? Colors.sage : Colors.grey300 }]} />
            <Text style={styles.matchLabel}>
              {isPerfectMatch ? 'Perfect match' : 'Good match'}
            </Text>
          </View>
        </View>
      </View>

      {actionsVariant === 'trips' && (
        <View style={styles.tripActions}>
          <TouchableOpacity onPress={handleView} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.actionLink}>View</Text>
          </TouchableOpacity>
          <Text style={styles.actionDivider}>·</Text>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.actionLink, { color: Colors.terracotta }]}>Book</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const DestinationResultCard = React.memo(DestinationResultCardInner, (prev, next) =>
  prev.destination.id === next.destination.id &&
  prev.destination.totalCost === next.destination.totalCost &&
  prev.rank === next.rank &&
  prev.actionsVariant === next.actionsVariant,
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  rank: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  city: {
    fontFamily: 'Astoria',
    fontSize: 20,
    color: Colors.nearBlack,
    flexShrink: 1,
  },
  country: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    fontFamily: 'Astoria',
    fontSize: 18,
    color: Colors.nearBlack,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  matchLabel: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  tripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: spacing.md,
  },
  actionLink: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 14,
    color: Colors.nearBlack,
  },
  actionDivider: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
