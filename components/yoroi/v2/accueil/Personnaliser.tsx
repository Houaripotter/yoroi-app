/**
 * « Personnaliser l'accueil » (vague 36) : une feuille pour montrer, cacher et reordonner les blocs
 * sous la carte Poids (Ta semaine, Ta forme du jour, Ton prochain rendez-vous, Le conseil du jour, Ton mois).
 * Le haut de l'accueil (scene, tes outils en raccourcis, Ton poids) reste fixe. Memorise dans AsyncStorage.
 * 16 octobre (Houari : « c'est grave caché ») : en bas de l'accueil, une carte « Personnalise ton accueil » avec
 * deux boutons : Tes blocs (la meme feuille qu'avant) et Tout personnaliser (l'ecran Personnaliser : scene,
 * personnage, courbes, widgets, icone). Elle est montree par la visite guidee (ancre accueil.personnaliser).
 * 27 octobre 2026 (maquette choisie « Ton accueil A, aperçu vivant ») : en haut, une mini maquette de l'accueil qui
 * montre l'ordre des blocs affiches, mise a jour en direct pendant le glisser ; puis la liste, une poignee a six
 * points pour ranger en glissant (reanimated et gesture handler, deja dans l'app), une pastille de couleur par bloc,
 * un interrupteur pastel et la ligne tiree surelevee. Les fleches restent en actions d'accessibilite (VoiceOver).
 * Ancienne version : _archive_ancien_design_2026-10-09/maquettes_choisies_2026-10-27/.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import Animated, { SlideInDown, interpolateColor, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BLOCS_ACCUEIL, DISPOSITION_DEFAUT, useDisposition } from '@/lib/v2/accueil/disposition';
import type { BlocAccueil } from '@/lib/v2/accueil/disposition';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import type { PaletteV2 } from '@/components/yoroi/livePalette';
import { Card, Icon, P, Press, useAccent } from './kit';
import { carteNeutre } from './domaines';
import { ApercuAccueil } from './ApercuAccueil';
import { traduire } from '@/lib/i18n/tr';

/** Hauteur d'une ligne de la liste (maquette : 52) */
const H = 52;

/** La pastille de chaque bloc, la meme dans la liste et dans l'apercu */
const COULEUR_BLOC: Record<BlocAccueil, keyof PaletteV2> = {
  semaine: 'pastelLilas',
  activite: 'pastelPeche',
  forme: 'pastelMenthe',
  mois: 'pastelCiel',
  progres: 'pastelSable',
  pesee: 'pastelMenthe',
  rendezvous: 'pastelPeche',
  mange: 'pastelSable',
  conseil: 'pastelLilas',
  photos: 'pastelCiel',
};

function couleurBloc(id: BlocAccueil): string {
  return P[COULEUR_BLOC[id]] as string;
}

function indexer(ordre: BlocAccueil[]): Record<string, number> {
  const r: Record<string, number> = {};
  ordre.forEach((id, i) => {
    r[id] = i;
  });
  return r;
}

function depuisPositions(pos: Record<string, number>): BlocAccueil[] {
  return (Object.keys(pos) as BlocAccueil[]).sort((a, b) => pos[a] - pos[b]);
}

/** La poignee a six points */
function Poignee() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      {[6, 12, 18].map((y) => (
        <React.Fragment key={y}>
          <Circle cx={9} cy={y} r={1.7} fill={P.poignee} />
          <Circle cx={15} cy={y} r={1.7} fill={P.poignee} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

/** Interrupteur pastel (46 x 28) : fond pastel et rond bleu nuit quand le bloc est affiche */
function Interrupteur({ on }: { on: boolean }) {
  const x = useSharedValue(on ? 21 : 3);
  useEffect(() => {
    x.value = withTiming(on ? 21 : 3, { duration: 160 });
  }, [on, x]);
  const rond = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? P.primary : P.line2 }}>
      <Animated.View
        style={[
          { position: 'absolute', top: 3, left: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: on ? P.accent : P.pureWhite, shadowColor: '#1D2033', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
          rond,
        ]}
      />
    </View>
  );
}

type LigneProps = {
  id: BlocAccueil;
  /** place de depart de la ligne */
  rang: number;
  titre: string;
  aide: string;
  on: boolean;
  n: number;
  positions: SharedValue<Record<string, number>>;
  actif: SharedValue<string>;
  onToggle: () => void;
  onDebut: () => void;
  onPrise: (id: BlocAccueil) => void;
  onBouge: (pos: Record<string, number>) => void;
  onFin: (pos: Record<string, number>, garder: boolean) => void;
  onDeplacer: (dir: -1 | 1) => void;
};

/** Une ligne : poignee (glisser), pastille, nom, interrupteur. Tiree, elle se souleve (ombre, leger zoom). */
function Ligne({ id, rang, titre, aide, on, n, positions, actif, onToggle, onDebut, onPrise, onBouge, onFin, onDeplacer }: LigneProps) {
  const y = useSharedValue(rang * H);
  const depart = useSharedValue(0);
  const leve = useSharedValue(0);

  // une autre ligne passe par ici : celle-ci glisse a sa nouvelle place
  useAnimatedReaction(
    () => positions.value[id],
    (p, avant) => {
      if (p !== avant && actif.value !== id) y.value = withTiming(p * H, { duration: 180 });
    },
  );

  const pan = Gesture.Pan()
    .activeOffsetY([-3, 3])
    .onBegin(() => {
      runOnJS(onDebut)();
    })
    .onStart(() => {
      actif.value = id;
      depart.value = y.value;
      leve.value = withTiming(1, { duration: 140 });
      runOnJS(onPrise)(id);
    })
    .onUpdate((e) => {
      const max = (n - 1) * H;
      const ny = Math.min(max, Math.max(0, depart.value + e.translationY));
      y.value = ny;
      const cible = Math.round(ny / H);
      const ancien = positions.value[id];
      if (cible !== ancien) {
        const next: Record<string, number> = { ...positions.value };
        Object.keys(next).forEach((k) => {
          if (next[k] === cible) next[k] = ancien;
        });
        next[id] = cible;
        positions.value = next;
        runOnJS(onBouge)(next);
      }
    })
    .onFinalize(() => {
      const etait = actif.value === id;
      if (etait) {
        y.value = withTiming(positions.value[id] * H, { duration: 160 });
        leve.value = withTiming(0, { duration: 160 });
        actif.value = '';
      }
      runOnJS(onFin)(positions.value, etait);
    });

  const style = useAnimatedStyle(() => ({
    top: y.value,
    zIndex: leve.value > 0 ? 10 : 0,
    borderRadius: 16 * leve.value,
    backgroundColor: interpolateColor(leve.value, [0, 1], ['transparent', P.white]),
    shadowOpacity: 0.16 * leve.value,
    elevation: leve.value > 0 ? 8 : 0,
    transform: [{ scale: 1 + 0.03 * leve.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: H, flexDirection: 'row', alignItems: 'center', shadowColor: '#1D2033', shadowRadius: 14, shadowOffset: { width: 0, height: 12 } }, style]}>
      <GestureDetector gesture={pan}>
        <View
          style={{ width: 38, height: H, paddingLeft: 12, justifyContent: 'center' }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={traduire('Glisse pour ranger {0}', titre)}
          accessibilityActions={[
            { name: 'decrement', label: traduire('Monter {0}', titre) },
            { name: 'increment', label: traduire('Descendre {0}', titre) },
          ]}
          onAccessibilityAction={(e) => onDeplacer(e.nativeEvent.actionName === 'decrement' ? -1 : 1)}
        >
          <Poignee />
        </View>
      </GestureDetector>
      <Pressable
        onPress={onToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={`${titre}, ${on ? traduire('affiché') : traduire('caché')}`}
        accessibilityHint={aide}
        style={{ flex: 1, height: H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: on ? couleurBloc(id) : P.pastelEteint }} />
        <Ink size={15} weight="bold" color={on ? P.ink : P.muted} numberOfLines={1} style={{ flex: 1 }}>
          {titre}
        </Ink>
        <Interrupteur on={on} />
      </Pressable>
    </Animated.View>
  );
}

/* L'ancienne mini maquette en barres de couleur (MiniAccueil) : _archive_ancien_design_2026-10-09/accueil_2_2026-10-27/Personnaliser.tsx */

/** La liste reglable, reutilisee par la feuille de l'accueil et par l'ecran Ton accueil des Reglages */
export function DispositionEditor({ onGlisse }: { onGlisse?: (actif: boolean) => void } = {}) {
  const { disposition, changer } = useDisposition();
  const { accent } = useAccent();
  const { ordre, caches } = disposition;
  const [vivant, setVivant] = useState<BlocAccueil[]>(ordre);
  const [tire, setTire] = useState<BlocAccueil | null>(null);
  const positions = useSharedValue<Record<string, number>>(indexer(ordre));
  const actif = useSharedValue<string>('');
  const courant = useRef(disposition);
  courant.current = disposition;
  const cle = ordre.join();

  // la disposition change (glisser termine, fleche, ailleurs) : la liste et l'apercu la suivent
  useEffect(() => {
    if (actif.value) return;
    setVivant(ordre);
    positions.value = indexer(ordre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  const move = (id: BlocAccueil, dir: -1 | 1) => {
    const o = courant.current.ordre;
    const i = o.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return;
    const next = [...o];
    [next[i], next[j]] = [next[j], next[i]];
    changer({ ordre: next, caches: courant.current.caches });
  };
  const toggle = (id: BlocAccueil) => {
    selectionAsync().catch(() => {});
    const c = courant.current.caches;
    changer({ ordre: courant.current.ordre, caches: c.includes(id) ? c.filter((x) => x !== id) : [...c, id] });
  };

  const onDebut = () => onGlisse?.(true);
  const onPrise = (id: BlocAccueil) => {
    setTire(id);
    selectionAsync().catch(() => {});
  };
  const onBouge = (pos: Record<string, number>) => {
    setVivant(depuisPositions(pos));
    selectionAsync().catch(() => {});
  };
  const onFin = (pos: Record<string, number>, garder: boolean) => {
    onGlisse?.(false);
    if (!garder) return;
    setTire(null);
    const next = depuisPositions(pos);
    if (next.join() !== courant.current.ordre.join()) changer({ ordre: next, caches: courant.current.caches });
  };

  const affiches = ordre.filter((id) => !caches.includes(id)).length;

  return (
    <View style={{ gap: 0 }}>
      {/* l'apercu vivant */}
      <View style={{ backgroundColor: P.white, borderRadius: 22, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center', shadowColor: '#1D2033', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
        {/* 27 octobre 2026 : la vraie miniature de ton accueil (ApercuAccueil.tsx), plus des barres de couleur */}
        <ApercuAccueil ordre={vivant} caches={caches} tire={tire} />
        <View style={{ flex: 1, gap: 6 }}>
          <Ink size={11} weight="black" color={P.etiquettePrune} style={{ letterSpacing: 1.4 }}>
            {traduire('Aperçu').toLocaleUpperCase()}
          </Ink>
          <Ink size={15} weight="black" style={{ lineHeight: 20 }}>
            {traduire('Ton accueil, dans cet ordre')}
          </Ink>
          <Ink size={12.5} weight="bold" color={P.ink2} style={{ lineHeight: 17.5 }}>
            {traduire('Tes outils et Ton poids restent en haut. Glisse une ligne pour la ranger. Touche l’aperçu pour le voir en grand.')}
          </Ink>
        </View>
      </View>

      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 2 }}>
        <Ink size={13} weight="black" color={P.ink2}>
          {traduire('Tes blocs')}
        </Ink>
        <Ink size={12.5} weight="extraBold" color={P.accentText}>
          {traduire('{0} affichés sur {1}', affiches, ordre.length)}
        </Ink>
      </View>

      {/* la liste : separateurs fixes dessous, lignes placees par leur position */}
      <View style={{ marginTop: 8, height: ordre.length * H, backgroundColor: P.white, borderRadius: 22, paddingHorizontal: 0, shadowColor: '#1D2033', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
        {ordre.slice(1).map((id, k) => (
          <View key={`sep-${id}`} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (k + 1) * H, height: 1, backgroundColor: P.line2 }} />
        ))}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          {ordre.map((id) => {
            const b = BLOCS_ACCUEIL.find((x) => x.id === id);
            if (!b) return null;
            return (
              <Ligne
                key={id}
                id={id}
                rang={ordre.indexOf(id)}
                titre={traduire(b.titre)}
                aide={b.aide}
                on={!caches.includes(id)}
                n={ordre.length}
                positions={positions}
                actif={actif}
                onToggle={() => toggle(id)}
                onDebut={onDebut}
                onPrise={onPrise}
                onBouge={onBouge}
                onFin={onFin}
                onDeplacer={(dir) => move(id, dir)}
              />
            );
          })}
        </View>
      </View>

      <Press onPress={() => changer(DISPOSITION_DEFAUT)} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Revenir à l’accueil de départ")}>
        <View style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, marginTop: 8 }}>
          <Ink size={14} weight="extraBold" color={accent}>
            {traduire("Revenir à l’accueil de départ")}</Ink>
        </View>
      </Press>
    </View>
  );
}

/** Le lien en bas de l'accueil et sa feuille */
export function PersonnaliserAccueil() {
  const [open, setOpen] = useState(false);
  // le glisser d'une ligne bloque le defilement de la feuille le temps du geste
  const [defile, setDefile] = useState(true);
  const insets = useSafeAreaInsets();
  const { accent } = useAccent();
  useYoroiTheme(); // se redessine quand le theme change
  const router = useRouter();
  return (
    <>
      <TourAnchor id="accueil.personnaliser">
        <Card style={[{ padding: 14, gap: 12, marginTop: 4 }, carteNeutre()]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="settings" size={20} color={accent} width={2.4} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15.5} weight="black" tight>
                {traduire("Personnalise ton accueil")}</Ink>
              <Ink size={12.5} weight="medium" color={P.ink2} numberOfLines={2}>
                {traduire("Affiche ou cache tes blocs, comme tes pas, change ta scène et tes courbes")}</Ink>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Press onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Tes blocs : montrer, cacher et ranger les blocs de l’accueil")}>
                <View style={{ minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Ink size={14} weight="extraBold" color={accent} numberOfLines={1}>
                    {traduire("Tes blocs")}</Ink>
                </View>
              </Press>
            </View>
            <View style={{ flex: 1.3 }}>
              <Press onPress={() => router.push(ROUTES_PERSONNALISER.personnaliser as any)} accessibilityRole="button" accessibilityLabel={traduire("Tout personnaliser : scène, personnage, courbes, widgets et icône")}>
                <View style={{ minHeight: 44, borderRadius: 22, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
                  <Ink size={14} weight="extraBold" color={P.onPrimary} numberOfLines={1}>
                    {traduire("Tout personnaliser")}</Ink>
                </View>
              </Press>
            </View>
          </View>
        </Card>
      </TourAnchor>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(16,19,27,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
            {/* 27 octobre 2026 (maquette Ton accueil A) : la feuille monte du bas */}
            <Animated.View entering={SlideInDown.duration(260)} style={{ maxHeight: '90%' }}>
              <Pressable onPress={() => {}} style={{ flexShrink: 1, backgroundColor: P.paper, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 10 }}>
                <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.pastelEteint }} />
                <ScrollView style={{ flexGrow: 0 }} bounces={false} scrollEnabled={defile} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: insets.bottom + 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <Ink size={26} weight="black" tight accessibilityRole="header">
                      {traduire("Ton accueil")}</Ink>
                    <Press onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} hitSlop={6}>
                      <View style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={15} weight="black" color={P.onPrimary}>
                          OK
                        </Ink>
                      </View>
                    </Press>
                  </View>
                  <DispositionEditor onGlisse={(g) => setDefile(!g)} />
                </ScrollView>
              </Pressable>
            </Animated.View>
          </Pressable>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
