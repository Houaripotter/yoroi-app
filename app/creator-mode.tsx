// ============================================
// CREATOR MODE · page centrale pour tout le mode créateur
// - Sélection profil démo (Houari, Louis, Hédi, Yanis)
// - Choix période (3 mois, 6 mois, 1 an)
// - Toggle mode screenshot propre
// - Toggle fake status bar (09:41 App Store style)
// - Accès au Marketing Kit (séquence narrative d'export)
// Accessible uniquement si DevMode activé.
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Switch, DeviceEventEmitter,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft, User, Calendar, Camera, Smartphone, Sparkles,
  RotateCcw, CheckCircle2, Shield, Clapperboard,
} from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import {
  generateDemoProfile,
  restoreRealData,
  isDemoDataActive,
  getActiveDemoProfile,
  switchToProfile,
  regenerateProfile,
  listProfileSnapshots,
  deleteProfileSnapshot,
  generateAllProfiles,
  type ProfileSnapshotInfo,
} from '@/lib/demoDataService';
import {
  DEMO_PROFILES,
  DEMO_PROFILE_KEYS,
  periodLabel,
  type DemoPeriod,
} from '@/lib/demoProfiles';
import logger from '@/lib/security/logger';

const PERIODS: DemoPeriod[] = ['3mo', '6mo', '1y'];

export default function CreatorModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { isDevMode } = useDevMode();
  const {
    isScreenshotMode,
    useFakeStatusBar,
    toggleScreenshotMode,
    toggleFakeStatusBar,
  } = useScreenshotMode();

  const [selectedProfile, setSelectedProfile] = useState<string>('houari');
  const [selectedPeriod, setSelectedPeriod] = useState<DemoPeriod>('6mo');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [activeProfile, setActiveProfile] = useState<{ profileKey: string; period: DemoPeriod } | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, ProfileSnapshotInfo>>({});

  const loadActiveProfile = useCallback(async () => {
    const [active, snaps] = await Promise.all([
      getActiveDemoProfile(),
      listProfileSnapshots(),
    ]);
    setActiveProfile(active);
    setSnapshots(snaps);
    if (active) {
      setSelectedProfile(active.profileKey);
      setSelectedPeriod(active.period);
    }
  }, []);

  useEffect(() => { loadActiveProfile(); }, [loadActiveProfile]);

  // Redirection si pas en DevMode (mais on accepte aussi l'ancien flag @yoroi_screenshot_menu_unlocked)
  useEffect(() => {
    (async () => {
      if (isDevMode) return; // déjà OK
      // Fallback : si l'user a unlock via settings (ancien système), on accepte
      try {
        const legacyUnlock = await (await import('@react-native-async-storage/async-storage')).default.getItem('@yoroi_screenshot_menu_unlocked');
        if (legacyUnlock === 'true') {
          // Sync : active DevMode aussi pour les prochaines fois
          await (await import('@react-native-async-storage/async-storage')).default.setItem('@yoroi_dev_mode', 'true');
          return;
        }
      } catch {}
      // Ni DevMode ni legacy : retour en arrière
      if (isDevMode === false) {
        router.back();
      }
    })();
  }, [isDevMode, router]);

  const handleGenerate = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    try {
      const result = await regenerateProfile(selectedProfile, selectedPeriod);
      await loadActiveProfile();
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
      Alert.alert(
        'Profil généré',
        `${DEMO_PROFILES[selectedProfile].name} · ${periodLabel(selectedPeriod)}\n\n${result.workouts} séances · ${result.weights} pesées · ${result.combats} combats · ${result.partners} partenaires\n\nSnapshot sauvegardé.`,
        [{ text: 'OK', style: 'default' }],
      );
    } catch (e) {
      logger.error('[CreatorMode] generate error', e);
      Alert.alert('Erreur', 'Impossible de générer le profil démo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwitchToProfile = async (profileKey: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsSwitching(profileKey);
    try {
      const { fromSnapshot, stats } = await switchToProfile(profileKey, selectedPeriod);
      await loadActiveProfile();
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
      Alert.alert(
        fromSnapshot ? 'Switch instantané' : 'Profil généré',
        `${DEMO_PROFILES[profileKey].name} actif\n\n${stats.workouts} séances · ${stats.partners} partenaires · ${stats.combats} combats`,
      );
    } catch (e) {
      logger.error('[CreatorMode] switch error', e);
      Alert.alert('Erreur', 'Impossible de charger ce profil.');
    } finally {
      setIsSwitching(null);
    }
  };

  const handleBatchGenerate = async () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    setIsBatchGenerating(true);
    try {
      await generateAllProfiles(selectedPeriod, (profileKey, current, total) => {
        setBatchProgress({ current, total, name: DEMO_PROFILES[profileKey].name });
      });
      await loadActiveProfile();
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
      Alert.alert(
        'Batch terminé',
        `Les 4 profils ont été générés et sauvegardés.\nTu peux switcher entre eux instantanément.`,
      );
    } catch (e) {
      logger.error('[CreatorMode] batch error', e);
      Alert.alert('Erreur', 'Erreur pendant la génération batch.');
    } finally {
      setIsBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  const handleDeleteSnapshot = (profileKey: string) => {
    Alert.alert(
      'Supprimer le snapshot ?',
      `${DEMO_PROFILES[profileKey].name} devra être regénéré la prochaine fois.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteProfileSnapshot(profileKey);
            await loadActiveProfile();
          },
        },
      ],
    );
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restaurer vraies données',
      'Les données démo seront supprimées et tes vraies données reviendront. Confirmer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            impactAsync(ImpactFeedbackStyle.Heavy);
            setIsRestoring(true);
            try {
              await restoreRealData();
              await loadActiveProfile();
              DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
              DeviceEventEmitter.emit('YOROI_PARTNERS_CHANGED');
              DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
              Alert.alert('Restauré', 'Tes vraies données sont de retour.');
            } catch (e) {
              logger.error('[CreatorMode] restore error', e);
              Alert.alert('Erreur', 'Impossible de restaurer les vraies données.');
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ],
    );
  };

  const cardBg = colors.backgroundCard;
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const busy = isGenerating || isRestoring || isSwitching !== null || isBatchGenerating;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Mode Créateur</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Outils de production marketing
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Banner profil actif ── */}
        {activeProfile && (
          <View style={[styles.activeBanner, { backgroundColor: '#22C55E15', borderColor: '#22C55E' }]}>
            <CheckCircle2 size={18} color="#22C55E" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: '#22C55E' }}>
                Profil actif : {DEMO_PROFILES[activeProfile.profileKey]?.name ?? activeProfile.profileKey}
              </Text>
              <Text style={{ fontSize: 11, color: '#22C55E', opacity: 0.8 }}>
                Période : {periodLabel(activeProfile.period)}
              </Text>
            </View>
          </View>
        )}

        {/* ── 1. SÉLECTION PROFIL ── */}
        <SectionTitle colors={colors} icon={<User size={14} color={colors.accent} />} title="Profils démo · tape pour charger" />
        <View style={{ gap: 8 }}>
          {DEMO_PROFILE_KEYS.map(key => {
            const p = DEMO_PROFILES[key];
            const selected = selectedProfile === key;
            const isActiveProfile = activeProfile?.profileKey === key;
            const snapshot = snapshots[key];
            const isSaved = snapshot?.exists;
            const switching = isSwitching === key;

            return (
              <View key={key}>
                <TouchableOpacity
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Medium);
                    setSelectedProfile(key);
                    if (busy) return;
                    // Si déjà actif : rien à faire
                    if (isActiveProfile) return;
                    // Si snapshot existe → switch instantané
                    if (isSaved) {
                      handleSwitchToProfile(key);
                    } else {
                      // Pas encore de snapshot → génère directement avec la période sélectionnée
                      handleSwitchToProfile(key);
                    }
                  }}
                  onLongPress={() => { if (isSaved) handleDeleteSnapshot(key); }}
                  delayLongPress={600}
                  disabled={busy}
                  activeOpacity={0.75}
                  style={[styles.profileCard, {
                    backgroundColor: selected ? colors.accent + '15' : cardBg,
                    borderColor: isActiveProfile ? '#22C55E' : (selected ? colors.accent : borderColor),
                    borderWidth: isActiveProfile ? 2 : (selected ? 2 : 1),
                    opacity: busy && !switching ? 0.5 : 1,
                  }]}
                >
                  <View style={[styles.profileBadge, { backgroundColor: beltColor(p.belt) }]}>
                    <Text style={styles.profileInitial}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.profileName, { color: colors.text }]}>{p.name}</Text>
                      <View style={[styles.beltChip, { backgroundColor: beltColor(p.belt) }]}>
                        <Text style={styles.beltChipText}>
                          {p.belt.toUpperCase()}{p.beltStripes ? ` ${p.beltStripes}g` : ''}
                        </Text>
                      </View>
                      {isActiveProfile && (
                        <View style={{ backgroundColor: '#22C55E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 }}>ACTIF</Text>
                        </View>
                      )}
                      {isSaved && !isActiveProfile && (
                        <View style={{ backgroundColor: '#3B82F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 }}>SAUVÉ</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.profileBio, { color: colors.textMuted }]} numberOfLines={2}>
                      {p.bio}
                    </Text>
                    <Text style={[styles.profileMeta, { color: colors.textMuted }]}>
                      {p.startWeight !== p.currentWeight
                        ? `${p.startWeight}kg → ${p.currentWeight}kg (objectif ${p.targetWeight}kg)`
                        : `${p.currentWeight}kg`} · {p.roster.length} partenaires
                    </Text>
                    {isSaved && snapshot.stats && (
                      <Text style={[styles.profileMeta, { color: '#3B82F6', fontWeight: '700' }]}>
                        {snapshot.stats.workouts} séances · {snapshot.stats.combats} combats · {periodLabel(snapshot.period!)}
                      </Text>
                    )}
                  </View>
                  {selected && <CheckCircle2 size={20} color={colors.accent} />}
                </TouchableOpacity>

                {/* Indicateur de chargement en cours */}
                {switching && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>
                      Chargement de {p.name}...
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Astuces */}
        <View style={{ marginTop: 10, gap: 3, padding: 10, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
          <Text style={{ fontSize: 11, color: colors.text, textAlign: 'center', fontWeight: '700' }}>
            👆 Tape sur un profil pour le charger
          </Text>
          <Text style={{ fontSize: 10, color: colors.textMuted, fontStyle: 'italic', textAlign: 'center' }}>
            Choisis d'abord la période ci-dessous, puis tape un profil. Appui long pour supprimer un snapshot.
          </Text>
        </View>

        {/* ── 2. PÉRIODE ── */}
        <SectionTitle colors={colors} icon={<Calendar size={14} color={colors.accent} />} title="Période de génération" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERIODS.map(p => {
            const active = selectedPeriod === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setSelectedPeriod(p); }}
                activeOpacity={0.85}
                style={[styles.periodChip, {
                  backgroundColor: active ? colors.accent : cardBg,
                  borderColor: active ? colors.accent : borderColor,
                }]}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: '900',
                  color: active ? '#fff' : colors.text,
                  textAlign: 'center',
                  letterSpacing: 0.3,
                }}>
                  {periodLabel(p)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── 3. GÉNÉRER LE PROFIL SÉLECTIONNÉ ── */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={busy}
          activeOpacity={0.85}
          style={[styles.primaryBtn, {
            backgroundColor: busy ? colors.textMuted : colors.accent,
            marginTop: 20,
          }]}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Sparkles size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {snapshots[selectedProfile]?.exists ? 'Régénérer' : 'Générer'} {DEMO_PROFILES[selectedProfile]?.name} · {periodLabel(selectedPeriod)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Générer les 4 profils en batch ── */}
        <TouchableOpacity
          onPress={handleBatchGenerate}
          disabled={busy}
          activeOpacity={0.85}
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: '#A855F7',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {isBatchGenerating ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>
                {batchProgress ? `${batchProgress.current}/${batchProgress.total} · ${batchProgress.name}` : 'Génération...'}
              </Text>
            </>
          ) : (
            <>
              <Sparkles size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 }}>
                Générer les 4 profils ({periodLabel(selectedPeriod)})
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Restaurer ── */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={busy || !activeProfile}
          activeOpacity={0.85}
          style={[styles.secondaryBtn, {
            backgroundColor: cardBg,
            borderColor: '#EF444444',
            opacity: (busy || !activeProfile) ? 0.5 : 1,
            marginTop: 8,
          }]}
        >
          {isRestoring ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <>
              <RotateCcw size={16} color="#EF4444" />
              <Text style={[styles.secondaryBtnText, { color: '#EF4444' }]}>
                Restaurer mes vraies données
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── 4. MODE SCREENSHOT ── */}
        <SectionTitle colors={colors} icon={<Camera size={14} color="#F59E0B" />} title="3. Mode screenshot propre" />

        <View style={[styles.toggleCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Masquer les éléments créateur</Text>
            <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
              Cache les badges DevMode, boutons debug, toasts dev
            </Text>
          </View>
          <Switch
            value={isScreenshotMode}
            onValueChange={toggleScreenshotMode}
            trackColor={{ false: '#767577', true: '#F59E0B' }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.toggleCard, { backgroundColor: cardBg, borderColor, marginTop: 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Status bar 09:41 (App Store)</Text>
            <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
              Overlay heure 09:41 + batterie pleine + signal plein
            </Text>
          </View>
          <Switch
            value={useFakeStatusBar}
            onValueChange={toggleFakeStatusBar}
            disabled={!isScreenshotMode}
            trackColor={{ false: '#767577', true: '#F59E0B' }}
            thumbColor="#fff"
          />
        </View>

        {/* ── 5. MARKETING KIT ── */}
        <SectionTitle colors={colors} icon={<Clapperboard size={14} color="#A855F7" />} title="4. Marketing Kit" />

        <TouchableOpacity
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/marketing-kit' as any); }}
          activeOpacity={0.85}
          style={[styles.marketingKitCard, { backgroundColor: cardBg, borderColor }]}
        >
          <View style={[styles.marketingKitIcon, { backgroundColor: '#A855F718' }]}>
            <Clapperboard size={22} color="#A855F7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.marketingKitTitle, { color: colors.text }]}>Séquence narrative</Text>
            <Text style={[styles.marketingKitDesc, { color: colors.textMuted }]}>
              Guide pas-à-pas pour capturer 5-6 écrans marketing cohérents (Home → Stats → Sparring → Séance → Techniques → Before/After)
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── Infos sécurité ── */}
        <View style={[styles.infoBox, { backgroundColor: '#3B82F615', borderColor: '#3B82F644', marginTop: 20 }]}>
          <Shield size={14} color="#3B82F6" />
          <Text style={{ flex: 1, fontSize: 11, color: '#3B82F6', lineHeight: 16 }}>
            Tes vraies données sont toujours sauvegardées avant d'activer un profil démo. La restauration est instantanée et complète.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

function SectionTitle({ colors, icon, title }: { colors: any; icon: React.ReactNode; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, marginBottom: 10 }}>
      {icon}
      <Text style={{ fontSize: 11, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6 }}>
        {title.toUpperCase()}
      </Text>
    </View>
  );
}

function beltColor(belt: string): string {
  const map: Record<string, string> = {
    blanche: '#D4D4D8',
    bleue: '#3B82F6',
    violette: '#8B5CF6',
    marron: '#92400E',
    noire: '#1F2937',
  };
  return map[belt.toLowerCase()] ?? '#6B7280';
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 11, textAlign: 'center' },

  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: { color: '#fff', fontSize: 20, fontWeight: '900' },
  profileName: { fontSize: 15, fontWeight: '900' },
  profileBio: { fontSize: 11, marginTop: 2, lineHeight: 14 },
  profileMeta: { fontSize: 10, marginTop: 3, fontWeight: '600' },
  beltChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  beltChipText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },

  periodChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '800' },

  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 14, fontWeight: '800' },
  toggleDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  marketingKitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  marketingKitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketingKitTitle: { fontSize: 14, fontWeight: '900' },
  marketingKitDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
