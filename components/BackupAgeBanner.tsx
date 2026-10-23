// ============================================
// BACKUP AGE BANNER
// Banner à mettre sur l'accueil qui alerte l'utilisateur si son dernier
// backup date de plus de 7 jours (ou jamais fait).
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, DeviceEventEmitter } from 'react-native';
import { AlertTriangle, Shield, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { getLastAutoBackupDate, runAutoBackupIfDue } from '@/lib/autoBackupService';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const WARNING_DAYS = 7;
const CRITICAL_DAYS = 14;
// Masquer le banner les 48 premières heures après installation, évite le stress
// "Aucune sauvegarde" pour un nouvel user qui n'a même pas encore de données.
const GRACE_PERIOD_HOURS = 48;
const INSTALL_DATE_KEY = '@yoroi_install_date';

const BackupAgeBannerInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [withinGracePeriod, setWithinGracePeriod] = useState(false);

  const loadLast = useCallback(async () => {
    // Check la date d'install pour la grace period
    try {
      const raw = await AsyncStorage.getItem(INSTALL_DATE_KEY);
      if (!raw) {
        // Premier lancement → on marque l'install maintenant
        await AsyncStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
        setWithinGracePeriod(true);
      } else {
        const installDate = new Date(raw);
        const hoursSinceInstall = (Date.now() - installDate.getTime()) / (1000 * 60 * 60);
        setWithinGracePeriod(hoursSinceInstall < GRACE_PERIOD_HOURS);
      }
    } catch {
      setWithinGracePeriod(false);
    }

    const d = await getLastAutoBackupDate();
    setLastBackup(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLast();
    const sub = DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_DONE', loadLast);
    return () => sub.remove();
  }, [loadLast]);

  if (loading) return null;

  // Grace period : on ne stresse pas les nouveaux users
  if (withinGracePeriod && !lastBackup) return null;

  // Calcul de l'âge
  const daysSince = lastBackup
    ? Math.floor((Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Pas de banner si backup < 7 jours
  if (daysSince !== null && daysSince < WARNING_DAYS) return null;

  const isCritical = daysSince === null || daysSince >= CRITICAL_DAYS;
  const color = isCritical ? '#EF4444' : '#F59E0B';
  const bg = isCritical ? '#FEF2F2' : '#FEF3C7';
  const bgDark = isCritical ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)';

  const message = daysSince === null
    ? 'Aucune sauvegarde créée'
    : `Dernière sauvegarde il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}`;

  const cta = isCritical ? 'Sauvegarder maintenant' : 'Faire une sauvegarde';

  const handlePress = async () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setTriggering(true);
    try {
      // On tente d'abord un backup silent rapide
      const ok = await runAutoBackupIfDue();
      if (!ok) {
        // Si rien n'a été fait (pas dû par le timer), on va vers la page backup-history
        router.push('/backup-history');
      } else {
        await loadLast();
      }
    } catch (e) {
      logger.error('[BackupAgeBanner] Erreur:', e);
      router.push('/backup-history');
    } finally {
      setTriggering(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: isDark ? bgDark : bg, borderLeftColor: color }]}
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={triggering}
      accessibilityLabel={`${message}. Appuie pour ${cta.toLowerCase()}.`}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        {isCritical ? (
          <AlertTriangle size={18} color={color} strokeWidth={2.5} />
        ) : (
          <Shield size={18} color={color} strokeWidth={2.5} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color }]}>{message}</Text>
        <Text style={[styles.cta, { color: colors.text }]}>
          {triggering ? 'Sauvegarde en cours…' : cta}
        </Text>
      </View>
      <ChevronRight size={16} color={color} />
    </TouchableOpacity>
  );
};

export const BackupAgeBanner = React.memo(BackupAgeBannerInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  cta: { fontSize: 13, fontWeight: '600', marginTop: 1 },
});
