/**
 * Combat et competition (vague 18) : tout ce qui sert au combattant, dans l'ordre ou il s'en sert.
 * 1. Preparer ta prochaine competition : Competitions (compte a rebours, ecart a ta categorie),
 *    Espace competiteur, Suivi de match le jour du tournoi.
 * 2. Tes combats : Palmares, Partenaires.
 * 3. Tes analyses : Analyse de combat, Carte JJB, Drills.
 * Ouvert depuis la tuile « Combat et compétition » de l'accueil. Les rappels de competition
 * sont reprogrammes ici si un autre reglage les a effaces.
 */
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { DetailScreen, Icon, P, Press, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useRouter } from 'expo-router';
import { AccessGrid, HeroAccess } from '@/components/yoroi/v2/seances/AccessCards';
import type { Access } from '@/components/yoroi/v2/seances/AccessCards';
import { artByKey } from '@/lib/v2/seances/illustrations';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { syncCompetitionReminders } from '@/lib/v2/competition/reminders';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire } from '@/lib/i18n/tr';

const DAY = 86400000;

function localISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function CombatHub() {
  const { competitions, gender } = useSeancesData();
  const router = useRouter();
  const { lastWeight } = useAthlete();

  useEffect(() => {
    syncCompetitionReminders().catch(() => {});
  }, []);

  // la prochaine competition et l'ecart a sa categorie, pour un sous-titre utile sur la grande carte
  const nextLine = useMemo(() => {
    const today = localISO(new Date());
    const next = competitions
      .filter((c) => c.date && c.date.slice(0, 10) >= today && c.statut === 'a_venir')
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (!next) return traduire('ajoute ta prochaine compétition');
    const days = Math.round((new Date(next.date.slice(0, 10) + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / DAY);
    const when = days === 0 ? traduire('aujourd’hui') : days === 1 ? traduire('demain') : traduire("dans {0} jours", days);
    const gap = next.poids_max && next.poids_max < 900 && lastWeight ? lastWeight.weight - next.poids_max : null;
    const weight = gap === null ? '' : gap > 0 ? traduire(", {0} kg à perdre", formatKg(gap)) : traduire(', tu es dans ta catégorie');
    // nom long : on garde le nom et la date entiers, sans l'ecart de poids, pour ne rien couper
    return next.nom.length > 26 ? `${next.nom}, ${when}` : `${next.nom}, ${when}${weight}`;
  }, [competitions, lastWeight]);

  const prepare: Access[] = [
    { title: traduire('Compétitions'), sub: nextLine, href: '/competitions', tint: '#EEE1DF', icon: 'calendar', ornement: 'kabuto' },
    { title: traduire('Espace compétiteur'), sub: traduire('profil, coupe, hydratation'), href: '/competitor-space', tint: '#E4EADB', icon: 'target', ornement: 'cible' },
    { title: traduire('Suivi de match'), sub: traduire('score en direct au tournoi'), href: '/match-tracker', tint: '#E6E4DD', icon: 'timer', ornement: 'combat' },
  ];
  const fights: Access[] = [
    { title: traduire('Palmarès'), sub: traduire('médailles et victoires'), href: '/palmares', tint: '#F3EBDA', icon: 'trophy', ornement: 'fuji' },
    { title: traduire('Partenaires'), sub: traduire('ton sparring, tes duels'), href: '/sparring-partners', tint: '#E4EADB', icon: 'users', art: artByKey('jjb', gender, 1) },
  ];
  const analyses: Access[] = [
    { title: traduire('Analyse de combat'), sub: traduire('rounds, plan de jeu, tatami'), href: '/combat-analytics', tint: '#E3E6EE', icon: 'chart', ornement: 'katanas' },
    { title: traduire('Carte JJB'), sub: traduire('tes positions, tes finitions'), href: '/bjj-positions', tint: '#E9E4D8', icon: 'map', art: artByKey('jjb', gender, 3) },
    { title: traduire('Drills'), sub: traduire('répétitions techniques'), href: '/drill-tracker', tint: '#EEE1DF', icon: 'repeat', art: artByKey('boxe', gender, 1) },
  ];

  return (
    <DetailScreen title={traduire("Combat et compétition")} subtitle={traduire("Prépare, combats, analyse")}>
      {/* (vague 39) les ajouts qui etaient dans le bouton + : ici, a leur vraie place */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <AddAction label={traduire("Noter un combat")} icon="trophy" onPress={() => router.push('/seance/match' as any)} />
        <AddAction label={traduire("Ajouter une compétition")} icon="calendar" onPress={() => router.push('/add-competition' as any)} />
      </View>
      <HeroAccess a={prepare[0]} />
      <AccessGrid items={prepare.slice(1)} />
      <View style={{ height: 6 }} />
      <SectionTitle>{traduire("Tes combats")}</SectionTitle>
      <AccessGrid items={fights} />
      <View style={{ height: 6 }} />
      <SectionTitle>{traduire("Tes analyses")}</SectionTitle>
      <HeroAccess a={analyses[0]} />
      <AccessGrid items={analyses.slice(1)} />
    </DetailScreen>
  );
}

function AddAction({ label, icon, onPress }: { label: string; icon: 'trophy' | 'calendar'; onPress: () => void }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        <View style={{ minHeight: 60, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={icon} size={18} color={P.accent} />
          <Ink size={14} weight="extraBold" numberOfLines={2} style={{ flex: 1 }}>{label}</Ink>
        </View>
      </Press>
    </View>
  );
}
