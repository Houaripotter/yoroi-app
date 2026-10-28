/**
 * Cartes a partager (nuit du 14 octobre 2026) : le dessin d'une carte, toujours a 360 points de large
 * (story 360 x 640, post 360 x 450, carre 360 x 360), exportee en 1080 de large (capture x 3).
 * Dix modeles tres differents : Affiche, Minimal, Record, Semaine, Objectif, Bandeau, Colonne, Ticket, Polaroid, Geant.
 * Chaque bloc n'apparait que si sa donnee existe. Rouge seulement pour un record.
 * Tailles de texte calculees a la longueur (adjustsFontSizeToFit ne marche pas sur le web) : rien n'est coupe.
 * 17 octobre 2026 : la date tout en haut, le club de la seance (logo rond et nom) s'il y en a un, le sport en grand ;
 * le milieu reste libre pour la photo ou la scene ; les chiffres regroupes en bas ; la signature collee en bas,
 * sur le degrade du fond ; le record avec son trophee dore pose avec les chiffres, sans cadre rouge.
 * 17 octobre 2026 (cartes v4) : chaque modele a un nom parlant et une ligne d'explication ; Anneau devient Objectif et
 * n'est propose qu'avec un vrai objectif ; trois modeles en plus : Minimal (un seul grand chiffre), Record (le record
 * en vedette avec le trophee et l'ancien record), Semaine (tes 7 jours, les sports faits et tes clubs).
 * `sansPersonne` retire toute personne de la carte : ni personnage, ni ta photo de fond.
 * 17 octobre 2026 : carte Avant apres (tes deux photos de corps), dessinee par AvantApresVue, sans personnage ni decor.
 */
import React, { forwardRef, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import type { ImageSourcePropType, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line as SvgLine, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { TropheeRecord } from '@/components/yoroi/v2/charts/core';
import type { FontWeightKey } from '@/components/yoroi/tokens';
import { chiffresAffiches, nombre, titreCarte } from '@/lib/v2/cartes/chiffres';
import { exploitVisible } from '@/lib/v2/cartes/exploits';
import { getClubLogoSource } from '@/lib/sports';
import type { CarteData, Exploit, FormatId, Grand, ModeleId, OptionsCarte, StatValue } from '@/lib/v2/cartes/types';
import { BADGES, MENTION_STORES, SLOGANS, fondMeta } from './fonds';
import { SCENE_FOCUS, sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { devNow } from '@/lib/v2/creator/devClock';
import type { SceneId } from '@/lib/v2/espace';
import { cadrageScene, sceneDuFond, voilesFond } from '@/lib/v2/cartes/scenesFond';
import { AvantApresVue } from './AvantApresVue';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { chargeGrand, donneesEnUnite, exploitEnUnite, statsEnUnite } from '@/lib/v2/cartes/unite';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

export const CARTE_W = 360;
export const HAUTEURS: Record<FormatId, number> = { story: 640, post: 450, carre: 360 };
/** Taille d'export en pixels */
export const EXPORT: Record<FormatId, { w: number; h: number }> = {
  story: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  carre: { w: 1080, h: 1080 },
};

const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');

export type Palette = {
  ink: string;
  ink2: string;
  muted: string;
  line: string;
  panel: string;
  accent: string;
  record: string;
  track: string;
  shadow: TextStyle;
};

export function paletteDe(sombre: boolean): Palette {
  return sombre
    ? {
        ink: '#FFFFFF',
        ink2: 'rgba(255,255,255,0.82)',
        muted: 'rgba(255,255,255,0.72)',
        line: 'rgba(255,255,255,0.24)',
        panel: 'rgba(16,17,22,0.86)',
        accent: '#A9BDE8',
        record: '#E5484F',
        track: 'rgba(255,255,255,0.3)',
        shadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } },
      }
    : {
        ink: '#1D2029',
        ink2: '#3F434F',
        muted: '#6B6E78',
        line: 'rgba(29,32,41,0.16)',
        panel: 'rgba(255,255,255,0.92)',
        accent: '#2C4A84',
        record: '#B0282E',
        track: 'rgba(29,32,41,0.16)',
        shadow: {},
      };
}

export type VisuelsCarte = {
  /** image de la scene d'accueil */
  scene?: ImageSourcePropType | null;
  /** 24 octobre 2026 : l'id de la scene d'accueil, pour cadrer la carte sur son centre d'interet */
  sceneId?: SceneId | null;
  /** photo personnelle (uri) */
  photo?: string | null;
  /** personnage de l'utilisateur, null si « Sans personnage » */
  personnage?: ImageSourcePropType | null;
};

type Props = { data: CarteData; options: OptionsCarte; visuels: VisuelsCarte };

/** Taille de police pour que le texte tienne sur une ligne dans la largeur donnee */
export function fit(text: string, largeur: number, max: number, k = 0.6): number {
  const n = Math.max(1, text.length);
  return Math.max(10, Math.min(max, Math.floor(largeur / (n * k))));
}

function T({ children, size, weight = 'medium', color, style, lines = 1 }: { children: React.ReactNode; size: number; weight?: FontWeightKey; color: string; style?: TextStyle | TextStyle[]; lines?: number }) {
  return (
    <Ink size={size} weight={weight} color={color} allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={lines} style={style}>
      {children}
    </Ink>
  );
}

// ============================================
// FOND
// ============================================

/** Le fond est une image (scene, photo, decor) : les voiles du haut et du bas la rendent lisible */
function fondImage(o: OptionsCarte, v: VisuelsCarte): ImageSourcePropType | null {
  const meta = fondMeta(o.fond);
  // 24 octobre 2026 : une de tes scenes choisie dans « Tes scènes », en image fixe (jamais la video)
  const sid = sceneDuFond(o.fond);
  if (sid) return sceneForNow(sid, devNow());
  return o.fond === 'photo' && v.photo ? { uri: v.photo } : o.fond === 'scene' ? v.scene ?? null : meta.image ?? null;
}

/** Centre d'interet de la scene du fond (fraction de sa largeur), null si le fond n'est pas une scene */
function focusDuFond(o: OptionsCarte, v: VisuelsCarte): number | null {
  const sid = sceneDuFond(o.fond) ?? (o.fond === 'scene' ? v.sceneId ?? null : null);
  return sid ? SCENE_FOCUS[sid] ?? 0.5 : null;
}

/** Cle stable d'une image de fond : le numero du require, ou l'adresse de la photo */
function cleImage(src: ImageSourcePropType): string {
  if (typeof src === 'number') return `r${src}`;
  const u = (src as { uri?: string }).uri;
  return u ? `u${u}` : 'x';
}

/**
 * L'image du fond (bug du 17 octobre 2026) : sur iPhone, dans les vignettes reduites de « Tes cartes du moment »,
 * la vue native recyclee d'un badge des stores restait affichee a la place de la scene, etiree et floue
 * (« charg », « PONIB », « oog »), et la scene ne s'affichait jamais. Sur iOS le fond passe par expo-image,
 * avec une cle de recyclage propre a chaque image : rien de l'image precedente ne reste. Partout ailleurs
 * l'Image de React Native est remontee a chaque changement de source. Le degrade neutre reste toujours dessous :
 * pendant le chargement, c'est lui qu'on voit.
 */
function ImageFond({ src, cadrage }: { src: ImageSourcePropType; cadrage?: { width: number; left: number } | null }) {
  const cle = cleImage(src);
  // une scene paysage dans la carte portrait : elle glisse pour garder son centre d'interet au milieu
  const plein = cadrage
    ? { position: 'absolute' as const, left: cadrage.left, top: 0, width: cadrage.width, height: '100%' as const }
    : { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0, width: '100%' as const, height: '100%' as const };
  if (Platform.OS === 'ios') {
    return <ExpoImage key={cle} recyclingKey={cle} source={src as never} style={plein} contentFit="cover" transition={0} cachePolicy="memory-disk" />;
  }
  return <Image key={cle} source={src} style={plein} resizeMode="cover" />;
}

function Fond({ o, v, h, w = CARTE_W, fenetre, fort }: { o: OptionsCarte; v: VisuelsCarte; h: number; w?: number; fenetre?: boolean; fort?: boolean }) {
  const meta = fondMeta(o.fond);
  const src = fondImage(o, v);
  const degrade = meta.degrade ?? (o.sombre ? ['#2A2E39', '#121318'] : ['#F6F5F0', '#E2DFD6']);
  const voile = o.sombre ? '10,11,14' : '246,245,240';
  // un fond uni de l'autre ton recoit un voile plein, pour que le texte reste lisible
  const contraire = !src && !!meta.degrade && (o.sombre ? !!meta.clair : !meta.clair);
  const photo = o.fond === 'photo';
  // 17 octobre : le milieu reste clair pour voir la photo ou la scene ; le texte vit en haut et en bas, sur ses degrades
  // 24 octobre : voiles nettement alleges (valeurs et anciennes valeurs dans voilesFond)
  const vf = voilesFond(o.sombre, photo, fort);
  const focus = src ? focusDuFond(o, v) : null;
  const cadrage = focus !== null ? cadrageScene(focus, w, h) : null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, height: h }}>
      {/* le degrade toujours dessous : fond neutre tant que l'image n'est pas la */}
      <LinearGradient colors={degrade as [string, string]} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      {src ? <ImageFond src={src} cadrage={cadrage} /> : null}
      {contraire ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: `rgba(${voile},0.84)` }} /> : null}
      {src && !fenetre ? (
        <>
          {vf.general > 0 ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: `rgba(${voile},${vf.general})` }} /> : null}
          <LinearGradient colors={[`rgba(${voile},${vf.haut})`, `rgba(${voile},0)`]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h * vf.hautHauteur }} />
          <LinearGradient
            colors={[`rgba(${voile},0)`, `rgba(${voile},${vf.basMilieu})`, `rgba(${voile},${vf.basFin})`]}
            locations={[0, vf.basMilieuPos, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * vf.basHauteur }}
          />
        </>
      ) : null}
    </View>
  );
}

// ============================================
// PETITS BLOCS
// ============================================

/** La signature, collee en bas de la carte : logo, YOROI : Musculation, MMA, Boxe, badges des stores */
export function Signature({ pal, slogan, compact }: { pal: Palette; slogan: number; compact?: boolean }) {
  const s = SLOGANS[slogan] ?? SLOGANS[0];
  const logo = compact ? 30 : 36;
  const bh = compact ? 17 : 20;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${s}. ${MENTION_STORES}`}>
      <Image source={LOGO} style={{ width: logo, height: logo, borderRadius: logo * 0.24 }} />
      <View style={{ flex: 1, minWidth: 0, gap: compact ? 3 : 4 }}>
        <T size={fit(s, 250, compact ? 12 : 14, 0.52)} weight="extraBold" color={pal.ink} style={pal.shadow}>{s}</T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Image source={BADGES.apple.image} style={{ width: Math.round(bh * BADGES.apple.ratio), height: bh }} resizeMode="contain" />
          <Image source={BADGES.google.image} style={{ width: Math.round(bh * BADGES.google.ratio), height: bh }} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
}

function Valeur({ s, size, pal, unitRatio = 0.32, align }: { s: StatValue; size: number; pal: Palette; unitRatio?: number; align?: 'flex-start' | 'flex-end' | 'center' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Math.max(3, size * 0.06), justifyContent: align }}>
      <T size={size} weight="black" color={pal.ink} style={[{ letterSpacing: -size * 0.04, fontVariant: ['tabular-nums'], lineHeight: Math.round(size * 1.08) }, pal.shadow]}>{s.value}</T>
      {s.unit ? <T size={Math.max(11, Math.round(size * unitRatio))} weight="extraBold" color={pal.ink2} style={pal.shadow}>{s.unit}</T> : null}
    </View>
  );
}

/** Le chiffre et son libelle ; les zones sont dessinees en barre */
function Chiffre({ s, size, pal, largeur, align = 'flex-start', labelEnHaut, hero }: { s: StatValue; size: number; pal: Palette; largeur: number; align?: 'flex-start' | 'flex-end' | 'center'; labelEnHaut?: boolean; hero?: boolean }) {
  const txt = `${s.value}${s.unit ? ` ${s.unit}` : ''}`;
  const sz = Math.min(size, fit(txt, largeur, size, 0.6));
  const label = (
    <T size={hero ? 15 : Math.max(11, Math.min(13, Math.round(size * 0.4)))} weight={hero ? 'extraBold' : 'bold'} color={hero ? pal.ink2 : pal.muted} style={[{ textAlign: align === 'flex-end' ? 'right' : align === 'center' ? 'center' : 'left' }, pal.shadow]}>
      {traduire(s.label)}
    </T>
  );
  if (s.key === 'zones' && s.zones) {
    return (
      <View style={{ gap: 4, width: largeur, alignItems: align }}>
        {labelEnHaut ? label : null}
        <T size={Math.min(sz, fit(s.value, largeur, sz, 0.62))} weight="black" color={pal.ink} style={pal.shadow}>{s.value}</T>
        <Zones z={s.zones} largeur={Math.min(largeur, 150)} pal={pal} />
        {labelEnHaut ? null : label}
      </View>
    );
  }
  return (
    <View style={{ gap: 1, alignItems: align, maxWidth: largeur }}>
      {labelEnHaut ? label : null}
      <Valeur s={s} size={sz} pal={pal} align={align} />
      {labelEnHaut ? null : label}
    </View>
  );
}

const ZONE_COULEURS = ['#B9C6DF', '#7E98CC', '#4A69A8', '#D2B064', '#A8832F'];

function Zones({ z, largeur, pal }: { z: number[]; largeur: number; pal: Palette }) {
  const total = z.reduce((a, b) => a + b, 0) || 1;
  return (
    <View style={{ flexDirection: 'row', width: largeur, height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: pal.track, gap: 2 }}>
      {z.map((x, i) => (x > 0 ? <View key={i} style={{ flex: x / total, backgroundColor: ZONE_COULEURS[i] }} /> : null))}
    </View>
  );
}

const LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function Jours({ jours, pal, taille = 30 }: { jours: boolean[]; pal: Palette; taille?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: Math.round(taille * 0.22) }}>
      {jours.map((on, i) => (
        <View key={i} style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: on ? pal.ink : pal.ink === '#FFFFFF' ? 'rgba(10,11,14,0.35)' : 'rgba(255,255,255,0.55)', borderWidth: 1.5, borderColor: on ? pal.ink : pal.line, alignItems: 'center', justifyContent: 'center' }}>
            {on ? (
              <Svg width={taille * 0.5} height={taille * 0.5} viewBox="0 0 24 24">
                <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={pal.ink === '#FFFFFF' ? '#14161C' : '#FFFFFF'} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : null}
          </View>
          <T size={10} weight="bold" color={pal.muted} style={pal.shadow}>{LETTRES[i]}</T>
        </View>
      ))}
    </View>
  );
}

/**
 * Le record, pose avec les chiffres (17 octobre : plus de cadre rouge au milieu de l'image).
 * Le trophee dore en grand, « Nouveau record » en rouge, l'exercice et la charge en dessous.
 */
function Record({ data, pal, largeur = 300, centre }: { data: CarteData; pal: Palette; largeur?: number; centre?: boolean }) {
  const r = data.seance?.records?.[0];
  if (!r) return null;
  const plus = (data.seance?.records?.length ?? 0) - 1;
  const texte = plus > 0 ? traduirePluriel(plus, plus > 1, "{0} et {1} autre", "{0} et {1} autres", sansTiret(r.nom), plus) : `${sansTiret(r.nom)}, ${r.texte}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: largeur, alignSelf: centre ? 'center' : 'flex-start' }}>
      <TropheeRecord size={30} couleurs={{ fond: '#C9A13B', trophee: '#FFFFFF' }} />
      <View style={{ flexShrink: 1, minWidth: 0, gap: 1 }}>
        {/* sur une image sombre le rouge se perd : le libelle prend l'or du trophee ; sur clair, le rouge des records */}
        <T size={12} weight="black" color={pal.ink === '#FFFFFF' ? '#F2C75C' : pal.record} style={[{ letterSpacing: 0.2 }, pal.shadow]}>{plus > 0 ? traduire('Nouveaux records') : traduire('Nouveau record')}</T>
        <T size={13} weight="extraBold" color={pal.ink} lines={2} style={pal.shadow}>{texte}</T>
      </View>
    </View>
  );
}

function BarreObjectif({ data, pal, largeur, legende = true }: { data: CarteData; pal: Palette; largeur: number; legende?: boolean }) {
  const p = data.pesee;
  if (!p || !p.objectif || !p.depart || Math.abs(p.depart - p.objectif) < 0.1) return null;
  const losing = p.objectif < p.depart;
  const pct = Math.max(0, Math.min(1, (losing ? p.depart - p.poids : p.poids - p.depart) / Math.abs(p.depart - p.objectif)));
  return (
    <View style={{ width: largeur, gap: 5 }}>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: pal.track, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(3, pct * 100)}%`, height: 8, borderRadius: 4, backgroundColor: pal.ink }} />
      </View>
      {legende ? <T size={11} weight="bold" color={pal.muted} style={pal.shadow}>{traduire("{0} % du chemin vers ton objectif", Math.round(pct * 100))}</T> : null}
    </View>
  );
}

/** Le bloc propre au moment : jours de la semaine, barre d'objectif, record */
function Extra({ data, pal, largeur, jours = 30, stats }: { data: CarteData; pal: Palette; largeur: number; jours?: number; stats?: StatValue[] }) {
  if (data.moment === 'semaine' && data.semaine) return <Jours jours={data.semaine.jours} pal={pal} taille={jours} />;
  // la legende disparait quand le pourcentage est deja un des chiffres
  if (data.moment === 'pesee') return <BarreObjectif data={data} pal={pal} largeur={largeur} legende={!stats?.some((x) => x.key === 'objectif_pct')} />;
  return <Record data={data} pal={pal} largeur={largeur} />;
}

function aUnExtra(data: CarteData): boolean {
  if (data.moment === 'semaine') return !!data.semaine;
  if (data.moment === 'pesee') return !!(data.pesee?.objectif && data.pesee?.depart);
  return !!data.seance?.records?.length;
}

/** Initiales d'un club sans logo : « Team Marseille » donne « TM » */
export function initialesClub(nom: string): string {
  const mots = nom.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return (mots.length > 1 ? mots[0][0] + mots[1][0] : (mots[0] ?? '').slice(0, 2)).toUpperCase();
}

/** Le club de la seance : son logo rond (ou ses initiales) et son nom, sur une pastille lisible sur une photo */
function ClubPuce({ club, pal, max }: { club: NonNullable<CarteData['club']>; pal: Palette; max: number }) {
  const src = club.logo ? getClubLogoSource(club.logo) : null;
  const sombre = pal.ink === '#FFFFFF';
  const D = 26;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: max, height: 32, paddingLeft: 3, paddingRight: 11, borderRadius: 16, backgroundColor: sombre ? 'rgba(10,11,14,0.46)' : 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: pal.line }}>
      {src ? (
        <Image source={src} style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: '#FFFFFF' }} resizeMode="cover" />
      ) : (
        <View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: pal.ink, alignItems: 'center', justifyContent: 'center' }}>
          <T size={10} weight="black" color={sombre ? '#14161C' : '#FFFFFF'}>{initialesClub(club.nom)}</T>
        </View>
      )}
      <T size={12} weight="extraBold" color={pal.ink} style={{ flexShrink: 1 }}>{traduire(club.nom)}</T>
    </View>
  );
}

/**
 * Le haut de chaque carte (17 octobre) : la date tout en haut, le club de la seance a droite s'il y en a un,
 * puis le sport (ou le titre du moment) en grand. Centre : le club, la date, puis le titre, les uns sous les autres.
 */
function Haut({ d, titre, pal, largeur, max = 28, centre, sansTitre }: { d: CarteData; titre: string; pal: Palette; largeur: number; max?: number; centre?: boolean; sansTitre?: boolean }) {
  const club = d.club?.nom ? <ClubPuce club={d.club} pal={pal} max={centre ? largeur : Math.round(largeur * 0.56)} /> : null;
  const date = <T size={13} weight="extraBold" color={pal.ink2} style={[{ flexShrink: 1, letterSpacing: 0.1, textAlign: centre ? 'center' : 'left' }, pal.shadow]}>{d.sousTitre}</T>;
  return (
    <View style={{ width: largeur, gap: 6, alignItems: centre ? 'center' : 'stretch' }}>
      {centre ? (
        <>
          {club}
          {date}
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: club ? 32 : undefined }}>
          {date}
          {club}
        </View>
      )}
      {sansTitre ? null : <T size={fit(titre, largeur, max, 0.58)} weight="black" color={pal.ink} style={[{ letterSpacing: -0.5, textAlign: centre ? 'center' : 'left' }, pal.shadow]}>{titre}</T>}
    </View>
  );
}

/**
 * La place libre entre le haut et les chiffres : la photo ou la scene s'y voit, le personnage s'y tient,
 * ses pieds pouvant descendre de `descente` points a cote des chiffres (jamais sur un texte du haut).
 */
function Zone({ fig, descente = 0, droite = -14, ratio = 0.7, maxW }: { fig: ImageSourcePropType | null; descente?: number; droite?: number; ratio?: number; maxW?: number }) {
  // hauteur mesuree : le personnage tient exactement dans la place libre (aspectRatio en absolu varie selon la plateforme)
  const [h, setH] = useState(0);
  const brut = Math.max(0, h - 4 + descente);
  const fh = maxW && brut * ratio > maxW ? Math.round(maxW / ratio) : brut;
  return (
    <View style={{ flex: 1, minHeight: 0 }} onLayout={fig ? (e) => setH(Math.round(e.nativeEvent.layout.height)) : undefined}>
      {/* trop petit, il ferait figurine : on ne le montre pas */}
      {fig && fh > 90 ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: droite, top: 4, width: Math.round(fh * ratio), height: fh }}>
          <Image source={fig} style={{ width: Math.round(fh * ratio), height: fh }} resizeMode="contain" />
        </View>
      ) : null}
    </View>
  );
}

// ============================================
// LES MODELES
// ============================================

type Ctx = { d: CarteData; o: OptionsCarte; v: VisuelsCarte; pal: Palette; W: number; H: number; stats: StatValue[]; titre: string; fig: ImageSourcePropType | null; padTop: number; padBas: number; /** unite de poids du reglage (18 octobre 2026) */ u: UnitePoids };

const PAD = 22;

/** Grand chiffre en bas a gauche, chiffres secondaires alignes dessous, le personnage debout a droite */
function Affiche({ d, o, pal, W, stats, titre, fig, padTop, padBas }: Ctx) {
  const [hero, ...rest] = stats;
  const story = o.format === 'story';
  const L = W - PAD * 2;
  const heroMax = story ? 112 : o.format === 'post' ? 86 : 70;
  const heroW = L;
  const extra = aUnExtra(d) && (story || o.format === 'post');
  // a cote d'un chiffre court, le personnage descend jusqu'aux chiffres secondaires (pieds au niveau du grand chiffre)
  const heroSz = hero ? Math.min(heroMax, fit(`${hero.value}${hero.unit ? ` ${hero.unit}` : ''}`, L, heroMax, 0.6)) : 0;
  const heroTexte = hero ? (hero.value.length + (hero.unit ? hero.unit.length * 0.36 + 0.3 : 0)) * 0.62 * heroSz : L;
  const libre = L - heroTexte;
  // avec un record, des jours ou une barre au-dessus du chiffre, il reste dans la place libre (rien ne passe sous ses pieds)
  const descend = hero && hero.key !== 'zones' && libre > 80 && !extra;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 34 : 28} />
      <Zone fig={fig} descente={descend ? Math.round(heroSz * 1.08) + 18 : 0} maxW={descend ? libre + 30 : undefined} />
      <View style={{ gap: story ? 12 : 7 }}>
        {extra ? <Extra data={d} pal={pal} largeur={L} jours={story ? 32 : 26} stats={stats} /> : null}
        {hero ? <Chiffre s={hero} size={heroMax} pal={pal} largeur={heroW} labelEnHaut hero /> : null}
        {rest.length ? (
          <View style={{ flexDirection: 'row', gap: 14, borderTopWidth: 1, borderColor: pal.line, paddingTop: story ? 12 : 8 }}>
            {rest.map((s) => (
              <View key={s.key} style={{ flex: 1, minWidth: 0 }}>
                <Chiffre s={s} size={story ? 30 : 23} pal={pal} largeur={(L - 14 * (rest.length - 1)) / rest.length} />
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ height: story ? 8 : 2 }} />
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

/** Tous les chiffres a egalite sur une bande en bas, separes par des filets */
function Bandeau({ d, o, pal, W, stats, titre, fig, padTop, padBas }: Ctx) {
  const story = o.format === 'story';
  const L = W - PAD * 2;
  const n = stats.length;
  const col = (L - 12 * (n - 1)) / n;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 34 : 28} />
      <Zone fig={fig} droite={0} />
      <View style={{ gap: story ? 14 : 9 }}>
        {aUnExtra(d) ? <Extra data={d} pal={pal} largeur={L} jours={story ? 30 : 24} stats={stats} /> : null}
        <View style={{ flexDirection: 'row', gap: 12, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: pal.line, paddingVertical: story ? 12 : 8 }}>
          {stats.map((s, i) => (
            <View key={s.key} style={{ width: col, borderLeftWidth: i ? 1 : 0, borderColor: pal.line, paddingLeft: i ? 10 : 0 }}>
              <Chiffre s={s} size={story ? (n > 3 ? 26 : 34) : n > 3 ? 20 : 26} pal={pal} largeur={col - (i ? 10 : 0)} labelEnHaut />
            </View>
          ))}
        </View>
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

/** Les chiffres empiles en colonne a gauche, en bas, le personnage a droite */
function Colonne({ d, o, v, pal, W, H, stats, titre, fig, padTop, padBas }: Ctx) {
  const story = o.format === 'story';
  // en clair sur une image chargee, la colonne monte au milieu ou le voile est leger : un voile pose derriere les chiffres
  // et des libelles en encre secondaire les gardent lisibles (AA), comme les panneaux des autres modeles
  const voile = !o.sombre && !!fondImage(o, v);
  const palC = voile ? { ...pal, muted: pal.ink2 } : pal;
  const L = W - PAD * 2;
  const colW = fig ? Math.round(W * 0.56) : L;
  const n = stats.length;
  const size = story ? (n > 3 ? 42 : 50) : o.format === 'post' ? (n > 3 ? 28 : 34) : n > 3 ? 21 : 26;
  const extra = aUnExtra(d) && o.format !== 'carre';
  // le personnage se tient a droite des chiffres, ses pieds au-dessus de la signature
  const figW = Math.round(W * 0.42);
  const figH = Math.min(Math.round(figW / 0.7), Math.round(H * (story ? 0.5 : 0.56)));
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Figure src={fig} w={figW} h={figH} style={{ right: -14, bottom: padBas + (story ? 54 : 42) }} />
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 34 : 28} />
      <View style={{ flex: 1 }} />
      <View style={{ gap: story ? 12 : 6 }}>
        <View>
          {voile ? <View pointerEvents="none" style={{ position: 'absolute', left: -10, right: -2, top: -6, bottom: -6, borderRadius: 14, backgroundColor: 'rgba(246,245,240,0.82)' }} /> : null}
          {stats.map((s, i) => (
            <View key={s.key} style={{ borderTopWidth: i ? 1 : 0, borderColor: pal.line, paddingVertical: story ? 8 : 4, width: colW }}>
              <Chiffre s={s} size={i === 0 ? Math.round(size * 1.18) : size} pal={palC} largeur={colW} labelEnHaut hero={i === 0} />
            </View>
          ))}
        </View>
        {extra ? <Extra data={d} pal={pal} largeur={colW} jours={story ? 28 : 22} stats={stats} /> : null}
        <View style={{ height: story ? 4 : 0 }} />
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

/** Un ticket de caisse pose en bas : les lignes de chiffres, puis le total en grand */
function Ticket({ d, o, pal, W, stats, titre, fig, padTop, padBas }: Ctx) {
  const story = o.format === 'story';
  const [hero, ...rest] = stats;
  const L = W - PAD * 2;
  const inner = L - 36;
  const surFondSombre = o.sombre && (o.fond === 'noir' || o.fond === 'ardoise' || o.fond === 'ocean');
  const panel = pal.ink === '#FFFFFF' ? (surFondSombre ? '#262A34' : 'rgba(18,19,24,0.88)') : 'rgba(255,255,255,0.95)';
  const sans = { ...pal, shadow: {} };
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 34 : 28} />
      <Zone fig={fig} droite={4} ratio={0.75} />
      <View style={{ gap: story ? 12 : 8 }}>
        <View style={{ borderRadius: 20, backgroundColor: panel, borderWidth: 1, borderColor: pal.line, paddingHorizontal: 18, paddingTop: story ? 16 : 11, paddingBottom: story ? 16 : 11, gap: story ? 11 : 6 }}>
          {rest.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <T size={13} weight="bold" color={pal.ink2} style={{ flexShrink: 1 }}>{traduire(s.label)}</T>
              {s.key === 'zones' && s.zones ? (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <T size={16} weight="black" color={pal.ink}>{s.value}</T>
                  <Zones z={s.zones} largeur={110} pal={pal} />
                </View>
              ) : (
                <Valeur s={s} size={story ? 20 : 16} pal={sans} unitRatio={0.6} />
              )}
            </View>
          ))}
          {aUnExtra(d) && o.format !== 'carre' ? <Extra data={d} pal={sans} largeur={inner} jours={story ? 28 : 22} stats={stats} /> : null}
          {hero ? (
            <>
              <Svg width={inner} height={2}>
                <SvgLine x1={0} y1={1} x2={inner} y2={1} stroke={pal.ink} strokeOpacity={0.5} strokeWidth={2} strokeDasharray="6 6" />
              </Svg>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                <T size={13} weight="black" color={pal.ink} style={{ flexShrink: 1, paddingBottom: 8 }} lines={2}>{traduire(hero.label)}</T>
                {hero.key === 'zones' ? (
                  <Chiffre s={hero} size={story ? 40 : 30} pal={sans} largeur={inner * 0.62} align="flex-end" />
                ) : (
                  <Valeur s={hero} size={Math.min(story ? 62 : 42, fit(`${hero.value} ${hero.unit ?? ''}`, inner * 0.66, story ? 62 : 42, 0.6))} pal={sans} align="flex-end" />
                )}
              </View>
            </>
          ) : null}
        </View>
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

/** Polaroid : la photo (ou la scene) dans une fenetre en haut, la date et le sport poses dessus ; les chiffres sur le papier */
function Cadre(c: Ctx) {
  const { d, o, v, pal, W, H, stats, titre, fig, padBas } = c;
  const story = o.format === 'story';
  const [hero, ...rest] = stats;
  const marge = 12;
  const fenH = Math.round(H * (story ? 0.52 : o.format === 'post' ? 0.46 : 0.4));
  const fenW = W - marge * 2;
  const papier = o.sombre ? '#121318' : '#F4F2EC';
  const meta = fondMeta(o.fond);
  const image = !!fondImage(o, v);
  // le texte pose sur la fenetre : blanc sur une image ou un fond fonce, encre sur un fond clair
  const fenClaire = !image && (meta.degrade ? !!meta.clair : !o.sombre);
  const palF = fenClaire ? paletteDe(false) : paletteDe(true);
  const L = W - (PAD - 2) * 2;
  return (
    <View style={{ flex: 1, backgroundColor: papier }}>
      <View style={{ marginTop: marge, marginHorizontal: marge, height: fenH, borderRadius: 16, overflow: 'hidden' }}>
        <Fond o={o} v={v} h={fenH} w={fenW} fenetre />
        {/* 24 octobre 2026 : voiles alleges (avant 0.62 sur 42 % en haut, 0.6 sur 36 % en bas) */}
        {image ? <LinearGradient pointerEvents="none" colors={['rgba(10,11,14,0.45)', 'rgba(10,11,14,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: fenH * 0.36 }} /> : null}
        {image ? <LinearGradient pointerEvents="none" colors={['rgba(10,11,14,0)', 'rgba(10,11,14,0.45)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: fenH * 0.32 }} /> : null}
        <Figure src={fig} w={fenH * 0.6} h={fenH * 0.8} style={{ right: 4, bottom: 0 }} />
        {d.moment === 'seance' && aUnExtra(d) && o.format !== 'carre' ? <View style={{ position: 'absolute', left: 14, bottom: 12, right: fig ? fenH * 0.42 : 14 }}><Record data={d} pal={palF} largeur={fenW - 28} /></View> : null}
        <View style={{ position: 'absolute', left: 14, right: 14, top: story ? 16 : 12 }}>
          <Haut d={d} titre={titre} pal={palF} largeur={fenW - 28} max={story ? 32 : 26} />
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: PAD - 2, paddingTop: story ? 14 : 8, paddingBottom: padBas, gap: story ? 10 : 6 }}>
        {aUnExtra(d) && d.moment !== 'seance' && o.format !== 'carre' ? <Extra data={d} pal={pal} largeur={L} jours={story ? 28 : 22} stats={stats} /> : null}
        {hero ? <Chiffre s={hero} size={story ? 58 : o.format === 'post' ? 40 : 34} pal={pal} largeur={L} labelEnHaut hero={story} /> : null}
        {rest.length ? (
          <View style={{ flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: pal.line, paddingTop: story ? 10 : 6 }}>
            {rest.map((s) => (
              <View key={s.key} style={{ flex: 1, minWidth: 0 }}>
                <Chiffre s={s} size={story ? 24 : 18} pal={pal} largeur={(L - 10 * (rest.length - 1)) / rest.length} />
              </View>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Signature pal={pal} slogan={o.slogan} compact />
      </View>
    </View>
  );
}

function Figure({ src, w, h, style }: { src?: ImageSourcePropType | null; w: number; h: number; style: object }) {
  if (!src) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: w, height: h }, style]}>
      <Image source={src} style={{ width: w, height: h }} resizeMode="contain" />
    </View>
  );
}

/** Le sport en lettres geantes en haut, les chiffres en cases en bas */
function Geant({ d, o, pal, W, stats, titre, fig, padTop, padBas }: Ctx) {
  const story = o.format === 'story';
  const L = W - PAD * 2;
  const mots = titre.toUpperCase().split(/\s+/).filter(Boolean);
  // au plus 3 lignes : on regroupe les petits mots
  const lignes: string[] = [];
  for (const m of mots) {
    const last = lignes[lignes.length - 1];
    if (last && (last.length + m.length + 1 <= 9 || lignes.length >= 3)) lignes[lignes.length - 1] = `${last} ${m}`;
    else lignes.push(m);
  }
  const maxG = story ? 92 : o.format === 'post' ? 64 : 50;
  const n = stats.length;
  const cell = (L - 10) / 2;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} sansTitre />
      <View style={{ marginTop: 2 }}>
        {lignes.map((l, i) => (
          <T key={i} size={fit(l, L, maxG, 0.9)} weight="black" color={pal.ink} style={[{ letterSpacing: -1.5 }, pal.shadow]}>{l}</T>
        ))}
      </View>
      <Zone fig={fig} droite={-6} />
      {aUnExtra(d) && o.format !== 'carre' ? <View style={{ marginBottom: story ? 12 : 7 }}><Extra data={d} pal={pal} largeur={L} jours={story ? 30 : 24} stats={stats} /></View> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map((s, i) => {
          const large = (n === 3 || n === 1) && i === 0;
          return (
            <View key={s.key} style={{ width: large ? L : cell, borderRadius: 14, borderWidth: 1.5, borderColor: pal.line, paddingVertical: story ? 10 : 6, paddingHorizontal: 12, backgroundColor: o.sombre ? 'rgba(10,11,14,0.42)' : 'rgba(255,255,255,0.62)' }}>
              <Chiffre s={s} size={story ? (large ? 42 : 30) : large ? 28 : 21} pal={pal} largeur={(large ? L : cell) - 24} labelEnHaut />
            </View>
          );
        })}
      </View>
      <View style={{ height: story ? 12 : 8 }} />
      <Signature pal={pal} slogan={o.slogan} compact={!story} />
    </View>
  );
}

/** Proportion vraie dessinee par l'anneau, ou null (simple cercle, sans pretendre a un chiffre) */
function proportionAnneau(d: CarteData): { segments?: boolean[]; pct?: number } | null {
  if (d.moment === 'pesee' && d.pesee?.objectif && d.pesee.depart && Math.abs(d.pesee.depart - d.pesee.objectif) >= 0.1) {
    const p = d.pesee;
    const losing = p.objectif! < p.depart!;
    return { pct: Math.max(0, Math.min(1, (losing ? p.depart! - p.poids : p.poids - p.depart!) / Math.abs(p.depart! - p.objectif!))) };
  }
  if (d.moment === 'semaine' && d.semaine) {
    if (d.semaine.objectif > 0) return { pct: Math.min(1, d.semaine.seances / d.semaine.objectif) };
    return { segments: d.semaine.jours };
  }
  return null;
}

/** Objectif (ex Anneau) : la progression vraie vers ton objectif, ecrite dans l'anneau ou dessous ; ton personnage dedans */
function Anneau({ d, o, pal, W, stats, titre, fig: figure, padTop, padBas }: Ctx) {
  const story = o.format === 'story';
  const L = W - PAD * 2;
  // en Carre, la place manque : la progression dans l'anneau, sans personnage
  const fig = o.format === 'carre' ? null : figure;
  const D = story ? 230 : o.format === 'post' ? 168 : 134;
  const st = story ? 14 : 11;
  const r = (D - st) / 2;
  const prop = proportionAnneau(d);
  const circ = 2 * Math.PI * r;
  const arcs: React.ReactNode[] = [];
  if (prop?.segments) {
    const seg = circ / 7;
    prop.segments.forEach((on, i) => {
      arcs.push(
        <Circle key={i} cx={D / 2} cy={D / 2} r={r} stroke={on ? pal.ink : pal.track} strokeWidth={st} fill="none" strokeDasharray={`${seg - 8} ${circ - seg + 8}`} strokeDashoffset={-seg * i} transform={`rotate(-90 ${D / 2} ${D / 2})`} />,
      );
    });
  } else if (prop?.pct !== undefined) {
    arcs.push(<Circle key="t" cx={D / 2} cy={D / 2} r={r} stroke={pal.track} strokeWidth={st} fill="none" />);
    if (prop.pct > 0.005) arcs.push(<Circle key="p" cx={D / 2} cy={D / 2} r={r} stroke={pal.ink} strokeWidth={st} strokeLinecap="round" fill="none" strokeDasharray={`${circ * prop.pct} ${circ}`} transform={`rotate(-90 ${D / 2} ${D / 2})`} />);
  } else {
    arcs.push(<Circle key="c" cx={D / 2} cy={D / 2} r={r} stroke={pal.ink} strokeWidth={2} fill="none" opacity={0.6} />);
  }
  // 17 octobre (v4) : la progression vraie est toujours ecrite, dans l'anneau ou juste dessous si ton personnage y est
  const progres: { value: string; unit?: string; label: string; court: string } | null =
    prop?.pct === undefined
      ? null
      : d.moment === 'semaine' && d.semaine
        ? { value: `${d.semaine.seances}/${d.semaine.objectif}`, label: traduire('séances de ton objectif'), court: traduire('séances') }
        : { value: String(Math.round(prop.pct * 100)), unit: '%', label: traduire('du chemin vers ton objectif'), court: traduire('du chemin') };
  const doublon = d.moment === 'semaine' ? 'seances' : 'objectif_pct';
  const dessous = (progres ? stats.filter((x) => x.key !== doublon) : stats).slice(0, 3);
  // dans l'anneau le libelle court tient entre les traits ; dessous, la phrase entiere
  const progresVue = (taille: number, dedans: boolean) =>
    progres ? (
      <View style={{ alignItems: 'center', maxWidth: dedans ? D - st * 2 - 16 : L }}>
        <Valeur s={{ key: 'objectif_pct', label: progres.label, value: progres.value, unit: progres.unit }} size={taille} pal={pal} align="center" />
        <T size={story ? 13 : 11} weight="bold" color={pal.ink2} style={[{ textAlign: 'center' }, pal.shadow]}>{dedans ? progres.court : progres.label}</T>
      </View>
    ) : null;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD, alignItems: 'center' }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 30 : 24} centre />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: D, height: D, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={D} height={D} style={{ position: 'absolute' }}>{arcs}</Svg>
          {fig ? (
            <View style={{ width: D - st * 2 - 8, height: D - st * 2 - 8, borderRadius: D, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Image source={fig} style={{ width: (D - st * 2) * 0.8, height: D - st * 2 - 4 }} resizeMode="contain" />
            </View>
          ) : (
            progresVue(story ? 56 : o.format === 'post' ? 38 : 30, true)
          )}
        </View>
        {fig && progres ? <View style={{ marginTop: story ? 10 : 4 }}>{progresVue(story ? 34 : 24, false)}</View> : null}
      </View>
      {d.moment === 'seance' && d.seance?.records?.length && o.format !== 'carre' ? <View style={{ marginBottom: story ? 12 : 8, alignSelf: 'stretch', alignItems: 'center' }}><Record data={d} pal={pal} largeur={L} centre /></View> : null}
      {dessous.length ? (
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch', justifyContent: 'center', borderTopWidth: 1, borderColor: pal.line, paddingTop: story ? 12 : 8, marginBottom: story ? 14 : 8 }}>
          {dessous.map((s, i) => (
            <View key={s.key} style={{ flex: 1, minWidth: 0, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: pal.line }}>
              <Chiffre s={s} size={story ? 26 : 19} pal={pal} largeur={(L - 10 * (dessous.length - 1)) / dessous.length - 8} align="center" />
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ alignSelf: 'stretch' }}>
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

/** Minimal : un seul grand chiffre, le titre en petit et la signature ; rien d'autre */
function Minimal({ d, o, pal, W, stats, titre, fig, padTop, padBas }: Ctx) {
  const story = o.format === 'story';
  const L = W - PAD * 2;
  const hero = stats[0];
  const max = story ? 150 : o.format === 'post' ? 112 : 92;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 26 : 22} />
      <Zone fig={fig} />
      <View style={{ gap: story ? 14 : 8 }}>
        {hero ? (
          <View style={{ gap: story ? 2 : 0 }}>
            <T size={story ? 17 : 14} weight="extraBold" color={pal.ink2} style={pal.shadow}>{traduire(hero.label)}</T>
            {hero.key === 'zones' && hero.zones ? (
              <Chiffre s={hero} size={story ? 64 : 44} pal={pal} largeur={L} />
            ) : (
              <Heros g={{ value: hero.value, unit: hero.unit }} pal={pal} largeur={L} max={max} />
            )}
          </View>
        ) : null}
        <View style={{ height: 1, backgroundColor: pal.line }} />
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

/** Record : le record de la seance en vedette, le trophee dore, la charge en grand et l'ancien record */
function RecordVue({ d, o, pal, W, titre, fig, padTop, padBas, u }: Ctx) {
  const story = o.format === 'story';
  const carre = o.format === 'carre';
  const L = W - PAD * 2;
  const recs = d.seance?.records ?? [];
  const r = recs[0];
  const k = story ? 1 : carre ? 0.62 : 0.78;
  const sombre = pal.ink === '#FFFFFF';
  const gain = r?.avant && r.poids ? Math.round((r.poids - r.avant) * 10) / 10 : null;
  const autres = recs.length - 1;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 28 : 22} />
      <Zone fig={fig} />
      {r ? (
        <View style={{ gap: story ? 8 : 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TropheeRecord size={Math.round(46 * Math.max(k, 0.7))} couleurs={{ fond: '#C9A13B', trophee: '#FFFFFF' }} />
            {/* sur une image sombre le rouge se perd : le libelle prend l'or du trophee ; sur clair, le rouge des records */}
            <T size={story ? 16 : 13} weight="black" color={sombre ? '#F2C75C' : pal.record} style={[{ letterSpacing: 0.2 }, pal.shadow]}>{autres > 0 ? traduire('Nouveaux records') : traduire('Nouveau record')}</T>
          </View>
          <T size={fit(r.nom, L, Math.round(30 * k), 0.58)} weight="black" color={pal.ink} style={[{ letterSpacing: -0.4 }, pal.shadow]}>{sansTiret(traduire(r.nom))}</T>
          {r.poids ? (
            <Heros g={chargeGrand(r.poids, u)} pal={pal} largeur={L} max={Math.round((carre ? 120 : 140) * k)} />
          ) : (
            <T size={story ? 22 : 16} weight="black" color={pal.ink} lines={2} style={pal.shadow}>{traduire(r.texte)}</T>
          )}
          {r.poids && r.reps && !carre ? <T size={story ? 16 : 13} weight="extraBold" color={pal.ink2} style={pal.shadow}>{traduirePluriel(r.reps, r.reps > 1, "pour {0} répétition", "pour {0} répétitions", r.reps)}</T> : null}
          {gain !== null && gain > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderColor: pal.line, paddingTop: story ? 10 : 6, marginTop: story ? 4 : 2 }}>
              <T size={13} weight="bold" color={pal.muted} style={pal.shadow}>{traduire("Ancien record")}</T>
              <T size={15} weight="black" color={pal.ink2} style={[{ textDecorationLine: 'line-through' }, pal.shadow]}>{`${chargeGrand(r.avant!, u).value} ${chargeGrand(r.avant!, u).unit}`}</T>
              <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#D9B04A', justifyContent: 'center' }}>
                <T size={13} weight="black" color="#1D2029">{`+${chargeGrand(gain, u).value} ${chargeGrand(gain, u).unit}`}</T>
              </View>
            </View>
          ) : null}
          {autres > 0 && !carre ? (
            <T size={12.5} weight="bold" color={pal.ink2} lines={2} style={pal.shadow}>{traduirePluriel(autres, autres > 1, "Et {0} autre : {1}{2}", "Et {0} autres : {1}{2}", autres, recs.slice(1, 3).map((x) => x.nom).join(', '), autres > 2 ? '…' : '')}</T>
          ) : null}
          <View style={{ height: story ? 6 : 2 }} />
          <Signature pal={pal} slogan={o.slogan} compact={!story} />
        </View>
      ) : (
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      )}
    </View>
  );
}

const JOURS_COURTS = [traduire('Lun'), traduire('Mar'), traduire('Mer'), traduire('Jeu'), traduire('Ven'), traduire('Sam'), traduire('Dim')];

/** Le rond d'un club : son logo, ou ses initiales */
function ClubRond({ club, pal, D }: { club: NonNullable<CarteData['club']>; pal: Palette; D: number }) {
  const src = club.logo ? getClubLogoSource(club.logo) : null;
  const sombre = pal.ink === '#FFFFFF';
  if (src) return <Image source={src} style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: '#FFFFFF' }} resizeMode="cover" accessibilityLabel={traduire(club.nom)} />;
  return (
    <View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: pal.ink, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={traduire(club.nom)}>
      <T size={Math.max(7, Math.round(D * 0.38))} weight="black" color={sombre ? '#14161C' : '#FFFFFF'}>{initialesClub(club.nom)}</T>
    </View>
  );
}

function Coche({ on, pal, D }: { on: boolean; pal: Palette; D: number }) {
  const sombre = pal.ink === '#FFFFFF';
  return (
    <View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: on ? pal.ink : 'transparent', borderWidth: 1.5, borderColor: on ? pal.ink : pal.line, alignItems: 'center', justifyContent: 'center' }}>
      {on ? (
        <Svg width={D * 0.56} height={D * 0.56} viewBox="0 0 24 24">
          <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={sombre ? '#14161C' : '#FFFFFF'} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

/** Semaine : tes 7 jours, coches, avec les sports faits et le logo du club ; tes chiffres de la semaine dessous */
function SemaineVue({ d, o, pal, W, stats, titre, fig, padTop, padBas }: Ctx) {
  const s = d.semaine;
  const story = o.format === 'story';
  const carre = o.format === 'carre';
  const L = W - PAD * 2;
  const panneau = o.sombre ? 'rgba(10,11,14,0.5)' : 'rgba(255,255,255,0.74)';
  const jours = (s?.jours ?? []).map((on, i) => ({ on, sports: s?.parJour?.[i]?.sports ?? [], club: s?.parJour?.[i]?.club ?? null }));
  const [y, m, j0] = (s?.debut ?? '2000-01-01').split('-').map(Number);
  const num = (i: number) => new Date(y, (m || 1) - 1, (j0 || 1) + i, 12).getDate();
  // deux chiffres au plus : les jours portent deja le detail de la semaine, les libelles restent entiers
  const petits = stats.slice(0, 2);
  const rowH = story ? 36 : 25;
  const inner = L - 24;
  const txtW = inner - 52 - 10 - (story ? 22 : 18) - 10 - (story ? 26 : 20) - 8;
  return (
    <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
      <Haut d={d} titre={titre} pal={pal} largeur={L} max={story ? 30 : 24} />
      <Zone fig={fig} />
      <View style={{ gap: story ? 12 : 7 }}>
        {carre ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderRadius: 16, backgroundColor: panneau, borderWidth: 1, borderColor: pal.line, paddingVertical: 8, paddingHorizontal: 10 }}>
            {jours.map((x, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4, width: 36 }}>
                <T size={10} weight="extraBold" color={x.on ? pal.ink : pal.muted}>{JOURS_COURTS[i]}</T>
                <Coche on={x.on} pal={pal} D={26} />
                {x.club ? <ClubRond club={x.club} pal={pal} D={16} /> : <View style={{ height: 16 }} />}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ borderRadius: 18, backgroundColor: panneau, borderWidth: 1, borderColor: pal.line, paddingHorizontal: 12, paddingVertical: story ? 8 : 5 }}>
            {jours.map((x, i) => {
              const texte = x.sports.join(` ${traduire('et')} `);
              return (
                <View key={i} style={{ height: rowH, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i ? 1 : 0, borderColor: pal.line }}>
                  <View style={{ width: 52, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <T size={story ? 13 : 11.5} weight="black" color={x.on ? pal.ink : pal.muted}>{JOURS_COURTS[i]}</T>
                    <T size={story ? 12 : 10.5} weight="bold" color={pal.muted}>{String(num(i))}</T>
                  </View>
                  <Coche on={x.on} pal={pal} D={story ? 22 : 18} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    {x.on && texte ? <T size={fit(texte, txtW, story ? 15 : 12.5, 0.55)} weight="extraBold" color={pal.ink}>{texte}</T> : null}
                  </View>
                  {x.club ? <ClubRond club={x.club} pal={pal} D={story ? 26 : 20} /> : null}
                </View>
              );
            })}
          </View>
        )}
        {petits.length ? (
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {petits.map((st) => (
              <View key={st.key} style={{ flex: 1, minWidth: 0 }}>
                <Chiffre s={st} size={story ? 28 : 20} pal={pal} largeur={(L - 14 * (petits.length - 1)) / petits.length} />
              </View>
            ))}
          </View>
        ) : null}
        <Signature pal={pal} slogan={o.slogan} compact={!story} />
      </View>
    </View>
  );
}

// ============================================
// EXPLOITS : record, palier, compteur, objectif, bilan
// ============================================

/** Le gros chiffre : valeur et unite sur la meme ligne de base, taille calculee pour tenir */
export function tailleHeros(g: Grand, largeur: number, max: number): number {
  const u = g.unit ?? '';
  // l'unite pese environ 0,32 du chiffre : on la compte dans la largeur
  const n = g.value.length + (u ? u.length * 0.36 + 0.3 : 0);
  return Math.max(36, Math.min(max, Math.floor(largeur / (n * 0.6))));
}

function Heros({ g, pal, largeur, max, couleur, align = 'flex-start' }: { g: Grand; pal: Palette; largeur: number; max: number; couleur?: string; align?: 'flex-start' | 'center' }) {
  const u = g.unit ?? '';
  const size = tailleHeros(g, largeur, max);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Math.round(size * 0.05), justifyContent: align }}>
      <T size={size} weight="black" color={couleur ?? pal.ink} style={[{ letterSpacing: -size * 0.05, fontVariant: ['tabular-nums'], lineHeight: Math.round(size * 1.02) }, pal.shadow]}>{g.value}</T>
      {u ? <T size={Math.max(14, Math.round(size * 0.3))} weight="black" color={pal.ink2} style={pal.shadow}>{u}</T> : null}
    </View>
  );
}

function Pastille({ texte, pal, record, simple }: { texte: string; pal: Palette; record?: boolean; simple?: boolean }) {
  if (simple) return <T size={12} weight="black" color={record ? pal.record : pal.ink2} style={[{ letterSpacing: 1.6 }, pal.shadow]}>{texte.toUpperCase()}</T>;
  const fond = record ? pal.record : 'transparent';
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: record ? 5 : 12, paddingRight: 12, height: 30, borderRadius: 15, backgroundColor: fond, borderWidth: record ? 0 : 1.5, borderColor: pal.ink }}>
      {record ? <TropheeRecord size={20} couleurs={{ fond: '#C9A13B', trophee: '#FFFFFF' }} /> : null}
      <T size={fit(texte.toUpperCase(), 250, 12, 0.66)} weight="black" color={record ? '#FFFFFF' : pal.ink} style={[{ letterSpacing: 1.4 }, record ? {} : pal.shadow]}>{texte.toUpperCase()}</T>
    </View>
  );
}

function Progression({ b, pal, largeur, story }: { b: NonNullable<Exploit['barre']>; pal: Palette; largeur: number; story: boolean }) {
  const pct = Math.max(0, Math.min(1, b.fait / Math.max(1, b.total)));
  const rep = b.attendu !== undefined ? Math.max(0, Math.min(1, b.attendu / Math.max(1, b.total))) : null;
  const h = story ? 14 : 10;
  return (
    <View style={{ width: largeur, gap: 7 }}>
      <View style={{ height: h + 8, justifyContent: 'center' }}>
        <View style={{ height: h, borderRadius: h / 2, backgroundColor: pal.track, overflow: 'hidden' }}>
          <View style={{ width: `${Math.max(2.5, pct * 100)}%`, height: h, borderRadius: h / 2, backgroundColor: pal.ink }} />
        </View>
        {rep !== null && rep > 0.01 && rep < 0.99 ? (
          <View style={{ position: 'absolute', left: rep * largeur - 1.5, top: 0, width: 3, height: h + 8, borderRadius: 1.5, backgroundColor: pal.accent }} />
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <T size={12} weight="bold" color={pal.ink2} style={[{ flexShrink: 1 }, pal.shadow]}>{b.legende}</T>
        <T size={12} weight="black" color={pal.ink} style={pal.shadow}>{`${Math.round(pct * 100)} %`}</T>
      </View>
    </View>
  );
}

function ExploitVue({ d, o, pal, W, fig, padTop, padBas, u }: Ctx) {
  const e = exploitEnUnite(exploitVisible(d.exploit!, o.masque), u);
  const story = o.format === 'story';
  const epure = !!o.epure;
  const L = W - PAD * 2;
  const k = story ? 1 : o.format === 'post' ? 0.78 : 0.66;
  const avecFig = !!fig && !epure;
  // avec le personnage : le chiffre (ou la liste) a gauche, le personnage debout a droite, ses pieds au niveau du chiffre
  const heroL = avecFig ? Math.round(L * 0.66) : L;
  const heroMax = Math.round(150 * k);
  const nListe = Math.min(e.liste?.length ?? 0, story ? 5 : 4);
  const hautBloc = nListe
    ? nListe * Math.round(40 * k * 1.28) + (story ? 4 : 2) * (nListe - 1)
    : e.hero.value
      ? Math.round(tailleHeros(e.hero, heroL, heroMax) * 1.02)
      : 0;
  const descente = hautBloc + (e.avant ? Math.round(22 * Math.max(k, 0.85)) + (story ? 10 : 6) : 0);
  const accroche = (
    <T size={fit(e.accroche, L * 1.55, Math.round(28 * k), 0.6)} weight="black" color={pal.ink} lines={2} style={[{ letterSpacing: -0.4 }, pal.shadow]}>{e.accroche}</T>
  );
  const centre = epure;
  return (
    <>
      <View style={{ flex: 1, paddingTop: padTop, paddingBottom: padBas, paddingHorizontal: PAD }}>
        <View style={{ gap: 10, alignItems: centre ? 'center' : 'flex-start' }}>
          <Haut d={d} titre="" pal={pal} largeur={L} centre={centre} sansTitre />
          <Pastille texte={e.surtitre} pal={pal} record={e.record} simple={epure} />
        </View>
        {/* le personnage prend toute la place libre entre le titre et les chiffres : il ne recouvre jamais un texte */}
        <View style={{ flex: 1, minHeight: 0 }}>
          {avecFig ? (
            <View pointerEvents="none" style={{ position: 'absolute', right: -16, top: 6, bottom: -descente - (story ? 10 : 6), aspectRatio: 0.7 }}>
              <Image source={fig!} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
          ) : null}
        </View>
        <View style={{ gap: story ? 10 : 6, alignItems: centre ? 'center' : 'flex-start' }}>
          {e.avant ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={Math.round(13 * Math.max(k, 0.85))} weight="bold" color={pal.muted} style={pal.shadow}>{traduire("Ancien record")}</T>
              <T size={Math.round(15 * Math.max(k, 0.85))} weight="black" color={pal.ink2} style={[{ textDecorationLine: 'line-through' }, pal.shadow]}>{`${e.avant.value}${e.avant.unit ? ` ${e.avant.unit}` : ''}`}</T>
            </View>
          ) : null}
          {e.liste && e.liste.length ? (
            <View style={{ gap: story ? 4 : 2, maxWidth: heroL }}>
              {e.liste.slice(0, story ? 5 : 4).map((x) => (
                <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 9 * k + 2, height: 9 * k + 2, borderRadius: 2, backgroundColor: pal.ink, transform: [{ rotate: '45deg' }] }} />
                  <T size={Math.min(Math.round(40 * k), fit(x, heroL - 24, Math.round(40 * k), 0.68))} weight="black" color={pal.ink} style={[{ letterSpacing: -0.6 }, pal.shadow]}>{x}</T>
                </View>
              ))}
            </View>
          ) : e.hero.value ? (
            <Heros g={e.hero} pal={pal} largeur={heroL} max={heroMax} align={centre ? 'center' : 'flex-start'} />
          ) : null}
          <View style={{ maxWidth: L }}>{accroche}</View>
          {e.detail && !epure ? <T size={13} weight="bold" color={pal.ink2} lines={2} style={[{ maxWidth: L, textAlign: centre ? 'center' : 'left' }, pal.shadow]}>{e.detail}</T> : null}
          {e.barre && (story || o.format === 'post') ? <View style={{ marginTop: story ? 6 : 2 }}><Progression b={e.barre} pal={pal} largeur={L} story={story} /></View> : null}
          {e.cotes && e.cotes.length && !epure ? (
            <View style={{ flexDirection: 'row', gap: 14, alignSelf: 'stretch', borderTopWidth: 1, borderColor: pal.line, paddingTop: story ? 12 : 8, marginTop: story ? 4 : 0 }}>
              {e.cotes.slice(0, 3).map((c) => (
                <View key={c.label} style={{ flex: 1, minWidth: 0 }}>
                  <Valeur s={{ key: 'exploit', label: c.label, value: c.value, unit: c.unit }} size={Math.min(Math.round(28 * k), fit(`${c.value} ${c.unit ?? ''}`, (L - 28) / 3, Math.round(28 * k), 0.6))} pal={pal} />
                  <T size={11} weight="bold" color={pal.muted} style={pal.shadow}>{traduire(c.label)}</T>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ height: story ? 8 : 4 }} />
          <View style={{ alignSelf: 'stretch' }}>
            <Signature pal={pal} slogan={o.slogan} compact={!story} />
          </View>
        </View>
      </View>
    </>
  );
}

export type ModeleInfo = { id: ModeleId; nom: string; explication: string };

/** Les modeles, dans l'ordre du choix : un nom parlant et une ligne qui dit ce que montre la carte */
export const MODELES: ModeleInfo[] = [
  { id: 'affiche', nom: 'Affiche', explication: traduire('Ton chiffre fort en grand, les autres en dessous.') },
  { id: 'minimal', nom: 'Minimal', explication: traduire('Un seul grand chiffre, ton titre et la signature.') },
  { id: 'record', nom: traduire('Record'), explication: traduire('Ton record en vedette, avec le trophée et l’ancien record.') },
  { id: 'semaine', nom: traduire('Semaine'), explication: traduire('Tes 7 jours, avec les sports faits et tes clubs.') },
  { id: 'anneau', nom: traduire('Objectif'), explication: traduire('L’anneau montre où tu en es de ton objectif.') },
  { id: 'bandeau', nom: 'Bandeau', explication: traduire('Tous tes chiffres côte à côte, à égalité.') },
  { id: 'colonne', nom: 'Colonne', explication: traduire('Tes chiffres empilés, du plus fort au plus petit.') },
  { id: 'ticket', nom: 'Ticket', explication: traduire('Le détail ligne par ligne, puis le total.') },
  { id: 'cadre', nom: 'Polaroid', explication: traduire('Ta scène ou ta photo encadrée, tes chiffres sur le papier.') },
  { id: 'geant', nom: traduire('Géant'), explication: traduire('Le nom de ton sport en lettres géantes.') },
];

/** Un modele n'est propose que si ses donnees existent : Objectif sans objectif, Record sans record, jamais */
export function modeleDispo(d: CarteData, id: ModeleId): boolean {
  if (id === 'anneau') return proportionAnneau(d)?.pct !== undefined;
  if (id === 'record') return d.moment === 'seance' && !!d.seance?.records?.length;
  if (id === 'semaine') return d.moment === 'semaine' && !!d.semaine;
  return true;
}

export function modelesPour(d: CarteData): ModeleInfo[] {
  return MODELES.filter((m) => modeleDispo(d, m.id));
}

/** Le modele dessine : celui choisi s'il est propose pour cette carte, sinon l'Affiche */
export function modeleEffectif(d: CarteData, id: ModeleId): ModeleId {
  return modeleDispo(d, id) ? id : 'affiche';
}

/** L'explication du modele pour cette carte (Objectif dit de quel objectif il parle) */
export function explicationModele(m: ModeleInfo, d: CarteData): string {
  if (m.id === 'anneau') return d.moment === 'pesee' ? traduire('L’anneau montre le chemin fait vers ton objectif de poids.') : traduire('L’anneau montre tes séances faites sur ton objectif de la semaine.');
  return m.explication;
}

/**
 * La carte. Rendue a 360 de large ; l'apercu la reduit avec une echelle, la capture la prend a sa taille.
 * 17 octobre : la signature est collee en bas (marge fine), la date reste juste sous la barre d'Instagram.
 */
export const CarteRendu = forwardRef<View, Props>(({ data: brut, options: brutes, visuels }, ref) => {
  // 18 octobre 2026 : charges calculees en kilos, dessinees dans l'unite du reglage (kg ou lb) ; le poids du corps reste en kilos
  const u = useUnitePoids();
  const data = donneesEnUnite(brut, u);
  // « Que mes données » : fond uni, sans personnage
  const base: OptionsCarte = brutes.epure ? { ...brutes, fond: 'uni', personnage: false } : brutes;
  // interrupteur « Mon personnage sur la carte » ou « Ma photo sur la carte » eteint : aucune personne, ta photo laisse place a ta scene
  const options: OptionsCarte = base.sansPersonne ? { ...base, personnage: false, fond: base.fond === 'photo' ? 'scene' : base.fond } : base;
  const W = CARTE_W;
  const H = HAUTEURS[options.format];
  const pal = paletteDe(options.sombre);
  if (data.moment === 'avant_apres') {
    // Avant apres : tes deux photos, sans personnage ni decor
    return (
      <View ref={ref} collapsable={false} style={{ width: W, height: H, overflow: 'hidden', backgroundColor: options.sombre ? '#14161F' : '#F2F1EC' }}>
        <AvantApresVue d={data} o={options} H={H} signature={<Signature pal={pal} slogan={options.slogan} compact={options.format !== 'story'} />} />
      </View>
    );
  }
  const stats = statsEnUnite(chiffresAffiches(brut, options.chiffres, options.masque), u);
  const titre = titreCarte(brut, options.masque);
  const fig = options.personnage && visuels.personnage ? visuels.personnage : null;
  const story = options.format === 'story';
  const ctx: Ctx = { d: data, o: options, v: visuels, pal, W, H, stats, titre, fig, padTop: story ? 34 : 20, padBas: story ? 16 : 12, u };
  const exploit = data.moment === 'exploit' && !!data.exploit;
  const modele = modeleEffectif(data, options.modele);
  const Modele = exploit ? ExploitVue : { affiche: Affiche, bandeau: Bandeau, colonne: Colonne, ticket: Ticket, cadre: Cadre, geant: Geant, anneau: Anneau, minimal: Minimal, record: RecordVue, semaine: SemaineVue }[modele] ?? Affiche;
  return (
    <View ref={ref} collapsable={false} style={{ width: W, height: H, overflow: 'hidden', backgroundColor: options.sombre ? '#121318' : '#F4F2EC' }}>
      {exploit || modele !== 'cadre' ? <Fond o={options} v={visuels} h={H} fort={exploit} /> : null}
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
