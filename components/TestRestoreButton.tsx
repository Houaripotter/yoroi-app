// ============================================
// TEST RESTORE BUTTON
// Permet à l'user de vérifier qu'un backup est valide SANS modifier les données.
// Rassure sur le fait que "oui, mon backup marchera vraiment si j'en ai besoin".
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
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
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

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
        showResult(false, traduire('Fichier invalide'), traduire('Le fichier n\'est pas un JSON valide.'), size);
        return;
      }

      // Détection chiffré
      if (isEncryptedBackup(parsed)) {
        showResult(true, traduire('Backup chiffré détecté'),
          traduire('Le fichier est un backup chiffré valide.\n\n') +
          traduire("Taille : {0}\n", formatSize(size)) +
          `Algorithme : ${parsed.yoroi_encrypted === '2.0' ? 'AES-256 + HMAC' : 'AES-256 (legacy)'}\n\n` +
          traduire('Pour voir le contenu, il faudrait le mot de passe, mais le chiffrement est valide et le fichier n\'a pas été altéré.'), size);
        return;
      }

      // Validation structure
      const validation = validateBackup(parsed);
      if (!validation.valid) {
        showResult(false, 'Backup invalide', validation.errors.join('\n'), size);
        return;
      }

      // Vérif checksum si présent
      let checksumStatus = traduire('Non présent');
      if (parsed.integrity?.checksum && parsed.integrity.algorithm === 'SHA-256') {
        try {
          const { integrity, ...without } = parsed;
          const recomputed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(without));
          checksumStatus = recomputed === integrity.checksum ? traduire('Valide (intégrité OK)') : traduire('Invalide (fichier altéré !)');
          if (recomputed !== integrity.checksum) {
            showResult(false, traduire('Fichier altéré'),
              traduire('Le checksum ne correspond pas. Le fichier a été modifié ou corrompu.'), size);
            return;
          }
        } catch { /* ignore */ }
      }

      // Compute diff
      const diff = await computeBackupDiff(parsed);

      showResult(true, traduire('Backup valide et lisible'),
        traduire("Taille : {0}\n", formatSize(size)) +
        `Version : ${parsed.version ?? 'inconnue'}\n` +
        `Checksum : ${checksumStatus}\n\n` +
        traduire("Si tu le restaures maintenant :\n{0}\n\n", formatDiffMessage(diff)) +
        traduire(`Aucune donnée modifiée, c'était juste un test.`), size);
    } catch (e) {
      logger.error('[TestRestore] Erreur:', e);
      appAlert(traduire('Oups'), traduire('Ce fichier n’a pas pu être vérifié.'));
    } finally {
      setTesting(false);
    }
  };

  const showResult = (ok: boolean, title: string, msg: string, _size: number) => {
    if (ok) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    else notificationAsync(NotificationFeedbackType.Warning).catch(() => {});
    appAlert(title, msg, [{ text: 'OK' }]);
  };

  return (
    <TouchableOpacity
      onPress={handleTest}
      disabled={testing}
      activeOpacity={0.8}
      style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: '#10B98140' }]}
      accessibilityLabel={traduire("Tester un backup sans modifier les données")}
      accessibilityRole="button"
    >
      <View style={styles.iconWrap}>
        {testing ? <ActivityIndicator size="small" color="#10B981" /> : <ClipboardCheck size={18} color="#10B981" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          {testing ? traduire('Vérification en cours…') : traduire('Tester un backup (dry run)')}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted ?? '#888' }]}>
          {traduire("Vérifie qu'un fichier est valide SANS modifier tes données actuelles.")}</Text>
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
