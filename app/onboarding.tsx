import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/I18nContext';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Image,
  TextInput,
  Platform,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomPopup } from '@/components/CustomPopup';
import { PhotoCropModal } from '@/components/PhotoCropModal';
import { router, useLocalSearchParams } from 'expo-router';
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
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Check,
  Info,
  X,
  Heart,
  Download,
} from 'lucide-react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { saveProfile } from '@/lib/database';
import { saveUserSettings } from '@/lib/storage';
import { importDataFromJSON } from '@/lib/exportService';
import { healthConnect } from '@/lib/healthConnect';
import { setUserMode, setUserSport, setUserWeightCategory } from '@/lib/fighterModeService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';
import { validators } from '@/lib/security/validators';
import { logger } from '@/lib/security/logger';
import { SPORTS, getSportColor } from '@/lib/sports';
import { getWeightCategories } from '@/lib/fighterMode';
import type { UserMode, WeightCategory } from '@/lib/fighterMode';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGAL_ACCEPTED_KEY = '@yoroi_legal_accepted';

// Theme BLANC premium - vrai dore
const C = {
  bg: '#FFFFFF',
  bgCard: '#F5F5F7',
  bgInput: '#F0F0F2',
  text: '#1A1A1A',
  textSub: '#555555',
  textMuted: '#999999',
  gold: '#0EA5E9',
  goldLight: '#E0F2FE',
  goldDark: '#0284C7',
  border: '#E5E5EA',
  white: '#FFFFFF',
  danger: '#FF3B30',
};

// ============================================
// FEATURES PAGE 2 - avec details
// ============================================
interface Feature {
  icon: typeof BarChart3;
  title: string;
  desc: string;
  color: string;
  details: string[];
}

const FEATURES: Feature[] = [
  {
    icon: BarChart3,
    title: 'Stats & Suivi',
    desc: 'Suivi complet de ta progression',
    color: '#0A84FF',
    details: [
      'Dashboard personnalise avec tes metriques cles',
      'Suivi du poids et composition corporelle',
      'Graphiques d\'evolution (semaine, mois, annee)',
      'Signes vitaux : fréquence cardiaque, sommeil, pas',
      'Analyse detaillee de tes séances',
    ],
  },
  {
    icon: CalendarDays,
    title: 'Planning & Carnet',
    desc: 'Organise tes entraînements',
    color: '#FF9500',
    details: [
      'Calendrier de tes entraînements',
      'Journal de training detaille par séance',
      'Historique complet de toutes tes sessions',
      'Suivi de la charge d\'entraînement',
    ],
  },
  {
    icon: Swords,
    title: 'Mode Competiteur',
    desc: 'Prepare tes competitions',
    color: '#FF3B30',
    details: [
      'Categories de poids officielles par sport',
      'Suivi pesee et objectif de poids',
      'Gestion de tes competitions a venir',
      'Palmares et historique de tes combats/matchs',
    ],
  },
  {
    icon: Timer,
    title: 'Outils Pro',
    desc: 'Tout pour t\'entrainer',
    color: '#AF52DE',
    details: [
      'Charge d\'entraînement et récupération',
      'Import/Export CSV de tes données',
      'Systeme de gamification et badges',
      'Tutoriels et guides integres',
    ],
  },
  {
    icon: HeartHandshake,
    title: 'Santé Connectee',
    desc: 'Synchronise tes données',
    color: '#30D158',
    details: [
      'Integration Apple Santé / Health Connect',
      'Données automatiques (FC, sommeil, pas)',
      'Suivi du sommeil detaille',
      'Apple Watch compatible',
    ],
  },
  {
    icon: Shield,
    title: '100% Prive',
    desc: 'Tes données restent chez toi',
    color: C.gold,
    details: [
      'Aucun cloud - tout reste sur ton telephone',
      'Aucun tracking ni publicite',
      'Export securise de tes données',
      'Pas de compte requis',
    ],
  },
];

// ============================================
// CATÉGORIES DE SPORTS (même ordre que add-training)
// ============================================
const SPORT_CATEGORIES = ['cardio', 'fitness', 'combat_grappling', 'combat_striking', 'danse', 'collectif', 'raquettes', 'aquatique', 'glisse', 'nature', 'precision', 'autre'] as const;

const SPORT_CATEGORY_LABELS: Record<string, string> = {
  cardio: 'Cardio',
  fitness: 'Musculation & Fitness',
  combat_grappling: 'Combat (Grappling)',
  combat_striking: 'Combat (Pieds-Poings)',
  danse: 'Danse',
  collectif: 'Sports Collectifs',
  raquettes: 'Raquettes',
  glisse: 'Sports de Glisse',
  nature: 'Sports Nature',
  aquatique: 'Sports Aquatiques',
  precision: 'Précision & Adresse',
  autre: 'Autres',
};

const SPORT_CATEGORY_ICONS: Record<string, string> = {
  cardio: 'run-fast',
  fitness: 'dumbbell',
  combat_grappling: 'kabaddi',
  combat_striking: 'boxing-glove',
  danse: 'dance-ballroom',
  collectif: 'soccer',
  raquettes: 'tennis',
  glisse: 'snowboard',
  nature: 'hiking',
  aquatique: 'swim',
  precision: 'bow-arrow',
  autre: 'dots-horizontal',
};

const SPORT_CATEGORY_COLORS: Record<string, string> = {
  cardio: '#10B981',
  fitness: '#8B5CF6',
  combat_grappling: '#3B82F6',
  combat_striking: '#EF4444',
  danse: '#EC4899',
  collectif: '#F59E0B',
  raquettes: '#06B6D4',
  glisse: '#0EA5E9',
  nature: '#22C55E',
  aquatique: '#0284C7',
  precision: '#B45309',
  autre: '#6B7280',
};

export default function OnboardingScreen() {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const s = useMemo(() => createStyles(width), [width]);
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay: 1000 });
  const params = useLocalSearchParams<{ preview?: string; page?: string }>();
  const isPreview = params.preview === 'true';
  const insets = useSafeAreaInsets();


  // Navigation
  const [currentPage, setCurrentPage] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Page 1 - confirmation age
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Page 2 - feature expanded
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  // Formulaire (Page 3)
  const [userName, setUserName] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [mode, setMode] = useState<UserMode | null>(null);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [cropModalUri, setCropModalUri] = useState<string | null>(null);

  // Catégories de sports ouvertes
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Page 4 - Apple Santé
  const [isConnectingHealth, setIsConnectingHealth] = useState(false);
  const [healthConnected, setHealthConnected] = useState(false);

  // Restauration de sauvegarde (depuis la page 1)
  const [isRestoring, setIsRestoring] = useState(false);

  // Autofocus du champ prénom à l'arrivée sur le formulaire
  const nameInputRef = useRef<TextInput | null>(null);
  useEffect(() => {
    if (currentPage === 2) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 400);
      return () => clearTimeout(t);
    }
  }, [currentPage]);

  // Musique d'intro en fond : player géré manuellement pour pouvoir le remove() complètement.
  // La musique ne joue QUE si l'app est réellement au premier plan : iOS peut lancer Yoroi
  // en arrière-plan (HealthKit, Watch), et elle ne doit jamais démarrer toute seule.
  const introPlayerRef = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    let active = true;

    const startMusic = async () => {
      if (!active || AppState.currentState !== 'active') return;
      try {
        if (introPlayerRef.current) {
          introPlayerRef.current.play();
          return;
        }
        await setAudioModeAsync({ playsInSilentMode: true });
        if (!active || AppState.currentState !== 'active' || introPlayerRef.current) return;
        const player = createAudioPlayer(require('@/assets/sounds/intro.mp3'));
        player.loop = true;
        player.volume = 0.5;
        player.play();
        introPlayerRef.current = player;
      } catch {}
    };

    const pauseMusic = () => {
      try {
        introPlayerRef.current?.pause();
      } catch {}
    };

    startMusic();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startMusic();
      else pauseMusic();
    });

    return () => {
      active = false;
      sub.remove();
      try {
        introPlayerRef.current?.pause();
        introPlayerRef.current?.remove(); // libère complètement le player, évite qu'iOS le relance en arrière-plan
        introPlayerRef.current = null;
      } catch {}
    };
  }, []);

  const weightCategories: WeightCategory[] = selectedSport ? getWeightCategories(selectedSport as any) : [];
  const sportHasCategories = weightCategories.length > 0 && selectedSport !== 'autre';

  const goToPage = (page: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentPage(page);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const calculateAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  };

  // Feedback visuel de validation (bordure verte sur les champs valides)
  const isNameValid = validators.username(userName.trim()).valid;
  const isHeightValid = !!heightCm && validators.height(parseFloat(heightCm)).valid;
  const isTargetWeightValid = !!targetWeight && validators.weight(parseFloat(targetWeight)).valid;
  const isBirthDateValid = !!birthDate && calculateAge(birthDate) >= 13;

  const canComplete = useMemo((): boolean => {
    if (!validators.username(userName.trim()).valid) return false;
    if (!gender) return false;
    if (!heightCm || !validators.height(parseFloat(heightCm)).valid) return false;
    if (!targetWeight || !validators.weight(parseFloat(targetWeight)).valid) return false;
    if (!birthDate) return false;
    if (birthDate && calculateAge(birthDate) < 13) return false;
    if (!goal) return false;
    if (!mode) return false;
    if (mode === 'competiteur' && !selectedSport) return false;
    return true;
  }, [userName, gender, heightCm, targetWeight, birthDate, goal, mode, selectedSport]);

  const pickFromGallery = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showPopup(t('onboarding.permissionRequired'), t('onboarding.allowGalleryAccess')); return; }
    const result = await launchImageLibraryAsync({ quality: 0.9, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setCropModalUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') { showPopup(t('onboarding.permissionRequired'), t('onboarding.allowCameraAccess')); return; }
    const result = await launchCameraAsync({ quality: 0.9, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setCropModalUri(result.assets[0].uri);
  };

  const handleDateChange = (_: any, d?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (d) {
      const age = calculateAge(d);
      if (age < 13) {
        showPopup(
          t('onboarding.ageRequired'),
          t('onboarding.ageRequiredDesc')
        );
        setBirthDate(null);
        return;
      }
      setBirthDate(d);
    }
  };

  const toggleSportCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleRestoreBackup = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      const ok = await importDataFromJSON();
      if (!ok) {
        setIsRestoring(false);
        return;
      }
      // La sauvegarde est importée : on marque l'onboarding comme terminé
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');
      await AsyncStorage.setItem('yoroi_onboarding_done', 'true');
      // S'assurer que le flag onboardingCompleted est bien posé dans les settings
      try {
        await saveUserSettings({ onboardingCompleted: true });
      } catch {}
      // Utilisateur existant qui restaure sa sauvegarde : pas de tour de découverte
      await AsyncStorage.setItem('@yoroi_onboarding_tour_done', 'true').catch(() => {});
      logger.info('Onboarding completed via backup restore');
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Onboarding restore failed', error);
      const msg = error instanceof Error ? error.message : String(error);
      showPopup(t('onboarding.error'), `${t('onboarding.error')}: ${msg}`);
      setIsRestoring(false);
    }
  };

  const handleComplete = async () => {
    const usernameCheck = validators.username(userName.trim());
    if (!usernameCheck.valid) { showPopup(t('onboarding.invalidName'), usernameCheck.error || t('onboarding.checkName')); return; }
    const heightCheck = validators.height(parseFloat(heightCm));
    if (!heightCheck.valid) { showPopup(t('onboarding.invalidHeight'), heightCheck.error || t('onboarding.heightRange')); return; }
    const weightCheck = validators.weight(parseFloat(targetWeight));
    if (!weightCheck.valid) { showPopup(t('onboarding.invalidWeight'), weightCheck.error || t('onboarding.weightRange')); return; }
    if (!birthDate || calculateAge(birthDate) < 13) {
      showPopup(t('onboarding.ageRequired'), t('onboarding.ageRequiredShort'));
      return;
    }

    try {
      await saveProfile({
        name: userName.trim(), height_cm: parseFloat(heightCm), target_weight: parseFloat(targetWeight),
        start_date: format(new Date(), 'yyyy-MM-dd'), avatar_gender: gender!, profile_photo: profilePhoto,
        birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : undefined, weight_goal: goal!,
      });
      await saveUserSettings({
        username: userName.trim(), gender: gender === 'femme' ? 'female' : 'male',
        height: parseFloat(heightCm), targetWeight: parseFloat(targetWeight), goal: goal!, onboardingCompleted: true,
      });
      await setUserMode(mode!);
      if (mode === 'competiteur' && selectedSport) await setUserSport(selectedSport as any);
      if (selectedCategory) await setUserWeightCategory(selectedCategory);
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');
      if (!isPreview) await AsyncStorage.setItem('yoroi_onboarding_done', 'true');
      logger.info('Onboarding completed', { step: 'all' });
      // Aller vers la page Apple Santé (page 3) avant d'entrer dans l'app
      if (isPreview) {
        router.replace('/(tabs)');
      } else {
        goToPage(3);
      }
    } catch (error) {
      logger.error('Onboarding save failed', error);
      const msg = error instanceof Error ? error.message : String(error);
      showPopup(t('onboarding.error'), `${t('onboarding.error')}: ${msg}`);
    }
  };

  // =============================================
  // PAGE 1 - Bienvenue + Confirmation age
  // =============================================
  const renderPage1 = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.p1Wrap} showsVerticalScrollIndicator={false}>
      {/* Logo */}
      <View style={s.p1LogoCircle}>
        <Image
          source={require('../assets/logo d\'app/yoroi-logo2.png')}
          style={s.p1Logo}
          resizeMode="cover"
        />
      </View>

      <Text style={s.p1Brand}>YOROI</Text>
      <View style={s.p1GoldBar} />
      <Text style={s.p1Tagline}>{t('onboarding.tagline')}</Text>

      {/* Titre principal */}
      <Text style={s.p1Title} numberOfLines={1} adjustsFontSizeToFit>{t('onboarding.welcomeTitle')}</Text>

      {/* Histoire */}
      <View style={s.p1Card}>
        <Text style={s.p1Story}>
          {t('onboarding.story1')}
        </Text>
        <Text style={s.p1Story}>
          {t('onboarding.story2')}
        </Text>
        <Text style={s.p1Story}>
          {t('onboarding.story3')}
        </Text>
        <View style={s.p1Divider} />
        <Text style={s.p1Highlight}>{t('onboarding.highlight')}</Text>
        <Text style={s.p1Story}>
          {t('onboarding.story4')}
        </Text>
        <Text style={s.p1Italic}>
          <Text style={s.p1ItalicBold}>{t('onboarding.trust')}</Text>
          {'\n'}<Text style={s.p1ItalicBold}>{t('onboarding.thanks')}</Text>
        </Text>
      </View>

      {/* Confirmation age */}
      <TouchableOpacity
        style={s.p1AgeRow}
        onPress={() => setAgeConfirmed(!ageConfirmed)}
        activeOpacity={0.7}
      >
        <View style={[s.p1Checkbox, ageConfirmed && s.p1CheckboxActive]}>
          {ageConfirmed && <Ionicons name="checkmark" size={16} color={C.white} />}
        </View>
        <Text style={s.p1AgeText}>{t('onboarding.ageConfirm')}</Text>
      </TouchableOpacity>

      {/* Bouton continuer */}
      <TouchableOpacity
        style={[s.p1Btn, !ageConfirmed && s.disabledBtn]}
        onPress={() => goToPage(1)}
        activeOpacity={0.8}
        disabled={!ageConfirmed}
      >
        <Text style={[s.p1BtnText, !ageConfirmed && s.disabledBtnText]}>{t('onboarding.joinAdventure')}</Text>
        <ChevronRight size={20} color={ageConfirmed ? C.white : C.textMuted} />
      </TouchableOpacity>

      {/* Restaurer une sauvegarde existante */}
      <TouchableOpacity
        style={[s.p1RestoreBtn, isRestoring && s.disabledBtn]}
        onPress={handleRestoreBackup}
        activeOpacity={0.8}
        disabled={isRestoring}
      >
        {isRestoring ? (
          <ActivityIndicator size="small" color={C.goldDark} />
        ) : (
          <Download size={18} color={C.goldDark} />
        )}
        <Text style={s.p1RestoreBtnText}>
          {isRestoring ? 'Restauration en cours…' : 'J\'ai déjà une sauvegarde'}
        </Text>
      </TouchableOpacity>
      <Text style={s.p1RestoreHint}>
        Importer un fichier .json pour retrouver ton profil et ton historique
      </Text>

      <Text style={s.p1Footer}>
        {t('onboarding.termsNotice')}
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // =============================================
  // PAGE 2 - Features (cliquables avec details)
  // =============================================
  const renderPage2 = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.p2Wrap} showsVerticalScrollIndicator={false}>
      {/* Header : retour + stepper */}
      <View style={s.formHeader}>
        <TouchableOpacity style={s.backPill} onPress={() => goToPage(0)} activeOpacity={0.7}>
          <ChevronLeft size={20} color={C.text} />
          <Text style={s.backPillText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <View style={s.stepper}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.stepDot, i <= 1 && s.stepDotDone]} />
          ))}
        </View>
      </View>

      <Text style={s.p2Title}>{t('onboarding.everythingYouNeed')}</Text>
      <Text style={s.p2Sub}>{t('onboarding.tapModuleHint')}</Text>

      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        const isExpanded = expandedFeature === i;
        return (
          <TouchableOpacity
            key={i}
            style={[s.p2Card, isExpanded && { borderColor: f.color, borderWidth: 1.5, backgroundColor: f.color + '08' }]}
            onPress={() => setExpandedFeature(isExpanded ? null : i)}
            activeOpacity={0.7}
          >
            <View style={s.p2CardRow}>
              <View style={[s.p2IconBox, { backgroundColor: f.color + '15' }]}>
                <Icon size={24} color={f.color} />
              </View>
              <View style={s.p2CardText}>
                <Text style={s.p2CardTitle}>{f.title}</Text>
                <Text style={s.p2CardDesc}>{f.desc}</Text>
              </View>
              <View style={[s.p2Chevron, isExpanded && s.p2ChevronOpen]}>
                <ChevronDown size={18} color={isExpanded ? f.color : C.textMuted} />
              </View>
            </View>

            {isExpanded && (
              <View style={s.p2Details}>
                <View style={[s.p2DetailsDivider, { backgroundColor: f.color + '30' }]} />
                {f.details.map((detail, j) => (
                  <View key={j} style={s.p2DetailRow}>
                    <Check size={14} color={f.color} strokeWidth={3} />
                    <Text style={s.p2DetailText}>{detail}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={s.goldBtn} onPress={() => goToPage(2)} activeOpacity={0.8}>
        <Text style={s.goldBtnText}>{t('onboarding.configureProfile')}</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );

  // =============================================
  // PAGE 3 - Formulaire de profil
  // =============================================
  const renderPage3 = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {/* Header : retour + stepper */}
      <View style={s.formHeader}>
        <TouchableOpacity style={s.backPill} onPress={() => goToPage(1)} activeOpacity={0.7}>
          <ChevronLeft size={20} color={C.text} />
          <Text style={s.backPillText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <View style={s.stepper}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.stepDot, i <= 2 && s.stepDotDone]} />
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.formWrap}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentInsetAdjustmentBehavior="automatic"
      >
        {/* Titre de l'étape */}
        <Text style={s.formTitle}>Parle-nous de toi</Text>
        <Text style={s.formSubtitle}>Quelques infos pour personnaliser ton expérience</Text>

        {/* =========================================
            SECTION 1 · À propos de toi
            ========================================= */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeaderRow}>
            <View style={[s.sectionIconBadge, { backgroundColor: C.goldLight }]}>
              <MaterialCommunityIcons name="account-outline" size={18} color={C.goldDark} />
            </View>
            <Text style={s.sectionCardTitle}>À propos de toi</Text>
          </View>

          {/* Photo */}
          <View style={s.photoRow}>
            <TouchableOpacity style={s.photoCircle} onPress={pickFromGallery} activeOpacity={0.8}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={s.photoImg} />
              ) : (
                <MaterialCommunityIcons name="camera-plus-outline" size={28} color={C.textMuted} />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.photoLabel}>{t('onboarding.profilePhoto')}</Text>
              <Text style={s.photoHint}>Optionnel · aide à personnaliser ton avatar</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={s.photoSmallBtn} onPress={pickFromGallery}>
                  <ImageIcon size={14} color={C.text} />
                  <Text style={s.photoSmallText}>{t('onboarding.gallery')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.photoSmallBtn} onPress={takePhoto}>
                  <Camera size={14} color={C.text} />
                  <Text style={s.photoSmallText}>{t('onboarding.camera')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Prénom */}
          <Text style={s.label}>{t('onboarding.nameLabel')}</Text>
          <View style={s.inputWrap}>
            <TextInput
              ref={nameInputRef}
              style={[s.input, isNameValid && s.inputValid]}
              placeholder="Comment tu veux qu'on t'appelle ?"
              placeholderTextColor={C.textMuted}
              value={userName}
              onChangeText={setUserName}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {isNameValid && (
              <View style={s.validCheck}>
                <Check size={14} color="#30D158" strokeWidth={3} />
              </View>
            )}
          </View>

          {/* Genre */}
          <Text style={s.label}>{t('onboarding.genderLabel')}</Text>
          <View style={s.row}>
            {(['homme', 'femme'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[s.chip, gender === g && s.chipActive]}
                onPress={() => setGender(g)}
              >
                <MaterialCommunityIcons
                  name={g === 'homme' ? 'human-male' : 'human-female'}
                  size={22}
                  color={gender === g ? C.gold : C.text}
                />
                <Text style={[s.chipText, gender === g && s.chipTextActive]}>
                  {g === 'homme' ? t('onboarding.male') : t('onboarding.female')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* =========================================
            SECTION 2 · Tes mesures
            ========================================= */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeaderRow}>
            <View style={[s.sectionIconBadge, { backgroundColor: '#E0F2FE' }]}>
              <MaterialCommunityIcons name="ruler" size={18} color="#0284C7" />
            </View>
            <Text style={s.sectionCardTitle}>Tes mesures</Text>
          </View>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('onboarding.heightLabel')}</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={[s.input, isHeightValid && s.inputValid]}
                  placeholder="175"
                  placeholderTextColor={C.textMuted}
                  value={heightCm}
                  onChangeText={(v) => setHeightCm(v.replace(',', '.'))}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                {isHeightValid && (
                  <View style={s.validCheck}>
                    <Check size={14} color="#30D158" strokeWidth={3} />
                  </View>
                )}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('onboarding.targetWeightLabel')}</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={[s.input, isTargetWeightValid && s.inputValid]}
                  placeholder="80"
                  placeholderTextColor={C.textMuted}
                  value={targetWeight}
                  onChangeText={(v) => setTargetWeight(v.replace(',', '.'))}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                {isTargetWeightValid && (
                  <View style={s.validCheck}>
                    <Check size={14} color="#30D158" strokeWidth={3} />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Date de naissance */}
          <Text style={s.label}>{t('onboarding.birthDateLabel')}</Text>
          <View style={s.row}>
            <TouchableOpacity style={[s.dateBtn, { flex: 1 }, isBirthDateValid && s.inputValid]} onPress={() => setShowDatePicker(!showDatePicker)}>
              <Text style={birthDate ? s.dateTxt : s.datePlaceholder}>
                {birthDate ? format(birthDate, 'dd MMMM yyyy', { locale: fr }) : t('onboarding.selectDate')}
              </Text>
              {birthDate && (
                <View style={s.ageBadge}>
                  <Text style={s.ageText}>{calculateAge(birthDate)} {t('onboarding.yearsOld')}</Text>
                </View>
              )}
            </TouchableOpacity>
            {showDatePicker && Platform.OS === 'ios' && (
              <TouchableOpacity style={s.dateOkBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={s.dateOkText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              themeVariant="light"
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              onChange={handleDateChange}
            />
          )}

          {birthDate && calculateAge(birthDate) < 13 && (
            <View style={s.ageWarning}>
              <Info size={16} color={C.danger} />
              <Text style={s.ageWarningText}>{t('onboarding.ageRequiredShort')}</Text>
            </View>
          )}
        </View>

        {/* =========================================
            SECTION 3 · Ton objectif
            ========================================= */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeaderRow}>
            <View style={[s.sectionIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="target" size={18} color="#D97706" />
            </View>
            <Text style={s.sectionCardTitle}>Ton objectif</Text>
          </View>

          <View style={s.row}>
            {([
              { id: 'lose' as const, label: t('onboarding.goalLose'), Icon: TrendingDown, color: '#30D158' },
              { id: 'maintain' as const, label: t('onboarding.goalMaintain'), Icon: Minus, color: C.gold },
              { id: 'gain' as const, label: t('onboarding.goalGain'), Icon: TrendingUp, color: '#FF3B30' },
            ]).map((o) => (
              <TouchableOpacity
                key={o.id}
                style={[s.goalCard, goal === o.id && { borderColor: o.color, backgroundColor: o.color + '12' }]}
                onPress={() => setGoal(o.id)}
              >
                <o.Icon size={24} color={goal === o.id ? o.color : C.textSub} />
                <Text style={[s.goalLabel, goal === o.id && { color: o.color, fontWeight: '700' }]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* =========================================
            SECTION 4 · Ton profil sportif
            ========================================= */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeaderRow}>
            <View style={[s.sectionIconBadge, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="dumbbell" size={18} color="#DC2626" />
            </View>
            <Text style={s.sectionCardTitle}>Ton profil sportif</Text>
          </View>

          <Text style={s.label}>{t('onboarding.modeLabel')}</Text>
          <View style={s.row}>
          {([
            { id: 'competiteur' as UserMode, label: t('onboarding.modeCompetitor'), desc: t('onboarding.modeCompetitorDesc'), Icon: Swords, color: '#FF3B30' },
            { id: 'loisir' as UserMode, label: t('onboarding.modeFitness'), desc: t('onboarding.modeFitnessDesc'), Icon: Dumbbell, color: '#0A84FF' },
          ]).map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[s.modeCard, mode === m.id && { borderColor: m.color, backgroundColor: m.color + '12' }]}
              onPress={() => { setMode(m.id); if (m.id !== mode) { setSelectedSport(null); setSelectedCategory(null); setExpandedCategories([]); } }}
            >
              <m.Icon size={28} color={mode === m.id ? m.color : C.textSub} />
              <Text style={[s.modeLabel, mode === m.id && { color: m.color }]}>{m.label}</Text>
              <Text style={s.modeDesc}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* =============================================
            SPORT - organise par sections / accordion
            ============================================= */}
        {mode === 'competiteur' && (
          <>
            <Text style={s.label}>{t('onboarding.mainSportLabel')}</Text>
            <Text style={s.labelHint}>{t('onboarding.selectCategoryHint')}</Text>

            {SPORT_CATEGORIES.map((category) => {
              const sportsInCategory = SPORTS.filter((s2) => s2.category === category);
              if (sportsInCategory.length === 0) return null;
              const isExpanded = expandedCategories.includes(category);
              const hasSelectedSport = sportsInCategory.some((s2) => s2.id === selectedSport);
              const catColor = SPORT_CATEGORY_COLORS[category];
              const catIcon = SPORT_CATEGORY_ICONS[category];
              const catLabel = SPORT_CATEGORY_LABELS[category];

              return (
                <View key={category} style={s.sectionWrap}>
                  {/* Header de section */}
                  <TouchableOpacity
                    style={[
                      s.sectionHeader,
                      hasSelectedSport && { borderColor: C.gold, borderWidth: 1.5, backgroundColor: C.goldLight },
                    ]}
                    onPress={() => toggleSportCategory(category)}
                    activeOpacity={0.7}
                  >
                    <View style={s.sectionHeaderLeft}>
                      <MaterialCommunityIcons
                        name={catIcon as any}
                        size={20}
                        color={hasSelectedSport ? C.gold : catColor}
                      />
                      <Text style={[s.sectionTitle, hasSelectedSport && { color: C.gold }]}>
                        {catLabel}
                      </Text>
                      {hasSelectedSport && (
                        <View style={s.sectionBadge}>
                          <Check size={12} color={C.white} strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <View style={[s.sectionChevron, isExpanded && s.sectionChevronOpen]}>
                      <ChevronDown size={18} color={hasSelectedSport ? C.gold : C.textMuted} />
                    </View>
                  </TouchableOpacity>

                  {/* Sports de la section */}
                  {isExpanded && (
                    <View style={s.sectionContent}>
                      {sportsInCategory.map((sport) => {
                        const sel = selectedSport === sport.id;
                        const sc = sport.color || getSportColor(sport.id);
                        return (
                          <TouchableOpacity
                            key={sport.id}
                            style={[
                              s.sportCard,
                              sel && { borderColor: sc, backgroundColor: sc + '15' },
                            ]}
                            onPress={() => { setSelectedSport(sport.id); setSelectedCategory(null); }}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={sport.icon as any}
                              size={22}
                              color={sel ? sc : C.textSub}
                            />
                            <Text style={[s.sportCardText, sel && { color: sc, fontWeight: '700' }]}>
                              {sport.name}
                            </Text>
                            {sel && (
                              <View style={[s.sportCheck, { backgroundColor: sc }]}>
                                <Check size={12} color={C.white} strokeWidth={3} />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Categories de poids */}
            {selectedSport && sportHasCategories && (
              <>
                <Text style={[s.label, { marginTop: 20 }]}>
                  {t('onboarding.weightCategoryLabel')} - {SPORTS.find((s2) => s2.id === selectedSport)?.name ?? selectedSport}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={s.catRow}>
                    {weightCategories.map((cat) => {
                      const sel = selectedCategory === cat.id;
                      const sc = getSportColor(selectedSport!);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[s.catCard, sel && { borderColor: sc, backgroundColor: sc + '15' }]}
                          onPress={() => setSelectedCategory(cat.id)}
                        >
                          <Text style={[s.catName, sel && { color: sc, fontWeight: '700' }]}>{cat.name}</Text>
                          <Text style={[s.catKg, sel && { color: sc }]}>
                            {cat.maxWeight < 999 ? `${cat.maxWeight} kg` : 'Open'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {/* Info si sport sans categories */}
            {selectedSport && !sportHasCategories && (
              <View style={s.noCategories}>
                <Info size={16} color={C.textMuted} />
                <Text style={s.noCategoriesText}>
                  {SPORTS.find((s2) => s2.id === selectedSport)?.name ?? selectedSport} {t('onboarding.noWeightCategories')}
                </Text>
              </View>
            )}
          </>
        )}
        </View>
        {/* fin SECTION 4 */}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bouton fixe */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.goldBtn, !canComplete && s.disabledBtn]}
          disabled={!canComplete || isProcessing}
          onPress={() => executeOnce(handleComplete)}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={[s.goldBtnText, !canComplete && s.disabledBtnText]}>{t('onboarding.startAdventure')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // =============================================
  // PAGE 4 - Apple Santé / Health Connect
  // =============================================

  const finishOnboarding = async () => {
    try { introPlayerRef.current?.pause(); } catch {}
    // Marquer l'onboarding comme terminé pour que le reconnect Health Connect
    // fonctionne au prochain démarrage (même si l'utilisateur a passé l'étape)
    await AsyncStorage.setItem('@yoroi_healthkit_asked', 'true').catch(() => {});
    // Nouvel utilisateur : enchaîner sur le tour de découverte (une seule fois)
    const tourDone = await AsyncStorage.getItem('@yoroi_onboarding_tour_done').catch(() => null);
    router.replace((tourDone === 'true' ? '/(tabs)' : '/onboarding-tour') as any);
  };

  const handleHealthConnect = async () => {
    setIsConnectingHealth(true);
    try {
      await healthConnect.initialize();
      const connected = await healthConnect.connect();
      if (connected) {
        await AsyncStorage.setItem('@yoroi_healthkit_asked', 'true');
        // Flag spécifique : l'utilisateur a VRAIMENT connecté HC (utilisé au démarrage sur Android)
        if (Platform.OS === 'android') {
          await AsyncStorage.setItem('@yoroi_healthconnect_connected', 'true').catch(() => {});
        }
        await healthConnect.setupWorkoutObserver().catch(() => {});
        setHealthConnected(true);
        // Lancer l'import complet en arriere-plan sans bloquer la navigation
        healthConnect.importFullHistory().catch(() => {});
        setTimeout(() => finishOnboarding(), 1200);
      } else {
        showPopup(
          t('onboarding.permissionsRequired'),
          Platform.OS === 'android'
            ? t('onboarding.healthPermissionAndroid')
            : t('onboarding.healthPermissionIOS'),
          [{ text: 'OK', style: 'primary' }]
        );
      }
    } catch (e) {
      logger.error('Health connect onboarding error', e);
    } finally {
      setIsConnectingHealth(false);
    }
  };

  const renderPageHealth = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
      {/* Stepper (complet) en haut */}
      <View style={s.stepperFloating}>
        <View style={s.stepper}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.stepDot, s.stepDotDone]} />
          ))}
        </View>
      </View>

      {/* Icone */}
      <View style={[s.healthIconCircle, healthConnected && { backgroundColor: '#D1FAE5' }]}>
        {healthConnected ? (
          <Check size={48} color="#10B981" strokeWidth={3} />
        ) : (
          <Heart size={48} color={C.goldDark} strokeWidth={2} fill={C.goldLight} />
        )}
      </View>

      {/* Titre */}
      <Text style={s.healthTitle}>
        {healthConnected ? t('onboarding.healthConnected') : Platform.OS === 'android' ? t('onboarding.connectHealthConnect') : t('onboarding.connectAppleHealth')}
      </Text>

      {/* Sous-titre */}
      <Text style={s.healthSubtitle}>
        {healthConnected
          ? t('onboarding.healthSyncedDesc')
          : t('onboarding.healthReadDesc')}
      </Text>

      {/* Liste des données */}
      {!healthConnected && (
        <View style={s.healthDataList}>
          {[
            { icon: 'heart-pulse', label: t('onboarding.healthHR') },
            { icon: 'shoe-print', label: t('onboarding.healthSteps') },
            { icon: 'moon-waning-crescent', label: t('onboarding.healthSleep') },
            { icon: 'scale-bathroom', label: t('onboarding.healthWeight') },
            { icon: 'run', label: t('onboarding.healthWorkouts') },
          ].map((item, i) => (
            <View key={i} style={s.healthDataRow}>
              <MaterialCommunityIcons name={item.icon as any} size={18} color={C.goldDark} />
              <Text style={s.healthDataLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bouton principal */}
      {!healthConnected && (
        <TouchableOpacity
          style={[s.goldBtn, { width: '100%', marginTop: 28 }]}
          onPress={handleHealthConnect}
          disabled={isConnectingHealth}
          activeOpacity={0.8}
        >
          {isConnectingHealth ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.goldBtnText}>{Platform.OS === 'android' ? t('onboarding.connectHealthConnectBtn') : t('onboarding.connectAppleHealthBtn')}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Bouton passer */}
      {!healthConnected && (
        <TouchableOpacity
          onPress={finishOnboarding}
          style={{ marginTop: 18, padding: 8 }}
          activeOpacity={0.6}
        >
          <Text style={s.healthSkip}>{t('onboarding.skipForNow')}</Text>
        </TouchableOpacity>
      )}

      {/* Note confidentialite */}
      {!healthConnected && (
        <Text style={s.healthNote}>
          {t('onboarding.healthPrivacyNote')}
        </Text>
      )}
    </View>
  );

  // =============================================
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Bouton fermer en mode preview · positionné sous la barre de statut */}
        {isPreview && (
          <TouchableOpacity
            style={[s.previewCloseBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <View style={s.previewCloseBtnInner}>
              <X size={20} color={C.text} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        )}
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
          {currentPage === 0 && renderPage1()}
          {currentPage === 1 && renderPage2()}
          {currentPage === 2 && renderPage3()}
          {currentPage === 3 && renderPageHealth()}
        </Animated.View>
      </SafeAreaView>
      <PopupComponent />
      <PhotoCropModal
        visible={!!cropModalUri}
        uri={cropModalUri}
        onConfirm={(croppedUri) => { setProfilePhoto(croppedUri); setCropModalUri(null); }}
        onCancel={() => setCropModalUri(null)}
      />
    </View>
  );
}

// =============================================
// STYLES
// =============================================
const createStyles = (width: number) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  previewCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 999,
  },
  previewCloseBtnInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ========= PAGE 4 - Apple Santé =========
  healthIconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: C.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  healthTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  healthSubtitle: {
    fontSize: 14,
    color: C.textSub,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  healthDataList: {
    alignSelf: 'stretch',
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  healthDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthDataLabel: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  healthSkip: {
    fontSize: 13,
    color: C.textMuted,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  healthNote: {
    marginTop: 20,
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },

  // ========= PAGE 1 - Bienvenue =========
  p1Wrap: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 30,
  },
  p1LogoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: C.gold,
    marginBottom: 16,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    backgroundColor: '#000',
  },
  p1Logo: {
    width: 140,
    height: 140,
  },
  p1Brand: {
    fontSize: 48,
    fontWeight: '900',
    color: C.text,
    letterSpacing: 14,
    marginBottom: 6,
  },
  p1GoldBar: {
    width: 50,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginBottom: 8,
  },
  p1Tagline: {
    fontSize: 13,
    color: C.gold,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  p1Title: {
    fontSize: 22,
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0,
    lineHeight: 28,
    width: '100%',
  },
  p1Card: {
    backgroundColor: C.bgCard,
    borderRadius: 20,
    padding: 18,
    width: '100%',
    marginBottom: 24,
  },
  p1Story: {
    fontSize: 15,
    lineHeight: 26,
    color: C.text,
    fontWeight: '400',
    marginBottom: 14,
    textAlign: 'center',
  },
  p1Divider: {
    width: 40,
    height: 2,
    backgroundColor: C.gold,
    alignSelf: 'center',
    marginVertical: 16,
    borderRadius: 1,
  },
  p1Highlight: {
    fontSize: 18,
    lineHeight: 26,
    color: C.gold,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  p1Italic: {
    fontSize: 13,
    lineHeight: 20,
    color: C.textSub,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  p1ItalicBold: {
    fontSize: 13,
    lineHeight: 20,
    color: C.textSub,
    fontStyle: 'italic',
    fontWeight: '700',
  },
  p1FreeNote: {
    fontSize: 13,
    lineHeight: 20,
    color: C.textSub,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  p1Features: {
    width: '100%',
    backgroundColor: C.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 20,
  },
  p1FeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  p1FeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  p1FeatureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  p1AgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  p1Checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: C.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  p1CheckboxActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  p1AgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  p1Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  p1BtnText: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  p1RestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.goldLight,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.gold,
  },
  p1RestoreBtnText: {
    color: C.goldDark,
    fontSize: 15,
    fontWeight: '700',
  },
  p1RestoreHint: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12,
  },
  p1Footer: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: 14,
  },

  // ========= BACK BUTTON =========
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },

  // ========= PAGE 2 - Features =========
  p2Wrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  p2Title: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  p2Sub: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  p2Card: {
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  p2CardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  p2IconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  p2CardText: {
    flex: 1,
  },
  p2CardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  p2CardDesc: {
    fontSize: 13,
    color: C.textSub,
  },
  p2Chevron: {
    marginLeft: 8,
  },
  p2ChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  p2Details: {
    marginTop: 12,
    paddingLeft: 62,
  },
  p2DetailsDivider: {
    height: 1,
    marginBottom: 10,
    marginRight: 8,
    borderRadius: 0.5,
  },
  p2DetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  p2DetailText: {
    fontSize: 13,
    lineHeight: 18,
    color: C.textSub,
    flex: 1,
  },

  // ========= PAGE 3 - Formulaire =========
  formWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Photo
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    padding: 16,
    backgroundColor: C.bgCard,
    borderRadius: 16,
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.bgInput,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoImg: {
    width: 80,
    height: 80,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  photoHint: {
    fontSize: 13,
    color: C.textMuted,
  },
  photoSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoSmallText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },

  // Shared form
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginTop: 16,
    marginBottom: 8,
  },
  labelHint: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: -4,
    marginBottom: 10,
  },
  input: {
    backgroundColor: C.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    color: C.text,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.bgCard,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingVertical: 14,
  },
  chipActive: {
    borderColor: C.gold,
    backgroundColor: C.goldLight,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  chipTextActive: {
    color: C.gold,
  },

  // Date
  dateBtn: {
    backgroundColor: C.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTxt: { fontSize: 15, color: C.text },
  datePlaceholder: { fontSize: 15, color: C.textMuted },
  ageBadge: {
    backgroundColor: C.goldLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ageText: { fontSize: 13, fontWeight: '700', color: C.gold },
  dateOkBtn: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  dateOkText: { color: C.white, fontWeight: '700', fontSize: 15 },

  // Age warning
  ageWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#FF3B3010',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF3B3030',
  },
  ageWarningText: {
    fontSize: 13,
    color: C.danger,
    fontWeight: '600',
    flex: 1,
  },

  // Goal
  goalCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bgCard,
    gap: 6,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },

  // Mode
  modeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bgCard,
    gap: 4,
  },
  modeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  modeDesc: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: 'center',
  },

  // ========= SECTIONS SPORT (accordion) =========
  sectionWrap: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  sectionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionChevron: {},
  sectionChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  sectionContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
    minWidth: (width - 60) / 2,
    flex: 1,
    maxWidth: '100%',
  },
  sportCardText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.text,
    flex: 1,
  },
  sportCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Weight categories
  catRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catCard: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bgCard,
    minWidth: 80,
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  catKg: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },

  // No categories info
  noCategories: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: C.bgCard,
    borderRadius: 10,
    padding: 12,
  },
  noCategoriesText: {
    fontSize: 12,
    color: C.textMuted,
    flex: 1,
  },

  // Buttons
  goldBtn: {
    backgroundColor: C.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  goldBtnText: {
    color: C.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledBtnText: {
    color: C.textMuted,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 12,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // ========= FORM REDESIGN =========
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.bgCard,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperFloating: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    alignItems: 'center',
  },
  stepDot: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
  },
  stepDotDone: {
    backgroundColor: C.gold,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.2,
  },
  inputWrap: {
    position: 'relative',
  },
  inputValid: {
    borderColor: '#30D158',
    backgroundColor: '#F0FDF4',
  },
  validCheck: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 22,
  },
});
