import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

interface CardProps {
  children:   React.ReactNode;
  onPress?:   () => void;
  style?:     StyleProp<ViewStyle>;
  elevated?:  boolean;
}

export function Card({ children, onPress, style, elevated = false }: CardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue:         0.97,
      useNativeDriver: true,
      damping:         20,
      stiffness:       300,
    }).start();
  }, [onPress, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue:         1,
      useNativeDriver: true,
      damping:         20,
      stiffness:       300,
    }).start();
  }, [onPress, scaleAnim]);

  const content = (
    <Animated.View
      style={[
        styles.card,
        elevated && styles.elevated,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius:    radii.lg,          // 12px
    borderWidth:     0.5,
    borderColor:     'rgba(40,36,39,0.08)',
    padding:         spacing.md,
    overflow:        'hidden',
  },
  elevated: {
    shadowColor:     Colors.nearBlack,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.07,
    shadowRadius:    12,
    elevation:       4,
  },
});
