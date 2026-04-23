/**
 * AppHeader — src/components/AppHeader.tsx
 *
 * Persistent top-of-screen header used on all main tab screens.
 *
 * Left:  'Anywhere.' wordmark in Astoria
 * Right: Feather bell icon (notification) + circular avatar
 *
 * Props:
 *   showWordmark — toggle the wordmark (e.g. hide on search focus)
 *   onBellPress  — handler for the notification button
 *   onAvatarPress— handler for the avatar tap (typically → Profile)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore, selectUser } from '@/features/auth/auth-store';
import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';

interface AppHeaderProps {
  showWordmark?:  boolean;
  onBellPress?:   () => void;
  onAvatarPress?: () => void;
  style?:         ViewStyle;
}

export function AppHeader({
  showWordmark  = true,
  onBellPress,
  onAvatarPress,
  style,
}: AppHeaderProps) {
  const user   = useAuthStore(selectUser);
  const insets = useSafeAreaInsets();
  const initial = user?.name?.charAt(0).toUpperCase() ?? 'A';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.sm },
        style,
      ]}
    >
      {/* Left — wordmark */}
      <View style={styles.left}>
        {showWordmark && (
          <Text style={styles.wordmark} numberOfLines={1}>
            Anywhere.
          </Text>
        )}
      </View>

      {/* Right — icons */}
      <View style={styles.right}>
        {/* Bell */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onBellPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bell" size={20} color={Colors.nearBlack} />
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatar}
          onPress={onAvatarPress}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarInitial}>{initial}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   Colors.parchment,
    paddingHorizontal: spacing.xl,
    paddingBottom:     spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(40,36,39,0.08)',
    // Ensure it sits above any scroll content (Android shadow)
    elevation: 2,
    // iOS shadow
    shadowColor:   Colors.nearBlack,
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius:  4,
  },
  left: {
    flex: 1,
  },
  wordmark: {
    fontFamily: 'Astoria',
    fontSize:   26,
    color:      Colors.nearBlack,
    lineHeight: 32,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  avatar: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: Colors.terracotta,
    alignItems:      'center',
    justifyContent:  'center',
    marginLeft:      spacing.xs,
  },
  avatarInitial: {
    fontFamily: 'CeraPro-Bold',
    fontSize:   15,
    color:      Colors.white,
  },
});
