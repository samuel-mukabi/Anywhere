import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { Colors } from '@/core/theme/colors';
import { radii } from '@/core/theme/radii';

interface SkeletonProps {
  width?:   DimensionValue;
  height?:  DimensionValue;
  radius?:  number;
  style?:   ViewStyle;
}

export function Skeleton({
  width  = '100%',
  height = 16,
  radius = radii.sm,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue:         1,
          duration:        900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue:         0,
          duration:        900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

// ── Destination Card Skeleton Preset ──────────────────────────────────────────
export function DestinationCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      {/* Image placeholder */}
      <Skeleton width="100%" height={180} radius={radii.md} />
      <View style={styles.cardBody}>
        {/* City + country */}
        <Skeleton width="60%" height={18} style={styles.row} />
        <Skeleton width="40%" height={13} style={styles.row} />
        {/* Budget line */}
        <View style={styles.budgetRow}>
          <Skeleton width={80} height={13} />
          <Skeleton width={60} height={13} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.grey200,
  },
  cardSkeleton: {
    backgroundColor: Colors.card,
    borderRadius:    radii.lg,
    overflow:        'hidden',
    borderWidth:     0.5,
    borderColor:     'rgba(40,36,39,0.08)',
    marginBottom:    16,
  },
  cardBody: {
    padding: 12,
  },
  row: {
    marginBottom: 6,
  },
  budgetRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:      8,
  },
});
