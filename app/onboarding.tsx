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
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Check,
  Info,
} from 'lucide-react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { saveProfile } from '@/lib/database';
import { saveUserSettings } from '@/lib/storage';
import { setUserMode, setUserSport, setUserWeightCategory } from '@/lib/fighterModeService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';
import { validators } from '@/lib/security/validators';
import { logger } from '@/lib/security/logger';
import { getSportIcon, getSportName, getSportColor } from '@/lib/sports';
import { getWeightCategories } from '@/lib/fighterMode';
import type { Sport as FighterSport, UserMode, WeightCategory } from '@/lib/fighterMode';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

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
      'Signes vitaux : frequence cardiaque, sommeil, pas',
      'Analyse detaillee de tes seances',
    ],
  },
  {
    icon: CalendarDays,
    title: 'Planning & Carnet',
    desc: 'Organise tes entrainements',
    color: '#FF9500',
    details: [
      'Calendrier de tes entrainements',
      'Journal de training detaille par seance',
      'Historique complet de toutes tes sessions',
      'Suivi de la charge d\'entrainement',
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
      'Charge d\'entrainement et recuperation',
      'Import/Export CSV de tes donnees',
      'Systeme de gamification et badges',
      'Tutoriels et guides integres',
    ],
  },
  {
    icon: HeartHandshake,
    title: 'Sante Connectee',
    desc: 'Synchronise tes donnees',
    color: '#30D158',
    details: [
      'Integration Apple Sante / Health Connect',
      'Donnees automatiques (FC, sommeil, pas)',
      'Suivi du sommeil detaille',
      'Apple Watch compatible',
    ],
  },
  {
    icon: Shield,
    title: '100% Prive',
    desc: 'Tes donnees restent chez toi',
    color: C.gold,
    details: [
      'Aucun cloud - tout reste sur ton telephone',
      'Aucun tracking ni publicite',
      'Export securise de tes donnees',
      'Pas de compte requis',
    ],
  },
];

// ============================================
// SECTIONS DE SPORTS (avec icones)
// ============================================
interface SportSection {
  title: string;
  icon: string;
  sports: FighterSport[];
}

const SPORT_SECTIONS: SportSection[] = [
  {
    title: 'Sports de Combat',
    icon: 'sword-cross',
    sports: ['jjb', 'mma', 'boxe', 'muay_thai', 'judo', 'karate', 'taekwondo', 'krav_maga'],
  },
  {
    title: 'Fitness & Force',
    icon: 'dumbbell',
    sports: ['musculation', 'crossfit', 'hyrox', 'hiit', 'calisthenics'],
  },
  {
    title: 'Endurance',
    icon: 'run',
    sports: ['running', 'cyclisme', 'natation', 'triathlon', 'trail'],
  },
  {
    title: 'Sports Collectifs',
    icon: 'soccer',
    sports: ['football', 'basket', 'handball', 'rugby', 'volleyball'],
  },
  {
    title: 'Raquettes',
    icon: 'tennis',
    sports: ['tennis', 'padel', 'badminton', 'squash', 'ping_pong'],
  },
  {
    title: 'Bien-etre',
    icon: 'yoga',
    sports: ['yoga', 'pilates', 'danse'],
  },
  {
    title: 'Glisse & Plein Air',
    icon: 'ski',
    sports: ['surf', 'ski', 'snowboard', 'skate', 'escalade'],
  },
  {
    title: 'Autres',
    icon: 'trophy',
    sports: ['golf', 'equitation', 'randonnee', 'marche_nordique', 'autre'],
  },
];

export default function OnboardingScreen() {
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay: 1000 });

  // Musique d'ambiance
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
        if (mounted) { musicRef.current = sound; } else { await sound.unloadAsync(); }
      } catch (error) { logger.error('Onboarding music failed', error); }
    };
    startMusic();
    return () => {
      mounted = false;
      musicRef.current?.stopAsync().then(() => musicRef.current?.unloadAsync()).catch(() => {});
    };
  }, []);

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
  const [selectedSport, setSelectedSport] = useState<FighterSport | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Sport sections expanded
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  const weightCategories: WeightCategory[] = selectedSport ? getWeightCategories(selectedSport) : [];
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

  const canComplete = (): boolean => {
    if (!userName.trim() || userName.trim().length < 2) return false;
    if (!gender) return false;
    if (!heightCm || !validators.height(parseFloat(heightCm)).valid) return false;
    if (!targetWeight || !validators.weight(parseFloat(targetWeight)).valid) return false;
    if (!birthDate) return false;
    if (calculateAge(birthDate) < 13) return false;
    if (!goal) return false;
    if (!mode) return false;
    if (mode === 'competiteur' && !selectedSport) return false;
    return true;
  };

  const pickFromGallery = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showPopup('Permission requise', 'Autorise l\'acces a ta galerie.'); return; }
    const result = await launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setProfilePhoto(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') { showPopup('Permission requise', 'Autorise l\'acces a ta camera.'); return; }
    const result = await launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setProfilePhoto(result.assets[0].uri);
  };

  const handleDateChange = (_: any, d?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (d) {
      const age = calculateAge(d);
      if (age < 13) {
        showPopup(
          'Age minimum requis',
          'Tu dois avoir au moins 13 ans pour utiliser YOROI. Cette application n\'est pas destinee aux enfants de moins de 13 ans.'
        );
        setBirthDate(null);
        return;
      }
      setBirthDate(d);
    }
  };

  const toggleSportSection = (index: number) => {
    setExpandedSections((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  const handleComplete = async () => {
    const usernameCheck = validators.username(userName.trim());
    if (!usernameCheck.valid) { showPopup('Nom invalide', usernameCheck.error || 'Verifie ton nom.'); return; }
    const heightCheck = validators.height(parseFloat(heightCm));
    if (!heightCheck.valid) { showPopup('Taille invalide', heightCheck.error || 'Entre 100 et 250 cm.'); return; }
    const weightCheck = validators.weight(parseFloat(targetWeight));
    if (!weightCheck.valid) { showPopup('Poids invalide', weightCheck.error || 'Entre 30 et 250 kg.'); return; }
    if (!birthDate || calculateAge(birthDate) < 13) {
      showPopup('Age minimum requis', 'Tu dois avoir au moins 13 ans pour utiliser YOROI.');
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
      if (mode === 'competiteur' && selectedSport) await setUserSport(selectedSport);
      if (selectedCategory) await setUserWeightCategory(selectedCategory);
      await AsyncStorage.setItem(LEGAL_ACCEPTED_KEY, 'true');
      await AsyncStorage.setItem('yoroi_onboarding_done', 'true');
      logger.info('Onboarding completed', { step: 'all' });
      if (musicRef.current) {
        await musicRef.current.stopAsync().catch(() => {});
        await musicRef.current.unloadAsync().catch(() => {});
        musicRef.current = null;
      }
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Onboarding save failed', error);
      showPopup('Erreur', 'Une erreur est survenue. Reessaie.');
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
      <Text style={s.p1Tagline}>Forge ton armure. Écris ton histoire.</Text>

      {/* Titre principal */}
      <Text style={s.p1Title} numberOfLines={1} adjustsFontSizeToFit>Bienvenue dans la Famille Yoroi</Text>

      {/* Histoire */}
      <View style={s.p1Card}>
        <Text style={s.p1Story}>
          J'ai créé YOROI seul, par passion.
        </Text>
        <Text style={s.p1Story}>
          Un jour, je ne me suis plus reconnu devant le miroir. J'avais énormément pris de poids. J'ai cherché une application complète pour me reprendre en main, rien ne me convenait. Alors je l'ai construite moi-même.
        </Text>
        <Text style={s.p1Story}>
          Des amis, des inconnus sur des forums, des gens comme toi m'ont suggéré des fonctionnalités. Je les ai toutes intégrées. Aujourd'hui, cette application est autant la tienne que la mienne.
        </Text>
        <View style={s.p1Divider} />
        <Text style={s.p1Highlight}>Une application entre toi et moi.</Text>
        <Text style={s.p1Story}>
          Pas de société derrière. Pas de publicité, pas de compte requis. Juste un passionné qui se bat pour aller mieux, un peu comme toi peut-être. Le samouraï n'abandonne jamais, quoi qu'il arrive.
        </Text>
        <Text style={s.p1Italic}>
          <Text style={s.p1ItalicBold}>Ta confiance et tes retours comptent plus que tout.</Text>
          {'\n'}<Text style={s.p1ItalicBold}>Merci d'être là.</Text>
        </Text>
        <View style={s.p1Divider} />
        <Text style={s.p1FreeNote}>
          YOROI est aujourd'hui entièrement gratuit. Je la construis seul, sans revenu. Si un jour elle te devient vraiment utile, un petit abonnement m'aidera à continuer à la faire grandir pour toi.
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
        <Text style={s.p1AgeText}>Je confirme avoir au moins 13 ans</Text>
      </TouchableOpacity>

      {/* Bouton continuer */}
      <TouchableOpacity
        style={[s.p1Btn, !ageConfirmed && s.disabledBtn]}
        onPress={() => goToPage(1)}
        activeOpacity={0.8}
        disabled={!ageConfirmed}
      >
        <Text style={[s.p1BtnText, !ageConfirmed && s.disabledBtnText]}>Rejoindre l'aventure</Text>
        <ChevronRight size={20} color={ageConfirmed ? C.white : C.textMuted} />
      </TouchableOpacity>

      <Text style={s.p1Footer}>
        En continuant, tu acceptes nos conditions d'utilisation
      </Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  // =============================================
  // PAGE 2 - Features (cliquables avec details)
  // =============================================
  const renderPage2 = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.p2Wrap} showsVerticalScrollIndicator={false}>
      {/* Bouton retour */}
      <TouchableOpacity style={s.backBtn} onPress={() => goToPage(0)} activeOpacity={0.7}>
        <ChevronLeft size={22} color={C.text} />
        <Text style={s.backBtnText}>Retour</Text>
      </TouchableOpacity>

      <Text style={s.p2Title}>Tout ce dont tu as besoin</Text>
      <Text style={s.p2Sub}>Appuie sur un module pour en savoir plus</Text>

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
        <Text style={s.goldBtnText}>Configurer mon profil</Text>
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
      {/* Bouton retour */}
      <TouchableOpacity style={s.backBtn} onPress={() => goToPage(1)} activeOpacity={0.7}>
        <ChevronLeft size={22} color={C.text} />
        <Text style={s.backBtnText}>Retour</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.formWrap}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo profil */}
        <View style={s.photoRow}>
          <TouchableOpacity style={s.photoCircle} onPress={pickFromGallery} activeOpacity={0.8}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={s.photoImg} />
            ) : (
              <MaterialCommunityIcons name="camera-plus-outline" size={32} color={C.textMuted} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.photoLabel}>Photo de profil</Text>
            <Text style={s.photoHint}>Optionnel - appuie sur le cercle</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={s.photoSmallBtn} onPress={pickFromGallery}>
                <ImageIcon size={14} color={C.text} />
                <Text style={s.photoSmallText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.photoSmallBtn} onPress={takePhoto}>
                <Camera size={14} color={C.text} />
                <Text style={s.photoSmallText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Nom */}
        <Text style={s.label}>Prenom ou pseudo</Text>
        <TextInput
          style={s.input}
          placeholder="Ex: Heny"
          placeholderTextColor={C.textMuted}
          value={userName}
          onChangeText={setUserName}
          maxLength={50}
          autoCapitalize="words"
        />

        {/* Genre */}
        <Text style={s.label}>Genre</Text>
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
                {g === 'homme' ? 'Homme' : 'Femme'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Taille + Poids */}
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Taille (cm)</Text>
            <TextInput style={s.input} placeholder="175" placeholderTextColor={C.textMuted} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" maxLength={5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Poids objectif (kg)</Text>
            <TextInput style={s.input} placeholder="80" placeholderTextColor={C.textMuted} value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" maxLength={5} />
          </View>
        </View>

        {/* Date de naissance */}
        <Text style={s.label}>Date de naissance</Text>
        <View style={s.row}>
          <TouchableOpacity style={[s.dateBtn, { flex: 1 }]} onPress={() => setShowDatePicker(!showDatePicker)}>
            <Text style={birthDate ? s.dateTxt : s.datePlaceholder}>
              {birthDate ? format(birthDate, 'dd MMMM yyyy', { locale: fr }) : 'Selectionner'}
            </Text>
            {birthDate && (
              <View style={s.ageBadge}>
                <Text style={s.ageText}>{calculateAge(birthDate)} ans</Text>
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

        {/* Warning age < 13 */}
        {birthDate && calculateAge(birthDate) < 13 && (
          <View style={s.ageWarning}>
            <Info size={16} color={C.danger} />
            <Text style={s.ageWarningText}>Tu dois avoir au moins 13 ans pour utiliser YOROI.</Text>
          </View>
        )}

        {/* Objectif */}
        <Text style={s.label}>Objectif</Text>
        <View style={s.row}>
          {([
            { id: 'lose' as const, label: 'Perdre', Icon: TrendingDown, color: '#30D158' },
            { id: 'maintain' as const, label: 'Maintenir', Icon: Minus, color: C.gold },
            { id: 'gain' as const, label: 'Prendre', Icon: TrendingUp, color: '#FF3B30' },
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

        {/* Mode */}
        <Text style={s.label}>Mode</Text>
        <View style={s.row}>
          {([
            { id: 'competiteur' as UserMode, label: 'Competiteur', desc: 'Competitions & categories', Icon: Swords, color: '#FF3B30' },
            { id: 'loisir' as UserMode, label: 'Loisir', desc: 'Forme & bien-etre', Icon: Dumbbell, color: '#0A84FF' },
          ]).map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[s.modeCard, mode === m.id && { borderColor: m.color, backgroundColor: m.color + '12' }]}
              onPress={() => { setMode(m.id); if (m.id !== mode) { setSelectedSport(null); setSelectedCategory(null); setExpandedSections([]); } }}
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
            <Text style={s.label}>Ton sport principal</Text>
            <Text style={s.labelHint}>Selectionne une categorie puis ton sport</Text>

            {SPORT_SECTIONS.map((section, sIndex) => {
              const isExpanded = expandedSections.includes(sIndex);
              const hasSelectedSport = section.sports.includes(selectedSport as FighterSport);

              return (
                <View key={sIndex} style={s.sectionWrap}>
                  {/* Header de section */}
                  <TouchableOpacity
                    style={[
                      s.sectionHeader,
                      hasSelectedSport && { borderColor: C.gold, borderWidth: 1.5, backgroundColor: C.goldLight },
                    ]}
                    onPress={() => toggleSportSection(sIndex)}
                    activeOpacity={0.7}
                  >
                    <View style={s.sectionHeaderLeft}>
                      <MaterialCommunityIcons
                        name={section.icon as any}
                        size={20}
                        color={hasSelectedSport ? C.gold : C.textSub}
                      />
                      <Text style={[s.sectionTitle, hasSelectedSport && { color: C.gold }]}>
                        {section.title}
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
                      {section.sports.map((sportId) => {
                        const sel = selectedSport === sportId;
                        const sc = getSportColor(sportId);
                        return (
                          <TouchableOpacity
                            key={sportId}
                            style={[
                              s.sportCard,
                              sel && { borderColor: sc, backgroundColor: sc + '15' },
                            ]}
                            onPress={() => { setSelectedSport(sportId); setSelectedCategory(null); }}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={getSportIcon(sportId) as any}
                              size={22}
                              color={sel ? sc : C.textSub}
                            />
                            <Text style={[s.sportCardText, sel && { color: sc, fontWeight: '700' }]}>
                              {getSportName(sportId)}
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
                  Categorie de poids - {getSportName(selectedSport)}
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
                  {getSportName(selectedSport)} n'a pas de categories de poids officielles
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bouton fixe */}
      <View style={s.bottomBar}>
        <TouchableOpacity
          style={[s.goldBtn, !canComplete() && s.disabledBtn]}
          disabled={!canComplete() || isProcessing}
          onPress={() => executeOnce(handleComplete)}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={[s.goldBtnText, !canComplete() && s.disabledBtnText]}>Commencer l'aventure</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // =============================================
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
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
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

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
});
