/**
 * Confidentialite et donnees (refonte v2) : tout reste sur le telephone.
 * Duree de conservation, donnees par categorie (avec suppression), export et suppression totale.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, EspaceScreen, Icon, SectionTitle, Segmented } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { logger } from '@/lib/security/logger';
import secureStorage from '@/lib/security/secureStorage';
import {
  deleteAllTrainings,
  deleteInjury,
  deleteMeasurementRecord,
  deletePhoto,
  deleteWeight,
  getAllWeights,
  getInjuries,
  getMeasurements,
  getPhotos,
  getTrainingsCount,
} from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { MesureConfidentialite } from '@/components/yoroi/v2/reglages/MesureConfidentialite';
import { messageEffacement } from '@/lib/effacementPlan';

/** Nombre d'éléments gardés dans la base de l'app (SQLite) pour une catégorie. */
async function countInDatabase(id: string): Promise<number> {
  try {
    if (id === 'weights') {
      const [w, m] = await Promise.all([getAllWeights(), getMeasurements()]);
      return (w?.length ?? 0) + (m?.length ?? 0);
    }
    if (id === 'workouts') return (await getTrainingsCount()).total ?? 0;
    if (id === 'photos') return (await getPhotos()).length;
    if (id === 'injuries') return (await getInjuries()).length;
  } catch (e) {
    logger.error('Erreur comptage base:', e);
  }
  return 0;
}

/** Supprime les éléments d'une catégorie dans la base de l'app (SQLite). */
async function deleteInDatabase(id: string): Promise<void> {
  if (id === 'weights') {
    const [w, m] = await Promise.all([getAllWeights(), getMeasurements()]);
    for (const x of w) if (x.id != null) await deleteWeight(x.id);
    for (const x of m) if (x.id != null) await deleteMeasurementRecord(x.id);
  } else if (id === 'workouts') {
    await deleteAllTrainings();
  } else if (id === 'photos') {
    for (const x of await getPhotos()) if (x.id != null) await deletePhoto(x.id);
  } else if (id === 'injuries') {
    for (const x of await getInjuries()) if (x.id != null) await deleteInjury(x.id);
  }
}

const DATA_RETENTION_KEY = '@yoroi_data_retention';
/** 18 octobre 2026 : reglage Conservation masque, voir le commentaire dans l'ecran */
const AFFICHER_CONSERVATION = false;

const RETENTION_OPTIONS = [
  { key: '0', label: 'Toujours' },
  { key: '30', label: '30 j' },
  { key: '90', label: '90 j' },
  { key: '180', label: '180 j' },
];

const DATA_CATEGORIES: { id: string; key: string; icon: IconName; secure: boolean; label: string }[] = [
  { id: 'weights', key: '@yoroi_measurements', icon: 'scale', secure: true, label: 'Poids et mensurations' },
  { id: 'workouts', key: '@yoroi_workouts', icon: 'dumbbell', secure: false, label: 'Séances d’entraînement' },
  { id: 'sleep', key: '@yoroi_sleep_entries', icon: 'moon', secure: true, label: 'Sommeil' },
  { id: 'hydration', key: '@yoroi_hydration_log', icon: 'drop', secure: false, label: 'Hydratation' },
  { id: 'photos', key: '@yoroi_photos', icon: 'camera', secure: true, label: 'Photos de transformation' },
  { id: 'injuries', key: '@yoroi_injuries', icon: 'heart', secure: true, label: 'Blessures' },
  { id: 'mood', key: '@yoroi_mood_log', icon: 'spark', secure: true, label: 'Humeur' },
  { id: 'badges', key: '@yoroi_user_badges', icon: 'trophy', secure: false, label: 'Badges et récompenses' },
  { id: 'fasting', key: '@yoroi_fasting_history', icon: 'timer', secure: true, label: 'Jeûne' },
];

function entries(n: number): string {
  return `${n} entrée${n > 1 ? 's' : ''}`;
}

export default function PrivacyDataScreen() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [retention, setRetention] = useState('0');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const loadCounts = useCallback(async () => {
    const next: Record<string, number> = {};
    for (const cat of DATA_CATEGORIES) {
      try {
        let data: any = null;
        if (cat.secure) data = await secureStorage.getItem(cat.key);
        else {
          const raw = await AsyncStorage.getItem(cat.key);
          data = raw ? JSON.parse(raw) : null;
        }
        next[cat.id] = Array.isArray(data) ? data.length : 0;
      } catch {
        next[cat.id] = 0;
      }
      next[cat.id] += await countInDatabase(cat.id);
    }
    setCounts(next);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(DATA_RETENTION_KEY).then((v) => { if (v !== null) setRetention(v); }).catch((e) => logger.error('Erreur chargement retention:', e));
    loadCounts();
  }, [loadCounts]);

  const changeRetention = async (v: string) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setRetention(v);
    try {
      await AsyncStorage.setItem(DATA_RETENTION_KEY, v);
    } catch (e) {
      logger.error('Erreur sauvegarde retention:', e);
    }
  };

  const deleteCategory = (cat: (typeof DATA_CATEGORIES)[number]) => {
    if (saving) return;
    appAlert('Supprimer', `Supprimer toutes les données « ${cat.label} » ? C’est définitif.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            if (cat.secure) await secureStorage.removeItem(cat.key);
            else await AsyncStorage.removeItem(cat.key);
            await deleteInDatabase(cat.id);
            DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
            notificationAsync(NotificationFeedbackType.Success).catch(() => {});
            setCounts((p) => ({ ...p, [cat.id]: 0 }));
          } catch (e) {
            logger.error('Erreur suppression catégorie:', e);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const deleteAll = () => {
    if (saving) return;
    appAlert('Supprimer toutes les données', messageEffacement(Platform.OS), [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { effacerToutesMesDonnees } = await import('@/lib/storage');
            const { ok } = await effacerToutesMesDonnees();
            setCounts({});
            if (ok) {
              notificationAsync(NotificationFeedbackType.Success).catch(() => {});
              appAlert('Tout est effacé', 'L’app repart de zéro.', [
                { text: 'OK', style: 'primary', onPress: () => router.replace('/onboarding' as any) },
              ]);
            } else {
              appAlert('Effacement incomplet', 'Presque tout est effacé, mais une partie a résisté. Relance « Tout supprimer » pour finir.');
            }
          } catch (e) {
            logger.error('Erreur suppression totale:', e);
            appAlert('Oups', 'L’effacement n’a pas abouti. Réessaie.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <EspaceScreen title="Tes données" subtitle="Elles t’appartiennent.">
      <View style={{ borderRadius: 22, backgroundColor: c.darkCard, padding: 20, gap: 8, overflow: 'hidden' }}>
        <Glyph kind="sakura" size={150} color="#242833" style={{ position: 'absolute', right: -24, top: -34 }} />
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: c.goldLight, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={24} color={c.ink} stroke={2.4} />
        </View>
        <Ink size={24} weight="black" tight color={c.onDark}>Tes données t’appartiennent</Ink>
        <Ink size={14} color={c.onDarkSecondary}>Tes données de santé sont stockées sur ton téléphone. YOROI n’a aucun serveur qui les reçoit.</Ink>
      </View>

      <Card style={{ padding: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="globe" size={20} color={c.indigo} />
          <Ink size={15} weight="extraBold" style={{ flex: 1 }}>Ce qui peut sortir du téléphone</Ink>
        </View>
        <Ink size={13} color={c.textSecondary}>
          Seulement ce que tu choisis : Apple Santé ou Health Connect si tu l’autorises, ta sauvegarde si tu choisis un dossier cloud, tes exports et tes partages. Quand tu touches « Ma position » sur une séance, ton téléphone demande le nom du lieu à son service de cartes, et la position est gardée avec la séance. Le détail est dans la politique de confidentialité.
        </Ink>
      </Card>

      <MesureConfidentialite />

      {/* 18 octobre 2026 (3.0.0) : la ligne Conservation est masquee. Elle promettait de limiter la duree de garde
          de tes donnees, mais applyDataRetention (lib/storage.ts) ne nettoyait que d'anciennes cles de stockage :
          tes pesees, seances et mensurations en base n'etaient jamais concernees, alors que l'eau et le sommeil
          l'etaient. Le reglage n'etait donc pas honnete. Le code reste, a reprendre avec une vraie regle. */}
      {AFFICHER_CONSERVATION ? (
        <>
          <SectionTitle title="Conservation" sub="Combien de temps garder tes données" />
          <Segmented options={RETENTION_OPTIONS} value={retention} onChange={changeRetention} />
        </>
      ) : null}

      <SectionTitle title="Ce qui est gardé" sub={entries(total)} />
      <Card>
        {DATA_CATEGORIES.map((cat, i) => {
          const n = counts[cat.id] ?? 0;
          return (
            <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8, minHeight: 60, borderTopWidth: i ? 1 : 0, borderColor: c.divider }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={cat.icon} size={18} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={15} weight="bold">{cat.label}</Ink>
                <Ink size={12} color={c.textMuted}>{entries(n)}</Ink>
              </View>
              <Pressable
                onPress={() => deleteCategory(cat)}
                disabled={n === 0 || saving}
                accessibilityRole="button"
                accessibilityLabel={`Supprimer ${cat.label}`}
                style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.dangerTint, alignItems: 'center', justifyContent: 'center', opacity: n === 0 || saving ? 0.3 : 1 }}
              >
                <Icon name="trash" size={18} color={c.danger} />
              </Pressable>
            </View>
          );
        })}
      </Card>

      <Button tone="ink" icon="download" label="Exporter mes données" onPress={() => router.push('/export-data' as any)} />
      <Button tone="danger" icon="trash" label="Tout supprimer" onPress={deleteAll} disabled={saving} />
    </EspaceScreen>
  );
}
