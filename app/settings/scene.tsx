/**
 * Ta scene (vague 44, refondue le 14 octobre 2026 pour la presentation).
 * - En haut, l'apercu fidele de ton en-tete d'accueil (la scene, ton personnage, la salutation, le fondu),
 *   anime si la scene l'est, avec ses reperes (Animee, Son, Premium) et le bouton Ecouter son ambiance.
 * - Une legende courte des reperes, puis les filtres rapides (Toutes, Animees, Gratuites) et les packs.
 * - La galerie rangee par pack (titre, phrase, nombre de scenes), en grille de deux colonnes : nom et phrase
 *   en entier, badges Animee, Son, Premium (cadenas), Nouveau, et la coche sur ta scene.
 *   Une seule video joue a la fois (presentation.ts, vignetteQuiJoue) ; image fixe si « Reduire les animations ».
 * - « Change a chaque ouverture » (Premium) : chaque pack en ligne, son nombre de scenes, et les scenes du pack
 *   qui tourne sous ton choix.
 * - La carte « Animation et son » (memes reglages).
 * - En bas, la scene selectionnee (vignette, nom, condition) et le bouton « Choisir cette scene » (ou Debloquer).
 * - 15 octobre : quand tu descends dans la galerie, l'apercu reste visible : un bandeau compact colle en haut
 *   (la scene, ton personnage, la salutation, en reduction fidele), mis a jour au toucher d'une vignette ;
 *   un toucher sur le bandeau remonte a l'apercu en grand.
 * - 19 octobre : presentation refaite pour etre evidente (maquette _propositions/scene_reglage_2026-10-19/).
 *   Sur la premiere vue, sans defiler : l'apercu anime, le nom de la scene, puis « Ambiance sonore »
 *   (Bruitage et Musique en pastilles, chacune avec son bouton Ecouter, et Sans son / Sans musique).
 *   Chaque pack qui peut tourner a sa ligne « Change a chaque ouverture » sous son titre (Voyages en tete).
 *   Une scene verrouillee porte sur son image la facon de la debloquer (themeCondition).
 *   La legende des reperes et le rappel de rotation sont retires. Ancienne version :
 *   _archive_ancien_design_2026-10-09/scene_reglage_2026-10-19/scene.tsx. Memes donnees, memes regles.
 * Toutes les donnees viennent des registres (lib/v2/espace/presentation.ts). La logique (choix, Premium, rotation)
 * est celle de la vague 44. Remplace aussi l'ancienne page /themes (app/themes.tsx renvoie ici).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioPlayer } from 'expo-audio';
import Svg, { Path } from 'react-native-svg';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, EspaceScreen, Icon, Segmented, ToggleRow } from '@/components/yoroi/v2/espace/ui';
import { isSceneLocked } from '@/components/yoroi/v2/espace/Pickers';
import { SceneHero } from '@/components/yoroi/v2/accueil/Scene';
import { P } from '@/components/yoroi/livePalette';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { usePremium } from '@/context/PremiumContext';
import { themeById, themeCondition } from '@/lib/v2/dojo/personnages';
import type { SceneId, SceneRotation } from '@/lib/v2/espace';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { AMBIANCES, MUSIQUES, aUneVersionAnimee, sceneAnimee, type SonScene } from '@/lib/v2/espace/scenesAnimees';
import { VOLUMES, useReglagesSon } from '@/lib/v2/espace/sonScene';
import { VideoScene, useEcranVisible, useReduireAnimations, useVideoDeScene } from '@/components/yoroi/v2/accueil/SceneAnimee';
import {
  ficheScene,
  filtresGalerie,
  sectionDuPack,
  sectionsGalerie,
  scenesQuiTournent,
  sonConseille,
  vignetteQuiJoue,
  type FiltreGalerie,
} from '@/lib/v2/espace/presentation';

const MARGE = 22;
const ECART = 12;
/** fond translucide des badges poses sur l'image */
const VOILE_BADGE = 'rgba(20,23,32,0.72)';
/** 19 octobre : bandeau du bas d'une vignette verrouillee */
const VOILE_VERROU = 'rgba(15,17,24,0.82)';

/** Comment debloquer une scene, en court pour une vignette (le texte vient de themeCondition) */
function conditionCourte(id: SceneId): string {
  const t = themeCondition(themeById(id));
  if (!t) return 'Avec Premium';
  return t.replace(' dans le Dojo', '').replace(', ou avec Premium', ', ou Premium').replace(/^À (\d+) jours/, '$1 jours');
}

type ChoixRotation = 'fixe' | SceneRotation;
const ROTATIONS: { key: ChoixRotation; label: string; sub: string }[] = [
  { key: 'fixe', label: 'Non', sub: 'Ta scène reste en place' },
  { key: 'classique', label: 'Classique', sub: 'Salle, parc, ville, mer et désert' },
  { key: 'nature', label: 'Nature et ville', sub: 'Plage, forêt, désert et buildings' },
  { key: 'voyages', label: 'Pack Voyages', sub: 'Tokyo, Paris, désert, neige et étoiles, animées' },
  { key: 'samourai', label: 'Samouraï', sub: 'Katanas, armures et châteaux' },
  { key: 'lanternes', label: 'Lanternes de nuit', sub: 'Ruelles et auberges de nuit' },
  { key: 'toutes', label: 'Toutes', sub: 'Tous les packs mélangés' },
];

// ── Petits pictos des badges ─────────────────────────────────────────────

function PictoLecture({ size = 10, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4.5v15l12.5-7.5z" fill={color} />
    </Svg>
  );
}

function PictoSon({ size = 12, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

type Repere = 'animee' | 'son' | 'premium' | 'annuel' | 'nouveau';

/** Un badge, sur l'image (sombre translucide) ou dans la legende */
function Badge({ type, surImage = true }: { type: Repere; surImage?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const nouveau = type === 'nouveau';
  const bg = nouveau ? c.goldLight : surImage ? VOILE_BADGE : '#2A2E3A';
  const fg = nouveau ? '#1D2029' : '#FFFFFF';
  const label = type === 'animee' ? 'Animée' : type === 'son' ? 'Son' : type === 'premium' ? 'Premium' : type === 'annuel' ? 'Annuel' : 'Nouveau';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: bg }}>
      {type === 'animee' ? <PictoLecture size={9} color={c.goldLight} /> : null}
      {type === 'son' ? <PictoSon size={11} color={c.goldLight} /> : null}
      {type === 'premium' || type === 'annuel' ? <Icon name="lock" size={10} color={c.goldLight} stroke={2.8} /> : null}
      <Ink size={11} weight="extraBold" color={fg} maxFontSizeMultiplier={1.2}>
        {label}
      </Ink>
    </View>
  );
}

/** La coche ronde de ta scene */
function Coche({ size = 26 }: { size?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' }}>
      <Icon name="check" size={Math.round(size * 0.52)} color={c.onAccent} stroke={3.2} />
    </View>
  );
}

// ── Ecouter l'ambiance de la scene selectionnee ──────────────────────────

/** 19 octobre : le son d'une pastille (« scene » : l'ambiance conseillee de la scene affichee) */
function sonDeCle(cle: string | null, scene: SceneId): { son: SonScene | null; ambiance: boolean } {
  if (!cle) return { son: null, ambiance: false };
  if (cle === 'amb:scene') return { son: sonConseille(scene).ambiance, ambiance: true };
  if (cle.startsWith('amb:')) return { son: AMBIANCES.find((a) => `amb:${a.id}` === cle) ?? null, ambiance: true };
  return { son: MUSIQUES.find((m) => `mus:${m.id}` === cle) ?? null, ambiance: false };
}

/** Ecouter un son sur cette page : une seule pastille joue a la fois, elle se tait quand la scene change */
function useEcoute(scene: SceneId) {
  const [cle, setCle] = useState<string | null>(null);
  const { son, ambiance } = sonDeCle(cle, scene);
  const [r] = useReglagesSon();
  const { visible } = useEcranVisible();
  const player = useAudioPlayer(son?.source ?? null);
  // une autre scene : on se tait
  useEffect(() => setCle(null), [scene]);
  useEffect(() => {
    try {
      player.loop = true;
      player.volume = Math.min(1, r.volume * (ambiance ? 1.3 : 1));
      if (cle && visible && son) player.play();
      else player.pause();
    } catch {
      // lecteur libere
    }
  }, [player, cle, visible, son, ambiance, r.volume]);
  useEffect(
    () => () => {
      try {
        player.pause();
      } catch {
        // deja libere
      }
    },
    [player],
  );
  return { enCours: son ? cle : null, basculer: (k: string) => setCle((v) => (v === k ? null : k)) };
}

export default function TaScene() {
  const { width: ecran, height: hauteurEcran } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace, update } = useEspace();
  const { profile, armure } = useIdentite();
  const { isPremium, isAnnualPremium } = usePremium();
  const rankIndex = armure?.rank.index ?? 0;
  const reduire = useReduireAnimations();
  const { visible: ecranVisible } = useEcranVisible();

  // ta scene choisie a la main (avec la rotation, espace.scene est la scene tiree au lancement)
  const choisie: SceneId = espace.sceneFixe ?? espace.scene;
  const rotation: ChoixRotation = espace.sceneRotation ?? 'fixe';

  const [filtre, setFiltre] = useState<FiltreGalerie>('toutes');
  const filtres = useMemo(() => filtresGalerie(), []);
  const sections = useMemo(() => sectionsGalerie(filtre), [filtre]);
  const [focus, setFocus] = useState<SceneId>(choisie);
  // ta scene change (choix fait ici ou ailleurs) : l'apercu la suit
  useEffect(() => setFocus(choisie), [choisie]);

  const scrollRef = useRef<ScrollView>(null);
  const yRotation = useRef(0);
  // 15 octobre : le bandeau d'apercu compact apparait des que l'apercu du haut sort a moitie de l'ecran
  const insets = useSafeAreaInsets();
  const seuilBandeau = useRef(Number.POSITIVE_INFINITY);
  const bandeauRef = useRef(false);
  const [bandeau, setBandeau] = useState(false);
  const surDefilement = useCallback(
    (y: number) => {
      mesurerRef.current();
      const b = y > seuilBandeau.current;
      if (b !== bandeauRef.current) {
        bandeauRef.current = b;
        setBandeau(b);
      }
    },
    [],
  );
  const mesurerRef = useRef<() => void>(() => {});

  const fiche = ficheScene(focus);
  const verrou = isSceneLocked(focus, rankIndex, isPremium, isAnnualPremium);
  const condition = themeCondition(themeById(focus));
  const estChoisie = focus === choisie && rotation === 'fixe';
  const apercuJoue = useVideoDeScene(focus) != null;

  // ── quelle vignette animee est visible (une seule video joue a la fois) ──
  const refsAnimees = useRef<Map<SceneId, View>>(new Map());
  const [visibles, setVisibles] = useState<SceneId[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mesurer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const ids = Array.from(refsAnimees.current.entries());
      if (!ids.length) {
        setVisibles((old) => (old.length ? [] : old));
        return;
      }
      const vus: { id: SceneId; y: number }[] = [];
      let restants = ids.length;
      ids.forEach(([id, v]) => {
        const fin = (y: number, h: number) => {
          const milieu = y + h / 2;
          if (h > 0 && milieu > 60 && milieu < hauteurEcran - 150) vus.push({ id, y });
          restants -= 1;
          if (restants === 0) {
            const tri = vus.sort((a, b) => a.y - b.y).map((x) => x.id);
            setVisibles((old) => (old.join() === tri.join() ? old : tri));
          }
        };
        try {
          v.measureInWindow((_x, y, _w, h) => fin(y, h));
        } catch {
          fin(0, 0);
        }
      });
    }, 140);
  }, [hauteurEcran]);
  useEffect(() => {
    mesurer();
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [filtre, mesurer]);
  mesurerRef.current = mesurer;
  const joueVignette = ecranVisible ? vignetteQuiJoue({ focus, visibles, apercuJoue, reduire }) : null;

  const viser = (id: SceneId) => {
    selectionAsync().catch(() => {});
    setFocus(id);
  };

  const choisir = () => {
    if (verrou) {
      ouvrirPaywall('scenes');
      return;
    }
    update({ scene: focus }).catch(() => {});
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };

  const choisirRotation = (v: ChoixRotation) => {
    selectionAsync().catch(() => {});
    if (v === 'fixe') {
      update({ sceneRotation: undefined }).catch(() => {});
      return;
    }
    if (!isPremium) {
      ouvrirPaywall('scenes');
      return;
    }
    update({ sceneRotation: v }).catch(() => {});
  };

  const changerFiltre = (f: FiltreGalerie) => {
    selectionAsync().catch(() => {});
    setFiltre(f);
  };

  const apercuW = ecran - 2 * MARGE;
  const carteW = Math.floor((ecran - 2 * MARGE - ECART) / 2);
  const imageH = Math.round(carteW * 0.62);
  const photo = espace.identite === 'photo' ? profile?.profile_photo ?? null : null;
  const prenom = profile?.name?.trim().split(' ')[0] || null;
  const packTourne = rotation === 'fixe' ? null : sectionDuPack(rotation);
  const libelleRotation = ROTATIONS.find((r) => r.key === rotation)?.label ?? 'Non';

  const etatFocus =
    verrou && condition
      ? condition
      : estChoisie
        ? 'Sur ton accueil en ce moment'
        : focus === choisie
          ? 'Ta scène, la rotation est active'
          : fiche.animee
            ? 'Scène animée, pas encore choisie'
            : 'Pas encore choisie';

  const footer = (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} accessibilityRole="button" accessibilityLabel="Revoir l’aperçu en haut" hitSlop={6}>
          <Image source={fiche.image} style={{ width: 64, height: 40, borderRadius: 10, backgroundColor: c.fillSoft }} contentFit="cover" />
        </Pressable>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={15} weight="extraBold" numberOfLines={1}>
            {fiche.nom}
          </Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {verrou ? <Icon name="lock" size={12} color={c.goldDeep} stroke={2.6} /> : null}
            <Ink size={12} weight="bold" color={c.textSecondary} style={{ flexShrink: 1 }}>
              {etatFocus}
            </Ink>
          </View>
        </View>
      </View>
      {estChoisie ? (
        <Button tone="ghost" label="C’est ta scène" icon="check" disabled onPress={() => {}} />
      ) : (
        <Button tone="accent" label={verrou ? (fiche.annuel ? 'Voir l’abonnement annuel' : 'Débloquer avec Premium') : 'Choisir cette scène'} onPress={choisir} />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
    <EspaceScreen title="Ta scène" subtitle="Le décor et le son de ton accueil" gap={16} footer={footer} scrollRef={scrollRef} onScrollY={surDefilement}>
      {/* apercu fidele de ton en-tete d'accueil, et les reperes de la scene selectionnee */}
      <View onLayout={(e) => (seuilBandeau.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height * 0.55)} style={{ height: 268, borderRadius: 26, overflow: 'hidden', backgroundColor: P.paper, borderWidth: 1, borderColor: c.border }} accessibilityLabel={`Aperçu de ton accueil avec la scène ${fiche.nom}`}>
        <SceneHero apercu largeur={apercuW} top={14} scene={focus} name={prenom} personnage={espace.personnage} rankIndex={rankIndex} photo={photo} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6 }}>
          {fiche.animee ? <Badge type="animee" /> : null}
          {fiche.son ? <Badge type="son" /> : null}
          {verrou ? <Badge type={fiche.annuel ? 'annuel' : 'premium'} /> : null}
        </View>
      </View>

      {/* la scene selectionnee : nom et phrase */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, rowGap: 2, marginTop: -4, paddingHorizontal: 2 }}>
        <Ink size={19} weight="black" tight>
          {fiche.nom}
        </Ink>
        <Ink size={13} color={c.textSecondary}>
          {fiche.phrase}
        </Ink>
      </View>

      {/* 19 octobre : le son, juste sous l'apercu, visible sans defiler */}
      <AmbianceSonore scene={focus} />

      {/* filtres rapides puis packs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -MARGE }} contentContainerStyle={{ paddingHorizontal: MARGE, gap: 8 }}>
        {filtres.map((f, i) => {
          const on = f.key === filtre;
          return (
            <React.Fragment key={f.key}>
              {i === 3 ? <View style={{ width: 1, height: 24, alignSelf: 'center', backgroundColor: c.border, marginHorizontal: 2 }} /> : null}
              <Pressable
                onPress={() => changerFiltre(f.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${f.label}, ${f.nombre} scènes`}
                style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? c.accent : pressed ? c.fillSoft : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border })}
              >
                {f.key === 'animees' ? <PictoLecture size={10} color={on ? c.onAccent : c.ink} /> : null}
                <Ink size={14} weight="extraBold" color={on ? c.onAccent : c.ink}>
                  {f.label}
                </Ink>
                <Ink size={12} weight="bold" color={on ? c.onAccent : c.textMuted}>
                  {f.nombre}
                </Ink>
              </Pressable>
            </React.Fragment>
          );
        })}
      </ScrollView>

      {/* la galerie, rangee par pack */}
      {sections.map((s) => {
        const lignes: SceneId[][] = [];
        for (let i = 0; i < s.scenes.length; i += 2) lignes.push(s.scenes.slice(i, i + 2));
        return (
          <View key={s.key} style={{ gap: 12, marginTop: 4 }}>
            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8, rowGap: 4, flexWrap: 'wrap' }}>
                <Ink size={18} weight="black" tight accessibilityRole="header">
                  {s.titre}
                </Ink>
                <Ink size={13} weight="bold" color={c.textMuted}>
                  {`${s.scenes.length} ${s.scenes.length > 1 ? 'scènes' : 'scène'}`}
                </Ink>
                {packTourne === s.key ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: c.fillSoft }}>
                    <Icon name="sync" size={11} color={c.accent} stroke={2.6} />
                    <Ink size={11} weight="extraBold" color={c.accent}>
                      Tourne
                    </Ink>
                  </View>
                ) : null}
              </View>
              <Ink size={13} color={c.textSecondary}>
                {s.phrase}
              </Ink>
            </View>
            {/* 19 octobre : la rotation du pack, sous son titre (meme choix que la carte du bas) */}
            {ROTATIONS.some((r) => r.key === s.key) ? (
              <TournePack
                titre={s.titre}
                on={rotation === s.key}
                isPremium={isPremium}
                onPress={() => choisirRotation(rotation === s.key ? 'fixe' : (s.key as SceneRotation))}
              />
            ) : null}
            {lignes.map((ligne) => (
              <View key={ligne.join()} style={{ flexDirection: 'row', gap: ECART, alignItems: 'flex-start' }}>
                {ligne.map((id) => (
                  <Vignette
                    key={id}
                    id={id}
                    largeur={carteW}
                    hauteurImage={imageH}
                    on={id === focus}
                    tienne={id === choisie}
                    locked={isSceneLocked(id, rankIndex, isPremium, isAnnualPremium)}
                    joue={joueVignette === id}
                    onPress={() => viser(id)}
                    refAnimee={
                      aUneVersionAnimee(id)
                        ? (v) => {
                            if (v) refsAnimees.current.set(id, v);
                            else refsAnimees.current.delete(id);
                          }
                        : undefined
                    }
                    onLayoutAnimee={aUneVersionAnimee(id) ? mesurer : undefined}
                  />
                ))}
              </View>
            ))}
          </View>
        );
      })}

      {/* la scene qui change a chaque ouverture (Premium) */}
      <View onLayout={(e) => (yRotation.current = e.nativeEvent.layout.y)} style={{ marginTop: 8 }}>
        <Card>
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={17} weight="black" tight>
                  Change à chaque ouverture, tous les choix
                </Ink>
                <Ink size={13} color={c.textSecondary}>
                  Une scène du pack au hasard à chaque ouverture, et quand tu reviens après 30 minutes. Jamais deux fois de suite.
                </Ink>
              </View>
              {!isPremium ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: c.fillSoft }}>
                  <Icon name="lock" size={11} color={c.goldDeep} stroke={2.6} />
                  <Ink size={11} weight="extraBold" color={c.textSecondary}>
                    Premium
                  </Ink>
                </View>
              ) : null}
            </View>
            {/* 14 octobre : l'etat reel, pour ne jamais avoir l'air de marcher sans marcher */}
            {!isPremium && rotation !== 'fixe' ? (
              <Pressable onPress={() => ouvrirPaywall('scenes')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.fillSoft }}>
                <Icon name="lock" size={16} color={c.goldDeep} stroke={2.4} />
                <Ink size={13} weight="bold" color={c.ink} style={{ flex: 1 }}>
                  Premium n’est pas actif : la scène qui change à chaque ouverture s’arrête. Touche ici pour voir Premium.
                </Ink>
              </Pressable>
            ) : !isPremium ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.fillSoft }}>
                <Icon name="lock" size={16} color={c.goldDeep} stroke={2.4} />
                <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1 }}>
                  Réservé à Premium : touche un pack pour voir l’offre.
                </Ink>
              </View>
            ) : rotation !== 'fixe' && espace.sceneFixe ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: c.fillSoft }}>
                <Icon name="check" size={16} color={c.accent} stroke={2.6} />
                <Ink size={13} weight="bold" color={c.ink} style={{ flex: 1 }}>
                  {`Actif. En ce moment : ${ficheScene(espace.scene).nom}. La prochaine sera différente.`}
                </Ink>
              </View>
            ) : null}
            <View style={{ gap: 8 }}>
              {ROTATIONS.map((r) => (
                <LignePack key={r.key} r={r} on={r.key === rotation} choisie={choisie} enCours={espace.scene} onPress={() => choisirRotation(r.key)} />
              ))}
            </View>
          </View>
        </Card>
      </View>

      {/* 13 octobre : la scene animee (le son est monte sous l'apercu le 19 octobre) */}
      <Animation scene={focus} />
    </EspaceScreen>

      {/* 15 octobre : l'apercu reste visible quand tu descends, en bandeau compact colle en haut */}
      {bandeau ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: insets.top + 6, paddingHorizontal: MARGE, paddingBottom: 10, backgroundColor: c.background, borderBottomWidth: 1, borderColor: c.divider, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <Pressable
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            accessibilityRole="button"
            accessibilityLabel={`Aperçu de ton accueil avec la scène ${fiche.nom}. Toucher pour le revoir en grand`}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <ApercuCompact largeur={apercuW} scene={focus} prenom={prenom} personnage={espace.personnage} rankIndex={rankIndex} photo={photo} />
            <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 }}>
              {verrou ? <Badge type={fiche.annuel ? 'annuel' : 'premium'} /> : null}
              {estChoisie ? <Coche size={22} /> : null}
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * Bandeau compact : l'en-tete d'accueil en reduction fidele. La scene garde la largeur qui conserve son cadrage
 * vertical (au plus 515 points avant reduction), le personnage et la salutation sont donc places exactement comme
 * en grand ; le ciel du haut est rogne (40 points) pour garder le bandeau bas.
 */
const HAUTEUR_SCENE_BANDEAU = 236;
const ROGNE_HAUT = 40;

/** L'apercu en reduction : la meme scene, le meme personnage, la meme salutation, en image fixe */
function ApercuCompact({ largeur, scene, prenom, personnage, rankIndex, photo }: { largeur: number; scene: SceneId; prenom: string | null; personnage: string; rankIndex: number; photo: string | null }) {
  const s = Math.max(0.56, largeur / 515);
  const w = largeur / s;
  return (
    <View style={{ width: largeur, height: Math.round((HAUTEUR_SCENE_BANDEAU - ROGNE_HAUT) * s), borderRadius: 18, overflow: 'hidden', backgroundColor: P.paper }}>
      <View style={{ position: 'absolute', left: 0, top: -ROGNE_HAUT * s, width: w, height: HAUTEUR_SCENE_BANDEAU, transform: [{ scale: s }], transformOrigin: 'top left' } as object}>
        <SceneHero apercu sansVideo largeur={w} top={14} scene={scene} name={prenom} personnage={personnage} rankIndex={rankIndex} photo={photo} />
      </View>
    </View>
  );
}

/** Une vignette de la galerie : image (ou sa video), badges, nom et phrase en entier */
function Vignette({
  id,
  largeur,
  hauteurImage,
  on,
  tienne,
  locked,
  joue,
  onPress,
  refAnimee,
  onLayoutAnimee,
}: {
  id: SceneId;
  largeur: number;
  hauteurImage: number;
  on: boolean;
  tienne: boolean;
  locked: boolean;
  joue: boolean;
  onPress: () => void;
  refAnimee?: (v: View | null) => void;
  onLayoutAnimee?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const s = ficheScene(id);
  const video = joue ? sceneAnimee(id)?.video ?? null : null;
  const reperes = [s.animee ? 'animée' : '', s.son ? 'avec son' : '', locked ? (s.annuel ? 'avec l’abonnement annuel' : 'avec Premium') : '', s.nouveau ? 'nouvelle' : '', tienne ? 'ta scène' : '']
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Scène ${s.nom}${reperes ? `, ${reperes}` : ''}`}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ width: largeur, gap: 8, opacity: pressed ? 0.9 : 1 })}
    >
      <View
        ref={refAnimee}
        onLayout={onLayoutAnimee}
        style={{ height: hauteurImage, borderRadius: 18, overflow: 'hidden', borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.fillSoft }}
      >
        <Image source={s.image} style={{ width: '100%', height: '100%' }} contentFit="cover" recyclingKey={id} transition={120} />
        {video != null ? <VideoScene key={id} source={video} joue style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : null}
        <View pointerEvents="none" style={{ position: 'absolute', left: 6, top: 6 }}>
          {tienne ? <Coche /> : s.nouveau ? <Badge type="nouveau" /> : null}
        </View>
        {s.animee || s.son ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: 6, top: 6, flexDirection: 'row', gap: 4 }}>
            {s.animee ? <Badge type="animee" /> : null}
            {s.son ? <Badge type="son" /> : null}
          </View>
        ) : null}
        {/* 19 octobre : verrouillee, la facon de la debloquer ecrite sur l'image */}
        {locked ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: VOILE_VERROU }}>
            <Icon name="lock" size={11} color={c.goldLight} stroke={2.8} />
            <Ink size={11} weight="extraBold" color="#FFFFFF" numberOfLines={2} style={{ flex: 1 }} maxFontSizeMultiplier={1.2}>
              {conditionCourte(id)}
            </Ink>
          </View>
        ) : null}
      </View>
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <Ink size={14} weight="extraBold" color={on ? c.accent : c.ink}>
          {s.nom}
        </Ink>
        <Ink size={12} color={c.textMuted}>
          {s.phrase}
        </Ink>
      </View>
    </Pressable>
  );
}

/** Une ligne de pack dans « Change a chaque ouverture » : trois vignettes, nom, nombre de scenes, et ses scenes si choisi */
function LignePack({ r, on, choisie, enCours, onPress }: { r: { key: ChoixRotation; label: string; sub: string }; on: boolean; choisie: SceneId; enCours: SceneId; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const scenes = r.key === 'fixe' ? [choisie] : scenesQuiTournent(r.key);
  const apercu = scenes.slice(0, 3);
  const sub = r.key === 'fixe' ? `${r.sub} : ${ficheScene(choisie).nom}` : `${scenes.length} scènes. ${r.sub}`;
  return (
    <View style={{ borderRadius: 16, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.surface, overflow: 'hidden' }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={`${r.key === 'fixe' ? 'Toujours ta scène' : `Pack ${r.label}`}, ${sub}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
      >
        <View style={{ width: 76, height: 46 }}>
          {apercu.map((id, i) => (
            <Image
              key={id}
              source={ficheScene(id).image}
              contentFit="cover"
              style={{ position: 'absolute', left: apercu.length === 1 ? 0 : i * 14, top: 0, width: apercu.length === 1 ? 76 : 48, height: 46, borderRadius: 10, borderWidth: 1.5, borderColor: c.surface, backgroundColor: c.fillSoft }}
            />
          ))}
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={15} weight="extraBold">
            {r.label}
          </Ink>
          <Ink size={12} color={c.textMuted}>
            {sub}
          </Ink>
        </View>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: on ? 0 : 2, borderColor: c.border, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
          {on ? <Icon name="check" size={13} color={c.onAccent} stroke={3.2} /> : null}
        </View>
      </Pressable>
      {on && r.key !== 'fixe' ? (
        <View style={{ paddingBottom: 12, gap: 8 }}>
          <Ink size={12} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 12 }}>
            {`Les ${scenes.length} scènes qui tournent`}
          </Ink>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
            {scenes.map((id) => {
              const f = ficheScene(id);
              const maintenant = id === enCours;
              return (
                <View key={id} style={{ width: 84, gap: 4 }} accessibilityLabel={`${f.nom}${maintenant ? ', en ce moment' : ''}`}>
                  <View style={{ width: 84, height: 52, borderRadius: 10, overflow: 'hidden', borderWidth: maintenant ? 2 : 0, borderColor: c.accent, backgroundColor: c.fillSoft }}>
                    <Image source={f.image} contentFit="cover" style={{ width: '100%', height: '100%' }} />
                    {f.animee ? (
                      <View style={{ position: 'absolute', left: 4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: VOILE_BADGE, alignItems: 'center', justifyContent: 'center' }}>
                        <PictoLecture size={8} color={c.goldLight} />
                      </View>
                    ) : null}
                  </View>
                  <Ink size={11} weight={maintenant ? 'extraBold' : 'bold'} color={maintenant ? c.accent : c.textSecondary}>
                    {maintenant ? 'En ce moment' : f.nom}
                  </Ink>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/** 19 octobre : picto d'une pastille de son (bruitage, musique, sans son) */
function PictoAmbiance({ id, color, size = 18 }: { id: string; color: string; size?: number }) {
  const trait = { stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const d: string[] =
    id === 'amb:aucune'
      ? ['M4 9.5h3.5L12 5.5v13l-4.5-4H4z', 'M16 9.5l5 5M21 9.5l-5 5']
      : id === 'mus:aucune'
        ? ['M9 18V5l11-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M3 3l18 18']
        : id === 'amb:scene'
          ? ['M4 5h16v14H4z', 'M4 16l5-5 4 4 3-3 4 4']
          : id === 'amb:pluie'
            ? ['M7 4l-2 5M13 4l-2 5M19 4l-2 5M7 13l-2 5M13 13l-2 5M19 13l-2 5']
            : id === 'amb:neige'
              ? ['M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9']
              : id === 'amb:mer'
                ? ['M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0']
                : id === 'amb:desert'
                  ? ['M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7']
                  : id === 'amb:foret'
                    ? ['M12 3l6 9h-4l5 7H5l5-7H6z', 'M12 19v2']
                    : ['M9 18V5l11-2v13', 'M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {d.map((x) => (
        <Path key={x} d={x} {...trait} />
      ))}
    </Svg>
  );
}

/**
 * 19 octobre : « Ambiance sonore », juste sous l'apercu. Deux rangees de pastilles (Bruitage, Musique).
 * Toucher la pastille : la choisir (memes reglages qu'avant, sonScene.ts). Toucher son rond lecture : l'ecouter ici.
 * Le volume apparait des qu'un son est choisi. Memes donnees : AMBIANCES, MUSIQUES, « Selon la scène ».
 */
function AmbianceSonore({ scene }: { scene: SceneId }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [r, set] = useReglagesSon();
  const ecoute = useEcoute(scene);
  const conseil = sonConseille(scene).ambiance;
  const bruitages: { cle: string; id: string; nom: string; sous?: string; ecoutable: boolean }[] = [
    { cle: 'amb:aucune', id: 'aucune', nom: 'Sans son', ecoutable: false },
    { cle: 'amb:scene', id: 'scene', nom: 'Selon la scène', sous: conseil ? conseil.nom : 'Rien pour cette scène', ecoutable: !!conseil },
    ...AMBIANCES.map((a) => ({ cle: `amb:${a.id}`, id: a.id, nom: a.nom, ecoutable: true })),
  ];
  const musiques: { cle: string; id: string; nom: string; sous?: string; ecoutable: boolean }[] = [
    { cle: 'mus:aucune', id: 'aucune', nom: 'Sans musique', ecoutable: false },
    ...MUSIQUES.map((m) => ({ cle: `mus:${m.id}`, id: m.id, nom: m.nom, ecoutable: true })),
  ];
  const son = r.musique !== 'aucune' || r.ambiance !== 'aucune';
  const rangee = (titre: string, liste: typeof bruitages, valeur: string, onChange: (v: string) => void) => (
    <View style={{ gap: 6 }}>
      <Ink size={12} weight="extraBold" color={c.textMuted} style={{ paddingHorizontal: 2, letterSpacing: 0.5 }}>
        {titre.toUpperCase()}
      </Ink>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -MARGE }} contentContainerStyle={{ paddingHorizontal: MARGE, gap: 8 }}>
        {liste.map((o) => {
          const on = o.id === valeur;
          const joue = ecoute.enCours === o.cle;
          const fg = on ? c.onAccent : c.ink;
          return (
            <View key={o.cle} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 46, borderRadius: 23, backgroundColor: on ? c.accent : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border, overflow: 'hidden' }}>
              <Pressable
                onPress={() => {
                  selectionAsync().catch(() => {});
                  onChange(o.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${titre}, ${o.nom}${o.sous ? `, ${o.sous}` : ''}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 46, paddingLeft: 12, paddingRight: o.ecoutable ? 4 : 14, opacity: pressed ? 0.75 : 1 })}
              >
                <PictoAmbiance id={o.cle} color={fg} />
                <View>
                  <Ink size={14} weight="extraBold" color={fg} maxFontSizeMultiplier={1.3}>
                    {o.nom}
                  </Ink>
                  {o.sous ? (
                    <Ink size={11} weight="bold" color={on ? c.onAccent : c.textMuted} maxFontSizeMultiplier={1.2}>
                      {o.sous}
                    </Ink>
                  ) : null}
                </View>
              </Pressable>
              {o.ecoutable ? (
                <Pressable
                  onPress={() => {
                    selectionAsync().catch(() => {});
                    ecoute.basculer(o.cle);
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected: joue }}
                  accessibilityLabel={joue ? `Arrêter ${o.nom}` : `Écouter ${o.nom}`}
                  style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, marginLeft: 4, marginRight: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: joue ? c.goldLight : on ? 'rgba(255,255,255,0.22)' : pressed ? c.border : c.fillSoft })}
                >
                  {joue ? (
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#1D2029' }} />
                  ) : (
                    <PictoLecture size={12} color={fg} />
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <PictoSon size={18} color={c.accent} />
          <Ink size={17} weight="black" tight accessibilityRole="header">
            Ambiance sonore
          </Ink>
        </View>
        <Ink size={12} color={c.textSecondary}>
          {son ? 'Joue sur ton accueil, sans couper ta musique. Touche le rond pour écouter.' : 'Choisis un son pour ton accueil. Touche le rond pour écouter.'}
        </Ink>
      </View>
      {rangee('Bruitage', bruitages, r.ambiance, (v) => set({ ambiance: v, coupe: false }))}
      {rangee('Musique', musiques, r.musique, (v) => set({ musique: v, coupe: false }))}
      {son ? (
        <View style={{ gap: 6 }}>
          <Ink size={12} weight="extraBold" color={c.textMuted} style={{ paddingHorizontal: 2, letterSpacing: 0.5 }}>
            VOLUME
          </Ink>
          <Segmented options={VOLUMES} value={r.volume} onChange={(v) => set({ volume: v })} />
        </View>
      ) : null}
    </View>
  );
}

/** 19 octobre : « Change a chaque ouverture » sous le titre d'un pack (Premium, memes regles que la carte du bas) */
function TournePack({ titre, on, isPremium, onPress }: { titre: string; on: boolean; isPremium: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`Change à chaque ouverture, pack ${titre}${isPremium ? '' : ', avec Premium'}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border })}
    >
      <Icon name="sync" size={20} color={on ? c.accent : c.textSecondary} stroke={2.4} />
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={14} weight="extraBold">
          Change à chaque ouverture
        </Ink>
        <Ink size={12} color={c.textSecondary}>
          {on ? `Actif : une scène ${titre} au hasard à chaque ouverture` : `Une scène ${titre} au hasard, jamais deux fois de suite`}
        </Ink>
      </View>
      {!isPremium ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: c.fillSoft }}>
          <Icon name="lock" size={11} color={c.goldDeep} stroke={2.6} />
          <Ink size={11} weight="extraBold" color={c.textSecondary}>
            Premium
          </Ink>
        </View>
      ) : null}
      <View style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: on ? c.accent : c.border, alignItems: on ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' }} />
      </View>
    </Pressable>
  );
}

/** Carte « Animation » : scene animee (oui par defaut). Le son est choisi plus haut (Ambiance sonore). */
function Animation({ scene }: { scene: SceneId }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [r, set] = useReglagesSon();
  const reduire = useReduireAnimations();
  const animee = aUneVersionAnimee(scene) || ficheScene(scene).animee;
  const sousAnime = reduire
    ? 'En pause : « Réduire les animations » est actif sur ton téléphone'
    : animee
      ? 'Cette scène bouge en douceur'
      : 'Pour les scènes marquées Animée';
  return (
    <Card>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 2 }}>
        <Ink size={17} weight="black" tight>
          Animation
        </Ink>
        <Ink size={13} color={c.textSecondary}>
          Ce qui bouge sur ton accueil
        </Ink>
      </View>
      <ToggleRow first label="Scène animée" sub={sousAnime} value={r.anime} onChange={(v) => set({ anime: v })} />
      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <Ink size={12} color={c.textMuted}>
          Le son joue seulement sur ton accueil, se mêle à ta musique sans la couper et se tait en mode silencieux. Un petit bouton sur la scène le coupe ou le remet.
        </Ink>
      </View>
    </Card>
  );
}
