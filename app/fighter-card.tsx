/**
 * Carte de combattant (refonte v2) : ta fiche de guerrier a partager en image.
 */
import React, { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { getUserSettings, getLatestMeasurement } from '@/lib/storage';
import { getTrainings, getProfile, getLatestWeight } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { getGlobalGoalStats } from '@/lib/trainingGoalsService';
import logger from '@/lib/security/logger';
import { ShareStudio } from '@/components/yoroi/v2/partage/ShareStudio';
import { FighterCardView } from '@/components/yoroi/v2/partage/FighterCardView';
import type { FighterData } from '@/components/yoroi/v2/partage/FighterCardView';
import { cardWidthFor } from '@/components/yoroi/v2/partage/cardKit';
import { useStudio } from '@/lib/v2/partage/useStudio';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { traduire, LOCALE } from '@/lib/i18n/tr';

export default function FighterCardScreen() {
  const { width: sw } = useWindowDimensions();
  const id = useCardIdentity();
  const [data, setData] = useState<FighterData | null>(null);
  const [loading, setLoading] = useState(true);
  const studio = useStudio({ initialStyle: 'papier', dialogTitle: traduire('Partager ma carte de combattant'), fallbackMessage: traduire('Ma carte de combattant YOROI'), source: 'carte_combattant' });

  useEffect(() => {
    (async () => {
      try {
        const [settings, profile, measurement, trainings, goals, latestWeight] = await Promise.all([
          getUserSettings().catch(() => ({} as any)),
          getProfile().catch(() => null),
          getLatestMeasurement().catch(() => null),
          getTrainings().catch(() => []),
          getGlobalGoalStats().catch(() => null),
          getLatestWeight().catch(() => null),
        ]);
        const counts: Record<string, number> = {};
        let minutes = 0;
        for (const t of trainings) {
          minutes += t.duration_minutes || 0;
          const s = (t.sport ?? '').split(',')[0].trim();
          if (s) counts[s] = (counts[s] ?? 0) + 1;
        }
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const current = Math.round((latestWeight?.weight || measurement?.weight || 0) * 10) / 10;
        const start = profile?.start_weight || current;
        const lost = current > 0 ? Math.max(0, start - current) : 0;
        const since = profile?.start_date || profile?.created_at;
        const joinDate = since ? new Date(since).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
        setData({
          name: profile?.name || settings?.username || 'Guerrier YOROI',
          weight: current,
          height: settings?.height || profile?.height_cm || 0,
          totalTrainings: trainings.length,
          totalMinutes: minutes,
          discipline: top ? (getSportName(top) ?? top) : traduire('À découvrir'),
          disciplineId: top,
          joinDate,
          weightLost: Math.round(lost * 10) / 10,
          goals: goals && goals.activeGoals > 0 ? { done: goals.totalWeeklyCompleted, target: goals.totalWeeklyTarget, percent: goals.overallWeekPercent } : null,
        });
      } catch (e) {
        logger.error('Erreur chargement carte de combattant:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ShareStudio
      title={traduire("Carte de combattant")}
      subtitle={traduire("Ton rang et tes chiffres, prêts pour Instagram")}
      loading={loading}
      empty={!loading && !data ? { title: traduire('Ta carte ne s’affiche pas'), text: traduire('Tes données n’ont pas pu être lues. Réessaie dans un instant.'), action: traduire('Retour'), onAction: () => router.back() } : null}
      style={studio.style}
      onStyle={studio.setStyle}
      hasPhoto={studio.hasPhoto}
      onPickPhoto={studio.pick}
      onShare={studio.share}
      onSave={studio.save}
      busy={studio.busy}
    >
      {data ? <FighterCardView ref={studio.cardRef} data={data} id={id} variant={studio.style === 'photo' && !studio.photo ? 'laque' : studio.style} photo={studio.photo} width={cardWidthFor(sw)} /> : null}
    </ShareStudio>
  );
}
