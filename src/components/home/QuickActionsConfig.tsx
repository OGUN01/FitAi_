import { Ionicons } from '@expo/vector-icons';
import { flatColors as colors } from '../../theme/aurora-tokens';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface QuickActionsConfigProps {
  isHealthKitAuthorized: boolean;
  isHealthConnectAuthorized: boolean;
  syncHealthData: (force?: boolean) => Promise<void>;
  syncFromHealthConnect: (days: number) => Promise<void>;
  onLogWeight: () => void;
  onScanFood?: () => void;
  onLogMeal?: () => void;
  onLogWater?: () => void;
  onBarcodeScan?: () => void;
  onScanLabel?: () => void;
  onRecipes?: () => void;
}

export const createQuickActions = ({
  onLogWeight,
  onLogMeal,
  onLogWater,
  onBarcodeScan,
  onScanLabel,
}: QuickActionsConfigProps): QuickAction[] => [
  {
    id: 'log-weight',
    label: 'Log Weight',
    icon: 'scale-outline' as keyof typeof Ionicons.glyphMap,
    color: colors.primary,
    onPress: onLogWeight,
  },
  ...(onLogMeal
    ? [
        {
          id: 'log-meal',
          label: 'Log Meal',
          icon: 'restaurant-outline' as keyof typeof Ionicons.glyphMap,
          color: colors.success,
          onPress: onLogMeal,
        },
      ]
    : []),
  ...(onLogWater
    ? [
        {
          id: 'log-water',
          label: 'Water',
          icon: 'water-outline' as keyof typeof Ionicons.glyphMap,
          color: colors.info,
          onPress: onLogWater,
        },
      ]
    : []),
  ...(onBarcodeScan
    ? [
        {
          id: 'barcode-scan',
          label: 'Barcode',
          icon: 'barcode-outline' as keyof typeof Ionicons.glyphMap,
          color: colors.teal,
          onPress: onBarcodeScan,
        },
      ]
    : []),
  ...(onScanLabel
    ? [
        {
          id: 'scan-label',
          label: 'Scan Label',
          icon: 'scan-outline' as keyof typeof Ionicons.glyphMap,
          color: colors.purple,
          onPress: onScanLabel,
        },
      ]
    : []),
];
