import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { theme } from '../../styles/theme';
import { useTranslation } from 'react-i18next';

interface PerformanceRadarProps {
  metrics?: {
    firepower: number;
    mobility: number;
    stealth: number;
    durability: number;
  };
  isDark: boolean;
}

const { width } = Dimensions.get('window');
const CHART_SIZE = width * 0.7;
const CENTER = CHART_SIZE / 2;
const RADIUS = (CHART_SIZE / 2) * 0.7;

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({ metrics, isDark }) => {
  const { t } = useTranslation();

  if (!metrics) {
    console.log("[PerformanceRadar] metrics is null");
    return null;
  }

  const data = [
    { label: t('asset.firepower'), value: Number(metrics.firepower || 0) },
    { label: t('asset.mobility'), value: Number(metrics.mobility || 0) },
    { label: t('asset.stealth'), value: Number(metrics.stealth || 0) },
    { label: t('asset.durability'), value: Number(metrics.durability || 0) },
  ];

  const angleStep = (Math.PI * 2) / data.length;

  // Calculate coordinates for a point
  const getPoint = (index: number, value: number, radiusOverride?: number) => {
    const r = radiusOverride !== undefined ? radiusOverride : (value / 100) * RADIUS;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  };

  // Generate background grid (concentric circles/polygons)
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridPolygons = gridLevels.map((level) => {
    return data.map((_, i) => {
      const p = getPoint(i, 100, RADIUS * level);
      return `${p.x},${p.y}`;
    }).join(' ');
  });

  // Generate performance polygon
  const performancePoints = data.map((d, i) => {
    const p = getPoint(i, d.value);
    return `${p.x},${p.y}`;
  }).join(' ');

  const chartColor = theme.colors.primary; // Tactical Cyan/Blue
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const labelColor = isDark ? '#AAA' : '#666';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDark ? '#FFF' : '#000' }]}>{t('asset.performance_matrix')}</Text>

      <View style={styles.chartWrapper}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          <G>
            {/* Background Grid */}
            {gridPolygons.map((points, i) => (
              <Polygon
                key={i}
                points={points}
                fill="none"
                stroke={gridColor}
                strokeWidth="1"
              />
            ))}

            {/* Axis Lines */}
            {data.map((_, i) => {
              const p = getPoint(i, 100, RADIUS);
              return (
                <Line
                  key={i}
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  stroke={gridColor}
                  strokeWidth="1"
                />
              );
            })}

            {/* Performance Shape */}
            <Polygon
              points={performancePoints}
              fill={`${chartColor}40`} // 25% opacity
              stroke={chartColor}
              strokeWidth="3"
            />

            {/* Data Points */}
            {data.map((d, i) => {
              const p = getPoint(i, d.value);
              return (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={chartColor}
                />
              );
            })}

            {/* Labels */}
            {data.map((d, i) => {
              const p = getPoint(i, 100, RADIUS + 25);
              return (
                <SvgText
                  key={i}
                  x={p.x}
                  y={p.y}
                  fill={labelColor}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  dy="0.32em"
                >
                  {d.label}
                </SvgText>
              );
            })}
          </G>
        </Svg>
      </View>

      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <Text style={[styles.legendLabel, { color: labelColor }]}>{d.label}:</Text>
            <Text style={[styles.legendValue, { color: isDark ? '#FFF' : '#000' }]}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    marginVertical: 10,
    backgroundColor: 'rgba(128,128,128,0.03)',
    borderRadius: 20,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 10,
  },
  chartWrapper: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    marginHorizontal: 10,
    marginVertical: 4,
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 10,
    marginRight: 4,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
