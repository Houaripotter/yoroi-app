/**
 * Cartes a partager : le dessin d'une carte, toujours a 360 points de large
 * (story 360 x 640, post 360 x 450, carre 360 x 360), exportee en 1080 de large (capture x 3).
 * 31 octobre 2026 : six modeles, ceux choisis parmi les 20 maquettes (_propositions/cartes_partage_2026-10-31) :
 * Affiche (par defaut), Bandeau, Neon nuit, Ticket de caisse, Medaille, Tableau de score.
 * Le fond est ta photo ou une couleur franche (8 au choix) ; plus de scenes ni de personnage sur la carte.
 * Chaque modele se decline par sport : le trace GPS s'il existe (sinon tes kilometres ou le sticker du sport),
 * tes meilleures series en musculation, tes techniques en JJB. Une donnee absente ne donne aucune ligne.
 * Le pied (logo, YOROI, badges des stores) remonte de 70 points en Story, au-dessus de la barre de reponse d'Instagram.
 * L'ancien dessin (10 modeles, scenes, personnage) est archive dans _archive_ancien_design_2026-10-09/cartes_10_modeles_2026-10-31.
 */
import React, { forwardRef, useId } from 'react';
import { Image, Platform, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { ImageSourcePropType, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, Line as SvgLine, Path, Pattern, Polygon, RadialGradient, Rect, Stop, Text as SvgText, TextPath } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { FontWeightKey } from '@/components/yoroi/tokens';
import { chiffresAffiches, titreCarte } from '@/lib/v2/cartes/chiffres';
import { exploitVisible } from '@/lib/v2/cartes/exploits';
import { getClubLogoSource } from '@/lib/sports';
import type { CarteData, Exploit, FormatId, Grand, ModeleId, OptionsCarte, StatValue } from '@/lib/v2/cartes/types';
import { BADGES } from './fonds';
import { AvantApresVue } from './AvantApresVue';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { donneesEnUnite, exploitEnUnite, statsEnUnite } from '@/lib/v2/cartes/unite';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { couleurDe, rgba } from '@/lib/v2/cartes/couleurs';
import type { CouleurCarte } from '@/lib/v2/cartes/couleurs';
import { blocDetail, ligneRecord, numeroTicket, stickerDeCarte, visuelDuSport } from '@/lib/v2/cartes/detailsSport';
import type { BlocDetail, VisuelSport } from '@/lib/v2/cartes/detailsSport';
import { STICKERS } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';
import { ZONES_PLEIN } from '@/lib/v2/zones/couleursZones';

export const CARTE_W = 360;
export const HAUTEURS: Record<FormatId, number> = { story: 640, post: 450, carre: 360 };
/** Taille d'export en pixels */
export const EXPORT: Record<FormatId, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  carre: { w: 1080, h: 1080 },
};
/** 31 octobre 2026 : en Story, le pied remonte de 70 points (210 pixels) pour ne pas passer sous la barre de reponse */
export const REMONTEE_PIED_STORY = 70;
/** Marges du haut et du bas de chaque format, pied compris */
export const MARGES: Record<FormatId, { haut: number; bas: number }> = {
  story: { haut: 50, bas: 16 + REMONTEE_PIED_STORY },
  post: { haut: 22, bas: 16 },
  carre: { haut: 18, bas: 14 },
};

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');
const OR = { clair: '#FFE27A', milieu: '#F5C518', fonce: '#C8930E', bord: '#B07A06', encre: '#3A2600' };
const LED = '#FFD21F';
const BLANC = '#FFFFFF';
const NOIR = '#0B0B0D';
const ENCRE_PAPIER = '#14161C';

export type VisuelsCarte = {
  /** image de la scene d'accueil (plus dessinee depuis le 31 octobre 2026, gardee pour les appels existants) */
  scene?: ImageSourcePropType | null;
  sceneId?: string | null;
  /** photo personnelle (uri) */
  photo?: string | null;
  /** personnage de l'utilisateur (plus dessine depuis le 31 octobre 2026) */
  personnage?: ImageSourcePropType | null;
};

type Props = { data: CarteData; options: OptionsCarte; visuels: VisuelsCarte };

/** Taille de police pour que le texte tienne sur une ligne dans la largeur donnee */
export function fit(text: string, largeur: number, max: number, k = 0.6): number {
  const n = Math.max(1, text.length);
  return Math.max(9, Math.min(max, Math.floor(largeur / (n * k))));
}

/** Le gros chiffre : valeur et unite, taille calculee pour tenir dans la largeur */
export function tailleHeros(g: Grand, largeur: number, max: number): number {
  const u = g.unit ?? '';
  const n = g.value.length + (u ? u.length * 0.36 + 0.3 : 0);
  return Math.max(20, Math.min(max, Math.floor(largeur / (n * 0.62))));
}

function T({ children, size, weight = 'medium', color, style, lines = 1 }: { children: React.ReactNode; size: number; weight?: FontWeightKey; color: string; style?: TextStyle | TextStyle[]; lines?: number }) {
  return (
    <Ink size={size} weight={weight} color={color} allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={lines} style={style}>
      {children}
    </Ink>
  );
}

/** Petit libelle en capitales espacees (DISTANCE, DUREE...) */
function Lbl({ children, color, size = 10.5, centre, style }: { children: string; color: string; size?: number; centre?: boolean; style?: TextStyle }) {
  return <T size={size} weight="black" color={color} style={[{ letterSpacing: size * 0.14, textAlign: centre ? 'center' : 'left' }, style ?? {}]}>{children.toUpperCase()}</T>;
}

function lueur(couleur: string, r = 16): TextStyle {
  return { textShadowColor: couleur, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } };
}

/** L'encre posee sur l'encre : la couleur du fond, ou le blanc si le fond est noir ou blanc */
function contreEncre(ink: string, coul: CouleurCarte): string {
  if (ink !== BLANC) return BLANC;
  return coul.fond === NOIR ? ENCRE_PAPIER : coul.fond;
}

// ============================================
// CONTEXTE D'UN DESSIN
// ============================================

type Ctx = {
  d: CarteData;
  o: OptionsCarte;
  W: number;
  H: number;
  L: number;
  story: boolean;
  carre: boolean;
  stats: StatValue[];
  titre: string;
  u: UnitePoids;
  coul: CouleurCarte;
  /** ta photo en fond, null sinon */
  photo: string | null;
  /** encre du texte pose sur le fond */
  ink: string;
  padTop: number;
  padBas: number;
};

const PAD = 24;

/** L'image du fond (expo-image sur iPhone, avec une cle de recyclage : aucune image precedente ne reste) */
function Photo({ uri }: { uri: string }) {
  const plein = { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0, width: '100%' as const, height: '100%' as const };
  if (Platform.OS === 'ios') return <ExpoImage key={uri} recyclingKey={uri} source={{ uri }} style={plein} contentFit="cover" transition={0} cachePolicy="memory-disk" />;
  return <Image key={uri} source={{ uri }} style={plein} resizeMode="cover" />;
}

/** Le fond : couleur unie, ou ta photo avec un voile noir dose pour que le texte blanc reste lisible */
function Fond({ c, voile = 0.42, bas = 0.55, fond }: { c: Ctx; voile?: number; bas?: number; fond?: string }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: fond ?? c.coul.fond }}>
      {c.photo ? (
        <>
          <Photo uri={c.photo} />
          <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: `rgba(0,0,0,${voile})` }} />
          <LinearGradient colors={['rgba(0,0,0,0)', `rgba(0,0,0,${bas})`]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '22%' }} />
        </>
      ) : null}
    </View>
  );
}

// ============================================
// PETITS BLOCS COMMUNS
// ============================================

/** Initiales d'un club sans logo : « Team Marseille » donne « TM » */
export function initialesClub(nom: string): string {
  const mots = nom.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return (mots.length > 1 ? mots[0][0] + mots[1][0] : (mots[0] ?? '').slice(0, 2)).toUpperCase();
}

/** Le club que tu as saisi : son logo rond (ou ses initiales) et son nom */
function ClubPuce({ club, ink, max }: { club: NonNullable<CarteData['club']>; ink: string; max: number }) {
  const src = club.logo ? getClubLogoSource(club.logo) : null;
  const D = 22;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: max, height: 28, paddingLeft: 3, paddingRight: 10, borderRadius: 14, backgroundColor: rgba(ink === BLANC ? '#000000' : '#FFFFFF', 0.22), borderWidth: 1, borderColor: rgba(ink, 0.3) }}>
      {src ? (
        <Image source={src} style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: BLANC }} resizeMode="cover" />
      ) : (
        <View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: ink, alignItems: 'center', justifyContent: 'center' }}>
          <T size={9} weight="black" color={ink === BLANC ? ENCRE_PAPIER : BLANC}>{initialesClub(club.nom)}</T>
        </View>
      )}
      <T size={11} weight="extraBold" color={ink} style={{ flexShrink: 1 }}>{club.nom}</T>
    </View>
  );
}

/** Le haut : la date en capitales, le nom de la seance en grand ; le club a droite s'il y en a un */
function EnTete({ c, ink, centre, max, sansTitre }: { c: Ctx; ink: string; centre?: boolean; max?: number; sansTitre?: boolean }) {
  const m = max ?? (c.story ? 28 : c.carre ? 21 : 24);
  const club = c.d.club?.nom ? <ClubPuce club={c.d.club} ink={ink} max={centre ? c.L : Math.round(c.L * 0.5)} /> : null;
  const date = <Lbl color={rgba(ink, 0.88)} size={c.story ? 11.5 : 10.5} centre={centre} style={{ flexShrink: 1 }}>{c.d.sousTitre}</Lbl>;
  return (
    <View style={{ gap: 3, alignItems: centre ? 'center' : 'stretch' }}>
      {centre ? (
        <>
          {club ? <View style={{ marginBottom: 6 }}>{club}</View> : null}
          {date}
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {date}
          {club}
        </View>
      )}
      {sansTitre ? null : <T size={fit(c.titre, c.L, m, 0.6)} weight="black" color={ink} style={{ letterSpacing: -0.4, textAlign: centre ? 'center' : 'left' }}>{c.titre}</T>}
    </View>
  );
}

/** Un chiffre : valeur et unite sur la meme ligne de base */
function Valeur({ value, unit, size, color, unitColor, style, align }: { value: string; unit?: string; size: number; color: string; unitColor?: string; style?: TextStyle; align?: 'flex-start' | 'center' | 'flex-end' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Math.max(2, size * 0.05), justifyContent: align }}>
      <T size={size} weight="black" color={color} style={[{ letterSpacing: -size * 0.045, fontVariant: ['tabular-nums'], lineHeight: Math.round(size * 1.06) }, style ?? {}]}>{value}</T>
      {unit ? <T size={Math.max(10, Math.round(size * 0.34))} weight="black" color={unitColor ?? color} style={style}>{unit}</T> : null}
    </View>
  );
}

/** Le chiffre vedette : son libelle en capitales au-dessus (ou dessous), la valeur en enorme */
function Hero({ s, largeur, max, ink, labelColor, centre, glow, labelDessous }: { s: { value: string; unit?: string; label?: string }; largeur: number; max: number; ink: string; labelColor?: string; centre?: boolean; glow?: string; labelDessous?: boolean }) {
  const size = tailleHeros({ value: s.value, unit: s.unit }, largeur, max);
  const label = s.label ? <Lbl color={labelColor ?? ink} size={max > 80 ? 11.5 : 10.5} centre={centre}>{traduire(s.label)}</Lbl> : null;
  return (
    <View style={{ alignItems: centre ? 'center' : 'flex-start', gap: 2 }}>
      {labelDessous ? null : label}
      <Valeur value={s.value} unit={s.unit} size={size} color={ink} style={glow ? lueur(glow, 18) : undefined} align={centre ? 'center' : 'flex-start'} />
      {labelDessous ? label : null}
    </View>
  );
}

/** La barre des zones cardiaques */
function Zones({ z, largeur, track, h = 8 }: { z: number[]; largeur: number; track: string; h?: number }) {
  const total = z.reduce((a, b) => a + b, 0) || 1;
  return (
    <View style={{ flexDirection: 'row', width: largeur, height: h, borderRadius: h / 2, overflow: 'hidden', backgroundColor: track, gap: 2 }}>
      {z.map((x, i) => (x > 0 ? <View key={i} style={{ flex: x / total, backgroundColor: ZONES_PLEIN[i] }} /> : null))}
    </View>
  );
}

/** Les petits chiffres en rangee (3 au plus), separes par un filet si demande */
function Stats({ stats, ink, labelColor, largeur, size, centre, filets, filetColor, glow }: { stats: StatValue[]; ink: string; labelColor?: string; largeur: number; size: number; centre?: boolean; filets?: boolean; filetColor?: string; glow?: string }) {
  if (!stats.length) return null;
  const n = stats.length;
  const gap = 10;
  const col = (largeur - gap * (n - 1)) / n;
  return (
    <View style={{ flexDirection: 'row', gap, width: largeur }}>
      {stats.map((s, i) => {
        const txt = `${s.value}${s.unit ? ` ${s.unit}` : ''}`;
        const sz = Math.min(size, fit(txt, col - (filets && i ? 8 : 0), size, 0.62));
        return (
          <View key={`${s.key}${i}`} style={{ width: col, gap: 3, alignItems: centre ? 'center' : 'flex-start', borderLeftWidth: filets && i ? 1.5 : 0, borderColor: filetColor ?? rgba(ink, 0.4), paddingLeft: filets && i && !centre ? 8 : 0 }}>
            <Lbl color={labelColor ?? rgba(ink, 0.85)} size={size > 24 ? 10 : 9} centre={centre}>{traduire(s.label)}</Lbl>
            {s.key === 'zones' && s.zones ? (
              <View style={{ gap: 4, alignItems: centre ? 'center' : 'flex-start' }}>
                <T size={Math.min(sz, fit(s.value, col, sz, 0.62))} weight="black" color={ink}>{s.value}</T>
                <Zones z={s.zones} largeur={Math.min(col, 110)} track={rgba(ink, 0.25)} h={6} />
              </View>
            ) : (
              <Valeur value={s.value} unit={s.unit} size={sz} color={ink} style={glow ? lueur(glow, 10) : undefined} align={centre ? 'center' : 'flex-start'} />
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Les lignes du sport (meilleures series, techniques, kilometres) : titre en capitales, une ligne par donnee */
function Lignes({ bloc, ink, droiteColor, largeur, size = 14, titreColor, filet, sansTitre }: { bloc: BlocDetail; ink: string; droiteColor?: string; largeur: number; size?: number; titreColor?: string; filet?: string; sansTitre?: boolean }) {
  return (
    <View style={{ width: largeur, gap: 2 }}>
      {sansTitre || !bloc.titre ? null : <Lbl color={titreColor ?? rgba(ink, 0.85)} size={10}>{bloc.titre}</Lbl>}
      {bloc.lignes.map((l, i) => (
        <View key={`${l.gauche}${i}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: Math.round(size * 0.3), borderTopWidth: i ? 1 : 0, borderColor: filet ?? rgba(ink, 0.3) }}>
          <T size={size} weight="extraBold" color={ink} style={{ flexShrink: 1 }}>{l.gauche}</T>
          {l.droite ? <T size={size} weight="black" color={droiteColor ?? ink} style={{ fontVariant: ['tabular-nums'] }}>{l.droite}</T> : null}
        </View>
      ))}
    </View>
  );
}

/** Le record de la seance dans une pastille pleine */
function RecordPastille({ texte, fond, ink, size = 13, bord }: { texte: string; fond: string; ink: string; size?: number; bord?: string }) {
  return (
    <View style={{ alignSelf: 'stretch', borderRadius: 12, backgroundColor: fond, paddingHorizontal: 12, paddingVertical: 6, gap: 1, borderWidth: bord ? 1.5 : 0, borderColor: bord }}>
      <Lbl color={rgba(ink, 0.8)} size={9}>{traduire('Record battu')}</Lbl>
      <T size={size} weight="black" color={ink}>{texte}</T>
    </View>
  );
}

/** Le pied de chaque carte : le logo YOROI, le mot YOROI et les deux badges officiels des stores */
export function Pied({ ink, compact, centre, sansLogo }: { ink: string; compact?: boolean; centre?: boolean; sansLogo?: boolean }) {
  const logo = compact ? 26 : 30;
  const bh = compact ? 17 : 20;
  const badges = (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      <Image source={BADGES.apple.image} style={{ width: Math.round(bh * BADGES.apple.ratio), height: bh }} resizeMode="contain" />
      <Image source={BADGES.google.image} style={{ width: Math.round(bh * BADGES.google.ratio), height: bh }} resizeMode="contain" />
    </View>
  );
  const marque = sansLogo ? null : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <Image source={LOGO} style={{ width: logo, height: logo, borderRadius: logo * 0.24 }} />
      <T size={compact ? 17 : 20} weight="black" color={ink} style={{ letterSpacing: 1.6 }}>YOROI</T>
    </View>
  );
  if (centre) {
    return (
      <View style={{ alignItems: 'center', gap: 7 }} accessibilityLabel={traduire('YOROI, sur iPhone et Android')}>
        {marque}
        {badges}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: sansLogo ? 'center' : 'space-between', gap: 8 }} accessibilityLabel={traduire('YOROI, sur iPhone et Android')}>
      {marque}
      {badges}
    </View>
  );
}

// ============================================
// LES VISUELS DU SPORT
// ============================================

type TraceData = Extract<VisuelSport, { type: 'trace' }>['trace'];

/** Le trace GPS : un trait epais, le point de depart rond ; en neon, des halos sous le trait */
function Trace({ trace, couleur, epais = 0.03, glow, depart }: { trace: TraceData; couleur: string; epais?: number; glow?: boolean; depart?: string }) {
  const pts = trace.points;
  const maxX = Math.max(...pts.map((p) => p[0]), 0.01);
  const maxY = Math.max(...pts.map((p) => p[1]), 0.01);
  const m = 0.06;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(' ');
  const [x0, y0] = pts[0];
  return (
    <Svg width="100%" height="100%" viewBox={`${-m} ${-m} ${maxX + 2 * m} ${maxY + 2 * m}`}>
      {glow ? <Path d={d} stroke={couleur} strokeOpacity={0.14} strokeWidth={epais * 4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {glow ? <Path d={d} stroke={couleur} strokeOpacity={0.3} strokeWidth={epais * 2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <Path d={d} stroke={couleur} strokeWidth={epais} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={x0} cy={y0} r={epais * 1.15} fill={depart ?? couleur} stroke={couleur} strokeWidth={epais * 0.55} />
    </Svg>
  );
}

/** Des barres verticales (kilometres, series) : la meilleure surlignee */
function Barres({ valeurs, couleur, meilleur, glow, inverse }: { valeurs: number[]; couleur: string; meilleur?: string; glow?: boolean; inverse?: boolean }) {
  const n = valeurs.length;
  const max = Math.max(...valeurs);
  const min = Math.min(...valeurs);
  // kilometres : plus rapide = plus haut (inverse) ; series : plus lourde = plus haute
  const h = (v: number) => (inverse ? 0.35 + (0.65 * (max - v)) / Math.max(1, max - min) : 0.15 + (0.85 * v) / Math.max(1, max));
  const best = inverse ? valeurs.indexOf(min) : valeurs.indexOf(max);
  const w = 100 / n;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none">
      {valeurs.map((v, i) => {
        const bh = h(v) * 56;
        const fill = i === best && meilleur ? meilleur : couleur;
        return (
          <G key={i}>
            {glow ? <Rect x={i * w + w * 0.08} y={60 - bh - 2} width={w * 0.84} height={bh + 2} rx={1.2} fill={fill} opacity={0.25} /> : null}
            <Rect x={i * w + w * 0.18} y={60 - bh} width={w * 0.64} height={bh} rx={1} fill={fill} />
          </G>
        );
      })}
    </Svg>
  );
}

/** La courbe cardiaque de la seance */
function Courbe({ valeurs, couleur, glow }: { valeurs: number[]; couleur: string; glow?: boolean }) {
  const max = Math.max(...valeurs);
  const min = Math.min(...valeurs);
  const d = valeurs.map((v, i) => `${i ? 'L' : 'M'}${((i / (valeurs.length - 1)) * 100).toFixed(2)} ${(56 - ((v - min) / Math.max(1, max - min)) * 52).toFixed(2)}`).join(' ');
  return (
    <Svg width="100%" height="100%" viewBox="-2 -2 104 62" preserveAspectRatio="none">
      {glow ? <Path d={d} stroke={couleur} strokeOpacity={0.18} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {glow ? <Path d={d} stroke={couleur} strokeOpacity={0.35} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <Path d={d} stroke={couleur} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function Jours({ jours, ink, fond, taille }: { jours: boolean[]; ink: string; fond: string; taille: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: Math.round(taille * 0.2), justifyContent: 'center' }}>
      {jours.map((on, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: on ? ink : 'transparent', borderWidth: 2, borderColor: on ? ink : rgba(ink, 0.4), alignItems: 'center', justifyContent: 'center' }}>
            {on ? (
              <Svg width={taille * 0.5} height={taille * 0.5} viewBox="0 0 24 24">
                <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={fond} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : null}
          </View>
          <T size={10} weight="black" color={rgba(ink, 0.8)}>{LETTRES[i]}</T>
        </View>
      ))}
    </View>
  );
}

/** Le sticker YOROI du sport, en grand, quand il n'y a ni trace ni lignes */
function Sticker({ d, max }: { d: CarteData; max: number }) {
  return (
    <View style={{ width: '100%', height: '100%', maxHeight: max, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={STICKERS[stickerDeCarte(d)]} style={{ width: '100%', height: '100%', maxWidth: max, maxHeight: max }} resizeMode="contain" />
    </View>
  );
}

/**
 * Le visuel au milieu de la carte, dans la place qui reste (il se reduit, il ne coupe rien).
 * glow : il brille dans la couleur choisie (Neon nuit).
 */
function Visuel({ c, v, couleur, glow, meilleur, sticker = 150, fond }: { c: Ctx; v: VisuelSport; couleur: string; glow?: boolean; meilleur?: string; sticker?: number; fond?: string }) {
  let dedans: React.ReactNode = null;
  if (v.type === 'trace') dedans = <Trace trace={v.trace} couleur={couleur} glow={glow} depart={fond} />;
  else if (v.type === 'splits') dedans = <Barres valeurs={v.splits.map((x) => x.secondes)} couleur={couleur} meilleur={meilleur} glow={glow} inverse />;
  else if (v.type === 'barres') dedans = <Barres valeurs={v.barres} couleur={couleur} meilleur={meilleur ?? (glow ? BLANC : undefined)} glow={glow} />;
  else if (v.type === 'courbe') dedans = <Courbe valeurs={v.courbe} couleur={couleur} glow={glow} />;
  else if (v.type === 'zones') return <View style={{ width: c.L, alignItems: 'center' }}><Zones z={v.zones} largeur={c.L} track={rgba(c.ink, 0.25)} h={c.story ? 18 : 12} /></View>;
  else if (v.type === 'jours') return <Jours jours={v.jours} ink={couleur} fond={fond ?? c.coul.fond} taille={c.story ? 36 : c.carre ? 26 : 30} />;
  else dedans = <Sticker d={c.d} max={sticker} />;
  // la place libre du milieu : le dessin la remplit sans jamais pousser le reste (rendu du 31 octobre)
  return (
    <View style={{ flex: 1, alignSelf: 'stretch', minHeight: 0 }}>
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>{dedans}</View>
    </View>
  );
}

/** Le chemin vers ton objectif de poids, seulement s'il est choisi */
function cheminObjectif(d: CarteData): number | null {
  const p = d.pesee;
  if (!p || !p.objectif || !p.depart || Math.abs(p.depart - p.objectif) < 0.1) return null;
  const losing = p.objectif < p.depart;
  return Math.max(0, Math.min(1, (losing ? p.depart - p.poids : p.poids - p.depart) / Math.abs(p.depart - p.objectif)));
}

function BarreChemin({ pct, ink, largeur }: { pct: number; ink: string; largeur: number }) {
  return (
    <View style={{ width: largeur, gap: 6 }}>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: rgba(ink, 0.22), overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(3, pct * 100)}%`, height: 14, borderRadius: 7, backgroundColor: ink }} />
      </View>
      <Lbl color={rgba(ink, 0.85)} size={10}>{traduire('{0} % du chemin vers ton objectif', Math.round(pct * 100))}</Lbl>
    </View>
  );
}

/** Combien de lignes du sport chaque format peut porter sans rien couper */
function maxLignes(c: Ctx, story: number, post: number, carre = 0): number {
  return c.story ? story : c.carre ? carre : post;
}

// ============================================
// 1. AFFICHE : couleur unie, chiffre enorme, trace ou visuel du sport, 3 stats
// ============================================

function Affiche(c: Ctx) {
  const [hero, ...rest] = c.stats;
  const v = visuelDuSport(c.d);
  const bloc = v.type === 'trace' ? null : blocDetail(c.d, c.u, maxLignes(c, 3, 2));
  const rec = c.carre ? null : ligneRecord(c.d, c.u);
  const chemin = c.d.moment === 'pesee' ? cheminObjectif(c.d) : null;
  const max = c.story ? 118 : c.carre ? 70 : 88;
  return (
    <View style={{ flex: 1, paddingTop: c.padTop, paddingBottom: c.padBas, paddingHorizontal: PAD }}>
      <Fond c={c} />
      <EnTete c={c} ink={c.ink} />
      {hero ? <View style={{ marginTop: c.story ? 16 : 8 }}><Hero s={hero} largeur={c.L} max={max} ink={c.ink} /></View> : null}
      <View style={{ flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center', paddingVertical: c.story ? 14 : 8, gap: 10 }}>
        {chemin !== null && !c.carre ? (
          <BarreChemin pct={chemin} ink={c.ink} largeur={c.L} />
        ) : bloc ? (
          <>
            <Lignes bloc={bloc} ink={c.ink} largeur={c.L} size={c.story ? 15 : 13} />
            {rec ? <RecordPastille texte={rec} fond={c.ink} ink={contreEncre(c.ink, c.coul)} /> : null}
          </>
        ) : c.d.moment === 'pesee' && c.carre ? null : (
          <Visuel c={c} v={v} couleur={c.ink} sticker={c.story ? 170 : 110} fond={c.photo ? '#000000' : c.coul.fond} />
        )}
      </View>
      {rest.length ? (
        <View style={{ borderTopWidth: 2, borderColor: rgba(c.ink, 0.9), paddingTop: c.story ? 12 : 8 }}>
          <Stats stats={rest.slice(0, 3)} ink={c.ink} largeur={c.L} size={c.story ? 30 : c.carre ? 21 : 24} />
        </View>
      ) : null}
      <View style={{ marginTop: c.story ? 16 : 10 }}>
        <Pied ink={c.ink} compact={!c.story} />
      </View>
    </View>
  );
}

// ============================================
// 2. BANDEAU : ta photo plein cadre, le chiffre dessus, un bandeau de couleur pour les stats
// ============================================

function Bandeau(c: Ctx) {
  const [hero, ...rest] = c.stats;
  const v = visuelDuSport(c.d);
  const bloc = blocDetail(c.d, c.u, maxLignes(c, 3, 2));
  const rec = c.story ? ligneRecord(c.d, c.u) : null;
  const inkB = c.coul.encre;
  const max = c.story ? 110 : c.carre ? 64 : 84;
  // sans photo, le haut est une nuit teintee de ta couleur ; sur le noir, le bandeau reste noir et le haut s'eclaircit
  const teinte = c.coul.fond === NOIR ? '#5A5D68' : c.coul.fond;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: c.padTop, paddingHorizontal: PAD, paddingBottom: 6, overflow: 'hidden' }}>
        {c.photo ? (
          <Fond c={c} voile={0.18} bas={0.5} />
        ) : (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#101114' }}>
            <LinearGradient colors={[rgba(teinte, 0.55), 'rgba(16,17,20,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '80%' }} />
          </View>
        )}
        <EnTete c={c} ink={BLANC} />
        <View style={{ flex: 1, minHeight: 0, marginVertical: 8 }}>
          {v.type === 'trace' && !c.carre ? <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: c.L * 0.6 }}><Trace trace={v.trace} couleur={BLANC} depart={c.coul.fond} /></View> : null}
        </View>
        {hero ? <Hero s={hero} largeur={c.L} max={max} ink={BLANC} /> : null}
      </View>
      <View style={{ backgroundColor: c.coul.fond, paddingHorizontal: PAD, paddingTop: c.story ? 16 : 10, paddingBottom: c.padBas, gap: c.story ? 10 : 7 }}>
        <Stats stats={rest.slice(0, 3)} ink={inkB} largeur={c.L} size={c.story ? 28 : c.carre ? 20 : 23} />
        {bloc ? <Lignes bloc={bloc} ink={inkB} largeur={c.L} size={c.story ? 13.5 : 12.5} sansTitre /> : null}
        {rec ? (
          <View style={{ gap: 1 }}>
            <Lbl color={rgba(inkB, 0.85)} size={9.5}>{traduire('Record battu')}</Lbl>
            <T size={14} weight="black" color={inkB}>{rec}</T>
          </View>
        ) : null}
        <Pied ink={inkB} compact={!c.story} />
      </View>
    </View>
  );
}

// ============================================
// 3. NEON NUIT : photo assombrie ou fond noir, trace, barres ou courbe et chiffre en neon
// ============================================

function Neon(c: Ctx) {
  const [hero, ...rest] = c.stats;
  const neon = c.coul.neon;
  const v = visuelDuSport(c.d, 'neon');
  const bloc = c.carre ? null : blocDetail(c.d, c.u, 2);
  const rec = c.story ? ligneRecord(c.d, c.u) : null;
  const max = c.story ? 100 : c.carre ? 60 : 78;
  return (
    <View style={{ flex: 1, paddingTop: c.padTop, paddingBottom: c.padBas, paddingHorizontal: PAD, alignItems: 'center' }}>
      <Fond c={c} voile={0.62} bas={0.7} fond="#07080B" />
      {c.photo ? null : <LinearGradient pointerEvents="none" colors={[rgba(neon, 0.2), 'rgba(7,8,11,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }} />}
      <EnTete c={c} ink={BLANC} centre />
      <View style={{ flex: 1, minHeight: 0, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', paddingVertical: c.story ? 14 : 8 }}>
        <Visuel c={c} v={v} couleur={neon} glow sticker={c.story ? 150 : 100} fond="#07080B" />
      </View>
      {hero ? <Hero s={hero} largeur={c.L} max={max} ink={BLANC} labelColor={neon} centre glow={neon} labelDessous /> : null}
      <View style={{ marginTop: c.story ? 14 : 8 }}>
        <Stats stats={rest.slice(0, 3)} ink={BLANC} labelColor={neon} largeur={c.L} size={c.story ? 28 : c.carre ? 19 : 23} centre filets filetColor={neon} />
      </View>
      {bloc ? <View style={{ marginTop: c.story ? 12 : 8 }}><Lignes bloc={bloc} ink={BLANC} droiteColor={neon} largeur={c.L} size={13} sansTitre filet={rgba(BLANC, 0.18)} /></View> : null}
      {rec ? <View style={{ marginTop: 10, alignSelf: 'stretch' }}><RecordPastille texte={rec} fond="rgba(0,0,0,0.55)" ink={BLANC} bord={neon} /></View> : null}
      <View style={{ marginTop: c.story ? 16 : 10, alignSelf: 'stretch' }}>
        <Pied ink={BLANC} compact={!c.story} centre={!c.carre} />
      </View>
    </View>
  );
}

// ============================================
// 4. TICKET DE CAISSE : une ligne par stat, le total en gros
// ============================================

/** Code-barres decoratif, toujours le meme pour une carte (aucun chiffre n'y est cache) */
function CodeBarres({ cle, w, h, encre }: { cle: string; w: number; h: number; encre: string }) {
  let x = 0;
  let k = 7;
  for (const ch of cle) k = (k * 31 + ch.charCodeAt(0)) % 9973;
  const barres: { x: number; w: number }[] = [];
  while (x < w) {
    k = (k * 1103 + 12345) % 9973;
    const bw = 1 + (k % 3);
    barres.push({ x, w: bw });
    x += bw + 1 + ((k >> 3) % 3);
  }
  return (
    <Svg width={w} height={h}>
      {barres.filter((b) => b.x + b.w <= w).map((b, i) => <Rect key={i} x={b.x} y={0} width={b.w} height={h} fill={encre} />)}
    </Svg>
  );
}

function Pointilles({ w, encre, plein }: { w: number; encre: string; plein?: boolean }) {
  return (
    <Svg width={w} height={plein ? 5 : 2}>
      {plein ? (
        <>
          <SvgLine x1={0} y1={1} x2={w} y2={1} stroke={encre} strokeWidth={1.6} />
          <SvgLine x1={0} y1={4} x2={w} y2={4} stroke={encre} strokeWidth={1.6} />
        </>
      ) : (
        <SvgLine x1={0} y1={1} x2={w} y2={1} stroke={encre} strokeWidth={1.4} strokeDasharray="4 3" />
      )}
    </Svg>
  );
}

function LigneTicket({ g, dr, size, encre }: { g: string; dr: string; size: number; encre: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      <T size={size} weight="extraBold" color={encre} style={{ flexShrink: 1, letterSpacing: 0.3 }}>{g.toUpperCase()}</T>
      <View style={{ flex: 1, minWidth: 8, height: 1, marginBottom: size * 0.3, borderBottomWidth: 1.2, borderStyle: 'dotted', borderColor: rgba(encre, 0.6) }} />
      {dr ? <T size={size} weight="black" color={encre} style={{ fontVariant: ['tabular-nums'], letterSpacing: 0.2 }}>{dr.toUpperCase()}</T> : null}
    </View>
  );
}

function Ticket(c: Ctx) {
  const [hero, ...rest] = c.stats;
  const sombre = c.o.papier === 'sombre';
  const papier = sombre ? '#17181D' : '#FFFFFF';
  const encre = sombre ? '#FFFFFF' : ENCRE_PAPIER;
  const v = visuelDuSport(c.d);
  const trace = c.story && v.type === 'trace' ? v : null;
  const bloc = trace ? null : blocDetail(c.d, c.u, maxLignes(c, 3, 2));
  const rec = c.carre ? null : ligneRecord(c.d, c.u);
  const num = numeroTicket(c.d);
  const TW = c.L - 12;
  const inner = TW - 32;
  const fs = c.story ? 14.5 : c.carre ? 12 : 13;
  const totalMax = c.story ? 72 : c.carre ? 44 : 54;
  const dent = 9;
  const n = Math.ceil(TW / dent);
  const dents = Array.from({ length: n }, (_, i) => `${(i + 1) * dent},0 ${i * dent + dent / 2},${dent * 0.8}`).reverse().join(' ');
  return (
    <View style={{ flex: 1, paddingTop: c.padTop, paddingBottom: c.padBas, paddingHorizontal: PAD, alignItems: 'center' }}>
      <Fond c={c} voile={0.35} bas={0.4} />
      <View style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>
        <View style={{ width: TW, transform: [{ rotate: '-1.6deg' }], shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
          <View style={{ backgroundColor: papier, paddingHorizontal: 16, paddingTop: c.story ? 16 : 11, paddingBottom: c.story ? 12 : 8, gap: c.story ? 7 : 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image source={LOGO} style={{ width: 24, height: 24, borderRadius: 6 }} />
                <T size={17} weight="black" color={encre} style={{ letterSpacing: 1.4 }}>YOROI</T>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                {num ? <T size={9.5} weight="black" color={encre} style={{ letterSpacing: 0.8 }}>{traduire('TICKET N° {0}', num)}</T> : null}
                <T size={9.5} weight="bold" color={rgba(encre, 0.8)} style={{ letterSpacing: 0.6 }}>{c.d.sousTitre.toUpperCase()}</T>
              </View>
            </View>
            <Pointilles w={inner} encre={encre} />
            <T size={fs + 1.5} weight="black" color={encre} style={{ letterSpacing: 0.8 }}>{c.titre.toUpperCase()}</T>
            {rest.map((s, i) => <LigneTicket key={`${s.key}${i}`} g={traduire(s.label)} dr={`${s.value}${s.unit ? ` ${s.unit}` : ''}`} size={fs} encre={encre} />)}
            {bloc ? (
              <>
                <Pointilles w={inner} encre={encre} />
                <T size={fs} weight="black" color={encre} style={{ letterSpacing: 0.8 }}>{bloc.titre.toUpperCase()}</T>
                {bloc.lignes.map((l, i) => <LigneTicket key={i} g={l.gauche} dr={l.droite ?? ''} size={fs - 0.5} encre={encre} />)}
              </>
            ) : null}
            {trace ? <View style={{ height: 96, alignItems: 'center', paddingVertical: 4 }}><View style={{ width: 120, height: '100%' }}><Trace trace={trace.trace} couleur={encre} epais={0.022} depart={papier} /></View></View> : null}
            <Pointilles w={inner} encre={encre} plein />
            {hero ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                <T size={fs + 3} weight="black" color={encre} style={{ letterSpacing: 1, paddingBottom: 6 }}>{traduire('TOTAL')}</T>
                <Valeur value={hero.value} unit={hero.unit} size={tailleHeros(hero, inner * 0.7, totalMax)} color={encre} align="flex-end" />
              </View>
            ) : null}
            {rec ? (
              <View style={{ backgroundColor: encre, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' }}>
                <T size={11.5} weight="black" color={papier}>{traduire('Record battu : {0}', rec)}</T>
              </View>
            ) : null}
            <T size={10} weight="black" color={encre} style={{ letterSpacing: 2.4, textAlign: 'center', marginTop: 2 }}>{traduire('MERCI, À DEMAIN')}</T>
            {c.carre ? null : <View style={{ alignItems: 'center' }}><CodeBarres cle={c.d.cle} w={Math.round(inner * 0.86)} h={c.story ? 34 : 22} encre={encre} /></View>}
          </View>
          <Svg width={TW} height={dent}>
            <Polygon points={`0,0 ${n * dent},0 ${dents} 0,${dent * 0.8}`} fill={papier} />
          </Svg>
        </View>
      </View>
      <View style={{ marginTop: c.story ? 14 : 8, alignSelf: 'stretch' }}>
        <Pied ink={c.ink} compact sansLogo />
      </View>
    </View>
  );
}

// ============================================
// 5. MEDAILLE : pour les records et les etapes franchies
// ============================================

type PropsMedaille = Ctx & { hero: StatValue | null; rest: StatValue[]; autour: string; surtitre: string; rec: string | null; bloc: BlocDetail | null };

function Medaille(c: PropsMedaille) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const D = c.story ? 200 : c.carre ? 112 : 150;
  const ruban = Math.round(D * 0.36);
  const r = D / 2;
  const rt = r - D * 0.075;
  const cercle = `M ${r} ${r} m ${-rt} 0 a ${rt} ${rt} 0 1 1 ${rt * 2} 0 a ${rt} ${rt} 0 1 1 ${-rt * 2} 0`;
  const fsTour = Math.max(7, Math.round(D * 0.058));
  // le texte tourne sur tout le cercle : repete autant que la circonference le permet
  const unTour = `${c.autour} · `.toUpperCase();
  const tours = Math.max(1, Math.floor((2 * Math.PI * rt) / (unTour.length * fsTour * 0.68)));
  const tourTexte = unTour.repeat(tours);
  const rubanW = D * 0.62;
  const x0 = D * 0.5 - rubanW * 0.5;
  const bande = (k: number) => {
    const a = x0 + k * rubanW * 0.13;
    return `${a},0 ${a + rubanW * 0.065},0 ${a + rubanW * 0.185},${ruban + 6} ${a + rubanW * 0.12},${ruban + 6}`;
  };
  const raie = (
    <G>
      <Polygon points={`${x0},0 ${x0 + rubanW * 0.38},0 ${x0 + rubanW * 0.5},${ruban + 6} ${x0 + rubanW * 0.12},${ruban + 6}`} fill="#FFFFFF" />
      {[0, 1, 2].map((k) => <Polygon key={k} points={bande(k)} fill="#111216" />)}
    </G>
  );
  const heroW = D * 0.64;
  return (
    <View style={{ flex: 1, paddingTop: c.padTop, paddingBottom: c.padBas, paddingHorizontal: PAD, alignItems: 'center' }}>
      <Fond c={c} voile={0.45} bas={0.5} />
      {c.d.club?.nom ? <View style={{ marginBottom: 6 }}><ClubPuce club={c.d.club} ink={c.ink} max={c.L} /></View> : null}
      <Lbl color={c.ink} size={c.story ? 12 : 10.5} centre>{c.surtitre}</Lbl>
      <View style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: D, height: D + ruban * 0.78 }}>
          <Svg width={D} height={ruban + 8} style={{ position: 'absolute', top: 0, left: 0 }}>
            {raie}
            <G transform={`translate(${D}, 0) scale(-1, 1)`}>{raie}</G>
          </Svg>
          <View style={{ position: 'absolute', top: ruban * 0.78, left: 0, width: D, height: D, borderRadius: D / 2, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <Svg width={D} height={D}>
              <Defs>
                <RadialGradient id={`or${id}`} cx="40%" cy="35%" r="70%">
                  <Stop offset="0" stopColor={OR.clair} />
                  <Stop offset="0.6" stopColor={OR.milieu} />
                  <Stop offset="1" stopColor={OR.fonce} />
                </RadialGradient>
              </Defs>
              <Circle cx={r} cy={r} r={r - 1} fill={OR.bord} />
              <Circle cx={r} cy={r} r={r - D * 0.03} fill={`url(#or${id})`} />
              <Circle cx={r} cy={r} r={r - D * 0.135} fill="none" stroke={OR.bord} strokeOpacity={0.5} strokeWidth={1.2} />
              <Path id={`tour${id}`} d={cercle} fill="none" />
              <SvgText fill={OR.encre} fontSize={fsTour} fontFamily="Archivo_900Black" fontWeight="900" letterSpacing={1.2}>
                <TextPath href={`#tour${id}`} startOffset="0">{tourTexte}</TextPath>
              </SvgText>
            </Svg>
            <View style={{ position: 'absolute', left: 0, top: 0, width: D, height: D, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              {c.story ? <Image source={STICKERS[stickerDeCarte(c.d)]} style={{ width: D * 0.2, height: D * 0.2, marginBottom: 2 }} resizeMode="contain" /> : null}
              {c.hero ? <Valeur value={c.hero.value} unit={c.hero.unit} size={tailleHeros(c.hero, heroW, D * 0.27)} color={OR.encre} align="center" /> : null}
              {c.hero?.label ? <T size={Math.max(7, fit(c.hero.label, heroW, 10, 0.72))} weight="black" color={OR.encre} style={{ letterSpacing: 1.1, textAlign: 'center' }}>{traduire(c.hero.label).toUpperCase()}</T> : null}
            </View>
          </View>
        </View>
      </View>
      <Stats stats={c.rest.slice(0, 3)} ink={c.ink} largeur={c.L} size={c.story ? 28 : c.carre ? 19 : 23} centre />
      {c.bloc || c.rec ? (
        <View style={{ marginTop: c.story ? 12 : 8, alignSelf: 'stretch', borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 14, paddingVertical: 8, gap: 5 }}>
          {c.bloc ? <Lignes bloc={c.bloc} ink={c.ink} largeur={c.L - 28} size={12.5} sansTitre /> : null}
          {c.rec ? (
            <View style={{ gap: 1 }}>
              <Lbl color={rgba(c.ink, 0.85)} size={9}>{traduire('Record battu')}</Lbl>
              <T size={13.5} weight="black" color={c.ink}>{c.rec}</T>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ marginTop: c.story ? 14 : 8, alignSelf: 'stretch' }}>
        <Pied ink={c.ink} compact={!c.story} centre={c.story} />
      </View>
    </View>
  );
}

function MedailleSeance(c: Ctx) {
  const [hero, ...rest] = c.stats;
  const rec = c.carre ? null : ligneRecord(c.d, c.u);
  // en Story, une ou deux lignes du sport ; en Publication, seulement le record (la medaille prend la place)
  const bloc = c.story ? blocDetail(c.d, c.u, rec ? 1 : 2) : null;
  return <Medaille {...c} hero={hero ?? null} rest={rest} autour={`${c.titre} · ${c.d.sousTitre} · YOROI`} surtitre={c.titre} rec={rec} bloc={bloc} />;
}

// ============================================
// 6. TABLEAU DE SCORE : l'esprit combat, chiffres en points lumineux jaunes
// ============================================

/** Une case noire du tableau, les chiffres en points lumineux (une grille noire posee sur le jaune) */
function CaseLed({ children, pad = 8, grille = true, style, entete }: { children: React.ReactNode; pad?: number; grille?: boolean; style?: object; entete?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View style={[{ backgroundColor: '#000000', borderRadius: 8, padding: pad, overflow: 'hidden', borderWidth: 1, borderColor: '#24252B' }, style]}>
      {/* le libelle reste net, au-dessus de la grille des points lumineux */}
      {entete ? <View style={{ zIndex: 2 }}><Lbl color={BLANC} size={pad >= 10 ? 10 : 8.5}>{entete}</Lbl></View> : null}
      {children}
      {grille ? (
        <Svg pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
          <Defs>
            <Pattern id={`led${id}`} width={3.2} height={3.2} patternUnits="userSpaceOnUse">
              <Rect x={0} y={0} width={3.2} height={0.9} fill="#000000" />
              <Rect x={0} y={0} width={0.9} height={3.2} fill="#000000" />
            </Pattern>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#led${id})`} />
        </Svg>
      ) : null}
    </View>
  );
}

const JOURS_SEMAINE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((j) => traduire(j.charAt(0).toUpperCase() + j.slice(1)).toLowerCase());

/** « Mardi 13 octobre » devient « 13 octobre » sur le tableau de score, ou le nom du sport a besoin de place */
export function dateSansJour(sousTitre: string): string {
  const [premier, ...reste] = sousTitre.split(' ');
  return reste.length && JOURS_SEMAINE.includes((premier ?? '').toLowerCase()) ? reste.join(' ') : sousTitre;
}

function Score(c: Ctx) {
  const [hero, ...rest] = c.stats;
  const v = visuelDuSport(c.d);
  const trace = c.story && v.type === 'trace' ? v : null;
  const bloc = trace ? null : blocDetail(c.d, c.u, maxLignes(c, 3, 2));
  const rec = c.carre ? null : ligneRecord(c.d, c.u);
  const inner = c.L - 24;
  const n = Math.min(3, rest.length);
  const cellW = n ? (inner - 8 * (n - 1)) / n : inner;
  const max = c.story ? 92 : c.carre ? 54 : 68;
  return (
    <View style={{ flex: 1, paddingTop: c.padTop, paddingBottom: c.padBas, paddingHorizontal: PAD }}>
      <Fond c={c} voile={0.45} bas={0.5} />
      <View style={{ flex: 1, minHeight: 0, justifyContent: 'center' }}>
        <View style={{ width: c.L, borderRadius: 18, backgroundColor: '#121316', borderWidth: 4, borderColor: '#2A2B31', padding: 8, gap: 8, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, paddingTop: 2, gap: 8 }}>
            <Lbl color={BLANC} size={c.story ? 12 : 10.5} style={{ flexShrink: 1 }}>{c.titre}</Lbl>
            <Lbl color={BLANC} size={c.story ? 10.5 : 9.5} style={{ flexShrink: 0 }}>{dateSansJour(c.d.sousTitre)}</Lbl>
          </View>
          {hero ? (
            <CaseLed pad={10} entete={traduire(hero.label)}>
              <Valeur value={hero.value} unit={hero.unit} size={tailleHeros(hero, inner - 20, max)} color={LED} style={lueur('rgba(255,210,31,0.6)', 10)} />
            </CaseLed>
          ) : null}
          {n ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {rest.slice(0, 3).map((s, i) => {
                const txt = `${s.value}${s.unit ?? ''}`;
                return (
                  <CaseLed key={`${s.key}${i}`} pad={7} style={{ width: cellW }} entete={traduire(s.label)}>
                    <Valeur value={s.value} unit={s.unit} size={Math.min(c.story ? 26 : 20, fit(txt, cellW - 14, c.story ? 26 : 20, 0.64))} color={LED} style={lueur('rgba(255,210,31,0.5)', 8)} />
                  </CaseLed>
                );
              })}
            </View>
          ) : null}
          {trace ? (
            <CaseLed pad={10} grille={false} style={{ height: 150, alignItems: 'center' }}>
              <View style={{ width: inner * 0.62, height: '100%' }}><Trace trace={trace.trace} couleur={LED} glow depart="#000000" /></View>
            </CaseLed>
          ) : null}
          {bloc ? (
            <CaseLed pad={10} grille={false}>
              <Lignes bloc={bloc} ink={BLANC} droiteColor={LED} largeur={inner - 20} size={c.story ? 13.5 : 12} sansTitre filet="#26272D" />
            </CaseLed>
          ) : null}
          {rec ? (
            <CaseLed pad={8} grille={false} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: '#E5202A', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2 }}>
                <T size={10} weight="black" color={BLANC} style={{ letterSpacing: 1.2 }}>{traduire('RECORD')}</T>
              </View>
              <T size={12.5} weight="black" color={BLANC} style={{ flexShrink: 1 }}>{rec}</T>
            </CaseLed>
          ) : null}
        </View>
      </View>
      <View style={{ marginTop: c.story ? 14 : 8 }}>
        <Pied ink={c.ink} compact={!c.story} />
      </View>
    </View>
  );
}

// ============================================
// EXPLOITS : record, palier, compteur, objectif, bilan (Affiche ou Medaille)
// ============================================

function Progression({ b, ink, largeur }: { b: NonNullable<Exploit['barre']>; ink: string; largeur: number }) {
  const pct = Math.max(0, Math.min(1, b.fait / Math.max(1, b.total)));
  return (
    <View style={{ width: largeur, gap: 6 }}>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: rgba(ink, 0.22), overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(2.5, pct * 100)}%`, height: 12, borderRadius: 6, backgroundColor: ink }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <T size={11.5} weight="bold" color={rgba(ink, 0.88)} style={{ flexShrink: 1 }}>{b.legende}</T>
        <T size={11.5} weight="black" color={ink}>{`${Math.round(pct * 100)} %`}</T>
      </View>
    </View>
  );
}

function exploitDe(c: Ctx): Exploit {
  return exploitEnUnite(exploitVisible(c.d.exploit!, c.o.masque), c.u);
}

function cotesStats(e: Exploit): StatValue[] {
  return (e.cotes ?? []).slice(0, 3).map((x) => ({ key: 'exploit', label: x.label, value: x.value, unit: x.unit }));
}

function ExploitAffiche(c: Ctx) {
  const e = exploitDe(c);
  const max = c.story ? 130 : c.carre ? 76 : 96;
  const nListe = Math.min(e.liste?.length ?? 0, c.story ? 5 : c.carre ? 2 : 3);
  const cotes = c.o.epure ? [] : cotesStats(e);
  return (
    <View style={{ flex: 1, paddingTop: c.padTop, paddingBottom: c.padBas, paddingHorizontal: PAD }}>
      <Fond c={c} />
      <EnTete c={c} ink={c.ink} sansTitre />
      <View style={{ alignSelf: 'flex-start', marginTop: 10, borderRadius: 15, paddingHorizontal: 12, height: 30, justifyContent: 'center', backgroundColor: e.record ? c.ink : 'transparent', borderWidth: 2, borderColor: c.ink }}>
        <T size={fit(e.surtitre.toUpperCase(), 250, 12, 0.66)} weight="black" color={e.record ? contreEncre(c.ink, c.coul) : c.ink} style={{ letterSpacing: 1.4 }}>{e.surtitre.toUpperCase()}</T>
      </View>
      <View style={{ flex: 1, minHeight: 0 }} />
      <View style={{ gap: c.story ? 10 : 6 }}>
        {e.avant ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T size={12.5} weight="bold" color={rgba(c.ink, 0.8)}>{traduire('Ancien record')}</T>
            <T size={14} weight="black" color={rgba(c.ink, 0.9)} style={{ textDecorationLine: 'line-through' }}>{`${e.avant.value}${e.avant.unit ? ` ${e.avant.unit}` : ''}`}</T>
          </View>
        ) : null}
        {nListe ? (
          <View style={{ gap: 2 }}>
            {e.liste!.slice(0, nListe).map((x) => <T key={x} size={Math.min(c.story ? 36 : 26, fit(x, c.L, c.story ? 36 : 26, 0.62))} weight="black" color={c.ink} style={{ letterSpacing: -0.5 }}>{x}</T>)}
          </View>
        ) : e.hero.value ? (
          <Valeur value={e.hero.value} unit={e.hero.unit || undefined} size={tailleHeros(e.hero, c.L, max)} color={c.ink} />
        ) : null}
        <T size={fit(e.accroche, c.L * 1.6, c.story ? 26 : 20, 0.6)} weight="black" color={c.ink} lines={2} style={{ letterSpacing: -0.3 }}>{e.accroche}</T>
        {e.detail && !c.carre && !c.o.epure ? <T size={12.5} weight="bold" color={rgba(c.ink, 0.88)} lines={2}>{e.detail}</T> : null}
        {e.barre && !c.carre ? <View style={{ marginTop: 4 }}><Progression b={e.barre} ink={c.ink} largeur={c.L} /></View> : null}
        {cotes.length ? (
          <View style={{ borderTopWidth: 2, borderColor: rgba(c.ink, 0.9), paddingTop: c.story ? 10 : 6 }}>
            <Stats stats={cotes} ink={c.ink} largeur={c.L} size={c.story ? 26 : 20} />
          </View>
        ) : null}
        <View style={{ marginTop: c.story ? 10 : 4 }}>
          <Pied ink={c.ink} compact={!c.story} />
        </View>
      </View>
    </View>
  );
}

function ExploitMedaille(c: Ctx) {
  const e = exploitDe(c);
  const hero: StatValue | null = e.hero.value ? { key: 'exploit', label: '', value: e.hero.value, unit: e.hero.unit || undefined } : null;
  const bloc: BlocDetail | null = c.carre ? null : { titre: '', lignes: [{ gauche: e.accroche }] };
  return <Medaille {...c} hero={hero} rest={c.o.epure ? [] : cotesStats(e)} autour={`${e.surtitre} · ${c.d.sousTitre} · YOROI`} surtitre={e.surtitre} rec={null} bloc={bloc} />;
}

// ============================================
// LE CHOIX DES MODELES
// ============================================

export type ModeleInfo = { id: ModeleId; nom: string; explication: string };

/** Les six modeles, dans l'ordre du choix ; l'Affiche est le modele par defaut */
export const MODELES: ModeleInfo[] = [
  { id: 'affiche', nom: 'Affiche', explication: traduire('Ton chiffre en énorme sur une couleur franche, le visuel de ton sport et 3 stats.') },
  { id: 'bandeau', nom: 'Bandeau', explication: traduire('Ta photo en plein cadre, un bandeau de couleur range tes stats.') },
  { id: 'neon', nom: traduire('Néon nuit'), explication: traduire('Fond de nuit, ton tracé et ton chiffre qui brillent.') },
  { id: 'ticket', nom: traduire('Ticket de caisse'), explication: traduire('Ta séance en ticket de caisse, le total en gros.') },
  { id: 'medaille', nom: traduire('Médaille'), explication: traduire('Une médaille dorée, ton chiffre gravé au centre. Pour tes records et tes étapes.') },
  { id: 'score', nom: traduire('Tableau de score'), explication: traduire('Le panneau d’un stade, tes chiffres en points lumineux.') },
];

export const MODELES_SIX: ModeleId[] = MODELES.map((m) => m.id);
/** Un exploit (record, palier, bilan) se dessine en Affiche ou en Medaille */
const MODELES_EXPLOIT: ModeleId[] = ['affiche', 'medaille'];

export function modeleDispo(d: CarteData, id: ModeleId): boolean {
  if (d.moment === 'avant_apres') return id === 'affiche';
  if (d.moment === 'exploit') return MODELES_EXPLOIT.includes(id);
  return MODELES_SIX.includes(id);
}

export function modelesPour(d: CarteData): ModeleInfo[] {
  return MODELES.filter((m) => modeleDispo(d, m.id));
}

/** Le modele dessine : celui choisi s'il est propose pour cette carte, sinon l'Affiche (anciens reglages compris) */
export function modeleEffectif(d: CarteData, id: ModeleId): ModeleId {
  return modeleDispo(d, id) ? id : 'affiche';
}

export function explicationModele(m: ModeleInfo, _d?: CarteData): string {
  return m.explication;
}

/** Les modeles qui proposent le choix Clair ou Sombre (le papier du ticket) */
export function aClairSombre(id: ModeleId): boolean {
  return id === 'ticket';
}

/** Ce qui est dessine : ta photo (sauf « Que mes données » ou personne retiree) et la couleur choisie */
export function optionsDessinees(o: OptionsCarte, v: VisuelsCarte): { photo: string | null; coul: CouleurCarte } {
  const photo = o.fond === 'photo' && !!v.photo && !o.epure && !o.sansPersonne ? v.photo : null;
  return { photo, coul: couleurDe(o.couleur) };
}

/**
 * La carte. Rendue a 360 de large ; l'apercu la reduit avec une echelle, la capture la prend a sa taille.
 */
export const CarteRendu = forwardRef<View, Props>(({ data: brut, options, visuels }, ref) => {
  // 18 octobre 2026 : charges calculees en kilos, dessinees dans l'unite du reglage (kg ou lb)
  const u = useUnitePoids();
  const data = donneesEnUnite(brut, u);
  const W = CARTE_W;
  const H = HAUTEURS[options.format];
  if (data.moment === 'avant_apres') {
    return (
      <View ref={ref} collapsable={false} style={{ width: W, height: H, overflow: 'hidden', backgroundColor: options.sombre ? '#14161F' : '#F2F1EC' }}>
        <AvantApresVue d={data} o={options} H={H} signature={<Pied ink={options.sombre ? BLANC : ENCRE_PAPIER} compact={options.format !== 'story'} />} />
      </View>
    );
  }
  const { photo, coul } = optionsDessinees(options, visuels);
  const story = options.format === 'story';
  const carre = options.format === 'carre';
  const stats = statsEnUnite(chiffresAffiches(brut, options.chiffres, options.masque), u);
  const ctx: Ctx = {
    d: data,
    o: options,
    W,
    H,
    L: W - PAD * 2,
    story,
    carre,
    stats,
    titre: titreCarte(brut, options.masque),
    u,
    coul,
    photo,
    ink: photo ? BLANC : coul.encre,
    padTop: MARGES[options.format].haut,
    padBas: MARGES[options.format].bas,
  };
  const modele = modeleEffectif(data, options.modele);
  const exploit = data.moment === 'exploit' && !!data.exploit;
  const SIX: Partial<Record<ModeleId, (c: Ctx) => React.ReactElement>> = { affiche: Affiche, bandeau: Bandeau, neon: Neon, ticket: Ticket, medaille: MedailleSeance, score: Score };
  const Modele = exploit ? (modele === 'medaille' ? ExploitMedaille : ExploitAffiche) : SIX[modele] ?? Affiche;
  return (
    <View ref={ref} collapsable={false} style={{ width: W, height: H, overflow: 'hidden', backgroundColor: coul.fond }}>
      <Modele {...ctx} />
    </View>
  );
});
CarteRendu.displayName = 'CarteRendu';

/** Apercu reduit : la carte garde sa taille de 360 pour la capture, une echelle la fait tenir dans la largeur voulue */
export const CarteApercu = forwardRef<View, Props & { largeur: number }>(({ largeur, ...p }, ref) => {
  const H = HAUTEURS[p.options.format];
  const s = largeur / CARTE_W;
  return (
    <View style={{ width: largeur, height: H * s, borderRadius: 18 * s + 4, overflow: 'hidden', backgroundColor: '#121318' }}>
      <View style={{ width: CARTE_W, height: H, transform: [{ scale: s }], transformOrigin: 'top left' } as object}>
        <CarteRendu ref={ref} {...p} />
      </View>
    </View>
  );
});
CarteApercu.displayName = 'CarteApercu';
