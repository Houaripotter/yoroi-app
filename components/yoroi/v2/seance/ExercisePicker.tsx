/**
 * Choix d'un exercice : recherche, recents en premier, filtre par groupe musculaire.
 * 16 octobre : noms francais affiches, recherche dans toutes les categories des la premiere lettre
 * (nom francais, nom anglais, mots de salle, muscle), voir lib/v2/seance/rechercheExo.ts.
 * 24 octobre 2026 : grand champ de recherche en tete, liste « Tous » rangee par muscle avec un titre par muscle,
 * « Ajouter « xxx » comme exercice » quand rien ne correspond. Les recherches sans resultat sont gardees en local
 * (lib/v2/seance/recherchesIntrouvables.ts) pour ajouter les exercices manquants a la prochaine mise a jour.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { MUSCLE_ORDER, bestSet, normName, setLabel, strengthLibrary } from '@/lib/v2/seance/history';
import { chercherExos, construireCatalogue, nomFr } from '@/lib/v2/seance/rechercheExo';
import type { ExerciseHistory } from '@/lib/v2/seance/history';
import { niceGroup, relativeDay } from '@/lib/v2/seance/format';
import { Icon } from './Icon';
import { MachineFinder, MachineFinderButton } from './MachineFinder';
import { OMBRE_CARTE, ton } from '@/components/yoroi/v2/seance/pastel';
import { fondAjouter, PlusPastille } from '@/components/yoroi/v2/accueil/kit';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { traduire } from '@/lib/i18n/tr';
import { noterRecherche } from '@/lib/v2/seance/recherchesIntrouvables';

type Item = { key: string; name: string; autre?: string; muscle: string; history?: ExerciseHistory; count?: number; rang?: number };
type Ligne = { kind: 'titre'; key: string; muscle: string; n: number } | { kind: 'exo'; key: string; item: Item };

/** temps de pause apres la derniere lettre avant de garder une recherche sans resultat */
const PAUSE_RECHERCHE_MS = 1200;

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string, muscle?: string) => void;
  history: Map<string, ExerciseHistory>;
  recent: string[];
  /** exercices deja dans la seance, signales d'une coche */
  already: string[];
  /** 26 octobre 2026 : changer un exercice de programme, le muscle de l'exercice remplace s'ouvre en premier */
  muscleDepart?: string;
  /** titre du haut, « Ajouter un exercice » par defaut */
  titre?: string;
};

export function ExercisePicker({ visible, onClose, onPick, history, recent, already, muscleDepart, titre }: Props) {
  const { theme } = useYoroiTheme();
  const unite = useUnitePoids();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(recent.length > 0 ? 'recents' : null);
  const [machines, setMachines] = useState(false);
  const [focus, setFocus] = useState(false);
  const dejaNote = useRef('');
  // 26 octobre 2026 : « Creer mon exercice » visible tout de suite, pas seulement apres une recherche vide
  const champ = useRef<TextInput>(null);
  const [creation, setCreation] = useState(false);

  const all = useMemo<Item[]>(() => construireCatalogue(strengthLibrary(), history, normName), [history]);

  // nom enregistre pour un exercice de la bibliotheque : celui de ton historique s'il existe, sinon le francais
  const nommer = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const i of all) {
      byKey.set(i.key, i.name);
      if (i.autre) byKey.set(normName(i.autre), i.name);
    }
    return (n: string) => byKey.get(normName(n)) ?? nomFr(n);
  }, [all]);

  const groups = useMemo(() => {
    const present = new Set(all.map((i) => i.muscle));
    const ordered = MUSCLE_ORDER.filter((g) => present.has(g));
    const rest = Array.from(present).filter((g) => !MUSCLE_ORDER.includes(g)).sort();
    return [...ordered, ...rest];
  }, [all]);

  // le muscle de depart s'il existe dans la bibliotheque, a chaque ouverture
  useEffect(() => {
    if (visible && muscleDepart && groups.includes(muscleDepart)) {
      setGroup(muscleDepart);
      setQuery('');
    }
  }, [visible, muscleDepart, groups]);

  const alreadySet = useMemo(() => new Set(already.map(normName)), [already]);

  const list = useMemo<Item[]>(() => {
    // en tapant, on cherche partout : le filtre de muscle ne cache plus rien
    if (query.trim()) return chercherExos(all, query);
    if (group === 'recents') {
      return recent.map((k) => all.find((i) => i.key === k)).filter((i): i is Item => !!i).slice(0, 40);
    }
    const base = group ? all.filter((i) => i.muscle === group) : all;
    return [...base].sort((a, b) => (b.history?.count ?? 0) - (a.history?.count ?? 0) || a.name.localeCompare(b.name, 'fr'));
  }, [all, query, group, recent]);

  // « Tous » sans recherche : un titre par muscle, dans l'ordre des muscles
  const lignes = useMemo<Ligne[]>(() => {
    const exos = (l: Item[]): Ligne[] => l.map((item) => ({ kind: 'exo', key: item.key, item }));
    if (query.trim() || group !== null) return exos(list);
    const parMuscle = new Map<string, Item[]>();
    for (const i of list) {
      const arr = parMuscle.get(i.muscle) ?? [];
      arr.push(i);
      parMuscle.set(i.muscle, arr);
    }
    const out: Ligne[] = [];
    for (const g of groups) {
      const arr = parMuscle.get(g);
      if (!arr?.length) continue;
      out.push({ kind: 'titre', key: `titre-${g}`, muscle: g, n: arr.length }, ...exos(arr));
    }
    return out;
  }, [list, query, group, groups]);

  // recherche sans resultat : seulement le terme final, apres une pause
  const nbResultats = list.length;
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || nbResultats > 0) return;
    const t = setTimeout(() => noter(q), PAUSE_RECHERCHE_MS);
    return () => clearTimeout(t);
  }, [query, nbResultats]);

  function noter(q: string) {
    const k = q.toLowerCase();
    if (dejaNote.current === k) return;
    dejaNote.current = k;
    void noterRecherche(q, 0);
  }

  const exact = query.trim() && all.some((i) => normName(i.name) === normName(query) || (!!i.autre && normName(i.autre) === normName(query)));

  const pick = (name: string, muscle?: string) => {
    onPick(name, muscle);
    setQuery('');
  };

  // exercice cree a la main : c'est aussi un exercice qui manque a la bibliotheque
  const ajouterPerso = () => {
    const q = query.trim();
    if (!q) return;
    noter(q);
    pick(q);
  };

  const chip = (id: string | null, label: string) => {
    // pendant une recherche, c'est « Tous » qui est allume : on cherche dans toutes les categories
    const on = query.trim() ? id === null : group === id;
    return (
      <Pressable key={id ?? 'tous'} onPress={() => { setGroup(id); setQuery(''); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.primary : c.surface }}>
        <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? c.onPrimary : c.textSecondary}>{label}</Ink>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 }}>
          <Ink size={26} weight="black" tight>{titre ?? traduire("Ajouter un exercice")}</Ink>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire("Fermer")} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 22, marginTop: 16, height: 60, borderRadius: 20, backgroundColor: c.surface, borderWidth: focus ? 2 : 0, borderColor: focus ? c.primary : c.border, ...OMBRE_CARTE, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, gap: 12 }}>
          <Icon name="search" size={22} color={focus ? c.onPrimary : c.textMuted} strokeWidth={2.4} />
          <TextInput
            ref={champ}
            value={query}
            onChangeText={setQuery}
            placeholder={creation ? traduire("Nom de ton exercice") : traduire("Développé, squat, tractions...")}
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="never"
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            accessibilityLabel={traduire("Chercher un exercice")}
            style={[fontStyle('bold'), { flex: 1, fontSize: 18, color: c.ink, paddingVertical: 0 }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={traduire("Effacer la recherche")} hitSlop={6} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={14} color={c.textSecondary} strokeWidth={2.8} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={{ height: 58 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6, paddingHorizontal: 22, alignItems: 'center' }}>
            {recent.length > 0 ? chip('recents', traduire('Récents')) : null}
            {chip(null, traduire('Tous'))}
            {groups.map((g) => chip(g, niceGroup(g)))}
          </ScrollView>
        </View>

        {/* 16 octobre : retrouver l'exercice par l'image de la machine, ou par une photo. Cache pendant la recherche. */}
        {query.trim() ? null : (
          <View style={{ marginHorizontal: 22, marginBottom: 8 }}>
            <MachineFinderButton onPress={() => setMachines(true)} />
          </View>
        )}

        <FlatList
          data={lignes}
          keyExtractor={(l) => l.key}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 30, gap: 8 }}
          ListEmptyComponent={
            query.trim() ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 14 }}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Ink size={16} weight="extraBold" style={{ textAlign: 'center' }}>{traduire("Aucun exercice pour « {0} »", query.trim())}</Ink>
                  <Ink size={13} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire("Essaie un autre mot, en français ou en anglais, ou crée l’exercice tel quel.")}</Ink>
                </View>
                <Pressable onPress={ajouterPerso} accessibilityRole="button" accessibilityLabel={traduire("Créer l’exercice {0}", query.trim())} style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: pressed ? c.primaryPressed : c.primary })}>
                  <Icon name="plus" size={20} color={c.onPrimary} strokeWidth={2.8} />
                  <Ink size={16} weight="extraBold" color={c.onPrimary} numberOfLines={1} style={{ flexShrink: 1 }}>{traduire("Ajouter « {0} » comme exercice", query.trim())}</Ink>
                </Pressable>
              </View>
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ink size={15} color={c.textSecondary}>{traduire("Aucun exercice ici pour l’instant.")}</Ink>
              </View>
            )
          }
          ListHeaderComponent={
            query.trim() ? null : (
              <Pressable onPress={() => { setCreation(true); champ.current?.focus(); }} accessibilityRole="button" accessibilityLabel={traduire('Créer mon exercice')} style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, paddingHorizontal: 16, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: fondAjouter(pressed) })}>
                <PlusPastille />
                <View style={{ flex: 1 }}>
                  <Ink size={15} weight="extraBold" color={c.accentText}>{traduire('Créer mon exercice')}</Ink>
                  <Ink size={12} color={c.textSecondary}>{creation ? traduire('Tape son nom en haut, puis touche Ajouter') : traduire('Il n’est pas dans la liste ? Ajoute le tien')}</Ink>
                </View>
              </Pressable>
            )
          }
          ListFooterComponent={
            query.trim() && !exact && list.length > 0 ? (
              <Pressable onPress={ajouterPerso} accessibilityRole="button" accessibilityLabel={traduire("Créer l’exercice {0}", query.trim())} style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, paddingHorizontal: 16, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: fondAjouter(pressed) })}>
                <PlusPastille />
                <Ink size={15} weight="extraBold" color={c.accentText} style={{ flex: 1 }} numberOfLines={1}>{traduire("Pas dans la liste ? Ajouter « {0} » comme exercice", query.trim())}</Ink>
              </Pressable>
            ) : null
          }
          renderItem={({ item: ligne }) => {
            if (ligne.kind === 'titre') {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 14, paddingBottom: 2, paddingHorizontal: 4 }} accessibilityRole="header">
                  <Ink size={13} weight="black" color={c.textSecondary}>{niceGroup(ligne.muscle)}</Ink>
                  <Ink size={12} color={c.textMuted}>{ligne.n}</Ink>
                </View>
              );
            }
            const item = ligne.item;
            const last = item.history ? bestSet(item.history.lastSets) : null;
            const inSession = alreadySet.has(item.key);
            return (
              <Pressable
                onPress={() => pick(item.name, item.muscle)}
                accessibilityRole="button"
                accessibilityLabel={traduire("Ajouter {0}", item.name)}
                style={({ pressed }) => ({ minHeight: 64, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.surface, ...OMBRE_CARTE })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={16} weight="extraBold" numberOfLines={1}>{traduire(item.name)}</Ink>
                  <Ink size={12} color={c.textMuted} numberOfLines={1}>
                    {niceGroup(item.muscle)}
                    {last && item.history ? `, ${setLabel(last, unite)} ${relativeDay(item.history.lastDate)}` : ''}
                  </Ink>
                </View>
                {inSession ? (
                  <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: ton('menthe').fond, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={16} color={ton('menthe').encre} strokeWidth={3} />
                  </View>
                ) : (
                  <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={16} color={c.onPrimary} strokeWidth={3} />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
        <MachineFinder visible={machines} onClose={() => setMachines(false)} onPick={(name, muscle) => pick(name, muscle)} nommer={nommer} />
      </View>
    </Modal>
  );
}
