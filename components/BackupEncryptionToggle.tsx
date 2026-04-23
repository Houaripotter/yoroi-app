// ============================================
// BACKUP ENCRYPTION TOGGLE
// Switch pour activer/désactiver le chiffrement AES-256 des backups.
// À placer dans la page "Mes sauvegardes" (backup-history).
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Lock, Unlock, Key } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  isBackupEncryptionEnabled,
  setBackupEncryptionEnabled,
  setStoredEncryptionPassword,
  getStoredEncryptionPassword,
  clearStoredEncryptionPassword,
} from '@/lib/backupEncryption';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import logger from '@/lib/security/logger';
import { usePasswordPrompt } from './PasswordPromptModal';

const BackupEncryptionToggleInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const { prompt: promptPassword, PromptElement } = usePasswordPrompt();

  const refresh = useCallback(async () => {
    const [e, pwd] = await Promise.all([
      isBackupEncryptionEnabled(),
      getStoredEncryptionPassword(),
    ]);
    setEnabled(e);
    setHasPassword(!!pwd);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Cross-platform (iOS + Android) via modal custom au lieu de Alert.prompt (iOS only)
  const askPassword = (mode: 'activate' | 'change'): Promise<string | null> => {
    return promptPassword({
      title: mode === 'activate' ? '🔒 Active le chiffrement' : '🔑 Nouveau mot de passe',
      message: "Choisis un mot de passe fort (minimum 8 caractères).\n\n⚠️ Si tu l'oublies, tes futurs backups seront impossibles à restaurer.",
      confirmLabel: 'Valider',
      minLength: 8,
    });
  };

  const handleToggle = async (newValue: boolean) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});

    if (newValue) {
      // Activation : demander le mot de passe
      const pwd = await askPassword('activate');
      if (!pwd) return;
      if (pwd.length < 8) {
        Alert.alert('Mot de passe trop court', 'Minimum 8 caractères requis.');
        return;
      }

      // Confirmation du mot de passe (cross-platform)
      const confirm = await promptPassword({
        title: 'Confirme le mot de passe',
        message: 'Retape le même mot de passe pour être sûr.',
        confirmLabel: 'Confirmer',
        minLength: 8,
      });
      if (!confirm) return;
      if (confirm !== pwd) {
        Alert.alert('Mots de passe différents', 'Réessaie.');
        return;
      }

      try {
        await setStoredEncryptionPassword(pwd);
        await setBackupEncryptionEnabled(true);
        setEnabled(true);
        setHasPassword(true);
        Alert.alert(
          '✅ Chiffrement activé',
          'Tes prochains backups seront chiffrés avec AES-256. Garde ton mot de passe en lieu sûr · il sera demandé à la restauration.'
        );
      } catch (e) {
        logger.error('[BackupEncryption] Erreur activation:', e);
        Alert.alert('Erreur', "Impossible d'activer le chiffrement.");
      }
    } else {
      // Désactivation : confirmation
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Désactiver le chiffrement ?',
          'Tes prochains backups seront en clair. Les anciens backups chiffrés resteront chiffrés (et tu auras toujours besoin du mot de passe pour les restaurer).',
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Désactiver', style: 'destructive', onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;

      await setBackupEncryptionEnabled(false);
      await clearStoredEncryptionPassword();
      setEnabled(false);
      setHasPassword(false);
    }
  };

  const handleChangePassword = async () => {
    const pwd = await askPassword('change');
    if (!pwd) return;
    if (pwd.length < 8) {
      Alert.alert('Mot de passe trop court', 'Minimum 8 caractères requis.');
      return;
    }
    await setStoredEncryptionPassword(pwd);
    Alert.alert(
      '✅ Mot de passe changé',
      'Les backups créés à partir de maintenant utiliseront ce nouveau mot de passe.'
    );
  };

  if (loading) return null;

  const accent = enabled ? '#0EA5E9' : '#6B7280';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: colors.border ?? '#E5E7EB' }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}20` }]}>
          {enabled ? <Lock size={18} color={accent} /> : <Unlock size={18} color={accent} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Chiffrement AES-256</Text>
          <Text style={[styles.sub, { color: colors.textMuted ?? '#888' }]}>
            {enabled
              ? 'Tes backups sont protégés par mot de passe'
              : 'Backups en clair · quiconque peut les ouvrir'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: '#767577', true: accent + '60' }}
          thumbColor={enabled ? accent : '#f4f3f4'}
        />
      </View>

      {enabled && hasPassword && (
        <TouchableOpacity
          onPress={handleChangePassword}
          activeOpacity={0.7}
          style={[styles.changeBtn, { borderColor: `${accent}40` }]}
          accessibilityLabel="Changer le mot de passe de chiffrement"
        >
          <Key size={13} color={accent} />
          <Text style={[styles.changeBtnText, { color: accent }]}>Changer le mot de passe</Text>
        </TouchableOpacity>
      )}
      {/* Modal custom cross-platform (remplace Alert.prompt iOS-only) */}
      {PromptElement}
    </View>
  );
};

// Export memoizé pour éviter les re-renders inutiles
export const BackupEncryptionToggle = React.memo(BackupEncryptionToggleInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginTop: 10, padding: 14,
    borderRadius: 12, borderWidth: 1, gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8, borderWidth: 1,
  },
  changeBtnText: { fontSize: 12, fontWeight: '700' },
});
