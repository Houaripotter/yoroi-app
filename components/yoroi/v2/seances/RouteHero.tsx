/**
 * Carte du parcours en haut du detail d'une seance (14 octobre 2026), comme l'app Forme :
 * fond sombre et sobre, trace colore selon l'allure (jaune plus lent, vert plus rapide),
 * depart en vert, arrivee en rouge. Carte figee (pas de defilement involontaire), un appui
 * ouvre la carte en grand. Sur le web, le meme trace est dessine en SVG (pas de carte).
 */
import React, { useMemo } from 'react';
import { Platform, Pressable, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { PACE_COLORS, paceSegments, routeRegion } from '@/lib/v2/seances/workoutMath';
import type { RoutePoint } from '@/lib/v2/seances/workoutMath';

const START = '#3FA34D';
const END = '#D64541';
const BG = '#1E2433';

function Dot({ color }: { color: string }) {
  return <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color, borderWidth: 3, borderColor: '#FFFFFF' }} />;
}

/** Trace SVG sur fond sombre : web et repli. */
function TraceSvg({ points, width, height, clearTop, clearBottom }: { points: RoutePoint[]; width: number; height: number; clearTop: number; clearBottom: number }) {
  const geo = useMemo(() => {
    const segs = paceSegments(points);
    if (!segs.length) return null;
    const lat0 = points.reduce((a, p) => a + p.latitude, 0) / points.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = points.map((p) => p.longitude * k);
    const ys = points.map((p) => -p.latitude);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = 40, padTop = clearTop, padBottom = clearBottom;
    const s = Math.min((width - 2 * padX) / Math.max(1e-9, maxX - minX), (height - padTop - padBottom) / Math.max(1e-9, maxY - minY));
    const ox = (width - (maxX - minX) * s) / 2;
    const oy = padTop + (height - padTop - padBottom - (maxY - minY) * s) / 2;
    const P = (p: { latitude: number; longitude: number }) => ({ x: ox + (p.longitude * k - minX) * s, y: oy + (-p.latitude - minY) * s });
    const d = (cs: { latitude: number; longitude: number }[]) => cs.map((c, i) => { const q = P(c); return `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`; }).join(' ');
    return { segs: segs.map((sg) => ({ d: d(sg.coords), color: PACE_COLORS[sg.level] })), a: P(points[0]), b: P(points[points.length - 1]) };
  }, [points, width, height, clearTop, clearBottom]);
  if (!geo) return null;
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={width} height={height} fill={BG} />
      {geo.segs.map((sg, i) => <Path key={i} d={sg.d} stroke={sg.color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" fill="none" />)}
      <Circle cx={geo.b.x} cy={geo.b.y} r={8} fill={END} stroke="#FFFFFF" strokeWidth={3} />
      <Circle cx={geo.a.x} cy={geo.a.y} r={8} fill={START} stroke="#FFFFFF" strokeWidth={3} />
    </Svg>
  );
}

/**
 * clearTop et clearBottom : hauteur (px) cachee en haut (boutons) et en bas (carte du titre qui
 * chevauche) ; le trace est cadre dans la bande visible entre les deux.
 */
export function RouteHero({ points, width, height, onPress, interactive, clearTop = 60, clearBottom = 40 }: { points: RoutePoint[]; width: number; height: number; onPress?: () => void; interactive?: boolean; clearTop?: number; clearBottom?: number }) {
  const segs = useMemo(() => paceSegments(points), [points]);
  const region = useMemo(() => {
    const r = routeRegion(points, 1.25);
    if (!r) return null;
    const visible = Math.max(80, height - clearTop - clearBottom);
    const f = visible / height;
    // l'echelle est fixee par la dimension la plus contrainte, a la proportion de la bande visible
    const latD = Math.max(r.latitudeDelta / f, (r.longitudeDelta * height) / width);
    const centerOffset = ((clearBottom - clearTop) / 2 / height) * latD;
    return { latitude: r.latitude - centerOffset, longitude: r.longitude, latitudeDelta: latD, longitudeDelta: (latD * width) / height };
  }, [points, width, height, clearTop, clearBottom]);
  if (points.length < 2 || !region) return null;
  const a = points[0];
  const b = points[points.length - 1];

  const content = Platform.OS === 'web' ? (
    <TraceSvg points={points} width={width} height={height} clearTop={clearTop} clearBottom={clearBottom} />
  ) : (
    <View pointerEvents={interactive ? 'auto' : 'none'} style={{ width, height }}>
    <MapView
      provider={PROVIDER_DEFAULT}
      style={{ width, height }}
      initialRegion={region}
      userInterfaceStyle="dark"
      mapType="mutedStandard"
      showsPointsOfInterests={false}
      showsBuildings={false}
      showsCompass={false}
      showsScale={false}
      toolbarEnabled={false}
      scrollEnabled={!!interactive}
      zoomEnabled={!!interactive}
      pitchEnabled={false}
      rotateEnabled={!!interactive}
    >
      {segs.map((sg, i) => <Polyline key={i} coordinates={sg.coords} strokeColor={PACE_COLORS[sg.level]} strokeWidth={5} lineJoin="round" lineCap="round" />)}
      <Marker coordinate={{ latitude: b.latitude, longitude: b.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><Dot color={END} /></Marker>
      <Marker coordinate={{ latitude: a.latitude, longitude: a.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><Dot color={START} /></Marker>
    </MapView>
    </View>
  );

  if (!onPress) return <View style={{ width, height, backgroundColor: BG }}>{content}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Ton parcours sur la carte, départ en vert, arrivée en rouge. Touche pour agrandir." style={{ width, height, backgroundColor: BG }}>
      {content}
    </Pressable>
  );
}
