// ============================================
// ECRAN IMPORT CSV UNIFIE
// Flow: Instructions > Fichier > Preview > Done
// + lien vers import avance (ancien systeme multi-types)
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import {
  ArrowLeft,
  FileUp,
  Download,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Scale,
  Ruler,
  Activity,
  Settings2,
  ChevronRight,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  parseCSVContent,
  importParsedRows,
  shareCSVTemplate,
  CSV_ROW_TYPES,
  type CSVRowType,
  type CSVParseResult,
} from '@/lib/csvImportExportService';
import {
  type SimpleParseResult,
  shareTemplate,
  parseUnifiedCSV,
  importUnifiedRows,
} from '@/lib/csvTemplates';
import logger from '@/lib/security/logger';

// ============================================
// MAIN COMPONENT
// ============================================

type Step = 'select' | 'preview' | 'done' | 'advanced-select' | 'advanced-preview' | 'advanced-done';

export default function ImportCSVScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Unified flow state
  const [step, setStep] = useState<Step>('select');
  const [parseResult, setParseResult] = useState<SimpleParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importDetails, setImportDetails] = useState({ weights: 0, measurements: 0, compositions: 0 });
  const [importErrors, setImportErrors] = useState<Array<{ line: number; error: string }>>([]);

  // Advanced flow state
  const [advParseResult, setAdvParseResult] = useState<CSVParseResult | null>(null);
  const [advImportErrors, setAdvImportErrors] = useState<Array<{ line: number; type: string; error: string }>>([]);

  // ============================================
  // UNIFIED FLOW
  // ============================================

  const handleDownloadTemplate = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const success = await shareTemplate();
    if (!success) {
      showPopup({ type: 'error', title: 'Erreur', message: 'Impossible de partager le modele' });
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const fileName = file.name || 'unknown.csv';
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext !== 'csv' && ext !== 'txt') {
        showPopup({ type: 'error', title: 'Format invalide', message: 'Selectionnez un fichier .csv' });
        return;
      }

      setIsParsing(true);
      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseUnifiedCSV(content);

      if (parsed.rows.length === 0) {
        showPopup({ type: 'error', title: 'Fichier vide', message: 'Aucune donnee trouvee. Verifiez le format.' });
        setIsParsing(false);
        return;
      }

      setParseResult(parsed);
      setStep('preview');
      await impactAsync(ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      logger.error('CSV file read error:', error);
      showPopup({ type: 'error', title: 'Erreur', message: error.message || 'Impossible de lire le fichier' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;
    const validRows = parseResult.rows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const result = await importUnifiedRows(validRows);
      setImportedCount(result.success);
      setImportDetails(result.details);
      setImportErrors(result.errors);
      setStep('done');
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (error: any) {
      logger.error('CSV import error:', error);
      showPopup({ type: 'error', title: 'Erreur', message: 'Erreur lors de l\'import' });
    } finally {
      setIsImporting(false);
    }
  };

  // ============================================
  // ADVANCED FLOW
  // ============================================

  const handleAdvDownloadTemplate = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const success = await shareCSVTemplate();
    if (!success) {
      showPopup({ type: 'error', title: 'Erreur', message: 'Impossible de partager le modele' });
    }
  };

  const pickAdvancedFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const ext = (file.name || '').toLowerCase().split('.').pop();
      if (ext !== 'csv' && ext !== 'txt') {
        showPopup({ type: 'error', title: 'Format invalide', message: 'Selectionnez un fichier .csv' });
        return;
      }

      setIsParsing(true);
      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseCSVContent(content);

      if (parsed.rows.length === 0) {
        showPopup({ type: 'error', title: 'Fichier vide', message: 'Aucune donnee trouvee.' });
        setIsParsing(false);
        return;
      }

      setAdvParseResult(parsed);
      setStep('advanced-preview');
      await impactAsync(ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      logger.error('CSV file read error:', error);
      showPopup({ type: 'error', title: 'Erreur', message: error.message || 'Impossible de lire le fichier' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleAdvancedImport = async () => {
    if (!advParseResult) return;
    const validRows = advParseResult.rows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const result = await importParsedRows(validRows);
      setImportedCount(result.success);
      setAdvImportErrors(result.errors);
      setStep('advanced-done');
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (error: any) {
      logger.error('CSV import error:', error);
      showPopup({ type: 'error', title: 'Erreur', message: 'Erreur lors de l\'import' });
    } finally {
      setIsImporting(false);
    }
  };

  // ============================================
  // RESET / NAVIGATION
  // ============================================

  const resetAll = () => {
    setStep('select');
    setParseResult(null);
    setAdvParseResult(null);
    setImportedCount(0);
    setImportDetails({ weights: 0, measurements: 0, compositions: 0 });
    setImportErrors([]);
    setAdvImportErrors([]);
  };

  const handleBack = () => {
    switch (step) {
      case 'select': router.back(); break;
      case 'preview': setParseResult(null); setStep('select'); break;
      case 'advanced-select': setStep('select'); break;
      case 'advanced-preview': setAdvParseResult(null); setStep('advanced-select'); break;
      default: resetAll();
    }
  };

  const getHeaderTitle = () => {
    switch (step) {
      case 'select': return 'Import CSV';
      case 'preview': return 'Verification';
      case 'done':
      case 'advanced-done': return 'Import termine';
      case 'advanced-select': return 'Import avance';
      case 'advanced-preview': return 'Verification';
      default: return 'Import CSV';
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {getHeaderTitle()}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════ */}
        {/* STEP: SELECT */}
        {/* ═══════════════════════════════════════ */}
        {step === 'select' && (
          <View>
            {/* Purpose card */}
            <View style={[styles.purposeCard, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` }]}>
              <FileSpreadsheet size={22} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.purposeTitle, { color: colors.textPrimary }]}>
                  Importe tes donnees depuis Excel
                </Text>
                <Text style={[styles.purposeText, { color: colors.textSecondary }]}>
                  Un seul fichier CSV avec toutes tes donnees : poids, composition corporelle et mensurations. Remplis-le sur ton PC/Mac, puis importe-le ici.
                </Text>
              </View>
            </View>

            {/* Donnees incluses */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              DONNEES INCLUSES DANS LE MODELE
            </Text>
            <View style={styles.dataBadges}>
              {[
                { label: 'Poids', Icon: Scale, color: '#14B8A6' },
                { label: 'Composition', Icon: Activity, color: '#3B82F6' },
                { label: 'Mensurations', Icon: Ruler, color: '#8B5CF6' },
              ].map(({ label, Icon, color }) => (
                <View key={label} style={[styles.dataBadge, { backgroundColor: color + '15', borderColor: color + '40' }]}>
                  <Icon size={14} color={color} />
                  <Text style={[styles.dataBadgeText, { color }]}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Steps */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              COMMENT FAIRE
            </Text>

            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Telecharge le modele
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Ouvre-le dans Excel, Google Sheets ou Numbers. Le fichier contient des instructions en commentaires et des exemples pre-remplis.
                </Text>
              </View>
            </View>

            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Remplis tes donnees
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Une ligne par date (JJ/MM/AAAA ou AAAA-MM-JJ). Laisse vides les colonnes que tu n'as pas. Decimales avec "." ou "," les deux marchent.
                </Text>
              </View>
            </View>

            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Importe dans Yoroi
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Sauvegarde le fichier sur iCloud ou Google Drive, puis selectionne-le ci-dessous. Yoroi accepte les fichiers des versions precedentes.
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.templateButton, { backgroundColor: colors.backgroundElevated, borderColor: colors.accent + '60' }]}
                onPress={handleDownloadTemplate}
                activeOpacity={0.7}
              >
                <Download size={20} color={colors.accent} />
                <Text style={[styles.templateButtonText, { color: colors.accent }]}>
                  Telecharger le modele CSV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickButton, { backgroundColor: colors.accent }]}
                onPress={pickFile}
                disabled={isParsing}
              >
                {isParsing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <FileUp size={24} color="#FFF" />
                    <Text style={styles.pickButtonText}>Selectionner mon fichier CSV</Text>
                  </>
                )}
              </TouchableOpacity>

              {isParsing && (
                <Text style={[styles.parsingText, { color: colors.textMuted }]}>
                  Analyse du fichier...
                </Text>
              )}
            </View>

            {/* Advanced import link */}
            <TouchableOpacity
              style={[styles.advancedLink, { borderColor: colors.border }]}
              onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setStep('advanced-select'); }}
              activeOpacity={0.7}
            >
              <Settings2 size={18} color={colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.advancedLinkTitle, { color: colors.textPrimary }]}>
                  Import avance
                </Text>
                <Text style={[styles.advancedLinkDesc, { color: colors.textMuted }]}>
                  Entrainements, sommeil, hydratation, humeur...
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Tip */}
            <View style={[styles.tipCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }]}>
              <Text style={[styles.tipTitle, { color: '#F59E0B' }]}>
                Astuce
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {Platform.OS === 'ios'
                  ? 'Sauvegarde le fichier dans iCloud Drive sur ton Mac. Il apparait dans Fichiers sur iPhone. Tu peux aussi l\'envoyer par AirDrop ou email.'
                  : 'Sauvegarde dans Google Drive sur ton PC, puis ouvre depuis Fichiers. WhatsApp ou email fonctionnent aussi.'}
              </Text>
            </View>

            {/* Rétro-compat */}
            <View style={[styles.tipCard, { backgroundColor: `${colors.accent}08`, borderColor: `${colors.accent}30` }]}>
              <Text style={[styles.tipTitle, { color: colors.accent }]}>
                Compatibilite
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Yoroi accepte les fichiers exportes depuis n'importe quelle version precedente de l'app. Les separateurs "," et ";" sont reconnus automatiquement. Les dates en JJ/MM/AAAA et AAAA-MM-JJ sont toutes les deux supportees.
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP: PREVIEW */}
        {/* ═══════════════════════════════════════ */}
        {step === 'preview' && parseResult && (
          <View>
            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                {parseResult.rows.length} ligne{parseResult.rows.length > 1 ? 's' : ''} detectee{parseResult.rows.length > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                {parseResult.validCount} valide{parseResult.validCount > 1 ? 's' : ''}
                {parseResult.invalidCount > 0 && ` - ${parseResult.invalidCount} erreur${parseResult.invalidCount > 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* Detail breakdown */}
            <View style={styles.breakdownRow}>
              {parseResult.summary.weights > 0 && (
                <View style={[styles.breakdownBadge, { backgroundColor: '#14B8A615', borderColor: '#14B8A640' }]}>
                  <Scale size={14} color="#14B8A6" />
                  <Text style={[styles.breakdownText, { color: '#14B8A6' }]}>
                    {parseResult.summary.weights} poids
                  </Text>
                </View>
              )}
              {parseResult.summary.measurements > 0 && (
                <View style={[styles.breakdownBadge, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF640' }]}>
                  <Ruler size={14} color="#8B5CF6" />
                  <Text style={[styles.breakdownText, { color: '#8B5CF6' }]}>
                    {parseResult.summary.measurements} mensurations
                  </Text>
                </View>
              )}
              {parseResult.summary.compositions > 0 && (
                <View style={[styles.breakdownBadge, { backgroundColor: '#3B82F615', borderColor: '#3B82F640' }]}>
                  <Activity size={14} color="#3B82F6" />
                  <Text style={[styles.breakdownText, { color: '#3B82F6' }]}>
                    {parseResult.summary.compositions} compositions
                  </Text>
                </View>
              )}
            </View>

            {/* Preview rows */}
            <View style={styles.previewRows}>
              {parseResult.rows.slice(0, 20).map((row, idx) => (
                <View
                  key={idx}
                  style={[styles.previewRow, {
                    backgroundColor: row.valid ? colors.backgroundElevated : '#FF4D4F10',
                    borderColor: row.valid ? colors.border : '#FF4D4F30',
                  }]}
                >
                  {row.valid ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <AlertCircle size={16} color="#FF4D4F" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.previewRowText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {row.preview || `Ligne ${row.lineNumber}`}
                    </Text>
                    {row.error && (
                      <Text style={[styles.previewRowError, { color: '#FF4D4F' }]} numberOfLines={1}>
                        {row.error}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {parseResult.rows.length > 20 && (
                <Text style={[styles.moreRows, { color: colors.textMuted }]}>
                  + {parseResult.rows.length - 20} autre{parseResult.rows.length - 20 > 1 ? 's' : ''}
                </Text>
              )}
            </View>

            {/* Import button */}
            <TouchableOpacity
              style={[styles.importButton, {
                backgroundColor: parseResult.validCount > 0 ? colors.accent : colors.border,
              }]}
              onPress={handleImport}
              disabled={parseResult.validCount === 0 || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFF" />
                  <Text style={styles.importButtonText}>
                    Importer {parseResult.validCount} ligne{parseResult.validCount > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setParseResult(null); setStep('select'); }}>
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Changer de fichier
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP: DONE */}
        {/* ═══════════════════════════════════════ */}
        {(step === 'done' || step === 'advanced-done') && (
          <View style={styles.doneContainer}>
            <View style={[styles.doneIcon, { backgroundColor: colors.accent + '20' }]}>
              <CheckCircle size={48} color={colors.accent} />
            </View>
            <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>
              Import termine
            </Text>
            <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>
              {importedCount} ligne{importedCount > 1 ? 's' : ''} importee{importedCount > 1 ? 's' : ''} avec succes
            </Text>

            {/* Details for unified import */}
            {step === 'done' && (importDetails.weights > 0 || importDetails.measurements > 0 || importDetails.compositions > 0) && (
              <View style={styles.doneDetails}>
                {importDetails.weights > 0 && (
                  <View style={[styles.doneDetailBadge, { backgroundColor: '#14B8A615' }]}>
                    <Scale size={14} color="#14B8A6" />
                    <Text style={{ color: '#14B8A6', fontSize: 13, fontWeight: '600' }}>
                      {importDetails.weights} pesee{importDetails.weights > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {importDetails.measurements > 0 && (
                  <View style={[styles.doneDetailBadge, { backgroundColor: '#8B5CF615' }]}>
                    <Ruler size={14} color="#8B5CF6" />
                    <Text style={{ color: '#8B5CF6', fontSize: 13, fontWeight: '600' }}>
                      {importDetails.measurements} mensuration{importDetails.measurements > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {importDetails.compositions > 0 && (
                  <View style={[styles.doneDetailBadge, { backgroundColor: '#3B82F615' }]}>
                    <Activity size={14} color="#3B82F6" />
                    <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '600' }}>
                      {importDetails.compositions} composition{importDetails.compositions > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {(importErrors.length > 0 || advImportErrors.length > 0) && (
              <View style={[styles.doneErrorCard, { backgroundColor: '#FF4D4F10', borderColor: '#FF4D4F30' }]}>
                <AlertCircle size={16} color="#FF4D4F" />
                <Text style={{ color: '#FF4D4F', fontSize: 13, flex: 1, marginLeft: 8 }}>
                  {(importErrors.length || advImportErrors.length)} erreur{(importErrors.length || advImportErrors.length) > 1 ? 's' : ''} lors de l'import
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: colors.accent }]}
              onPress={() => router.back()}
            >
              <Text style={styles.importButtonText}>Termine</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={resetAll}>
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Importer un autre fichier
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP: ADVANCED SELECT */}
        {/* ═══════════════════════════════════════ */}
        {step === 'advanced-select' && (
          <View>
            <View style={[styles.purposeCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }]}>
              <Settings2 size={22} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.purposeTitle, { color: colors.textPrimary }]}>
                  Import multi-types
                </Text>
                <Text style={[styles.purposeText, { color: colors.textSecondary }]}>
                  Un fichier CSV avec colonne TYPE pour importer entrainements, sommeil, hydratation, humeur en plus du poids et mensurations.
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.templateButton, { backgroundColor: colors.backgroundElevated, borderColor: '#F59E0B60' }]}
                onPress={handleAdvDownloadTemplate}
                activeOpacity={0.7}
              >
                <Download size={20} color="#F59E0B" />
                <Text style={[styles.templateButtonText, { color: '#F59E0B' }]}>
                  Telecharger le modele avance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickButton, { backgroundColor: '#F59E0B' }]}
                onPress={pickAdvancedFile}
                disabled={isParsing}
              >
                {isParsing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <FileUp size={24} color="#FFF" />
                    <Text style={styles.pickButtonText}>Selectionner un fichier CSV</Text>
                  </>
                )}
              </TouchableOpacity>

              {isParsing && (
                <Text style={[styles.parsingText, { color: colors.textMuted }]}>
                  Analyse du fichier...
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP: ADVANCED PREVIEW */}
        {/* ═══════════════════════════════════════ */}
        {step === 'advanced-preview' && advParseResult && (
          <View>
            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                {advParseResult.rows.length} entree{advParseResult.rows.length > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                {advParseResult.validCount} valide{advParseResult.validCount > 1 ? 's' : ''}
                {advParseResult.invalidCount > 0 && ` - ${advParseResult.invalidCount} erreur${advParseResult.invalidCount > 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* Type breakdown */}
            <View style={styles.typeBreakdown}>
              {CSV_ROW_TYPES.map(type => {
                const typeRows = advParseResult.byType[type];
                if (typeRows.length === 0) return null;
                const validInType = typeRows.filter(r => r.valid).length;
                const invalidInType = typeRows.filter(r => !r.valid).length;
                const ADV_COLORS: Record<CSVRowType, string> = {
                  POIDS: '#14B8A6', ENTRAINEMENT: '#EF4444', MENSURATION: '#8B5CF6',
                  SOMMEIL: '#6366F1', HYDRATATION: '#3B82F6', HUMEUR: '#EC4899',
                };
                const ADV_LABELS: Record<CSVRowType, string> = {
                  POIDS: 'pesees', ENTRAINEMENT: 'entrainements', MENSURATION: 'mensurations',
                  SOMMEIL: 'sommeil', HYDRATATION: 'hydratation', HUMEUR: 'humeur',
                };

                return (
                  <View key={type} style={[styles.advTypeRow, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                    <View style={[styles.advTypeColor, { backgroundColor: ADV_COLORS[type] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>
                        {validInType} {ADV_LABELS[type]}
                      </Text>
                      {invalidInType > 0 && (
                        <Text style={{ color: '#FF4D4F', fontSize: 11, marginTop: 2 }}>
                          {invalidInType} invalide{invalidInType > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <CheckCircle size={18} color={invalidInType === 0 ? '#10B981' : '#FF4D4F'} />
                  </View>
                );
              })}
            </View>

            {/* Errors */}
            {advParseResult.invalidCount > 0 && (
              <View style={styles.errorsSection}>
                <Text style={[styles.errorsSectionTitle, { color: '#FF4D4F' }]}>
                  Erreurs detectees
                </Text>
                {advParseResult.rows
                  .filter(r => !r.valid)
                  .slice(0, 10)
                  .map((row, idx) => (
                    <View key={idx} style={[styles.errorRow, { backgroundColor: '#FF4D4F10', borderColor: '#FF4D4F30' }]}>
                      <AlertCircle size={14} color="#FF4D4F" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.errorLine, { color: colors.textPrimary }]}>
                          Ligne {row.lineNumber} ({row.type})
                        </Text>
                        <Text style={{ color: '#FF4D4F', fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                          {row.error}
                        </Text>
                      </View>
                    </View>
                  ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: advParseResult.validCount > 0 ? '#F59E0B' : colors.border }]}
              onPress={handleAdvancedImport}
              disabled={advParseResult.validCount === 0 || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <CheckCircle size={20} color="#FFF" />
                  <Text style={styles.importButtonText}>
                    Importer {advParseResult.validCount} entree{advParseResult.validCount > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setAdvParseResult(null); setStep('advanced-select'); }}>
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Changer de fichier
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 100 },

  purposeCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', marginBottom: 20, gap: 12 },
  purposeTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  purposeText: { fontSize: 13, lineHeight: 18 },

  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10, paddingHorizontal: 4 },

  dataBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  dataBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  dataBadgeText: { fontSize: 12, fontWeight: '600' },

  stepCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumberText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  stepDesc: { fontSize: 12, lineHeight: 17 },

  actionButtons: { marginTop: 16, gap: 10, alignItems: 'center' },
  templateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1, width: '100%', marginBottom: 12 },
  templateButtonText: { fontSize: 15, fontWeight: '600' },
  pickButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%' },
  pickButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  parsingText: { marginTop: 12, fontSize: 13 },

  advancedLink: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginTop: 20, gap: 12 },
  advancedLinkTitle: { fontSize: 14, fontWeight: '600' },
  advancedLinkDesc: { fontSize: 11, marginTop: 2 },

  tipCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  tipTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  tipText: { fontSize: 12, lineHeight: 17 },

  summaryCard: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  summaryTitle: { fontSize: 17, fontWeight: '700' },
  summarySubtitle: { fontSize: 13, marginTop: 4 },

  breakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  breakdownBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  breakdownText: { fontSize: 12, fontWeight: '600' },

  previewRows: { gap: 6, marginBottom: 16 },
  previewRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 10 },
  previewRowText: { fontSize: 13, fontWeight: '500' },
  previewRowError: { fontSize: 11, marginTop: 2 },
  moreRows: { fontSize: 12, textAlign: 'center', marginTop: 4 },

  typeBreakdown: { gap: 8, marginBottom: 16 },
  advTypeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  advTypeColor: { width: 6, height: 32, borderRadius: 3 },
  typeLabel: { fontSize: 14, fontWeight: '600' },
  errorsSection: { marginBottom: 16 },
  errorsSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 8 },
  errorLine: { fontSize: 12, fontWeight: '600' },

  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  importButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', paddingVertical: 14 },
  secondaryButtonText: { fontSize: 14, fontWeight: '500' },

  doneContainer: { alignItems: 'center', paddingTop: 60 },
  doneIcon: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  doneTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  doneSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  doneDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
  doneDetailBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  doneErrorCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16, width: '100%' },
});
