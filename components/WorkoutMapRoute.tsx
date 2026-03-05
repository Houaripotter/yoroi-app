// ============================================
// WORKOUT MAP ROUTE - Trace GPS sur Apple Maps
// ============================================
// Utilise react-native-maps (MapKit natif iOS)
// Fond de carte Apple Maps + Polyline du parcours
// Style Strava / Apple Forme
// Toggle satellite/standard + fullscreen + distance markers

import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import MapView, { Polyline, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Maximize2, X, Map, Satellite, Navigation } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const fullscreenMapRef = useRef<MapView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'hybrid' | 'standard'>('hybrid');

  // Calculer la region initiale depuis les points ou la bounding box
  const { region, coordinates, startPoint, endPoint, distanceKm } = useMemo(() => {
    if (!routePoints || routePoints.length < 2) {
      return { region: null, coordinates: [], startPoint: null, endPoint: null, distanceKm: 0 };
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

    // Calculer distance totale
    let totalDist = 0;
    for (let i = 1; i < coords.length; i++) {
      const dLat = (coords[i].latitude - coords[i - 1].latitude) * Math.PI / 180;
      const dLon = (coords[i].longitude - coords[i - 1].longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(coords[i - 1].latitude * Math.PI / 180) *
        Math.cos(coords[i].latitude * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      totalDist += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

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
      distanceKm: totalDist,
    };
  }, [routePoints, boundingBox]);

  if (!region || coordinates.length < 2) return null;

  const handleRecenter = () => {
    const ref = isFullscreen ? fullscreenMapRef : mapRef;
    ref.current?.animateToRegion(region, 300);
  };

  const renderMap = (fullscreen: boolean) => (
    <MapView
      ref={fullscreen ? fullscreenMapRef : mapRef}
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      mapType={mapType}
      initialRegion={region}
      {...(Platform.OS === 'ios' ? { userInterfaceStyle: isDark ? 'dark' : 'light' } : {})}
      scrollEnabled={true}
      zoomEnabled={true}
      rotateEnabled={fullscreen}
      pitchEnabled={fullscreen}
      showsUserLocation={false}
      showsCompass={fullscreen}
      showsScale={fullscreen}
      showsTraffic={false}
      showsBuildings={true}
      showsIndoors={false}
      showsPointsOfInterest={false}
      toolbarEnabled={false}
      loadingEnabled
      mapPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}
    >
      <Polyline
        coordinates={coordinates}
        strokeColor={strokeColor}
        strokeWidth={fullscreen ? strokeWidth + 1 : strokeWidth}
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

  const isHybrid = mapType === 'hybrid';
  const btnBg = 'rgba(0,0,0,0.6)';

  return (
    <>
      {/* Vue inline */}
      <View style={[styles.container, { height }]}>
        {renderMap(false)}

        {/* Boutons en haut a droite */}
        <View style={styles.inlineButtonsCol}>
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: btnBg }]}
            onPress={() => setIsFullscreen(true)}
            activeOpacity={0.7}
          >
            <Maximize2 size={16} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mapBtn, { backgroundColor: btnBg }]}
            onPress={() => setMapType(isHybrid ? 'standard' : 'hybrid')}
            activeOpacity={0.7}
          >
            {isHybrid ? <Map size={16} color="#FFF" /> : <Satellite size={16} color="#FFF" />}
          </TouchableOpacity>
        </View>

        {/* Badge distance en bas a gauche */}
        {distanceKm > 0 && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceBadgeText}>
              {distanceKm.toFixed(2)} km
            </Text>
          </View>
        )}
      </View>

      {/* Modal plein ecran */}
      <Modal visible={isFullscreen} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1 }}>
          {renderMap(true)}

          {/* Toolbar plein ecran */}
          <View style={[styles.fullscreenToolbar, { top: insets.top + 10 }]}>
            <TouchableOpacity
              style={[styles.mapBtn, { backgroundColor: btnBg }]}
              onPress={() => setIsFullscreen(false)}
              activeOpacity={0.7}
            >
              <X size={18} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.fullscreenToolbarRight}>
              <TouchableOpacity
                style={[styles.mapBtn, { backgroundColor: btnBg }]}
                onPress={() => setMapType(isHybrid ? 'standard' : 'hybrid')}
                activeOpacity={0.7}
              >
                {isHybrid ? <Map size={16} color="#FFF" /> : <Satellite size={16} color="#FFF" />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapBtn, { backgroundColor: btnBg }]}
                onPress={handleRecenter}
                activeOpacity={0.7}
              >
                <Navigation size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Legende en bas */}
          <View style={[styles.fullscreenLegend, { bottom: insets.bottom + 16 }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendText}>Depart</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>Arrivee</Text>
            </View>
            {distanceKm > 0 && (
              <Text style={styles.legendDistance}>{distanceKm.toFixed(2)} km</Text>
            )}
          </View>
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
  // Boutons inline
  inlineButtonsCol: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },
  mapBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Badge distance
  distanceBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Marqueur depart - cercle vert
  markerStart: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerStartInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  // Marqueur fin - cercle rouge
  markerEnd: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerEndInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  // Fullscreen toolbar
  fullscreenToolbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullscreenToolbarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  // Fullscreen legende
  fullscreenLegend: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  legendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  legendDistance: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});

export default WorkoutMapRoute;
