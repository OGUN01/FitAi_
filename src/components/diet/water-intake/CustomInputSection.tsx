import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassButton } from '../../ui/aurora/GlassButton';
import { flatColors as colors, borderRadius } from '../../../theme/aurora-tokens';
import { rf, rp } from '../../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../../utils/colors';

interface CustomInputSectionProps {
  customAmount: string;
  error: string | null;
  onCustomAmountChange: (value: string) => void;
  onErrorChange: (value: string | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const CustomInputSection: React.FC<CustomInputSectionProps> = ({
  customAmount,
  error,
  onCustomAmountChange,
  onErrorChange,
  onCancel,
  onSubmit,
}) => {
  return (
    <>
      <Text style={styles.sectionTitle}>Enter Amount (Liters)</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="water-outline" size={20} color={colors.primary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={customAmount}
          onChangeText={(text) => {
            onCustomAmountChange(text);
            onErrorChange(null);
          }}
          placeholder="e.g., 0.5"
          placeholderTextColor={hexToRgba(colors.white, 0.4)}
          keyboardType="decimal-pad"
          returnKeyType="done"
          autoFocus
          onSubmitEditing={onSubmit}
        />
        <Text style={styles.unitLabel}>L</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.errorLight} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        <GlassButton
          label="Add Water"
          onPress={onSubmit}
          variant="primary"
          icon="add"
          style={styles.submitButton}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: rf(11),
    fontWeight: '600',
    color: hexToRgba(colors.white, 0.7),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: rp(12),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: rp(16),
    marginBottom: rp(16),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
  },
  inputIcon: {
    marginRight: rp(12),
  },
  input: {
    flex: 1,
    fontSize: rf(18),
    fontWeight: '600',
    color: colors.white,
    paddingVertical: rp(16),
  },
  unitLabel: {
    fontSize: rf(16),
    fontWeight: '500',
    color: hexToRgba(colors.white, 0.5),
    marginLeft: rp(8),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(8),
    marginBottom: rp(16),
    paddingHorizontal: rp(12),
    paddingVertical: rp(10),
    borderRadius: borderRadius.md,
    backgroundColor: hexToRgba(colors.error, TINT_ALPHA_LOW),
    borderWidth: 1,
    borderColor: hexToRgba(colors.error, TINT_ALPHA_MEDIUM),
  },
  errorText: {
    flex: 1,
    fontSize: rf(13),
    color: colors.errorLight,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: rp(12),
  },
  cancelButton: {
    flex: 0.4,
    minHeight: 44,
    paddingVertical: rp(14),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.white,
  },
  submitButton: {
    flex: 0.6,
  },
});
