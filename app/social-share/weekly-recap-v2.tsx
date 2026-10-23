/**
 * Partage « Ma semaine » (refonte v2). Ouvert depuis une notification, l'ecran montre la carte
 * et rien ne part tant que la personne n'a pas touche Partager.
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { WeeklyRecapCardV2 } from '@/components/social-cards/WeeklyRecapCardV2';
import { useWeekStats } from '@/lib/social-cards/useWeekStats';
import { ShareStudio } from '@/components/yoroi/v2/partage/ShareStudio';
import { cardWidthFor } from '@/components/yoroi/v2/partage/cardKit';
import { useStudio } from '@/lib/v2/partage/useStudio';
import { useCardIdentity } from '@/lib/v2/partage/identity';

export default function WeeklyRecapV2Screen() {
  const { width: sw } = useWindowDimensions();
  const { stats, isLoading } = useWeekStats();
  const id = useCardIdentity();
  const studio = useStudio({ dialogTitle: 'Partager ma semaine', source: 'recap_semaine' });

  const empty = !isLoading && (!stats || stats.totalSessions === 0)
    ? { title: 'Ta semaine est encore vierge', text: 'Fais une séance et ta carte de la semaine se remplit toute seule.', action: 'Lancer une séance', onAction: () => router.push('/seance' as any) }
    : null;

  return (
    <ShareStudio
      title="Ma semaine"
      subtitle="Tes jours d’entraînement de la semaine"
      loading={isLoading}
      empty={empty}
      style={studio.style}
      onStyle={studio.setStyle}
      hasPhoto={studio.hasPhoto}
      onPickPhoto={studio.pick}
      onShare={studio.share}
      onSave={studio.save}
      busy={studio.busy}
    >
      {stats ? (
        <WeeklyRecapCardV2
          ref={studio.cardRef}
          stats={stats}
          format="stories"
          backgroundImage={studio.style === 'photo' ? studio.photo ?? undefined : undefined}
          backgroundType={studio.legacyBg}
          isLandscape={studio.landscape}
          username={id.name}
          weeklyGoal={id.weeklyGoal}
          width={cardWidthFor(sw)}
        />
      ) : null}
    </ShareStudio>
  );
}
