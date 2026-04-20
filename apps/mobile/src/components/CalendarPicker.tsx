/**
 * CalendarPicker
 *
 * Full-featured date range picker built on react-native-calendars CalendarList.
 * Wrapped inside the reusable BottomSheet component.
 *
 * Props:
 *   onSelect(startDate, endDate) — called when user confirms a selection
 *   minDate  — earliest selectable date (defaults to today)
 *   maxDate  — latest selectable date (defaults to +12 months from today)
 *
 * Usage:
 *   const sheetRef = useRef<BottomSheetRef>(null);
 *   ...
 *   <CalendarPicker
 *     ref={sheetRef}
 *     onSelect={(start, end) => console.log(start, end)}
 *   />
 *   // open:
 *   sheetRef.current?.expand();
 */

import React, {
  forwardRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarList, DateData } from 'react-native-calendars';
import { BottomSheet, BottomSheetRef, Button } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Build the `markedDates` map for CalendarList.
 * - Start/End: solid terracotta fill with white text
 * - In-between: translucent terracotta band
 */
function buildMarkedDates(
  start: string | null,
  end: string | null,
): Record<string, object> {
  if (!start) return {};

  const startDateStyle = {
    startingDay:       true,
    color:             Colors.terracotta,
    textColor:         Colors.white,
    selected:          true,
    selectedColor:     Colors.terracotta,
  };

  if (!end || start === end) {
    return { [start]: startDateStyle };
  }

  const marks: Record<string, object> = {};
  marks[start] = startDateStyle;
  marks[end]   = {
    endingDay:         true,
    color:             Colors.terracotta,
    textColor:         Colors.white,
    selected:          true,
    selectedColor:     Colors.terracotta,
  };

  // Fill intermediate days
  let cursor = addDays(new Date(start), 1);
  const endDate = new Date(end);
  while (cursor < endDate) {
    marks[toISO(cursor)] = {
      color:     'rgba(196, 113, 58, 0.15)',
      textColor: Colors.nearBlack,
    };
    cursor = addDays(cursor, 1);
  }

  return marks;
}

// ─── Calendar theme ───────────────────────────────────────────────────────────

const calendarTheme = {
  calendarBackground:          Colors.parchment,
  dayTextColor:                Colors.nearBlack,
  textDisabledColor:           Colors.grey300,
  todayTextColor:              Colors.terracotta,
  selectedDayBackgroundColor:  Colors.terracotta,
  selectedDayTextColor:        Colors.white,
  arrowColor:                  Colors.terracotta,
  monthTextColor:              Colors.nearBlack,
  indicatorColor:              Colors.terracotta,
  textDayFontFamily:           'CeraPro-Regular',
  textMonthFontFamily:         'CeraPro-Bold',
  textDayHeaderFontFamily:     'CeraPro-Medium',
  textDayFontSize:             14,
  textMonthFontSize:           15,
  textDayHeaderFontSize:       12,
  'stylesheet.calendar.header': {
    week: {
      marginTop:       6,
      flexDirection:   'row',
      justifyContent:  'space-between',
    },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface CalendarPickerProps {
  onSelect:  (startDate: string, endDate: string) => void;
  minDate?:  string;
  maxDate?:  string;
  onClose?:  () => void;
}

export type CalendarPickerRef = BottomSheetRef;

export const CalendarPicker = forwardRef<CalendarPickerRef, CalendarPickerProps>(
  (
    {
      onSelect,
      minDate = toISO(new Date()),
      maxDate = toISO(addMonths(new Date(), 12)),
      onClose,
    },
    ref,
  ) => {
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate,   setEndDate]   = useState<string | null>(null);
    const [selecting, setSelecting] = useState<'start' | 'end'>('start');

    const markedDates = useMemo(
      () => buildMarkedDates(startDate, endDate),
      [startDate, endDate],
    );

    const handleDayPress = useCallback((day: DateData) => {
      const iso = day.dateString;

      if (selecting === 'start') {
        setStartDate(iso);
        setEndDate(null);
        setSelecting('end');
        return;
      }

      // Second tap — ensure end ≥ start
      if (startDate && iso < startDate) {
        // Tapped before start: swap
        setEndDate(startDate);
        setStartDate(iso);
      } else {
        setEndDate(iso);
      }
      setSelecting('start');
    }, [selecting, startDate]);

    const handleClear = useCallback(() => {
      setStartDate(null);
      setEndDate(null);
      setSelecting('start');
    }, []);

    const handleConfirm = useCallback(() => {
      if (startDate && endDate) {
        onSelect(startDate, endDate);
        (ref as React.RefObject<BottomSheetRef>)?.current?.close();
      }
    }, [startDate, endDate, onSelect, ref]);

    const selectionLabel = useMemo(() => {
      if (!startDate) return 'Select departure date';
      if (!endDate)   return 'Now select return date';
      return `${startDate}  →  ${endDate}`;
    }, [startDate, endDate]);

    return (
      <BottomSheet
        ref={ref}
        title="Select Dates"
        snapPoints={['55%', '80%', '95%']}
        initialIndex={1}
        onClose={onClose}
      >
        {/* Selection hint */}
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>{selectionLabel}</Text>
        </View>

        <CalendarList
          markingType="period"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          minDate={minDate}
          maxDate={maxDate}
          pastScrollRange={0}
          futureScrollRange={12}
          scrollEnabled
          showScrollIndicator={false}
          theme={calendarTheme}
          style={styles.calendar}
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearLabel}>Clear dates</Text>
          </TouchableOpacity>

          <Button
            label="Confirm"
            variant="terracotta"
            size="md"
            disabled={!startDate || !endDate}
            onPress={handleConfirm}
            style={styles.confirmButton}
          />
        </View>
      </BottomSheet>
    );
  },
);

CalendarPicker.displayName = 'CalendarPicker';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hintRow: {
    alignItems:     'center',
    paddingVertical: spacing.sm,
    marginBottom:   spacing.xs,
  },
  hintText: {
    fontFamily:  'CeraPro-Regular',
    fontSize:    13,
    color:       Colors.textSecondary,
    letterSpacing: 0.2,
  },
  calendar: {
    backgroundColor: Colors.parchment,
  },
  actions: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingTop:      spacing.md,
    paddingBottom:   spacing.lg,
    borderTopWidth:  0.5,
    borderTopColor:  Colors.border,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderWidth:       1,
    borderColor:       Colors.border,
    borderRadius:      radii.full,
  },
  clearLabel: {
    fontFamily:  'CeraPro-Medium',
    fontSize:    14,
    color:       Colors.textSecondary,
  },
  confirmButton: {
    flex:       1,
    marginLeft: spacing.md,
  },
});
