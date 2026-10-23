/**
 * Records du carnet (vague 16) : resume (seulement avec des donnees), filtre par sport,
 * cartes lisibles (le meilleur en grand, l'evolution, le tampon rouge si le record a ete battu),
 * appui pour l'historique, appui long pour supprimer. Sous un sport choisi, ses analyses
 * (seances, muscles, progression, sorties, allures, WODs, stations, voies) quand il y a des donnees.
 */
import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useAccent } from '@/components/yoroi/v2/accueil/kit';
import { Sparkline } from '@/components/yoroi/v2/charts/core';
import { couleurTraitDomaine } from '@/components/yoroi/v2/charts/couleurDomaine';
import type { Benchmark } from '@/lib/carnetService';
import { relative, daysSince } from '@/lib/v2/carnet/format';
import { FAMILY_ILLUS, FAMILY_LABEL, familyOf, niceName, perfText, splitPerf, summarize } from '@/lib/v2/carnet/records';
import type { RecordFamily } from '@/lib/v2/carnet/records';
import type { Pratique } from '@/lib/v2/carnet/pratique';
import { P, Press, CIcon, Hanko, Field, Enter } from './ui';
import { CarnetEmpty, FilterChips, Illus, Summary } from './nav';
import { SeancesMuscuView } from './tabs/SeancesMuscuView';
import { MusclesView } from './tabs/MusclesView';
import { ProgressionView } from './tabs/ProgressionView';
import { SortiesView } from './tabs/SortiesView';
import { AlluresView } from './tabs/AlluresView';
import { WodsView } from './tabs/WodsView';
import { StationsView } from './tabs/StationsView';
import { VoiesView } from './tabs/VoiesView';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { useSessionRecords } from '@/lib/v2/seances/useSessionRecords';
import { SeanceRecords } from './SeanceRecords';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type RecordsFilter = 'all' | RecordFamily | 'escalade';

const ORDER: RecordFamily[] = ['muscu', 'course', 'cross', 'cardio', 'autre'];

type Props = {
  benchmarks: Benchmark[];
  pratique: Pratique;
  isPremium: boolean;
  refreshKey: number;
  onOpen: (b: Benchmark) => void;
  onAdd: (b: Benchmark) => void;
  onDelete: (b: Benchmark) => void;
  onCreate: () => void;
  onPremium: () => void;
};

export function RecordsView({ benchmarks, pratique, isPremium, refreshKey, onOpen, onAdd, onDelete, onCreate, onPremium }: Props) {
  const [filter, setFilter] = useState<RecordsFilter>('all');
  // records battus en seance : meme source que l'onglet Seances (vague 32)
  const { records: sessionRecords } = useSessionRecords(refreshKey);
  const hasSessionRecords = !!sessionRecords && sessionRecords.highlights.length > 0;
  const [query, setQuery] = useState('');

  const withEntries = useMemo(
    () =>
      benchmarks
        .filter((b) => b.entries && b.entries.length > 0 && b.category !== 'bodyweight')
        .sort((a, b) => {
          const la = summarize(a).last;
          const lb = summarize(b).last;
          return new Date(lb?.date ?? 0).getTime() - new Date(la?.date ?? 0).getTime();
        }),
    [benchmarks],
  );

  const counts = useMemo(() => {
    const c: Record<RecordFamily, number> = { muscu: 0, course: 0, cross: 0, cardio: 0, autre: 0 };
    withEntries.forEach((b) => c[familyOf(b)]++);
    return c;
  }, [withEntries]);

  const chips = useMemo(() => {
    const out: { key: RecordsFilter; label: string; count?: number }[] = [{ key: 'all', label: traduire('Tout'), count: withEntries.length }];
    const practised: Partial<Record<RecordFamily, boolean>> = { muscu: pratique.musculation, course: pratique.course, cross: pratique.cross };
    ORDER.forEach((f) => {
      if (counts[f] > 0 || practised[f]) out.push({ key: f, label: FAMILY_LABEL[f], count: counts[f] });
    });
    if (pratique.escalade) out.push({ key: 'escalade', label: 'Escalade' });
    return out;
  }, [counts, pratique, withEntries.length]);

  const stats = useMemo(() => {
    let beatenMonth = 0;
    let lastBeaten: { b: Benchmark; date: string } | null = null;
    withEntries.forEach((b) => {
      const s = summarize(b);
      if (s.beaten && s.pr) {
        const d = daysSince(s.pr.date);
        if (d !== null && d <= 30) beatenMonth++;
        if (!lastBeaten || new Date(s.pr.date).getTime() > new Date(lastBeaten.date).getTime()) lastBeaten = { b, date: s.pr.date };
      }
    });
    const perfs = withEntries.reduce((n, b) => n + b.entries.length, 0);
    return { beatenMonth, lastBeaten: lastBeaten as { b: Benchmark; date: string } | null, perfs };
  }, [withEntries]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withEntries.filter((b) => (filter === 'all' || familyOf(b) === filter) && (q === '' || b.name.toLowerCase().includes(q)));
  }, [withEntries, filter, query]);

  const groups = useMemo(() => {
    if (filter !== 'all' || query.trim() !== '') return null;
    return ORDER.map((f) => ({ f, items: list.filter((b) => familyOf(b) === f) })).filter((g) => g.items.length > 0);
  }, [list, filter, query]);

  if (withEntries.length === 0 && chips.length < 2) {
    if (hasSessionRecords) {
      return (
        <View style={{ gap: 14 }}>
          <Enter i={0}>
            <SeanceRecords records={sessionRecords!} />
          </Enter>
          <CarnetEmpty
            compact
            illus="records"
            title={traduire("Note aussi une perf hors séance")}
            text={traduire("Un test de 1 RM, un 10 km chronométré : YOROI garde ton meilleur et pose un tampon rouge chaque fois que tu le bats.")}
            action={traduire("Noter une perf")}
            onAction={onCreate}
          />
        </View>
      );
    }
    return (
      <CarnetEmpty
        illus="records"
        title={traduire("Ton premier record t’attend")}
        text={traduire("Squat, 10 km, tractions : note une perf. YOROI garde ton meilleur et pose un tampon rouge chaque fois que tu le bats.")}
        action={traduire("Noter mon premier record")}
        onAction={onCreate}
      />
    );
  }

  const lb = stats.lastBeaten;

  return (
    <View style={{ gap: 14 }}>
      {hasSessionRecords && filter === 'all' && query.trim() === '' ? (
        <Enter i={0}>
          <SeanceRecords records={sessionRecords!} />
        </Enter>
      ) : null}
      {withEntries.length > 0 ? (
        <Enter i={0}>
          <Summary
            illus="records"
            items={[
              { value: String(withEntries.length), label: traduirePluriel(withEntries.length, withEntries.length > 1, "exercice suivi", "exercices suivis") },
              { value: String(stats.perfs), label: traduirePluriel(stats.perfs, stats.perfs > 1, "perf notée", "perfs notées") },
              { value: String(stats.beatenMonth), label: traduire('battus en 30 jours'), color: stats.beatenMonth > 0 ? P.record : P.ink },
            ]}
          >
            {lb ? (
              <Press onPress={() => onOpen(lb.b)} accessibilityRole="button" accessibilityLabel={`Dernier record battu : ${lb.b.name}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: P.redSoft }}>
                  <Hanko size={38} rotate={-8} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Ink size={12} weight="bold" color={P.record}>{`Dernier record battu, ${relative(lb.date)}`}</Ink>
                    <Ink size={15} weight="extraBold" numberOfLines={2}>{`${niceName(lb.b.name)} : ${perfText(lb.b, summarize(lb.b).pr)}`}</Ink>
                  </View>
                  <CIcon name="chevron" size={16} color={P.record} />
                </View>
              </Press>
            ) : null}
          </Summary>
        </Enter>
      ) : null}

      <FilterChips items={chips} value={filter} onChange={(k) => { setFilter(k); setQuery(''); }} />

      {withEntries.length > 6 && filter !== 'escalade' ? (
        <Field value={query} onChangeText={setQuery} placeholder={traduire("Chercher un exercice")} maxLength={60} autoCorrect={false} accessibilityLabel={traduire("Chercher un exercice")} />
      ) : null}

      {filter !== 'escalade' ? (
        list.length === 0 ? (
          query.trim() !== '' ? (
            <CarnetEmpty compact illus="records" title={traduire("Rien trouvé")} text={traduire("Aucun exercice ne contient « {0} ».", query.trim())} action={traduire("Créer « {0} »", query.trim())} onAction={onCreate} />
          ) : (
            <CarnetEmpty
              compact
              illus={filter === 'all' ? 'records' : FAMILY_ILLUS[filter]}
              title={filter === 'all' ? (hasSessionRecords ? traduire('Note aussi une perf hors séance') : traduire('Ton premier record t’attend')) : traduire("Pas encore de record en {0}", FAMILY_LABEL[filter].toLowerCase())}
              text={filter === 'all' && hasSessionRecords ? traduire('Un test de 1 RM, un 10 km chronométré : ton meilleur s’affichera ici en grand, avec son évolution.') : traduire('Note une perf : ton meilleur s’affichera ici en grand, avec son évolution.')}
              action={traduire("Noter un record")}
              onAction={onCreate}
            />
          )
        ) : groups ? (
          groups.map((g, gi) => (
            <Enter key={g.f} i={gi + 1} style={{ gap: 10 }}>
              {groups.length > 1 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2, marginTop: gi === 0 ? 0 : 6 }}>
                  <Illus name={FAMILY_ILLUS[g.f]} size={30} />
                  <Ink size={18} weight="black" tight style={{ flex: 1 }}>{FAMILY_LABEL[g.f]}</Ink>
                  <Ink size={13} weight="bold" color={P.muted}>{String(g.items.length)}</Ink>
                </View>
              ) : null}
              {g.items.map((b) => (
                <RecordCard key={b.id} b={b} onOpen={onOpen} onAdd={onAdd} onDelete={onDelete} />
              ))}
            </Enter>
          ))
        ) : (
          list.map((b, i) => (
            <Enter key={b.id} i={Math.min(i + 1, 8)}>
              <RecordCard b={b} onOpen={onOpen} onAdd={onAdd} onDelete={onDelete} />
            </Enter>
          ))
        )
      ) : null}

      {filter === 'muscu' ? (
        <>
          {isPremium ? <ProgressionView refreshKey={refreshKey} hideEmpty /> : <PremiumLine text={traduire("Ta progression sur les gros mouvements")} onPress={onPremium} />}
          <MusclesView refreshKey={refreshKey} hideEmpty />
          <SeancesMuscuView refreshKey={refreshKey} hideEmpty />
        </>
      ) : null}
      {filter === 'course' ? (
        <>
          <AlluresView refreshKey={refreshKey} hideEmpty />
          <SortiesView refreshKey={refreshKey} hideEmpty />
        </>
      ) : null}
      {filter === 'cross' ? (
        <>
          <StationsView refreshKey={refreshKey} hideEmpty />
          <WodsView refreshKey={refreshKey} hideEmpty />
        </>
      ) : null}
      {filter === 'escalade' ? <VoiesView refreshKey={refreshKey} /> : null}

      {list.length > 0 && filter !== 'escalade' ? (
        <Ink size={12} weight="medium" color={P.muted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
          {traduire("Touche une carte pour son historique, garde appuyé pour la supprimer.")}</Ink>
      ) : null}
    </View>
  );
}

function PremiumLine({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire("{0}, disponible avec Premium", text)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: P.goldSoft }}>
        <CIcon name="lock" size={20} color={P.goldDark} />
        <View style={{ flex: 1 }}>
          <Ink size={15} weight="extraBold">{text}</Ink>
          <Ink size={12} weight="bold" color={P.goldDark}>{traduire("Disponible avec Premium")}</Ink>
        </View>
        <CIcon name="chevron" size={16} color={P.goldDark} />
      </View>
    </Press>
  );
}

export function RecordCard({ b, onOpen, onAdd, onDelete }: { b: Benchmark; onOpen: (b: Benchmark) => void; onAdd: (b: Benchmark) => void; onDelete: (b: Benchmark) => void }) {
  const { accent } = useAccent();
  const { width } = useWindowDimensions();
  const s = summarize(b);
  const best = splitPerf(perfText(b, s.pr));
  const fam = familyOf(b);
  const name = niceName(b.name);
  const sub = b.muscleGroup && b.muscleGroup !== 'Général' ? b.muscleGroup.charAt(0) + b.muscleGroup.slice(1).toLowerCase() : FAMILY_LABEL[fam];
  const curveW = Math.min(96, Math.max(64, width * 0.2));
  // audit 43 : le + n'est plus un bouton dans le bouton de la carte, il est pose par-dessus, a cote
  return (
    <View>
    <Press
      onPress={() => onOpen(b)}
      onLongPress={() =>
        appAlert(traduire('Supprimer ce suivi ?'), traduire("{0} ira dans la corbeille. Tu pourras le restaurer.", name), [
          { text: traduire('Annuler'), style: 'cancel' },
          { text: traduire('Supprimer'), style: 'destructive', onPress: () => onDelete(b) },
        ])
      }
      delayLongPress={450}
      accessibilityRole="button"
      accessibilityLabel={`${name}, record ${perfText(b, s.pr)}${s.beaten ? ', record battu' : ''}`}
      accessibilityHint={traduire("Touche pour l’historique, garde appuyé pour supprimer")}
    >
      <View style={{ padding: 16, borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: s.lastIsBest ? 'rgba(176,40,46,0.28)' : P.line2, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
            <Illus name={FAMILY_ILLUS[fam]} size={40} />
          </View>
          <View style={{ flex: 1, gap: 1, paddingTop: 2 }}>
            <Ink size={16} weight="extraBold" numberOfLines={2}>{name}</Ink>
            <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>{sub}</Ink>
          </View>
          <View style={{ width: 44, height: 44 }} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <View style={{ flex: 1, gap: 0 }}>
            <Ink size={12} weight="bold" color={P.ink2}>{traduire("Ton meilleur")}</Ink>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ink size={30} weight="black" tight numberOfLines={1} style={{ flexShrink: 1 }}>
                {best.main}
              </Ink>
              {s.beaten ? <Hanko size={30} rotate={-10} /> : null}
            </View>
            {best.sub ? <Ink size={13} weight="bold" color={P.ink2}>{best.sub}</Ink> : null}
          </View>
          {s.curve.length > 1 ? (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              {/* vague 45 : trait violet avec halo et point final (le rouge reste au tampon de record) */}
              <Sparkline values={s.curve} width={curveW} height={34} color={couleurTraitDomaine('seances')} minSpan={0} />
              <Ink size={11} weight="bold" color={P.muted}>{`${s.count} perfs`}</Ink>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 }}>
          {s.gain ? (
            <View style={{ paddingHorizontal: 9, minHeight: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: P.mossSoft }}>
              <Ink size={12} weight="extraBold" color={P.mossText}>{traduire("{0} depuis le début", s.gain)}</Ink>
            </View>
          ) : null}
          <Ink size={12} weight="medium" color={P.muted} style={{ flexShrink: 1 }}>
            {s.lastIsBest && s.pr ? `Record battu ${relative(s.pr.date)}` : s.last && s.pr && s.last.id !== s.pr.id ? traduire("Dernière : {0}, {1}", perfText(b, s.last), relative(s.last.date)) : s.last ? traduire("Noté {0}", relative(s.last.date)) : ''}
          </Ink>
        </View>
      </View>
    </Press>
      <View style={{ position: 'absolute', top: 16, right: 16 }}>
        <Press onPress={() => onAdd(b)} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Noter une perf en {0}", name)} hitSlop={6}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <CIcon name="plus" size={20} color={accent} width={2.8} />
          </View>
        </Press>
      </View>
    </View>
  );
}
