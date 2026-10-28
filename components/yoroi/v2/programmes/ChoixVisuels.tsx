/**
 * Les morceaux visuels du départ avec ton coach (app/coach-depart.tsx) et du questionnaire
 * (Questionnaire.tsx), d'après les maquettes Choix, Coach et MixD (26 octobre 2026).
 * Houari : « Je veux un beau design, intuitif. » Rien ne change dans le calcul : ce ne sont que des habits.
 * 27 octobre 2026, maquettes « aperçus vivants » (Coach-Objectif, Jours, Choix) : cartes pastel (usePastel, Habillage),
 * chaque choix montre un petit visuel (courbe, semaine en barres, anneau) ; le choix fait passe en bleu très pâle
 * avec un bord doux et une coche bleu nuit, plus jamais en indigo plein. Ancien rendu archivé dans
 * _archive_ancien_design_2026-10-09/coach_2026-10-27/.
 *  - CarteChoix : grande carte de réponse, une ligne, carré d'icône à gauche ;
 *  - TuileChoix : tuile carrée, deux par ligne (objectifs) ;
 *  - TypesProgrammes : les 4 types principaux en tuiles illustrées, les autres en puces ;
 *  - HerosProgramme et CarteProgramme : le premier programme en carte indigo, les autres en cartes blanches ;
 *  - PointsSemaine : sept points, les jours d'entraînement pleins ;
 *  - RangeeJours : sept grands ronds, du lundi au dimanche ;
 *  - TuilesTemps : quatre grandes tuiles, le chiffre en grand ;
 *  - BarresNiveau : trois barres, le niveau d'un coup d'œil.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import Svg, { Circle, Path } from 'react-native-svg';
import { Capitales, famillePastel, ombrePastel, teinteExo, usePaletteProgramme, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import type { FamillePastel, PastelCoach } from '@/components/yoroi/v2/programmes/Habillage';
import { libelleNiveau } from '@/lib/v2/programmes/catalogue';
import { joursConseilles } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

export type Teinte = { fond: string; encre: string };

/** La teinte n (0 indigo, 1 orange, 2 vert), en boucle */
export function useTeinte(k: number): Teinte {
  return teinteExo(usePaletteProgramme(), k);
}

/** Les icônes des objectifs (choix.ts, OBJECTIFS_CHOIX) */
export const ICONE_OBJECTIF: Record<string, IconName> = {
  debuter: 'book',
  perte: 'scale',
  ventre: 'target',
  seche: 'flame',
  masse: 'dumbbell',
  muscle: 'body',
  pecs: 'chart',
  fessiers: 'body',
  fessiers_ventre: 'target',
  force: 'bolt',
  course: 'steps',
  combat: 'glove',
  sac: 'glove',
  grip: 'belt',
  foot: 'trophy',
  raquette: 'medal',
  mobilite: 'wind',
};

/** 27 octobre 2026 : le sticker de chaque objectif (a la place du carré d'icône, reglage Illustrations) */
export const STICKER_OBJECTIF: Record<string, NomSticker> = {
  debuter: 'debuter',
  perte: 'perte',
  ventre: 'ventre',
  seche: 'seche',
  masse: 'masse',
  muscle: 'muscle',
  pecs: 'pecs',
  fessiers: 'fessiers',
  fessiers_ventre: 'fessiers',
  force: 'force',
  course: 'course',
  combat: 'combat',
  sac: 'sac',
  grip: 'grip',
  foot: 'sport_football',
  raquette: 'sport_raquette',
  mobilite: 'mobilite',
};

/** Les icônes des autres sports (depart.ts, AUTRES_SPORTS) */
export const ICONE_SPORT: Record<string, IconName> = {
  non: 'close',
  combat: 'glove',
  foot: 'trophy',
  course: 'steps',
  autre: 'medal',
};

const TYPES_PRINCIPAUX: Record<string, { icone: IconName; teinte: number }> = {
  ppl: { icone: 'dumbbell', teinte: 0 },
  'upper-lower': { icone: 'mountain', teinte: 0 },
  'push-pull': { icone: 'repeat', teinte: 1 },
  'full-body': { icone: 'body', teinte: 2 },
};

type NomFamille = 'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche';

/** Le petit motif de chaque type de programme : ses séances en barres colorées (PPL : trois, Upper Lower : deux en alternance) */
const MOTIF_TYPE: Record<string, NomFamille[]> = {
  ppl: ['bleu', 'peche', 'menthe'],
  'upper-lower': ['bleu', 'menthe', 'bleu', 'menthe'],
  'push-pull': ['peche', 'bleu', 'peche', 'bleu'],
  'full-body': ['lilas', 'lilas', 'lilas'],
};

/**
 * 27 octobre 2026 (maquette Coach-Objectif) : l'aperçu vivant de chaque objectif, une petite courbe dans un cadre
 * 140 x 40, et sa famille pastel. `aire` : la courbe est remplie dessous, en transparence.
 */
const COURBES: Record<string, { famille: NomFamille; d: string; aire?: boolean }> = {
  debuter: { famille: 'lilas', d: 'M6 30 L40 30 L74 30 L108 30 L134 30' },
  perte: { famille: 'menthe', d: 'M6 8 C30 10, 40 18, 66 20 S 110 30, 134 34', aire: true },
  ventre: { famille: 'creme', d: 'M6 14 C40 14, 60 26, 134 26', aire: true },
  seche: { famille: 'bleu', d: 'M6 30 L30 22 L54 26 L80 14 L106 18 L134 6' },
  masse: { famille: 'peche', d: 'M6 34 C30 32, 50 26, 74 22 S 116 10, 134 8', aire: true },
  muscle: { famille: 'bleu', d: 'M10 36 L10 26 M40 36 L40 20 M70 36 L70 14 M100 36 L100 10 M130 36 L130 4' },
  pecs: { famille: 'bleu', d: 'M6 28 L70 28 C92 28, 104 12, 134 6' },
  fessiers: { famille: 'lilas', d: 'M6 32 C34 32, 46 10, 70 10 S 106 32, 134 32', aire: true },
  fessiers_ventre: { famille: 'lilas', d: 'M6 30 C30 30, 40 12, 60 12 S 90 26, 134 26', aire: true },
  force: { famille: 'bleu', d: 'M6 34 L40 34 L40 24 L74 24 L74 14 L108 14 L108 4 L134 4' },
  course: { famille: 'menthe', d: 'M6 24 C20 8, 34 8, 48 24 S 76 40, 90 24 S 120 8, 134 24' },
  combat: { famille: 'peche', d: 'M6 32 L28 10 L50 32 L72 10 L94 32 L116 10 L134 28' },
  sac: { famille: 'creme', d: 'M12 36 L12 14 M34 36 L34 26 M56 36 L56 10 M78 36 L78 24 M100 36 L100 8 M122 36 L122 20' },
  grip: { famille: 'creme', d: 'M6 30 C30 30, 40 20, 60 20 L134 20' },
  foot: { famille: 'menthe', d: 'M6 32 C30 6, 60 6, 70 20 S 110 34, 134 8' },
  raquette: { famille: 'bleu', d: 'M6 20 L40 8 L74 32 L108 8 L134 20' },
  mobilite: { famille: 'lilas', d: 'M6 20 C26 0, 46 40, 70 20 S 114 0, 134 20' },
};
const COURBE_DEFAUT: { famille: NomFamille; d: string; aire?: boolean } = { famille: 'bleu', d: 'M6 30 L30 22 L54 26 L80 14 L106 18 L134 6' };

/** La famille pastel d'un objectif (sa courbe), sinon la k-ième */
function familleDe(pa: PastelCoach, cle: string | undefined, k: number): FamillePastel {
  const a = cle ? COURBES[cle] : undefined;
  return a ? pa[a.famille] : famillePastel(pa, k);
}

/** La petite courbe d'un objectif, en pleine largeur */
export function MiniCourbe({ cle, couleur, hauteur = 40 }: { cle?: string; couleur: string; hauteur?: number }) {
  const a = (cle ? COURBES[cle] : undefined) ?? COURBE_DEFAUT;
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ height: hauteur }}>
      <Svg width="100%" height={hauteur} viewBox="0 0 140 40" preserveAspectRatio="none">
        {a.aire ? <Path d={`${a.d} L134 40 L6 40 Z`} fill={couleur} opacity={0.22} /> : null}
        <Path d={a.d} fill="none" stroke={couleur} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** La petite courbe qui monte (la progression), avec son point au bout */
export function MiniProgres({ largeur = 110, hauteur = 52, couleur, aire, point }: { largeur?: number; hauteur?: number; couleur: string; aire: string; point: string }) {
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={largeur} height={hauteur} viewBox="0 0 110 52">
        <Path d="M4 46 C24 44, 34 34, 54 30 S 86 14, 104 8 L104 52 L4 52 Z" fill={aire} opacity={0.45} />
        <Path d="M4 46 C24 44, 34 34, 54 30 S 86 14, 104 8" fill="none" stroke={couleur} strokeWidth={2.6} strokeLinecap="round" />
        <Circle cx={104} cy={8} r={4} fill={point} stroke={couleur} strokeWidth={2.4} />
      </Svg>
    </View>
  );
}

/** Un anneau qui se remplit (part de 0 à 1), une aiguille d'horloge au centre si `horloge` */
export function MiniAnneau({ part, couleur, fond, taille = 36, horloge, aiguille }: { part: number; couleur: string; fond: string; taille?: number; horloge?: boolean; aiguille?: string }) {
  const r = 14;
  const tour = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, part));
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={taille} height={taille} viewBox="0 0 36 36">
        <Circle cx={18} cy={18} r={r} fill={fond} />
        <Circle cx={18} cy={18} r={r} fill="none" stroke={couleur} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${tour * p} ${tour}`} rotation={-90} origin="18, 18" />
        {horloge ? <Path d="M18 11v7l4 3" fill="none" stroke={aiguille ?? couleur} strokeWidth={2.4} strokeLinecap="round" /> : null}
      </Svg>
    </View>
  );
}

/**
 * La semaine en sept barres (maquettes Coach-Jours et Coach-Choix) : hautes les jours d'entraînement, basses les jours
 * de repos. `couleur2` : une séance sur deux dans cette couleur (Upper puis Lower).
 */
export function MiniSemaine({ jours, couleur, couleur2, vide, hauteur = 34, gap = 3 }: { jours: readonly number[]; couleur: string; couleur2?: string; vide: string; hauteur?: number; gap?: number }) {
  let n = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap, height: hauteur }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {[0, 1, 2, 3, 4, 5, 6].map((d) => {
        const on = jours.includes(d);
        const second = on && couleur2 ? n++ % 2 === 1 : false;
        return <View key={d} style={{ flex: 1, height: on ? (second ? '80%' : '100%') : '18%', borderRadius: Math.min(6, Math.round(hauteur / 6)), backgroundColor: on ? (second ? couleur2 : couleur) : vide }} />;
      })}
    </View>
  );
}

/** Le carré d'icône pastel (petit, sans grosse icône) */
function CarreIcone({ icone, teinte, taille = 44, contenu }: { icone?: IconName; teinte: Teinte; taille?: number; contenu?: React.ReactNode }) {
  return (
    <View style={{ width: taille, height: taille, borderRadius: Math.round(taille / 3), backgroundColor: teinte.fond, alignItems: 'center', justifyContent: 'center' }}>
      {contenu ?? (icone ? <Icon name={icone} size={Math.round(taille * 0.45)} color={teinte.encre} /> : null)}
    </View>
  );
}

/** La pastille de coche bleu nuit d'une réponse choisie */
function Coche({ taille = 22 }: { taille?: number }) {
  const pa = usePastel();
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: pa.coche, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={Math.round(taille * 0.55)} color={pa.surCoche} strokeWidth={3.2} />
    </View>
  );
}

/** La puce « Conseillé », jaune pâle */
export function PuceConseil({ texte }: { texte: string }) {
  const pa = usePastel();
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: pa.badge }}>
      <Ink size={11} weight="extraBold" color={pa.surBadge} numberOfLines={1}>{texte}</Ink>
    </View>
  );
}

/**
 * Grande carte de réponse : blanche, petit carré pastel (ou sticker) à gauche, une ligne.
 * Choisie (maquettes du 27 octobre) : fond bleu très pâle, bord bleu doux, coche bleu nuit ; le texte reste foncé.
 */
export function CarteChoix({ label, sous, on, onPress, icone, sticker, teinte = 0, grand, fleche, visuel, role = 'button' }: {
  label: string;
  /** le sticker a la place du carré d'icône */
  sticker?: NomSticker;
  sous?: string;
  on: boolean;
  onPress: () => void;
  icone?: IconName;
  /** 0 bleu, 1 crème, 2 menthe, 3 lilas */
  teinte?: number;
  grand?: boolean;
  fleche?: boolean;
  /** remplace l'icône dans le carré (barres de niveau) */
  visuel?: (on: boolean, t: Teinte) => React.ReactNode;
  role?: 'button' | 'radio' | 'checkbox';
}) {
  const pa = usePastel();
  const f = famillePastel(pa, teinte);
  const t: Teinte = { fond: f.fond, encre: f.titre };
  const etat = role === 'checkbox' ? { checked: on } : { selected: on };
  const illus = useIllustrations();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={etat}
      accessibilityLabel={sous ? `${label}, ${sous}` : label}
      style={({ pressed }) => [
        {
          minHeight: grand ? 84 : 72,
          borderRadius: 22,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: on ? pa.choisi : pa.carte,
          borderWidth: 1.5,
          borderColor: on ? pa.bordChoisi : 'transparent',
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        on ? null : ombrePastel(pa.ombre),
      ]}
    >
      {sticker && illus.stickers ? (
        <Image source={illus.img(sticker)} style={{ width: grand ? 48 : 44, height: grand ? 48 : 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : icone || visuel ? <CarreIcone icone={icone} teinte={t} taille={grand ? 46 : 42} contenu={visuel ? visuel(on, t) : undefined} /> : null}
      <View style={{ flex: 1, gap: 3 }}>
        <Ink size={grand ? 17 : 16} weight="black" color={pa.texte} numberOfLines={2}>{label}</Ink>
        {sous ? <Ink size={13} weight="bold" color={pa.texte2} numberOfLines={2}>{sous}</Ink> : null}
      </View>
      {on ? <Coche taille={24} /> : fleche ? <Icon name="chevron" size={16} color={pa.texte3} /> : null}
    </Pressable>
  );
}

/**
 * Tuile d'objectif, deux par ligne (maquette Coach-Objectif) : carte pastel, l'aperçu vivant de l'objectif en haut
 * (sa petite courbe), le libellé dessous avec son sticker. `cle` : la clé de l'objectif (choix.ts), pour sa courbe.
 */
export function TuileChoix({ label, sticker, cle, teinte = 0, on, onPress }: { label: string; icone: IconName; sticker?: NomSticker; cle?: string; teinte?: number; on: boolean; onPress: () => void }) {
  const illus = useIllustrations();
  const pa = usePastel();
  const f = familleDe(pa, cle, teinte);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: '47%',
        flexGrow: 1,
        minHeight: 112,
        borderRadius: 22,
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: 10,
        gap: 8,
        justifyContent: 'space-between',
        backgroundColor: on ? pa.choisi : f.fond,
        borderWidth: 1.5,
        borderColor: on ? pa.bordChoisi : 'transparent',
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ paddingRight: on ? 26 : 0 }}>
        <MiniCourbe cle={cle} couleur={f.titre} hauteur={36} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Ink size={14} weight="black" tight color={pa.texte} numberOfLines={2} style={{ flex: 1 }}>{label}</Ink>
        {sticker && illus.stickers ? <Image source={illus.img(sticker)} style={{ width: 40, height: 40, marginBottom: -2, marginRight: -2 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      </View>
      {on ? <View style={{ position: 'absolute', top: 10, right: 10 }}><Coche taille={20} /></View> : null}
    </Pressable>
  );
}

/** Les types de programme : les 4 principaux en tuiles pastel avec leur motif de séances, les autres en puces blanches */
export function TypesProgrammes({ groupes, groupe, onChoisir }: { groupes: readonly { id: string; label: string }[]; groupe: string; onChoisir: (id: string) => void }) {
  const pa = usePastel();
  const grands = groupes.filter((g) => TYPES_PRINCIPAUX[g.id]);
  const petits = groupes.filter((g) => !TYPES_PRINCIPAUX[g.id]);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {grands.map((g, k) => {
          const on = g.id === groupe;
          const f = famillePastel(pa, k);
          const motif = MOTIF_TYPE[g.id] ?? ['bleu'];
          return (
            <Pressable
              key={g.id}
              onPress={() => onChoisir(g.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={traduire(g.label)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 84,
                borderRadius: 20,
                paddingVertical: 12,
                paddingHorizontal: 6,
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                backgroundColor: on ? pa.choisi : f.fond,
                borderWidth: 1.5,
                borderColor: on ? pa.bordChoisi : 'transparent',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                {motif.map((m, i) => (
                  <View key={i} style={{ width: 8, height: i % 2 ? 16 : 22, borderRadius: 3, backgroundColor: pa[m].barre }} />
                ))}
              </View>
              <Ink size={12} weight="black" tight color={pa.texte} numberOfLines={2} style={{ textAlign: 'center' }} adjustsFontSizeToFit minimumFontScale={0.8}>
                {traduire(g.label)}
              </Ink>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {petits.map((g) => {
          const on = g.id === groupe;
          return (
            <Pressable
              key={g.id}
              onPress={() => onChoisir(g.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.choisi : pressed ? pa.bleu.fond : pa.carte, borderWidth: 1.5, borderColor: on ? pa.bordChoisi : pa.ligne })}
            >
              <Ink size={14} weight="extraBold" color={on ? pa.bleu.encre : pa.texte}>{traduire(g.label)}</Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Sept points du lundi au dimanche : pleins les jours d'entraînement */
export function PointsSemaine({ jours, plein, vide, taille = 14 }: { jours: readonly number[]; plein: string; vide: string; taille?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: Math.max(4, Math.round(taille / 4)) }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
        <View key={d} style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: jours.includes(d) ? plein : vide }} />
      ))}
    </View>
  );
}

/** « 65 min · Intermédiaire » */
function infoProgramme(p: Programme): string {
  return `${traduire('{0} min', p.dureeMin)} · ${traduire(libelleNiveau(p.niveau))}`;
}

/**
 * Le premier programme de la liste (maquette Coach-Choix) : carte bleu pastel, « Conseillé » ou « Pour toi »,
 * la semaine en barres et la courbe qui monte, « Voir le programme » en bouton blanc. Toute la carte s'ouvre.
 */
export function HerosProgramme({ p, badge, onPress }: { p: Programme; image: ImageSourcePropType | null; badge?: string; onPress: () => void }) {
  const pa = usePastel();
  const titre = traduire(p.titre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[badge, titre, traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin), traduire(libelleNiveau(p.niveau))].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ borderRadius: 26, backgroundColor: pa.bleu.fond, padding: 16, gap: 10, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {badge ? <PuceConseil texte={badge} /> : <Capitales texte={traduire('Pour toi')} couleur={pa.bleu.titre} />}
        <Ink size={12} weight="extraBold" color={pa.bleu.encre} numberOfLines={1} style={{ flexShrink: 1 }}>{infoProgramme(p)}</Ink>
      </View>
      <Ink size={21} weight="black" tight color={pa.texte} numberOfLines={3}>{titre}</Ink>
      <Ink size={13} weight="bold" color={pa.texte2} numberOfLines={3} style={{ lineHeight: 19 }}>{traduire(p.accroche)}</Ink>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 2 }}>
        <View style={{ flex: 1 }}>
          <MiniSemaine jours={joursConseilles(p.joursParSemaine)} couleur={pa.bleu.barre} couleur2={pa.menthe.barre} vide={pa.carte} hauteur={52} gap={4} />
        </View>
        <MiniProgres couleur={pa.bleu.titre} aire={pa.bleu.barre2} point={pa.carte} />
      </View>
      <View style={{ marginTop: 4, minHeight: 46, borderRadius: 23, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={15} weight="black" color={pa.surBouton}>{traduire('Voir le programme')}</Ink>
      </View>
    </Pressable>
  );
}

/** Un programme de la liste : carte blanche, sa semaine en petites barres colorées, nom, jours, durée et niveau */
export function CarteProgramme({ p, k, onPress, badge }: { p: Programme; k: number; onPress: () => void; badge?: string }) {
  const pa = usePastel();
  const l = [pa.peche, pa.menthe, pa.creme, pa.lilas, pa.bleu];
  const f = l[((k % l.length) + l.length) % l.length];
  const titre = traduire(p.titre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[badge, titre, traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin), traduire(libelleNiveau(p.niveau))].filter(Boolean).join(', ')}
      style={({ pressed }) => [{ minHeight: 76, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}
    >
      <View style={{ width: 70 }}>
        <MiniSemaine jours={joursConseilles(p.joursParSemaine)} couleur={f.barre} vide={pa.ligne} hauteur={34} gap={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {badge ? <Ink size={11} weight="extraBold" color={pa.bleu.titre}>{badge}</Ink> : null}
        <Ink size={15} weight="black" tight color={pa.texte} numberOfLines={2}>{titre}</Ink>
        <Ink size={12} weight="bold" color={pa.texte2} numberOfLines={1}>{`${traduire('{0} jours', p.joursParSemaine)} · ${infoProgramme(p)}`}</Ink>
      </View>
      <Icon name="chevron" size={16} color={pa.texte3} />
    </Pressable>
  );
}

const COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** Tes jours, du lundi au dimanche (maquette Coach-Jours) : sept pastilles, pastel bleu quand le jour est pris */
export function RangeeJours({ jours, onBasculer }: { jours: readonly number[]; onBasculer: (d: number) => void }) {
  const pa = usePastel();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {COURTS.map((j, d) => {
        const on = jours.includes(d);
        return (
          <Pressable
            key={j}
            onPress={() => onBasculer(d)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={traduire(LONGS[d])}
            hitSlop={4}
            style={({ pressed }) => [
              { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.bouton : pa.carte, transform: [{ scale: pressed ? 0.94 : 1 }] },
              on ? null : ombrePastel(pa.ombre),
            ]}
          >
            <Ink size={13} weight="black" color={on ? pa.surBouton : pa.texte2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center' }}>{traduire(j)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** La durée d'une séance : quatre tuiles, deux par ligne, l'anneau qui se remplit avec le temps, le chiffre en grand */
export function TuilesTemps<T extends number>({ options, valeur, onChoisir }: { options: readonly { key: T; label: string }[]; valeur: T; onChoisir: (t: T) => void }) {
  const pa = usePastel();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {options.map((o) => {
        const on = o.key === valeur;
        const plus = o.key >= 75;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChoisir(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={plus ? traduire(o.label) : traduire('{0} min', o.key)}
            style={({ pressed }) => [
              {
                width: '47%',
                flexGrow: 1,
                minHeight: 96,
                borderRadius: 22,
                padding: 14,
                justifyContent: 'space-between',
                backgroundColor: on ? pa.choisi : pa.carte,
                borderWidth: 1.5,
                borderColor: on ? pa.bordChoisi : pa.ligne,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <MiniAnneau part={Math.min(o.key, 90) / 90} couleur={pa.creme.barre} fond={pa.creme.fond} horloge aiguille={pa.creme.titre} />
              {on ? <Coche /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Ink size={30} weight="black" tight color={on ? pa.bleu.encre : pa.texte} style={{ lineHeight: 34 }}>{plus ? '60+' : String(o.key)}</Ink>
              <Ink size={14} weight="extraBold" color={pa.texte2} style={{ marginBottom: 4 }}>{traduire('min')}</Ink>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Trois barres de hauteur croissante, n pleines (1 à 3) */
export function BarresNiveau({ n, couleur, vide }: { n: number; couleur: string; vide: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 }}>
      {[1, 2, 3].map((k) => (
        <View key={k} style={{ width: 6, height: 8 + (k - 1) * 7, borderRadius: 3, backgroundColor: k <= n ? couleur : vide }} />
      ))}
    </View>
  );
}

/** Une puce blanche posée sur une carte pastel */
function PuceBlanche({ icone, texte }: { icone?: IconName; texte: string }) {
  const pa = usePastel();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 30, paddingHorizontal: 10, borderRadius: 10, backgroundColor: pa.carte }}>
      {icone ? <Icon name={icone} size={13} color={pa.bleu.encre} /> : null}
      <Ink size={12} weight="extraBold" color={pa.texte}>{texte}</Ink>
    </View>
  );
}

/** Les puces de la carte du résultat : jours, minutes, niveau */
export function PucesProgramme({ p }: { p: Programme }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <PuceBlanche icone="calendar" texte={traduire('{0} jours', p.joursParSemaine)} />
      <PuceBlanche icone="clock" texte={traduire('{0} min', p.dureeMin)} />
      <PuceBlanche icone="gauge" texte={traduire(libelleNiveau(p.niveau))} />
    </View>
  );
}

/** Le grand bouton du bas (« C’est parti », « Commencer ») */
export function BoutonIndigo({ label, onPress, icone }: { label: string; onPress: () => void; icone?: IconName }) {
  // 28 octobre 2026 : le grand bouton du bas prend le bouton principal partage (degrade bleu nuit, texte blanc)
  return <BoutonPrincipal label={label} onPress={onPress} haptique="none" tailleTexte={16} icone={icone ? (col) => <Icon name={icone} size={18} color={col} /> : undefined} />;
}

/** Le nombre de jours par semaine : grands ronds, le chiffre en grand */
export function RondsNombre<T extends number>({ options, valeur, onChoisir, libelle }: { options: readonly T[]; valeur?: T; onChoisir: (n: T) => void; libelle: (n: T) => { court: string; long: string } }) {
  const pa = usePastel();
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
      {options.map((n) => {
        const on = n === valeur;
        const l = libelle(n);
        return (
          <Pressable
            key={n}
            onPress={() => onChoisir(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={l.long}
            style={({ pressed }) => [{ flex: 1, maxWidth: 62, aspectRatio: 1, minHeight: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.bouton : pa.carte, transform: [{ scale: pressed ? 0.94 : 1 }] }, on ? null : ombrePastel(pa.ombre)]}
          >
            <Ink size={22} weight="black" tight color={on ? pa.surBouton : pa.texte}>{l.court}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Combien de jours par semaine (27 octobre 2026, avant la liste du départ) : tuiles pastel, deux par ligne,
 * le chiffre en grand, la semaine en sept barres (jours conseillés, suivi.ts) et le nombre de programmes.
 */
export function TuilesJours({ options, valeur, onChoisir, nombre }: { options: readonly number[]; valeur?: number; onChoisir: (n: number) => void; nombre: (n: number) => number }) {
  const pa = usePastel();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {options.map((n, k) => {
        const on = n === valeur;
        const f = famillePastel(pa, k);
        const combien = nombre(n);
        const texteCombien = combien > 1 ? traduire('{0} programmes', combien) : traduire('{0} programme', combien);
        return (
          <Pressable
            key={n}
            onPress={() => onChoisir(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${traduire('{0} jours', n)}, ${texteCombien}`}
            style={({ pressed }) => ({
              width: '47%',
              flexGrow: 1,
              minHeight: 128,
              borderRadius: 22,
              padding: 14,
              gap: 10,
              justifyContent: 'space-between',
              backgroundColor: on ? pa.choisi : f.fond,
              borderWidth: 1.5,
              borderColor: on ? pa.bordChoisi : 'transparent',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>
                <Ink size={34} weight="black" tight color={on ? pa.bleu.encre : pa.texte} style={{ lineHeight: 38 }}>{String(n)}</Ink>
                <Ink size={14} weight="extraBold" color={pa.texte2} style={{ marginBottom: 5 }}>{traduire('jours')}</Ink>
              </View>
              {on ? <Coche /> : null}
            </View>
            <MiniSemaine jours={joursConseilles(n)} couleur={f.barre} couleur2={f.barre2} vide={pa.carte} hauteur={30} />
            <Ink size={12} weight="extraBold" color={on ? pa.bleu.titre : f.titre}>{texteCombien}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
