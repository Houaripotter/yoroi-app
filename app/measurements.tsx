import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import {
  ChevronLeft,
  Save,
  Ruler,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BodyMeasurement,
  addMeasurement,
  getAllMeasurements as getAllBodyMeasurements,
  getLatestMeasurement,
} from '@/lib/bodyComposition';
import { successHaptic } from '@/lib/haptics';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS, GRADIENTS, MEASUREMENT_COLORS } from '@/constants/design';
import { useTheme } from '@/lib/ThemeContext';
// 🔒 SÉCURITÉ: Protection contre les screenshots
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { BlurView } from 'expo-blur';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 120;

// ============================================
// MEASUREMENTS SCREEN
// ============================================

// Mini Line Chart Component
const MiniChart = ({
  data,
  color,
  width = CHART_WIDTH,
  height = CHART_HEIGHT,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  if (data.length < 2) return null;

  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minValue = Math.min(...data) * 0.95;
  const maxValue = Math.max(...data) * 1.05;
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y };
  });

  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 3;
    const cp1y = prev.y;
    const cp2x = prev.x + (2 * (point.x - prev.x)) / 3;
    const cp2y = point.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={areaD} fill={`url(#gradient-${color})`} />
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
      {points.length > 0 && (
        <Circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={4}
          fill={color}
        />
      )}
    </Svg>
  );
};

// Measurement Input Component
const MeasurementInput = ({
  label,
  value,
  onChangeText,
  color,
  lastValue,
  chartData,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  color: string;
  lastValue?: number;
  chartData?: number[];
}) => {
  const currentNum = value ? parseFloat(value.replace(',', '.')) : null;
  const diff = currentNum && lastValue ? currentNum - lastValue : null;

  return (
    <View style={styles.measurementCard}>
      <View style={styles.measurementHeader}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={styles.measurementLabel}>{label}</Text>
        {diff !== null && diff !== 0 && (
          <View style={[
            styles.diffBadge,
            { backgroundColor: diff < 0 ? COLORS.successMuted : COLORS.errorMuted }
          ]}>
            {diff < 0 ? (
              <TrendingDown size={12} color={COLORS.success} />
            ) : (
              <TrendingUp size={12} color={COLORS.error} />
            )}
            <Text style={[
              styles.diffText,
              { color: diff < 0 ? COLORS.success : COLORS.error }
            ]}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
            </Text>
          </View>
        )}
        {diff === 0 && (
          <View style={[styles.diffBadge, { backgroundColor: COLORS.surfaceLight }]}>
            <Minus size={12} color={COLORS.textMuted} />
            <Text style={[styles.diffText, { color: COLORS.textMuted }]}>0</Text>
          </View>
        )}
      </View>

      <View style={styles.measurementInputRow}>
        <TextInput
          style={styles.measurementInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={lastValue ? lastValue.toFixed(1) : '0.0'}
          placeholderTextColor={COLORS.textDim}
          keyboardType="decimal-pad"
        />
        <Text style={styles.measurementUnit}>cm</Text>
      </View>

      {/* Mini Chart */}
      {chartData && chartData.length > 1 && (
        <View style={styles.chartContainer}>
          <MiniChart data={chartData} color={color} />
        </View>
      )}

      {lastValue && (
        <Text style={styles.lastMeasurement}>
          Dernière: {lastValue.toFixed(1)} cm
        </Text>
      )}
    </View>
  );
};

// Body Illustration Component
const BodyIllustration = ({ measurements }: { measurements: any }) => {
  return (
    <View style={styles.bodyCard}>
      <LinearGradient
        colors={[COLORS.surface, COLORS.surfaceLight]}
        style={styles.bodyGradient}
      >
        <Text style={styles.bodyTitle}>Vue d'ensemble</Text>

        <View style={styles.bodyStats}>
          <View style={styles.bodyStat}>
            <View style={[styles.bodyStatIcon, { backgroundColor: `${MEASUREMENT_COLORS.chest}20` }]}>
              <View style={[styles.colorDotSmall, { backgroundColor: MEASUREMENT_COLORS.chest }]} />
            </View>
            <Text style={styles.bodyStatLabel}>Poitrine</Text>
            <Text style={styles.bodyStatValue}>
              {measurements.chest || '-'} cm
            </Text>
          </View>

          <View style={styles.bodyStat}>
            <View style={[styles.bodyStatIcon, { backgroundColor: `${MEASUREMENT_COLORS.waist}20` }]}>
              <View style={[styles.colorDotSmall, { backgroundColor: MEASUREMENT_COLORS.waist }]} />
            </View>
            <Text style={styles.bodyStatLabel}>Taille</Text>
            <Text style={styles.bodyStatValue}>
              {measurements.waist || '-'} cm
            </Text>
          </View>

          <View style={styles.bodyStat}>
            <View style={[styles.bodyStatIcon, { backgroundColor: `${MEASUREMENT_COLORS.hips}20` }]}>
              <View style={[styles.colorDotSmall, { backgroundColor: MEASUREMENT_COLORS.hips }]} />
            </View>
            <Text style={styles.bodyStatLabel}>Hanches</Text>
            <Text style={styles.bodyStatValue}>
              {measurements.hips || '-'} cm
            </Text>
          </View>
        </View>

        {/* Waist to Hip Ratio */}
        {measurements.waist && measurements.hips && (
          <View style={styles.ratioContainer}>
            <Text style={styles.ratioLabel}>Ratio taille/hanches</Text>
            <Text style={styles.ratioValue}>
              {(parseFloat(measurements.waist) / parseFloat(measurements.hips)).toFixed(2)}
            </Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default function MeasurementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // 🔒 SÉCURITÉ: Protection contre les screenshots
  const { isProtected, isBlurred, screenshotDetected } = useSensitiveScreen();

  // Form state
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [rightArm, setRightArm] = useState('');
  const [leftArm, setLeftArm] = useState('');
  const [rightThigh, setRightThigh] = useState('');
  const [leftThigh, setLeftThigh] = useState('');
  const [neck, setNeck] = useState('');
  const [shoulders, setShouders] = useState('');

  const [lastMeasurement, setLastMeasurement] = useState<BodyMeasurement | null>(null);
  const [allMeasurements, setAllMeasurements] = useState<BodyMeasurement[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const last = await getLatestMeasurement();
      setLastMeasurement(last);

      const all = await getAllBodyMeasurements();
      setAllMeasurements(all);
    } catch (error) {
      logger.error('Error loading data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Get chart data for a specific measurement
  const getChartData = (key: keyof BodyMeasurement): number[] => {
    return allMeasurements
      .filter(m => m[key] !== undefined)
      .map(m => m[key] as number)
      .slice(0, 10)
      .reverse();
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    // Check if at least one measurement is provided
    if (!chest && !waist && !hips && !rightArm && !leftArm && !rightThigh && !leftThigh && !neck && !shoulders) {
      showPopup('Erreur', 'Entre au moins une mesure', [
        { text: 'OK', style: 'primary' },
      ]);
      return;
    }

    setIsSubmitting(true);

    try {
      const data: Omit<BodyMeasurement, 'id'> = {
        date: format(new Date(), 'yyyy-MM-dd'),
        chest: chest ? parseFloat(chest.replace(',', '.')) : undefined,
        waist: waist ? parseFloat(waist.replace(',', '.')) : undefined,
        hips: hips ? parseFloat(hips.replace(',', '.')) : undefined,
        rightArm: rightArm ? parseFloat(rightArm.replace(',', '.')) : undefined,
        leftArm: leftArm ? parseFloat(leftArm.replace(',', '.')) : undefined,
        rightThigh: rightThigh ? parseFloat(rightThigh.replace(',', '.')) : undefined,
        leftThigh: leftThigh ? parseFloat(leftThigh.replace(',', '.')) : undefined,
        neck: neck ? parseFloat(neck.replace(',', '.')) : undefined,
        shoulders: shoulders ? parseFloat(shoulders.replace(',', '.')) : undefined,
      };

      await addMeasurement(data);
      successHaptic();

      showPopup('Enregistré !', 'Tes mensurations ont été sauvegardées.', [
        { text: 'OK', style: 'primary', onPress: () => router.back() },
      ]);
    } catch (error) {
      logger.error('Error saving:', error);
      showPopup('Erreur', 'Impossible de sauvegarder', [
        { text: 'OK', style: 'primary' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mensurations</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* 🔒 SÉCURITÉ: Avertissement screenshot détecté */}
        {screenshotDetected && (
          <View style={styles.screenshotWarning}>
            <Text style={styles.screenshotWarningText}>
              Screenshot détecté - Tes données sont sensibles
            </Text>
          </View>
        )}

        {/* Body Illustration */}
        <BodyIllustration
          measurements={{
            chest,
            waist,
            hips,
          }}
        />

        {/* Main Measurements */}
        <Text style={styles.sectionTitle}>Tronc</Text>

        <MeasurementInput
          label="Poitrine"
          value={chest}
          onChangeText={setChest}
          color={MEASUREMENT_COLORS.chest}
          lastValue={lastMeasurement?.chest}
          chartData={getChartData('chest')}
        />

        <MeasurementInput
          label="Tour de taille"
          value={waist}
          onChangeText={setWaist}
          color={MEASUREMENT_COLORS.waist}
          lastValue={lastMeasurement?.waist}
          chartData={getChartData('waist')}
        />

        <MeasurementInput
          label="Hanches"
          value={hips}
          onChangeText={setHips}
          color={MEASUREMENT_COLORS.hips}
          lastValue={lastMeasurement?.hips}
          chartData={getChartData('hips')}
        />

        <MeasurementInput
          label="Épaules"
          value={shoulders}
          onChangeText={setShouders}
          color={MEASUREMENT_COLORS.shoulders}
          lastValue={lastMeasurement?.shoulders}
          chartData={getChartData('shoulders')}
        />

        <MeasurementInput
          label="Cou"
          value={neck}
          onChangeText={setNeck}
          color={MEASUREMENT_COLORS.neck}
          lastValue={lastMeasurement?.neck}
          chartData={getChartData('neck')}
        />

        {/* Arms */}
        <Text style={styles.sectionTitle}>Bras</Text>

        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <MeasurementInput
              label="Bras droit"
              value={rightArm}
              onChangeText={setRightArm}
              color={MEASUREMENT_COLORS.arms}
              lastValue={lastMeasurement?.rightArm}
            />
          </View>
          <View style={styles.halfInput}>
            <MeasurementInput
              label="Bras gauche"
              value={leftArm}
              onChangeText={setLeftArm}
              color={MEASUREMENT_COLORS.arms}
              lastValue={lastMeasurement?.leftArm}
            />
          </View>
        </View>

        {/* Legs */}
        <Text style={styles.sectionTitle}>Jambes</Text>

        <View style={styles.rowInputs}>
          <View style={styles.halfInput}>
            <MeasurementInput
              label="Cuisse droite"
              value={rightThigh}
              onChangeText={setRightThigh}
              color={MEASUREMENT_COLORS.thighs}
              lastValue={lastMeasurement?.rightThigh}
            />
          </View>
          <View style={styles.halfInput}>
            <MeasurementInput
              label="Cuisse gauche"
              value={leftThigh}
              onChangeText={setLeftThigh}
              color={MEASUREMENT_COLORS.thighs}
              lastValue={lastMeasurement?.leftThigh}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={GRADIENTS.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Save size={20} color="#fff" />
            <Text style={styles.saveButtonText}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer les mensurations'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
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

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },

  // Body Card
  bodyCard: {
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  bodyGradient: {
    padding: SPACING.xl,
  },
  bodyTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  bodyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bodyStat: {
    alignItems: 'center',
  },
  bodyStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  colorDotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bodyStatLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  bodyStatValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  ratioContainer: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratioLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  ratioValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.accent,
  },

  // Section Title
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },

  // Measurement Card
  measurementCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  measurementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  measurementLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  diffText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  measurementInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    padding: 0,
  },
  measurementUnit: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
  chartContainer: {
    marginTop: SPACING.md,
    marginHorizontal: -SPACING.md,
  },
  lastMeasurement: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  // Row Inputs
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },

  // Save Button
  saveButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginTop: SPACING.xl,
    ...SHADOWS.glowAccent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#fff',
  },

  // 🔒 SÉCURITÉ: Styles pour l'avertissement screenshot
  screenshotWarning: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  screenshotWarningText: {
    color: '#FF9500',
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textAlign: 'center',
  },
});
