/**
 * Choix d'un exercice : recherche, recents en premier, filtre par groupe musculaire.
 * 16 octobre : noms francais affiches, recherche dans toutes les categories des la premiere lettre
 * (nom francais, nom anglais, mots de salle, muscle), voir lib/v2/seance/rechercheExo.ts.
 */
import React, { useMemo, useState } from 'react';
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
import { P, blancA } from '@/components/yoroi/livePalette';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';

type Item = { key: string; name: string; autre?: string; muscle: string; history?: ExerciseHistory; count?: number; rang?: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string, muscle?: string) => void;
  history: Map<string, ExerciseHistory>;
  recent: string[];
  /** exercices deja dans la seance, signales d'une coche */
  already: string[];
};

export function ExercisePicker({ visible, onClose, onPick, history, recent, already }: Props) {
  const { theme } = useYoroiTheme();
  const unite = useUnitePoids();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(recent.length > 0 ? 'recents' : null);
  const [machines, setMachines] = useState(false);

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

  const exact = query.trim() && all.some((i) => normName(i.name) === normName(query) || (!!i.autre && normName(i.autre) === normName(query)));

  const pick = (name: string, muscle?: string) => {
    onPick(name, muscle);
    setQuery('');
  };

  const chip = (id: string | null, label: string) => {
    // pendant une recherche, c'est « Tous » qui est allume : on cherche dans toutes les categories
    const on = query.trim() ? id === null : group === id;
    return (
      <Pressable key={id ?? 'tous'} onPress={() => { setGroup(id); setQuery(''); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: c.border }}>
        <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? P.paper : c.textSecondary}>{label}</Ink>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 }}>
          <Ink size={26} weight="black" tight>Ajouter un exercice</Ink>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} strokeWidth={2.6} />
          </Pressable>
        </View>

        <View style={{ marginHorizontal: 22, marginTop: 14, height: 50, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 }}>
          <Icon name="search" size={20} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Développé, squat, tractions..."
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Chercher un exercice"
            style={[fontStyle('bold'), { flex: 1, fontSize: 16, color: c.ink, paddingVertical: 0 }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel="Effacer la recherche" hitSlop={10}>
              <Icon name="close" size={16} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* 16 octobre : retrouver l'exercice par l'image de la machine, ou par une photo */}
        <View style={{ marginHorizontal: 22, marginTop: 10 }}>
          <MachineFinderButton onPress={() => setMachines(true)} />
        </View>

        <View style={{ height: 54 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 22, alignItems: 'center' }}>
            {recent.length > 0 ? chip('recents', 'Récents') : null}
            {chip(null, 'Tous')}
            {groups.map((g) => chip(g, niceGroup(g)))}
          </ScrollView>
        </View>

        <FlatList
          data={list}
          keyExtractor={(i) => i.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 30, gap: 6 }}
          ListEmptyComponent={
            query.trim() ? (
              <View style={{ paddingVertical: 28, alignItems: 'center', gap: 14 }}>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Ink size={16} weight="extraBold" style={{ textAlign: 'center' }}>Aucun exercice pour « {query.trim()} »</Ink>
                  <Ink size={13} color={c.textSecondary} style={{ textAlign: 'center' }}>Essaie un autre mot, en français ou en anglais, ou crée-le tel quel.</Ink>
                </View>
                <Pressable onPress={() => pick(query.trim())} accessibilityRole="button" accessibilityLabel={`Créer l’exercice ${query.trim()}`} style={({ pressed }) => ({ alignSelf: 'stretch', minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: pressed ? c.accentPressed : c.accent })}>
                  <Icon name="plus" size={20} color={c.onAccent} strokeWidth={2.8} />
                  <Ink size={16} weight="extraBold" color={c.onAccent}>Créer cet exercice</Ink>
                </Pressable>
              </View>
            ) : (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ink size={15} color={c.textSecondary}>Aucun exercice ici pour l’instant.</Ink>
              </View>
            )
          }
          ListFooterComponent={
            query.trim() && !exact && list.length > 0 ? (
              <Pressable onPress={() => pick(query.trim())} accessibilityRole="button" accessibilityLabel={`Créer l’exercice ${query.trim()}`} style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, paddingHorizontal: 16, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border })}>
                <Icon name="plus" size={18} color={c.textSecondary} strokeWidth={2.6} />
                <Ink size={15} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={1}>Pas dans la liste ? Créer « {query.trim()} »</Ink>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => {
            const last = item.history ? bestSet(item.history.lastSets) : null;
            const inSession = alreadySet.has(item.key);
            return (
              <Pressable
                onPress={() => pick(item.name, item.muscle)}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${item.name}`}
                style={({ pressed }) => ({ minHeight: 64, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : blancA(0.75), borderWidth: 1, borderColor: c.divider })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={16} weight="extraBold" numberOfLines={1}>{item.name}</Ink>
                  <Ink size={12} color={c.textMuted} numberOfLines={1}>
                    {niceGroup(item.muscle)}
                    {last && item.history ? `, ${setLabel(last, unite)} ${relativeDay(item.history.lastDate)}` : ''}
                  </Ink>
                </View>
                {inSession ? (
                  <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={16} color={c.background} strokeWidth={3} />
                  </View>
                ) : (
                  <Icon name="plus" size={20} color={c.textSecondary} />
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
