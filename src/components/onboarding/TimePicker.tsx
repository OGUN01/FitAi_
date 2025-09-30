import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { Button } from '../ui';

// ============================================================================
// TYPES
// ============================================================================

interface TimePickerProps {
  visible: boolean;
  initialTime: string; // "HH:MM" format
  onTimeSelect: (time: string) => void;
  onClose: () => void;
  title?: string;
  is24Hour?: boolean;
}

interface TimePickerWheelProps {
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  width: number;
}

// ============================================================================
// TIME PICKER WHEEL COMPONENT
// ============================================================================

const TimePickerWheel: React.FC<TimePickerWheelProps> = ({
  values,
  selectedValue,
  onValueChange,
  width,
}) => {
  const selectedIndex = values.indexOf(selectedValue);
  
  return (
    <View style={[styles.wheelContainer, { width }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.wheelContent}
      >
        {values.map((value, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = Math.max(0.3, 1 - distance * 0.2);
          
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.wheelItem,
                isSelected && styles.wheelItemSelected,
                { opacity }
              ]}
              onPress={() => onValueChange(value)}
            >
              <Text style={[
                styles.wheelItemText,
                isSelected && styles.wheelItemTextSelected,
              ]}>
                {value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ============================================================================
// MAIN TIME PICKER COMPONENT
// ============================================================================

export const TimePicker: React.FC<TimePickerProps> = ({
  visible,
  initialTime,
  onTimeSelect,
  onClose,
  title = 'Select Time',
  is24Hour = true,
}) => {
  const [hours, minutes] = initialTime.split(':');
  const [selectedHour, setSelectedHour] = useState(hours);
  const [selectedMinute, setSelectedMinute] = useState(minutes);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  
  // Generate time values
  const hourValues = is24Hour 
    ? Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
    : Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    
  const minuteValues = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const periodValues = ['AM', 'PM'];
  
  // Initialize period for 12-hour format
  React.useEffect(() => {
    if (!is24Hour) {
      const hour24 = parseInt(hours);
      setSelectedPeriod(hour24 >= 12 ? 'PM' : 'AM');
      setSelectedHour(hour24 === 0 ? '12' : hour24 > 12 ? (hour24 - 12).toString().padStart(2, '0') : hours);
    }
  }, [hours, is24Hour]);
  
  const handleConfirm = () => {
    let finalHour = selectedHour;
    
    if (!is24Hour) {
      let hour24 = parseInt(selectedHour);
      if (selectedPeriod === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (selectedPeriod === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      finalHour = hour24.toString().padStart(2, '0');
    }
    
    const timeString = `${finalHour}:${selectedMinute}`;
    onTimeSelect(timeString);
  };
  
  const formatDisplayTime = () => {
    if (is24Hour) {
      return `${selectedHour}:${selectedMinute}`;
    } else {
      return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.selectedTime}>{formatDisplayTime()}</Text>
          </View>
          
          {/* Time Picker Wheels */}
          <View style={styles.pickersContainer}>
            {/* Hour Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <TimePickerWheel
                values={hourValues}
                selectedValue={selectedHour}
                onValueChange={setSelectedHour}
                width={rw(80)}
              />
            </View>
            
            {/* Minute Picker */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <TimePickerWheel
                values={minuteValues}
                selectedValue={selectedMinute}
                onValueChange={setSelectedMinute}
                width={rw(80)}
              />
            </View>
            
            {/* Period Picker (12-hour format only) */}
            {!is24Hour && (
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Period</Text>
                <TimePickerWheel
                  values={periodValues}
                  selectedValue={selectedPeriod}
                  onValueChange={(value) => setSelectedPeriod(value as 'AM' | 'PM')}
                  width={rw(60)}
                />
              </View>
            )}
          </View>
          
          {/* Quick Time Buttons */}
          <View style={styles.quickTimesContainer}>
            <Text style={styles.quickTimesTitle}>Quick Select</Text>
            <View style={styles.quickTimesGrid}>
              {title.toLowerCase().includes('wake') ? (
                // Wake time presets
                [
                  { label: '6:00 AM', value: '06:00' },
                  { label: '7:00 AM', value: '07:00' },
                  { label: '8:00 AM', value: '08:00' },
                  { label: '9:00 AM', value: '09:00' },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.value}
                    style={styles.quickTimeButton}
                    onPress={() => {
                      const [h, m] = preset.value.split(':');
                      setSelectedHour(h);
                      setSelectedMinute(m);
                      if (!is24Hour) {
                        setSelectedPeriod(parseInt(h) >= 12 ? 'PM' : 'AM');
                      }
                    }}
                  >
                    <Text style={styles.quickTimeText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                // Sleep time presets
                [
                  { label: '10:00 PM', value: '22:00' },
                  { label: '11:00 PM', value: '23:00' },
                  { label: '12:00 AM', value: '00:00' },
                  { label: '1:00 AM', value: '01:00' },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.value}
                    style={styles.quickTimeButton}
                    onPress={() => {
                      const [h, m] = preset.value.split(':');
                      setSelectedHour(h);
                      setSelectedMinute(m);
                      if (!is24Hour) {
                        setSelectedPeriod(parseInt(h) >= 12 ? 'PM' : 'AM');
                      }
                    }}
                  >
                    <Text style={styles.quickTimeText}>{preset.label}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
          
          {/* Actions */}
          <View style={styles.actionsContainer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={styles.cancelButton}
            />
            <Button
              title="Confirm"
              onPress={handleConfirm}
              variant="primary"
              style={styles.confirmButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xl,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xl,
    paddingBottom: ResponsiveTheme.spacing.xl,
    maxHeight: '80%',
  },

  header: {
    padding: ResponsiveTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
    alignItems: 'center',
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  selectedTime: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  // Picker Container
  pickersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  pickerSection: {
    alignItems: 'center',
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },

  pickerLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  // Wheel Styles
  wheelContainer: {
    height: rh(150),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  wheelContent: {
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  wheelItem: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginVertical: ResponsiveTheme.spacing.xs,
    marginHorizontal: ResponsiveTheme.spacing.sm,
  },

  wheelItemSelected: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  wheelItemText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },

  wheelItemTextSelected: {
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  // Quick Times
  quickTimesContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  quickTimesTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: 'center',
  },

  quickTimesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },

  quickTimeButton: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },

  quickTimeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  // Actions
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },

  cancelButton: {
    flex: 1,
  },

  confirmButton: {
    flex: 2,
  },
});

export default TimePicker;
