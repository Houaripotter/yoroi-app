import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Check, X, Plus, Clock } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useFocusEffect } from 'expo-router';
import { getUserSettings, saveUserSettings, addWorkout, getAllWorkouts, getUserClubs } from '@/lib/storage';
import { UserClub } from '@/lib/storage';
import { WorkoutType } from '@/types/workout';
import { WORKOUT_TYPES } from '@/types/workout';
import { RewardOverlay } from '@/components/RewardOverlay';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';

interface RoutineBlock {
  time: string;
  activity: string;
  workoutType?: string; // Type d'entraînement (ex: "Pecs et bras")
}

export default function SportScreen() {
  const { colors: themeColors } = useTheme();
  const [routine, setRoutine] = useState<{ [key: string]: Array<RoutineBlock> }>({});
  const [loading, setLoading] = useState(true);
  const [customLogos, setCustomLogos] = useState<{ [key: string]: string }>({});
  const [selectedClubGlobal, setSelectedClubGlobal] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedClubModal, setSelectedClubModal] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [workoutType, setWorkoutType] = useState<string>('');
  const rewardOverlayRef = useRef<{ trigger: () => void }>(null);

  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Obtenir les clubs depuis le stockage ou utiliser les défauts
  const getAvailableClubs = (): Array<{
    id: string;
    name: string;
    type: WorkoutType;
    logo: any;
    emoji?: string;
    color: string;
  }> => {
    if (userClubs.length > 0) {
      return userClubs.map(club => ({
        id: club.id,
        name: club.name,
        type: club.type as WorkoutType,
        logo: club.logoUri ? { uri: club.logoUri } : null,
        emoji: getEmojiForType(club.type),
        color: getColorForType(club.type),
      }));
    }
    // Fallback vers les clubs par défaut
    return [
      {
        id: 'gracie_barra',
        name: 'Gracie Barra',
        type: 'gracie_barra' as WorkoutType,
        logo: null,
        emoji: '🥋',
        color: '#DC2626',
      },
      {
        id: 'basic_fit',
        name: 'Basic Fit',
        type: 'basic_fit' as WorkoutType,
        logo: null,
        emoji: '🏋️',
        color: '#F59E0B',
      },
      {
        id: 'running',
        name: 'Running',
        type: 'running' as WorkoutType,
        logo: null,
        emoji: '🏃',
        color: '#10B981',
      },
    ];
  };

  const getEmojiForType = (type: string) => {
    if (type === 'gracie_barra') return '🥋';
    if (type === 'basic_fit') return '🏋️';
    if (type === 'running') return '🏃';
    return '⚡';
  };

  const getDefaultLogoForType = (type: string) => {
    // Les logos sont gérés par logoUri, sinon on utilise des emojis
    return null;
  };

  const getColorForType = (type: string) => {
    if (type === 'gracie_barra') return '#DC2626';
    if (type === 'basic_fit') return '#F59E0B';
    if (type === 'running') return '#10B981';
    if (type === 'mma') return '#EF4444';
    if (type === 'foot') return '#3B82F6';
    return '#64748B';
  };

  // Obtenir le jour de la semaine actuel (0 = Dimanche, 1 = Lundi, etc.)
  const getCurrentDayIndex = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    // Convertir: Dimanche (0) -> 6, Lundi (1) -> 0, etc.
    return day === 0 ? 6 : day - 1;
  };

  const loadData = useCallback(async () => {
    try {
      const [settings, clubs] = await Promise.all([
        getUserSettings(),
        getUserClubs(),
      ]);
      
      if ((settings as any).weekly_routine) {
        setRoutine((settings as any).weekly_routine);
      }
      if ((settings as any).custom_club_logos) {
        setCustomLogos((settings as any).custom_club_logos);
      }
      if ((settings as any).selected_club) {
        setSelectedClubGlobal((settings as any).selected_club);
      }
      
      setUserClubs(clubs);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Calcul du résumé hebdomadaire (doit être avant le return conditionnel)
  const weeklySummary = useMemo(() => {
    let totalSessions = 0;
    let totalHours = 0;
    
    Object.values(routine).forEach(dayRoutine => {
      if (dayRoutine && dayRoutine.length > 0) {
        dayRoutine.forEach(block => {
          if (block.activity !== 'REPOS') {
            totalSessions++;
            // Estimer 1h par session (peut être amélioré)
            totalHours += 1;
          }
        });
      }
    });

    return { totalSessions, totalHours };
  }, [routine]);

  // Obtenir l'activité pour un jour donné
  const getActivityForDay = (dayKey: string): { type: WorkoutType | 'rest' | null; label: string; clubId?: string } | null => {
    const dayRoutine = routine[dayKey] || [];
    if (dayRoutine.length === 0) return null;
    
    // Si c'est un jour de repos
    if (dayRoutine.length === 1 && dayRoutine[0]?.activity === 'REPOS') {
      return { type: 'rest', label: '💤 Repos' };
    }
    
    // Prendre la première activité
    const firstActivity = dayRoutine[0]?.activity || '';
    const availableClubs = getAvailableClubs();
    const club = availableClubs.find(c => c.name === firstActivity) || userClubs.find(c => c.name === firstActivity);
    
    if (club && (club.type === 'gracie_barra' || club.type === 'basic_fit' || club.type === 'running')) {
      return { type: club.type as WorkoutType, label: club.name, clubId: club.id };
    }
    
    // Fallback pour compatibilité avec anciennes données
    if (firstActivity.toLowerCase().includes('jujitsu') || firstActivity.toLowerCase().includes('jjb') || firstActivity.toLowerCase().includes('gracie')) {
      return { type: 'gracie_barra', label: '🥋 JJB', clubId: 'gracie_barra' };
    }
    if (firstActivity.toLowerCase().includes('muscu') || firstActivity.toLowerCase().includes('musculation') || firstActivity.toLowerCase().includes('basic')) {
      return { type: 'basic_fit', label: '🏋️ Muscu', clubId: 'basic_fit' };
    }
    if (firstActivity.toLowerCase().includes('course') || firstActivity.toLowerCase().includes('running') || firstActivity.toLowerCase().includes('run')) {
      return { type: 'running', label: '🏃 Course', clubId: 'running' };
    }
    
    return { type: null, label: firstActivity || '—' };
  };

  // Valider la séance d'aujourd'hui
  const handleValidateToday = async () => {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const currentDayIndex = getCurrentDayIndex();
    const dayKey = dayKeys[currentDayIndex];
    const activity = getActivityForDay(dayKey);

    if (!activity) {
      Alert.alert('Aucune activité', 'Aucune activité prévue pour aujourd\'hui.');
      return;
    }

    if (activity.type === 'rest' || activity.type === null) {
      Alert.alert('Aucune activité', 'Aucune activité prévue pour aujourd\'hui.');
      return;
    }

    try {
      // Vérifier si un workout existe déjà pour aujourd'hui
      const allWorkouts = await getAllWorkouts();
      const todayWorkouts = allWorkouts.filter(w => w.date === todayString);
      
      if (todayWorkouts.length > 0) {
        Alert.alert('Déjà validé', 'Vous avez déjà validé une séance aujourd\'hui.');
        return;
      }

      // Ajouter le workout
      await addWorkout({
        date: todayString,
        type: activity.type,
      });

      // Déclencher l'animation de récompense
      rewardOverlayRef.current?.trigger();

      Alert.alert('✅ Validé !', `Séance ${activity.label} validée pour aujourd'hui.`);
    } catch (error) {
      console.error('Erreur validation:', error);
      Alert.alert('Erreur', 'Impossible de valider la séance.');
    }
  };

  // Obtenir le logo du club global (pour le header)
  const getGlobalClubLogo = () => {
    if (selectedClubGlobal && customLogos[selectedClubGlobal]) {
      return { uri: customLogos[selectedClubGlobal] };
    }
    // Les logos sont gérés par logoUri, sinon on utilise des emojis
    return null;
  };

  // Obtenir l'emoji du club global
  const getGlobalClubEmoji = () => {
    if (selectedClubGlobal) {
      return getEmojiForType(selectedClubGlobal);
    }
    return '⚡';
  };

  const saveRoutine = async (newRoutine: typeof routine) => {
    try {
      await saveUserSettings({ weekly_routine: newRoutine });
      setRoutine(newRoutine);
    } catch (error) {
      console.error('Erreur sauvegarde routine:', error);
    }
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}h${minutes}`;
  };

  const getClubName = (clubId: string | null): string => {
    if (!clubId) return '';
    const availableClubs = getAvailableClubs();
    const club = availableClubs.find(c => c.id === clubId) || userClubs.find(c => c.id === clubId);
    return club ? club.name : '';
  };

  const getClubLogoById = (clubId: string | null) => {
    if (!clubId) return null;
    
    // Chercher dans userClubs d'abord
    const userClub = userClubs.find(c => c.id === clubId);
    if (userClub && userClub.logoUri) {
      return { uri: userClub.logoUri };
    }
    
    // Fallback vers les clubs par défaut
    const defaultClub = getAvailableClubs().find(c => c.id === clubId);
    if (defaultClub) {
      if (customLogos[clubId]) {
        return { uri: customLogos[clubId] };
      }
      return defaultClub.logo;
    }
    
    return null;
  };

  const addRoutineBlock = (dayKey: string) => {
    if (!selectedClubModal) {
      Alert.alert('Club requis', 'Veuillez sélectionner un club.');
      return;
    }
    
    // Limiter à 3 entraînements par jour
    const currentRoutine = routine[dayKey] || [];
    if (currentRoutine.length >= 3) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 3 entraînements par jour.');
      return;
    }
    
    const timeString = formatTime(selectedTime);
    const clubName = getClubName(selectedClubModal);
    
    const newRoutine = { ...routine };
    if (!newRoutine[dayKey]) newRoutine[dayKey] = [];
    newRoutine[dayKey].push({ 
      time: timeString, 
      activity: clubName,
      workoutType: workoutType.trim() || undefined, // Type d'entraînement (ex: "Pecs et bras")
    });
    saveRoutine(newRoutine);
    
    // Reset
    setSelectedTime(new Date());
    setSelectedClubModal(null);
    setWorkoutType('');
    setEditingDay(null);
  };

  const removeRoutineBlock = (dayKey: string, index: number) => {
    const newRoutine = { ...routine };
    if (newRoutine[dayKey]) {
      newRoutine[dayKey].splice(index, 1);
      if (newRoutine[dayKey].length === 0) delete newRoutine[dayKey];
      saveRoutine(newRoutine);
    }
  };

  const setRestDay = (dayKey: string) => {
    const newRoutine = { ...routine };
    newRoutine[dayKey] = [{ time: '', activity: 'REPOS' }];
    saveRoutine(newRoutine);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#E8EDF2', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const clubLogo = getGlobalClubLogo();
  const currentDayIndex = getCurrentDayIndex();

  return (
    <ScreenWrapper noPadding>
      <Header title="Ma Semaine Type" showBack />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtitle */}
        <Text style={styles.headerSubtitle}>Planifiez vos entrainements</Text>

        {/* Horizontal Week ScrollView */}
        <View style={styles.weekContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            snapToInterval={Dimensions.get('window').width * 0.85}
            decelerationRate="fast"
            contentContainerStyle={styles.weekHorizontalContent}
          >
            {days.map((day, index) => {
              const dayKey = dayKeys[index];
              const activity = getActivityForDay(dayKey);
              const isToday = index === currentDayIndex;

              const dayRoutine = routine[dayKey] || [];
              const isRest = dayRoutine.length === 1 && dayRoutine[0]?.activity === 'REPOS';

              return (
                <TouchableOpacity
                  key={dayKey}
                  style={[
                    styles.dayCardHorizontal,
                    {
                      backgroundColor: isToday ? '#EFF6FF' : '#FFFFFF',
                      borderWidth: isToday ? 2 : 1,
                      borderColor: isToday ? '#2563EB' : '#E5E7EB',
                    },
                  ]}
                  onPress={() => setEditingDay(dayKey)}
                  activeOpacity={0.7}
                >
                  {/* Badge "Aujourd'hui" */}
                  {isToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
                    </View>
                  )}

                  <View style={styles.dayCardContent}>
                    {/* Header du jour */}
                    <View style={styles.dayCardHeader}>
                      <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{day}</Text>
                      {isToday && activity && activity.type && activity.type !== 'rest' && (
                        <TouchableOpacity
                          style={styles.validateButtonCompact}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleValidateToday();
                          }}
                          activeOpacity={0.7}
                        >
                          <Check size={16} color="#FFFFFF" strokeWidth={3} />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    {/* Contenu des entraînements */}
                    {dayRoutine.length > 0 && !isRest ? (
                      <View style={styles.workoutsList}>
                        {dayRoutine.slice(0, 3).map((block, blockIndex) => {
                          const blockClub = getAvailableClubs().find(c => c.name === block.activity) || userClubs.find(c => c.name === block.activity);
                          const blockLogo = blockClub ? getClubLogoById(blockClub.id) : null;
                          
                          return (
                            <View key={blockIndex} style={styles.workoutItemCompact}>
                              {blockLogo ? (
                                <Image source={blockLogo} style={styles.workoutLogoCompact} resizeMode="contain" />
                              ) : blockClub?.id === 'running' ? (
                                <MaterialCommunityIcons name="run" size={16} color="#10B981" />
                              ) : (
                                <View style={styles.workoutLogoPlaceholder} />
                              )}
                              <View style={styles.workoutInfoCompact}>
                                {block.time && (
                                  <Text style={styles.workoutTimeCompact}>{block.time}</Text>
                                )}
                                <Text style={styles.workoutClubNameCompact} numberOfLines={1}>
                                  {block.activity}
                                </Text>
                                {block.workoutType && (
                                  <Text style={styles.workoutTypeCompact} numberOfLines={1}>
                                    {block.workoutType}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : isRest ? (
                      <View style={styles.restDayContainer}>
                        <Text style={styles.restDayEmoji}>💤</Text>
                        <Text style={styles.restDayText}>Repos</Text>
                      </View>
                    ) : (
                      <View style={styles.emptyDayContainer}>
                        <Text style={styles.emptyDayText}>+ Ajouter</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Weekly Summary */}
        <View style={styles.weeklySummary}>
          <Text style={styles.weeklySummaryTitle}>Résumé de la semaine</Text>
          <View style={styles.weeklySummaryStats}>
            <View style={styles.weeklySummaryStat}>
              <Text style={styles.weeklySummaryStatValue}>{weeklySummary.totalSessions}</Text>
              <Text style={styles.weeklySummaryStatLabel}>Sessions</Text>
            </View>
            <View style={styles.weeklySummaryStat}>
              <Text style={styles.weeklySummaryStatValue}>{weeklySummary.totalHours}h</Text>
              <Text style={styles.weeklySummaryStatLabel}>Heures prévues</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={editingDay !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingDay(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDay ? days[dayKeys.indexOf(editingDay)] : ''}
              </Text>
              <TouchableOpacity onPress={() => setEditingDay(null)}>
                <X size={24} color="#1F2937" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {editingDay && (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {routine[editingDay] && routine[editingDay].length > 0 && (
                  <View style={styles.routineBlocksContainer}>
                    {routine[editingDay].map((block, index) => {
                      if (block.activity === 'REPOS') {
                        return (
                          <View key={index} style={styles.restBlock}>
                            <Text style={styles.restText}>💤 Repos</Text>
                            <TouchableOpacity onPress={() => {
                              const newRoutine = { ...routine };
                              delete newRoutine[editingDay];
                              saveRoutine(newRoutine);
                            }}>
                              <X size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                          </View>
                        );
                      }
                      const availableClubs = getAvailableClubs();
                      const blockClub = availableClubs.find(c => c.name === block.activity) || userClubs.find(c => c.name === block.activity);
                      const blockLogo = blockClub ? getClubLogoById(blockClub.id) : null;
                      
                      return (
                        <View key={index} style={styles.routineBlock}>
                          <View style={styles.routineBlockInfo}>
                            <View style={styles.routineBlockHeader}>
                              {blockLogo && (
                                <Image source={blockLogo} style={styles.routineBlockLogo} resizeMode="contain" />
                              )}
                              {blockClub?.id === 'running' && (
                                <MaterialCommunityIcons name="run" size={20} color="#10B981" />
                              )}
                              <Text style={styles.routineBlockTime}>{block.time}</Text>
                            </View>
                            <Text style={styles.routineBlockActivity}>{block.activity}</Text>
                            {block.workoutType && (
                              <Text style={styles.routineBlockWorkoutType}>{block.workoutType}</Text>
                            )}
                          </View>
                          <TouchableOpacity onPress={() => removeRoutineBlock(editingDay, index)}>
                            <X size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
                
                {/* Limite de 3 entraînements */}
                {editingDay && routine[editingDay] && routine[editingDay].length >= 3 && (
                  <View style={styles.limitNotice}>
                    <Text style={styles.limitNoticeText}>
                      Maximum 3 entraînements par jour atteint
                    </Text>
                  </View>
                )}

                <View style={styles.addBlockForm}>
                  {/* Time Picker */}
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Clock size={20} color="#2563EB" strokeWidth={2.5} />
                    <Text style={styles.timePickerText}>
                      {formatTime(selectedTime)}
                    </Text>
                  </TouchableOpacity>

                  {/* Clubs Selector */}
                  <View style={styles.clubsSelector}>
                    <Text style={styles.clubsSelectorTitle}>Clubs & Coach</Text>
                    <View style={styles.clubsGrid}>
                      {getAvailableClubs().map((club) => {
                        const clubLogo = getClubLogoById(club.id);
                        const isSelected = selectedClubModal === club.id;
                        
                        return (
                          <TouchableOpacity
                            key={club.id}
                            style={[
                              styles.clubCard,
                              isSelected && styles.clubCardSelected,
                            ]}
                            onPress={() => setSelectedClubModal(club.id)}
                            activeOpacity={0.7}
                          >
                            {clubLogo ? (
                              <Image source={clubLogo} style={styles.clubCardLogo} resizeMode="contain" />
                            ) : (
                              <MaterialCommunityIcons name="run" size={32} color={club.color} />
                            )}
                            <Text style={[
                              styles.clubName,
                              isSelected && styles.clubNameSelected,
                            ]} numberOfLines={2}>
                              {club.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Type d'entraînement (ex: "Pecs et bras") */}
                  {selectedClubModal && (
                    <View style={styles.workoutTypeContainer}>
                      <Text style={styles.workoutTypeLabel}>Type d'entraînement (optionnel)</Text>
                      <TextInput
                        style={styles.workoutTypeInput}
                        placeholder="Ex: Pecs et bras, Jambes, Full body..."
                        placeholderTextColor="#9CA3AF"
                        value={workoutType}
                        onChangeText={setWorkoutType}
                        maxLength={30}
                      />
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.restButton}
                      onPress={() => {
                        setRestDay(editingDay);
                        setEditingDay(null);
                      }}
                    >
                      <Text style={styles.restButtonText}>Repos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addButton, 
                        (!selectedClubModal || (routine[editingDay]?.length || 0) >= 3) && styles.addButtonDisabled
                      ]}
                      onPress={() => addRoutineBlock(editingDay)}
                      disabled={!selectedClubModal || (routine[editingDay]?.length || 0) >= 3}
                    >
                      <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.addButtonText}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reward Overlay */}
      <RewardOverlay ref={rewardOverlayRef} />

      {/* Time Picker Modal - En dehors du Modal parent pour éviter les conflits */}
      {showTimePicker && Platform.OS === 'ios' && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
          statusBarTranslucent
        >
          <View style={styles.timePickerModalOverlay}>
            <View style={styles.timePickerModalContent}>
              <View style={styles.timePickerModalHeader}>
                <Text style={styles.timePickerModalTitle}>Sélectionner l'heure</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.timePickerModalDone}>Terminé</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedTime(date);
                  }
                }}
                style={styles.timePickerIOS}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  container: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 90, // Space for tab bar (75px height)
  },
  header: {
    marginBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerClubLogo: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  weekContainer: {
    marginBottom: 20,
  },
  weekHorizontalContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  dayCardHorizontal: {
    width: Dimensions.get('window').width * 0.85,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
    overflow: 'visible',
    marginRight: 16,
  },
  weeklySummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  weeklySummaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  weeklySummaryStats: {
    flexDirection: 'row',
    gap: 24,
  },
  weeklySummaryStat: {
    flex: 1,
  },
  weeklySummaryStatValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2563EB',
    marginBottom: 4,
  },
  weeklySummaryStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  dayCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
    overflow: 'visible',
  },
  todayBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayCardContent: {
    gap: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  dayNameToday: {
    color: '#2563EB',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  activityLogo: {
    width: 20,
    height: 20,
  },
  activityTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  workoutsList: {
    marginTop: 8,
    gap: 6,
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  workoutItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  workoutLogo: {
    width: 20,
    height: 20,
  },
  workoutTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    minWidth: 45,
  },
  workoutTextContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  workoutClubName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  workoutType: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    fontStyle: 'italic',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  validateButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  validateButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  restDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  restDayEmoji: {
    fontSize: 24,
  },
  restDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptyDayContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  workoutItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 6,
  },
  workoutLogoCompact: {
    width: 24,
    height: 24,
  },
  workoutLogoPlaceholder: {
    width: 24,
    height: 24,
  },
  workoutInfoCompact: {
    flex: 1,
    gap: 2,
  },
  workoutTimeCompact: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  workoutClubNameCompact: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  workoutTypeCompact: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  routineBlocksContainer: {
    gap: 12,
    marginBottom: 20,
  },
  routineBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
  },
  routineBlockInfo: {
    flex: 1,
  },
  routineBlockTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  routineBlockActivity: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  routineBlockWorkoutType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  limitNotice: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  limitNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
    textAlign: 'center',
  },
  workoutTypeContainer: {
    marginTop: 16,
  },
  workoutTypeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  workoutTypeInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  restBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF4E6',
    padding: 16,
    borderRadius: 16,
  },
  restText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  addBlockForm: {
    gap: 12,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timePickerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  clubsSelector: {
    marginTop: 12,
  },
  clubsSelectorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  clubsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  clubCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clubCardSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#2563EB',
  },
  clubCardLogo: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  clubName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  clubNameSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  routineBlockLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  routineBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  restButton: {
    flex: 1,
    backgroundColor: '#FFF4E6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  restButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 16,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  timePickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: 300,
  },
  timePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timePickerModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  timePickerModalDone: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  timePickerIOS: {
    width: '100%',
    height: 200,
    backgroundColor: '#FFFFFF',
  },
});
