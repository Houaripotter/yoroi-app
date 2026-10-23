/**
 * Tes objectifs (vague 14) : un seul ecran pour tous tes objectifs, en trois onglets.
 * - À cocher : une cible claire, cochee quand elle est atteinte (ancien ecran /goals, redirige ici).
 * - Datés : competition, poids, examen, avec compte a rebours (Premium).
 * - Par sport : seances par semaine pour chaque discipline (Premium).
 * Parametre facultatif : tab=liste|objectives|training.
 * Ancien ecran archive dans _archive_ancien_design_2026-10-09/vague14/desencombrement/app/.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Glass, P, Pill } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { usePremium } from '@/context/PremiumContext';
import { ObjectivesTab } from '@/components/yoroi/v2/competition/ObjectivesTab';
import { TrainingGoalsTab } from '@/components/yoroi/v2/competition/TrainingGoalsTab';
import { GoalsChecklist } from '@/components/yoroi/v2/objectifs/GoalsChecklist';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { traduire } from '@/lib/i18n/tr';

type Tab = 'liste' | 'objectives' | 'training';

const SUBTITLES: Record<Tab, string> = {
  liste: traduire('Fixe une cible claire et coche-la quand c’est fait'),
  objectives: traduire('Le temps qui te sépare de tes buts'),
  training: traduire('Ton rythme, sport par sport'),
};

/** Carte compacte a la place d'un onglet Premium : l'onglet reste visible, le reste de l'ecran aussi */
function PremiumNote({ title, text }: { title: string; text: string }) {
  return (
    <Glass style={{ gap: 10 }}>
      <Ink size={17} weight="black" tight>
        {title}
      </Ink>
      <Ink size={13} weight="bold" color={P.ink2}>
        {text}
      </Ink>
      <BigButton label={traduire("Voir Premium")} onPress={() => ouvrirPaywall('objectifs_dates')} />
    </Glass>
  );
}

export default function TrainingGoalsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'training' ? 'training' : params.tab === 'objectives' ? 'objectives' : 'liste');
  const { gender } = useAthlete();
  const { isPremium } = usePremium();

  return (
    <DetailScreen title={traduire("Tes objectifs")} subtitle={SUBTITLES[tab]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Pill label={traduire("À cocher")} active={tab === 'liste'} accent={P.accent} onPress={() => setTab('liste')} />
        </View>
        <View style={{ flex: 1 }}>
          <Pill label={traduire("Datés")} active={tab === 'objectives'} accent={P.accent} onPress={() => setTab('objectives')} />
        </View>
        <View style={{ flex: 1 }}>
          <Pill label={traduire("Par sport")} active={tab === 'training'} accent={P.accent} onPress={() => setTab('training')} />
        </View>
      </View>
      {tab === 'liste' ? <GoalsChecklist /> : null}
      {tab === 'objectives' ? (
        isPremium ? <ObjectivesTab /> : <PremiumNote title={traduire("Des objectifs datés")} text={traduire("Compétition, poids, examen : un compte à rebours jusqu’à chaque but. Disponible avec Premium.")} />
      ) : null}
      {tab === 'training' ? (
        isPremium ? <TrainingGoalsTab gender={gender} /> : <PremiumNote title={traduire("Un rythme par sport")} text={traduire("Fixe tes séances par semaine pour chaque discipline et suis-les semaine après semaine. Disponible avec Premium.")} />
      ) : null}
    </DetailScreen>
  );
}
