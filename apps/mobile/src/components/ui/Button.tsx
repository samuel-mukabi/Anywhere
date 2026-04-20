import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

type ButtonVariant = 'dark' | 'terracotta' | 'ghost';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label:       string;
  onPress:     () => void;
  variant?:    ButtonVariant;
  size?:       ButtonSize;
  loading?:    boolean;
  disabled?:   boolean;
  fullWidth?:  boolean;
  style?:      StyleProp<ViewStyle>;
  textStyle?:  StyleProp<TextStyle>;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  dark:       { bg: Colors.nearBlack,  text: Colors.parchment },
  terracotta: { bg: Colors.terracotta, text: Colors.white },
  ghost:      { bg: 'transparent',     text: Colors.nearBlack, border: Colors.nearBlack },
};

const sizeStyles: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number; height: number }> = {
  sm: { paddingH: spacing.md,  paddingV: spacing.xs,  fontSize: 13, height: 36 },
  md: { paddingH: spacing.lg,  paddingV: spacing.sm,  fontSize: 15, height: 48 },
  lg: { paddingH: spacing.xl,  paddingV: spacing.md,  fontSize: 16, height: 56 },
};

export function Button({
  label,
  onPress,
  variant    = 'dark',
  size       = 'md',
  loading    = false,
  disabled   = false,
  fullWidth  = false,
  style,
  textStyle,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    if (!isDisabled) onPress();
  }, [isDisabled, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor:  vStyle.bg,
          borderColor:      vStyle.border ?? 'transparent',
          borderWidth:      vStyle.border ? 1.5 : 0,
          paddingHorizontal: sStyle.paddingH,
          paddingVertical:  sStyle.paddingV,
          height:           sStyle.height,
          width:            fullWidth ? '100%' : undefined,
          opacity:          isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? Colors.nearBlack : Colors.parchment}
        />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color:    vStyle.text,
              fontSize: sStyle.fontSize,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   radii.full,
  },
  label: {
    fontFamily:    'CeraPro-Medium',
    letterSpacing: 0.3,
  },
});
