import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { THEME } from '../../utils/constants';

// REMOVED: Module-level Dimensions.get() causes crash
// const { width: screenWidth } = Dimensions.get('window');

interface ProgressDataPoint {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
}

interface ProgressChartProps {
  data: ProgressDataPoint[];
  metric: 'weight' | 'bodyFat' | 'muscleMass';
  title: string;
  unit: string;
  style?: any;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  metric,
  title,
  unit,
  style,
}) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<'week' | 'month' | 'year'>('month');

  // Filter data based on selected period
  const getFilteredData = () => {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return data.filter(point => new Date(point.date) >= cutoffDate);
  };

  const filteredData = getFilteredData();
  
  // Prepare chart data
  const chartData = {
    labels: filteredData.map(point => {
      const date = new Date(point.date);
      if (selectedPeriod === 'week') {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (selectedPeriod === 'month') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        return date.toLocaleDateString('en-US', { month: 'short' });
      }
    }),
    datasets: [
      {
        data: filteredData.map(point => point[metric] || 0),
        color: (opacity = 1) => THEME.colors.primary,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: THEME.colors.backgroundTertiary,
    backgroundGradientFrom: THEME.colors.backgroundTertiary,
    backgroundGradientTo: THEME.colors.backgroundTertiary,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 107, 53, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(176, 176, 176, ${opacity})`,
    style: {
      borderRadius: THEME.borderRadius.lg,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: THEME.colors.primary,
      fill: THEME.colors.backgroundTertiary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: THEME.colors.border,
      strokeWidth: 1,
    },
  };

  const periods = [
    { key: 'week', label: '7D' },
    { key: 'month', label: '1M' },
    { key: 'year', label: '1Y' },
  ];

  // Calculate trend
  const getTrend = () => {
    if (filteredData.length < 2) return { value: 0, isPositive: true };
    
    const firstValue = filteredData[0][metric] || 0;
    const lastValue = filteredData[filteredData.length - 1][metric] || 0;
    const change = lastValue - firstValue;
    
    return {
      value: Math.abs(change),
      isPositive: change >= 0,
    };
  };

  const trend = getTrend();

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.trendContainer}>
            <Text style={styles.trendValue}>
              {trend.isPositive ? '+' : '-'}{trend.value.toFixed(1)} {unit}
            </Text>
            <Text style={[
              styles.trendLabel,
              { color: trend.isPositive ? THEME.colors.success : THEME.colors.error }
            ]}>
              {trend.isPositive ? '↗' : '↘'} {selectedPeriod}
            </Text>
          </View>
        </View>
        
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodButton,
                selectedPeriod === period.key && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period.key as any)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period.key && styles.periodButtonTextActive,
                ]}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Chart */}
      {filteredData.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={chartData}
            width={Math.max(350, filteredData.length * 50)} // Fixed min width
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
          />
        </ScrollView>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
          <Text style={styles.noDataSubtext}>Start tracking to see your progress</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs,
  },

  trendValue: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
  },

  trendLabel: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.xs / 2,
  },

  periodButton: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  periodButtonActive: {
    backgroundColor: THEME.colors.primary,
  },

  periodButtonText: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
  },

  periodButtonTextActive: {
    color: THEME.colors.white,
  },

  chart: {
    marginVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
  },

  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xxl,
  },

  noDataText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },

  noDataSubtext: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textMuted,
  },
});
