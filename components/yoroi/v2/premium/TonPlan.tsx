/**
 * Carte « ton plan » en haut du paywall (vague 32) : une carte de membre facon billet.
 * A gauche ton personnage en entier sur ta scene, a droite ton prenom et trois lignes
 * (objectif, poids vise avec depart et arrivee, rythme), et en pied de billet la date
 * d'arrivee estimee (lib/v2/pesee/estimation.ts, jamais inventee) en or, avec le torii.
 * Chaque ligne n'apparait que si la donnee existe ; sans aucune ligne, la carte ne s'affiche pas.
 * Vague 48 (Houari : « une lanterne coupée, mal faite ») : la vignette montre ton personnage en buste sur ta scene,
 * ou, sans personnage, une lanterne allumee dessinee pour elle ; l'arrivee prevue, centree, en grand et en or, avec le torii.
 */
import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { ToriiImage } from '@/components/yoroi/v2/charts/ToriiImage';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations } from '@/components/yoroi/v2/stickers';

/** vague 50 (Houari : « la date dans une couleur différente du libellé, bien visible ») : indigo fonce, fixe sur le pied creme (AA 9,4) */
export const DATE_ARRIVEE = '#22407E';
const PHOTO_W = 84;
/** vague 48 : sans personnage, la lanterne de la vignette (fond transparent) */
const LANTERNE = require('@/assets/avatars/app/ornements/lanterne_plan.webp');
/** pied de billet creme, encres fixes : lisible en clair comme en sombre */
const PIED_FOND = '#FBF6EA';
const PIED_BORD = '#EFE4C8';
const PIED_DOUX = 'rgba(29,32,41,0.62)';
const BUSTE_W = 168;

export type LignePlan = {
  icon: IconName;
  /** encre de l'icone et du mot cle, fond de la pastille */
  ink: string;
  fond: string;
  /** texte discret avant le mot cle, suivi d'une fleche (poids de depart) */
  depuis?: string;
  /** mot cle, en gras et en couleur */
  cle: string;
  /** suite discrete */
  apres?: string;
  a11y: string;
};

function Fleche({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Path d="M4 12h14M13 6l6 6-6 6" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CarteTonPlan({ name, scene, personnage, lignes, arrivee, compact = false, vignette }: {
  name: string;
  scene: ImageSourcePropType;
  /** null : sans personnage, la lanterne */
  personnage: ImageSourcePropType | null;
  lignes: LignePlan[];
  /** « du 28 janv. au 15 mai » (fourchetteDates), null si l'estimation n'est pas fiable */
  arrivee: string | null;
  compact?: boolean;
  /** 17 octobre 2026 : contenu de la photo fourni par l'appelant (le paywall y fait defiler ses couples Premium) */
  vignette?: React.ReactNode;
}) {
  const illus = useIllustrations();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const rowH = compact ? 19 : 21;
  const a11y = [name ? traduire("{0}, ton plan", name) : traduire('Ton plan'), ...lignes.map((l) => l.a11y), arrivee ? traduire("arrivée prévue {0}", arrivee) : null].filter(Boolean).join(', ');
  return (
    <View accessible accessibilityLabel={a11y} style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row' }}>
        {/* la photo de la carte : la scene et ton personnage en entier */}
        <View style={{ width: PHOTO_W, alignSelf: 'stretch', minHeight: compact ? 92 : 104, backgroundColor: '#1E2336', overflow: 'hidden' }}>
          {vignette ?? <Image source={scene} resizeMode="cover" style={StyleSheet.absoluteFill} />}
          {vignette ? null : personnage ? (
            // en buste : la tete et le torse, assez grands pour se reconnaitre
            <Image source={personnage} resizeMode="contain" style={{ position: 'absolute', top: 6, left: (PHOTO_W - BUSTE_W) / 2, width: BUSTE_W, height: BUSTE_W / 0.75 }} />
          ) : (
            <>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,17,28,0.35)' }]} />
              <Image source={illus.img('lanterne_plan', LANTERNE)} resizeMode="contain" style={{ position: 'absolute', top: '6%', left: 6, width: PHOTO_W - 12, height: '88%' }} />
            </>
          )}
        </View>
        {/* perforation du billet */}
        <View style={{ width: 1, alignSelf: 'stretch', paddingVertical: 8, justifyContent: 'space-between' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={{ width: 1.5, height: 4, borderRadius: 1, backgroundColor: c.border }} />
          ))}
        </View>
        <View style={{ flex: 1, paddingLeft: 12, paddingRight: 12, paddingVertical: compact ? 9 : 11, gap: compact ? 4 : 5, justifyContent: 'center' }}>
          <Ink size={compact ? 15 : 16} weight="black" numberOfLines={1} style={{ marginBottom: 1 }}>
            {name ? `${name}, ` : ''}
            <Ink size={compact ? 15 : 16} weight="black" color={c.indigo}>{name ? traduire('ton plan') : traduire('Ton plan')}</Ink>
          </Ink>
          {lignes.map((l) => (
            <View key={l.icon + l.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: rowH }}>
              <View style={{ width: rowH + 1, height: rowH + 1, borderRadius: 7, backgroundColor: l.fond, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={l.icon} size={compact ? 12 : 13} color={l.ink} stroke={2.4} />
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {l.depuis ? (
                  <>
                    <Ink size={13.5} weight="bold" color={c.textSecondary}>{l.depuis}</Ink>
                    <Fleche color={c.textMuted} />
                  </>
                ) : null}
                <Ink size={13.5} weight="medium" color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
                  <Ink size={13.5} weight="black" color={l.ink}>{l.cle}</Ink>
                  {l.apres ? ` ${l.apres}` : ''}
                </Ink>
              </View>
            </View>
          ))}
        </View>
      </View>
      {arrivee ? (
        // le moment cle de la carte : centre, en grand, avec le torii
        <PiedArrivee arrivee={arrivee} compact={compact} style={{ borderTopWidth: 1, borderTopColor: PIED_BORD }} />
      ) : null}
    </View>
  );
}

/**
 * Vague 50 : l'arrivee prevue, la meme partout (Ton plan du paywall, Ton plan de l'onboarding) :
 * le vrai torii rouge vermillon et noir, le libelle discret, et les vraies dates en indigo fonce, en gras.
 */
export function PiedArrivee({ arrivee, compact = false, style }: { arrivee: string; compact?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    // 27 octobre 2026 (Houari : « le texte n'est pas centré, surtout la date avec le torii ») : le libelle et la date
    // centres l'un sur l'autre, le torii a gauche, et le groupe entier centre dans le pied (sa largeur suit le texte)
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: compact ? 8 : 11, backgroundColor: PIED_FOND }, style]} accessible accessibilityLabel={traduire("Arrivée prévue {0}", arrivee)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' }}>
        <ToriiImage width={compact ? 32 : 38} />
        <View style={{ flexShrink: 1, alignItems: 'center' }}>
          <Ink size={11} weight="black" color={PIED_DOUX} style={{ letterSpacing: 1.1, textAlign: 'center' }} numberOfLines={1}>{traduire("ARRIVÉE PRÉVUE")}</Ink>
          <Ink size={compact ? 18 : 20} weight="black" color={DATE_ARRIVEE} tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center' }}>{arrivee.replace(/^./, (x) => x.toUpperCase())}</Ink>
        </View>
        {/* contrepoids invisible de la largeur du torii : la date tombe au centre exact du pied */}
        <View style={{ width: compact ? 32 : 38 }} />
      </View>
    </View>
  );
}

export default CarteTonPlan;
