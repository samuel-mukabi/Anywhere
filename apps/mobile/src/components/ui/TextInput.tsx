import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?:          string;
  error?:          string;
  hint?:           string;
  secureTextEntry?: boolean;
  /** Optional icon/element rendered on the right inside the input container */
  rightIcon?:      React.ReactNode;
}

export function TextInput({
  label,
  error,
  hint,
  secureTextEntry = false,
  rightIcon,
  ...props
}: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      // Must be false: animating borderColor (a layout/style prop),
      // which is not supported by the native animation driver.
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false, // same reason — color interpolation
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [Colors.border, Colors.terracotta],
  });

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, error ? styles.labelError : null]}>
          {label}
        </Text>
      ) : null}

      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor },
          error ? styles.inputError : null,
        ]}
      >
        <RNTextInput
          {...props}
          secureTextEntry={secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={Colors.grey400}
          style={[styles.input, rightIcon ? styles.inputWithIcon : null]}
        />
        {rightIcon && (
          <View style={styles.rightIconContainer}>
            {rightIcon}
          </View>
        )}
      </Animated.View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      12,
    color:         Colors.text,
    marginBottom:  spacing.xs,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  labelError: {
    color: Colors.error,
  },
  inputContainer: {
    borderWidth:     1,
    borderRadius:    radii.md,
    backgroundColor: Colors.surfaceElevated,
    flexDirection:   'row',
    alignItems:      'center',
    overflow:        'hidden',
  },
  input: {
    flex:              1,
    fontFamily:        'CeraPro-Regular',
    fontSize:          15,
    color:             Colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    height:            48,
  },
  inputWithIcon: {
    paddingRight: 0,
  },
  rightIconContainer: {
    paddingRight: spacing.md,
    paddingLeft:  spacing.xs,
    height:       48,
    alignItems:   'center',
    justifyContent: 'center',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontFamily: 'CeraPro-Regular',
    fontSize:   12,
    color:      Colors.error,
    marginTop:  spacing.xs,
  },
  hintText: {
    fontFamily: 'CeraPro-Regular',
    fontSize:   12,
    color:      Colors.textSecondary,
    marginTop:  spacing.xs,
  },
});
