/**
 * Les morceaux visuels du départ avec ton coach (app/coach-depart.tsx) et du questionnaire
 * (Questionnaire.tsx), d'après les maquettes Choix, Coach et MixD (26 octobre 2026).
 * Houari : « Je veux un beau design, intuitif. » Fond bleu doux, cartes blanches arrondies, carré d'icône coloré,
 * le choix fait devient indigo plein avec une coche. Rien ne change dans le calcul : ce ne sont que des habits.
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
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { Cercles, PuceClaire, teinteExo, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { libelleNiveau } from '@/lib/v2/programmes/catalogue';
import { joursConseilles } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

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

/** Le carré d'icône coloré, blanc translucide sur l'indigo quand la carte est choisie */
function CarreIcone({ icone, teinte, on, taille = 48, contenu }: { icone?: IconName; teinte: Teinte; on: boolean; taille?: number; contenu?: React.ReactNode }) {
  return (
    <View style={{ width: taille, height: taille, borderRadius: Math.round(taille / 3), backgroundColor: on ? 'rgba(255,255,255,0.18)' : teinte.fond, alignItems: 'center', justifyContent: 'center' }}>
      {contenu ?? (icone ? <Icon name={icone} size={Math.round(taille / 2)} color={on ? '#FFFFFF' : teinte.encre} /> : null)}
    </View>
  );
}

function Coche() {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={16} color="#FFFFFF" strokeWidth={3} />
    </View>
  );
}

/** Grande carte de réponse : blanche, carré d'icône coloré, une ligne. Choisie : indigo plein, texte blanc, coche */
export function CarteChoix({ label, sous, on, onPress, icone, teinte = 0, grand, fleche, visuel, role = 'button' }: {
  label: string;
  sous?: string;
  on: boolean;
  onPress: () => void;
  icone?: IconName;
  /** 0 indigo, 1 orange, 2 vert */
  teinte?: number;
  grand?: boolean;
  fleche?: boolean;
  /** remplace l'icône dans le carré (barres de niveau) */
  visuel?: (on: boolean, t: Teinte) => React.ReactNode;
  role?: 'button' | 'radio' | 'checkbox';
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const t = teinteExo(pal, teinte);
  const etat = role === 'checkbox' ? { checked: on } : { selected: on };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={etat}
      accessibilityLabel={sous ? `${label}, ${sous}` : label}
      style={({ pressed }) => ({
        minHeight: grand ? 88 : 76,
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: on ? pal.indigo : pal.carte,
        borderWidth: 2,
        borderColor: on ? pal.accent : 'transparent',
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {icone || visuel ? <CarreIcone icone={icone} teinte={t} on={on} taille={grand ? 56 : 50} contenu={visuel ? visuel(on, t) : undefined} /> : null}
      <View style={{ flex: 1, gap: 3 }}>
        <Ink size={grand ? 18 : 16} weight="black" tight color={on ? c.onDark : pal.texte} numberOfLines={2}>{label}</Ink>
        {sous ? <Ink size={13} weight="bold" color={on ? c.onDarkSecondary : pal.texte2} numberOfLines={1}>{sous}</Ink> : null}
      </View>
      {on ? <Coche /> : fleche ? <Icon name="chevron" size={18} color={pal.texte3} /> : null}
    </Pressable>
  );
}

/** Tuile de réponse, deux par ligne : carré d'icône en haut, le libellé dessous */
export function TuileChoix({ label, icone, teinte = 0, on, onPress }: { label: string; icone: IconName; teinte?: number; on: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const t = teinteExo(pal, teinte);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: '47%',
        flexGrow: 1,
        minHeight: 104,
        borderRadius: 22,
        padding: 14,
        gap: 10,
        justifyContent: 'space-between',
        backgroundColor: on ? pal.indigo : pal.carte,
        borderWidth: 2,
        borderColor: on ? pal.accent : 'transparent',
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <CarreIcone icone={icone} teinte={t} on={on} taille={42} />
        {on ? <Coche /> : null}
      </View>
      <Ink size={15} weight="black" tight color={on ? c.onDark : pal.texte} numberOfLines={2}>{label}</Ink>
    </Pressable>
  );
}

/** Les types de programme : les 4 principaux en tuiles illustrées, les autres en puces blanches */
export function TypesProgrammes({ groupes, groupe, onChoisir }: { groupes: readonly { id: string; label: string }[]; groupe: string; onChoisir: (id: string) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const grands = groupes.filter((g) => TYPES_PRINCIPAUX[g.id]);
  const petits = groupes.filter((g) => !TYPES_PRINCIPAUX[g.id]);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {grands.map((g) => {
          const on = g.id === groupe;
          const info = TYPES_PRINCIPAUX[g.id];
          const t = teinteExo(pal, info.teinte);
          return (
            <Pressable
              key={g.id}
              onPress={() => onChoisir(g.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={traduire(g.label)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 92,
                borderRadius: 20,
                paddingVertical: 12,
                paddingHorizontal: 4,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                backgroundColor: on ? pal.indigo : pal.carte,
                borderWidth: 2,
                borderColor: on ? pal.accent : 'transparent',
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <CarreIcone icone={info.icone} teinte={t} on={on} taille={42} />
              <Ink size={12} weight="black" tight color={on ? c.onDark : pal.texte} numberOfLines={2} style={{ textAlign: 'center' }} adjustsFontSizeToFit minimumFontScale={0.8}>
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
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pal.indigo : pressed ? pal.teinte : pal.carte })}
            >
              <Ink size={14} weight="extraBold" color={on ? c.onDark : pal.texte}>{traduire(g.label)}</Ink>
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

/** Le premier programme de la liste : carte indigo, personnage, points de la semaine */
export function HerosProgramme({ p, image, badge, onPress }: { p: Programme; image: ImageSourcePropType | null; badge?: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const titre = traduire(p.titre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[badge, titre, traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin), traduire(libelleNiveau(p.niveau))].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ borderRadius: 26, backgroundColor: pal.indigo, overflow: 'hidden', padding: 18, minHeight: 186, justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Cercles />
      {image ? <Image source={image} style={{ position: 'absolute', right: -4, bottom: 0, width: 124, height: 168 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ maxWidth: image ? '64%' : '100%', gap: 8 }}>
        {badge ? (
          <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Ink size={11} weight="extraBold" color={c.onDark}>{badge}</Ink>
          </View>
        ) : null}
        <Ink size={22} weight="black" tight color={c.onDark} numberOfLines={3}>{titre}</Ink>
        <Ink size={13} weight="bold" color={c.onDarkSecondary} numberOfLines={2} style={{ lineHeight: 18 }}>{traduire(p.accroche)}</Ink>
        <View style={{ marginTop: 2 }}>
          <PointsSemaine jours={joursConseilles(p.joursParSemaine)} plein="#FFFFFF" vide="rgba(255,255,255,0.2)" taille={20} />
        </View>
        <Ink size={12} weight="extraBold" color={c.onDarkSecondary}>{infoProgramme(p)}</Ink>
      </View>
    </Pressable>
  );
}

/** Un programme de la liste : grand carré « N jours » coloré, nom, points de la semaine, durée et niveau */
export function CarteProgramme({ p, k, onPress, badge }: { p: Programme; k: number; onPress: () => void; badge?: string }) {
  const pal = usePaletteProgramme();
  const t = teinteExo(pal, k);
  const titre = traduire(p.titre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[badge, titre, traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin), traduire(libelleNiveau(p.niveau))].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ minHeight: 90, borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: pressed ? pal.teinte : pal.carte })}
    >
      <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
        <Ink size={24} weight="black" tight color={t.encre}>{String(p.joursParSemaine)}</Ink>
        <Ink size={10} weight="extraBold" color={t.encre}>{traduire('jours')}</Ink>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        {badge ? <Ink size={11} weight="extraBold" color={pal.accent}>{badge}</Ink> : null}
        <Ink size={16} weight="black" tight color={pal.texte} numberOfLines={2}>{titre}</Ink>
        <PointsSemaine jours={joursConseilles(p.joursParSemaine)} plein={t.encre} vide={t.fond} />
        <Ink size={12} weight="extraBold" color={pal.texte2}>{infoProgramme(p)}</Ink>
      </View>
      <Icon name="chevron" size={18} color={pal.texte3} />
    </Pressable>
  );
}

const COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** Tes jours, du lundi au dimanche : sept grands ronds, indigo plein quand le jour est pris */
export function RangeeJours({ jours, onBasculer }: { jours: readonly number[]; onBasculer: (d: number) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', gap: 5, justifyContent: 'space-between' }}>
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
            style={({ pressed }) => ({
              flex: 1,
              maxWidth: 52,
              height: 50,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? pal.indigo : pal.carte,
              borderWidth: 2,
              borderColor: on ? pal.accent : pal.anneau,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Ink size={13} weight="black" color={on ? c.onDark : pal.texte} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.8}>{traduire(j)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** La durée d'une séance : quatre grandes tuiles, deux par ligne, le chiffre en grand */
export function TuilesTemps<T extends number>({ options, valeur, onChoisir }: { options: readonly { key: T; label: string }[]; valeur: T; onChoisir: (t: T) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {options.map((o, k) => {
        const on = o.key === valeur;
        const t = teinteExo(pal, k);
        const plus = o.key >= 75;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChoisir(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={plus ? traduire(o.label) : traduire('{0} min', o.key)}
            style={({ pressed }) => ({
              width: '47%',
              flexGrow: 1,
              minHeight: 128,
              borderRadius: 24,
              padding: 16,
              justifyContent: 'space-between',
              backgroundColor: on ? pal.indigo : pal.carte,
              borderWidth: 2,
              borderColor: on ? pal.accent : 'transparent',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <CarreIcone icone="clock" teinte={t} on={on} taille={40} />
              {on ? <Coche /> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <Ink size={40} weight="black" tight color={on ? c.onDark : pal.texte} style={{ lineHeight: 44 }}>{plus ? '60+' : String(o.key)}</Ink>
              <Ink size={15} weight="extraBold" color={on ? c.onDarkSecondary : pal.texte2} style={{ marginBottom: 6 }}>{traduire('min')}</Ink>
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

/** Les chips de la carte indigo du résultat : jours, minutes, niveau */
export function PucesProgramme({ p }: { p: Programme }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      <PuceClaire icone="calendar" texte={traduire('{0} jours', p.joursParSemaine)} />
      <PuceClaire icone="clock" texte={traduire('{0} min', p.dureeMin)} />
      <PuceClaire icone="gauge" texte={traduire(libelleNiveau(p.niveau))} />
    </View>
  );
}

/** Le grand bouton indigo du bas (« C'est parti », « Commencer ») */
export function BoutonIndigo({ label, onPress, icone }: { label: string; onPress: () => void; icone?: IconName }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 60, borderRadius: 999, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pal.indigo, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      {icone ? <Icon name={icone} size={18} color={c.onDark} /> : null}
      <Ink size={17} weight="black" color={c.onDark}>{label}</Ink>
    </Pressable>
  );
}

/** Le nombre de jours par semaine : grands ronds, le chiffre en grand */
export function RondsNombre<T extends number>({ options, valeur, onChoisir, libelle }: { options: readonly T[]; valeur?: T; onChoisir: (n: T) => void; libelle: (n: T) => { court: string; long: string } }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
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
            style={({ pressed }) => ({ flex: 1, maxWidth: 62, aspectRatio: 1, minHeight: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pal.indigo : pal.carte, borderWidth: 2, borderColor: on ? pal.accent : pal.anneau, transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <Ink size={22} weight="black" tight color={on ? c.onDark : pal.texte}>{l.court}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
