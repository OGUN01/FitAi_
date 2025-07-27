import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { THEME } from '../ui';

export interface DayInfo {
  dayName: string;
  dayNumber: number;
  date: string;
  isToday: boolean;
  hasWorkout: boolean;
  isCompleted: boolean;
  isRestDay: boolean;
}

interface WeeklyCalendarProps {
  selectedDay: string;
  onDaySelect: (day: string) => void;
  weekOffset?: number;
  onWeekChange?: (offset: number) => void;
  workoutData?: Record<string, { hasWorkout: boolean; isCompleted: boolean; isRestDay: boolean }>;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  selectedDay,
  onDaySelect,
  weekOffset = 0,
  onWeekChange,
  workoutData = {},
}) => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(weekOffset);

  const getDaysOfWeek = (weekOffset: number): DayInfo[] => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);
    
    // Calculate Monday of current week + offset
    monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7));

    const days: DayInfo[] = [];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const dayName = dayNames[i];
      const dayData = workoutData[dayName] || { hasWorkout: false, isCompleted: false, isRestDay: true };
      
      const isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      days.push({
        dayName: dayName,
        dayNumber: date.getDate(),
        date: date.toISOString().split('T')[0],
        isToday,
        hasWorkout: dayData.hasWorkout,
        isCompleted: dayData.isCompleted,
        isRestDay: dayData.isRestDay,
      });
    }

    return days;
  };

  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newOffset = direction === 'prev' ? currentWeekOffset - 1 : currentWeekOffset + 1;
    setCurrentWeekOffset(newOffset);
    onWeekChange?.(newOffset);
  };

  const getWeekDateRange = (days: DayInfo[]) => {
    if (days.length === 0) return '';
    const firstDay = new Date(days[0].date);
    const lastDay = new Date(days[6].date);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${formatDate(firstDay)} - ${lastDay.getDate()}`;
    } else {
      return `${formatDate(firstDay)} - ${formatDate(lastDay)}`;
    }
  };

  const days = getDaysOfWeek(currentWeekOffset);

  return (
    <View style={styles.container}>
      {/* Week Navigation Header */}
      <View style={styles.weekHeader}>
        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={() => handleWeekChange('prev')}
        >
          <Text style={styles.weekNavText}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.weekInfo}>
          <Text style={styles.weekTitle}>
            {currentWeekOffset === 0 ? 'This Week' : 
             currentWeekOffset === -1 ? 'Last Week' :
             currentWeekOffset === 1 ? 'Next Week' :
             `Week ${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset}`}
          </Text>
          <Text style={styles.weekRange}>{getWeekDateRange(days)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={() => handleWeekChange('next')}
        >
          <Text style={styles.weekNavText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Days Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysContainer}
        contentContainerStyle={styles.daysContent}
      >
        {days.map((day) => (
          <TouchableOpacity
            key={day.dayName}
            style={[
              styles.dayButton,
              selectedDay === day.dayName && styles.dayButtonSelected,
              day.isToday && styles.dayButtonToday,
              day.isRestDay && styles.dayButtonRest,
            ]}
            onPress={() => onDaySelect(day.dayName)}
          >
            <Text style={[
              styles.dayLabel,
              selectedDay === day.dayName && styles.dayLabelSelected,
              day.isToday && styles.dayLabelToday,
            ]}>
              {day.dayName.slice(0, 3).toUpperCase()}
            </Text>
            
            <Text style={[
              styles.dayNumber,
              selectedDay === day.dayName && styles.dayNumberSelected,
              day.isToday && styles.dayNumberToday,
            ]}>
              {day.dayNumber}
            </Text>

            {/* Workout Status Indicator */}
            <View style={styles.statusContainer}>
              {day.hasWorkout && (
                <View style={[
                  styles.workoutIndicator,
                  day.isCompleted ? styles.workoutCompleted : styles.workoutPending,
                ]}>
                  <Text style={styles.workoutIndicatorText}>
                    {day.isCompleted ? '✓' : '•'}
                  </Text>
                </View>
              )}
              {day.isRestDay && !day.hasWorkout && (
                <View style={styles.restIndicator}>
                  <Text style={styles.restIndicatorText}>😴</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.background,
    paddingVertical: THEME.spacing.md,
  },
  
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  weekNavText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  
  weekInfo: {
    alignItems: 'center',
    flex: 1,
  },
  
  weekTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: 2,
  },
  
  weekRange: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
  
  daysContainer: {
    paddingHorizontal: THEME.spacing.lg,
  },
  
  daysContent: {
    gap: THEME.spacing.sm,
  },
  
  dayButton: {
    width: 80,
    height: 90,
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  dayButtonSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  
  dayButtonToday: {
    borderColor: THEME.colors.accent,
    borderWidth: 2,
  },
  
  dayButtonRest: {
    backgroundColor: THEME.colors.backgroundTertiary,
    opacity: 0.7,
  },
  
  dayLabel: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
  },
  
  dayLabelSelected: {
    color: THEME.colors.white,
  },
  
  dayLabelToday: {
    color: THEME.colors.accent,
    fontWeight: THEME.fontWeight.bold,
  },
  
  dayNumber: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: 4,
  },
  
  dayNumberSelected: {
    color: THEME.colors.white,
  },
  
  dayNumberToday: {
    color: THEME.colors.accent,
  },
  
  statusContainer: {
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  workoutIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  workoutCompleted: {
    backgroundColor: THEME.colors.success,
  },
  
  workoutPending: {
    backgroundColor: THEME.colors.warning,
  },
  
  workoutIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.white,
  },
  
  restIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  restIndicatorText: {
    fontSize: 12,
  },
});