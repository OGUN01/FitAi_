/**
 * WeekDaySelector Component
 * Horizontal day picker for selecting days of the week
 * Clean, modern design with active state indicator
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';

interface DayInfo {
  key: string;
  label: string;
  shortLabel: string;
  date: number;
  isToday: boolean;
  hasMeals: boolean;
  mealsCount: number;
}

interface WeekDaySelectorProps {
  selectedDay: string;
  onDaySelect: (day: string) => void;
  mealsByDay?: Record<string, number>; // { monday: 3, tuesday: 2, ... }
}

export const WeekDaySelector: React.FC<WeekDaySelectorProps> = ({
  selectedDay,
  onDaySelect,
  mealsByDay = {},
}) => {
  // Generate week days
  const weekDays = useMemo((): DayInfo[] => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday
    const days: DayInfo[] = [];
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const dayIndex = i;
      const dayKey = dayNames[dayIndex];
      const isToday = dayIndex === currentDayOfWeek;
      
      // Calculate the date for this day of the week
      const diff = dayIndex - currentDayOfWeek;
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() + diff);
      
      days.push({
        key: dayKey,
        label: dayNames[dayIndex].charAt(0).toUpperCase() + dayNames[dayIndex].slice(1),
        shortLabel: shortNames[dayIndex],
        date: dayDate.getDate(),
        isToday,
        hasMeals: (mealsByDay[dayKey] || 0) > 0,
        mealsCount: mealsByDay[dayKey] || 0,
      });
    }
    
    return days;
  }, [mealsByDay]);

  // Find today for auto-scroll
  const todayIndex = useMemo(() => {
    return weekDays.findIndex(d => d.isToday);
  }, [weekDays]);

  return (
    <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentOffset={{ x: Math.max(0, (todayIndex - 1) * (rw(56) + ResponsiveTheme.spacing.sm)), y: 0 }}
      >
        {weekDays.map((day, index) => {
          const isSelected = selectedDay === day.key;
          const isPast = !day.isToday && index < todayIndex;
          
          return (
            <AnimatedPressable
              key={day.key}
              onPress={() => onDaySelect(day.key)}
              scaleValue={0.92}
              hapticFeedback={true}
              hapticType="light"
              style={[
                styles.dayItem,
                isSelected && styles.dayItemSelected,
                day.isToday && !isSelected && styles.dayItemToday,
              ].filter(Boolean) as ViewStyle[]}
            >
              <Text style={[
                styles.dayLabel,
                isSelected && styles.dayLabelSelected,
                isPast && !isSelected && styles.dayLabelPast,
              ]}>
                {day.shortLabel}
              </Text>
              <Text style={[
                styles.dayDate,
                isSelected && styles.dayDateSelected,
                isPast && !isSelected && styles.dayDatePast,
              ]}>
                {day.date}
              </Text>
              
              {/* Meal indicator */}
              {day.hasMeals && (
                <View style={[
                  styles.mealIndicator,
                  isSelected && styles.mealIndicatorSelected,
                ]}>
                  <Text style={[
                    styles.mealCount,
                    isSelected && styles.mealCountSelected,
                  ]}>
                    {day.mealsCount}
                  </Text>
                </View>
              )}
              
              {/* Today indicator dot */}
              {day.isToday && !isSelected && (
                <View style={styles.todayDot} />
              )}
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.sm,
  },
  dayItem: {
    width: rw(56),
    height: rh(80),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayItemSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  dayItemToday: {
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1.5,
  },
  dayLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 4,
  },
  dayLabelSelected: {
    color: ResponsiveTheme.colors.white,
  },
  dayLabelPast: {
    color: 'rgba(255,255,255,0.3)',
  },
  dayDate: {
    fontSize: rf(18),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  dayDateSelected: {
    color: ResponsiveTheme.colors.white,
  },
  dayDatePast: {
    color: 'rgba(255,255,255,0.4)',
  },
  mealIndicator: {
    position: 'absolute',
    bottom: rh(6),
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mealIndicatorSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  mealCount: {
    fontSize: rf(9),
    fontWeight: '600',
    color: ResponsiveTheme.colors.primary,
  },
  mealCountSelected: {
    color: ResponsiveTheme.colors.white,
  },
  todayDot: {
    position: 'absolute',
    top: rh(6),
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
    backgroundColor: ResponsiveTheme.colors.primary,
  },
});

export default WeekDaySelector;

