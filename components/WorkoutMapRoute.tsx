// ============================================
// WORKOUT MAP ROUTE - Trace GPS sur Apple Maps
// ============================================
// Utilise react-native-maps (MapKit natif iOS)
// Fond de carte Apple Maps + Polyline du parcours
// Style Strava / Apple Forme

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Modal } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTheme } from '@/lib/ThemeContext';

interface RoutePoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface WorkoutMapRouteProps {
  routePoints: RoutePoint[];
  boundingBox?: BoundingBox;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  showElevationGradient?: boolean;
}

export const WorkoutMapRoute: React.FC<WorkoutMapRouteProps> = ({
  routePoints,
  boundingBox,
  height = 250,
  strokeColor = '#6366f1',
  strokeWidth = 4,
}) => {
  const { isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculer la region initiale depuis les points ou la bounding box
  const { region, coordinates, startPoint, endPoint } = useMemo(() => {
    if (!routePoints || routePoints.length < 2) {
      return { region: null, coordinates: [], startPoint: null, endPoint: null };
    }

    const coords = routePoints.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
    }));

    const bbox = boundingBox || coords.reduce(
      (acc, p) => ({
        minLat: Math.min(acc.minLat, p.latitude),
        maxLat: Math.max(acc.maxLat, p.latitude),
        minLon: Math.min(acc.minLon, p.longitude),
        maxLon: Math.max(acc.maxLon, p.longitude),
      }),
      { minLat: 90, maxLat: -90, minLon: 180, maxLon: -180 }
    );

    // Centre + delta avec padding
    const latDelta = (bbox.maxLat - bbox.minLat) * 1.3 || 0.01;
    const lonDelta = (bbox.maxLon - bbox.minLon) * 1.3 || 0.01;

    return {
      region: {
        latitude: (bbox.minLat + bbox.maxLat) / 2,
        longitude: (bbox.minLon + bbox.maxLon) / 2,
        latitudeDelta: Math.max(latDelta, 0.005),
        longitudeDelta: Math.max(lonDelta, 0.005),
      },
      coordinates: coords,
      startPoint: coords[0],
      endPoint: coords[coords.length - 1],
    };
  }, [routePoints, boundingBox]);

  if (!region || coordinates.length < 2) return null;

  const renderMap = (fullscreen: boolean) => (
    <MapView
      ref={fullscreen ? undefined : mapRef}
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={region}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      scrollEnabled={true}
      zoomEnabled={true}
      rotateEnabled={false}
      pitchEnabled={false}
      showsUserLocation={false}
      showsCompass={fullscreen}
      showsScale={fullscreen}
      showsTraffic={false}
      showsBuildings={false}
      showsIndoors={false}
      showsPointsOfInterest={false}
      toolbarEnabled={false}
      loadingEnabled
      mapPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
    >
      <Polyline
        coordinates={coordinates}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />
      {startPoint && (
        <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerStart}>
            <View style={styles.markerStartInner} />
          </View>
        </Marker>
      )}
      {endPoint && (
        <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerEnd}>
            <View style={styles.markerEndInner} />
          </View>
        </Marker>
      )}
    </MapView>
  );

  return (
    <>
      <View style={[styles.container, { height }]}>
        {renderMap(false)}
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => setIsFullscreen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.fullscreenButtonText}>&#x26F6;</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isFullscreen} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1 }}>
          {renderMap(true)}
          <TouchableOpacity
            style={styles.closeFullscreenButton}
            onPress={() => setIsFullscreen(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.closeFullscreenText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  // Marqueur depart - cercle vert
  markerStart: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerStartInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenButtonText: {
    color: '#FFF',
    fontSize: 18,
  },
  closeFullscreenButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeFullscreenText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Marqueur fin - cercle rouge
  markerEnd: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerEndInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});

export default WorkoutMapRoute;
