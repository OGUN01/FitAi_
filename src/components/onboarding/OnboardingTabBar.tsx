import { flatColors as colors } from "../../theme/aurora-tokens";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { rf, rp } from "../../utils/responsive";
import { TabValidationResult } from "../../types/onboarding";
import { AuroraStepRail } from "./AuroraStepRail";

// ============================================================================
// TYPES
// ============================================================================

export interface TabConfig {
  id: number;
  title: string;
  iconName: string;
  isCompleted: boolean;
  isAccessible: boolean;
  validationResult?: TabValidationResult;
}

interface OnboardingTabBarProps {
  activeTab: number;
  tabs: TabConfig[];
  onTabPress: (tabId: number) => void;
  completionPercentage: number;
}

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

export const ONBOARDING_TABS: Omit<
  TabConfig,
  "isCompleted" | "isAccessible" | "validationResult"
>[] = [
  { id: 1, title: "Personal", iconName: "person" },
  { id: 2, title: "Diet", iconName: "nutrition" },
  { id: 3, title: "Body", iconName: "body" },
  { id: 4, title: "Workout", iconName: "barbell" },
  { id: 5, title: "Review", iconName: "checkmark-done" },
];

// ============================================================================
// MAIN COMPONENT
//
// ONE signature indicator (AuroraStepRail) + a single micro metadata line.
// The legacy stacked trio — gradient progress bar, numbered step circles with
// connector lines, and the "1/5" counter — was removed: the rail carries the
// step state, the active name, and the completion read in one element.
// ============================================================================

export const OnboardingTabBar: React.FC<OnboardingTabBarProps> = ({
  activeTab,
  tabs,
  onTabPress,
  completionPercentage,
}) => {
  const pct = Math.max(0, Math.min(100, Math.round(completionPercentage)));

  return (
    <View style={styles.container}>
      <AuroraStepRail tabs={tabs} activeTab={activeTab} onTabPress={onTabPress} />

      {/* Micro metadata — step ordinal + completion, one quiet editorial line */}
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>
            STEP {activeTab} OF {tabs.length}
          </Text>
        </View>
        <Text style={styles.metaPct}>{pct}%</Text>
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${colors.background}F2`,
    paddingTop: rp(10),
    paddingBottom: rp(10),
    paddingHorizontal: rp(14),
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: rp(8),
    paddingHorizontal: rp(4),
  },

  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  metaDot: {
    width: rp(5),
    height: rp(5),
    borderRadius: rp(3),
    backgroundColor: colors.primary,
    marginRight: rp(7),
  },

  metaText: {
    fontSize: rf(9),
    fontWeight: "600",
    letterSpacing: 1.4,
    color: `${colors.white}73`,
  },

  metaPct: {
    fontSize: rf(10),
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: `${colors.white}8C`,
  },
});

export default OnboardingTabBar;
