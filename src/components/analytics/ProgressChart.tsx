// Progress Chart Component
// Beautiful charts for analytics visualization using Victory Native

import React from 'react';
import { View, Text, Dimensions } from 'react-native';

// Temporarily disabled victory-native to resolve Skia module issues
// import { VictoryChart, VictoryLine, VictoryArea, VictoryBar, VictoryAxis, VictoryTheme, VictoryTooltip } from 'victory-native';

interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
}

interface ProgressChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'line' | 'area' | 'bar';
  color?: string;
  height?: number;
  showGrid?: boolean;
  animate?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  data,
  type,
  color = '#007AFF',
  height = 200,
  showGrid = true,
  animate = true,
}) => {
  // Temporary placeholder while victory-native Skia issues are resolved
  return (
    <View style={{ 
      width: screenWidth - 40, 
      height: height + 60,
      backgroundColor: '#f8f9fa',
      borderRadius: 12,
      padding: 20,
      marginVertical: 10,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#e9ecef'
    }}>
      <Text style={{ 
        fontSize: 18, 
        fontWeight: '600', 
        marginBottom: 10,
        color: '#333'
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 14,
        color: '#666',
        textAlign: 'center'
      }}>
        Chart visualization temporarily disabled
      </Text>
      <Text style={{
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        textAlign: 'center'
      }}>
        {data.length} data points • {type} chart
      </Text>
    </View>
  );
};

export default ProgressChart;