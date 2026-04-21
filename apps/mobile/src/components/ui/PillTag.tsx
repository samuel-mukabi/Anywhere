import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

interface PillTagProps {
  label:       string;
  active:      boolean;
  onPress:     () => void;
  style?:      ViewStyle;
  activeColor?: string;
}

export function PillTag({ label, active, onPress, style, activeColor = Colors.nearBlack }: PillTagProps) {
  const bgAnim   = useRef(new Animated.Value(active ? 1 : 0)).current;
  const prevActive = useRef(active);

  if (prevActive.current !== active) {
    prevActive.current = active;
    Animated.spring(bgAnim, {
      toValue:         active ? 1 : 0,
      // Must be false: animating backgroundColor/borderColor (style props),
      // which the native animation driver does not support.
      useNativeDriver: false,
      damping:         18,
      stiffness:       200,
    }).start();
  }

  const backgroundColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.surface, activeColor],
  });

  const borderColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.border, activeColor],
  });

  const textColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    // If active color is bright/light maybe we need specific logic, but for sage/terracotta parchment text is good.
    outputRange: [Colors.textSecondary, Colors.parchment],
  });

  const handlePress = useCallback(onPress, [onPress]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={[styles.pill, { backgroundColor, borderColor }, style]}>
        <Animated.Text style={[styles.label, { color: textColor }]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

interface PillGroupProps<T extends string> {
  options:    T[];
  selected:   T | T[];
  multiSelect?: boolean;
  onChange:   (value: T | T[]) => void;
  containerStyle?: ViewStyle;
  activeColor?: string;
}

export function PillGroup<T extends string>({
  options,
  selected,
  multiSelect = false,
  onChange,
  containerStyle,
  activeColor,
}: PillGroupProps<T>) {
  const isActive = useCallback(
    (opt: T) =>
      multiSelect
        ? Array.isArray(selected) && selected.includes(opt)
        : selected === opt,
    [selected, multiSelect],
  );

  const handlePress = useCallback(
    (opt: T) => {
      if (multiSelect) {
        const s = Array.isArray(selected) ? selected : [];
        onChange(s.includes(opt) ? s.filter((x) => x !== opt) : [...s, opt]);
      } else {
        onChange(opt);
      }
    },
    [selected, multiSelect, onChange],
  );

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.group, containerStyle]}
    >
      {options.map((opt) => (
        <PillTag
          key={opt}
          label={opt}
          active={isActive(opt)}
          activeColor={activeColor}
          onPress={() => handlePress(opt)}
          style={styles.pillSpacing}
        />
      ))}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
    borderRadius:      radii.full,
    borderWidth:       1,
    alignItems:        'center',
    justifyContent:    'center',
  },
  label: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      13,
    letterSpacing: 0.2,
  },
  group: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  pillSpacing: {
    marginRight: spacing.sm,
  },
});
