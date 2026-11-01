/**
 * Carte du parcours en haut du detail d'une seance (14 octobre 2026), comme l'app Forme :
 * fond sombre et sobre, trace colore selon l'allure (jaune plus lent, vert plus rapide),
 * depart en vert, arrivee en rouge. Carte figee (pas de defilement involontaire), un appui
 * ouvre la carte en grand. Sur le web, le meme trace est dessine en SVG (pas de carte).
 * 1er novembre 2026 (Houari : « je ne peux ni toucher la carte ni zoomer ») : la carte native avalait le toucher
 * malgre pointerEvents none sur son conteneur. Le toucher passe maintenant par un calque transparent POSE PAR-DESSUS
 * la carte, avec une pastille « Agrandir » (sticker) qui montre qu'on peut toucher. En grand (RouteCarteGrand) :
 * pincement pour zoomer, glisser pour se deplacer, rotation coupee, bouton Fermer bien visible et bouton Recentrer.
 * Les mentions legales d'Apple (« Plans », « Mentions legales ») ne sont plus recouvertes : rien n'est pose sur le
 * bas de la carte, et en grand le panneau d'infos est sous la carte, pas par-dessus.
 */
import React, { useMemo, useRef } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { StickerSinon } from '@/components/yoroi/v2/ui/StickerSinon';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { PACE_COLORS, paceSegments, routeRegion } from '@/lib/v2/seances/workoutMath';
import type { RoutePoint } from '@/lib/v2/seances/workoutMath';
import { traduire } from '@/lib/i18n/tr';

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
export function RouteHero({ points, width, height, onPress, interactive, clearTop = 60, clearBottom = 40, mapRef }: { points: RoutePoint[]; width: number; height: number; onPress?: () => void; interactive?: boolean; clearTop?: number; clearBottom?: number; mapRef?: React.RefObject<MapView | null> }) {
  const segs = useMemo(() => paceSegments(points), [points]);
  const region = useMemo(() => cadrage(points, width, height, clearTop, clearBottom), [points, width, height, clearTop, clearBottom]);
  if (points.length < 2 || !region) return null;
  const a = points[0];
  const b = points[points.length - 1];

  const content = Platform.OS === 'web' ? (
    <TraceSvg points={points} width={width} height={height} clearTop={clearTop} clearBottom={clearBottom} />
  ) : (
    <MapView
      ref={mapRef}
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
      rotateEnabled={false}
    >
      {segs.map((sg, i) => <Polyline key={i} coordinates={sg.coords} strokeColor={PACE_COLORS[sg.level]} strokeWidth={5} lineJoin="round" lineCap="round" />)}
      <Marker coordinate={{ latitude: b.latitude, longitude: b.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><Dot color={END} /></Marker>
      <Marker coordinate={{ latitude: a.latitude, longitude: a.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}><Dot color={START} /></Marker>
    </MapView>
  );

  if (!onPress) return <View style={{ width, height, backgroundColor: BG }}>{content}</View>;
  // carte figee : le calque transparent par-dessus recoit le toucher (la carte native ne le prend plus)
  return (
    <View style={{ width, height, backgroundColor: BG }}>
      <View pointerEvents="none" style={{ width, height }}>{content}</View>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire("Ton parcours sur la carte, départ en vert, arrivée en rouge. Touche pour agrandir.")} style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <View style={{ position: 'absolute', right: 14, bottom: Math.max(34, clearBottom - 44), flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 12, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
          <StickerSinon nom="recherche" taille={24} />
          <Ink size={13} weight="black" color="#1E2433">{traduire("Agrandir")}</Ink>
        </View>
      </Pressable>
    </View>
  );
}

/** Cadrage du trace dans la bande visible (entre clearTop et clearBottom) */
function cadrage(points: RoutePoint[], width: number, height: number, clearTop: number, clearBottom: number) {
  const r = routeRegion(points, 1.25);
  if (!r) return null;
  const visible = Math.max(80, height - clearTop - clearBottom);
  const f = visible / height;
  // l'echelle est fixee par la dimension la plus contrainte, a la proportion de la bande visible
  const latD = Math.max(r.latitudeDelta / f, (r.longitudeDelta * height) / width);
  const centerOffset = ((clearBottom - clearTop) / 2 / height) * latD;
  return { latitude: r.latitude - centerOffset, longitude: r.longitude, latitudeDelta: latD, longitudeDelta: (latD * width) / height };
}

/**
 * Le parcours en grand, interactif : pincement pour zoomer, glisser pour se deplacer, rotation coupee.
 * Fermer (en haut a gauche) et Recentrer (en haut a droite) bien visibles ; le panneau d'infos est sous la carte
 * pour laisser les mentions legales d'Apple lisibles en bas de la carte.
 */
export function RouteCarteGrand({ points, visible, onClose, width, height, info, legende }: { points: RoutePoint[]; visible: boolean; onClose: () => void; width: number; height: number; info?: string; legende?: string }) {
  const insets = useSafeAreaInsets();
  const ref = useRef<MapView | null>(null);
  const panneau = (info ? 22 : 0) + (legende ? 34 : 0) + 24 + insets.bottom;
  const hauteurCarte = Math.max(200, height - panneau);
  const clearTop = insets.top + 70;
  const clearBottom = 40;
  const region = useMemo(() => cadrage(points, width, hauteurCarte, clearTop, clearBottom), [points, width, hauteurCarte, clearTop]);
  const recentrer = () => {
    if (region) ref.current?.animateToRegion(region, 350);
  };
  const bouton = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingLeft: 8, paddingRight: 14, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 };
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: BG }}>
        <RouteHero points={points} width={width} height={hauteurCarte} interactive clearTop={clearTop} clearBottom={clearBottom} mapRef={ref} />
        <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={traduire("Fermer la carte")} style={({ pressed }) => [bouton, { opacity: pressed ? 0.8 : 1 }]}>
            <StickerSinon nom="quitter" taille={28} />
            <Ink size={15} weight="black" color="#1E2433">{traduire("Fermer")}</Ink>
          </Pressable>
          {Platform.OS === 'web' ? null : (
            <Pressable onPress={recentrer} hitSlop={8} accessibilityRole="button" accessibilityLabel={traduire("Recentrer la carte sur ton parcours")} style={({ pressed }) => [bouton, { opacity: pressed ? 0.8 : 1 }]}>
              <StickerSinon nom="boussole" taille={28} />
              <Ink size={15} weight="black" color="#1E2433">{traduire("Recentrer")}</Ink>
            </Pressable>
          )}
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, gap: 4 }}>
          {info ? <Ink size={13} weight="bold" color="#FFFFFF">{info}</Ink> : null}
          {legende ? <Ink size={11} color="rgba(255,255,255,0.75)">{legende}</Ink> : null}
        </View>
      </View>
    </Modal>
  );
}
