/**
 * TrendCharts Component
 * Detailed analytics charts with proper styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { SectionHeader } from '../home/SectionHeader';

interface ChartData {
  label: string;
  value: number;
}

interface TrendChartsProps {
  weightData?: ChartData[];
  calorieData?: ChartData[];
  workoutData?: ChartData[];
  period: 'week' | 'month' | 'year';
  onChartPress?: (chartType: string) => void;
}

// Bar Chart Component
const BarChart: React.FC<{
  data: ChartData[];
  color: string;
  gradientColors: [string, string];
  maxValue?: number;
}> = ({ data, color, gradientColors, maxValue }) => {
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

// Clean Line Chart Component - No bars, just points with trend line
const LineChart: React.FC<{
  data: ChartData[];
  color: string;
  unit?: string;
  showValues?: boolean;
}> = ({ data, color, unit = '', showValues = true }) => {
  // Guard against empty data
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="analytics-outline" size={rf(32)} color={ResponsiveTheme.colors.textMuted} />
        <Text style={styles.emptyChartText}>No weight data recorded</Text>
        <Text style={styles.emptyChartSubtext}>Log your weight to see progress</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 0.5;
  const paddingTop = range * 0.15;
  const paddingBottom = range * 0.15;
  const chartMax = max + paddingTop;
  const chartMin = min - paddingBottom;
  const chartRange = chartMax - chartMin;

  // Calculate Y position for a value
  const getYPercent = (value: number) => {
    return ((value - chartMin) / chartRange) * 100;
  };

  return (
    <View style={styles.lineChartContainer}>
      {/* Y-axis scale */}
      <View style={styles.yAxisScale}>
        <Text style={styles.yAxisLabel}>{chartMax.toFixed(1)}</Text>
        <Text style={styles.yAxisLabel}>{((chartMax + chartMin) / 2).toFixed(1)}</Text>
        <Text style={styles.yAxisLabel}>{chartMin.toFixed(1)}</Text>
      </View>

      {/* Chart Area */}
      <View style={styles.lineChartArea}>
        {/* Grid lines */}
        <View style={styles.gridLines}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>

        {/* Points only - clean look */}
        <View style={styles.linePointsRow}>
          {data.map((item, index) => {
            const yPos = getYPercent(item.value);
            const isFirst = index === 0;
            const isLast = index === data.length - 1;
            
            return (
              <View key={index} style={styles.linePointColumn}>
                {/* Vertical guide line */}
                <View style={[styles.pointGuideLine, { height: `${yPos}%` }]} />
                
                {/* Point */}
                <View style={[styles.linePointWrapper, { bottom: `${yPos}%` }]}>
                  <View style={[
                    styles.linePoint, 
                    { 
                      backgroundColor: color,
                      borderColor: isLast ? color : 'rgba(255,255,255,0.8)',
                      borderWidth: isLast ? 3 : 2,
                      width: isLast ? rw(14) : rw(10),
                      height: isLast ? rw(14) : rw(10),
                      borderRadius: isLast ? rw(7) : rw(5),
                    }
                  ]} />
                  
                  {/* Only show value on last point */}
                  {showValues && isLast && (
                    <View style={[styles.linePointValue, { backgroundColor: `${color}30`, borderColor: color }]}>
                      <Text style={[styles.linePointText, { color }]}>
                        {item.value.toFixed(1)}{unit}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisLabels}>
          {data.map((item, index) => (
            <Text key={index} style={styles.xAxisLabel}>{item.label}</Text>
          ))}
        </View>
      </View>
    </View>
  );
};

// Stacked Area Chart Component
const StackedAreaChart: React.FC<{
  consumedData: ChartData[];
  burnedData: ChartData[];
}> = ({ consumedData, burnedData }) => {
  const maxValue = Math.max(
    ...consumedData.map((d) => d.value),
    ...burnedData.map((d) => d.value),
    1
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
              {/* Burned (back) */}
              <View
                style={[
                  styles.areaBar,
                  styles.areaBarBurned,
                  { height: `${burnedHeight}%` },
                ]}
              />
              {/* Consumed (front) */}
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

// Chart Card Wrapper
const ChartCard: React.FC<{
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  legend?: { color: string; label: string }[];
  delay?: number;
  onPress?: () => void;
  children: React.ReactNode;
}> = ({ title, icon, iconColor, legend, delay = 0, onPress, children }) => {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={!!onPress}
        hapticType="light"
        disabled={!onPress}
      >
        <GlassCard elevation={2} blurIntensity="light" padding="lg" borderRadius="lg">
          {/* Header */}
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleRow}>
              <View style={[styles.chartIconContainer, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon} size={rf(16)} color={iconColor} />
              </View>
              <Text style={styles.chartTitle}>{title}</Text>
            </View>

            {/* Legend */}
            {legend && (
              <View style={styles.legendContainer}>
                {legend.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Chart Content */}
          {children}
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const TrendCharts: React.FC<TrendChartsProps> = ({
  weightData,
  calorieData,
  workoutData,
  period,
  onChartPress,
}) => {
  // No mock data - show empty states if no data provided

  // Generate period-appropriate labels
  const getPeriodLabels = () => {
    switch (period) {
      case 'week':
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      case 'month':
        return ['W1', 'W2', 'W3', 'W4'];
      case 'year':
        return ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
      default:
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <SectionHeader
          title="Detailed Analytics"
          icon="bar-chart"
          iconColor="#667eea"
        />
      </View>

      <View style={styles.chartsContainer}>
        {/* Weight Progress Chart */}
        <ChartCard
          title="Weight Progress"
          icon="trending-down"
          iconColor="#9C27B0"
          legend={weightData && weightData.length > 0 ? [
            { color: '#9C27B0', label: 'Weight' },
          ] : undefined}
          delay={0}
          onPress={() => onChartPress?.('weight')}
        >
          <LineChart
            data={weightData || []}
            color="#9C27B0"
            unit="kg"
          />
        </ChartCard>

        {/* Calorie Analysis Chart */}
        <ChartCard
          title="Calorie Analysis"
          icon="flame"
          iconColor="#FF9800"
          legend={calorieData && calorieData.length > 0 ? [
            { color: '#4CAF50', label: 'Consumed' },
            { color: '#FF9800', label: 'Burned' },
          ] : undefined}
          delay={100}
          onPress={() => onChartPress?.('calories')}
        >
          {calorieData && calorieData.length > 0 ? (
            <BarChart
              data={calorieData}
              color="#4CAF50"
              gradientColors={['#4CAF50', '#8BC34A']}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="flame-outline" size={rf(32)} color={ResponsiveTheme.colors.textMuted} />
              <Text style={styles.emptyChartText}>No calorie data recorded</Text>
              <Text style={styles.emptyChartSubtext}>Start tracking meals to see analysis</Text>
            </View>
          )}
        </ChartCard>

        {/* Workout Consistency Chart */}
        <ChartCard
          title="Workout Consistency"
          icon="barbell"
          iconColor="#2196F3"
          delay={200}
          onPress={() => onChartPress?.('workouts')}
        >
          {workoutData && workoutData.length > 0 ? (
            <BarChart
              data={workoutData}
              color="#2196F3"
              gradientColors={['#2196F3', '#64B5F6']}
              maxValue={Math.max(...workoutData.map(d => d.value), 4)}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Ionicons name="barbell-outline" size={rf(32)} color={ResponsiveTheme.colors.textMuted} />
              <Text style={styles.emptyChartText}>No workout data this {period}</Text>
              <Text style={styles.emptyChartSubtext}>Complete workouts to see consistency</Text>
            </View>
          )}
        </ChartCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  headerContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  chartsContainer: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },
  chartHeader: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  chartIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: rf(15),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
  },
  legendText: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Bar Chart Styles
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: rh(120),
    paddingBottom: ResponsiveTheme.spacing.lg,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '65%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: ResponsiveTheme.borderRadius.sm,
    overflow: 'hidden',
    minHeight: rh(6),
  },
  barGradient: {
    flex: 1,
  },
  barLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  barValue: {
    fontSize: rf(10),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginTop: 2,
  },

  // Empty chart state
  emptyChart: {
    height: rh(120),
    justifyContent: 'center',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  emptyChartText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  emptyChartSubtext: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textMuted,
  },

  // Line Points Chart Styles
  lineChartContainer: {
    flexDirection: 'row',
    height: rh(150),
  },
  yAxisScale: {
    width: rw(40),
    justifyContent: 'space-between',
    paddingRight: ResponsiveTheme.spacing.xs,
    paddingBottom: ResponsiveTheme.spacing.lg,
  },
  yAxisLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textMuted,
    textAlign: 'right',
  },
  lineChartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: ResponsiveTheme.spacing.lg,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  linePointsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: ResponsiveTheme.spacing.lg,
  },
  linePointColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  pointGuideLine: {
    position: 'absolute',
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(156,39,176,0.15)',
  },
  linePointWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  linePoint: {
    width: rw(10),
    height: rw(10),
    borderRadius: rw(5),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  linePointValue: {
    position: 'absolute',
    top: -rh(28),
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
  },
  linePointText: {
    fontSize: rf(11),
    fontWeight: '700',
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: ResponsiveTheme.spacing.xs,
  },
  xAxisLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },

  // Stacked Area Chart Styles
  areaChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: rh(120),
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  areaBarGroup: {
    flex: 1,
    alignItems: 'center',
  },
  areaBarWrapper: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  areaBar: {
    width: '100%',
    borderTopLeftRadius: ResponsiveTheme.borderRadius.xs,
    borderTopRightRadius: ResponsiveTheme.borderRadius.xs,
  },
  areaBarConsumed: {
    backgroundColor: 'rgba(76,175,80,0.7)',
  },
  areaBarBurned: {
    backgroundColor: 'rgba(255,152,0,0.5)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  areaLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
});

export default TrendCharts;

