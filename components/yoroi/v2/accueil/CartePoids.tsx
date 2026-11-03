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
import { Image, Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { ScrollView as PagesScroll } from 'react-native-gesture-handler';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { CheminPierresApercu } from '@/components/yoroi/v2/charts/CheminPierres';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { texteEtatsChemin } from '@/lib/v2/pesee/cheminPierres';
import { etatsLignePaliers } from '@/lib/v2/accueil/lignePaliers';
import type { LignePaliers } from '@/lib/v2/accueil/lignePaliers';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
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
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import type { DayWeight } from '@/lib/v2/weightStats';
import { formatKg } from '@/lib/v2/weightStats';
import { moyenne7Jours } from '@/lib/v2/mesures/indices';
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
import { ECART_EAU_KG, etatObjectif, texteObjectif, texteTendance } from '@/lib/v2/pesee/etatObjectif';
import { FeuilleObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { ecouterPagePoids } from '@/lib/v2/visite/pagePoids';
import type { QuoiObjectif } from '@/components/yoroi/v2/pesee/ObjectifPoids';
import { Card, Icon, ombreCarte, P, Press } from './kit';
import { traduire, LANG } from '@/lib/i18n/tr';
import { useLargeurEcran } from '@/lib/v2/nav/useGrandEcran';
import type { prochainePesee } from '@/lib/v2/accueil/enPlus';

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
        <View style={{ width: HAUT_SEGMENT, height: HAUT_SEGMENT, borderRadius: HAUT_SEGMENT / 2, backgroundColor: P.indigoSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M5 19L16 8M14 6l4 4M18 3v3M16.5 4.5h3" stroke={P.indigo} strokeWidth={2.6} strokeLinecap="round" />
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
  useEffect(() => {
    if (lockOn && isPremiumPeriod(value)) {
      const repli = options.find((o) => o.value === FREE_CHART_FALLBACK_DAYS) ?? options.find((o) => !isPremiumPeriod(o.value));
      if (repli) onChange(repli.value);
    }
  }, [lockOn, value, options, onChange]);
  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', padding: 2, gap: 2, borderRadius: HAUT_SEGMENT / 2, backgroundColor: P.indigoSoft }} accessibilityRole="tablist">
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
            <View style={{ height: HAUT_SEGMENT - 4, borderRadius: (HAUT_SEGMENT - 4) / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: on ? P.white : 'transparent' }}>
              {locked ? <CadenasSegment color={P.muted} /> : null}
              <Ink size={14} weight={on ? 'black' : 'bold'} color={on ? P.indigo : locked ? P.muted : P.ink2} numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ flexShrink: 1, lineHeight: 18 }}>
                {traduire(o.label)}
              </Ink>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
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
  /**
   * 3 novembre 2026 (Houari : « il y a de la place dans la carte ») : ta prochaine pesee, en petite pastille a cote de
   * ton poids (avant : la carte « Ta prochaine pesée » en bas de l'accueil). undefined : rien (en lecture, ou bloc
   * cache dans Personnaliser) ; null : aucun jour de pesee choisi.
   */
  pesee?: ReturnType<typeof prochainePesee>;
  /**
   * 3 novembre 2026 : un decor est pose au dessus de la pastille de pesee (l'accueil le sait, la carte ne le dessine pas).
   * Sans decor, la pastille remonte dans sa place (PESEE_CARTE_POIDS.hautSansDecor).
   */
  avecDecor?: boolean;
};

/** 27 octobre 2026 soir : la carte en blanc pur, un voile lilas pastel en haut qui s'efface vers le blanc */
// 27 octobre 2026 nuit : un arret au milieu (le voile s'efface en douceur) et le bord blanc de 5 autour
export const VOILE_CARTE_POIDS = { clair: '#E9E4FF', clairMilieu: '#F3F0FF', sombre: '#262449', sombreMilieu: '#20223A', hauteur: 150, bord: 5 } as const;
/** le rayon de la carte (CARTE_PASTEL.rayon) */
const CARTE_POIDS_RAYON = 28;


/** La partie fixe de la page courbe autour de la courbe (titre, panneau, periodes), pour caler sa hauteur sur la page 1 */
// 28 octobre 2026 (v3) : mesuree sur la page (titre, panneau, periodes : 120 points), puis relue a chaque mise en page ;
// la page 1 plus compacte, la courbe descend jusqu a 76 (torii atteint, sans pastille) : pas de vide sous ton chemin
const CHROME_PAGE_COURBE = 120;
const COURBE_MIN = 76;
const COURBE_MAX = 196;
/**
 * 28 octobre 2026 : le chemin (paliers, couleurs, mesures) a une seule source, lib/v2/pesee/cheminPierres.ts, et un seul
 * dessin, components/yoroi/v2/charts/CheminPierres.tsx (aussi utilise par Progres). Ces noms restent exportes d'ici.
 */
export { PALIERS_CHEMIN, paliersDuChemin, PIERRES_CHEMIN, BARRE_PIERRES, pierreEnCours } from '@/lib/v2/pesee/cheminPierres';

/**
 * 28 octobre 2026 (v3) : la ligne du haut de la page 1 : la colonne « TON POIDS / HIER » de 78 au plus, l'anneau de 38,
 * 5 points entre le pourcentage et l'anneau. Memes valeurs que CARTE_PASTEL de la geometrie de l'accueil (verifie par
 * le test), ou le decor pose par dessus la carte se cale sans que la carte le connaisse.
 */
const TETE = { anneau: 38 } as const;

/** 28 octobre 2026 : la hauteur de la pastille Objectif, sur la ligne du titre du chemin */
const HAUT_OBJECTIF = 26;

/**
 * 3 novembre 2026 : la pastille de ta prochaine pesee, dans la place libre entre ton poids et le sticker balance : son
 * bord droit a 80 du bord de la carte (8 avant le sticker), au moins 8 apres ton poids, pas plus etroite que 70 (sinon rien).
 * 3 novembre 2026 soir (Houari sur iPhone : « elle touche la ligne depuis ton début ») : 34 de haut, de 37 a 71, son
 * centre (54) un peu au dessus de celui du poids (56) et 9 points au dessus de la ligne « depuis ton début » (80).
 * Le jour et l'heure sur deux lignes (« Vendredi » puis « 7 h 00 ») : elle tient a cote de 112,4 kg sur 375 de large ;
 * l'icone seulement s'il reste au moins 120 points. Memes valeurs que PESEE_CARTE_POIDS du decor (verifie par le test).
 * 3 novembre 2026 nuit (Houari) : sans decor au dessus d'elle, elle remonte de 9 (de 28 a 62), a hauteur du haut de ton
 * poids ; avec un decor, elle reste a 37 pour lui laisser sa place.
 */
const PESEE_CARTE_POIDS = { droite: 80, haut: 37, hautSansDecor: 28, hauteur: 34, ecartPoids: 8, largeurMin: 70, icone: 120 } as const;

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

/**
 * 2 novembre 2026 (proposition A) : la ligne fine des paliers. Ton depart en petit a gauche, puis un rond par palier :
 * atteint (rond plein vert P.moss avec une coche), prochain (anneau de l'accent autour d'un point) ou a venir (rond gris
 * vide). Le trait est dans l'accent jusqu'au dernier palier atteint, gris ensuite (seuls les ronds atteints sont verts). Le chiffre de chaque palier dessous.
 * 3 novembre 2026 (Houari : « trop fin ») : le trait nettement plus epais (6 au lieu de 2), bouts arrondis, centre sur les ronds, et le trait vers le prochain palier se remplit
 * dans l'accent a mesure que tu avances (ligne.avance : a 86 entre 87,5 et 85, 60 %), en perte comme en prise.
 * 2 novembre 2026 soir (Houari : les paliers atteints en vert) : la coche en P.white sur P.moss, 3,8 a 1 en clair
 * (blanc sur #6E8C3A) et 7,2 a 1 en sombre (encre #1A1E29 sur #93B562), au dessus du seuil de 3 a 1 d'une icone.
 */
const LIGNE_PALIERS = { hauteur: 52, trait: 6, centre: 13, atteint: 24, prochain: 28, aVenir: 22, depart: 10, chiffres: 34, largeurChiffre: 48, margeG: 8, margeD: 14 } as const;
const GRIS_ROND = { clair: '#C9CDDB', sombre: '#4D5679' } as const;
function LigneDePaliers({ depart, ligne, accent, sombre }: { depart: number; ligne: LignePaliers; accent: string; sombre: boolean }) {
  const L = LIGNE_PALIERS;
  const gris = sombre ? GRIS_ROND.sombre : GRIS_ROND.clair;
  const n = ligne.paliers.length;
  const x = (i: number) => `${(i / n) * 100}%` as const;
  const chiffre = (cle: string, i: number, texte: string, couleur: string, poids: 'bold' | 'extraBold' | 'black', taille: number) => (
    <View key={cle} style={{ position: 'absolute', left: x(i), top: L.chiffres, width: L.largeurChiffre, transform: [{ translateX: -L.largeurChiffre / 2 }] }}>
      <Ink size={taille} weight={poids} color={couleur} numberOfLines={1} style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {texte}
      </Ink>
    </View>
  );
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ height: L.hauteur, marginTop: 18, marginLeft: L.margeG, marginRight: L.margeD }}>
      {ligne.paliers.map((_, i) => (
        <View key={`t${i}`} style={{ position: 'absolute', top: L.centre - L.trait / 2, height: L.trait, left: x(i), width: `${100 / n}%`, borderRadius: L.trait / 2, backgroundColor: i < ligne.atteints ? accent : P.line }} />
      ))}
      {/* le trait vers le prochain palier, rempli de ce que tu as deja fait depuis le palier d'avant */}
      {ligne.prochain && ligne.avance > 0 && ligne.atteints < n ? (
        <View style={{ position: 'absolute', top: L.centre - L.trait / 2, height: L.trait, left: x(ligne.atteints), width: `${(100 / n) * ligne.avance}%`, backgroundColor: accent, borderRadius: L.trait / 2 }} />
      ) : null}
      <View style={{ position: 'absolute', left: x(0), top: L.centre - L.depart / 2, width: L.depart, height: L.depart, borderRadius: L.depart / 2, borderWidth: 2, borderColor: gris, backgroundColor: P.white, transform: [{ translateX: -L.depart / 2 }] }} />
      {chiffre('d', 0, formatKg(depart), P.muted, 'bold', 11)}
      {ligne.paliers.map((p, i) => {
        const t = p.etat === 'atteint' ? L.atteint : p.etat === 'prochain' ? L.prochain : L.aVenir;
        return (
          <View key={`r${i}`} style={{ position: 'absolute', left: x(i + 1), top: L.centre - t / 2, width: t, height: t, transform: [{ translateX: -t / 2 }] }}>
            {p.etat === 'atteint' ? (
              <Svg width={t} height={t} viewBox="0 0 24 24">
                <Circle cx={12} cy={12} r={12} fill={P.moss} />
                <Path d="M7 12.4l3.2 3.2L17.2 8.6" fill="none" stroke={P.white} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : p.etat === 'prochain' ? (
              <Svg width={t} height={t} viewBox="0 0 28 28">
                <Circle cx={14} cy={14} r={13} fill={P.indigoSoft} stroke={accent} strokeWidth={2} />
                <Circle cx={14} cy={14} r={4.3} fill={accent} />
              </Svg>
            ) : (
              <Svg width={t} height={t} viewBox="0 0 22 22">
                <Circle cx={11} cy={11} r={10} fill={P.white} stroke={gris} strokeWidth={2} />
              </Svg>
            )}
          </View>
        );
      })}
      {ligne.paliers.map((p, i) =>
        chiffre(`c${i}`, i + 1, formatKg(p.kg), p.etat === 'atteint' ? P.ink : p.etat === 'prochain' ? accent : P.muted, p.etat === 'prochain' ? 'black' : 'extraBold', 12),
      )}
    </View>
  );
}

export function CartePoids({ series: seriesIn, targetWeight, startWeight, today: todayProp, demo, centre = CENTRAGE_POIDS, onPage, pesee, avecDecor = false }: Props) {
  const router = useRouter();
  const largeur = useLargeurEcran();
  // le theme clair ou sombre : la carte se redessine quand il change (P suit le theme)
  useYoroiTheme();
  const illus = useIllustrations();
  // 27 octobre 2026 (refonte Ciel) : le carrousel de la carte bleue, sa page et sa largeur
  const [page, setPage] = useState(0);
  // 27 octobre 2026 soir (Houari : « le carrousel penche vers la droite ») : la largeur de depart est celle des
  // autres cartes de l'accueil (ecran moins 2 x 16), puis la vraie largeur mesuree, sans arrondi : chaque page fait
  // exactement la largeur du carrousel, la page 2 et la page 3 tombent pile au centre
  const [largeurCarte, setLargeurCarte] = useState(largeur - 32);
  // 27 octobre 2026 soir : la hauteur mesuree de la page 1, pour caler la courbe de la page 2 dessus
  const [hautPage1, setHautPage1] = useState(0);
  const [chromeCourbe, setChromeCourbe] = useState(CHROME_PAGE_COURBE);
  // 3 novembre 2026 : la largeur de ton poids (chiffre et kg), pour laisser a la pastille de pesee toute la place a cote
  const [largeurPoids, setLargeurPoids] = useState(120);
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
    // 28 octobre 2026 : sans pesee, la meme carte pastel que d'habitude (voile lilas, liseré), compacte : ton poids
    // arrive, l'apercu du chemin en pointilles, et le bouton principal pour ta premiere pesee
    // (version d'avant : _archive_ancien_design_2026-10-09/poids_sans_objectif_2026-10-28/CartePoids.tsx)
    return (
      <View nativeID="carte-poids" testID="carte-poids" style={[{ borderRadius: CARTE_POIDS_RAYON, backgroundColor: P.white }, ombreCarte]}>
        <View style={{ borderRadius: CARTE_POIDS_RAYON, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: TETE.anneau, height: TETE.anneau, borderRadius: TETE.anneau / 2, backgroundColor: P.indigoSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="scale" size={20} color={P.indigo} width={2.2} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Ink size={10.5} weight="black" color={P.indigo} numberOfLines={1} style={{ letterSpacing: 1.2, lineHeight: 13 }}>
                  {traduire('Ton poids').toUpperCase()}
                </Ink>
                <Ink size={16} weight="black" tight color={P.ink} style={{ lineHeight: 20 }}>
                  {traduire("Ta courbe démarre à ta première pesée")}
                </Ink>
              </View>
            </View>
            <CheminPierresApercu />
            <BoutonPrincipal label={traduire("Me peser")} onPress={() => router.push('/pesee' as any)} hauteur={44} rayon={14} tailleTexte={15} lignes={1} compact haptique="light" accessibilityLabel={traduire("Ton poids. Touche plus pour ta première pesée")} />
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: CARTE_POIDS_RAYON, borderWidth: 1, borderColor: P.line2 }} />
        </View>
      </View>
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
  // pas de hook ici (un retour anticipe le precede) : un calcul simple sur 14 jours au plus
  const moy7 = series.length >= 2 ? moyenne7Jours(series, today) : undefined;
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
          {/* 1er novembre 2026 (AT) : la moyenne de tes 7 derniers jours, bien visible (lib/v2/mesures/indices.ts) */}
          {moy7 && !follow ? (
            <Ink size={13} weight="bold" color={P.ink2} numberOfLines={1} style={{ marginTop: 6, textAlign: centre ? 'center' : 'left' }}>
              {traduire('Moyenne sur 7 jours : ')}
              <Ink size={13} weight="black" color={P.ink}>{`${formatKg(moy7.valeur)} kg`}</Ink>
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
  // une seule couleur d'accent sur toute la carte (proposition A du 2 novembre 2026)
  const chiffreC = P.indigo;
  const sombre = paletteSombre();
  const pageCourbe = curve.length > 1 || periode === PERIODE_PLAN;
  const nbPages = 1 + (pageCourbe ? 1 : 0);
  const pageVue = Math.min(page, nbPages - 1);
  const W = Math.max(1, largeurCarte);
  // la courbe prend la hauteur laissee par la page 1, entre 136 et 196 points : pas de grand vide sous la courbe
  const hCourbe = Math.round(Math.max(COURBE_MIN, Math.min(COURBE_MAX, hautPage1 - chromeCourbe)));

  // 2 novembre 2026, proposition A « ligne de paliers » (choisie par Houari, maquette
  // _propositions/carte_poids_accueil_2026-11-02/v2/proposition_A_paliers.png) : « TON POIDS », ton poids en grand et
  // en noir, « −13,1 kg depuis ton début | il y a 3 jours » avec l'alerte balance en petit « i » gris, le sticker
  // balance a droite, puis une ligne fine avec un rond par palier, la phrase du prochain palier et la ligne grise du
  // rythme. Une seule couleur d'accent (P.indigo), plus de voile lilas, d'anneau ni de pierres de couleur.
  // Version d'avant : _archive_ancien_design_2026-10-09/carte_poids_paliers_A_2026-11-02/components/yoroi/v2/accueil/CartePoids.tsx.
  const accent = P.indigo;
  // « depuis ton début » sur la page 1, quelle que soit la periode choisie sur la courbe (la source unique)
  const variation = etat.variation;
  const versDebut = variation != null && goal !== null && mode !== 'maintien' && ((lossGoal && variation < 0) || (!lossGoal && variation > 0));
  const ligneDebut =
    follow && scrub ? (
      ligneEcart(fg2, accent, accent, fg)
    ) : variation != null && Math.abs(variation) >= 0.05 ? (
      <Ink size={13} weight="bold" color={fg2} numberOfLines={1} style={{ flexShrink: 1 }}>
        <Ink size={13} weight="black" color={versDebut ? P.mossText : fg} style={{ fontVariant: ['tabular-nums'] }}>
          {`${variation < 0 ? '−' : '+'}${formatKg(Math.abs(variation))} kg`}
        </Ink>
        {` ${PERIODE_TEXTE[PERIODE_PLAN]}`}
      </Ink>
    ) : variation != null ? (
      <Ink size={13} weight="bold" color={fg2} numberOfLines={1} style={{ flexShrink: 1 }}>
        {traduire("stable {0}", PERIODE_TEXTE[PERIODE_PLAN])}
      </Ink>
    ) : (
      ligneEcart(fg2, accent, accent, fg)
    );
  // « Tu descends plus vite que prévu » devient « Plus vite que prévu » (le sens est deja dans « depuis ton début »)
  const passe = !!(follow && scrub);
  const texteStatut = phrase ? (passe ? `${phrase.avant}${traduire(phrase.cle)}${phrase.apres}` : `${traduire(phrase.cle.charAt(0).toUpperCase() + phrase.cle.slice(1))}${phrase.apres}`) : null;
  // l'alerte balance (derniere pesee loin de ta tendance) : un petit « i » gris au bout de la ligne, l'explication
  // complete au toucher (appAlert) et pour VoiceOver
  const pastilleAlerte = eauTxt ? (
    <Press onPress={() => appAlert(traduire('Ta tendance'), eauTxt)} haptic="light" accessibilityRole="button" accessibilityLabel={eauTxt} accessibilityHint={traduire("Voir le détail")} hitSlop={12}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9.5} stroke={P.muted} strokeWidth={2.2} />
        <Path d="M12 11v5.5" stroke={P.muted} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={12} cy={7.6} r={1.4} fill={P.muted} />
      </Svg>
    </Press>
  ) : null;
  // « Objectif 80 kg » (pas « 80,0 ») quand ton objectif est un nombre rond ; elle ouvre la feuille de ton objectif
  const kgCible = goal !== null ? (Math.abs(goal - Math.round(goal)) < 0.05 ? String(Math.round(goal)) : formatKg(goal)) : null;
  const pastilleObjectif = objectifTxt && kgCible ? (
    <TourAnchor id="accueil.objectif">
      <Press onPress={() => setFeuille({ quoi: null })} haptic="light" hitSlop={8} accessibilityRole="button" accessibilityLabel={traduire("Ton objectif : {0}{1}. Changer ton début, ton objectif ou ta date du cap", objectifTxt, plan.torii ? `, date du cap le ${jourCourt(plan.torii)}` : '')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: HAUT_OBJECTIF, paddingHorizontal: 9, borderRadius: HAUT_OBJECTIF / 2, borderWidth: 1, borderColor: P.line }}>
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
            <Path d="M4 20l4 -1l11 -11l-3 -3l-11 11z" stroke={P.muted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Ink size={11.5} weight="extraBold" color={fg2} numberOfLines={1}>
            {traduire('Objectif {0} kg', kgCible)}
          </Ink>
        </View>
      </Press>
    </TourAnchor>
  ) : null;
  // l'etat de chaque palier (atteint, prochain, a venir), tire de paliersDuChemin sans rien recalculer
  const ligne = chemin && goal !== null ? etatsLignePaliers(start, goal, last.value, chemin.part, atteint) : null;
  const legendePaliers = !ligne ? null : atteint ? (
    <Ink size={12.5} weight="extraBold" color={fg} numberOfLines={2}>
      {traduire('Torii atteint')}
      <Ink size={12.5} weight="bold" color={P.muted}>
        {traduire(', les {0} paliers franchis', ligne.paliers.length)}
      </Ink>
    </Ink>
  ) : ligne.prochain ? (
    (() => {
      const pr = ligne.prochain;
      // 3 novembre 2026 (Houari) : ce qu'il te reste a perdre ou a prendre, en rouge (P.red, jamais pale)
      const resteTxt = `${formatKg(pr.dernier ? chemin!.reste : pr.encore)} kg`;
      const finBrute = traduire('encore {0} kg', formatKg(pr.dernier ? chemin!.reste : pr.encore));
      const j = finBrute.indexOf(resteTxt);
      const fin =
        j < 0 ? (
          finBrute
        ) : (
          <>
            {finBrute.slice(0, j)}
            <Ink size={12.5} weight="black" color={P.red} style={{ fontVariant: ['tabular-nums'] }}>
              {resteTxt}
            </Ink>
            {finBrute.slice(j + resteTxt.length)}
          </>
        );
      if (pr.dernier) {
        return (
          <Ink size={12.5} weight="extraBold" color={fg} numberOfLines={2}>
            {traduire('Dernier palier : ton objectif, ')}
            {fin}
          </Ink>
        );
      }
      const kgTxt = `${formatKg(pr.kg)} kg`;
      const debut = traduire('Prochain palier : {0} kg, ', formatKg(pr.kg));
      const i = debut.indexOf(kgTxt);
      return (
        <Ink size={12.5} weight="extraBold" color={fg} numberOfLines={2}>
          {i < 0 ? debut : debut.slice(0, i)}
          {i < 0 ? null : <Ink size={12.5} weight="extraBold" color={accent}>{kgTxt}</Ink>}
          {i < 0 ? null : debut.slice(i + kgTxt.length)}
          {fin}
        </Ink>
      );
    })()
  ) : null;
  const ligneRythme = texteStatut ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 }}>
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Path d="M4 16a8 8 0 0 1 16 0" stroke={P.muted} strokeWidth={2.3} strokeLinecap="round" />
        <Path d="M12 16l4.2-4.6" stroke={P.muted} strokeWidth={2.3} strokeLinecap="round" />
        <Circle cx={12} cy={16} r={1.6} fill={P.muted} />
      </Svg>
      <Ink size={12.5} weight="bold" color={fg2} numberOfLines={2} style={{ flexShrink: 1, lineHeight: 16 }}>
        {texteStatut}
      </Ink>
    </View>
  ) : null;
  // 3 novembre 2026 (Houari : « ta prochaine pesée » dans la carte, sans l'agrandir) : une petite pastille posee dans la
  // place libre entre ton poids et le sticker balance (PESEE_CARTE_POIDS, les memes mesures que la geometrie du decor
  // pose par dessus la carte, verifiees par le test). Memes gestes que l'ancienne carte : tes jours de pesee (Notifications) ; et le jour
  // de ta pesee, pas encore faite, la pesee elle-meme.
  const placePesee = W - PESEE_CARTE_POIDS.droite - (18 + largeurPoids + PESEE_CARTE_POIDS.ecartPoids);
  const quandPesee = pesee ? `${pesee.quand}${pesee.heure ? `, ${pesee.heure}` : ''}` : null;
  const peseeDuJour = !!pesee && pesee.dans === 0;
  const pastillePesee =
    pesee !== undefined && !exemple && placePesee >= PESEE_CARTE_POIDS.largeurMin ? (
      <View pointerEvents="box-none" style={{ position: 'absolute', right: PESEE_CARTE_POIDS.droite, top: avecDecor ? PESEE_CARTE_POIDS.haut : PESEE_CARTE_POIDS.hautSansDecor, maxWidth: placePesee }}>
        <Press
          onPress={() => router.push((peseeDuJour ? '/pesee' : '/notifications') as any)}
          haptic="light"
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={quandPesee ? (peseeDuJour ? traduire('Ta prochaine pesée : {0}. Touche pour te peser', quandPesee) : traduire('Ta prochaine pesée : {0}. Régler tes jours de pesée', quandPesee)) : traduire('Ta prochaine pesée : choisis tes jours de pesée')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: PESEE_CARTE_POIDS.hauteur, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1, borderColor: peseeDuJour ? accent : P.line, backgroundColor: P.white }}>
            {placePesee >= PESEE_CARTE_POIDS.icone ? <Icon name="calendar" size={13} color={accent} width={2.4} /> : null}
            <View style={{ flexShrink: 1, minWidth: 0 }}>
              <Ink size={9} weight="bold" color={P.muted} numberOfLines={1} style={{ lineHeight: 10 }}>
                {traduire('Prochaine pesée')}
              </Ink>
              <Ink size={pesee?.heure ? 11.5 : 12} weight="black" color={fg} numberOfLines={1} style={{ lineHeight: pesee?.heure ? 12 : 16 }}>
                {pesee ? pesee.quand : traduire('À choisir')}
              </Ink>
              {pesee?.heure ? (
                <Ink size={9.5} weight="bold" color={fg2} numberOfLines={1} style={{ lineHeight: 10, fontVariant: ['tabular-nums'] }}>
                  {pesee.heure}
                </Ink>
              ) : null}
            </View>
          </View>
        </Press>
      </View>
    ) : null;
  const pageUne = (
    <View
      style={{ width: W, alignSelf: 'flex-start', paddingHorizontal: 18, paddingTop: 16, paddingBottom: chemin ? 4 : 0, gap: 0 }}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - hautPage1) > 1) setHautPage1(h);
      }}
    >
      <Press onPress={openDetail} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("{0}. Voir le détail", [a11y, texteStatut, eauTxt].filter(Boolean).join(', '))}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Ink size={11} weight="black" color={accent} numberOfLines={1} style={{ letterSpacing: 1.4, lineHeight: 14 }}>
              {traduire('Ton poids').toUpperCase()}
            </Ink>
            <View
              style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4, alignSelf: 'flex-start' }}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - largeurPoids) > 1) setLargeurPoids(w);
              }}
            >
              <Ink size={40} weight="black" tight numberOfLines={1} color={fg} style={{ fontVariant: ['tabular-nums'], lineHeight: 44, letterSpacing: -1 }}>
                {formatKg(last.value)}
              </Ink>
              <Ink size={17} weight="extraBold" color={fg2}>
                {'kg'}
              </Ink>
            </View>
          </View>
          <Image source={illus.img('balance')} style={{ width: 60, height: 60, marginTop: -6, marginRight: -6 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, minHeight: 18 }}>
          {ligneDebut}
          {!follow ? (
            <>
              <Ink size={13} weight="bold" color={P.line}>
                {'|'}
              </Ink>
              <Ink size={13} weight="bold" color={P.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
                {isToday ? traduire('aujourd’hui') : relativeDay(last.date)}
              </Ink>
            </>
          ) : null}
          {!follow ? pastilleAlerte : null}
        </View>
      </Press>
      {pastillePesee}
      {chemin && ligne ? (
        <>
          {/* le lecteur d'ecran dit l'etat de chaque palier (franchi, en cours, a venir) */}
          <Press onPress={openDetail} haptic="none" accessibilityRole="button" accessibilityLabel={goal !== null ? traduire("{0}. Voir le détail", [texteEtatsChemin(start, goal, chemin.part, atteint), arrivee ? `${plan.choisie ? traduire('ta date du cap') : traduire('arrivée prévue')} ${arrivee}` : null].filter(Boolean).join(', ')) : traduire("Voir le détail de ton poids")}>
            <LigneDePaliers depart={start} ligne={ligne} accent={accent} sombre={sombre} />
            {legendePaliers ? <View style={{ marginTop: 4 }}>{legendePaliers}</View> : null}
          </Press>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: ligneRythme ? 'space-between' : 'flex-end', gap: 8, marginTop: 10, minHeight: HAUT_OBJECTIF }}>
            {ligneRythme}
            {pastilleObjectif}
          </View>
        </>
      ) : goal === null ? (
        // sans objectif : une invitation compacte, l'apercu du chemin en pointilles et le bouton qui ouvre le choix de
        // ton objectif (la courbe de la page 2 se cale sur cette hauteur : pas de vide)
        <View style={{ gap: 6, marginTop: 12 }}>
          <View style={{ gap: 0 }}>
            <Ink size={16} weight="black" tight color={fg} style={{ lineHeight: 20 }}>
              {traduire("Fixe ton cap")}</Ink>
            <Ink size={11.5} weight="bold" color={fg2} numberOfLines={2}>
              {traduire("Ton chemin vers le torii, en quatre paliers")}</Ink>
          </View>
          <Press onPress={() => setFeuille({ quoi: 'objectif' })} haptic="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <CheminPierresApercu />
          </Press>
          {/* 4 points sous le bouton : son ombre douce n'est pas coupee par le bas de la page */}
          <TourAnchor id="accueil.objectif">
            <BoutonPrincipal style={{ marginBottom: 4 }} label={traduire("Choisir mon objectif")} onPress={() => setFeuille({ quoi: 'objectif' })} hauteur={44} rayon={14} tailleTexte={15} lignes={1} compact haptique="light" accessibilityLabel={traduire("Fixer ton cap de poids")} />
          </TourAnchor>
        </View>
      ) : (
        // un objectif sans chemin (maintien) : la ligne du rythme, puis ton objectif avec sa pastille
        <View style={{ gap: 8, marginTop: 10, paddingBottom: 4 }}>
          {ligneRythme}
          {objectifTxt ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Ink size={12.5} weight="bold" color={fg2} style={{ flexShrink: 1 }}>
                {traduire("Ton objectif : {0}", objectifTxt)}
              </Ink>
              {pastilleObjectif}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  // Page 2 : ta courbe, sur son panneau, sans changement sur le fond ; le doigt ne la suit qu'apres un appui maintenu
  const pageDeLaCourbe = pageCourbe ? (
    <View
      style={{ width: W, paddingTop: 16, paddingBottom: 6, alignSelf: 'flex-start' }}
      onLayout={(e) => {
        // la partie fixe autour de la courbe, mesuree : la courbe prend exactement la hauteur laissee par la page 1
        const c = e.nativeEvent.layout.height - hCourbe;
        if (c > 40 && Math.abs(c - chromeCourbe) > 1) setChromeCourbe(c);
      }}
    >
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
