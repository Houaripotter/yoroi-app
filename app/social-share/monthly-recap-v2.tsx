/**
 * Partage « Mon mois » (refonte v2). Ouvert depuis une notification, l'ecran montre la carte
 * et rien ne part tant que la personne n'a pas touche Partager.
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { MonthlyRecapCardV2 } from '@/components/social-cards/MonthlyRecapCardV2';
import { useMonthStats } from '@/lib/social-cards/useMonthStats';
import { ShareStudio } from '@/components/yoroi/v2/partage/ShareStudio';
import { cardWidthFor } from '@/components/yoroi/v2/partage/cardKit';
import { useStudio } from '@/lib/v2/partage/useStudio';
import { useCardIdentity } from '@/lib/v2/partage/identity';

const today = new Date();

export default function MonthlyRecapV2Screen() {
  const { width: sw } = useWindowDimensions();
  const { stats, isLoading, error } = useMonthStats(today.getFullYear(), today.getMonth());
  const id = useCardIdentity();
  const studio = useStudio({ dialogTitle: 'Partager mon mois', source: 'recap_mois' });

  const empty = !isLoading && (error || !stats || stats.activeDays === 0)
    ? { title: error ? 'Ton mois ne s’affiche pas' : 'Ton mois commence ici', text: error ? 'Les données n’ont pas pu être lues. Réessaie dans un instant.' : 'Chaque jour d’entraînement remplit une case. Lance ta première séance du mois.', action: 'Lancer une séance', onAction: () => router.push('/seance' as any) }
    : null;

  return (
    <ShareStudio
      title="Mon mois"
      subtitle="Tes jours d’entraînement en un coup d’œil"
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
        <MonthlyRecapCardV2
          ref={studio.cardRef}
          stats={stats}
          format="stories"
          backgroundImage={studio.style === 'photo' ? studio.photo ?? undefined : undefined}
          backgroundType={studio.legacyBg}
          isLandscape={studio.landscape}
          username={id.name}
          width={cardWidthFor(sw)}
        />
      ) : null}
    </ShareStudio>
  );
}
