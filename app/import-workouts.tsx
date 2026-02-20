import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import {
  ArrowLeft,
  FileUp,
  Check,
  CheckCircle,
  Circle,
  ChevronDown,
  AlertCircle,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parseWorkoutFile, activityToTraining, ParsedActivity } from '@/lib/workoutImporter';
import { addTraining } from '@/lib/database';
import { SPORTS, getSportById, getSportIcon, getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';

const { width: screenWidth } = Dimensions.get('window');

export default function ImportWorkoutsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { t } = useI18n();

  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [activities, setActivities] = useState<ParsedActivity[]>([]);
  const [format, setFormat] = useState<'gpx' | 'tcx'>('gpx');
  const [errors, setErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [sportPickerIdx, setSportPickerIdx] = useState<number | null>(null);

  // ============================================
  // FILE SELECTION
  // ============================================

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'application/xml', 'text/xml', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      const fileName = file.name || 'unknown.gpx';

      // Validate extension
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext !== 'gpx' && ext !== 'tcx' && ext !== 'xml') {
        showPopup({
          type: 'error',
          title: t('common.error'),
          message: t('import.unsupportedFormat'),
        });
        return;
      }

      setIsParsing(true);

      const content = await FileSystem.readAsStringAsync(file.uri);

      const parseResult = parseWorkoutFile(content, fileName);
      setActivities(parseResult.activities);
      setFormat(parseResult.format);
      setErrors(parseResult.errors);

      if (parseResult.activities.length > 0) {
        setStep('preview');
        await impactAsync(ImpactFeedbackStyle.Medium);
      } else {
        showPopup({
          type: 'error',
          title: t('import.noActivities'),
          message: parseResult.errors.length > 0
            ? parseResult.errors[0]
            : t('import.noActivitiesMessage'),
        });
      }
    } catch (error: any) {
      logger.error('Import file error:', error);
      showPopup({
        type: 'error',
        title: t('common.error'),
        message: error.message || t('import.readError'),
      });
    } finally {
      setIsParsing(false);
    }
  };

  // ============================================
  // TOGGLE SELECTION
  // ============================================

  const toggleActivity = (id: string) => {
    setActivities(prev =>
      prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  };

  const toggleAll = () => {
    const allSelected = activities.every(a => a.selected);
    setActivities(prev => prev.map(a => ({ ...a, selected: !allSelected })));
  };

  // ============================================
  // CHANGE SPORT
  // ============================================

  const changeSport = (activityId: string, newSportId: string) => {
    setActivities(prev =>
      prev.map(a => a.id === activityId ? { ...a, yoroiSportId: newSportId } : a)
    );
    setSportPickerIdx(null);
  };

  // ============================================
  // IMPORT
  // ============================================

  const importSelected = async () => {
    const selected = activities.filter(a => a.selected);
    if (selected.length === 0) return;

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const activity of selected) {
        const training = activityToTraining(activity, activity.yoroiSportId);
        await addTraining(training);
        successCount++;
      }

      setImportedCount(successCount);
      setStep('done');
      await notificationAsync(NotificationFeedbackType.Success);

      showPopup({
        type: 'success',
        title: t('common.success'),
        message: t('import.successMessage', { count: successCount }),
      });
    } catch (error: any) {
      logger.error('Import error:', error);
      showPopup({
        type: 'error',
        title: t('common.error'),
        message: t('import.importError'),
      });
    } finally {
      setIsImporting(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const selectedCount = activities.filter(a => a.selected).length;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}` : ''}` : `${m} min`;
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
            {t('import.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {t('import.subtitle')}
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
          <View style={styles.selectContainer}>
            {/* Info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <FileUp size={20} color={colors.accent} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {t('import.formatInfo')}
              </Text>
            </View>

            {/* Format badges */}
            <View style={styles.formatBadges}>
              <View style={[styles.formatBadge, { backgroundColor: '#FF6B3520', borderColor: '#FF6B35' }]}>
                <Text style={[styles.formatBadgeText, { color: '#FF6B35' }]}>GPX</Text>
                <Text style={[styles.formatBadgeLabel, { color: colors.textMuted }]}>Strava</Text>
              </View>
              <View style={[styles.formatBadge, { backgroundColor: '#0099FF20', borderColor: '#0099FF' }]}>
                <Text style={[styles.formatBadgeText, { color: '#0099FF' }]}>TCX</Text>
                <Text style={[styles.formatBadgeLabel, { color: colors.textMuted }]}>Garmin</Text>
              </View>
            </View>

            {/* Pick button */}
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
                  <Text style={styles.pickButtonText}>{t('import.selectFile')}</Text>
                </>
              )}
            </TouchableOpacity>

            {isParsing && (
              <Text style={[styles.parsingText, { color: colors.textMuted }]}>
                {t('import.parsing')}
              </Text>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STEP 2: PREVIEW */}
        {/* ═══════════════════════════════════════ */}
        {step === 'preview' && (
          <View>
            {/* Result summary */}
            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                {t('import.activitiesFound', { count: activities.length })}
              </Text>
              <Text style={[styles.summaryFormat, { color: colors.textMuted }]}>
                {format.toUpperCase()} · {selectedCount} {t('import.selected')}
              </Text>
            </View>

            {/* Select all toggle */}
            <TouchableOpacity
              style={[styles.selectAllRow, { borderBottomColor: colors.border }]}
              onPress={toggleAll}
            >
              {activities.every(a => a.selected) ? (
                <CheckCircle size={20} color={colors.accent} />
              ) : (
                <Circle size={20} color={colors.textMuted} />
              )}
              <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>
                {t('import.selectAll')}
              </Text>
            </TouchableOpacity>

            {/* Errors */}
            {errors.length > 0 && (
              <View style={[styles.errorCard, { backgroundColor: '#FF4D4F15', borderColor: '#FF4D4F' }]}>
                <AlertCircle size={16} color="#FF4D4F" />
                <Text style={{ color: '#FF4D4F', fontSize: 12, flex: 1, marginLeft: 8 }}>
                  {errors[0]}
                </Text>
              </View>
            )}

            {/* Activity list */}
            {activities.map((activity, idx) => {
              const sport = getSportById(activity.yoroiSportId);
              const sportColor = sport?.color || '#6B7280';

              return (
                <View key={activity.id}>
                  <TouchableOpacity
                    style={[styles.activityCard, {
                      backgroundColor: colors.backgroundElevated,
                      borderColor: activity.selected ? sportColor : colors.border,
                      opacity: activity.selected ? 1 : 0.5,
                    }]}
                    onPress={() => toggleActivity(activity.id)}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox + Sport icon */}
                    <View style={styles.activityLeft}>
                      {activity.selected ? (
                        <CheckCircle size={22} color={colors.accent} />
                      ) : (
                        <Circle size={22} color={colors.textMuted} />
                      )}
                      <View style={[styles.sportIconContainer, { backgroundColor: sportColor + '20' }]}>
                        <MaterialCommunityIcons
                          name={(sport?.icon || 'trophy') as any}
                          size={22}
                          color={sportColor}
                        />
                      </View>
                    </View>

                    {/* Details */}
                    <View style={styles.activityDetails}>
                      <Text style={[styles.activityName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text style={[styles.activityDate, { color: colors.textMuted }]}>
                        {activity.date} · {activity.startTime}
                      </Text>

                      {/* Stats row */}
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                            {formatDuration(activity.durationMinutes)}
                          </Text>
                          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                            {t('import.duration')}
                          </Text>
                        </View>
                        {activity.distanceKm != null && (
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                              {activity.distanceKm} km
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                              {t('import.distance')}
                            </Text>
                          </View>
                        )}
                        {activity.avgHeartRate != null && (
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                              {activity.avgHeartRate} bpm
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>FC</Text>
                          </View>
                        )}
                        {activity.calories != null && (
                          <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                              {activity.calories} kcal
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cal</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Sport picker (inline) */}
                  <TouchableOpacity
                    style={[styles.sportPickerButton, { backgroundColor: sportColor + '15', borderColor: sportColor + '40' }]}
                    onPress={() => setSportPickerIdx(sportPickerIdx === idx ? null : idx)}
                  >
                    <MaterialCommunityIcons name={(sport?.icon || 'trophy') as any} size={16} color={sportColor} />
                    <Text style={[styles.sportPickerText, { color: sportColor }]}>
                      {getSportName(activity.yoroiSportId)}
                    </Text>
                    <ChevronDown size={14} color={sportColor} />
                  </TouchableOpacity>

                  {/* Sport grid (expanded) */}
                  {sportPickerIdx === idx && (
                    <View style={[styles.sportGrid, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                      {SPORTS.slice(0, 30).map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={[
                            styles.sportGridItem,
                            {
                              backgroundColor: activity.yoroiSportId === s.id ? s.color + '30' : colors.card,
                              borderColor: activity.yoroiSportId === s.id ? s.color : colors.border,
                            },
                          ]}
                          onPress={() => changeSport(activity.id, s.id)}
                        >
                          <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} />
                          <Text style={{ color: colors.textPrimary, fontSize: 10, marginTop: 2, textAlign: 'center' }} numberOfLines={1}>
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Import button */}
            <TouchableOpacity
              style={[styles.importButton, {
                backgroundColor: selectedCount > 0 ? colors.accent : colors.border,
              }]}
              onPress={importSelected}
              disabled={selectedCount === 0 || isImporting}
            >
              {isImporting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Check size={20} color="#FFF" />
                  <Text style={styles.importButtonText}>
                    {t('import.importButton', { count: selectedCount })}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Back to file picker */}
            <TouchableOpacity
              style={styles.changeFileButton}
              onPress={() => { setStep('select'); setActivities([]); setErrors([]); }}
            >
              <Text style={[styles.changeFileText, { color: colors.textMuted }]}>
                {t('import.changeFile')}
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
              {t('import.importDone')}
            </Text>
            <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>
              {t('import.importDoneMessage', { count: importedCount })}
            </Text>

            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: colors.accent }]}
              onPress={() => router.back()}
            >
              <Text style={styles.importButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeFileButton}
              onPress={() => { setStep('select'); setActivities([]); setErrors([]); setImportedCount(0); }}
            >
              <Text style={[styles.changeFileText, { color: colors.textMuted }]}>
                {t('import.importAnother')}
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
  // Select step
  selectContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  formatBadges: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  formatBadge: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  formatBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  formatBadgeLabel: {
    fontSize: 11,
    marginTop: 2,
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
    maxWidth: 320,
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
  // Preview step
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
  summaryFormat: {
    fontSize: 13,
    marginTop: 4,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  activityCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 12,
  },
  sportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
  },
  sportPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 72,
    marginBottom: 12,
  },
  sportPickerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sportGridItem: {
    width: (screenWidth - 32 - 24 - 40) / 5,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  importButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  changeFileButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  changeFileText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Done step
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
});
