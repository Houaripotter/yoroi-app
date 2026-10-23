/**
 * Partage « Mon année » (refonte v2) : le compteur annuel des jours d'entrainement.
 */
import React from 'react';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { YearCounterCardV2 } from '@/components/social-cards/YearCounterCardV2';
import { useYearStats } from '@/lib/social-cards/useYearStats';
import { ShareStudio } from '@/components/yoroi/v2/partage/ShareStudio';
import { cardWidthFor } from '@/components/yoroi/v2/partage/cardKit';
import { useStudio } from '@/lib/v2/partage/useStudio';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { traduire } from '@/lib/i18n/tr';

const YEAR = new Date().getFullYear();

export default function YearCounterV2Screen() {
  const { width: sw } = useWindowDimensions();
  const { stats, isLoading, error } = useYearStats(YEAR);
  const id = useCardIdentity();
  const studio = useStudio({ dialogTitle: traduire('Partager mon année'), source: 'compteur_annee' });

  const empty = !isLoading && (error || !stats || stats.totalDays === 0)
    ? { title: error ? traduire('Ton année ne s’affiche pas') : traduire("Ton année {0} t’attend", YEAR), text: error ? traduire('Les données n’ont pas pu être lues. Réessaie dans un instant.') : traduire('Chaque jour d’entraînement fait monter ton compteur. Lance ta première séance.'), action: traduire('Lancer une séance'), onAction: () => router.push('/seance' as any) }
    : null;

  return (
    <ShareStudio
      title={traduire("Mon année {0}", YEAR)}
      subtitle={traduire("Le compteur de tes séances de l’année")}
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
        <YearCounterCardV2
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
