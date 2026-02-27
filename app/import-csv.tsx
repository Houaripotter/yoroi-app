// ============================================
// ECRAN IMPORT CSV UNIVERSEL
// 3 etapes: Selection > Preview > Termine
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
  Dumbbell,
  Ruler,
  Moon,
  Droplet,
  Heart,
  Laptop,
  Send,
  Smartphone,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  parseCSVContent,
  importParsedRows,
  shareCSVTemplate,
  CSV_ROW_TYPES,
  type CSVRowType,
  type ParsedCSVRow,
  type CSVParseResult,
} from '@/lib/csvImportExportService';
import logger from '@/lib/security/logger';

// ============================================
// TYPE CONFIG (icon + color per type)
// ============================================

const TYPE_CONFIG: Record<CSVRowType, { label: string; Icon: any; color: string }> = {
  POIDS: { label: 'Pesees', Icon: Scale, color: '#14B8A6' },
  ENTRAINEMENT: { label: 'Entrainements', Icon: Dumbbell, color: '#EF4444' },
  MENSURATION: { label: 'Mensurations', Icon: Ruler, color: '#8B5CF6' },
  SOMMEIL: { label: 'Sommeil', Icon: Moon, color: '#6366F1' },
  HYDRATATION: { label: 'Hydratation', Icon: Droplet, color: '#3B82F6' },
  HUMEUR: { label: 'Humeur', Icon: Heart, color: '#EC4899' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ImportCSVScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importErrors, setImportErrors] = useState<Array<{ line: number; type: string; error: string }>>([]);

  // ============================================
  // TEMPLATE DOWNLOAD
  // ============================================

  const handleDownloadTemplate = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const success = await shareCSVTemplate();
    if (!success) {
      showPopup({
        type: 'error',
        title: 'Erreur',
        message: 'Impossible de partager le modele',
      });
    }
  };

  // ============================================
  // FILE SELECTION
  // ============================================

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const fileName = file.name || 'unknown.csv';

      // Validate extension
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext !== 'csv' && ext !== 'txt') {
        showPopup({
          type: 'error',
          title: 'Format invalide',
          message: 'Selectionnez un fichier .csv',
        });
        return;
      }

      setIsParsing(true);

      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseCSVContent(content);

      if (parsed.rows.length === 0) {
        showPopup({
          type: 'error',
          title: 'Fichier vide',
          message: 'Aucune donnee trouvee dans le fichier. Verifiez le format.',
        });
        setIsParsing(false);
        return;
      }

      setParseResult(parsed);
      setStep('preview');
      await impactAsync(ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      logger.error('CSV file read error:', error);
      showPopup({
        type: 'error',
        title: 'Erreur',
        message: error.message || 'Impossible de lire le fichier',
      });
    } finally {
      setIsParsing(false);
    }
  };

  // ============================================
  // IMPORT
  // ============================================

  const handleImport = async () => {
    if (!parseResult) return;
    const validRows = parseResult.rows.filter(r => r.valid);
    if (validRows.length === 0) return;

    setIsImporting(true);

    try {
      const result = await importParsedRows(validRows);
      setImportedCount(result.success);
      setImportErrors(result.errors);
      setStep('done');
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (error: any) {
      logger.error('CSV import error:', error);
      showPopup({
        type: 'error',
        title: 'Erreur',
        message: 'Erreur lors de l\'import',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // ============================================
  // RESET
  // ============================================

  const resetAll = () => {
    setStep('select');
    setParseResult(null);
    setImportedCount(0);
    setImportErrors([]);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Import CSV
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            Poids, entrainements, sommeil...
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
        {/* STEP 1: FILE SELECTION */}
        {/* ═══════════════════════════════════════ */}
        {step === 'select' && (
          <View>
            {/* ── A quoi ca sert ── */}
            <View style={[styles.purposeCard, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` }]}>
              <FileSpreadsheet size={22} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.purposeTitle, { color: colors.textPrimary }]}>
                  Note tes donnees sur ordinateur
                </Text>
                <Text style={[styles.purposeText, { color: colors.textSecondary }]}>
                  Tu n'as pas ton telephone sous la main ? Remplis un fichier CSV sur ton PC ou Mac, puis importe tout d'un coup dans Yoroi.
                </Text>
              </View>
            </View>

            {/* ── Donnees importables ── */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              DONNEES IMPORTABLES
            </Text>
            <View style={styles.formatBadges}>
              {CSV_ROW_TYPES.map(type => {
                const config = TYPE_CONFIG[type];
                const Icon = config.Icon;
                return (
                  <View
                    key={type}
                    style={[styles.typeBadge, { backgroundColor: config.color + '15', borderColor: config.color + '40' }]}
                  >
                    <Icon size={14} color={config.color} />
                    <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                );
              })}
            </View>

            {/* ── Comment faire ── */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              COMMENT FAIRE
            </Text>

            {/* Etape 1 */}
            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Telecharge le modele
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Appuie sur le bouton ci-dessous pour recuperer le fichier CSV vierge. Envoie-le toi par mail, AirDrop, ou cloud.
                </Text>
              </View>
              <Download size={20} color={colors.textMuted} />
            </View>

            {/* Etape 2 */}
            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Remplis sur ton ordinateur
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Ouvre le fichier avec Excel, Google Sheets ou Numbers. Ajoute tes donnees ligne par ligne. Chaque ligne a un TYPE (POIDS, ENTRAINEMENT, SOMMEIL...).
                </Text>
              </View>
              <Laptop size={20} color={colors.textMuted} />
            </View>

            {/* Etape 3 */}
            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Renvoie le fichier sur ton telephone
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  {Platform.OS === 'ios'
                    ? 'Par AirDrop, iCloud Drive, Mail, ou Google Drive. Le fichier apparaitra dans l\'app Fichiers.'
                    : 'Par Google Drive, Mail, ou cable USB. Le fichier sera dans tes Telechargements.'}
                </Text>
              </View>
              <Send size={20} color={colors.textMuted} />
            </View>

            {/* Etape 4 */}
            <View style={[styles.stepCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  Importe dans Yoroi
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                  Appuie sur "Selectionner un fichier CSV" ci-dessous, choisis ton fichier, verifie le resume, et valide.
                </Text>
              </View>
              <Smartphone size={20} color={colors.textMuted} />
            </View>

            {/* ── Boutons d'action ── */}
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

            {/* ── Astuce transfert ── */}
            <View style={[styles.tipCard, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }]}>
              <Text style={[styles.tipTitle, { color: '#F59E0B' }]}>
                Astuce transfert
              </Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                {Platform.OS === 'ios'
                  ? 'Le plus simple : enregistre le fichier dans iCloud Drive sur ton Mac, il apparait automatiquement dans l\'app Fichiers sur ton iPhone.'
                  : 'Le plus simple : enregistre le fichier dans Google Drive sur ton PC, puis ouvre-le depuis l\'app Fichiers sur ton Android.'}
              </Text>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 2: PREVIEW */}
        {/* ═══════════════════════════════════════ */}
        {step === 'preview' && parseResult && (
          <View>
            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                {parseResult.rows.length} entree{parseResult.rows.length > 1 ? 's' : ''} detectee{parseResult.rows.length > 1 ? 's' : ''}
              </Text>
              <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
                {parseResult.validCount} valide{parseResult.validCount > 1 ? 's' : ''}
                {parseResult.invalidCount > 0 && ` · ${parseResult.invalidCount} erreur${parseResult.invalidCount > 1 ? 's' : ''}`}
              </Text>
            </View>

            {/* Type breakdown */}
            <View style={styles.typeBreakdown}>
              {CSV_ROW_TYPES.map(type => {
                const typeRows = parseResult.byType[type];
                if (typeRows.length === 0) return null;
                const config = TYPE_CONFIG[type];
                const Icon = config.Icon;
                const validInType = typeRows.filter(r => r.valid).length;
                const invalidInType = typeRows.filter(r => !r.valid).length;

                return (
                  <View
                    key={type}
                    style={[styles.typeRow, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}
                  >
                    <View style={[styles.typeIconBox, { backgroundColor: config.color + '15' }]}>
                      <Icon size={18} color={config.color} />
                    </View>
                    <View style={styles.typeInfo}>
                      <Text style={[styles.typeLabel, { color: colors.textPrimary }]}>
                        {validInType} {config.label.toLowerCase()}
                      </Text>
                      {invalidInType > 0 && (
                        <Text style={[styles.typeError, { color: '#FF4D4F' }]}>
                          {invalidInType} invalide{invalidInType > 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <CheckCircle size={18} color={invalidInType === 0 ? '#10B981' : '#FF4D4F'} />
                  </View>
                );
              })}
            </View>

            {/* Invalid rows detail */}
            {parseResult.invalidCount > 0 && (
              <View style={styles.errorsSection}>
                <Text style={[styles.errorsSectionTitle, { color: '#FF4D4F' }]}>
                  Erreurs detectees
                </Text>
                {parseResult.rows
                  .filter(r => !r.valid)
                  .slice(0, 10)
                  .map((row, idx) => (
                    <View
                      key={idx}
                      style={[styles.errorRow, { backgroundColor: '#FF4D4F10', borderColor: '#FF4D4F30' }]}
                    >
                      <AlertCircle size={14} color="#FF4D4F" />
                      <View style={styles.errorInfo}>
                        <Text style={[styles.errorLine, { color: colors.textPrimary }]}>
                          Ligne {row.lineNumber} ({row.type})
                        </Text>
                        <Text style={[styles.errorText, { color: '#FF4D4F' }]} numberOfLines={2}>
                          {row.error}
                        </Text>
                      </View>
                    </View>
                  ))}
                {parseResult.invalidCount > 10 && (
                  <Text style={[styles.moreErrors, { color: colors.textMuted }]}>
                    + {parseResult.invalidCount - 10} autre{parseResult.invalidCount - 10 > 1 ? 's' : ''} erreur{parseResult.invalidCount - 10 > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            )}

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
                    Importer {parseResult.validCount} entree{parseResult.validCount > 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back to file picker */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetAll}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Changer de fichier
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 3: DONE */}
        {/* ═══════════════════════════════════════ */}
        {step === 'done' && (
          <View style={styles.doneContainer}>
            <View style={[styles.doneIcon, { backgroundColor: colors.accent + '20' }]}>
              <CheckCircle size={48} color={colors.accent} />
            </View>
            <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>
              Import termine
            </Text>
            <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>
              {importedCount} entree{importedCount > 1 ? 's' : ''} importee{importedCount > 1 ? 's' : ''} avec succes
            </Text>

            {/* Import errors */}
            {importErrors.length > 0 && (
              <View style={[styles.doneErrorCard, { backgroundColor: '#FF4D4F10', borderColor: '#FF4D4F30' }]}>
                <AlertCircle size={16} color="#FF4D4F" />
                <Text style={{ color: '#FF4D4F', fontSize: 13, flex: 1, marginLeft: 8 }}>
                  {importErrors.length} erreur{importErrors.length > 1 ? 's' : ''} lors de l'import
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: colors.accent }]}
              onPress={() => router.back()}
            >
              <Text style={styles.importButtonText}>Termine</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetAll}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Importer un autre fichier
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },

  // ── Step 1: Select ──
  purposeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 20,
    gap: 12,
  },
  purposeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  purposeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  actionButtons: {
    marginTop: 16,
    gap: 10,
    alignItems: 'center',
  },
  tipCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 17,
  },
  formatBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 12,
  },
  templateButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
  },
  pickButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  parsingText: {
    marginTop: 12,
    fontSize: 13,
  },

  // ── Step 2: Preview ──
  summaryCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  typeBreakdown: {
    gap: 8,
    marginBottom: 16,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeError: {
    fontSize: 11,
    marginTop: 2,
  },
  errorsSection: {
    marginBottom: 16,
  },
  errorsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  errorInfo: {
    flex: 1,
  },
  errorLine: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 11,
    marginTop: 2,
  },
  moreErrors: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  importButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Step 3: Done ──
  doneContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  doneIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  doneSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  doneErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    width: '100%',
  },
});
