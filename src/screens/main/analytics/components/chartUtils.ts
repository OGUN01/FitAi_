export const generateSmoothPath = (
  data: Array<{ label: string; value: number }>,
  getX: (index: number) => number,
  getY: (value: number) => number,
  paddingLeft: number,
  paddingTop: number,
  chartAreaHeight: number,
): string => {
  if (!data || data.length === 0) {
    return `M ${paddingLeft} ${paddingTop + chartAreaHeight}`;
  }

  if (data.length < 2) {
    const x = getX(0);
    const y = getY(data[0].value);
    return `M ${x} ${y}`;
  }

  let path = `M ${getX(0)} ${getY(data[0].value)}`;

  for (let i = 0; i < data.length - 1; i++) {
    const x0 = getX(i);
    const y0 = getY(data[i].value);
    const x1 = getX(i + 1);
    const y1 = getY(data[i + 1].value);

    const cpDist = (x1 - x0) * 0.4;
    path += ` C ${x0 + cpDist} ${y0}, ${x1 - cpDist} ${y1}, ${x1} ${y1}`;
  }

  return path;
};

export const generateAreaPath = (
  data: Array<{ label: string; value: number }>,
  smoothPath: string,
  getX: (index: number) => number,
  paddingLeft: number,
  paddingTop: number,
  chartAreaWidth: number,
  chartAreaHeight: number,
): string => {
  if (!data || data.length === 0) {
    return `M ${paddingLeft} ${paddingTop + chartAreaHeight} L ${paddingLeft + chartAreaWidth} ${paddingTop + chartAreaHeight} Z`;
  }

  const lastX = getX(data.length - 1);
  const firstX = getX(0);
  const bottomY = paddingTop + chartAreaHeight;

  return `${smoothPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
};

export const calculateChartBounds = (data: Array<{ value: number }>) => {
  if (!data || data.length === 0) {
    return {
      chartMax: 1,
      chartMin: 0,
      chartRange: 1,
    };
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const paddingAmount = range * 0.2;
  const chartMax = maxVal + paddingAmount;
  const chartMin = Math.max(0, minVal - paddingAmount);
  const chartRange = chartMax - chartMin || 1;

  return { chartMax, chartMin, chartRange };
};

export const calculateTrend = (
  data: Array<{ value: number }>,
): {
  trend: number;
  trendPercent: string;
  isPositiveTrend: boolean;
} => {
  if (!data || data.length < 2) {
    return {
      trend: 0,
      trendPercent: "0",
      isPositiveTrend: false,
    };
  }

  const trend = data[data.length - 1].value - data[0].value;
  const trendPercent =
    data[0].value > 0 ? ((trend / data[0].value) * 100).toFixed(1) : "0";
  const isPositiveTrend = trend >= 0;

  return { trend, trendPercent, isPositiveTrend };
};
