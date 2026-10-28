/**
 * Carte Poids de l'accueil (vague 26, courbe refaite en vague 32, carte refaite en vague 33).
 * En haut, « Ton poids » en petit et le grand chiffre : avec le style 1 (par defaut), c'est lui qui suit ton doigt
 * sur la courbe (valeur, date, ecart, statut), et il revient a aujourd'hui quand tu relaches. Dessous, la phrase
 * de statut (vague 42) et l'ecart de la periode.
 * La courbe sur 1, 3, 6 mois, 1 an ou « Mon plan » (du debut de ton plan jusqu'au torii, futur compris),
 * avec ton cap, son torii et ta ligne directrice (interrupteur a cote du choix de periode et dans les Reglages).
 * Vague 33 : la jauge en arc et les cases Perdu, Objectif, Reste laissent la place a un seul « chemin vers le torii »
 * (components/yoroi/v2/charts/CheminTorii.tsx). La ligne « A ce rythme » reste quand la carte n'annonce pas deja
 * une date d'arrivee. Tout vient de tes vraies pesees. Appui : le detail du poids. Sans pesee : un etat vide.
 * Vague 34, la carte « rouleau » (version D du labo compact, validee par Houari) : papier washi encadre comme un
 * rouleau monte, environ 390 points de haut au lieu de 554. La courbe (112 points) est posee sur une scene
 * (FondCourbe : la scene de ton accueil, ou les rizieres si elle a deja un torii, au choix dans Reglages), le vrai
 * torii en illustration a ta date d'arrivee, les periodes en onglets legers, et dessous le sentier de pierres ou ton
 * personnage marche vers le torii (SentierTorii). Plus de titre « Ton chemin vers le torii » ni de barre « Toi ».
 * Vague 42 (Houari : « on ne comprend pas énormément les choses ») : une carte qu'on comprend du premier coup.
 * La pastille « Au-dessus de ta ligne » devient une phrase claire sous le chiffre (« Tu es 0,7 kg au-dessus de ton
 * rythme prévu »), la courbe sur le papier (la scene reste un choix dans Reglages), une legende d'une ligne sous la
 * courbe (ton poids, ton rythme prevu, ton cap), l'interrupteur du torii quitte la carte (Reglages, Tes courbes),
 * et le chemin devient une barre de progression avec « 90 % du chemin ». Hauteur maximale 330 points.
 * Les pesees datees apres aujourd'hui (horloge du telephone ou import decale) sont ecartees de la carte : sinon
 * la courbe montrait un autre mois que ton torii.
 * 16 octobre (Personnaliser) : la ligne « Ton allure » passe en couleur (LigneAllure : tirets de la legende, valeur
 * dans le vert de la ligne, ecart dans la couleur du statut), et un petit bouton « Style » a droite des periodes
 * ouvre directement le choix du style de la courbe, avec ses apercus (/settings/courbes?choix=style).
 * 17 octobre : plus de parentheses autour de l'ecart, seul le chiffre cle prend la couleur (le reste en encre
 * secondaire, « au-dessus » en encre) ; chiffre, phrase et allure centres ; « pesée du jour » en encre avec un point vert.
 * 17 octobre soir, maquette B « Equilibree » (choisie par Houari) : le poids en grand (48) et l'ecart en pastille, le
 * statut en une ligne, une courbe respiree (136) dont la legende vient au toucher, les periodes en onglets discrets avec
 * « Style », et le chemin en une barre fine avec le torii et sa date unique (lib/v2/pesee/arrivee.ts). Le sentier et
 * l'allure quittent la carte ; « Où tu en seras » passe dans le detail du poids (app/poids-detail.tsx).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView as PagesScroll } from 'react-native-gesture-handler';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CourbePoids, POIDS } from '@/components/yoroi/v2/charts/CourbePoids';
import type { ScrubPoids } from '@/components/yoroi/v2/charts/CourbePoids';
import type { ModeSentier as ModeChemin } from '@/components/yoroi/v2/charts/SentierTorii';
import { SceneCourbe, sceneDuFond } from '@/components/yoroi/v2/charts/FondCourbe';
import { ToriiImage } from '@/components/yoroi/v2/charts/ToriiImage';
import { FREE_CHART_FALLBACK_DAYS, isPremiumPeriod, PeriodSwitch, PERIODE_PLAN, POIDS_PERIODS, POIDS_PERIODS_PLAN_COURT } from '@/components/yoroi/v2/charts/PeriodSwitch';
import type { PeriodOption } from '@/components/yoroi/v2/charts/PeriodSwitch';
import { usePremium } from '@/context/PremiumContext';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import type { DayWeight } from '@/lib/v2/weightStats';
import { formatKg } from '@/lib/v2/weightStats';
import { cadrerPeriode, texteDePeriode } from '@/lib/v2/pesee/cadrageCourbe';
import { ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { localISO } from '@/lib/v2/accueil/hydration';
import { relativeDay } from '@/lib/v2/accueil/home';
import { goalProgress } from '@/lib/v2/accueil/projection';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { arriveePrevueTexte } from '@/lib/v2/pesee/arrivee';
import { jourCourt, phraseStatut, statutLigne, texteFenetreTorii } from '@/lib/v2/pesee/ligneDirectrice';
import type { Statut } from '@/lib/v2/pesee/ligneDirectrice';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { ECART_EAU_KG, etatObjectif, kg1, texteObjectif, texteTendance } from '@/lib/v2/pesee/etatObjectif';
import { FeuilleObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { ecouterPagePoids } from '@/lib/v2/visite/pagePoids';
import type { QuoiObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { Card, Icon, ombreCarte, P, Press } from './kit';
import { traduire, LANG, DECIMAL } from '@/lib/i18n/tr';

const PERIODE_TEXTE: Record<number, string> = { 30: traduire('en 1 mois'), 90: traduire('en 3 mois'), 180: traduire('en 6 mois'), 365: traduire('en 1 an'), [PERIODE_PLAN]: traduire('depuis ton début') };

/** Couleur du mot cle de la phrase de statut, lisible en clair et en sombre (vague 42) */
function couleurTon(ton: Statut['ton']): string {
  const sombre = paletteSombre();
  if (ton === 'vert') return POIDS.capText;
  if (ton === 'bleu') return sombre ? '#8EA6FF' : '#2F50B8';
  if (ton === 'orange') return sombre ? '#F3A55C' : '#A14E00';
  return POIDS.axe;
}

/**
 * 17 octobre (planche5) : le chiffre, la phrase de statut et l'allure centres. Compare a la version alignee a gauche,
 * le centre s'accorde avec tout le bas de la carte (legende, periodes, « 6,1 kg perdus ») deja centre.
 */
export const CENTRAGE_POIDS = true;

/**
 * Le mot cle de la phrase de statut : seul le chiffre prend la couleur (« 2,3 kg » en bleu), le reste
 * (« au-dessus ») en encre. null si le mot cle ne commence pas par un chiffre.
 */
export function cleChiffre(cle: string): [string, string] | null {
  const m = /^([−+-]?\s?\d[\d\s,.]*\s?kg)(.*)$/.exec(cle);
  return m ? [m[1], m[2]] : null;
}

/** Largeur du petit bouton « Style » (et de l'espace en miroir a gauche, pour garder les periodes au centre) */
const BOUTON_STYLE_L = 54;

/** Le petit bouton « Style » sous la courbe : il ouvre le choix du style de courbe, avec ses apercus */
function BoutonStyle({ onPress, rond }: { onPress: () => void; rond?: boolean }) {
  // 27 octobre 2026 nuit : sur la courbe de l'accueil, un bouton rond de 34 au bout des periodes (le pinceau seul) :
  // les cinq segments gardent toute la place, rien n'est coupe a 375 de large, meme en portugais ou en italien
  if (rond) {
    return (
      <Press onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Changer le style de ta courbe")} hitSlop={6}>
        <View style={{ width: HAUT_SEGMENT, height: HAUT_SEGMENT, borderRadius: HAUT_SEGMENT / 2, backgroundColor: paletteSombre() ? '#2C2A55' : '#E9E4FF', alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M5 19L16 8M14 6l4 4M18 3v3M16.5 4.5h3" stroke={POIDS.softText} strokeWidth={2.6} strokeLinecap="round" />
          </Svg>
        </View>
      </Press>
    );
  }
  return (
    <Press onPress={onPress} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Changer le style de ta courbe")} hitSlop={8}>
      <View style={{ width: BOUTON_STYLE_L, height: 28, borderRadius: 14, borderWidth: 1, borderColor: P.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
          <Path d="M5 19L16 8M14 6l4 4M18 3v3M16.5 4.5h3" stroke={POIDS.softText} strokeWidth={2.6} strokeLinecap="round" />
        </Svg>
        <Ink size={11.5} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
          {traduire("Style")}</Ink>
      </View>
    </Press>
  );
}

/** 27 octobre 2026 nuit (Houari : « la rangée est collée à droite ») : la hauteur des segments de periode de la courbe */
const HAUT_SEGMENT = 34;

/** Petit cadenas des periodes Premium, a la hauteur du texte */
function CadenasSegment({ color }: { color: string }) {
  return (
    <Svg width={10} height={12} viewBox="0 0 20 24" fill="none">
      <Path d="M5 10V7a5 5 0 0 1 10 0v3" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Rect x={2} y={10} width={16} height={12} rx={3} fill={color} />
    </Svg>
  );
}

/**
 * 27 octobre 2026 nuit : les periodes de la courbe en segments egaux sur toute la largeur (1 M, 3 M, 6 M, 1 A, Plan),
 * le choisi en lilas pastel et texte violet. Memes regles que PeriodSwitch : 6 M et 1 A avec Premium (cadenas,
 * le toucher ouvre le paywall), et une periode Premium choisie en version gratuite revient a 3 mois.
 */
function SegmentsPeriode({ value, onChange, options }: { value: number; onChange: (v: number) => void; options: PeriodOption[] }) {
  const { isPremium, isLoading } = usePremium();
  const lockOn = !isPremium && !isLoading;
  const sombre = paletteSombre();
  useEffect(() => {
    if (lockOn && isPremiumPeriod(value)) {
      const repli = options.find((o) => o.value === FREE_CHART_FALLBACK_DAYS) ?? options.find((o) => !isPremiumPeriod(o.value));
      if (repli) onChange(repli.value);
    }
  }, [lockOn, value, options, onChange]);
  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', padding: 2, gap: 2, borderRadius: HAUT_SEGMENT / 2, backgroundColor: sombre ? '#20223A' : '#F6F4FF' }} accessibilityRole="tablist">
      {options.map((o) => {
        const locked = lockOn && isPremiumPeriod(o.value);
        const on = o.value === value && !locked;
        return (
          <Pressable
            key={o.label}
            onPress={() => {
              selectionAsync().catch(() => {});
              if (locked) ouvrirPaywall('periode_longue');
              else onChange(o.value);
            }}
            hitSlop={{ top: 6, bottom: 6 }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.value === PERIODE_PLAN ? traduire('Mon plan, du début jusqu’au torii') : traduire("Période {0}", o.label.replace(/^(\d+) M$/, '$1 mois').replace(/^1 A$/, '1 an'))}${locked ? traduire(', avec Premium') : ''}`}
            style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ height: HAUT_SEGMENT - 4, borderRadius: (HAUT_SEGMENT - 4) / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: on ? (sombre ? '#2C2A55' : '#E9E4FF') : 'transparent' }}>
              {locked ? <CadenasSegment color={P.muted} /> : null}
              <Ink size={14} weight={on ? 'black' : 'bold'} color={on ? POIDS.softText : locked ? P.muted : P.ink2} numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ flexShrink: 1, lineHeight: 18 }}>
                {traduire(o.label)}
              </Ink>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 27 octobre 2026 nuit : la hauteur des petites pastilles sous ton poids */
const HAUT_PASTILLE = 26;

/** Fond et texte d'une pastille de la page 1, lisibles (AA) en clair et en sombre */
function teintePastille(ton: Statut['ton'], sombre: boolean): { fond: string; texte: string } {
  if (ton === 'vert') return sombre ? { fond: '#163A2B', texte: '#5FC596' } : { fond: '#DDF3E7', texte: '#17704A' };
  if (ton === 'bleu') return sombre ? { fond: '#232F58', texte: '#8EA6FF' } : { fond: '#E1E8FF', texte: '#2F50B8' };
  if (ton === 'orange') return sombre ? { fond: '#3D2812', texte: '#F3A55C' } : { fond: '#FFEBDA', texte: '#A14E00' };
  return sombre ? { fond: '#2C2A55', texte: P.ink } : { fond: '#EEEBFF', texte: P.ink };
}

type Props = {
  series: DayWeight[];
  targetWeight: number | null;
  /** poids de depart du profil ; sinon la premiere pesee */
  startWeight: number | null;
  /** vague 27, demonstration de l'onboarding : le jour de reference d'une carte projetee (AAAA-MM-JJ) */
  today?: string;
  /** vague 33 : carte d'exemple (onboarding) : ni plan, ni torii, ni fenetre, ni bouton vers le profil */
  demo?: boolean;
  /** vague 34 : ton rang (0 a 4), pour ton personnage sur le sentier ; maquette B : le sentier est dans le detail, prop gardee pour les appels */
  rankIndex?: number;
  /** 17 octobre : chiffre, phrase et allure centres (CENTRAGE_POIDS) ; prop pour comparer sur la planche */
  centre?: boolean;
  /** 27 octobre 2026 (carrousel) : la page affichee (0 : ton poids et ton objectif, avec les citrouilles et les sapins ; 1 : ta courbe) */
  onPage?: (page: number) => void;
};

/**
 * 27 octobre 2026 soir (Houari : « la page 1 fait doublon ») : l'anneau du chemin en haut a droite de la page 1,
 * 62 points (la place prevue pour les citrouilles et les sapins), ton torii au centre ; le pourcentage est ecrit en toutes
 * lettres juste dessous (« 86 % du chemin »), il n'est donc plus repete dans l'anneau.
 */
// 28 octobre 2026 (version C « chemin de pierres », choisie par Houari) : l'anneau decoupe en 4 arcs, des couleurs des
// 4 pierres de la barre ; chaque arc se remplit a mesure que tu avances dans sa pierre. Ancienne version (un seul arc
// violet) : _archive_ancien_design_2026-10-09/accueil_compact_2026-10-28/CartePoids.tsx.
function AnneauChemin({ part }: { part: number }) {
  const T = 44;
  const r = 17.1;
  const ep = 4.9;
  const tour = 2 * Math.PI * r;
  const quart = tour / 4;
  // 7 points de jour entre deux arcs (les bouts arrondis compris)
  const arc = quart - 7;
  const p = Math.max(0, Math.min(1, part));
  const sombre = paletteSombre();
  return (
    <View style={{ width: T, height: T, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={T} height={T} style={{ position: 'absolute' }}>
        {PIERRES_CHEMIN.map((pi, i) => {
          const loc = Math.max(0, Math.min(1, (p - i * 0.25) / 0.25));
          const rot = `rotate(${-90 + i * 90 + 6} ${T / 2} ${T / 2})`;
          return (
            <React.Fragment key={i}>
              <Circle cx={T / 2} cy={T / 2} r={r} stroke={sombre ? pi.paleSombre : pi.pale} strokeWidth={ep} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${tour}`} transform={rot} />
              {loc > 0 ? <Circle cx={T / 2} cy={T / 2} r={r} stroke={pi.plein} strokeWidth={ep} fill="none" strokeLinecap="round" strokeDasharray={`${arc * loc} ${tour}`} transform={rot} /> : null}
            </React.Fragment>
          );
        })}
      </Svg>
      <ToriiImage width={18} />
    </View>
  );
}

/** 27 octobre 2026 soir : la carte en blanc pur, un voile lilas pastel en haut qui s'efface vers le blanc */
// 27 octobre 2026 nuit : un arret au milieu (le voile s'efface en douceur) et le bord blanc de 5 autour
export const VOILE_CARTE_POIDS = { clair: '#E9E4FF', clairMilieu: '#F3F0FF', sombre: '#262449', sombreMilieu: '#20223A', hauteur: 150, bord: 5 } as const;
/** le rayon de la carte (CARTE_PASTEL.rayon) */
const CARTE_POIDS_RAYON = 28;

/** La partie fixe de la page courbe autour de la courbe (titre, panneau, periodes), pour caler sa hauteur sur la page 1 */
const CHROME_PAGE_COURBE = 102;
const COURBE_MIN = 136;
const COURBE_MAX = 196;
/** Les paliers du chemin : 25, 50, 75 et 100 % (le dernier, ton objectif, porte le torii) */
export const PALIERS_CHEMIN = [0.25, 0.5, 0.75, 1] as const;

/**
 * Decoupage en paliers, pour l'affichage seulement : le poids de chaque palier entre ton debut et ton objectif,
 * s'il est franchi (ta part du chemin l'a atteint) et le prochain a franchir, avec ce qu'il reste jusqu'a lui.
 */
export function paliersDuChemin(depart: number, objectif: number, actuel: number, part: number): { part: number; kg: number; franchi: boolean }[] & { prochain?: { kg: number; encore: number; dernier: boolean } | null } {
  const l = PALIERS_CHEMIN.map((f) => ({ part: f, kg: Math.round((depart + (objectif - depart) * f) * 10) / 10, franchi: part >= f - 1e-6 }));
  const suivant = l.find((x) => !x.franchi);
  return Object.assign(l, { prochain: suivant ? { kg: suivant.kg, encore: Math.max(0, Math.round(Math.abs(actuel - suivant.kg) * 10) / 10), dernier: suivant.part === 1 } : null });
}

/**
 * 28 octobre 2026 (version C « chemin de pierres », choisie par Houari, maquette Barre-C) : les 4 pierres pastel du
 * chemin, une par quart (menthe, bleu, lilas, peche). plein : la pierre remplie ; pale : la pierre a venir (clair, sombre) ;
 * texte : le chiffre du palier franchi et la pastille « Prochain palier » de la pierre en cours (clair, sombre).
 */
export const PIERRES_CHEMIN = [
  { plein: '#8FD9B6', pale: '#D3EFE1', paleSombre: '#1F3A31', texte: '#1C6B45', texteSombre: '#8FD9B6' },
  { plein: '#9FB3F7', pale: '#D9E2FC', paleSombre: '#232D4D', texte: '#2F50B8', texteSombre: '#A9BCFA' },
  { plein: '#C9B3E6', pale: '#E7DCF4', paleSombre: '#33294A', texte: '#6E3F8E', texteSombre: '#D3BFEE' },
  { plein: '#F4A38C', pale: '#FBDCD1', paleSombre: '#43282A', texte: '#B8432F', texteSombre: '#F6B09C' },
] as const;

/** Mesures de la barre : pierres de 11, jour de 14 autour de chaque lanterne, lanterne de 19 sur 27, torii de 26 */
export const BARRE_PIERRES = { hauteur: 32, pierre: 11, jour: 14, lanterneL: 19, lanterneH: 27, torii: 26, chiffres: 16, ecartChiffres: 3 } as const;

/** La pierre en cours (0 a 3) pour une part du chemin : celle du prochain palier a franchir */
export function pierreEnCours(part: number): number {
  return Math.max(0, Math.min(3, Math.floor(Math.max(0, part) / 0.25 + 1e-6)));
}

/** Une lanterne de pierre : grise tant que le palier n'est pas franchi, ambre allumee (avec son halo) ensuite */
function LanternePalier({ allumee, sombre, id }: { allumee: boolean; sombre: boolean; id: string }) {
  const corps = allumee ? '#F4C27A' : sombre ? '#3E4466' : '#DCDDEB';
  const chapeau = allumee ? '#8A5A2B' : sombre ? '#5A6088' : '#A3A7BF';
  const contour = sombre ? '#1A1E29' : '#FFFFFF';
  return (
    <Svg width={BARRE_PIERRES.lanterneL} height={BARRE_PIERRES.lanterneH} viewBox="0 0 24 34" style={{ overflow: 'visible' }}>
      {allumee ? (
        <>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6C46A" stopOpacity={0.75} />
              <Stop offset="1" stopColor="#F6C46A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={12} cy={17} rx={11} ry={12} fill={`url(#${id})`} opacity={0.9} />
        </>
      ) : null}
      <Path d="M12 0V5" stroke={chapeau} strokeWidth={2} strokeLinecap="round" />
      <Rect x={6} y={4} width={12} height={4} rx={1.5} fill={chapeau} />
      <Rect x={3} y={7} width={18} height={21} rx={8} fill={corps} stroke={contour} strokeWidth={2} />
      {allumee ? (
        <>
          <Path d="M7 13H17M7 18H17M7 23H17" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.55} />
          <Ellipse cx={9} cy={13} rx={2.2} ry={3.4} fill="#FFFFFF" opacity={0.55} />
        </>
      ) : (
        <Path d="M7 13H17M7 18H17M7 23H17" stroke={sombre ? '#4E5578' : '#C7C9DA'} strokeWidth={1.2} />
      )}
      <Rect x={6} y={27} width={12} height={4} rx={1.5} fill={chapeau} />
    </Svg>
  );
}

/**
 * La barre du chemin en 4 pierres pastel separees qui se remplissent a mesure que tu avances, une lanterne a chaque
 * palier (grise, puis ambre allumee une fois franchi), le torii vermillon au bout ; les kilos dessous, chaque palier
 * franchi dans la couleur de sa pierre, ton objectif toujours dans celle de la derniere.
 */
function BarrePaliers({ depart, objectif, part, atteint, fg2 }: { depart: number; objectif: number; part: number; atteint: boolean; fg2: string }) {
  const sombre = paletteSombre();
  const l = paliersDuChemin(depart, objectif, depart, atteint ? 1 : part);
  const p = Math.max(0, Math.min(1, atteint ? 1 : part));
  const B = BARRE_PIERRES;
  const marge = B.torii / 2 - 1;
  const demiJour = B.jour / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: B.hauteur, marginHorizontal: marge }}>
        {PIERRES_CHEMIN.map((pi, i) => {
          const loc = Math.max(0, Math.min(1, (p - i * 0.25) / 0.25));
          return (
            <View key={i} style={{ position: 'absolute', left: `${i * 25}%`, width: '25%', top: (B.hauteur - B.pierre) / 2, height: B.pierre, paddingLeft: i === 0 ? 0 : demiJour, paddingRight: demiJour }}>
              <View style={{ flex: 1, borderRadius: B.pierre / 2, backgroundColor: sombre ? pi.paleSombre : pi.pale, overflow: 'hidden' }}>
                {loc > 0 ? (
                  <View style={{ width: `${Math.round(loc * 1000) / 10}%`, height: B.pierre, borderRadius: B.pierre / 2, backgroundColor: pi.plein }}>
                    {/* le reflet clair sur le haut de la pierre */}
                    <View style={{ position: 'absolute', left: 3, right: 3, top: 1.5, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
        {l.map((x) =>
          x.part === 1 ? (
            <View key={x.part} style={{ position: 'absolute', left: '100%', marginLeft: -B.torii / 2, top: (B.hauteur - B.torii) / 2, width: B.torii, height: B.torii, alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={B.torii} />
            </View>
          ) : (
            <View key={x.part} style={{ position: 'absolute', left: `${x.part * 100}%`, marginLeft: -B.lanterneL / 2, top: (B.hauteur - B.lanterneH) / 2, width: B.lanterneL, height: B.lanterneH }}>
              <LanternePalier allumee={x.franchi} sombre={sombre} id={`lanterne-palier-${Math.round(x.part * 100)}`} />
            </View>
          ),
        )}
      </View>
      {/* les kilos : ton debut a gauche, chaque palier sous sa lanterne, ton objectif sous le torii */}
      <View style={{ height: B.chiffres, marginHorizontal: marge, marginTop: B.ecartChiffres }}>
        <Ink size={11.5} weight="bold" color={fg2} numberOfLines={1} style={{ position: 'absolute', left: -marge, width: 60, fontVariant: ['tabular-nums'] }}>
          {formatKg(depart)}
        </Ink>
        {l.map((x, i) => {
          const pi = PIERRES_CHEMIN[i];
          const fort = x.franchi || x.part === 1;
          const couleur = fort ? (sombre ? pi.texteSombre : pi.texte) : fg2;
          return (
            <Ink
              key={x.part}
              size={11.5}
              weight={x.part === 1 ? 'black' : fort ? 'extraBold' : 'bold'}
              color={couleur}
              numberOfLines={1}
              style={[{ fontVariant: ['tabular-nums'] }, x.part === 1 ? { position: 'absolute', right: -marge, width: 60, textAlign: 'right' } : { position: 'absolute', left: `${x.part * 100}%`, marginLeft: -30, width: 60, textAlign: 'center' }]}
            >
              {formatKg(x.kg)}
            </Ink>
          );
        })}
      </View>
    </View>
  );
}

/** Les petits points de pagination du carrousel */
function PointsPages({ nb, page, couleur, inactif }: { nb: number; page: number; couleur: string; inactif: string }) {
  if (nb < 2) return null;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 6, paddingBottom: 11 }}>
      {Array.from({ length: nb }, (_, i) => (
        <View key={i} style={{ width: i === page ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? couleur : inactif }} />
      ))}
    </View>
  );
}

export function CartePoids({ series: seriesIn, targetWeight, startWeight, today: todayProp, demo, centre = CENTRAGE_POIDS, onPage }: Props) {
  const router = useRouter();
  const { width: largeur } = useWindowDimensions();
  const { theme } = useYoroiTheme();
  // 27 octobre 2026 (refonte Ciel) : le carrousel de la carte bleue, sa page et sa largeur
  const [page, setPage] = useState(0);
  // 27 octobre 2026 soir (Houari : « le carrousel penche vers la droite ») : la largeur de depart est celle des
  // autres cartes de l'accueil (ecran moins 2 x 16), puis la vraie largeur mesuree, sans arrondi : chaque page fait
  // exactement la largeur du carrousel, la page 2 et la page 3 tombent pile au centre
  const [largeurCarte, setLargeurCarte] = useState(largeur - 32);
  // 27 octobre 2026 soir : la hauteur mesuree de la page 1, pour caler la courbe de la page 2 dessus
  const [hautPage1, setHautPage1] = useState(0);
  const pagesRef = useRef<React.ElementRef<typeof PagesScroll>>(null);
  useEffect(() => {
    onPage?.(page);
  }, [page, onPage]);
  // 28 octobre 2026 : la visite guidee montre la page 1 (ton poids et ses paliers) puis la page 2 (ta courbe)
  const largeurRef = useRef(largeurCarte);
  largeurRef.current = largeurCarte;
  useEffect(
    () =>
      ecouterPagePoids((p) => {
        const w = Math.max(1, largeurRef.current);
        (pagesRef.current as any)?.scrollTo?.({ x: p * w, animated: true });
        setPage(p);
      }),
    [],
  );
  const today = todayProp ?? localISO();
  // vague 42 : jamais de pesee dans le futur (la courbe montrait janvier et le torii octobre)
  const series = useMemo(() => (seriesIn.some((p) => p.date > today) ? seriesIn.filter((p) => p.date <= today) : seriesIn), [seriesIn, today]);
  const exemple = !!todayProp || !!demo;
  const last = series[series.length - 1];
  const prefs = usePrefsCourbes();
  // ta scene et ton personnage (Ton espace) : le fond de la courbe et le marcheur du sentier
  const { espace } = useEspace();
  const fond = sceneDuFond(prefs.fond, espace.scene);
  const [choix, setPeriod] = useState<number | null>(null);
  const [scrub, setScrub] = useState<ScrubPoids | null>(null);
  // maquette B : la legende sous la courbe n'apparait qu'au toucher de la courbe
  const [legende, setLegende] = useState(false);
  // 18 octobre : la feuille « Ton objectif » (debut, objectif, date du cap)
  const [feuille, setFeuille] = useState<{ quoi: QuoiObjectif | null } | null>(null);

  // ton plan : la vraie carte de l'accueil seulement (pas les cartes d'exemple de l'onboarding)
  const plan = usePlanPoids(series, targetWeight, { enabled: !exemple, check: !exemple, today });
  const capOn = prefs.cap && targetWeight !== null;
  const planOk = capOn && !!plan.ligne && !!plan.torii;
  // courbe v2 (Houari : « la meilleure courbe, c'est Mon plan ») : « Mon plan » par defaut quand tu as un plan,
  // tant que tu n'as pas choisi une autre periode
  const period = choix ?? (planOk ? PERIODE_PLAN : 90);
  const periode = period === PERIODE_PLAN && !planOk ? 90 : period;

  // courbe v2 : le meme cadrage que le detail du poids (lib/v2/pesee/cadrageCourbe.ts) : la fenetre part du debut
  // de ton objectif ou de ta premiere vraie pesee, jamais d'un grand vide ; « depuis le 3 oct. » si la periode depasse
  const cadrage = useMemo(() => cadrerPeriode(series, periode, plan.depart?.date ?? null), [series, periode, plan.depart?.date]);
  // 18 octobre (audit du poids) : SOURCE UNIQUE des chiffres de ton objectif (lib/v2/pesee/etatObjectif.ts) : le meme
  // debut pour « depuis ton début », la barre, ton allure et ta projection, ici et dans le detail du poids
  const etat = useMemo(
    () =>
      etatObjectif({
        series,
        cap: targetWeight,
        depart: plan.depart ?? (startWeight && series.length ? { date: series[0].date, poids: startWeight } : null),
        ligne: plan.ligne,
        torii: plan.torii,
        atteint: plan.atteint,
        choisie: plan.choisie,
        today,
        projection: !exemple,
      }),
    [series, targetWeight, plan.depart, startWeight, plan.ligne, plan.torii, plan.atteint, plan.choisie, today, exemple],
  );
  const shown = cadrage.points;
  const curve = useMemo(() => shown.map((p) => ({ date: p.date, value: p.value })), [shown]);
  const openDetail = () => router.push('/poids-detail' as any);

  // le torii a bouge : une fenetre bienveillante, une seule fois
  const vu = useRef<string | null>(null);
  useEffect(() => {
    const f = plan.fenetre;
    if (!f || targetWeight === null || vu.current === f.date) return;
    vu.current = f.date;
    const t = texteFenetreTorii(f.kind, f.date, targetWeight, today);
    const timer = setTimeout(() => {
      appAlert(t.titre, t.texte, [{ text: traduire('Garder ce rythme'), style: 'cancel' }, { text: traduire('Voir mon plan'), onPress: () => router.push('/poids-detail' as any) }], {
        illustration: (
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F6EFD9', alignItems: 'center', justifyContent: 'center' }}>
            <ToriiImage width={42} />
          </View>
        ),
      });
    }, 900);
    return () => clearTimeout(timer);
  }, [plan.fenetre, targetWeight, today, router]);

  if (!last) {
    return (
      <Press onPress={() => router.push('/progres' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ton poids. Touche plus pour ta première pesée")}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Ink size={13} weight="extraBold" color={POIDS.softText}>
              {traduire("Ton poids")}</Ink>
            <Ink size={20} weight="black" tight>
              {traduire("Ta courbe démarre à ta première pesée")}</Ink>
            <PlusHint text={traduire("Touche + pour ta première pesée")} />
          </View>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: POIDS.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="scale" size={20} color={POIDS.softText} width={2.2} />
          </View>
        </Card>
      </Press>
    );
  }

  // ecart sur la periode affichee
  const first = shown[0] ?? last;
  // « depuis ton début » (Mon plan) : la source unique, ton poids actuel moins ton debut (avant : la premiere pesee de la
  // courbe, d'ou −3,7 kg ici quand la barre disait 3,4 kg perdus) ; les autres periodes : l'ecart sur la periode
  const delta = periode === PERIODE_PLAN && etat.variation != null ? etat.variation : shown.length > 1 ? last.value - first.value : null;
  const isToday = last.date === today;
  const periodeTxt = texteDePeriode(periode, cadrage.mention, PERIODE_TEXTE[PERIODE_PLAN]);

  // depart, objectif, sens
  // le meme depart que la ligne directrice (regle unique, comme departDuChemin de lib/v2/accueil/projection.ts)
  const start = plan.depart?.poids ?? startWeight ?? series[0].value;
  const goal = targetWeight;
  // meme regle que la fin de pesee (goalProgress) : sur la pesee du jour
  const gp = goal !== null ? goalProgress(start, goal, last.value) : null;
  const mode: ModeChemin | null =
    goal === null ? null : plan.ligne ? (plan.ligne.mode === 'perte' || plan.ligne.mode === 'prise' ? plan.ligne.mode : 'maintien') : Math.abs(goal - start) < 0.2 ? 'maintien' : gp?.losing ? 'perte' : 'prise';
  const lossGoal = mode === 'perte' || (mode === null && delta !== null && delta < 0);
  const towardGoal = delta !== null && goal !== null && mode !== 'maintien' && Math.abs(delta) >= 0.05 && ((lossGoal && delta < 0) || (!lossGoal && delta > 0));
  const deltaText = delta === null ? traduire('ta tendance arrive') : Math.abs(delta) < 0.05 ? traduire("stable {0}", periodeTxt) : `${delta < 0 ? '−' : '+'}${formatKg(Math.abs(delta))} kg ${periodeTxt}`;
  // le chiffre cle seul (en couleur), le reste de la ligne en encre secondaire
  const deltaChiffre = delta !== null && Math.abs(delta) >= 0.05 ? `${delta < 0 ? '−' : '+'}${formatKg(Math.abs(delta))} kg` : null;
  const atteint = plan.atteint || (mode !== 'maintien' && etat.atteint);

  // le grand chiffre : la pesee touchee (style 1), sinon aujourd'hui
  const follow = prefs.style === 1 && scrub !== null && !scrub.last;
  const bigValue = follow && scrub ? scrub.point.value : last.value;
  const statutDuJour = capOn && plan.ligne ? statutLigne(plan.ligne, last.date, last.value, plan.torii) : null;
  // vague 42 : une phrase de tous les jours a la place de la pastille ; au doigt, elle parle de la pesee touchee
  // hors du doigt : la phrase de la source unique, qui ne contredit jamais ta projection
  const phrase = capOn && plan.ligne ? (follow && scrub ? phraseStatut(plan.ligne, scrub.point.date, scrub.point.value, plan.torii, true) : etat.phrase ?? phraseStatut(plan.ligne, last.date, last.value, plan.torii)) : null;
  const quand = follow && scrub ? `${scrub.point.week ? traduire('semaine du ') : traduire('le ')}${jourCourt(scrub.point.date)}` : null;
  const ecartDepuis = follow && scrub ? last.value - scrub.point.value : 0;

  // 17 octobre (Houari : « la parenthèse est de la même couleur verte que le texte ») : plus de parentheses ;
  // seul le chiffre cle prend la couleur, les mots de liaison restent en encre secondaire
  // 27 octobre 2026 : la ligne de l'ecart, dans les couleurs de la carte blanche ou de la carte bleue
  const ligneEcart = (base: string, fortDoigt: string, fortVers: string, fort: string) =>
    follow && scrub ? (
      <Ink size={13} weight="bold" color={base} numberOfLines={1} style={{ flexShrink: 1 }}>
        {quand}
        {Math.abs(ecartDepuis) < 0.05 ? (
          traduire(', comme aujourd’hui')
        ) : (
          <>
            {', '}
            <Ink size={13} weight="extraBold" color={fortDoigt}>{`${formatKg(Math.abs(ecartDepuis))} kg`}</Ink>
            {ecartDepuis < 0 ? traduire(' perdus depuis') : traduire(' repris depuis')}
          </>
        )}
      </Ink>
    ) : deltaChiffre ? (
      <Ink size={13} weight="bold" color={base} numberOfLines={1} style={{ flexShrink: 1 }}>
        <Ink size={13} weight="extraBold" color={towardGoal ? fortVers : fort}>
          {deltaChiffre}
        </Ink>
        {` ${periodeTxt}`}
      </Ink>
    ) : (
      <Ink size={13} weight="bold" color={base} numberOfLines={1} style={{ flexShrink: 1 }}>
        {deltaText}
      </Ink>
    );
  const parenNode = ligneEcart(P.ink2, POIDS.softText, POIDS.capText, P.ink);

  // 17 octobre (maquette B, choisie par Houari) : le chemin en une barre fine, et la date unique du torii dessous
  // (lib/v2/pesee/arrivee.ts, la meme que Progres, la montre et le bilan)
  // 18 octobre : la part et le reste de la source unique (memes chiffres que le detail du poids)
  const chemin = goal !== null && etat.part != null && etat.reste != null && mode && mode !== 'maintien' && (capOn || atteint) ? { part: atteint ? 1 : etat.part, reste: atteint ? 0 : etat.reste } : null;
  const arrivee = chemin && !atteint ? arriveePrevueTexte({ torii: plan.torii, atteint }, today) : null;
  const objectifTxt = !exemple && goal !== null ? texteObjectif(etat) : null;
  // 18 octobre (etudes) : seulement quand ta derniere pesee s'ecarte d'au moins 0,6 kg de ta tendance
  const tendTxt = !exemple ? texteTendance(etat) : null;
  const eauTxt = tendTxt && etat.ecartTendance != null && Math.abs(etat.ecartTendance) >= ECART_EAU_KG && tendTxt.note ? `${tendTxt.valeur}, ${tendTxt.note}.` : null;

  const a11y = [
    traduire("Ton poids : {0} kilos, {1}", formatKg(last.value), isToday ? traduire('pesée du jour') : relativeDay(last.date)),
    deltaText,
    statutDuJour ? statutDuJour.label : null,
    goal === null ? traduire('pas encore de cap') : null,
  ]
    .filter(Boolean)
    .join(', ');

  const options = planOk ? POIDS_PERIODS_PLAN_COURT : POIDS_PERIODS;

  // 27 octobre 2026 (refonte Ciel) : les cartes d'exemple de l'onboarding gardent la carte blanche d'un seul tenant
  if (exemple) return (
    <View nativeID="carte-poids" testID="carte-poids">
    {/* vague 49 : meme carte que Ta semaine, sans papier washi ni double bordure */}
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* le heros : le grand chiffre (il suit ton doigt), l'ecart en pastille, le statut en une ligne */}
      <Press onPress={openDetail} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("{0}. Voir le détail", a11y)}>
        <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <Icon name="scale" size={16} color={POIDS.softText} width={2.5} />
              <Ink size={13} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
                {traduire("Ton poids")}</Ink>
            </View>
            {!follow ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {isToday ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: POIDS.capText }} /> : null}
                <Ink size={12} weight="bold" color={isToday ? P.ink2 : P.muted} numberOfLines={1}>
                  {isToday ? traduire('pesée du jour') : relativeDay(last.date)}
                </Ink>
              </View>
            ) : null}
          </View>
          <View style={{ alignItems: centre ? 'center' : 'flex-start', gap: 8, paddingTop: 4 }}>
            <Ink size={48} weight="black" tight numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
              {formatKg(bigValue)}
              <Ink size={17} weight="bold" color={P.ink2}>
                {' kg'}
              </Ink>
            </Ink>
            <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: '100%', paddingHorizontal: 11, minHeight: 28, borderRadius: 14, borderWidth: 1.5, borderColor: !follow && towardGoal ? POIDS.capText : P.line }}>
              {parenNode}
            </View>
          </View>
          {phrase ? (
            <Ink size={13.5} weight="bold" color={P.ink2} numberOfLines={2} style={{ marginTop: 10, lineHeight: 19, textAlign: centre ? 'center' : 'left' }}>
              {phrase.avant}
              {cleChiffre(phrase.cle) ? (
                <>
                  <Ink size={13.5} weight="extraBold" color={couleurTon(phrase.ton)}>
                    {cleChiffre(phrase.cle)![0]}
                  </Ink>
                  <Ink size={13.5} weight="extraBold" color={P.ink}>
                    {cleChiffre(phrase.cle)![1]}
                  </Ink>
                </>
              ) : (
                <Ink size={13.5} weight="extraBold" color={couleurTon(phrase.ton)}>
                  {phrase.cle}
                </Ink>
              )}
              {phrase.apres}
            </Ink>
          ) : null}
          {/* 18 octobre (etudes) : ta pesee loin de ta tendance, on dit que c'est sans doute de l'eau (la meme phrase
              que le detail du poids, lib/v2/pesee/etatObjectif.ts texteTendance) */}
          {eauTxt && !follow ? (
            <Ink size={12.5} weight="bold" color={P.muted} numberOfLines={3} style={{ marginTop: 6, lineHeight: 17, textAlign: centre ? 'center' : 'left' }}>
              {eauTxt}
            </Ink>
          ) : null}
        </View>
      </Press>

      {/* la courbe respiree : la ligne verte finit au torii, ta courbe violette au-dessus ; un toucher montre la legende */}
      {curve.length > 1 || periode === PERIODE_PLAN ? (
        <>
          <SceneCourbe scene={fond} style={{ marginHorizontal: 14, marginTop: 10, paddingBottom: fond ? 4 : 0 }}>
            <CourbePoids
              points={curve}
              style={prefs.style}
              showCap={capOn}
              cap={goal}
              ligne={plan.ligne}
              torii={plan.torii}
              atteint={plan.atteint}
              periode={periode}
              debut={cadrage.debut}
              today={today}
              height={136}
              surScene={!!fond}
              compact
              legende={legende}
              projection={etat.projection?.points ?? null}
              onScrub={setScrub}
              onPress={() => setLegende((v) => !v)}
              onToriiPress={planOk ? () => setPeriod(PERIODE_PLAN) : undefined}
              label={traduire("Ta courbe de poids {0}. Touche pour {1} la légende", periode === PERIODE_PLAN ? traduire('sur ton plan, jusqu’au torii') : LANG === 'fr' ? periodeTxt.replace('en ', 'sur ') : periodeTxt, legende ? traduire('cacher') : traduire('voir'))}
            />
          </SceneCourbe>
          {/* les periodes en onglets discrets, au centre ; le bouton « Style » a droite */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginTop: 6 }}>
            {!exemple && largeur >= 400 ? <View style={{ width: BOUTON_STYLE_L }} /> : null}
            <View style={{ flex: 1, alignItems: 'center' }}>
              <PeriodSwitch value={periode} onChange={setPeriod} options={options} variant="onglets" />
            </View>
            {!exemple ? <BoutonStyle onPress={() => router.push(ROUTES_PERSONNALISER.styleCourbe as any)} /> : null}
          </View>
        </>
      ) : (
        <View style={{ height: 6 }} />
      )}

      {/* le chemin vers le torii en une barre fine (ou de quoi fixer ton cap) */}
      {chemin ? (
        <Press onPress={openDetail} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("{0}{1}. Voir le détail de ton poids", atteint ? traduire('Torii atteint') : traduire("{0} % du chemin, encore {1} kilos", Math.round(chemin.part * 100), formatKg(chemin.reste)), arrivee ? traduire(", arrivée prévue {0}", arrivee) : '')}>
          <View style={{ marginHorizontal: 18, marginTop: 12, marginBottom: 16, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Ink size={12.5} weight="extraBold" color={P.ink} numberOfLines={1}>
                {atteint ? traduire('Torii atteint') : traduire("{0} % du chemin", Math.round(chemin.part * 100))}
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                {!atteint ? (
                  <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1}>
                    {traduire("encore {0} kg", formatKg(chemin.reste))}
                  </Ink>
                ) : null}
                <ToriiImage width={20} />
              </View>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(chemin.part * 100)}%`, height: 6, borderRadius: 3, backgroundColor: atteint ? POIDS.capText : POIDS.c3 }} />
            </View>
            {arrivee ? (
              <Ink size={11.5} weight="bold" color={P.muted} numberOfLines={1} style={{ textAlign: 'right' }}>
                {`${plan.choisie ? traduire('ta date du cap') : traduire('arrivée prévue')} ${arrivee}`}
              </Ink>
            ) : null}
          </View>
        </Press>
      ) : goal === null && !exemple ? (
        <Press onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel={traduire("Fixer ton cap de poids")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 18, marginTop: 10, paddingVertical: 12, marginBottom: 4, borderTopWidth: 1, borderColor: P.line2 }}>
            <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#F6EFD9', alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={26} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={14.5} weight="extraBold" numberOfLines={1}>
                {traduire("Fixe ton cap")}</Ink>
              <Ink size={12.5} weight="medium" color={P.ink2} numberOfLines={2}>
                {traduire("Ton torii et ton rythme prévu apparaissent sur ta courbe")}</Ink>
            </View>
            <Icon name="chevron" size={15} color={P.muted} width={2.6} />
          </View>
        </Press>
      ) : (
        <View style={{ height: 12 }} />
      )}
      {/* 18 octobre (Houari : « pouvoir changer facilement la date de début, le poids objectif et la date du cap ») */}
      {objectifTxt ? (
        // 18 octobre 2026 : ancre de la visite guidee (« Ton objectif », avec Changer)
        <TourAnchor id="accueil.objectif">
        <Press onPress={() => setFeuille({ quoi: null })} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Ton objectif : {0}{1}. Changer ton début, ton objectif ou ta date du cap", objectifTxt, plan.torii ? `, date du cap le ${jourCourt(plan.torii)}` : '')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginHorizontal: 18, marginTop: chemin ? -6 : 0, marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderColor: P.line2 }}>
            <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
              {traduire("Ton objectif : {0}", objectifTxt)}
            </Ink>
            <Ink size={12.5} weight="extraBold" color={POIDS.softText} numberOfLines={1}>
              {traduire("Changer")}</Ink>
          </View>
        </Press>
        </TourAnchor>
      ) : null}
      {!exemple ? (
        <FeuilleObjectif visible={!!feuille} quoi={feuille?.quoi ?? null} onClose={() => setFeuille(null)} etat={etat} series={series} today={today} cle={plan.cle} />
      ) : null}
      {/* « Où tu en seras » vit maintenant dans le detail du poids (app/poids-detail.tsx), en bloc propre */}
    </Card>
    </View>
  );

  // 27 octobre 2026 (refonte Ciel, choisie par Houari) : un grand rectangle sur toute la largeur, en carrousel.
  // 27 octobre 2026 soir (Houari : « la page 3 avec les paliers, je l'adore ») : deux pages seulement. Page 1 ton poids
  // en tete puis ton chemin en paliers et ton objectif (c'est elle qui porte les citrouilles et les sapins), page 2 ta courbe.
  // La carte passe en blanc pur avec l'ombre des autres cartes et un voile lilas pastel en haut : l'ancien fond
  // #E8ECFF se confondait avec le fond de l'app. Memes calculs qu'avant.
  const fg = P.ink;
  const fg2 = P.ink2;
  const fg3 = P.muted;
  const chiffreC = theme.colors.accentText;
  const sombre = paletteSombre();
  const lilas = sombre ? '#2C2A55' : '#EEEBFF';
  const pageCourbe = curve.length > 1 || periode === PERIODE_PLAN;
  const nbPages = 1 + (pageCourbe ? 1 : 0);
  const pageVue = Math.min(page, nbPages - 1);
  const W = Math.max(1, largeurCarte);
  // la courbe prend la hauteur laissee par la page 1, entre 136 et 196 points : pas de grand vide sous la courbe
  const hCourbe = Math.round(Math.max(COURBE_MIN, Math.min(COURBE_MAX, hautPage1 - CHROME_PAGE_COURBE - (fond ? 4 : 0))));

  // 27 octobre 2026 nuit (Houari : « fais moi un beau truc ») : les chiffres de ton poids dans le violet de la carte
  // (POIDS.softText, celui de l'anneau et du voile lilas, AA sur le voile), la virgule et « kg » en encre neutre.
  // Le vert reste a la pastille de l'ecart : il change de sens selon les jours, le violet est toujours juste.
  const violet = POIDS.softText;
  const poidsTxt = formatKg(last.value);
  const iVirgule = poidsTxt.lastIndexOf(DECIMAL);
  const entier = iVirgule < 0 ? poidsTxt : poidsTxt.slice(0, iVirgule);
  const decimales = iVirgule < 0 ? '' : poidsTxt.slice(iVirgule + 1);

  // les phrases deviennent des pastilles courtes, a la ligne si la langue est longue : rien n'est jamais coupe
  // « depuis ton début » sur la page 1, quelle que soit la periode choisie sur la courbe (la source unique)
  const variation = etat.variation;
  const versDebut = variation != null && goal !== null && mode !== 'maintien' && ((lossGoal && variation < 0) || (!lossGoal && variation > 0));
  const tDebut = teintePastille(follow && scrub ? 'gris' : versDebut ? 'vert' : 'gris', sombre);
  const pastilleDebut = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: HAUT_PASTILLE, paddingHorizontal: 10, paddingVertical: 4, borderRadius: HAUT_PASTILLE / 2, backgroundColor: tDebut.fond, maxWidth: '100%' }}>
      {follow && scrub ? (
        ligneEcart(fg2, POIDS.softText, POIDS.capText, fg)
      ) : variation != null && Math.abs(variation) >= 0.05 ? (
        <Ink size={12.5} weight="bold" color={tDebut.texte} style={{ flexShrink: 1 }}>
          <Ink size={12.5} weight="black" color={tDebut.texte}>
            {`${variation < 0 ? '−' : '+'}${formatKg(Math.abs(variation))} kg`}
          </Ink>
          {` ${PERIODE_TEXTE[PERIODE_PLAN]}`}
        </Ink>
      ) : variation != null ? (
        <Ink size={12.5} weight="bold" color={tDebut.texte} style={{ flexShrink: 1 }}>
          {traduire("stable {0}", PERIODE_TEXTE[PERIODE_PLAN])}
        </Ink>
      ) : (
        ligneEcart(fg2, POIDS.softText, POIDS.capText, fg)
      )}
    </View>
  );
  // « Tu descends plus vite que prévu » devient « Plus vite que prévu » (le sens est deja dans la pastille verte)
  const passe = !!(follow && scrub);
  const texteStatut = phrase ? (passe ? `${phrase.avant}${traduire(phrase.cle)}${phrase.apres}` : `${traduire(phrase.cle.charAt(0).toUpperCase() + phrase.cle.slice(1))}${phrase.apres}`) : null;
  const tStatut = phrase ? teintePastille(phrase.ton, sombre) : null;
  // l'alerte balance (derniere pesee loin de ta tendance) : une seule ligne courte (sans chevron, pour tenir sur 375),
  // l'explication complete au toucher (appAlert) et pour VoiceOver
  const dT = etat.ecartTendance;
  const alerte = eauTxt && dT != null ? (() => {
    const fort = Math.abs(dT) >= 2;
    const n = kg1(dT);
    const fr = fort
      ? dT > 0 ? 'Pesée à vérifier : {0} kg de plus que ta tendance' : 'Pesée à vérifier : {0} kg sous ta tendance'
      : dT > 0 ? 'Eau probable : {0} kg de plus que ta tendance' : 'Eau probable : {0} kg sous ta tendance';
    // une langue qui n'a pas encore la phrase courte : « Your trend: 80.4 kg, −5.4 kg » (deja traduit), une ligne aussi
    if (LANG !== 'fr' && traduire(fr) === fr) return { fort, n: `${dT > 0 ? '+' : '−'}${n} kg`, avant: `${tendTxt?.valeur ?? ''}, `, apres: '', trouve: true };
    const texte = traduire(fr, n);
    const i = texte.indexOf(`${n} kg`);
    return { fort, n: `${n} kg`, avant: i < 0 ? texte : texte.slice(0, i), apres: i < 0 ? '' : texte.slice(i + n.length + 3), trouve: i >= 0 };
  })() : null;

  // Page 1 : ton poids en tete (l'ancienne page Ton poids), puis ton chemin en paliers et ton objectif
  const pageUne = (
    <View
      style={{ width: W, alignSelf: 'flex-start', paddingHorizontal: 16, paddingTop: 11, paddingBottom: 0, gap: 7 }}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - hautPage1) > 1) setHautPage1(h);
      }}
    >
      <Press onPress={openDetail} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("{0}. Voir le détail", [a11y, texteStatut].filter(Boolean).join(', '))}>
        {/* le titre et ton poids a gauche, l'anneau du chemin a droite ; le creux entre les deux accueille les citrouilles et les sapins */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Ink size={11} weight="black" color={P.indigo} style={{ letterSpacing: 1.4 }}>
              {(isToday ? traduire('Ton poids') : `${traduire('Ton poids')}, ${relativeDay(last.date)}`).toUpperCase()}
            </Ink>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
              <Ink size={30} weight="black" tight numberOfLines={1} color={violet} style={{ fontVariant: ['tabular-nums'], lineHeight: 33 }}>
                {entier}
                {decimales ? (
                  <Ink size={30} weight="black" tight color={fg}>
                    {DECIMAL}
                  </Ink>
                ) : null}
                {decimales}
              </Ink>
              <Ink size={15} weight="extraBold" color={fg}>
                {'kg'}
              </Ink>
            </View>
          </View>
          {chemin ? (
            <View style={{ alignItems: 'center', gap: 2 }}>
              <AnneauChemin part={chemin.part} />
              <Ink size={12} weight="black" color={chiffreC} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                {`${Math.round(chemin.part * 100)} %`}
              </Ink>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {pastilleDebut}
          {texteStatut && tStatut ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: HAUT_PASTILLE, paddingHorizontal: 10, paddingVertical: 4, borderRadius: HAUT_PASTILLE / 2, backgroundColor: tStatut.fond, maxWidth: '100%' }}>
              <Ink size={12.5} weight="extraBold" color={tStatut.texte} style={{ flexShrink: 1 }}>
                {texteStatut}
              </Ink>
            </View>
          ) : null}
        </View>
      </Press>
      {alerte && eauTxt ? (
        <Press onPress={() => appAlert(traduire('Ta tendance'), eauTxt)} haptic="light" accessibilityRole="button" accessibilityLabel={eauTxt} accessibilityHint={traduire("Voir le détail")} hitSlop={6}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: -1 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: alerte.fort ? (sombre ? '#4A3710' : '#FFE2A1') : sombre ? '#2E2A55' : '#E6E1FF', alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={11} weight="black" color={alerte.fort ? (sombre ? '#F2C46B' : '#8A5A00') : violet} style={{ lineHeight: 13 }}>
                {alerte.fort ? '!' : 'i'}
              </Ink>
            </View>
            <Ink size={12} weight="bold" color={fg3} style={{ flexShrink: 1, lineHeight: 16 }}>
              {alerte.avant}
              {alerte.trouve ? (
                <Ink size={12} weight="black" color={alerte.fort ? POIDS.or : fg2}>
                  {alerte.n}
                </Ink>
              ) : null}
              {alerte.apres}
            </Ink>
          </View>
        </Press>
      ) : null}
      {chemin ? (
        <Press onPress={openDetail} haptic="none" accessibilityRole="button" accessibilityLabel={traduire("{0}{1}. Voir le détail de ton poids", atteint ? traduire('Torii atteint') : traduire("{0} % du chemin, encore {1} kilos", Math.round(chemin.part * 100), formatKg(chemin.reste)), arrivee ? traduire(", arrivée prévue {0}", arrivee) : '')}>
          <View style={{ gap: 5, paddingTop: 7, borderTopWidth: 1, borderColor: P.line2 }}>
            {/* le titre sur sa ligne, la date sur la sienne : rien n'est jamais coupe */}
            <View style={{ gap: 1 }}>
              <Ink size={atteint ? 16 : 18} weight="black" tight color={chiffreC}>
                {atteint ? traduire('Torii atteint') : traduire("{0} % du chemin", Math.round(chemin.part * 100))}
              </Ink>
              {arrivee ? (
                <Ink size={12.5} weight="bold" color={fg2}>
                  {`${plan.choisie ? traduire('ta date du cap') : traduire('arrivée prévue')} ${arrivee}`}
                </Ink>
              ) : null}
            </View>
            {/* 27 octobre 2026 soir (Houari : « des paliers qui donnent envie ») : la barre en 4 paliers, le torii au bout */}
            {goal !== null ? <BarrePaliers depart={start} objectif={goal} part={chemin.part} atteint={atteint} fg2={fg2} /> : null}
            {(() => {
              const pr = goal !== null && !atteint ? paliersDuChemin(start, goal, last.value, chemin.part).prochain : null;
              if (!pr) return null;
              // 28 octobre 2026 (version C) : la pastille prend la couleur de la pierre en cours
              const pi = PIERRES_CHEMIN[pierreEnCours(chemin.part)];
              const fondP = sombre ? pi.paleSombre : pi.pale;
              const texteP = sombre ? pi.texteSombre : pi.texte;
              return (
                <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', minHeight: 26, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 13, backgroundColor: fondP, maxWidth: '100%' }}>
                  <Ink size={12.5} weight="bold" color={texteP} style={{ flexShrink: 1 }}>
                    {pr.dernier ? traduire('Dernier palier : ton objectif, ') : traduire('Prochain palier : {0} kg, ', formatKg(pr.kg))}
                    <Ink size={12.5} weight="black" color={texteP}>
                      {traduire('encore {0} kg', formatKg(pr.dernier ? chemin.reste : pr.encore))}
                    </Ink>
                  </Ink>
                </View>
              );
            })()}
          </View>
        </Press>
      ) : goal === null ? (
        <Press onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel={traduire("Fixer ton cap de poids")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: P.line2 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: lilas, alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={22} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={16} weight="black" color={fg}>
                {traduire("Fixe ton cap")}</Ink>
              <Ink size={12.5} weight="medium" color={fg2}>
                {traduire("Ton torii et ton rythme prévu apparaissent sur ta courbe")}</Ink>
            </View>
            <Icon name="chevron" size={15} color={fg2} width={2.6} />
          </View>
        </Press>
      ) : null}
      {objectifTxt ? (
        <TourAnchor id="accueil.objectif">
        <Press onPress={() => setFeuille({ quoi: null })} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("Ton objectif : {0}{1}. Changer ton début, ton objectif ou ta date du cap", objectifTxt, plan.torii ? `, date du cap le ${jourCourt(plan.torii)}` : '')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8, borderTopWidth: 1, borderColor: P.line2 }}>
            <Ink size={12.5} weight="bold" color={fg2} style={{ flexShrink: 1 }}>
              {traduire("Ton objectif : {0}", objectifTxt)}
            </Ink>
            <View style={{ paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: lilas, justifyContent: 'center' }}>
              <Ink size={12.5} weight="extraBold" color={chiffreC} numberOfLines={1}>
                {traduire("Changer")}</Ink>
            </View>
          </View>
        </Press>
        </TourAnchor>
      ) : null}
    </View>
  );

  // Page 2 : ta courbe, sur son panneau, sans changement sur le fond ; le doigt ne la suit qu'apres un appui maintenu
  const pageDeLaCourbe = pageCourbe ? (
    <View style={{ width: W, paddingTop: 16, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 20, paddingHorizontal: 16, marginBottom: 8 }}>
        <Ink size={13} weight="extraBold" color={fg2} numberOfLines={1} style={{ flexShrink: 1 }}>
          {traduire("Ta courbe de poids")}</Ink>
        {/* le chiffre suit ton doigt sur la courbe */}
        <Ink size={12.5} weight="extraBold" color={chiffreC} numberOfLines={1}>
          {follow && scrub ? `${formatKg(bigValue)} kg, ${quand}` : `${formatKg(last.value)} kg`}
        </Ink>
      </View>
      <View style={{ marginHorizontal: 10, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingTop: 4, paddingBottom: 6, overflow: 'hidden' }}>
        <SceneCourbe scene={fond} style={{ marginHorizontal: 6, marginTop: 4, paddingBottom: fond ? 4 : 0 }}>
          <CourbePoids
            points={curve}
            style={prefs.style}
            showCap={capOn}
            cap={goal}
            ligne={plan.ligne}
            torii={plan.torii}
            atteint={plan.atteint}
            periode={periode}
            debut={cadrage.debut}
            today={today}
            height={hCourbe}
            surScene={!!fond}
            compact
            legende={legende}
            projection={etat.projection?.points ?? null}
            onScrub={setScrub}
            onPress={() => setLegende((v) => !v)}
            onToriiPress={planOk ? () => setPeriod(PERIODE_PLAN) : undefined}
            suiviApresAppui
            label={traduire("Ta courbe de poids {0}. Touche pour {1} la légende", periode === PERIODE_PLAN ? traduire('sur ton plan, jusqu’au torii') : LANG === 'fr' ? periodeTxt.replace('en ', 'sur ') : periodeTxt, legende ? traduire('cacher') : traduire('voir'))}
          />
        </SceneCourbe>
        {/* 27 octobre 2026 nuit : les periodes en segments egaux sur toute la largeur, Style en bouton rond au bout */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6, marginTop: 8 }}>
          <SegmentsPeriode value={periode} onChange={setPeriod} options={options} />
          <BoutonStyle rond onPress={() => router.push(ROUTES_PERSONNALISER.styleCourbe as any)} />
        </View>
      </View>
    </View>
  ) : null;

  return (
    <View
      nativeID="carte-poids"
      testID="carte-poids"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - largeurCarte) > 0.25) {
          setLargeurCarte(w);
          // la page affichee reste calee sur la nouvelle largeur
          if (page > 0) requestAnimationFrame(() => (pagesRef.current as any)?.scrollTo?.({ x: page * w, animated: false }));
        }
      }}
      style={[{ borderRadius: 28, backgroundColor: P.white }, ombreCarte]}
    >
      <View style={{ borderRadius: 28, overflow: 'hidden' }}>
        {/* un bord blanc de 5 tout autour du voile : la carte se detache nettement du fond de l'app.
            27 octobre 2026 nuit (Houari : une marche dans l'angle) : sur iPhone, un degrade ne se coupe pas a des rayons
            differents par coin ; il est donc pose dans une boite qui coupe (overflow hidden), au rayon interieur exact
            (28 moins 5 = 23, deux arcs concentriques), et il s'efface vers le blanc sur trois arrets, sans arete. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: VOILE_CARTE_POIDS.bord, right: VOILE_CARTE_POIDS.bord, top: VOILE_CARTE_POIDS.bord, height: VOILE_CARTE_POIDS.hauteur, borderTopLeftRadius: CARTE_POIDS_RAYON - VOILE_CARTE_POIDS.bord, borderTopRightRadius: CARTE_POIDS_RAYON - VOILE_CARTE_POIDS.bord, overflow: 'hidden' }}
        >
          <LinearGradient
            colors={[sombre ? VOILE_CARTE_POIDS.sombre : VOILE_CARTE_POIDS.clair, sombre ? VOILE_CARTE_POIDS.sombreMilieu : VOILE_CARTE_POIDS.clairMilieu, P.white]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
        </View>
        <PagesScroll
          ref={pagesRef as any}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          style={{ width: W }}
          contentContainerStyle={{ width: W * nbPages }}
          onScroll={(e) => {
            const p = Math.max(0, Math.min(nbPages - 1, Math.round(e.nativeEvent.contentOffset.x / W)));
            if (p !== page) setPage(p);
          }}
          accessibilityLabel={traduire("Ton poids et ton objectif, puis ta courbe. Glisse pour changer de page")}
        >
          {pageUne}
          {pageDeLaCourbe}
        </PagesScroll>
        {/* les points de pagination sur leur propre rangee, centres sous les pages : ils ne touchent plus aucun bouton */}
        <PointsPages nb={nbPages} page={pageVue} couleur={chiffreC} inactif={P.pointInactif} />
        {/* le liseré fin des autres cartes, pose par dessus : il ne retire aucun point a la largeur des pages */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28, borderWidth: 1, borderColor: P.line2 }} />
      </View>
      <FeuilleObjectif visible={!!feuille} quoi={feuille?.quoi ?? null} onClose={() => setFeuille(null)} etat={etat} series={series} today={today} cle={plan.cle} />
    </View>
  );
}
