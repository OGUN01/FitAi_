import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { flatColors as colors, borderRadius, typography } from '../../../theme/aurora-tokens';
import { rf, rp, rw } from '../../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../../utils/colors';

interface QuickAddOptionsProps {
  onQuickAdd: (amountML: number) => void;
  onShowCustomInput: () => void;
}

const quickOptions = [
  { label: '250ml', amount: 250, icon: 'water-outline' as const },
  { label: '500ml', amount: 500, icon: 'water' as const },
  { label: '1L', amount: 1000, icon: 'beaker-outline' as const },
];

export const QuickAddOptions: React.FC<QuickAddOptionsProps> = ({
  onQuickAdd,
  onShowCustomInput,
}) => {
  return (
    <Animated.View entering={FadeInDown.delay(120).duration(400)}>
      <Text style={styles.sectionTitle}>Quick Add</Text>
      <View style={styles.quickOptionsContainer}>
        {quickOptions.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={styles.quickOption}
            onPress={() => onQuickAdd(option.amount)}
            activeOpacity={0.7}
          >
            <View style={styles.quickOptionPill}>
              <View style={styles.quickOptionIconDisc}>
                <Ionicons name={option.icon} size={rf(20)} color={colors.secondary} />
              </View>
              <Text style={styles.quickOptionLabel}>{option.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.customButton} onPress={onShowCustomInput} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        <Text style={styles.customButtonText}>Custom Amount</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: hexToRgba(colors.white, 0.7),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: rp(12),
  },
  quickOptionsContainer: {
    flexDirection: 'row',
    gap: rp(12),
    marginBottom: rp(20),
  },
  quickOption: {
    flex: 1,
  },
  quickOptionPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: rp(16),
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_LOW),
  },
  quickOptionIconDisc: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickOptionLabel: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.white,
    marginTop: rp(8),
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(8),
    minHeight: 44,
    paddingVertical: rp(14),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    borderStyle: 'dashed',
  },
  customButtonText: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.medium) as any,
    color: colors.primary,
  },
});
