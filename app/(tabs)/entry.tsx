import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { TrendingDown, TrendingUp, Check, Calendar, Scale, Flame, Droplet, Dumbbell, Activity, Zap, Bone, Gauge, Ruler, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { theme } from '@/lib/theme';

interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  previousWeight?: number;
  trend?: number;
}

export default function EntryScreen() {
  const [newWeight, setNewWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [bodyFat, setBodyFat] = useState('');
  const [water, setWater] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [metabolicAge, setMetabolicAge] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [bmr, setBmr] = useState('');
  const [arms, setArms] = useState('');
  const [chest, setChest] = useState('');
  const [navel, setNavel] = useState('');
  const [hips, setHips] = useState('');
  const [thighs, setThighs] = useState('');
  const [notes, setNotes] = useState('');
  const [records] = useState<WeightRecord[]>([]);

  const handleAddWeight = async () => {
    if (!newWeight) {
      Alert.alert('Erreur', 'Veuillez entrer un poids');
      return;
    }

    const weightNum = parseFloat(newWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un poids valide');
      return;
    }

    try {
      const { data, error } = await supabase.from('measurements').insert([
        {
          weight: weightNum,
          date: selectedDate,
          fat_ratio: bodyFat ? parseFloat(bodyFat) : null,
          muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
        },
      ]);

      if (error) {
        throw error;
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Succès', 'Données sauvegardées !');
      setNewWeight('');
      setBodyFat('');
      setMuscleMass('');
      // Réinitialiser d'autres champs si nécessaire
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la sauvegarde.');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }

    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const renderRecord = ({ item }: { item: WeightRecord }) => {
    const hasTrend = item.trend !== undefined && item.trend !== 0;
    const isLoss = hasTrend && item.trend! < 0;
    const trendColor = isLoss ? '#68B892' : '#FF8A65';

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordMain}>
          <View style={styles.recordLeft}>
            <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
            {hasTrend && (
              <View style={styles.trendContainer}>
                {isLoss ? (
                  <TrendingDown size={14} color={trendColor} strokeWidth={2.5} />
                ) : (
                  <TrendingUp size={14} color={trendColor} strokeWidth={2.5} />
                )}
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {isLoss ? '' : '+'}{item.trend!.toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.recordWeight}>{item.weight.toFixed(1)} kg</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
      <View style={styles.inputPanel}>
        <Text style={styles.inputTitle}>Saisie Rapide</Text>

        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Calendar size={14} color="#636E72" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Date</Text>
            </View>
            <TextInput
              style={styles.dateInput}
              value={selectedDate}
              onChangeText={setSelectedDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C7C7CC"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <View style={styles.labelRow}>
              <Scale size={14} color="#636E72" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Poids (kg)</Text>
            </View>
            <TextInput
              style={styles.weightInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={setNewWeight}
            />
          </View>
        </View>

        <Text style={styles.optionalTitle}>Métriques Tanita (optionnel)</Text>
        <View style={styles.tanitaGrid}>
          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Flame size={12} color="#FF9500" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Graisse (%)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={bodyFat}
              onChangeText={setBodyFat}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Droplet size={12} color="#32ADE6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Eau (%)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={water}
              onChangeText={setWater}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Dumbbell size={12} color="#5856D6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Muscle (kg)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={muscleMass}
              onChangeText={setMuscleMass}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Activity size={12} color="#FF3B30" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Viscéral</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0"
              placeholderTextColor="#C7C7CC"
              keyboardType="number-pad"
              value={visceralFat}
              onChangeText={setVisceralFat}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Zap size={12} color="#8E8E93" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Âge métab.</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0"
              placeholderTextColor="#C7C7CC"
              keyboardType="number-pad"
              value={metabolicAge}
              onChangeText={setMetabolicAge}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Bone size={12} color="#A0AEC0" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Masse Os. (kg)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={boneMass}
              onChangeText={setBoneMass}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Gauge size={12} color="#F59E0B" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>BMR (kcal)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0"
              placeholderTextColor="#C7C7CC"
              keyboardType="number-pad"
              value={bmr}
              onChangeText={setBmr}
            />
          </View>

        </View>

        <Text style={styles.optionalTitle}>Mensurations (optionnel)</Text>
        <View style={styles.tanitaGrid}>
          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Ruler size={12} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Bras (cm)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={arms}
              onChangeText={setArms}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Ruler size={12} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Thorax (cm)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={chest}
              onChangeText={setChest}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Ruler size={12} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Nombril (cm)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={navel}
              onChangeText={setNavel}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Ruler size={12} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Hanche (cm)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={hips}
              onChangeText={setHips}
            />
          </View>

          <View style={styles.gridItem}>
            <View style={styles.labelRow}>
              <Ruler size={12} color="#8B5CF6" strokeWidth={2.5} />
              <Text style={styles.inputLabel}>Cuisse (cm)</Text>
            </View>
            <TextInput
              style={styles.smallInput}
              placeholder="0.0"
              placeholderTextColor="#C7C7CC"
              keyboardType="decimal-pad"
              value={thighs}
              onChangeText={setThighs}
            />
          </View>
        </View>

        <Text style={styles.optionalTitle}>Notes (optionnel)</Text>
        <View style={styles.notesContainer}>
          <View style={styles.labelRow}>
            <FileText size={14} color="#636E72" strokeWidth={2.5} />
            <Text style={styles.inputLabel}>Commentaires de la journée</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Ex: Repas du soir, mauvaise nuit, état de forme..."
            placeholderTextColor="#C7C7CC"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleAddWeight}
          activeOpacity={0.8}
        >
          <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.submitButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Historique</Text>
        {records.map((record) => (
          <View key={record.id}>
            {renderRecord({ item: record })}
          </View>
        ))}
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inputPanel: {
    backgroundColor: theme.colors.surface,
    paddingTop: 60,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    borderBottomLeftRadius: theme.radius.xxl,
    borderBottomRightRadius: theme.radius.xxl,
    ...theme.shadow.sm,
  },
  inputTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: theme.spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dateInput: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    minWidth: 140,
  },
  weightInput: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    letterSpacing: -0.5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    ...theme.shadow.md,
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.surface,
    letterSpacing: 0.3,
  },
  historyContainer: {
    flex: 1,
    paddingTop: theme.spacing.xxl,
  },
  historyTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  listContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  recordCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
    ...theme.shadow.sm,
  },
  recordMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordLeft: {
    flex: 1,
    gap: 6,
  },
  recordDate: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.black,
    letterSpacing: -0.2,
  },
  recordWeight: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  optionalTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  tanitaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  gridItem: {
    width: '30%',
    gap: theme.spacing.sm,
  },
  smallInput: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    letterSpacing: -0.3,
  },
  notesContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  notesInput: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    minHeight: 100,
    letterSpacing: -0.2,
  },
});
