import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ResponsiveTheme } from "../../../../utils/constants";
import { rf, rh, rp } from "../../../../utils/responsive";

export interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  color: string;
  gradientColors: [string, string];
  maxValue?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color,
  gradientColors,
  maxValue,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.barChartContainer}>
      {data.map((item, index) => {
        const height = (item.value / max) * 100;
        return (
          <View key={index} style={styles.barItem}>
            <View style={styles.barWrapper}>
              <View style={[styles.bar, { height: `${Math.max(height, 8)}%` }]}>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.barGradient}
                />
              </View>
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
            <Text style={styles.barValue}>{item.value}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  barChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: rh(120),
    paddingBottom: ResponsiveTheme.spacing.lg,
  },
  barItem: {
    flex: 1,
    alignItems: "center",
  },
  barWrapper: {
    flex: 1,
    width: "65%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: ResponsiveTheme.borderRadius.sm,
    overflow: "hidden",
    minHeight: rh(6),
  },
  barGradient: {
    flex: 1,
  },
  barLabel: {
    fontSize: rf(9),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  barValue: {
    fontSize: rf(10),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginTop: rp(2),
  },
});
