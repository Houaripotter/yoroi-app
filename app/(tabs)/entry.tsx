import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,
} from 'react-native';
import { TrendingDown, TrendingUp, Check, Calendar, Scale, Flame, Droplet, Dumbbell, Activity, Zap, Bone, Gauge, Ruler, FileText, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { theme } from '@/lib/theme';
import { router } from 'expo-router';

// Fonction helper pour garantir l'authentification avec retry
const ensureUserAuthenticated = async () => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      console.log(`🔑 [Tentative ${retries + 1}/${maxRetries}] Vérification de l'utilisateur...`);

      // D'abord essayer de récupérer la session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Erreur getSession:', sessionError);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Si pas de session, créer une authentification anonyme
      if (!session) {
        console.log('🔑 Pas de session, authentification anonyme...');
        const { data, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          console.error('❌ Erreur signInAnonymously:', signInError);
          console.error('❌ Détails:', JSON.stringify(signInError, null, 2));
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        if (data.user) {
          console.log('✅ Authentification anonyme réussie:', data.user.id);
          return data.user;
        }
      }

      // Vérifier l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('❌ Erreur getUser:', userError);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (!user) {
        console.error('❌ getUser retourne null');
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      console.log('✅ Utilisateur trouvé:', user.id);
      return user;
    } catch (error) {
      console.error('❌ Exception dans ensureUserAuthenticated:', error);
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.error('❌ ÉCHEC: Impossible d\'authentifier l\'utilisateur après', maxRetries, 'tentatives');
  return null;
};

interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  previousWeight?: number;
  trend?: number;
}

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  isOpen,
  onToggle,
  children,
  icon
}) => {
  return (
    <View>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.accordionHeaderContent}>
          {icon}
          <Text style={styles.accordionTitle}>{title}</Text>
        </View>
        {isOpen ? (
          <ChevronDown size={16} color="#636E72" strokeWidth={2.5} />
        ) : (
          <ChevronRight size={16} color="#636E72" strokeWidth={2.5} />
        )}
      </TouchableOpacity>
      {isOpen && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );
};

export default function EntryScreen() {
  const [newWeight, setNewWeight] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isCustomDatePickerVisible, setCustomDatePickerVisible] = useState(false);
  const [customDay, setCustomDay] = useState(new Date().getDate().toString());
  const [customMonth, setCustomMonth] = useState((new Date().getMonth() + 1).toString());
  const [customYear, setCustomYear] = useState(new Date().getFullYear().toString());
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
  // Nouveaux champs de mensurations détaillées
  const [shoulderCircumference, setShoulderCircumference] = useState('');
  const [waistCircumference, setWaistCircumference] = useState('');
  const [leftArm, setLeftArm] = useState('');
  const [rightArm, setRightArm] = useState('');
  const [leftThigh, setLeftThigh] = useState('');
  const [rightThigh, setRightThigh] = useState('');
  // Champs supplémentaires pour mensurations
  const [bodyFatKg, setBodyFatKg] = useState('');
  const [waterKg, setWaterKg] = useState('');
  const [bmi, setBmi] = useState('');
  const [notes, setNotes] = useState('');
  // États pour les sections accordéon
  const [isTanitaMetricsOpen, setIsTanitaMetricsOpen] = useState(false);
  const [isDetailedMeasurementsOpen, setIsDetailedMeasurementsOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
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
      // Vérifier l'authentification avant de sauvegarder
      const user = await ensureUserAuthenticated();
      if (!user) {
        Alert.alert('Erreur', 'Impossible de sauvegarder : utilisateur non authentifié');
        return;
      }

      console.log('✅ Utilisateur authentifié pour la sauvegarde:', user.id);

      // Préparer les données des mensurations détaillées
      const detailedMeasurements: any = {};
      if (chest) detailedMeasurements.chest = parseFloat(chest);
      if (waistCircumference) detailedMeasurements.waist = parseFloat(waistCircumference);
      if (navel) detailedMeasurements.navel = parseFloat(navel);
      if (hips) detailedMeasurements.hips = parseFloat(hips);
      if (leftArm) detailedMeasurements.left_arm = parseFloat(leftArm);
      if (rightArm) detailedMeasurements.right_arm = parseFloat(rightArm);
      if (leftThigh) detailedMeasurements.left_thigh = parseFloat(leftThigh);
      if (rightThigh) detailedMeasurements.right_thigh = parseFloat(rightThigh);

      const { data, error, status } = await supabase.from('weight_entries').insert([
        {
          weight: weightNum,
          date: selectedDate,
          body_fat: bodyFat ? parseFloat(bodyFat) : null,
          body_fat_kg: bodyFatKg ? parseFloat(bodyFatKg) : null,
          muscle_mass: muscleMass ? parseFloat(muscleMass) : null,
          water: water ? parseFloat(water) : null,
          water_kg: waterKg ? parseFloat(waterKg) : null,
          visceral_fat: visceralFat ? parseInt(visceralFat) : null,
          metabolic_age: metabolicAge ? parseInt(metabolicAge) : null,
          bone_mass: boneMass ? parseFloat(boneMass) : null,
          bmr: bmr ? parseInt(bmr) : null,
          bmi: bmi ? parseFloat(bmi) : null,
          measurements: Object.keys(detailedMeasurements).length > 0 ? detailedMeasurements : null,
        },
      ]);

      if (error) {
        throw error;
      }

      console.log('Envoi Supabase:', data);
      if (status === 201) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('Succès', 'Données sauvegardées !');
        router.replace('/(tabs)'); // Rediriger vers l'écran d'accueil
      }
      // Réinitialiser tous les champs
      setNewWeight('');
      setBodyFat('');
      setBodyFatKg('');
      setWater('');
      setWaterKg('');
      setMuscleMass('');
      setVisceralFat('');
      setMetabolicAge('');
      setBoneMass('');
      setBmr('');
      setBmi('');
      setChest('');
      setWaistCircumference('');
      setNavel('');
      setHips('');
      setLeftArm('');
      setRightArm('');
      setLeftThigh('');
      setRightThigh('');
      setNotes('');
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

  const handleDateSelect = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    setSelectedDate(date.toISOString().split('T')[0]);
    setDatePickerVisible(false);
  };

  const handleCustomDateSelect = () => {
    // Validation des inputs
    const day = parseInt(customDay);
    const month = parseInt(customMonth);
    const year = parseInt(customYear);

    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('Erreur', 'Jour invalide (1-31)');
      return;
    }
    if (isNaN(month) || month < 1 || month > 12) {
      Alert.alert('Erreur', 'Mois invalide (1-12)');
      return;
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      Alert.alert('Erreur', 'Année invalide (2000-2100)');
      return;
    }

    // Vérifier si la date est valide
    const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const testDate = new Date(dateString);
    if (testDate.getDate() !== day || testDate.getMonth() + 1 !== month) {
      Alert.alert('Erreur', 'Date invalide (ex: 31 février)');
      return;
    }

    setSelectedDate(dateString);
    setCustomDatePickerVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Bouton Retour/Annuler */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          Keyboard.dismiss();
          router.back();
        }}
        activeOpacity={0.7}
      >
        <X size={24} color={theme.colors.textPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

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
          {/* Header Branding */}
          <View style={styles.headerBranding}>
            <Image source={require('../../assets/images/yoroi-logo.png')} style={styles.appLogo} />
            <Text style={styles.appName}>YOROI</Text>
          </View>

      <View style={styles.heroSection}>
        <TextInput
          style={styles.heroWeightInput}
          placeholder="0.0"
          placeholderTextColor="#A0AEC0"
          keyboardType="decimal-pad"
          value={newWeight}
          onChangeText={setNewWeight}
        />
        <TouchableOpacity onPress={() => setDatePickerVisible(true)} activeOpacity={0.8}>
          <TextInput
            style={styles.heroDateInput}
            value={formatDate(selectedDate)}
            editable={false} // Rendre non éditable pour ouvrir la modal au clic
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A0AEC0"
          />
        </TouchableOpacity>
      </View>

      {/* Modal de sélection de date */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={isDatePickerVisible}
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.datePickerOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={[styles.datePickerContainer, { zIndex: 10 }]}>
            <View style={styles.datePickerButtonsRow}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => handleDateSelect(0)}
                hitSlop={{top: 20, bottom: 20, left: 50, right: 50}}
              >
                <Text style={styles.datePickerButtonText}>Aujourd\'hui</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  setDatePickerVisible(false);
                  setCustomDatePickerVisible(true);
                }}
                hitSlop={{top: 20, bottom: 20, left: 50, right: 50}}
              >
                <Text style={styles.datePickerButtonText}>Autre date</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.datePickerButton, styles.datePickerCancelButton]}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={styles.datePickerCancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal pour la saisie manuelle de la date */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={isCustomDatePickerVisible}
        onRequestClose={() => setCustomDatePickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCustomDatePickerVisible(false)}>
          <View style={styles.datePickerOverlay}>
            <Pressable onPress={(event) => event.stopPropagation()} style={[styles.datePickerContainer, { zIndex: 10 }]}>
              <Text style={styles.customDatePickerTitle}>Saisir une date</Text>
              <View style={styles.dateInputsRow}>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Jour</Text>
                  <TextInput
                    style={styles.dateInputSmall}
                    placeholder="JJ"
                    placeholderTextColor="#A0AEC0"
                    value={customDay}
                    onChangeText={setCustomDay}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Mois</Text>
                  <TextInput
                    style={styles.dateInputSmall}
                    placeholder="MM"
                    placeholderTextColor="#A0AEC0"
                    value={customMonth}
                    onChangeText={setCustomMonth}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateInputLabel}>Année</Text>
                  <TextInput
                    style={styles.dateInputMedium}
                    placeholder="AAAA"
                    placeholderTextColor="#A0AEC0"
                    value={customYear}
                    onChangeText={setCustomYear}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={handleCustomDateSelect}
              >
                <Text style={styles.datePickerButtonText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.datePickerButton, styles.datePickerCancelButton]}
                onPress={() => setCustomDatePickerVisible(false)}
              >
                <Text style={styles.datePickerCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Modal>



      <View style={styles.accordionSectionWrapper}>
        <AccordionSection
          title="MÉTRIQUES CORPORELLES (Tanita)"
          isOpen={isTanitaMetricsOpen}
          onToggle={() => setIsTanitaMetricsOpen(!isTanitaMetricsOpen)}
          icon={<Activity size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
        >
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
                <Flame size={12} color="#FF9500" strokeWidth={2.5} />
                <Text style={styles.inputLabel}>Graisse (kg)</Text>
              </View>
              <TextInput
                style={styles.smallInput}
                placeholder="0.0"
                placeholderTextColor="#C7C7CC"
                keyboardType="decimal-pad"
                value={bodyFatKg}
                onChangeText={setBodyFatKg}
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
                <Droplet size={12} color="#32ADE6" strokeWidth={2.5} />
                <Text style={styles.inputLabel}>Eau (kg)</Text>
              </View>
              <TextInput
                style={styles.smallInput}
                placeholder="0.0"
                placeholderTextColor="#C7C7CC"
                keyboardType="decimal-pad"
                value={waterKg}
                onChangeText={setWaterKg}
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

            <View style={styles.gridItem}>
              <View style={styles.labelRow}>
                <Scale size={12} color="#10B981" strokeWidth={2.5} />
                <Text style={styles.inputLabel}>IMC</Text>
              </View>
              <TextInput
                style={styles.smallInput}
                placeholder="0.0"
                placeholderTextColor="#C7C7CC"
                keyboardType="decimal-pad"
                value={bmi}
                onChangeText={setBmi}
              />
            </View>
          </View>
        </AccordionSection>

        <AccordionSection
          title="MENSURATIONS DÉTAILLÉES"
          isOpen={isDetailedMeasurementsOpen}
          onToggle={() => setIsDetailedMeasurementsOpen(!isDetailedMeasurementsOpen)}
          icon={<Ruler size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
        >
          <View style={styles.measurementsContainer}>
            {/* Thorax */}
            <View style={styles.gridItem}>
              <View style={styles.labelRow}>
                <Ruler size={12} color="#EF4444" strokeWidth={2.5} />
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

            {/* Taille */}
            <View style={styles.gridItem}>
              <View style={styles.labelRow}>
                <Ruler size={12} color="#EF4444" strokeWidth={2.5} />
                <Text style={styles.inputLabel}>Taille (cm)</Text>
              </View>
              <TextInput
                style={styles.smallInput}
                placeholder="0.0"
                placeholderTextColor="#C7C7CC"
                keyboardType="decimal-pad"
                value={waistCircumference}
                onChangeText={setWaistCircumference}
              />
            </View>

            {/* Nombril */}
            <View style={styles.gridItem}>
              <View style={styles.labelRow}>
                <Ruler size={12} color="#EF4444" strokeWidth={2.5} />
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

            {/* Hanche */}
            <View style={styles.gridItem}>
              <View style={styles.labelRow}>
                <Ruler size={12} color="#EF4444" strokeWidth={2.5} />
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

            {/* Bras gauche et droit côte à côte */}
            <View style={styles.pairRow}>
              <View style={styles.pairItem}>
                <View style={styles.labelRow}>
                  <Dumbbell size={12} color="#EF4444" strokeWidth={2.5} />
                  <Text style={styles.inputLabel}>Bras gauche (cm)</Text>
                </View>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={leftArm}
                  onChangeText={setLeftArm}
                />
              </View>

              <View style={styles.pairItem}>
                <View style={styles.labelRow}>
                  <Dumbbell size={12} color="#EF4444" strokeWidth={2.5} />
                  <Text style={styles.inputLabel}>Bras droit (cm)</Text>
                </View>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={rightArm}
                  onChangeText={setRightArm}
                />
              </View>
            </View>

            {/* Cuisses gauche et droite côte à côte */}
            <View style={styles.pairRow}>
              <View style={styles.pairItem}>
                <View style={styles.labelRow}>
                  <Activity size={12} color="#EF4444" strokeWidth={2.5} />
                  <Text style={styles.inputLabel}>Cuisse gauche (cm)</Text>
                </View>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={leftThigh}
                  onChangeText={setLeftThigh}
                />
              </View>

              <View style={styles.pairItem}>
                <View style={styles.labelRow}>
                  <Activity size={12} color="#EF4444" strokeWidth={2.5} />
                  <Text style={styles.inputLabel}>Cuisse droite (cm)</Text>
                </View>
                <TextInput
                  style={styles.smallInput}
                  placeholder="0.0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="decimal-pad"
                  value={rightThigh}
                  onChangeText={setRightThigh}
                />
              </View>
            </View>
          </View>
        </AccordionSection>

        <AccordionSection
          title="NOTES (Commentaires)"
          isOpen={isNotesOpen}
          onToggle={() => setIsNotesOpen(!isNotesOpen)}
          icon={<FileText size={16} color={theme.colors.textPrimary} strokeWidth={2.5} />}
        >
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
        </AccordionSection>
      </View>

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleAddWeight}
        activeOpacity={0.8}
      >
        <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.submitButtonText}>Enregistrer</Text>
      </TouchableOpacity>

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Historique</Text>
        <View style={styles.listContent}>
          {records.map((record) => (
            <View key={record.id}>
              {renderRecord({ item: record })}
            </View>
          ))}
        </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fond blanc
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: theme.spacing.lg,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
    paddingTop: 60, // Ajustement pour l'île dynamique / zone de statut
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    paddingVertical: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
    ...theme.shadow.sm,
  },
  heroWeightInput: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -1.5,
    textAlign: 'center',
    minWidth: '70%',
  },
  heroDateInput: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  accordionSectionWrapper: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
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
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.md,
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
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    ...theme.shadow.xs,
  },
  accordionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  accordionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  accordionContent: {
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  measurementsContainer: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
  fullWidthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  pairRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  pairItem: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  datePickerContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    width: '80%',
    maxWidth: 300,
    ...theme.shadow.md,
  },
  datePickerButton: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.inputBackground,
    alignItems: 'center',
    minHeight: 56,
  },
  datePickerButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  datePickerCancelButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.borderLight,
  },
  datePickerCancelButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 20 : 0, // Ajustement pour iOS (encoche/Dynamic Island)
  },
  appLogo: {
    width: 60,
    height: 60,
    marginRight: theme.spacing.sm,
  },
  appName: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  customDatePickerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  customDateInput: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  datePickerButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateInputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  dateInputWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  dateInputLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  dateInputSmall: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    textAlign: 'center',
    width: '100%',
  },
  dateInputMedium: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    textAlign: 'center',
    width: '100%',
  },
});
