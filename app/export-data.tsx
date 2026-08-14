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
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  FileText,
  Share2,
  FileJson,
  Table,
  CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  exportTrainingToJSON,
  exportTrainingToCSV,
  generateTrainingTextReport,
} from '@/lib/trainingExportService';
// 🔒 SÉCURITÉ: Protection contre les screenshots
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { BlurView } from 'expo-blur';
import logger from '@/lib/security/logger';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { shareExportCSV, shareFilteredTrainingsCSV } from '@/lib/csvTemplates';
import { SPORTS } from '@/lib/sports';
import { TextInput as RNTextInput } from 'react-native';

type ExportFormat = 'json' | 'csv' | 'txt';

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: any;
  color: string;
}

// Options defined dynamically inside component to use t()
const EXPORT_OPTION_CONFIGS = [
  { id: 'json' as ExportFormat, labelKey: 'exportData.optionJsonLabel', descKey: 'exportData.optionJsonDesc', icon: FileJson, color: '#F59E0B' },
  { id: 'csv' as ExportFormat, labelKey: 'exportData.optionCsvLabel', descKey: 'exportData.optionCsvDesc', icon: Table, color: '#10B981' },
  { id: 'txt' as ExportFormat, labelKey: 'exportData.optionTxtLabel', descKey: 'exportData.optionTxtDesc', icon: FileText, color: '#3B82F6' },
];

export default function ExportDataScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t } = useI18n();

  const EXPORT_OPTIONS = EXPORT_OPTION_CONFIGS.map(opt => ({
    ...opt,
    label: t(opt.labelKey as any),
    description: t(opt.descKey as any),
  }));

  // 🔒 SÉCURITÉ: Protection contre les screenshots
  const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();

  const [exporting, setExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<ExportFormat | null>(null);
  const [csvExporting, setCsvExporting] = useState(false);
  const [csvExported, setCsvExported] = useState(false);

  // Filtres export séances
  const [filterSport, setFilterSport] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filteredExporting, setFilteredExporting] = useState(false);
  const [filteredExported, setFilteredExported] = useState(false);

  // Ref pour le timeout (cleanup)
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    impactAsync(ImpactFeedbackStyle.Medium);

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
        notificationAsync(NotificationFeedbackType.Success);
        resetTimeoutRef.current = setTimeout(() => setExportedFormat(null), 3000);
      }
    } catch (error) {
      logger.error('Erreur export:', error);
      showPopup(t('exportData.errorTitle'), t('exportData.errorMessage'), [
        { text: t('exportData.ok'), style: 'primary' }
      ]);
    } finally {
      setExporting(false);
    }
  };

  const handleFilteredExport = async () => {
    setFilteredExporting(true);
    impactAsync(ImpactFeedbackStyle.Medium);
    try {
      const success = await shareFilteredTrainingsCSV({
        sport: filterSport.trim() || undefined,
        dateFrom: filterDateFrom.trim() || undefined,
        dateTo: filterDateTo.trim() || undefined,
      });
      if (success) {
        setFilteredExported(true);
        notificationAsync(NotificationFeedbackType.Success);
        resetTimeoutRef.current = setTimeout(() => setFilteredExported(false), 3000);
      } else {
        showPopup('Aucune séance', 'Aucune séance ne correspond à ces filtres.', [{ text: 'OK', style: 'primary' }]);
      }
    } catch (error) {
      logger.error('Erreur export filtré:', error);
      showPopup(t('exportData.errorTitle'), t('exportData.errorMessage'), [{ text: t('exportData.ok'), style: 'primary' }]);
    } finally {
      setFilteredExporting(false);
    }
  };

  const handleCSVExport = async () => {
    setCsvExporting(true);
    impactAsync(ImpactFeedbackStyle.Medium);

    try {
      const success = await shareExportCSV();
      if (success) {
        setCsvExported(true);
        notificationAsync(NotificationFeedbackType.Success);
        resetTimeoutRef.current = setTimeout(() => setCsvExported(false), 3000);
      }
    } catch (error) {
      logger.error('Erreur export CSV:', error);
      showPopup(t('exportData.errorTitle'), t('exportData.errorMessage'), [
        { text: t('exportData.ok'), style: 'primary' }
      ]);
    } finally {
      setCsvExporting(false);
    }
  };

  return (
    <PremiumGate featureTitle="Export des donnees">
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('exportData.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 🔒 SÉCURITÉ: Avertissement screenshot détecté */}
      {screenshotDetected && (
        <View style={styles.screenshotWarning}>
          <Text style={styles.screenshotWarningText}>
            {t('exportData.screenshotWarning')}
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
          <Text style={[styles.infoText, { color: isDark ? colors.accent : colors.textPrimary }]}>
            {t('exportData.infoText')}
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
                      {t('exportData.exported')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Export CSV complet (poids + mensurations + composition) */}
        <View style={styles.csvSection}>
          <Text style={[styles.csvSectionTitle, { color: colors.textPrimary }]}>
            {t('exportData.csvSectionTitle')}
          </Text>
          <Text style={[styles.csvSectionDesc, { color: colors.textMuted }]}>
            {t('exportData.csvSectionDesc')}
          </Text>

          <TouchableOpacity
            style={[
              styles.csvButton,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: csvExported ? '#10B981' : colors.border,
                borderWidth: csvExported ? 2 : 1,
              },
            ]}
            onPress={() => !csvExporting && handleCSVExport()}
            activeOpacity={0.7}
            disabled={csvExporting}
          >
            <View style={[styles.csvButtonIcon, { backgroundColor: '#10B98115' }]}>
              {csvExported ? (
                <CheckCircle size={20} color="#10B981" />
              ) : (
                <Table size={20} color="#10B981" />
              )}
            </View>
            <Text style={[styles.csvButtonLabel, { color: colors.textPrimary }]}>
              {t('exportData.exportAllCSV')}
            </Text>
            {csvExporting && (
              <ActivityIndicator size="small" color="#10B981" style={{ marginLeft: 'auto' }} />
            )}
            {csvExported && !csvExporting && (
              <View style={[styles.csvExportedBadge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.csvExportedText, { color: '#10B981' }]}>OK</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Export séances filtré */}
        <View style={[styles.csvSection, { marginTop: 8 }]}>
          <Text style={[styles.csvSectionTitle, { color: colors.textPrimary }]}>
            Export séances (filtré)
          </Text>
          <Text style={[styles.csvSectionDesc, { color: colors.textMuted }]}>
            Exporte tes séances en CSV avec filtre par sport et/ou période.
          </Text>

          {/* Filtre sport */}
          <RNTextInput
            style={{
              backgroundColor: colors.backgroundCard,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: filterSport ? '#3B82F6' : colors.border,
              paddingHorizontal: 12,
              paddingVertical: 9,
              color: colors.textPrimary,
              fontSize: 14,
              marginBottom: 8,
            }}
            placeholder="Sport (ex: jjb, mma, course...)"
            placeholderTextColor={colors.textMuted}
            value={filterSport}
            onChangeText={setFilterSport}
            returnKeyType="done"
          />

          {/* Filtres dates */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <RNTextInput
              style={{
                flex: 1,
                backgroundColor: colors.backgroundCard,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: filterDateFrom ? '#3B82F6' : colors.border,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: colors.textPrimary,
                fontSize: 13,
              }}
              placeholder="Du (AAAA-MM-JJ)"
              placeholderTextColor={colors.textMuted}
              value={filterDateFrom}
              onChangeText={setFilterDateFrom}
              keyboardType="numeric"
              maxLength={10}
            />
            <RNTextInput
              style={{
                flex: 1,
                backgroundColor: colors.backgroundCard,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: filterDateTo ? '#3B82F6' : colors.border,
                paddingHorizontal: 12,
                paddingVertical: 9,
                color: colors.textPrimary,
                fontSize: 13,
              }}
              placeholder="Au (AAAA-MM-JJ)"
              placeholderTextColor={colors.textMuted}
              value={filterDateTo}
              onChangeText={setFilterDateTo}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.csvButton,
              {
                backgroundColor: colors.backgroundCard,
                borderColor: filteredExported ? '#3B82F6' : colors.border,
                borderWidth: filteredExported ? 2 : 1,
              },
            ]}
            onPress={() => !filteredExporting && handleFilteredExport()}
            activeOpacity={0.7}
            disabled={filteredExporting}
          >
            <View style={[styles.csvButtonIcon, { backgroundColor: '#3B82F615' }]}>
              {filteredExported ? (
                <CheckCircle size={20} color="#3B82F6" />
              ) : (
                <Table size={20} color="#3B82F6" />
              )}
            </View>
            <Text style={[styles.csvButtonLabel, { color: colors.textPrimary }]}>
              Exporter les séances filtrées
            </Text>
            {filteredExporting && (
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 'auto' }} />
            )}
            {filteredExported && !filteredExporting && (
              <View style={[styles.csvExportedBadge, { backgroundColor: '#3B82F620' }]}>
                <Text style={[styles.csvExportedText, { color: '#3B82F6' }]}>OK</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Info additionnelle */}
        <View style={styles.additionalInfo}>
          <Text style={[styles.additionalInfoTitle, { color: colors.textPrimary }]}>
            {t('exportData.formatsTitle')}
          </Text>

          <View style={styles.infoItem}>
            <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>
              {t('exportData.jsonLabel')}
            </Text>
            <Text style={[styles.infoItemText, { color: colors.textMuted }]}>
              {t('exportData.jsonDesc')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>
              {t('exportData.csvLabel')}
            </Text>
            <Text style={[styles.infoItemText, { color: colors.textMuted }]}>
              {t('exportData.csvDesc')}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoItemLabel, { color: colors.textPrimary }]}>
              {t('exportData.txtLabel')}
            </Text>
            <Text style={[styles.infoItemText, { color: colors.textMuted }]}>
              {t('exportData.txtDesc')}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 🔒 SÉCURITÉ: Flou quand l'app est en background */}
      {isBlurred && Platform.OS === 'ios' && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={100}
          tint={isDark ? 'dark' : 'light'}
        />
      )}
      <PopupComponent />
    </View>
    </PremiumGate>
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

  // ── CSV par type ──
  csvSection: {
    marginTop: 32,
    gap: 8,
  },
  csvSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  csvSectionDesc: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginBottom: 8,
  },
  csvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  csvButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  csvButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  csvExportedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  csvExportedText: {
    fontSize: 11,
    fontWeight: '800',
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
