// ============================================
// 🥊 YOROI - AJOUTER UN COMBAT
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  Trophy,
  Save,
  User,
  Building2,
  Scale,
  Clock,
  FileText,
  Target,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { addCombat, getCompetitions } from '@/lib/fighterModeService';
import { Competition, CombatResultat, CombatMethode } from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';

const RESULTATS: { value: CombatResultat; label: string; color: string }[] = [
  { value: 'victoire', label: 'Victoire', color: '#4CAF50' },
  { value: 'defaite', label: 'Défaite', color: '#F44336' },
  { value: 'nul', label: 'Nul', color: '#9E9E9E' },
];

const METHODES: { value: CombatMethode; label: string }[] = [
  { value: 'soumission', label: 'Soumission' },
  { value: 'ko', label: 'KO' },
  { value: 'tko', label: 'TKO' },
  { value: 'points', label: 'Points' },
  { value: 'decision', label: 'Décision' },
  { value: 'dq', label: 'Disqualification' },
];

export default function AddCombatScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const competitionIdParam = params.competitionId as string | undefined;

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [resultat, setResultat] = useState<CombatResultat>('victoire');
  const [methode, setMethode] = useState<CombatMethode | ''>('');
  const [technique, setTechnique] = useState('');
  const [round, setRound] = useState('');
  const [temps, setTemps] = useState('');
  const [adversaireNom, setAdversaireNom] = useState('');
  const [adversaireClub, setAdversaireClub] = useState('');
  const [poidsPesee, setPoidsPesee] = useState('');
  const [poidsJourJ, setPoidsJourJ] = useState('');
  const [notes, setNotes] = useState('');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(
    competitionIdParam ? parseInt(competitionIdParam) : null
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    const comps = await getCompetitions();
    setCompetitions(comps);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSave = async () => {
    if (!adversaireNom.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom de l\'adversaire');
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await addCombat({
        competition_id: selectedCompetitionId || undefined,
        date: date.toISOString().split('T')[0],
        resultat,
        methode: methode || undefined,
        technique: technique.trim() || undefined,
        round: round ? parseInt(round) : undefined,
        temps: temps.trim() || undefined,
        adversaire_nom: adversaireNom.trim(),
        adversaire_club: adversaireClub.trim() || undefined,
        poids_pesee: poidsPesee ? parseFloat(poidsPesee) : undefined,
        poids_jour_j: poidsJourJ ? parseFloat(poidsJourJ) : undefined,
        notes: notes.trim() || undefined,
      });

      router.back();
    } catch (error) {
      console.error('Error saving combat:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le combat');
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Nouveau Combat" showBack />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Competition (Optional) */}
        {competitions.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Compétition (optionnel)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.competitionsRow}
            >
              <TouchableOpacity
                style={[
                  styles.competitionChip,
                  {
                    backgroundColor:
                      selectedCompetitionId === null
                        ? colors.accent
                        : colors.backgroundCard,
                    borderColor:
                      selectedCompetitionId === null ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCompetitionId(null);
                }}
              >
                <Text
                  style={[
                    styles.competitionChipText,
                    {
                      color:
                        selectedCompetitionId === null
                          ? '#FFFFFF'
                          : colors.textPrimary,
                    },
                  ]}
                >
                  Combat libre
                </Text>
              </TouchableOpacity>

              {competitions.map((comp) => (
                <TouchableOpacity
                  key={comp.id}
                  style={[
                    styles.competitionChip,
                    {
                      backgroundColor:
                        selectedCompetitionId === comp.id
                          ? colors.accent
                          : colors.backgroundCard,
                      borderColor:
                        selectedCompetitionId === comp.id
                          ? colors.accent
                          : colors.border,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCompetitionId(comp.id);
                  }}
                >
                  <Text
                    style={[
                      styles.competitionChipText,
                      {
                        color:
                          selectedCompetitionId === comp.id
                            ? '#FFFFFF'
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {comp.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Date */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Date du combat *
          </Text>
          <TouchableOpacity
            style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Calendar size={20} color={colors.textMuted} />
            <Text style={[styles.inputText, { color: colors.textPrimary }]}>
              {date.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Adversaire */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Adversaire *
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
            <User size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Nom de l'adversaire"
              placeholderTextColor={colors.textMuted}
              value={adversaireNom}
              onChangeText={setAdversaireNom}
            />
          </View>
        </View>

        {/* Club adversaire */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Club de l'adversaire
          </Text>
          <View style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}>
            <Building2 size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ex: Gracie Barra Paris"
              placeholderTextColor={colors.textMuted}
              value={adversaireClub}
              onChangeText={setAdversaireClub}
            />
          </View>
        </View>

        {/* Résultat */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Résultat *
          </Text>
          <View style={styles.resultatRow}>
            {RESULTATS.map((res) => (
              <TouchableOpacity
                key={res.value}
                style={[
                  styles.resultatChip,
                  {
                    backgroundColor:
                      resultat === res.value ? res.color : colors.backgroundCard,
                    borderColor:
                      resultat === res.value ? res.color : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setResultat(res.value);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resultatText,
                    {
                      color:
                        resultat === res.value ? '#FFFFFF' : colors.textPrimary,
                    },
                  ]}
                >
                  {res.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Méthode */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Méthode</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.methodesRow}
          >
            {METHODES.map((meth) => (
              <TouchableOpacity
                key={meth.value}
                style={[
                  styles.methodeChip,
                  {
                    backgroundColor:
                      methode === meth.value ? colors.accent : colors.backgroundCard,
                    borderColor:
                      methode === meth.value ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMethode(meth.value);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.methodeText,
                    {
                      color:
                        methode === meth.value ? '#FFFFFF' : colors.textPrimary,
                    },
                  ]}
                >
                  {meth.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Technique */}
        {(methode === 'soumission' || methode === 'ko' || methode === 'tko') && (
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Technique
            </Text>
            <View
              style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            >
              <Zap size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Ex: Triangle, Crochet gauche..."
                placeholderTextColor={colors.textMuted}
                value={technique}
                onChangeText={setTechnique}
              />
            </View>
          </View>
        )}

        {/* Round et Temps */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Round</Text>
            <View
              style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            >
              <Target size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                value={round}
                onChangeText={setRound}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Temps</Text>
            <View
              style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            >
              <Clock size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="3:42"
                placeholderTextColor={colors.textMuted}
                value={temps}
                onChangeText={setTemps}
              />
            </View>
          </View>
        </View>

        {/* Poids pesée et Poids jour J */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Poids pesée
            </Text>
            <View
              style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            >
              <Scale size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="70.5"
                placeholderTextColor={colors.textMuted}
                value={poidsPesee}
                onChangeText={setPoidsPesee}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={[styles.field, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Poids jour J
            </Text>
            <View
              style={[styles.inputContainer, { backgroundColor: colors.backgroundCard }]}
            >
              <Scale size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="72.0"
                placeholderTextColor={colors.textMuted}
                value={poidsJourJ}
                onChangeText={setPoidsJourJ}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
          <View
            style={[
              styles.textareaContainer,
              { backgroundColor: colors.backgroundCard },
            ]}
          >
            <FileText size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.textarea, { color: colors.textPrimary }]}
              placeholder="Stratégie, points à améliorer..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.accent, opacity: isSaving ? 0.5 : 1 },
          ]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  textareaContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    minHeight: 100,
  },
  textarea: {
    flex: 1,
    fontSize: 15,
  },

  // Competitions
  competitionsRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  competitionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
  },
  competitionChipText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Résultat
  resultatRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  resultatChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    alignItems: 'center',
  },
  resultatText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Méthodes
  methodesRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  methodeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
  },
  methodeText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Bottom
  bottomContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
