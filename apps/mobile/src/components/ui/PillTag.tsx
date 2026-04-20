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
  label:      string;
  active:     boolean;
  onPress:    () => void;
  style?:     ViewStyle;
}

export function PillTag({ label, active, onPress, style }: PillTagProps) {
  const bgAnim   = useRef(new Animated.Value(active ? 1 : 0)).current;
  const prevActive = useRef(active);

  if (prevActive.current !== active) {
    prevActive.current = active;
    Animated.spring(bgAnim, {
      toValue:         active ? 1 : 0,
      useNativeDriver: false,
      damping:         18,
      stiffness:       200,
    }).start();
  }

  const backgroundColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.surface, Colors.nearBlack],
  });

  const borderColor = bgAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.border, Colors.nearBlack],
  });

  const textColor = bgAnim.interpolate({
    inputRange:  [0, 1],
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
}

export function PillGroup<T extends string>({
  options,
  selected,
  multiSelect = false,
  onChange,
  containerStyle,
}: PillGroupProps<T>) {
  const isActive = useCallback(
    (opt: T) =>
      multiSelect
        ? (selected as T[]).includes(opt)
        : selected === opt,
    [selected, multiSelect],
  );

  const handlePress = useCallback(
    (opt: T) => {
      if (multiSelect) {
        const s = selected as T[];
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
