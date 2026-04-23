// ============================================
// DATA PRIVACY CARD · Rassurer l'user sur le stockage local
// ============================================
// Explique clairement :
//  - Les donnees sont chez lui (local-first)
//  - iCloud les sauvegarde automatiquement
//  - Il peut exporter / importer quand il veut
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Shield, Cloud, Download, Upload, HardDrive } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import { exportDataToJSON, importDataFromJSON } from '@/lib/exportService';
import logger from '@/lib/security/logger';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

async function computeAppStorageSize(): Promise<number> {
  try {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) return 0;
    let total = 0;
    const queue: string[] = [docDir];
    while (queue.length > 0) {
      const dir = queue.shift()!;
      const files = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
      for (const f of files) {
        const path = `${dir}${f}`;
        const info = await FileSystem.getInfoAsync(path).catch(() => null);
        if (!info || !info.exists) continue;
        if (info.isDirectory) {
          queue.push(`${path}/`);
        } else {
          total += info.size || 0;
        }
      }
    }
    return total;
  } catch (e) {
    logger.warn('[DataPrivacy] size error', e);
    return 0;
  }
}

export const DataPrivacyCard: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [storageSize, setStorageSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    computeAppStorageSize().then(setStorageSize);
  }, []);

  const handleExport = async () => {
    lightHaptic().catch(() => {});
    setLoading(true);
    try {
      const ok = await exportDataToJSON({ includePhotos: true });
      if (ok) successHaptic().catch(() => {});
      else errorHaptic().catch(() => {});
    } catch (e) {
      logger.error('[DataPrivacy] export error', e);
      errorHaptic().catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    lightHaptic().catch(() => {});
    Alert.alert(
      'Restaurer mes donnees',
      'Cette operation va remplacer tes donnees actuelles par celles du fichier. A utiliser seulement pour une restauration complete.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const ok = await importDataFromJSON();
              if (ok) successHaptic().catch(() => {});
              else errorHaptic().catch(() => {});
            } catch (e) {
              logger.error('[DataPrivacy] import error', e);
              errorHaptic().catch(() => {});
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      {/* Hero privacy */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: '#10B98122' }]}>
          <Shield size={24} color="#10B981" strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Tes donnees sont chez toi</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            Aucun serveur, aucun compte, aucune collecte. Tout reste sur ton iPhone.
          </Text>
        </View>
      </View>

      {/* Info rows */}
      <View style={[styles.infoRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <HardDrive size={16} color={colors.textMuted} />
        <Text style={[styles.infoLabel, { color: colors.text }]}>Stockage local</Text>
        <Text style={[styles.infoValue, { color: colors.textMuted }]}>
          {storageSize != null ? formatBytes(storageSize) : '...'}
        </Text>
      </View>
      <View style={[styles.infoRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        <Cloud size={16} color={colors.textMuted} />
        <Text style={[styles.infoLabel, { color: colors.text }]}>Sauvegarde iCloud</Text>
        <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '700' }]}>Active</Text>
      </View>
      <Text style={[styles.hint, { color: colors.textMuted, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
        Si iCloud est active dans tes reglages iPhone, Yoroi est sauvegarde automatiquement. Aucune configuration a faire.
      </Text>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={handleExport}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.actionBtn, { backgroundColor: colors.accent, opacity: loading ? 0.5 : 1 }]}
        >
          <Download size={16} color={colors.textOnGold} />
          <Text style={[styles.actionText, { color: colors.textOnGold }]}>Exporter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleImport}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', opacity: loading ? 0.5 : 1 }]}
        >
          <Upload size={16} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>Restaurer</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: colors.textMuted }]}>
        L'export inclut toutes tes donnees + photos dans un seul fichier JSON. Tu peux le stocker ou tu veux (Drive, Dropbox, mail, cle USB).
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 16, fontWeight: '800' },
  heroSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  infoLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 13 },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    marginBottom: 12,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  footer: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default React.memo(DataPrivacyCard);
