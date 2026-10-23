// ============================================
// BACKUP ENCRYPTION TOGGLE
// Switch pour activer/désactiver le chiffrement AES-256 des backups.
// À placer dans la page "Mes sauvegardes" (backup-history).
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
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
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

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

  // Saisie du mot de passe : fenetre maison YOROI (appPassword)
  const askPassword = (mode: 'activate' | 'change'): Promise<string | null> => {
    return promptPassword({
      title: mode === 'activate' ? traduire('Active le chiffrement') : traduire('Nouveau mot de passe'),
      message: traduire('Choisis un mot de passe solide, 8 caractères au moins.\n\nSi tu l’oublies, tes prochaines sauvegardes ne pourront pas être restaurées.'),
      confirmLabel: traduire('Valider'),
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
        appAlert(traduire('Mot de passe trop court'), traduire('Il faut au moins 8 caractères.'));
        return;
      }

      // Confirmation du mot de passe (cross-platform)
      const confirm = await promptPassword({
        title: traduire('Confirme le mot de passe'),
        message: traduire('Retape le même mot de passe pour être sûr.'),
        confirmLabel: traduire('Confirmer'),
        minLength: 8,
      });
      if (!confirm) return;
      if (confirm !== pwd) {
        appAlert(traduire('Mots de passe différents'), traduire('Réessaie.'));
        return;
      }

      try {
        await setStoredEncryptionPassword(pwd);
        await setBackupEncryptionEnabled(true);
        setEnabled(true);
        setHasPassword(true);
        appAlert(
          traduire('Chiffrement activé'),
          traduire('Tes prochaines sauvegardes seront protégées par ce mot de passe. Garde-le en lieu sûr, il te sera demandé pour les restaurer.')
        );
      } catch (e) {
        logger.error('[BackupEncryption] Erreur activation:', e);
        appAlert(traduire('Oups'), traduire('Le chiffrement n’a pas pu être activé.'));
      }
    } else {
      // Désactivation : confirmation
      const confirmed = await new Promise<boolean>((resolve) => {
        appAlert(
          traduire('Désactiver le chiffrement ?'),
          traduire('Tes prochaines sauvegardes ne seront plus protégées. Les anciennes restent protégées : garde le mot de passe pour les restaurer.'),
          [
            { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
            { text: traduire('Désactiver'), style: 'destructive', onPress: () => resolve(true) },
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
      appAlert(traduire('Mot de passe trop court'), traduire('Il faut au moins 8 caractères.'));
      return;
    }
    await setStoredEncryptionPassword(pwd);
    appAlert(
      traduire('Mot de passe changé'),
      traduire('Tes prochaines sauvegardes utiliseront ce nouveau mot de passe.')
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
          <Text style={[styles.title, { color: colors.text }]}>{traduire("Chiffrement AES-256")}</Text>
          <Text style={[styles.sub, { color: colors.textMuted ?? '#888' }]}>
            {enabled
              ? traduire('Tes backups sont protégés par mot de passe')
              : traduire('Backups en clair, quiconque peut les ouvrir')}
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
          accessibilityLabel={traduire("Changer le mot de passe de chiffrement")}
        >
          <Key size={13} color={accent} />
          <Text style={[styles.changeBtnText, { color: accent }]}>{traduire("Changer le mot de passe")}</Text>
        </TouchableOpacity>
      )}
      {/* Saisie du mot de passe : fenetre maison YOROI */}
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
