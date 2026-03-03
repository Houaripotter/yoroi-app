// ============================================
// WORKOUT SVG ROUTE - Trace GPS en SVG
// Projection Mercator simple sans react-native-maps
// ============================================

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Rect } from 'react-native-svg';

interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface WorkoutSvgRouteProps {
  routePoints: RoutePoint[];
  boundingBox?: BoundingBox;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * Projection Mercator simplifiee: lat/lon -> x/y pixel
 */
const latToY = (lat: number): number => {
  const radLat = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radLat / 2));
};

export const WorkoutSvgRoute: React.FC<WorkoutSvgRouteProps> = ({
  routePoints,
  boundingBox,
  width = 320,
  height = 200,
  strokeColor = '#6366f1',
  strokeWidth = 2.5,
}) => {
  const { points, startPoint, endPoint } = useMemo(() => {
    if (!routePoints || routePoints.length < 2) return { points: '', startPoint: null, endPoint: null };

    // Calculer bounding box si pas fournie
    const bbox = boundingBox || routePoints.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.latitude),
        maxLat: Math.max(acc.maxLat, p.latitude),
        minLon: Math.min(acc.minLon, p.longitude),
        maxLon: Math.max(acc.maxLon, p.longitude),
      }),
      { minLat: 90, maxLat: -90, minLon: 180, maxLon: -180 }
    );

    // Ajouter du padding (10%)
    const latPadding = (bbox.maxLat - bbox.minLat) * 0.1 || 0.001;
    const lonPadding = (bbox.maxLon - bbox.minLon) * 0.1 || 0.001;
    const paddedBbox = {
      minLat: bbox.minLat - latPadding,
      maxLat: bbox.maxLat + latPadding,
      minLon: bbox.minLon - lonPadding,
      maxLon: bbox.maxLon + lonPadding,
    };

    // Projection Mercator
    const minY = latToY(paddedBbox.minLat);
    const maxY = latToY(paddedBbox.maxLat);
    const lonRange = paddedBbox.maxLon - paddedBbox.minLon;
    const yRange = maxY - minY;

    // Garder le ratio d'aspect
    const scaleX = width / lonRange;
    const scaleY = height / yRange;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - lonRange * scale) / 2;
    const offsetY = (height - yRange * scale) / 2;

    const projectPoint = (p: RoutePoint): [number, number] => {
      const x = (p.longitude - paddedBbox.minLon) * scale + offsetX;
      const y = height - ((latToY(p.latitude) - minY) * scale + offsetY);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };

    const projected = routePoints.map(projectPoint);
    const pointsStr = projected.map(([x, y]) => `${x},${y}`).join(' ');

    return {
      points: pointsStr,
      startPoint: projected[0],
      endPoint: projected[projected.length - 1],
    };
  }, [routePoints, boundingBox, width, height]);

  if (!points || !startPoint || !endPoint) return null;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Fond */}
        <Rect
          x={0} y={0}
          width={width} height={height}
          rx={12}
          fill="rgba(0,0,0,0.03)"
        />
        {/* Trace */}
        <Polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Marqueur debut (vert) */}
        <Circle
          cx={startPoint[0]}
          cy={startPoint[1]}
          r={5}
          fill="#22C55E"
          stroke="#fff"
          strokeWidth={1.5}
        />
        {/* Marqueur fin (rouge) */}
        <Circle
          cx={endPoint[0]}
          cy={endPoint[1]}
          r={5}
          fill="#EF4444"
          stroke="#fff"
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default WorkoutSvgRoute;
