// ============================================
// ÉCRAN D'EXPORT DE DONNÉES
// Export CSV, JSON, Rapports
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  FileText,
  Download,
  Share2,
  FileJson,
  Table,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  exportTrainingToJSON,
  exportTrainingToCSV,
  generateTrainingTextReport,
} from '@/lib/trainingExportService';
// 🔒 SÉCURITÉ: Protection contre les screenshots
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { BlurView } from 'expo-blur';
import logger from '@/lib/security/logger';

type ExportFormat = 'json' | 'csv' | 'txt';

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'json',
    label: 'Export JSON',
    description: 'Format structuré pour sauvegarde complète',
    icon: FileJson,
    color: '#F59E0B',
  },
  {
    id: 'csv',
    label: 'Export CSV',
    description: 'Compatible Excel, Google Sheets',
    icon: Table,
    color: '#10B981',
  },
  {
    id: 'txt',
    label: 'Rapport Textuel',
    description: 'Résumé lisible de ta progression',
    icon: FileText,
    color: '#3B82F6',
  },
];

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // 🔒 SÉCURITÉ: Protection contre les screenshots
  const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();

  const [exporting, setExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);

  // Ref pour le timeout (cleanup)
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let success = false;

      switch (format) {
        case 'json':
          success = !!(await exportTrainingToJSON());
          break;
        case 'csv':
          success = !!(await exportTrainingToCSV());
          break;
        case 'txt':
          success = !!(await generateTrainingTextReport());
          break;
      }

      if (success) {
        setExportedFormat(format);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetTimeoutRef.current = setTimeout(() => setExportedFormat(null), 3000);
      }
    } catch (error) {
      logger.error('Erreur export:', error);
      showPopup('Erreur', 'Impossible d\'exporter les données', [
        { text: 'OK', style: 'primary' }
      ]);
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Exporter mes données
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 🔒 SÉCURITÉ: Avertissement screenshot détecté */}
      {screenshotDetected && (
        <View style={styles.screenshotWarning}>
          <Text style={styles.screenshotWarningText}>
            Screenshot détecté - Tes données sont sensibles
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Info */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` },
          ]}
        >
          <Share2 size={20} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.accent }]}>
            Exporte tes données pour les sauvegarder ou les analyser ailleurs
          </Text>
        </View>

        {/* Options d'export */}
        <View style={styles.exportOptions}>
          {EXPORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isExported = exportedFormat === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.exportCard,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: isExported ? option.color : colors.border,
                    borderWidth: isExported ? 2 : 1,
                  },
                ]}
                onPress={() => !exporting && handleExport(option.id)}
                activeOpacity={0.7}
                disabled={exporting}
              >
                <View style={styles.exportCardHeader}>
                  <View
                    style={[
                      styles.exportIconContainer,
                      { backgroundColor: `${option.color}15` },
                    ]}
                  >
                    {isExported ? (
                      <CheckCircle size={28} color={option.color} />
                    ) : (
                      <Icon size={28} color={option.color} />
                    )}
                  </View>
                  {exporting && exportedFormat === option.id ? (
                    <ActivityIndicator size="small" color={option.color} />
                  ) : null}
                </View>

                <Text style={[styles.exportLabel, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
                <Text style={[styles.exportDescription, { color: colors.textMuted }]}>
                  {option.description}
                </Text>

                {isExported && (
                  <View
                    style={[
                      styles.successBadge,
                      { backgroundColor: `${option.color}20` },
                    ]}
                  >
                    <CheckCircle size={14} color={option.color} />
                    <Text style={[styles.successText, { color: option.color }]}>
                      Exporté
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info additionnelle */}
        <View style={styles.additionalInfo}>
          <Text style={[styles.additionalInfoTitle, { color: colors.textPrimary }]}>
            Formats disponibles
          </Text>

          <View style={styles.infoItem}>
            <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>
              JSON
            </Text>
            <Text style={[styles.infoItemText, { color: colors.textMuted }]}>
              Sauvegarde complète de tous tes exercices et logs. Idéal pour archiver ou importer dans d'autres apps.
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>
              CSV
            </Text>
            <Text style={[styles.infoItemText, { color: colors.textMuted }]}>
              Format tableur compatible Excel, Google Sheets. Parfait pour créer tes propres graphiques.
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>
              TXT
            </Text>
            <Text style={[styles.infoItemText, { color: colors.textMuted }]}>
              Rapport textuel lisible avec statistiques et progression. Facile à partager.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 🔒 SÉCURITÉ: Flou quand l'app est en background */}
      {isBlurred && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
        />
      )}
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  exportOptions: {
    gap: 12,
  },
  exportCard: {
    padding: 18,
    borderRadius: 16,
    gap: 10,
  },
  exportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  exportDescription: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
  },
  additionalInfo: {
    marginTop: 32,
    gap: 16,
  },
  additionalInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoItem: {
    gap: 4,
  },
  infoItemLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoItemText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },

  // 🔒 SÉCURITÉ: Styles pour l'avertissement screenshot
  screenshotWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  screenshotWarningText: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
