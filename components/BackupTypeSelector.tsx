// ============================================
// BACKUP TYPE SELECTOR
// Permet à l'user de choisir entre 2 types de backup :
//  - Complet (avec photos) : ~5-50 MB, idéal pour restauration totale
//  - Léger (sans photos)   : ~100-500 KB, idéal pour envoi email, cloud limité
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image as ImageIcon, FileText, Download } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON } from '@/lib/exportService';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

const BackupTypeSelectorInner: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [exporting, setExporting] = useState<'full' | 'light' | null>(null);

  const runExport = async (type: 'full' | 'light') => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setExporting(type);
    try {
      const ok = await exportDataToJSON({
        silent: false,
        includePhotos: type === 'full',
      });
      if (!ok) {
        appAlert(traduire('Oups'), traduire('La sauvegarde n’a pas pu être créée.'));
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: colors.border ?? '#E5E7EB' }]}>
      <Text style={[styles.title, { color: colors.text }]}>{traduire("Type de sauvegarde")}</Text>

      {/* Complet (avec photos) */}
      <TouchableOpacity
        onPress={() => runExport('full')}
        disabled={!!exporting}
        activeOpacity={0.8}
        style={[styles.option, { borderColor: '#0EA5E940', backgroundColor: isDark ? 'rgba(14,165,233,0.08)' : '#F0F9FF' }]}
        accessibilityLabel={traduire("Sauvegarde complète avec photos")}
        accessibilityRole="button"
      >
        <View style={[styles.iconWrap, { backgroundColor: '#0EA5E920' }]}>
          <ImageIcon size={20} color="#0EA5E9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{traduire("Complète (avec photos)")}</Text>
          <Text style={[styles.optionSub, { color: colors.textMuted ?? '#888' }]}>
            {traduire("Tout : données + photos profil/clubs/transformation. Taille : 5-50 MB.")}</Text>
        </View>
        {exporting === 'full' ? (
          <ActivityIndicator color="#0EA5E9" size="small" />
        ) : (
          <Download size={16} color="#0EA5E9" />
        )}
      </TouchableOpacity>

      {/* Léger (sans photos) */}
      <TouchableOpacity
        onPress={() => runExport('light')}
        disabled={!!exporting}
        activeOpacity={0.8}
        style={[styles.option, { borderColor: '#8B5CF640', backgroundColor: isDark ? 'rgba(139,92,246,0.08)' : '#F5F3FF' }]}
        accessibilityLabel={traduire("Sauvegarde légère sans photos")}
        accessibilityRole="button"
      >
        <View style={[styles.iconWrap, { backgroundColor: '#8B5CF620' }]}>
          <FileText size={20} color="#8B5CF6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{traduire("Légère (sans photos)")}</Text>
          <Text style={[styles.optionSub, { color: colors.textMuted ?? '#888' }]}>
            {traduire("Seulement les données. Taille : 100-500 KB. Idéal pour email.")}</Text>
        </View>
        {exporting === 'light' ? (
          <ActivityIndicator color="#8B5CF6" size="small" />
        ) : (
          <Download size={16} color="#8B5CF6" />
        )}
      </TouchableOpacity>
    </View>
  );
};

export const BackupTypeSelector = React.memo(BackupTypeSelectorInner);

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16, marginTop: 10, padding: 14,
    borderRadius: 12, borderWidth: 1, gap: 10,
  },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  optionTitle: { fontSize: 13, fontWeight: '800' },
  optionSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
});
