import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rh } from "../../../../utils/responsive";

export interface ChartData {
  label: string;
  value: number;
}

interface StackedAreaChartProps {
  consumedData: ChartData[];
  burnedData: ChartData[];
}

export const StackedAreaChart: React.FC<StackedAreaChartProps> = ({
  consumedData,
  burnedData,
}) => {
  const maxValue = Math.max(
    ...consumedData.map((d) => d.value),
    ...burnedData.map((d) => d.value),
    1,
  );

  return (
    <View style={styles.areaChartContainer}>
      {consumedData.map((item, index) => {
        const consumed = burnedData[index]?.value || 0;
        const burned = item.value;
        const consumedHeight = (consumed / maxValue) * 100;
        const burnedHeight = (burned / maxValue) * 100;

        return (
          <View key={index} style={styles.areaBarGroup}>
            <View style={styles.areaBarWrapper}>
              <View
                style={[
                  styles.areaBar,
                  styles.areaBarBurned,
                  { height: `${burnedHeight}%` },
                ]}
              />
              <View
                style={[
                  styles.areaBar,
                  styles.areaBarConsumed,
                  { height: `${consumedHeight}%` },
                ]}
              />
            </View>
            <Text style={styles.areaLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  areaChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: rh(120),
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  areaBarGroup: {
    flex: 1,
    alignItems: "center",
  },
  areaBarWrapper: {
    flex: 1,
    width: "70%",
    justifyContent: "flex-end",
    position: "relative",
  },
  areaBar: {
    width: "100%",
    borderTopLeftRadius: ResponsiveTheme.borderRadius.sm,
    borderTopRightRadius: ResponsiveTheme.borderRadius.sm,
  },
  areaBarConsumed: {
    backgroundColor: "rgba(76,175,80,0.7)",
  },
  areaBarBurned: {
    backgroundColor: "rgba(255,152,0,0.5)",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  areaLabel: {
    fontSize: rf(9),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
});
