import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BookOpen,
  Save,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Info,
  Sparkles,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { getAllMeasurements, Measurement } from '@/lib/storage';

// ============================================
// JOURNAL - NOTES ET RESSENTI
// 100% OFFLINE - AsyncStorage
// ============================================

// Types
export type MoodType = 'very_bad' | 'bad' | 'neutral' | 'good' | 'excellent';

export interface JournalEntry {
  id: string;
  date: string;
  mood: MoodType;
  note: string;
  createdAt: string;
}

interface MoodConfig {
  emoji: string;
  label: string;
  color: string;
  value: number; // Pour calculs
}

// Configuration des humeurs
const MOODS: Record<MoodType, MoodConfig> = {
  very_bad: { emoji: '😔', label: 'Difficile', color: '#EF4444', value: 1 },
  bad: { emoji: '😐', label: 'Bof', color: '#F97316', value: 2 },
  neutral: { emoji: '😊', label: 'Bien', color: '#EAB308', value: 3 },
  good: { emoji: '💪', label: 'Motivé', color: '#22C55E', value: 4 },
  excellent: { emoji: '🔥', label: 'En feu !', color: '#D4AF37', value: 5 },
};

const MOOD_ORDER: MoodType[] = ['very_bad', 'bad', 'neutral', 'good', 'excellent'];

// Storage key
const JOURNAL_STORAGE_KEY = '@yoroi_journal_entries';

// Helpers
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === getToday()) {
    return "Aujourd'hui";
  }
  if (dateStr === yesterday.toISOString().split('T')[0]) {
    return 'Hier';
  }

  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return date.toLocaleDateString('fr-FR', options);
};

const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  return date.toLocaleDateString('fr-FR', options);
};

export default function JournalScreen() {
  const { colors } = useTheme();

  // State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [note, setNote] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<MoodType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  // Animation
  const saveAnim = useState(new Animated.Value(1))[0];

  // Load data
  useEffect(() => {
    loadJournalEntries();
    loadMeasurements();
  }, []);

  const loadJournalEntries = async () => {
    try {
      const data = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
      if (data) {
        const parsed: JournalEntry[] = JSON.parse(data);
        setEntries(parsed.sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));

        // Check if there's an entry for today
        const today = getToday();
        const todayE = parsed.find(e => e.date === today);
        if (todayE) {
          setTodayEntry(todayE);
          setSelectedMood(todayE.mood);
          setNote(todayE.note);
        }
      }
    } catch (error) {
      console.error('Erreur chargement journal:', error);
    }
  };

  const loadMeasurements = async () => {
    try {
      const data = await getAllMeasurements();
      setMeasurements(data);
    } catch (error) {
      console.error('Erreur chargement mesures:', error);
    }
  };

  const saveEntry = async () => {
    if (!selectedMood) {
      Alert.alert('Humeur requise', 'Selectionne comment tu te sens aujourd\'hui');
      return;
    }

    try {
      const today = getToday();
      let updatedEntries = [...entries];

      if (todayEntry) {
        // Update existing entry
        updatedEntries = updatedEntries.map(e =>
          e.id === todayEntry.id
            ? { ...e, mood: selectedMood, note: note.trim() }
            : e
        );
      } else {
        // Create new entry
        const newEntry: JournalEntry = {
          id: generateId(),
          date: today,
          mood: selectedMood,
          note: note.trim(),
          createdAt: new Date().toISOString(),
        };
        updatedEntries = [newEntry, ...updatedEntries];
        setTodayEntry(newEntry);
      }

      await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updatedEntries));
      setEntries(updatedEntries);

      // Animation
      Animated.sequence([
        Animated.timing(saveAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.timing(saveAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();

      Alert.alert('Enregistre !', 'Ton ressenti du jour est sauvegarde.');
    } catch (error) {
      console.error('Erreur sauvegarde journal:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  const deleteEntry = async (id: string) => {
    Alert.alert(
      'Supprimer ?',
      'Cette entree sera definitivement supprimee.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = entries.filter(e => e.id !== id);
              await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated));
              setEntries(updated);

              if (todayEntry?.id === id) {
                setTodayEntry(null);
                setSelectedMood(null);
                setNote('');
              }
            } catch (error) {
              console.error('Erreur suppression:', error);
            }
          },
        },
      ]
    );
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = entries.filter(e => e.date !== getToday()); // Exclude today

    if (filterMood) {
      result = result.filter(e => e.mood === filterMood);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.note.toLowerCase().includes(query) ||
        MOODS[e.mood].label.toLowerCase().includes(query)
      );
    }

    return result;
  }, [entries, filterMood, searchQuery]);

  // Mood/Weight correlation analysis
  const moodWeightAnalysis = useMemo(() => {
    if (entries.length < 7 || measurements.length < 7) {
      return null;
    }

    // Group measurements by date
    const measurementsByDate: Record<string, number> = {};
    measurements.forEach(m => {
      measurementsByDate[m.date] = m.weight;
    });

    // Calculate weight change for days with good vs bad mood
    const goodMoodDays: number[] = [];
    const badMoodDays: number[] = [];

    entries.forEach(entry => {
      const currentWeight = measurementsByDate[entry.date];
      if (!currentWeight) return;

      // Find previous measurement
      const prevDate = new Date(entry.date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevWeight = measurementsByDate[prevDate.toISOString().split('T')[0]];

      if (prevWeight) {
        const change = currentWeight - prevWeight;
        const moodValue = MOODS[entry.mood].value;

        if (moodValue >= 4) {
          goodMoodDays.push(change);
        } else if (moodValue <= 2) {
          badMoodDays.push(change);
        }
      }
    });

    if (goodMoodDays.length < 3 || badMoodDays.length < 3) {
      return null;
    }

    const avgGood = goodMoodDays.reduce((a, b) => a + b, 0) / goodMoodDays.length;
    const avgBad = badMoodDays.reduce((a, b) => a + b, 0) / badMoodDays.length;

    return {
      goodMoodAvg: avgGood,
      badMoodAvg: avgBad,
      difference: avgBad - avgGood,
      betterWhenHappy: avgGood < avgBad,
    };
  }, [entries, measurements]);

  // Stats
  const stats = useMemo(() => {
    if (entries.length === 0) return null;

    const moodCounts: Record<MoodType, number> = {
      very_bad: 0,
      bad: 0,
      neutral: 0,
      good: 0,
      excellent: 0,
    };

    entries.forEach(e => {
      moodCounts[e.mood]++;
    });

    const mostFrequent = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as MoodType;

    const avgMood = entries.reduce((sum, e) => sum + MOODS[e.mood].value, 0) / entries.length;

    // Current streak of good mood (>= neutral)
    let streak = 0;
    for (const entry of entries) {
      if (MOODS[entry.mood].value >= 3) {
        streak++;
      } else {
        break;
      }
    }

    return {
      total: entries.length,
      moodCounts,
      mostFrequent,
      avgMood,
      streak,
    };
  }, [entries]);

  return (
    <ScreenWrapper>
      <Header title="Mon Journal" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.goldMuted }]}>
            <BookOpen size={24} color={colors.gold} />
            <Text style={[styles.infoText, { color: colors.gold }]}>
              Note ton ressenti pour suivre ton mental de guerrier
            </Text>
          </View>

          {/* Today's Entry */}
          <Card style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Calendar size={20} color={colors.gold} />
              <Text style={[styles.todayTitle, { color: colors.textPrimary }]}>
                {formatFullDate(getToday())}
              </Text>
            </View>

            <Text style={[styles.moodQuestion, { color: colors.textSecondary }]}>
              Comment te sens-tu ?
            </Text>

            {/* Mood Selector */}
            <View style={styles.moodSelector}>
              {MOOD_ORDER.map((mood) => {
                const config = MOODS[mood];
                const isSelected = selectedMood === mood;

                return (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.moodButton,
                      { backgroundColor: isSelected ? config.color + '30' : colors.cardHover },
                      isSelected && { borderColor: config.color, borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedMood(mood)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.moodEmoji}>{config.emoji}</Text>
                    <Text style={[
                      styles.moodLabel,
                      { color: isSelected ? config.color : colors.textMuted }
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Note Input */}
            <Text style={[styles.noteLabel, { color: colors.textSecondary }]}>
              Note (optionnel)
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.cardHover,
                  color: colors.textPrimary,
                  borderColor: colors.border,
                }
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Comment s'est passee ta journee ?"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Save Button */}
            <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: selectedMood ? colors.gold : colors.cardHover }
                ]}
                onPress={saveEntry}
                disabled={!selectedMood}
                activeOpacity={0.8}
              >
                <Save size={20} color={selectedMood ? colors.background : colors.textMuted} />
                <Text style={[
                  styles.saveButtonText,
                  { color: selectedMood ? colors.background : colors.textMuted }
                ]}>
                  {todayEntry ? 'Mettre a jour' : 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Card>

          {/* Mood/Weight Correlation */}
          {moodWeightAnalysis && (
            <TouchableOpacity
              style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowAnalysis(!showAnalysis)}
              activeOpacity={0.7}
            >
              <View style={styles.analysisHeader}>
                <Sparkles size={20} color={colors.gold} />
                <Text style={[styles.analysisTitle, { color: colors.textPrimary }]}>
                  Correlation Humeur / Poids
                </Text>
                {showAnalysis ? (
                  <ChevronUp size={20} color={colors.textMuted} />
                ) : (
                  <ChevronDown size={20} color={colors.textMuted} />
                )}
              </View>

              {showAnalysis && (
                <View style={styles.analysisContent}>
                  {moodWeightAnalysis.betterWhenHappy ? (
                    <>
                      <View style={[styles.analysisBadge, { backgroundColor: colors.successMuted }]}>
                        <TrendingDown size={18} color={colors.success} />
                        <Text style={[styles.analysisBadgeText, { color: colors.success }]}>
                          Les jours ou tu te sens {MOODS.good.emoji} ou {MOODS.excellent.emoji}
                        </Text>
                      </View>
                      <Text style={[styles.analysisResult, { color: colors.gold }]}>
                        Tu perds en moyenne {Math.abs(moodWeightAnalysis.difference * 1000).toFixed(0)}g de plus !
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.analysisResult, { color: colors.textSecondary }]}>
                      Continue a noter ton humeur pour decouvrir des correlations !
                    </Text>
                  )}

                  <Text style={[styles.analysisTip, { color: colors.textMuted }]}>
                    Le mental impacte ta progression. Prends soin de toi !
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Stats Summary */}
          {stats && stats.total >= 3 && (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.gold }]}>{stats.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>entrees</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={styles.statEmoji}>{MOODS[stats.mostFrequent].emoji}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>humeur freq.</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.success }]}>{stats.streak}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>jours positifs</Text>
              </View>
            </View>
          )}

          {/* Search & Filter */}
          {entries.length > 1 && (
            <View style={styles.filterSection}>
              <View style={[styles.searchContainer, { backgroundColor: colors.cardHover }]}>
                <Search size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.textMuted}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: showFilters ? colors.goldMuted : colors.cardHover }
                ]}
                onPress={() => setShowFilters(!showFilters)}
              >
                <Filter size={18} color={showFilters ? colors.gold : colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Filter Options */}
          {showFilters && (
            <View style={[styles.filterOptions, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.filterTitle, { color: colors.textSecondary }]}>
                Filtrer par humeur
              </Text>
              <View style={styles.filterMoods}>
                <TouchableOpacity
                  style={[
                    styles.filterMoodButton,
                    { backgroundColor: !filterMood ? colors.gold : colors.cardHover }
                  ]}
                  onPress={() => setFilterMood(null)}
                >
                  <Text style={[
                    styles.filterMoodText,
                    { color: !filterMood ? colors.background : colors.textSecondary }
                  ]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {MOOD_ORDER.map((mood) => (
                  <TouchableOpacity
                    key={mood}
                    style={[
                      styles.filterMoodButton,
                      { backgroundColor: filterMood === mood ? MOODS[mood].color : colors.cardHover }
                    ]}
                    onPress={() => setFilterMood(filterMood === mood ? null : mood)}
                  >
                    <Text style={styles.filterMoodEmoji}>{MOODS[mood].emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Previous Entries */}
          {filteredEntries.length > 0 && (
            <View style={styles.entriesSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Entrees precedentes
              </Text>

              {filteredEntries.map((entry) => {
                const moodConfig = MOODS[entry.mood];
                const isExpanded = expandedEntry === entry.id;

                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.entryCard,
                      { backgroundColor: colors.card, borderColor: colors.border }
                    ]}
                    onPress={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.entryHeader}>
                      <View style={[styles.entryMoodBadge, { backgroundColor: moodConfig.color + '20' }]}>
                        <Text style={styles.entryMoodEmoji}>{moodConfig.emoji}</Text>
                      </View>
                      <View style={styles.entryInfo}>
                        <Text style={[styles.entryDate, { color: colors.textPrimary }]}>
                          {formatDate(entry.date)}
                        </Text>
                        {entry.note && !isExpanded && (
                          <Text
                            style={[styles.entryPreview, { color: colors.textMuted }]}
                            numberOfLines={1}
                          >
                            {entry.note}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteEntry(entry.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {isExpanded && entry.note && (
                      <View style={[styles.entryExpanded, { borderTopColor: colors.border }]}>
                        <Text style={[styles.entryNote, { color: colors.textSecondary }]}>
                          {entry.note}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {entries.length === 0 && (
            <View style={styles.emptyState}>
              <BookOpen size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                Ton journal est vide
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Commence par noter ton humeur du jour !
              </Text>
            </View>
          )}

          {/* Tips */}
          <View style={[styles.tipCard, { backgroundColor: colors.cardHover }]}>
            <Info size={18} color={colors.textMuted} />
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.textSecondary }]}>
                Astuce Guerrier
              </Text>
              <Text style={[styles.tipText, { color: colors.textMuted }]}>
                Noter ton ressenti aide a identifier ce qui influence ta progression.
                Le mental est aussi important que le physique !
              </Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // Today Card
  todayCard: {
    marginBottom: 20,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  moodQuestion: {
    fontSize: 15,
    marginBottom: 12,
  },

  // Mood Selector
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Note Input
  noteLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  noteInput: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    minHeight: 100,
    marginBottom: 16,
  },

  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Analysis Card
  analysisCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analysisTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  analysisContent: {
    marginTop: 16,
  },
  analysisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  analysisBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  analysisResult: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  analysisTip: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statEmoji: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
  },

  // Filter Section
  filterSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter Options
  filterOptions: {
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterMoods: {
    flexDirection: 'row',
    gap: 8,
  },
  filterMoodButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  filterMoodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterMoodEmoji: {
    fontSize: 20,
  },

  // Entries Section
  entriesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Entry Card
  entryCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  entryMoodBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMoodEmoji: {
    fontSize: 22,
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  entryPreview: {
    fontSize: 13,
    marginTop: 2,
  },
  entryExpanded: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    marginTop: 0,
  },
  entryNote: {
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 14,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
