/**
 * Choix d'un exercice a suivre (carnet, vague 16) : recherche en haut, disciplines illustrees en grille,
 * puis groupe musculaire pour la musculation, puis exercice de la bibliotheque.
 * Ou bien un suivi sur mesure (nom, categorie, unite).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { BENCHMARK_CATEGORIES, WATCH_EXERCISE_TEMPLATES } from '@/lib/carnetService';
import type { BenchmarkCategory, BenchmarkUnit } from '@/lib/carnetService';
import { normName } from '@/lib/v2/seance/history';
import { P, Press, CIcon, ChoiceLine, Field, BigButton, MiniChips, Label } from './ui';
import { categoryTone } from '@/lib/v2/carnet/journal';
import type { CarnetIllus } from './images';
import { Illus } from './nav';
import { niceName } from '@/lib/v2/carnet/records';
import { traduire } from '@/lib/i18n/tr';

type Step = 'sport' | 'muscle' | 'exercise' | 'custom';

const SPORTS: { name: string; label: string; hasMuscles: boolean; groups: string[]; illus: CarnetIllus; tint: string }[] = [
  { name: 'Musculation', label: 'Musculation', hasMuscles: true, groups: ['Pectoraux', 'Dos', 'Epaules', 'Bras', 'Jambes', 'Abdos', 'Machines'], illus: 'musculation', tint: '#E4E9F3' },
  { name: 'Running', label: traduire('Course à pied'), hasMuscles: false, groups: ['Running'], illus: 'course', tint: '#E3E6EE' },
  { name: 'Hyrox', label: 'Hyrox', hasMuscles: false, groups: ['Hyrox'], illus: 'force', tint: '#EFE7D6' },
  { name: 'CrossFit', label: 'CrossFit', hasMuscles: false, groups: ['CrossFit'], illus: 'force', tint: '#E4EADB' },
  { name: 'Cardio', label: traduire('Cardio sur machines'), hasMuscles: false, groups: ['Cardio'], illus: 'endurance', tint: '#E3EEEA' },
  { name: 'Combat', label: traduire('Combat et MMA'), hasMuscles: false, groups: ['Combat'], illus: 'combat', tint: '#EEE1DF' },
  { name: 'Strongman', label: 'Strongman', hasMuscles: false, groups: ['Strongman'], illus: 'force', tint: '#EFE7D6' },
  { name: 'Olympique', label: traduire('Haltérophilie'), hasMuscles: false, groups: ['Olympique'], illus: 'musculation', tint: '#E4E9F3' },
  { name: 'Street Workout', label: 'Street workout', hasMuscles: false, groups: ['Street Workout'], illus: 'musculation', tint: '#E4EADB' },
];

const MUSCLES: { label: string; group: string }[] = [
  { label: 'Pectoraux', group: 'Pectoraux' },
  { label: traduire('Dos'), group: 'Dos' },
  { label: 'Épaules', group: 'Epaules' },
  { label: 'Bras', group: 'Bras' },
  { label: 'Jambes', group: 'Jambes' },
  { label: 'Abdos', group: 'Abdos' },
  { label: traduire('Machines'), group: 'Machines' },
  { label: traduire('Haltérophilie'), group: 'Olympique' },
];

const UNITS: { key: BenchmarkUnit; label: string }[] = [
  { key: 'kg', label: traduire('Kilos') },
  { key: 'lbs', label: traduire('Livres') },
  { key: 'time', label: traduire('Temps') },
  { key: 'reps', label: traduire('Répétitions') },
  { key: 'km', label: traduire('Kilomètres') },
  { key: 'meters', label: traduire('Mètres') },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  onPickTemplate: (name: string, category: BenchmarkCategory, unit: BenchmarkUnit, muscleGroup?: string) => void;
  onCreateCustom: (name: string, category: BenchmarkCategory, unit: BenchmarkUnit) => void;
};

export function RecordPicker({ visible, onClose, busy, onPickTemplate, onCreateCustom }: Props) {
  const [step, setStep] = useState<Step>('sport');
  const [sport, setSport] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [cat, setCat] = useState<BenchmarkCategory>('force');
  const [unit, setUnit] = useState<BenchmarkUnit>('kg');

  useEffect(() => {
    if (visible) {
      setStep('sport');
      setSport(null);
      setGroup(null);
      setQuery('');
      setName('');
      setCat('force');
      setUnit('kg');
    }
  }, [visible]);

  const list = useMemo(() => {
    if (!group) return [];
    return WATCH_EXERCISE_TEMPLATES.filter((t) => t.muscleGroup?.toLowerCase() === group.toLowerCase());
  }, [group]);

  const searchResults = useMemo(() => {
    const q = normName(query);
    if (!q) return [];
    return WATCH_EXERCISE_TEMPLATES.filter((t) => normName(t.name).includes(q)).slice(0, 12);
  }, [query]);

  const back = () => {
    if (step === 'exercise') setStep(SPORTS.find((s) => s.name === sport)?.hasMuscles ? 'muscle' : 'sport');
    else setStep('sport');
  };

  const title = step === 'sport' ? traduire('Nouveau record') : step === 'muscle' ? 'Groupe musculaire' : step === 'custom' ? traduire('Suivi sur mesure') : (MUSCLES.find((m) => m.group === group)?.label ?? group ?? traduire('Exercices'));

  return (
    <Sheet visible={visible} onClose={onClose} scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {step !== 'sport' ? (
          <Press onPress={back} accessibilityRole="button" accessibilityLabel={traduire("Étape précédente")}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' }}>
              <CIcon name="back" size={20} />
            </View>
          </Press>
        ) : null}
        <Ink size={22} weight="black" tight style={{ flex: 1 }}>{title}</Ink>
      </View>

      {step === 'sport' ? (
        <>
          <Field value={query} onChangeText={setQuery} placeholder={traduire("Cherche un exercice : squat, rameur...")} autoCorrect={false} accessibilityLabel={traduire("Chercher un exercice")} />
          {searchResults.map((t) => (
            <ChoiceLine key={t.id} title={niceName(t.name)} sub={traduire(BENCHMARK_CATEGORIES[t.category]?.label)} icon="plus" onPress={() => onPickTemplate(t.name, t.category, t.unit, t.muscleGroup)} />
          ))}
          {query.trim() === '' ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
                {SPORTS.map((s) => {
                  const n = WATCH_EXERCISE_TEMPLATES.filter((t) => s.groups.some((g) => t.muscleGroup?.toLowerCase() === g.toLowerCase())).length;
                  return (
                    <View key={s.name} style={{ width: '48.5%' }}>
                      <Press
                        onPress={() => {
                          setSport(s.name);
                          if (s.hasMuscles) setStep('muscle');
                          else {
                            setGroup(s.name);
                            setStep('exercise');
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={n > 0 ? traduire("{0}, {1} exercices", s.label, n) : s.label}
                      >
                        <View style={{ height: 138, borderRadius: 22, backgroundColor: s.tint, padding: 12, justifyContent: 'flex-end', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }}>
                          <Illus name={s.illus} size={78} style={{ position: 'absolute', right: 6, top: 6 }} />
                          <Ink size={15} weight="black" tight numberOfLines={2}>{traduire(s.label)}</Ink>
                          {n > 0 ? <Ink size={12} weight="bold" color={P.ink2}>{traduire("{0} exercices", n)}</Ink> : null}
                        </View>
                      </Press>
                    </View>
                  );
                })}
              </View>
              <ChoiceLine title={traduire("Créer un suivi sur mesure")} sub={traduire("Ton nom, ta catégorie, ton unité")} icon="edit" onPress={() => setStep('custom')} />
            </>
          ) : searchResults.length === 0 ? (
            <ChoiceLine title={traduire("Créer « {0} »", query.trim())} sub={traduire("Suivi sur mesure")} icon="plus" onPress={() => { setName(query.trim()); setStep('custom'); }} />
          ) : null}
        </>
      ) : null}

      {step === 'muscle' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {MUSCLES.map((m) => (
            <View key={m.group} style={{ flexBasis: '48%', flexGrow: 1 }}>
              <Press onPress={() => { setGroup(m.group); setStep('exercise'); }} accessibilityRole="button" accessibilityLabel={traduire(m.label)}>
                <View style={{ minHeight: 64, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 14, justifyContent: 'center' }}>
                  <Ink size={15} weight="extraBold">{traduire(m.label)}</Ink>
                  <Ink size={12} weight="bold" color={P.muted}>{traduire("{0} exercices", WATCH_EXERCISE_TEMPLATES.filter((t) => t.muscleGroup?.toLowerCase() === m.group.toLowerCase()).length)}</Ink>
                </View>
              </Press>
            </View>
          ))}
        </View>
      ) : null}

      {step === 'exercise' ? (
        <View style={{ gap: 8, opacity: busy ? 0.5 : 1 }}>
          {list.length === 0 ? <Ink size={14} weight="medium" color={P.ink2}>{traduire("Pas d’exercice ici pour l’instant. Crée ton suivi sur mesure.")}</Ink> : null}
          {list.map((t) => (
            <ChoiceLine key={t.id} title={niceName(t.name)} icon="plus" onPress={busy ? undefined : () => onPickTemplate(t.name, t.category, t.unit, group || undefined)} />
          ))}
          <ChoiceLine title={traduire("Créer un suivi sur mesure")} icon="edit" onPress={() => setStep('custom')} />
        </View>
      ) : null}

      {step === 'custom' ? (
        <View style={{ gap: 14 }}>
          <Label>{traduire("Catégorie")}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(Object.keys(BENCHMARK_CATEGORIES) as BenchmarkCategory[]).map((k) => {
              const on = cat === k;
              return (
                <Press
                  key={k}
                  onPress={() => {
                    setCat(k);
                    if (k === 'running' || k === 'trail') setUnit('time');
                    else if (k === 'force' || k === 'musculation') setUnit('kg');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={traduire(BENCHMARK_CATEGORIES[k].label)}
                >
                  <View style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: categoryTone(k) }} />
                    <Ink size={14} weight="bold" color={on ? P.white : P.ink}>{traduire(BENCHMARK_CATEGORIES[k].label)}</Ink>
                  </View>
                </Press>
              );
            })}
          </ScrollView>
          {cat === 'running' || cat === 'trail' ? (
            <MiniChips items={['5km', '10km', 'Semi-Marathon', 'Marathon'].map((n) => ({ key: n, label: n.replace('km', ' km').replace('Semi-Marathon', 'Semi-marathon') }))} value={name} onChange={(k) => { setName(k); setUnit('time'); }} />
          ) : null}
          {cat === 'force' ? (
            <MiniChips items={['Squat', 'Développé Couché', 'Soulevé de Terre'].map((n) => ({ key: n, label: n.charAt(0) + n.slice(1).toLowerCase() }))} value={name} onChange={(k) => { setName(k); setUnit('kg'); }} />
          ) : null}
          <Field label={traduire("Nom du suivi")} value={name} onChangeText={setName} placeholder={traduire("Squat, 10 km, gainage...")} maxLength={50} />
          {cat !== 'running' && cat !== 'trail' && cat !== 'force' ? (
            <>
              <Label>{traduire("Unité")}</Label>
              <MiniChips items={UNITS} value={unit} onChange={(k) => setUnit(k)} />
            </>
          ) : (
            <Ink size={13} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>{cat === 'force' ? traduire('Tu noteras la charge et les répétitions.') : traduire('Tu noteras ton temps, en heures, minutes et secondes.')}</Ink>
          )}
          <BigButton label={busy ? traduire('Création...') : traduire('Créer le suivi')} icon="check" disabled={busy || !name.trim()} onPress={() => onCreateCustom(name.trim(), cat, unit)} />
        </View>
      ) : null}
    </Sheet>
  );
}
