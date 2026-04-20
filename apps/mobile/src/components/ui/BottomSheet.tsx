import React, { useRef, forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetHandle,
} from '@gorhom/bottom-sheet';
import { Colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

interface BottomSheetProps {
  children:     React.ReactNode;
  title?:       string;
  snapPoints?:  (string | number)[];
  initialIndex?: number;
  onClose?:     () => void;
}

export type BottomSheetRef = GorhomBottomSheet;

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      children,
      title,
      snapPoints  = ['40%', '70%', '95%'],
      initialIndex = 0,
      onClose,
    },
    ref,
  ) => {
    const memoSnaps = useMemo(() => snapPoints, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    const renderHandle = useCallback(
      () => (
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
        </View>
      ),
      [title],
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={initialIndex}
        snapPoints={memoSnaps}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        handleComponent={renderHandle}
        backgroundStyle={styles.background}
      >
        <BottomSheetView style={styles.content}>
          {children}
        </BottomSheetView>
      </GorhomBottomSheet>
    );
  },
);

BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.parchment,
    borderTopLeftRadius:  radii.xl,
    borderTopRightRadius: radii.xl,
  },
  handleContainer: {
    alignItems:      'center',
    paddingTop:      spacing.sm,
    paddingBottom:   spacing.md,
    borderTopLeftRadius:  radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: Colors.parchment,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    radii.full,
    backgroundColor: Colors.grey300,
    marginBottom:    spacing.sm,
  },
  title: {
    fontFamily:    'Astoria',
    fontSize:      18,
    color:         Colors.text,
    letterSpacing: -0.3,
  },
  content: {
    flex:            1,
    paddingHorizontal: spacing.lg,
    backgroundColor: Colors.parchment,
  },
});
