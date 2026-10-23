/**
 * Ajouter un club v2 : logo, nom, sport, objectif par semaine, couleur.
 * Parametre optionnel : id (club a modifier).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { getClubs } from '@/lib/database';
import type { Club } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { ClubFormContent } from '@/components/yoroi/v2/seances/ClubForm';

export default function AddClubScreen() {
  const { theme } = useYoroiTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [club, setClub] = useState<Club | null | undefined>(params.id ? undefined : null);

  useEffect(() => {
    if (!params.id) return;
    getClubs()
      .then((all) => setClub(all.find((x) => String(x.id) === String(params.id)) ?? null))
      .catch(() => setClub(null));
  }, [params.id]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/planning?tab=clubs' as any);
  };

  if (club === undefined) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  return (
    <ClubFormContent
      editingClub={club}
      onCancel={leave}
      onDone={() => {
        DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
        leave();
      }}
    />
  );
}
