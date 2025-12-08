import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import {
  User,
  Target,
  Calendar,
  Scale,
  TrendingDown,
  Palette,
  Download,
  Trash2,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function SettingsScreen() {
  const [height, setHeight] = useState('175');
  const [weightGoal, setWeightGoal] = useState('75.0');
  const [targetDate, setTargetDate] = useState('2025-06-15');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // États pour les modals
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [measurementUnitModalVisible, setMeasurementUnitModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const handleSaveProfile = async () => {
    const heightNum = parseFloat(height);
    const goalNum = parseFloat(weightGoal);

    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      Alert.alert('Erreur', 'La taille doit être entre 100 et 250 cm');
      return;
    }

    if (isNaN(goalNum) || goalNum <= 0) {
      Alert.alert('Erreur', 'Le poids objectif doit être supérieur à 0');
      return;
    }

    Alert.alert('Succès', 'Profil sauvegardé');
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté pour exporter les données');
        return;
      }

      // Récupérer toutes les données
      const { data: weightEntries, error: weightError } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      const { data: workouts, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (weightError || workoutError) {
        throw new Error('Erreur lors de la récupération des données');
      }

      // Créer le CSV pour les poids
      let csvContent = 'Date,Poids,Graisse,Eau,Muscle,Viscerale,Age_Metabolique\n';
      weightEntries?.forEach((entry) => {
        csvContent += `${entry.date},${entry.weight},${entry.body_fat || ''},${entry.water || ''},${entry.muscle_mass || ''},${entry.visceral_fat || ''},${entry.metabolic_age || ''}\n`;
      });

      csvContent += '\n\nDate,Type_Entrainement\n';
      workouts?.forEach((workout) => {
        csvContent += `${workout.date},${workout.type}\n`;
      });

      // Sauvegarder le fichier
      const fileUri = FileSystem.documentDirectory + 'yoroi_export.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      // Partager le fichier
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Succès', `Données exportées vers: ${fileUri}`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de l\'export');
    }
  };

  const handleResetData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      // Supprimer toutes les données de l'utilisateur
      await supabase.from('weight_entries').delete().eq('user_id', user.id);
      await supabase.from('workouts').delete().eq('user_id', user.id);

      setResetModalVisible(false);
      Alert.alert('Succès', 'Toutes vos données ont été supprimées');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la réinitialisation');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Réglages</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PROFIL</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B20' }]}>
                  <User size={20} color="#FF6B6B" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Nom d'utilisateur</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>Houari</Text>
                <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#4ECDC420' }]}>
                  <Scale size={20} color="#4ECDC4" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Taille</Text>
              </View>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="175"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFE66D20' }]}>
                  <Target size={20} color="#FFB84D" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Poids cible</Text>
              </View>
              <TextInput
                style={styles.input}
                value={weightGoal}
                onChangeText={setWeightGoal}
                keyboardType="decimal-pad"
                placeholder="75.0"
                placeholderTextColor="#C7C7CC"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#A8E6CF20' }]}>
                  <Calendar size={20} color="#68B892" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Date cible</Text>
              </View>
              <TextInput
                style={styles.input}
                value={targetDate}
                onChangeText={setTargetDate}
                placeholder="2025-06-15"
                placeholderTextColor="#C7C7CC"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AFFICHAGE</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setThemeModalVisible(true)}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#C7CEEA20' }]}>
                  <Palette size={20} color="#8B9FDB" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Thème</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{theme === 'light' ? 'Clair' : 'Sombre'}</Text>
                <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setWeightUnitModalVisible(true)}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFB3BA20' }]}>
                  <Scale size={20} color="#FF8A95" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Unité de poids</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{weightUnit}</Text>
                <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => setMeasurementUnitModalVisible(true)}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#BAE1FF20' }]}>
                  <TrendingDown size={20} color="#6CB4EE" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Unité de mesure</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{measurementUnit}</Text>
                <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DONNÉES</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={handleExportData}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#4ECDC420' }]}>
                  <Download size={20} color="#4ECDC4" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Exporter en CSV</Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => setResetModalVisible(true)}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B20' }]}>
                  <Trash2 size={20} color="#FF6B6B" strokeWidth={2.5} />
                </View>
                <Text style={[styles.rowLabel, { color: '#FF6B6B' }]}>
                  Réinitialiser
                </Text>
              </View>
              <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>Health Tracker Pro</Text>
        </View>
      </ScrollView>

      {/* Modal Thème */}
      <Modal visible={themeModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setThemeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir le thème</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X size={24} color="#718096" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, theme === 'light' && styles.optionButtonActive]}
              onPress={() => {
                setTheme('light');
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, theme === 'light' && styles.optionTextActive]}>Clair</Text>
              {theme === 'light' && <Check size={20} color="#4ECDC4" strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, theme === 'dark' && styles.optionButtonActive]}
              onPress={() => {
                setTheme('dark');
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, theme === 'dark' && styles.optionTextActive]}>Sombre</Text>
              {theme === 'dark' && <Check size={20} color="#4ECDC4" strokeWidth={2.5} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Unité de poids */}
      <Modal visible={weightUnitModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setWeightUnitModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unité de poids</Text>
              <TouchableOpacity onPress={() => setWeightUnitModalVisible(false)}>
                <X size={24} color="#718096" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, weightUnit === 'kg' && styles.optionButtonActive]}
              onPress={() => {
                setWeightUnit('kg');
                setWeightUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, weightUnit === 'kg' && styles.optionTextActive]}>Kilogrammes (kg)</Text>
              {weightUnit === 'kg' && <Check size={20} color="#4ECDC4" strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, weightUnit === 'lbs' && styles.optionButtonActive]}
              onPress={() => {
                setWeightUnit('lbs');
                setWeightUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, weightUnit === 'lbs' && styles.optionTextActive]}>Livres (lbs)</Text>
              {weightUnit === 'lbs' && <Check size={20} color="#4ECDC4" strokeWidth={2.5} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Unité de mesure */}
      <Modal visible={measurementUnitModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMeasurementUnitModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unité de mesure</Text>
              <TouchableOpacity onPress={() => setMeasurementUnitModalVisible(false)}>
                <X size={24} color="#718096" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, measurementUnit === 'cm' && styles.optionButtonActive]}
              onPress={() => {
                setMeasurementUnit('cm');
                setMeasurementUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, measurementUnit === 'cm' && styles.optionTextActive]}>Centimètres (cm)</Text>
              {measurementUnit === 'cm' && <Check size={20} color="#4ECDC4" strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, measurementUnit === 'in' && styles.optionButtonActive]}
              onPress={() => {
                setMeasurementUnit('in');
                setMeasurementUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, measurementUnit === 'in' && styles.optionTextActive]}>Pouces (inches)</Text>
              {measurementUnit === 'in' && <Check size={20} color="#4ECDC4" strokeWidth={2.5} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Réinitialisation */}
      <Modal visible={resetModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setResetModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Réinitialiser les données</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={24} color="#718096" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Cette action supprimera définitivement toutes vos données (poids, mensurations, entraînements). Cette action est irréversible.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleResetData}
              >
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1A202C',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#718096',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A202C',
    letterSpacing: -0.2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: '400',
    color: '#718096',
    letterSpacing: -0.2,
  },
  input: {
    fontSize: 17,
    fontWeight: '400',
    color: '#2D3748',
    textAlign: 'right',
    minWidth: 100,
    backgroundColor: '#EDF2F7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 60,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A202C',
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 15,
    fontWeight: '400',
    color: '#718096',
    lineHeight: 22,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#E6FFFA',
    borderColor: '#4ECDC4',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
    letterSpacing: -0.2,
  },
  optionTextActive: {
    color: '#4ECDC4',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#718096',
    letterSpacing: -0.2,
  },
  deleteButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
