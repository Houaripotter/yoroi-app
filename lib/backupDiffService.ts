// ============================================
// BACKUP DIFF SERVICE
// Calcule la différence entre un backup JSON et les données locales actuelles.
// Permet d'afficher à l'user "Tu vas gagner X séances, Y photos, Z pesées"
// avant de confirmer une sync multi-device.
// ============================================

import logger from './security/logger';

export interface BackupDiff {
  newWeights: number;
  newTrainings: number;
  newMeasurements: number;
  newBodyCompositions: number;
  newClubs: number;
  newPhotos: number;
  newInjuries: number;
  newCompetitions: number;
  newSparringPartners: number;
  newSleepEntries: number;
  newMoodEntries: number;
  newHydrationEntries: number;
  newBadges: number;
  totalNew: number;
  hasProfileUpdate: boolean;
}

/**
 * Compare un backup (déjà parsé en objet) avec les données locales actuelles.
 * Retourne le nombre d'éléments qui seront AJOUTÉS si on l'importe.
 *
 * Note : la logique de déduplication de l'import est la même qu'ici (on utilise
 * les mêmes clés : id pour weights/trainings, name|sport pour clubs, name|date
 * pour competitions, etc.) pour rester cohérent avec ce qui sera réellement ajouté.
 */
export async function computeBackupDiff(backupData: any): Promise<BackupDiff> {
  try {
    // Import dynamique pour éviter des cycles
    const [
      { getWeights, getTrainings, getMeasurements, getClubs, getInjuries, getCompetitions },
      { getAllBodyCompositions },
      { getPhotosFromStorage, getAllHydrationEntries, getMoods },
      { getSleepEntries },
      AsyncStorage,
      { getUnlockedBadges },
    ] = await Promise.all([
      import('./database'),
      import('./bodyComposition'),
      import('./storage'),
      import('./sleepService'),
      import('@react-native-async-storage/async-storage').then(m => m.default),
      import('./badges'),
    ]);

    const [
      localWeights, localTrainings, localMeasurements, localClubs,
      localInjuries, localCompetitions, localBodyComps,
      localPhotos, localHydration, localMoods, localSleep,
      localBadges, rawPartners,
    ] = await Promise.all([
      getWeights().catch(() => []),
      getTrainings().catch(() => []),
      getMeasurements().catch(() => []),
      getClubs().catch(() => []),
      getInjuries().catch(() => []),
      getCompetitions().catch(() => []),
      getAllBodyCompositions().catch(() => []),
      getPhotosFromStorage().catch(() => []),
      getAllHydrationEntries().catch(() => []),
      getMoods().catch(() => []),
      getSleepEntries().catch(() => []),
      getUnlockedBadges().catch(() => []),
      AsyncStorage.getItem('@yoroi_sparring_partners').catch(() => null),
    ]);

    // Helpers de comptage (même logique que importDataFromBackupObject)
    const countNew = <T>(backup: T[], local: T[], keyFn: (x: T) => string): number => {
      const localKeys = new Set(local.map(keyFn));
      return backup.filter(b => !localKeys.has(keyFn(b))).length;
    };

    const newWeights = Array.isArray(backupData.weights)
      ? countNew(backupData.weights, localWeights, (w: any) => `${w.date}|${w.weight}`)
      : 0;
    const newTrainings = Array.isArray(backupData.trainings)
      ? countNew(backupData.trainings, localTrainings, (t: any) => t.healthkit_uuid || `${t.date}|${t.sport}|${t.start_time ?? ''}`)
      : 0;
    const newMeasurements = Array.isArray(backupData.measurements)
      ? countNew(backupData.measurements, localMeasurements, (m: any) => `${m.date}|${m.waist ?? ''}|${m.chest ?? ''}`)
      : 0;
    const newBodyCompositions = Array.isArray(backupData.bodyCompositions)
      ? countNew(backupData.bodyCompositions, localBodyComps, (b: any) => `${b.date}|${b.weight ?? ''}`)
      : 0;
    const newClubs = Array.isArray(backupData.clubs)
      ? countNew(backupData.clubs, localClubs, (c: any) => `${c.name}|${c.sport}`)
      : 0;
    const newPhotos = Array.isArray(backupData.photos)
      ? countNew(backupData.photos, localPhotos, (p: any) => p.id || p.date)
      : 0;
    const newInjuries = Array.isArray(backupData.injuries)
      ? countNew(backupData.injuries, localInjuries, (i: any) => i.id || `${i.date}|${i.zone ?? ''}`)
      : 0;
    const newCompetitions = Array.isArray(backupData.competitions)
      ? countNew(backupData.competitions, localCompetitions, (c: any) => `${c.name}|${c.date}`)
      : 0;

    // Partenaires sparring (stockés en JSON string)
    let newSparringPartners = 0;
    try {
      if (backupData.combatLab?.sparringPartners) {
        const backupPartners: any[] = JSON.parse(backupData.combatLab.sparringPartners);
        const localPartners: any[] = rawPartners ? JSON.parse(rawPartners) : [];
        newSparringPartners = countNew(backupPartners, localPartners, (p: any) => p.name?.toLowerCase() ?? '');
      }
    } catch { /* ignore */ }

    const newSleepEntries = Array.isArray(backupData.sleepEntries)
      ? countNew(backupData.sleepEntries, localSleep as any[], (s: any) => s.id ?? s.date)
      : 0;
    const newMoodEntries = Array.isArray(backupData.moodEntries)
      ? countNew(backupData.moodEntries, localMoods as any[], (m: any) => m.date)
      : 0;
    const newHydrationEntries = Array.isArray(backupData.hydrationEntries)
      ? countNew(backupData.hydrationEntries, localHydration as any[], (h: any) => h.id ?? `${h.date}|${h.amount}`)
      : 0;
    const newBadges = Array.isArray(backupData.unlockedBadges)
      ? backupData.unlockedBadges.filter((id: string) => !(localBadges as string[]).includes(id)).length
      : 0;

    const hasProfileUpdate = !!(backupData.profile?.name);

    const totalNew = newWeights + newTrainings + newMeasurements + newBodyCompositions
      + newClubs + newPhotos + newInjuries + newCompetitions + newSparringPartners
      + newSleepEntries + newMoodEntries + newHydrationEntries + newBadges;

    return {
      newWeights, newTrainings, newMeasurements, newBodyCompositions,
      newClubs, newPhotos, newInjuries, newCompetitions, newSparringPartners,
      newSleepEntries, newMoodEntries, newHydrationEntries, newBadges,
      totalNew, hasProfileUpdate,
    };
  } catch (e) {
    logger.error('[BackupDiff] Erreur:', e);
    return {
      newWeights: 0, newTrainings: 0, newMeasurements: 0, newBodyCompositions: 0,
      newClubs: 0, newPhotos: 0, newInjuries: 0, newCompetitions: 0, newSparringPartners: 0,
      newSleepEntries: 0, newMoodEntries: 0, newHydrationEntries: 0, newBadges: 0,
      totalNew: 0, hasProfileUpdate: false,
    };
  }
}

/**
 * Formate un diff en message lisible pour l'user (UI de confirmation).
 */
export function formatDiffMessage(diff: BackupDiff): string {
  if (diff.totalNew === 0 && !diff.hasProfileUpdate) {
    return "Aucune nouvelle donnée détectée dans le backup (tu es déjà à jour).";
  }

  const parts: string[] = [];
  if (diff.newTrainings > 0) parts.push(`${diff.newTrainings} séance${diff.newTrainings > 1 ? 's' : ''}`);
  if (diff.newWeights > 0) parts.push(`${diff.newWeights} pesée${diff.newWeights > 1 ? 's' : ''}`);
  if (diff.newPhotos > 0) parts.push(`${diff.newPhotos} photo${diff.newPhotos > 1 ? 's' : ''}`);
  if (diff.newMeasurements > 0) parts.push(`${diff.newMeasurements} mensuration${diff.newMeasurements > 1 ? 's' : ''}`);
  if (diff.newBodyCompositions > 0) parts.push(`${diff.newBodyCompositions} composition${diff.newBodyCompositions > 1 ? 's' : ''}`);
  if (diff.newClubs > 0) parts.push(`${diff.newClubs} club${diff.newClubs > 1 ? 's' : ''}`);
  if (diff.newSparringPartners > 0) parts.push(`${diff.newSparringPartners} partenaire${diff.newSparringPartners > 1 ? 's' : ''}`);
  if (diff.newCompetitions > 0) parts.push(`${diff.newCompetitions} compétition${diff.newCompetitions > 1 ? 's' : ''}`);
  if (diff.newInjuries > 0) parts.push(`${diff.newInjuries} blessure${diff.newInjuries > 1 ? 's' : ''}`);
  if (diff.newSleepEntries > 0) parts.push(`${diff.newSleepEntries} nuit${diff.newSleepEntries > 1 ? 's' : ''}`);
  if (diff.newMoodEntries > 0) parts.push(`${diff.newMoodEntries} humeur${diff.newMoodEntries > 1 ? 's' : ''}`);
  if (diff.newHydrationEntries > 0) parts.push(`${diff.newHydrationEntries} hydratation${diff.newHydrationEntries > 1 ? 's' : ''}`);
  if (diff.newBadges > 0) parts.push(`${diff.newBadges} badge${diff.newBadges > 1 ? 's' : ''}`);

  if (parts.length === 0) {
    return diff.hasProfileUpdate ? "Mise à jour du profil uniquement." : "Aucune nouveauté détectée.";
  }

  return `Tu vas gagner :\n• ${parts.join('\n• ')}`;
}
