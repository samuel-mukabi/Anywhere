import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { DestinationResult } from '@/stores/searchStore';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useMapStore } from '@/stores/mapStore';

// Estimated row height for FlatList.getItemLayout (no actions variant)
export const RESULT_CARD_HEIGHT = 112; // 80px thumb + 16px padding*2
export const RESULT_CARD_HEIGHT_TRIPS = 160; // with actions row

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
      style={styles.cardContainer}
      activeOpacity={0.7}
      onPress={handlePress}
      disabled={actionsVariant === 'trips'}
    >
      <View style={styles.innerContent}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: destination.imageUrl || FALLBACK_IMAGE }}
            style={styles.thumbnail}
            contentFit="cover"
            // blurhash derived placeholder — backend pre-computes and stores in destination doc
            placeholder={destination.blurhash || 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH'}
            transition={200}
            cachePolicy="memory-disk"
          />
          {actionsVariant === 'explore' && rank && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{rank}</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.cityText} numberOfLines={1}>{destination.city}</Text>
          <Text style={styles.countryText} numberOfLines={1}>📍 {destination.country}</Text>

          <View style={styles.bottomRow}>
            <Text style={styles.priceText}>${destination.totalCost}</Text>
            <View style={[styles.climatePill, { backgroundColor: isPerfectMatch ? Colors.terracotta : Colors.textSecondary }]}>
              <Text style={styles.climateText}>{isPerfectMatch ? 'Perfect match' : 'Good climate'}</Text>
            </View>
          </View>
        </View>
      </View>

      {actionsVariant === 'trips' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={handleView}>
            <Text style={styles.actionBtnOutlineText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnFilled} onPress={() => {}}>
            <Text style={styles.actionBtnFilledText}>Book now</Text>
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
  cardContainer: {
    backgroundColor: Colors.parchment,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  innerContent: { flexDirection: 'row' },
  imageContainer: { position: 'relative' },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  rankBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.terracotta,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.parchment,
  },
  rankText: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: Colors.white },
  detailsContainer: { flex: 1, marginLeft: spacing.md, justifyContent: 'center' },
  cityText: { fontFamily: 'Astoria', fontSize: 20, color: Colors.nearBlack },
  countryText: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  priceText: { fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack },
  climatePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  climateText: { fontFamily: 'CeraPro-Bold', fontSize: 9, color: Colors.white, textTransform: 'uppercase' },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: spacing.sm,
  },
  actionBtnOutline: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center',
  },
  actionBtnOutlineText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.nearBlack },
  actionBtnFilled: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.terracotta, alignItems: 'center' },
  actionBtnFilledText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.white },
});
