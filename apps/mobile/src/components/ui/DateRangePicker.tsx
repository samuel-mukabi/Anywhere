import React, { useState, useMemo, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Feather } from '@expo/vector-icons';

interface DateRangePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (start: string, end: string) => void;
  initialStart?: string | null;
  initialEnd?: string | null;
}

export function DateRangePicker({ isVisible, onClose, onSelect, initialStart, initialEnd }: DateRangePickerProps) {
  const [start, setStart] = useState<string | null>(initialStart || null);
  const [end, setEnd] = useState<string | null>(initialEnd || null);

  // Sync with initial values when modal opens
  useEffect(() => {
    if (isVisible) {
      setStart(initialStart || null);
      setEnd(initialEnd || null);
    }
  }, [isVisible, initialStart, initialEnd]);

  const markedDates = useMemo(() => {
    if (!start) return {};
    if (!end) {
      return {
        [start]: { startingDay: true, endingDay: true, color: Colors.terracotta, textColor: Colors.white },
      };
    }

    const marked: any = {};
    let current = new Date(start);
    const last = new Date(end);

    // Safety check to prevent infinite loops if dates are invalid
    if (isNaN(current.getTime()) || isNaN(last.getTime())) return {};

    while (current <= last) {
      const dateString = current.toISOString().split('T')[0];
      const isStart = dateString === start;
      const isEnd = dateString === end;

      marked[dateString] = {
        startingDay: isStart,
        endingDay: isEnd,
        color: Colors.terracotta,
        textColor: Colors.white,
        period: true,
      };

      current.setDate(current.getDate() + 1);
    }
    return marked;
  }, [start, end]);

  const handleDayPress = (day: any) => {
    if (!start || (start && end)) {
      setStart(day.dateString);
      setEnd(null);
    } else {
      if (day.dateString < start) {
        setStart(day.dateString);
        setEnd(null);
      } else if (day.dateString === start) {
        // Toggle off if clicking the same day
        setStart(null);
        setEnd(null);
      } else {
        setEnd(day.dateString);
      }
    }
  };

  const handleConfirm = () => {
    if (start && end) {
      onSelect(start, end);
      onClose();
    }
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Travel Dates</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={24} color={Colors.nearBlack} />
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWrapper}>
            <Calendar
              markingType={'period'}
              markedDates={markedDates}
              onDayPress={handleDayPress}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                calendarBackground: Colors.white,
                textSectionTitleColor: Colors.grey500,
                selectedDayBackgroundColor: Colors.terracotta,
                selectedDayTextColor: Colors.white,
                todayTextColor: Colors.terracotta,
                dayTextColor: Colors.nearBlack,
                textDisabledColor: Colors.grey300,
                dotColor: Colors.terracotta,
                monthTextColor: Colors.nearBlack,
                indicatorColor: Colors.terracotta,
                arrowColor: Colors.terracotta,
                textDayFontFamily: 'CeraPro-Medium',
                textMonthFontFamily: 'CeraPro-Bold',
                textDayHeaderFontFamily: 'CeraPro-Regular',
              }}
            />
          </View>

          <View style={styles.footer}>
            <View style={styles.rangeInfo}>
              <Text style={styles.rangeLabel}>SELECTED RANGE</Text>
              <Text style={styles.rangeValue}>
                {start ? `${start}${end ? ` — ${end}` : ' — ...'}` : 'Pick start date'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.confirmBtn, (!start || !end) && styles.confirmBtnDisabled]} 
              onPress={handleConfirm}
              disabled={!start || !end}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>Confirm Dates</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.nearBlackScrim,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey200,
  },
  title: {
    fontFamily: 'Astoria',
    fontSize: 22,
    color: Colors.nearBlack,
  },
  calendarWrapper: {
    padding: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rangeInfo: {
    flex: 1,
  },
  rangeLabel: {
    fontFamily: 'CeraPro-Bold',
    fontSize: 10,
    color: Colors.grey500,
    letterSpacing: 1,
    marginBottom: 2,
  },
  rangeValue: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 14,
    color: Colors.nearBlack,
  },
  confirmBtn: {
    backgroundColor: Colors.nearBlack,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.grey300,
  },
  confirmBtnText: {
    fontFamily: 'CeraPro-Bold',
    fontSize: 14,
    color: Colors.white,
  },
});
