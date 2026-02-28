import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  TextInput,
  Platform,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import {
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BarChart3,
  CalendarDays,
  Swords,
  Timer,
  HeartHandshake,
  Shield,
  TrendingDown,
  TrendingUp,
  Minus,
  Dumbbell,
  Camera,
  ImageIcon,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { saveProfile } from '@/lib/database';
import { saveUserSettings } from '@/lib/storage';
import { setUserMode, setUserSport } from '@/lib/fighterModeService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';
import { validators } from '@/lib/security/validators';
import { logger } from '@/lib/security/logger';
import { getSportIcon, getSportName, getSportColor } from '@/lib/sports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Sport as FighterSport, UserMode } from '@/lib/fighterMode';

const { width } = Dimensions.get('window');

// Theme sombre samurai
const ONBOARDING_COLORS = {
  background: '#0A0A0A',
  backgroundCard: '#1A1A1E',
  backgroundInput: '#1F1F24',
  textPrimary: '#F5F5F5',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  gold: '#D4AF37',
  accent: '#D4AF37',
  border: '#38383F',
};

// Sports pour mode competiteur (10 pills)
const SPORT_OPTIONS: FighterSport[] = [
  'jjb', 'mma', 'boxe', 'musculation', 'running',
  'muay_thai', 'judo', 'crossfit', 'hyrox', 'autre',
];

// Features pour Page 2
const FEATURES = [
  { icon: BarChart3, title: 'Stats & Suivi', desc: 'Poids, composition, graphiques', color: '#4ECDC4' },
  { icon: CalendarDays, title: 'Planning & Carnet', desc: 'Calendrier, seances, records', color: '#F97316' },
  { icon: Swords, title: 'Mode Competiteur', desc: 'Competitions, categories, cut', color: '#FF6B35' },
  { icon: Timer, title: 'Outils Pro', desc: 'Timer, calculateurs, jeune', color: '#8B5CF6' },
  { icon: HeartHandshake, title: 'Sante Connectee', desc: 'App Sante, donnees auto', color: '#10B981' },
  { icon: Shield, title: '100% Prive', desc: 'Aucun cloud, aucun tracking', color: '#D4AF37' },
];

export default function OnboardingScreen() {
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay: 1000 });

  // Musique d'ambiance en boucle
  const musicRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    const startMusic = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/ombording.mp3'),
          { shouldPlay: true, isLooping: true, volume: 0.3 }
        );

        if (mounted) {
          musicRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        logger.error('Onboarding music failed', error);
      }
    };

    startMusic();

    return () => {
      mounted = false;
      if (musicRef.current) {
        musicRef.current.stopAsync().then(() => {
          musicRef.current?.unloadAsync();
        }).catch(() => {});
      }
    };
  }, []);

  // Navigation entre pages
  const [currentPage, setCurrentPage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Formulaire Page 3
  const [userName, setUserName] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [mode, setMode] = useState<UserMode | null>(null);
  const [selectedSport, setSelectedSport] = useState<FighterSport | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  const colors = ONBOARDING_COLORS;

  // ---- Navigation ----
  const goToPage = (page: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(page);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  // ---- Validation Page 3 ----
  const canComplete = (): boolean => {
    if (!userName.trim() || userName.trim().length < 2) return false;
    if (!gender) return false;
    if (!heightCm || !validators.height(parseFloat(heightCm)).valid) return false;
    if (!targetWeight || !validators.weight(parseFloat(targetWeight)).valid) return false;
    if (!birthDate) return false;
    if (!goal) return false;
    if (!mode) return false;
    if (mode === 'competiteur' && !selectedSport) return false;
    return true;
  };

  // ---- Age ----
  const calculateAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  };

  // ---- Photo ----
  const pickFromGallery = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission requise', 'Autorise l\'acces a ta galerie pour choisir une photo.');
      return;
    }
    const result = await launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission requise', 'Autorise l\'acces a ta camera pour prendre une photo.');
      return;
    }
    const result = await launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  // ---- Save ----
  const handleComplete = async () => {
    // Validation finale
    const usernameCheck = validators.username(userName.trim());
    if (!usernameCheck.valid) {
      showPopup('Nom invalide', usernameCheck.error || 'Verifie ton nom.');
      return;
    }
    const heightCheck = validators.height(parseFloat(heightCm));
    if (!heightCheck.valid) {
      showPopup('Taille invalide', heightCheck.error || 'Entre une taille entre 100 et 250 cm.');
      return;
    }
    const weightCheck = validators.weight(parseFloat(targetWeight));
    if (!weightCheck.valid) {
      showPopup('Poids invalide', weightCheck.error || 'Entre un poids entre 30 et 250 kg.');
      return;
    }

    try {
      // 1. SQLite Profile
      await saveProfile({
        name: userName.trim(),
        height_cm: parseFloat(heightCm),
        target_weight: parseFloat(targetWeight),
        start_date: format(new Date(), 'yyyy-MM-dd'),
        avatar_gender: gender!,
        profile_photo: profilePhoto,
        birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined,
        weight_goal: goal!,
      });

      // 2. AsyncStorage UserSettings
      await saveUserSettings({
        username: userName.trim(),
        gender: gender === 'femme' ? 'female' : 'male',
        height: parseFloat(heightCm),
        targetWeight: parseFloat(targetWeight),
        goal: goal!,
        onboardingCompleted: true,
      });

      // 3. Mode
      await setUserMode(mode!);

      // 4. Sport (si competiteur)
      if (mode === 'competiteur' && selectedSport) {
        await setUserSport(selectedSport);
      }

      // 5. Flag done
      await AsyncStorage.setItem('yoroi_onboarding_done', 'true');

      logger.info('Onboarding completed', { step: 'all' });

      // Stop musique avant navigation
      if (musicRef.current) {
        await musicRef.current.stopAsync().catch(() => {});
        await musicRef.current.unloadAsync().catch(() => {});
        musicRef.current = null;
      }

      // 6. Navigation
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Onboarding save failed', error);
      showPopup('Erreur', 'Une erreur est survenue. Reessaie.');
    }
  };

  // =============================================
  // PAGE 1 : YOROI - L'Armure
  // =============================================
  const renderPage1 = () => (
    <View style={styles.page1Container}>
      {/* Logo dans cercle noir */}
      <View style={styles.logoCircle}>
        <Image
          source={require('../assets/logo d\'app/yoroi-logo2.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      {/* Titre */}
      <Text style={styles.brandTitle}>YOROI</Text>
      <Text style={styles.brandSubtitle}>L'Armure</Text>

      {/* Separateur dore */}
      <View style={styles.goldSeparator} />

      {/* Texte philosophie */}
      <Text style={styles.philosophyText}>
        YOROI signifie "L'Armure". Pour le Samourai, l'armure n'etait pas un simple equipement.
        C'etait sa structure. C'etait le rituel qui le tenait debout et pret.{'\n\n'}
        Aujourd'hui, YOROI est la structure qu'il vous manque. Que vous soyez un athlete
        preparant une competition ou une personne qui veut simplement changer son reflet dans
        le miroir : tout commence par l'organisation.
      </Text>

      {/* TODO: Son d'ambiance pour phase future */}

      {/* Bouton */}
      <TouchableOpacity style={styles.outlineButton} onPress={() => goToPage(1)}>
        <Text style={styles.outlineButtonText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );

  // =============================================
  // PAGE 2 : Ton Arsenal
  // =============================================
  const renderPage2 = () => (
    <View style={styles.page2Container}>
      <Text style={styles.page2Title}>Tout ce dont tu as besoin</Text>
      <Text style={styles.page2Subtitle}>6 modules pour tes objectifs</Text>

      {/* Grille 2x3 */}
      <View style={styles.featuresGrid}>
        {FEATURES.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <View
              key={index}
              style={[
                styles.featureCard,
                {
                  backgroundColor: feature.color + '26', // 15% opacity
                  borderColor: feature.color + '4D',     // 30% opacity
                },
              ]}
            >
              <IconComponent size={28} color={feature.color} />
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          );
        })}
      </View>

      {/* Bouton */}
      <TouchableOpacity style={styles.goldButton} onPress={() => goToPage(2)}>
        <Text style={styles.goldButtonText}>Configurer mon profil</Text>
      </TouchableOpacity>
    </View>
  );

  // =============================================
  // PAGE 3 : Profil de Guerrier
  // =============================================
  const renderPage3 = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.page3Content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.page3Title}>Profil de Guerrier</Text>
        <Text style={styles.page3Subtitle}>Configure ton armure</Text>

        {/* ---- Section Identite ---- */}
        <Text style={styles.sectionLabel}>Identite</Text>

        <TextInput
          style={styles.textInput}
          placeholder="Ton prenom ou pseudo"
          placeholderTextColor={colors.textMuted}
          value={userName}
          onChangeText={setUserName}
          maxLength={50}
          autoCapitalize="words"
        />

        <Text style={styles.fieldLabel}>Genre</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'homme' && { borderColor: colors.gold, backgroundColor: colors.gold + '26' },
            ]}
            onPress={() => setGender('homme')}
          >
            <MaterialCommunityIcons
              name="human-male"
              size={24}
              color={gender === 'homme' ? colors.gold : colors.textSecondary}
            />
            <Text style={[styles.genderText, gender === 'homme' && { color: colors.gold }]}>Homme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.genderButton,
              gender === 'femme' && { borderColor: colors.gold, backgroundColor: colors.gold + '26' },
            ]}
            onPress={() => setGender('femme')}
          >
            <MaterialCommunityIcons
              name="human-female"
              size={24}
              color={gender === 'femme' ? colors.gold : colors.textSecondary}
            />
            <Text style={[styles.genderText, gender === 'femme' && { color: colors.gold }]}>Femme</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Section Mensurations ---- */}
        <Text style={styles.sectionLabel}>Mensurations</Text>

        <Text style={styles.fieldLabel}>Taille (cm)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ex: 175"
          placeholderTextColor={colors.textMuted}
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          maxLength={5}
        />

        <Text style={styles.fieldLabel}>Poids objectif (kg)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ex: 80"
          placeholderTextColor={colors.textMuted}
          value={targetWeight}
          onChangeText={setTargetWeight}
          keyboardType="decimal-pad"
          maxLength={5}
        />

        {/* ---- Section Date de naissance ---- */}
        <Text style={styles.sectionLabel}>Date de naissance</Text>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={birthDate ? styles.dateText : styles.datePlaceholder}>
            {birthDate ? format(birthDate, 'dd MMMM yyyy', { locale: fr }) : 'Selectionner ta date de naissance'}
          </Text>
          {birthDate && (
            <View style={styles.ageBadge}>
              <Text style={styles.ageBadgeText}>{calculateAge(birthDate)} ans</Text>
            </View>
          )}
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={birthDate || new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant="dark"
            maximumDate={new Date()}
            minimumDate={new Date(1920, 0, 1)}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (selectedDate) setBirthDate(selectedDate);
            }}
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity
            style={styles.dateConfirmButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.dateConfirmText}>Valider</Text>
          </TouchableOpacity>
        )}

        {/* ---- Section Objectif ---- */}
        <Text style={styles.sectionLabel}>Objectif</Text>
        <View style={styles.goalRow}>
          <TouchableOpacity
            style={[styles.goalCard, goal === 'lose' && { borderColor: '#10B981', backgroundColor: '#10B98126' }]}
            onPress={() => setGoal('lose')}
          >
            <TrendingDown size={24} color={goal === 'lose' ? '#10B981' : colors.textSecondary} />
            <Text style={[styles.goalText, goal === 'lose' && { color: '#10B981' }]}>Perdre</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.goalCard, goal === 'maintain' && { borderColor: colors.gold, backgroundColor: colors.gold + '26' }]}
            onPress={() => setGoal('maintain')}
          >
            <Minus size={24} color={goal === 'maintain' ? colors.gold : colors.textSecondary} />
            <Text style={[styles.goalText, goal === 'maintain' && { color: colors.gold }]}>Maintenir</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.goalCard, goal === 'gain' && { borderColor: '#EF4444', backgroundColor: '#EF444426' }]}
            onPress={() => setGoal('gain')}
          >
            <TrendingUp size={24} color={goal === 'gain' ? '#EF4444' : colors.textSecondary} />
            <Text style={[styles.goalText, goal === 'gain' && { color: '#EF4444' }]}>Prendre</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Section Mode ---- */}
        <Text style={styles.sectionLabel}>Mode</Text>
        <View style={styles.rowButtons}>
          <TouchableOpacity
            style={[
              styles.modeCard,
              mode === 'competiteur' && { borderColor: '#FF6B35', backgroundColor: '#FF6B3526' },
            ]}
            onPress={() => {
              setMode('competiteur');
              if (mode !== 'competiteur') setSelectedSport(null);
            }}
          >
            <Swords size={28} color={mode === 'competiteur' ? '#FF6B35' : colors.textSecondary} />
            <Text style={[styles.modeTitle, mode === 'competiteur' && { color: '#FF6B35' }]}>Competiteur</Text>
            <Text style={styles.modeDesc}>Competitions, cut, categories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeCard,
              mode === 'loisir' && { borderColor: '#0ABAB5', backgroundColor: '#0ABAB526' },
            ]}
            onPress={() => {
              setMode('loisir');
              setSelectedSport(null);
            }}
          >
            <Dumbbell size={28} color={mode === 'loisir' ? '#0ABAB5' : colors.textSecondary} />
            <Text style={[styles.modeTitle, mode === 'loisir' && { color: '#0ABAB5' }]}>Loisir</Text>
            <Text style={styles.modeDesc}>Forme, bien-etre, progression</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Section Sport (conditionnel) ---- */}
        {mode === 'competiteur' && (
          <>
            <Text style={styles.sectionLabel}>Ton sport principal</Text>
            <View style={styles.sportPillsContainer}>
              {SPORT_OPTIONS.map((sportId) => {
                const isSelected = selectedSport === sportId;
                const sportColor = getSportColor(sportId);
                return (
                  <TouchableOpacity
                    key={sportId}
                    style={[
                      styles.sportPill,
                      isSelected && { borderColor: sportColor, backgroundColor: sportColor + '26' },
                    ]}
                    onPress={() => setSelectedSport(sportId)}
                  >
                    <MaterialCommunityIcons
                      name={getSportIcon(sportId) as any}
                      size={18}
                      color={isSelected ? sportColor : colors.textSecondary}
                    />
                    <Text style={[styles.sportPillText, isSelected && { color: sportColor }]}>
                      {getSportName(sportId)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* ---- Section Photo (optionnel) ---- */}
        <Text style={styles.sectionLabel}>Photo <Text style={styles.optionalLabel}>(Optionnel)</Text></Text>
        <View style={styles.photoSection}>
          <View style={styles.photoPreview}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.photoImage} />
            ) : (
              <MaterialCommunityIcons name="account-outline" size={40} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
              <ImageIcon size={18} color={colors.textPrimary} />
              <Text style={styles.photoBtnText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
              <Camera size={18} color={colors.textPrimary} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Espace pour le bouton fixe */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bouton fixe en bas */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={[styles.goldButton, !canComplete() && styles.disabledButton]}
          disabled={!canComplete() || isProcessing}
          onPress={() => executeOnce(handleComplete)}
        >
          {isProcessing ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <Text style={[styles.goldButtonText, !canComplete() && styles.disabledButtonText]}>
              Commencer l'aventure
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // =============================================
  // RENDER
  // =============================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.pageWrapper, { opacity: fadeAnim }]}>
          {currentPage === 0 && renderPage1()}
          {currentPage === 1 && renderPage2()}
          {currentPage === 2 && renderPage3()}
        </Animated.View>
      </SafeAreaView>
      <PopupComponent />
    </View>
  );
}

// =============================================
// STYLES
// =============================================
const C = ONBOARDING_COLORS;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  safeArea: {
    flex: 1,
  },
  pageWrapper: {
    flex: 1,
  },

  // ---- PAGE 1 ----
  page1Container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 24,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 8,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.gold,
    marginBottom: 20,
  },
  goldSeparator: {
    width: 60,
    height: 1,
    backgroundColor: C.gold,
    marginBottom: 24,
  },
  philosophyText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  outlineButtonText: {
    color: C.gold,
    fontSize: 16,
    fontWeight: '600',
  },

  // ---- PAGE 2 ----
  page2Container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  page2Title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  page2Subtitle: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // ---- PAGE 3 ----
  page3Content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  page3Title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  page3Subtitle: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: C.backgroundInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.textPrimary,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
  },

  // Date
  dateButton: {
    backgroundColor: C.backgroundInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 15,
    color: C.textPrimary,
  },
  datePlaceholder: {
    fontSize: 15,
    color: C.textMuted,
  },
  ageBadge: {
    backgroundColor: C.gold + '33',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ageBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gold,
  },
  dateConfirmButton: {
    alignSelf: 'center',
    backgroundColor: C.gold,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginTop: 8,
  },
  dateConfirmText: {
    color: '#0A0A0A',
    fontWeight: '600',
    fontSize: 14,
  },

  // Goal
  goalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  goalCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.backgroundCard,
    gap: 6,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },

  // Mode
  modeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.backgroundCard,
    gap: 6,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
  },
  modeDesc: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    paddingHorizontal: 4,
  },

  // Sport pills
  sportPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.backgroundCard,
  },
  sportPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
  },

  // Photo
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  photoPreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.backgroundCard,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    width: 90,
    height: 90,
  },
  photoButtons: {
    gap: 10,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.backgroundCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  photoBtnText: {
    fontSize: 14,
    color: C.textPrimary,
    fontWeight: '500',
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
  },

  // Gold button (shared)
  goldButton: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  goldButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: C.border,
  },
  disabledButtonText: {
    color: C.textMuted,
  },

  // Bottom fixed button
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 12,
    backgroundColor: C.background,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});
