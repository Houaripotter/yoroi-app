import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
} from 'lucide-react-native';

export default function SettingsScreen() {
  const [height, setHeight] = useState('175');
  const [weightGoal, setWeightGoal] = useState('75.0');
  const [targetDate, setTargetDate] = useState('2025-06-15');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');

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

  const handleExportData = () => {
    Alert.alert(
      'Exporter les données',
      'Vos données seront exportées au format CSV',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: () => {
            Alert.alert('Succès', 'Données exportées avec succès');
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Réinitialiser',
      'Cette action supprimera toutes vos données. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Données réinitialisées');
          },
        },
      ]
    );
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
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#C7CEEA20' }]}>
                  <Palette size={20} color="#8B9FDB" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Thème</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>Clair</Text>
                <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFB3BA20' }]}>
                  <Scale size={20} color="#FF8A95" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Unité de poids</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>kg</Text>
                <ChevronRight size={20} color="#C7C7CC" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#BAE1FF20' }]}>
                  <TrendingDown size={20} color="#6CB4EE" strokeWidth={2.5} />
                </View>
                <Text style={styles.rowLabel}>Unité de mesure</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>cm</Text>
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
              onPress={handleResetData}
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
});
