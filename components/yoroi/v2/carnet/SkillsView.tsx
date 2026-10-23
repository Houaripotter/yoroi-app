/**
 * Techniques du carnet (vague 16) : resume (seulement avec des techniques), filtre par sport,
 * liste rangee par etat (en cours, a apprendre, maitrisees), tampon rouge sur les techniques maitrisees.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Skill, SkillStatus } from '@/lib/carnetService';
import { STATUS_LABEL, skillCategoryLabel, skillTone, skillsStats } from '@/lib/v2/carnet/journal';
import type { CarnetIllus } from './images';
import { P, Press, CIcon, Stamp, Field, Enter } from './ui';
import { BlockHead, CarnetEmpty, FilterChips, Illus, Summary } from './nav';

type SkillFilter = 'all' | 'jjb' | 'lutte' | 'boxe' | 'autre';

const FILTER_LABEL: Record<SkillFilter, string> = { all: 'Tout', jjb: 'JJB', lutte: 'Lutte', boxe: 'Boxe', autre: 'Autre' };

function filterOf(s: Skill): SkillFilter {
  const c = String(s.category);
  if (c.startsWith('jjb_')) return 'jjb';
  if (c === 'lutte') return 'lutte';
  if (c === 'striking') return 'boxe';
  return 'autre';
}

function illusOf(s: Skill): CarnetIllus {
  const f = filterOf(s);
  if (f === 'jjb' || f === 'lutte') return 'jjb';
  if (f === 'boxe') return 'boxe';
  return 'techniques';
}

const GROUPS: { status: SkillStatus; title: string }[] = [
  { status: 'in_progress', title: 'En cours' },
  { status: 'to_learn', title: 'À apprendre' },
  { status: 'mastered', title: 'Maîtrisées' },
];

type Props = {
  skills: Skill[];
  onOpen: (s: Skill) => void;
  onCreate: (name?: string) => void;
};

export function SkillsView({ skills, onOpen, onCreate }: Props) {
  const [filter, setFilter] = useState<SkillFilter>('all');
  const [query, setQuery] = useState('');
  const st = useMemo(() => skillsStats(skills), [skills]);
  const drills = useMemo(() => skills.reduce((n, s) => n + (s.drillCount || 0), 0), [skills]);

  const chips = useMemo(() => {
    const c: Record<SkillFilter, number> = { all: skills.length, jjb: 0, lutte: 0, boxe: 0, autre: 0 };
    skills.forEach((s) => c[filterOf(s)]++);
    return (['all', 'jjb', 'lutte', 'boxe', 'autre'] as SkillFilter[]).filter((k) => k === 'all' || c[k] > 0).map((k) => ({ key: k, label: FILTER_LABEL[k], count: c[k] }));
  }, [skills]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((s) => (filter === 'all' || filterOf(s) === filter) && (q === '' || s.name.toLowerCase().includes(q)));
  }, [skills, filter, query]);

  if (skills.length === 0) {
    return (
      <CarnetEmpty
        illus="techniques"
        title="Note ce que tu apprends"
        text="Une garde, un passage, un enchaînement : ajoute-la, compte tes répétitions, et marque-la maîtrisée le jour où elle sort toute seule."
        action="Ajouter ma première technique"
        onAction={() => onCreate()}
      />
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Enter i={0}>
        <Summary
          illus="techniques"
          items={[
            { value: String(st.inProgress), label: 'en cours', color: P.goldDark },
            { value: String(st.toLearn), label: 'à apprendre' },
            { value: String(st.mastered), label: `maîtrisée${st.mastered > 1 ? 's' : ''}`, color: P.record },
          ]}
        >
          {st.suggestion ? (
            <Press onPress={() => onOpen(st.suggestion!)} accessibilityRole="button" accessibilityLabel={`À répéter : ${st.suggestion.name}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: P.goldSoft }}>
                <CIcon name="refresh" size={20} color={P.goldDark} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Ink size={12} weight="bold" color={P.goldDark}>À répéter aujourd’hui</Ink>
                  <Ink size={15} weight="extraBold" numberOfLines={2}>{st.suggestion.name}</Ink>
                </View>
                <CIcon name="chevron" size={16} color={P.goldDark} />
              </View>
            </Press>
          ) : drills > 0 ? (
            <Ink size={13} weight="medium" color={P.ink2}>{`${drills} répétitions notées en tout.`}</Ink>
          ) : null}
        </Summary>
      </Enter>

      <FilterChips items={chips} value={filter} onChange={(k) => { setFilter(k); setQuery(''); }} />

      {skills.length > 6 ? <Field value={query} onChangeText={setQuery} placeholder="Chercher une technique" maxLength={60} autoCorrect={false} accessibilityLabel="Chercher une technique" /> : null}

      {list.length === 0 ? (
        query.trim() !== '' ? (
          <CarnetEmpty compact illus="techniques" title="Rien trouvé" text={`Aucune technique ne contient « ${query.trim()} ».`} action={`Créer « ${query.trim()} »`} onAction={() => onCreate(query.trim())} />
        ) : (
          <CarnetEmpty compact illus="techniques" title="Rien ici pour l’instant" text="Choisis un autre sport, ou ajoute une technique." action="Ajouter une technique" onAction={() => onCreate()} />
        )
      ) : (
        GROUPS.map((g) => {
          const items = list.filter((s) => s.status === g.status);
          if (items.length === 0) return null;
          return (
            <View key={g.status} style={{ gap: 10 }}>
              <BlockHead title={`${g.title}, ${items.length}`} />
              {items.map((s, i) => (
                <Enter key={s.id} i={Math.min(i, 8)}>
                  <SkillCard s={s} onOpen={onOpen} />
                </Enter>
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

function SkillCard({ s, onOpen }: { s: Skill; onOpen: (s: Skill) => void }) {
  const tone = skillTone(s.category);
  const mastered = s.status === 'mastered';
  return (
    <Press onPress={() => onOpen(s)} accessibilityRole="button" accessibilityLabel={`${s.name}, ${STATUS_LABEL[s.status]}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#F4F2EC', alignItems: 'center', justifyContent: 'center' }}>
          <Illus name={illusOf(s)} size={40} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={16} weight="extraBold" numberOfLines={2}>{s.name}</Ink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Ink size={12} weight="bold" color={tone}>{skillCategoryLabel(s.category)}</Ink>
            {s.drillCount > 0 ? <Ink size={12} weight="bold" color={P.muted}>{`${s.drillCount} répétitions`}</Ink> : null}
            {s.notes && s.notes.length > 0 ? <CIcon name="note" size={14} color={P.muted} /> : null}
            {s.videoUrl ? <CIcon name="film" size={14} color={tone} /> : null}
          </View>
        </View>
        {mastered ? (
          <Stamp size={42} label="Maîtrisée" />
        ) : (
          <View style={{ paddingHorizontal: 10, minHeight: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: s.status === 'in_progress' ? P.goldSoft : '#F4F2EC' }}>
            <Ink size={12} weight="extraBold" color={s.status === 'in_progress' ? P.goldDark : P.ink2}>{STATUS_LABEL[s.status]}</Ink>
          </View>
        )}
      </View>
    </Press>
  );
}
