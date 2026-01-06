import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Image,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Scale,
  Timer,
  Camera,
  Trophy,
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  Award,
  Zap,
  Clock,
  Dumbbell,
  Volume2,
  Image as ImageIcon,
  Repeat,
  CalendarDays,
  Star,
  Swords,
  Medal,
  LineChart,
  TrendingUp,
  Layout,
  HeartHandshake,
  User,
  Ruler,
  Cake,
  Check,
  UserCircle,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { saveProfile } from '@/lib/database';
import { saveUserSettings } from '@/lib/storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Fonction pour determiner si une couleur est claire
const isLightColor = (hexColor: string): boolean => {
  // Enlever le # si present
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calculer la luminosite (formule standard)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

const { width, height } = Dimensions.get('window');

interface Highlight {
  icon: React.ReactNode;
  text: string;
}

interface Slide {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  highlights?: Highlight[];
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Couleur du texte du bouton adaptée à la couleur d'accent
  const buttonTextColor = isLightColor(colors.accent) ? '#000000' : '#FFFFFF';

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // États pour le formulaire de profil
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [gender, setGender] = useState<'homme' | 'femme' | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const slides: Slide[] = [
    {
      id: 'welcome',
      icon: <Sparkles size={64} color={colors.accent} />,
      title: 'Ton Armure Digitale',
      description: 'YOROI t\'accompagne dans ta transformation. 100% gratuit, 100% prive, 100% made in France. Ici, on tombe 7 fois, on se releve 8 fois.',
      color: colors.accent,
      highlights: [
        { icon: <Target size={14} color={colors.accent} />, text: 'Suivi poids, sommeil, energie' },
        { icon: <Timer size={14} color={colors.accent} />, text: 'Timer pro multi-sports' },
        { icon: <Medal size={14} color={colors.accent} />, text: 'Gamification addictive' },
      ],
    },
    {
      id: 'tracking',
      icon: <Scale size={64} color="#4ECDC4" />,
      title: 'Tout au Meme Endroit',
      description: 'Poids, composition corporelle, mensurations, hydratation, sommeil, energie... Synchronise avec Apple Health pour un suivi complet !',
      color: '#4ECDC4',
      highlights: [
        { icon: <Scale size={14} color="#4ECDC4" />, text: 'Poids + Graisse + Muscle + Eau' },
        { icon: <MaterialCommunityIcons name="hospital-box" size={14} color="#EF4444" />, text: 'Mensurations & suivi blessures' },
        { icon: <Zap size={14} color="#4ECDC4" />, text: 'Hydratation, sommeil, energie' },
      ],
    },
    {
      id: 'competition',
      icon: <Swords size={64} color="#FF6B35" />,
      title: 'Mode Competiteur',
      description: 'Combat, HYROX, Trail, Marathon... Categories de poids officielles, mode Cut, palmares, compte a rebours competition. Prepare-toi comme un pro !',
      color: '#FF6B35',
      highlights: [
        { icon: <Trophy size={14} color="#FF6B35" />, text: 'JJB, Judo, Boxe, MMA, Lutte...' },
        { icon: <Dumbbell size={14} color="#FF6B35" />, text: 'HYROX, Trail, Marathon, Triathlon' },
        { icon: <Target size={14} color="#FF6B35" />, text: 'Categories officielles & Cut mode' },
      ],
    },
    {
      id: 'tools',
      icon: <Timer size={64} color="#8B5CF6" />,
      title: 'Outils Pro',
      description: 'Timer multi-modes (Muscu, Combat, HIIT, Tabata), calculateurs (macros, IMC, TDEE), jeune intermittent (16/8, OMAD, Ramadan, Kippur).',
      color: '#8B5CF6',
      highlights: [
        { icon: <Timer size={14} color="#8B5CF6" />, text: 'Timer avec sons & vibrations' },
        { icon: <Target size={14} color="#8B5CF6" />, text: 'Calculateurs macros & IMC' },
        { icon: <Clock size={14} color="#8B5CF6" />, text: 'Jeune 16/8, OMAD, Ramadan...' },
      ],
    },
    {
      id: 'planning',
      icon: <CalendarDays size={64} color="#F97316" />,
      title: 'Planning & Carnet',
      description: 'Calendrier interactif, emploi du temps sportif personnalise, carnet d\'entrainement avec techniques et objectifs. Multi-sports !',
      color: '#F97316',
      highlights: [
        { icon: <CalendarDays size={14} color="#F97316" />, text: 'Calendrier & emploi du temps' },
        { icon: <Dumbbell size={14} color="#F97316" />, text: 'Carnet techniques & seances' },
        { icon: <TrendingUp size={14} color="#F97316" />, text: 'Objectifs & progression' },
      ],
    },
    {
      id: 'transformation',
      icon: <Camera size={64} color="#EC4899" />,
      title: 'Ta Transformation',
      description: 'Photos avant/apres avec slider interactif, graphiques detailles, cartes stylees a partager sur Instagram et reseaux sociaux !',
      color: '#EC4899',
      highlights: [
        { icon: <Camera size={14} color="#EC4899" />, text: 'Photos avant/apres & slider' },
        { icon: <LineChart size={14} color="#EC4899" />, text: 'Graphiques & predictions' },
        { icon: <Star size={14} color="#EC4899" />, text: '6 cartes pour tes reseaux' },
      ],
    },
    {
      id: 'gamification',
      icon: <Medal size={64} color="#FFD700" />,
      title: 'Deviens un Guerrier',
      description: 'XP, niveaux et grades (Ronin, Samurai, Shogun...), 60+ badges, defis quotidiens, avatars exclusifs. Level up chaque jour !',
      color: '#FFD700',
      highlights: [
        { icon: <Award size={14} color="#FFD700" />, text: '9 grades de guerrier' },
        { icon: <Star size={14} color="#FFD700" />, text: '60+ badges a debloquer' },
        { icon: <Target size={14} color="#FFD700" />, text: 'Defis & quetes quotidiennes' },
      ],
    },
    {
      id: 'family',
      icon: <HeartHandshake size={64} color="#10B981" />,
      title: 'Bienvenue dans la Famille',
      description: 'Tes donnees restent sur TON telephone. Pas de compte, pas de pub, pas de tracking. Si tu aimes YOROI, un petit 5 etoiles nous aide enormement !',
      color: '#10B981',
      highlights: [
        { icon: <Target size={14} color="#10B981" />, text: '100% prive - Donnees locales' },
        { icon: <Star size={14} color="#10B981" />, text: 'Note-nous sur l\'App Store' },
        { icon: <HeartHandshake size={14} color="#10B981" />, text: 'Made with love in France' },
      ],
    },
  ];

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      // Passer au setup de profil au lieu d'aller directement à mode-selection
      setShowSetup(true);
    }
  };

  const skipToSetup = () => {
    setShowSetup(true);
  };

  // Fonctions pour le setup de profil
  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusee', 'Acces a la galerie requis');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusee', 'Acces a la camera requis');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Sauvegarder dans SQLite
      await saveProfile({
        name: userName.trim() || 'Champion',
        height_cm: heightCm ? parseInt(heightCm) : undefined,
        target_weight: targetWeight ? parseFloat(targetWeight) : undefined,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        avatar_gender: gender || 'homme',
        profile_photo: profilePhoto,
        birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined,
      });

      // IMPORTANT: Aussi sauvegarder dans AsyncStorage pour que index.tsx sache que l'onboarding est termine
      await saveUserSettings({
        username: userName.trim() || 'Champion',
        gender: gender === 'femme' ? 'female' : 'male',
        height: heightCm ? parseInt(heightCm) : undefined,
        targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
        onboardingCompleted: true,
      });

      router.replace('/mode-selection');
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      router.replace('/mode-selection');
    }
  };

  const nextSetupStep = () => {
    if (setupStep < 4) {
      setSetupStep(setupStep + 1);
    } else {
      handleSaveProfile();
    }
  };

  const skipSetup = () => {
    handleSaveProfile();
  };

  // Calcul de l'âge
  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    // Animation pour l'icône et le contenu
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, 30],
      extrapolate: 'clamp',
    });

    const iconRotate = scrollX.interpolate({
      inputRange,
      outputRange: ['-10deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width }]}>
        {/* Icon avec cercle de fond animé */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: item.color + '25',
              transform: [{ scale }, { rotate: iconRotate }],
              opacity,
              borderWidth: 2,
              borderColor: item.color + '40',
            }
          ]}
        >
          {item.icon}
        </Animated.View>

        {/* Titre avec animation */}
        <Animated.Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              opacity,
              transform: [{ translateY }],
            }
          ]}
        >
          {item.title}
        </Animated.Text>

        {/* Description avec animation */}
        <Animated.Text
          style={[
            styles.description,
            {
              color: colors.textSecondary,
              opacity,
              transform: [{ translateY }],
            }
          ]}
        >
          {item.description}
        </Animated.Text>

        {/* Highlights avec animation */}
        {item.highlights && item.highlights.length > 0 && (
          <Animated.View
            style={[
              styles.highlightsContainer,
              {
                opacity,
                transform: [{ translateY }],
              }
            ]}
          >
            {item.highlights.map((highlight, idx) => (
              <View
                key={idx}
                style={[
                  styles.highlightItem,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: item.color + '30',
                  }
                ]}
              >
                <View style={[styles.highlightIcon, { backgroundColor: item.color + '20' }]}>
                  {highlight.icon}
                </View>
                <Text style={[styles.highlightText, { color: colors.textPrimary }]}>
                  {highlight.text}
                </Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    );
  };

  // Écran de configuration du profil
  if (showSetup) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Logo en haut */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo2010.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>
            YOROI
          </Text>
        </View>

        {/* Indicateurs d'étape */}
        <View style={styles.setupStepsIndicator}>
          {[0, 1, 2, 3, 4].map((step) => (
            <View
              key={step}
              style={[
                styles.setupStepDot,
                {
                  backgroundColor: step <= setupStep ? colors.accent : colors.border,
                  width: step === setupStep ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          style={styles.setupContent}
          contentContainerStyle={styles.setupContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Étape 0: Nom */}
          {setupStep === 0 && (
            <View style={styles.setupStep}>
              <View style={[styles.setupIconContainer, { backgroundColor: `${colors.accent}20` }]}>
                <User size={48} color={colors.accent} />
              </View>
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>
                Comment t'appelles-tu ?
              </Text>
              <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
                On va personnaliser ton expérience
              </Text>
              <TextInput
                style={[styles.setupInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                value={userName}
                onChangeText={setUserName}
                placeholder="Ton prénom ou pseudo"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
          )}

          {/* Étape 1: Sexe */}
          {setupStep === 1 && (
            <View style={styles.setupStep}>
              <View style={[styles.setupIconContainer, { backgroundColor: `${colors.accent}20` }]}>
                <User size={48} color={colors.accent} />
              </View>
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>
                Tu es...
              </Text>
              <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
                Pour personnaliser les calculs et l'avatar
              </Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    {
                      backgroundColor: gender === 'homme' ? colors.accent : colors.backgroundCard,
                      borderColor: gender === 'homme' ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setGender('homme')}
                >
                  <MaterialCommunityIcons
                    name="human-male"
                    size={40}
                    color={gender === 'homme' ? colors.textOnGold : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      { color: gender === 'homme' ? colors.textOnGold : colors.textPrimary },
                    ]}
                  >
                    Homme
                  </Text>
                  {gender === 'homme' && <Check size={20} color={colors.textOnGold} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    {
                      backgroundColor: gender === 'femme' ? colors.accent : colors.backgroundCard,
                      borderColor: gender === 'femme' ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setGender('femme')}
                >
                  <MaterialCommunityIcons
                    name="human-female"
                    size={40}
                    color={gender === 'femme' ? colors.textOnGold : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.genderText,
                      { color: gender === 'femme' ? colors.textOnGold : colors.textPrimary },
                    ]}
                  >
                    Femme
                  </Text>
                  {gender === 'femme' && <Check size={20} color={colors.textOnGold} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Étape 2: Taille et Poids objectif */}
          {setupStep === 2 && (
            <View style={styles.setupStep}>
              <View style={[styles.setupIconContainer, { backgroundColor: '#10B98120' }]}>
                <Ruler size={48} color="#10B981" />
              </View>
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>
                Tes mensurations
              </Text>
              <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
                Pour calculer ton IMC et tes objectifs
              </Text>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Taille (cm)</Text>
                  <TextInput
                    style={[styles.setupInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="175"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids objectif (kg)</Text>
                  <TextInput
                    style={[styles.setupInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="75"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Étape 3: Date de naissance */}
          {setupStep === 3 && (
            <View style={styles.setupStep}>
              <View style={[styles.setupIconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Cake size={48} color="#F59E0B" />
              </View>
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>
                Ta date de naissance
              </Text>
              <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
                Pour calculer ton âge dans les stats
              </Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <CalendarDays size={24} color={colors.accent} />
                <Text style={[styles.dateButtonText, { color: birthDate ? colors.textPrimary : colors.textMuted }]}>
                  {birthDate ? format(birthDate, 'd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                </Text>
              </TouchableOpacity>
              {birthDate && (
                <View style={[styles.ageBadge, { backgroundColor: `${colors.accent}20` }]}>
                  <Text style={[styles.ageText, { color: colors.accent }]}>
                    {calculateAge(birthDate)} ans
                  </Text>
                </View>
              )}
              {showDatePicker && (
                <View style={[styles.datePickerContainer, { backgroundColor: colors.backgroundCard, borderRadius: 16, marginTop: 16 }]}>
                  <DateTimePicker
                    value={birthDate || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setBirthDate(date);
                    }}
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                    textColor={colors.textPrimary}
                    themeVariant="dark"
                  />
                </View>
              )}
            </View>
          )}

          {/* Étape 4: Photo de profil */}
          {setupStep === 4 && (
            <View style={styles.setupStep}>
              <View style={[styles.setupIconContainer, { backgroundColor: '#8B5CF620' }]}>
                <Camera size={48} color="#8B5CF6" />
              </View>
              <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>
                Ta photo de profil
              </Text>
              <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
                Optionnel - Tu pourras toujours la changer plus tard
              </Text>
              <TouchableOpacity
                style={[styles.photoPreview, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={handlePickPhoto}
              >
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.photoImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={40} color={colors.textMuted} />
                    <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>
                      Touche pour ajouter
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  onPress={handlePickPhoto}
                >
                  <ImageIcon size={20} color={colors.textPrimary} />
                  <Text style={[styles.photoActionText, { color: colors.textPrimary }]}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoActionBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  onPress={handleTakePhoto}
                >
                  <Camera size={20} color={colors.textPrimary} />
                  <Text style={[styles.photoActionText, { color: colors.textPrimary }]}>Caméra</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Boutons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={nextSetupStep}
          >
            <Text style={[styles.buttonText, { color: buttonTextColor }]}>
              {setupStep === 4 ? "C'est parti !" : 'Continuer'}
            </Text>
            <ChevronRight size={22} color={buttonTextColor} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={skipSetup}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              Passer cette étape
            </Text>
          </TouchableOpacity>
        </View>

        <PopupComponent />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo en haut */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo2010.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.logoText, { color: colors.textPrimary }]}>
          YOROI
        </Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
      />

      {/* Indicateurs */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Bouton */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={goToNext}
        >
          <Text style={[styles.buttonText, { color: buttonTextColor }]}>
            {currentIndex === slides.length - 1 ? "C'est parti !" : 'Continuer'}
          </Text>
          <ChevronRight size={22} color={buttonTextColor} />
        </TouchableOpacity>

        {/* Skip */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipToSetup}
          >
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              Passer
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 4,
  },

  // Slide
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.9,
  },

  // Highlights
  highlightsContainer: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 10,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  highlightIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  highlightText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  skipButton: {
    marginTop: 18,
    padding: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Setup Profile Styles
  setupStepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
    paddingTop: 10,
  },
  setupStepDot: {
    height: 6,
    borderRadius: 3,
  },
  setupContent: {
    flex: 1,
  },
  setupContentContainer: {
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  setupStep: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  setupTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  setupSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 36,
    opacity: 0.8,
    lineHeight: 22,
  },
  setupInput: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  inputGroup: {
    flex: 1,
    gap: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  genderOption: {
    flex: 1,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  genderEmoji: {
    fontSize: 44,
  },
  genderText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dateButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  ageBadge: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  ageText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  photoPreview: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 10,
  },
  photoPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 14,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  photoActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  datePickerContainer: {
    overflow: 'hidden',
    padding: 8,
  },
});
