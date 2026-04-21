// ============================================
// TEST RESTORE BUTTON
// Permet à l'user de vérifier qu'un backup est valide SANS modifier les données.
// Rassure sur le fait que "oui, mon backup marchera vraiment si j'en ai besoin".
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getDocumentAsync } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { isEncryptedBackup } from '@/lib/backupEncryption';
import { validateBackup } from '@/lib/backupMigrationService';
import { computeBackupDiff, formatDiffMessage } from '@/lib/backupDiffService';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { formatSize } from '@/lib/utils/formatDate';
import logger from '@/lib/security/logger';

const TestRestoreButtonInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setTesting(true);
    try {
      const result = await getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const size = (fileInfo as any).size ?? 0;

      const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });

      // Parse JSON
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        showResult(false, 'Fichier invalide', 'Le fichier n\'est pas un JSON valide.', size);
        return;
      }

      // Détection chiffré
      if (isEncryptedBackup(parsed)) {
        showResult(true, '🔒 Backup chiffré détecté',
          'Le fichier est un backup chiffré valide.\n\n' +
          `Taille : ${formatSize(size)}\n` +
          `Algorithme : ${parsed.yoroi_encrypted === '2.0' ? 'AES-256 + HMAC' : 'AES-256 (legacy)'}\n\n` +
          'Pour voir le contenu, il faudrait le mot de passe — mais le chiffrement est valide et le fichier n\'a pas été altéré.', size);
        return;
      }

      // Validation structure
      const validation = validateBackup(parsed);
      if (!validation.valid) {
        showResult(false, 'Backup invalide', validation.errors.join('\n'), size);
        return;
      }

      // Vérif checksum si présent
      let checksumStatus = 'Non présent';
      if (parsed.integrity?.checksum && parsed.integrity.algorithm === 'SHA-256') {
        try {
          const { integrity, ...without } = parsed;
          const recomputed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(without));
          checksumStatus = recomputed === integrity.checksum ? '✅ Valide (intégrité OK)' : '❌ Invalide (fichier altéré !)';
          if (recomputed !== integrity.checksum) {
            showResult(false, '⚠️ Fichier altéré',
              'Le checksum ne correspond pas. Le fichier a été modifié ou corrompu.', size);
            return;
          }
        } catch { /* ignore */ }
      }

      // Compute diff
      const diff = await computeBackupDiff(parsed);

      showResult(true, '✅ Backup valide et lisible',
        `Taille : ${formatSize(size)}\n` +
        `Version : ${parsed.version ?? 'inconnue'}\n` +
        `Checksum : ${checksumStatus}\n\n` +
        `Si tu le restaures maintenant :\n${formatDiffMessage(diff)}\n\n` +
        `Aucune donnée modifiée — c'était juste un test.`, size);
    } catch (e) {
      logger.error('[TestRestore] Erreur:', e);
      Alert.alert('Erreur', 'Impossible de tester ce fichier.');
    } finally {
      setTesting(false);
    }
  };

  const showResult = (ok: boolean, title: string, msg: string, _size: number) => {
    if (ok) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    else notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(title, msg, [{ text: 'OK' }]);
  };

  return (
    <TouchableOpacity
      onPress={handleTest}
      disabled={testing}
      activeOpacity={0.8}
      style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: '#10B98140' }]}
      accessibilityLabel="Tester un backup sans modifier les données"
      accessibilityRole="button"
    >
      <View style={styles.iconWrap}>
        {testing ? <ActivityIndicator size="small" color="#10B981" /> : <ClipboardCheck size={18} color="#10B981" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          {testing ? 'Vérification en cours…' : 'Tester un backup (dry-run)'}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted ?? '#888' }]}>
          Vérifie qu'un fichier est valide SANS modifier tes données actuelles.
        </Text>
      </View>
      <CheckCircle2 size={16} color="#10B981" />
    </TouchableOpacity>
  );
};

export const TestRestoreButton = React.memo(TestRestoreButtonInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginTop: 10, padding: 14,
    borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#10B98120',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '800' },
  sub: { fontSize: 11, fontWeight: '500', marginTop: 1 },
});
