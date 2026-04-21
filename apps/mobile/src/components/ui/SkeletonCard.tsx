import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export function SkeletonCard() {
  const opacities = useSharedValue(0.3);

  useEffect(() => {
    opacities.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacities]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacities.value,
  }));

  return (
    <View style={styles.cardContainer}>
      <Animated.View style={[styles.imageSkeleton, animatedStyle]} />
      <View style={styles.detailsContainer}>
        <Animated.View style={[styles.titleSkeleton, animatedStyle]} />
        <Animated.View style={[styles.subtitleSkeleton, animatedStyle]} />
        <View style={styles.bottomRow}>
          <Animated.View style={[styles.priceSkeleton, animatedStyle]} />
          <Animated.View style={[styles.pillSkeleton, animatedStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.parchment,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  imageSkeleton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  titleSkeleton: {
    height: 20,
    width: '70%',
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitleSkeleton: {
    height: 12,
    width: '40%',
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  priceSkeleton: {
    height: 24,
    width: '30%',
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  pillSkeleton: {
    height: 20,
    width: '25%',
    backgroundColor: Colors.border,
    borderRadius: 8,
  },
});
