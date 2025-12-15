import React, { useState, useCallback } from 'react';
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
  Platform,
  Switch,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import {
  User,
  Target,
  Calendar,
  Scale,
  TrendingDown,
  Palette,
  Trash2,
  ChevronRight,
  X,
  Check,
  Award,
  CloudUpload,
  CloudDownload,
  ShieldCheck,
  BookOpen,
  Users,
  Lightbulb,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useFocusEffect, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import { BadgesScreen } from '@/components/BadgesScreen'; 
import { ReminderSettingsComponent } from '@/components/ReminderSettings';
import { HealthSyncSettings } from '@/components/HealthSyncSettings';
import { PartnersScreen } from '@/components/PartnersScreen';
import * as ImagePicker from 'expo-image-picker';
import { 
  exportData, 
  importData, 
  resetAllData, 
  getUserSettings, 
  saveUserSettings,
  getUserClubs,
  addUserClub,
  updateUserClub,
  deleteUserClub,
  getUserGear,
  addUserGear,
  updateUserGear,
  deleteUserGear,
} from '@/lib/storage';
import type { UserClub, UserGear } from '@/lib/storage';
import { exportDataToJSON, exportDataToCSV, shareProgress } from '@/lib/exportService';
import { generateMockMeasurements } from '@/lib/generateMockData';
import { insertDemoData, clearAllData } from '@/lib/demoData';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';

// Constants for non-theme values
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 };
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
const FONT_SIZE = { xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, display: 24 };

interface SettingsScreenProps {
  onClose?: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps = { onClose: undefined }) {
  const { themeMode, setThemeMode, colorTheme, setColorTheme, colorPalettes, colors, isDark } = useTheme();
  const systemColorScheme = useColorScheme();

  // Use colors from theme context directly
  const backgroundColor = colors.background;
  const textColor = colors.textPrimary;
  const cardBackground = colors.card;
  
  const [height, setHeight] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');
  const appTheme = themeMode; // Utiliser le thème du contexte

  // Modals
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [colorThemeModalVisible, setColorThemeModalVisible] = useState(false);
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [measurementUnitModalVisible, setMeasurementUnitModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);
  const [partnersModalVisible, setPartnersModalVisible] = useState(false);
  const [customClubLogos, setCustomClubLogos] = useState<{ [key: string]: string }>({});
  const [avatarGender, setAvatarGender] = useState<'male' | 'female'>('male');
  const [clubsModalVisible, setClubsModalVisible] = useState(false);
  const [userClan, setUserClan] = useState<'GB' | 'MFC' | 'Ronin' | null>(null);
  const [clanModalVisible, setClanModalVisible] = useState(false);
  const [userClubs, setUserClubs] = useState<UserClub[]>([]);
  const [editingClub, setEditingClub] = useState<UserClub | null>(null);
  const [newClubName, setNewClubName] = useState('');
  const [newClubType, setNewClubType] = useState<'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other'>('basic_fit');
  const [newClubLogo, setNewClubLogo] = useState<string | null>(null);
  const [gearModalVisible, setGearModalVisible] = useState(false);
  const [userGear, setUserGear] = useState<UserGear[]>([]);
  const [editingGear, setEditingGear] = useState<UserGear | null>(null);
  const [newGearName, setNewGearName] = useState('');
  const [newGearBrand, setNewGearBrand] = useState('');
  const [newGearType, setNewGearType] = useState<'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre'>('kimono');
  const [newGearPhoto, setNewGearPhoto] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await getUserSettings();
      setHeight(settings.height?.toString() || '');
      setWeightGoal(settings.weight_goal?.toString() || '');
      setTargetDate(settings.target_date || '');
      setWeightUnit(settings.weight_unit || 'kg');
      setMeasurementUnit(settings.measurement_unit || 'cm');
      setUserClan(settings.userClan || null);
      // Charger les logos personnalisés
      if (settings.custom_club_logos) {
        setCustomClubLogos(settings.custom_club_logos);
      }
      // Charger le genre de l'avatar
      if ((settings as any).gender) {
        setAvatarGender((settings as any).gender);
      }
      // Charger les clubs utilisateur
      const clubs = await getUserClubs();
      setUserClubs(clubs);
      // Le thème est géré par le contexte, pas besoin de le mettre à jour ici
    } catch (e) {
      console.log("Erreur chargement settings", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [fetchSettings])
  );

  const removeClubLogo = async (clubKey: string) => {
    Alert.alert(
      'Supprimer le logo',
      `Voulez-vous supprimer ce logo ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const newLogos = { ...customClubLogos };
            delete newLogos[clubKey];
            setCustomClubLogos(newLogos);
            await saveUserSettings({ custom_club_logos: newLogos });
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    const heightNum = parseFloat(height);
    const goalNum = parseFloat(weightGoal);

    await saveUserSettings({
      height: heightNum,
      weight_goal: goalNum,
      target_date: targetDate,
      weight_unit: weightUnit,
      measurement_unit: measurementUnit,
      theme: appTheme,
    });
  };

  const handleExport = async () => {
    const success = await exportData();
    if (success && Platform.OS === 'web') {
        Alert.alert('Succès', 'Fichier généré.');
    }
    // Sur mobile, le share sheet s'ouvre tout seul
  };

  const handleImport = async () => {
    Alert.alert(
      'Restaurer une sauvegarde',
      'Attention : Ceci va écraser TOUTES vos données actuelles. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            const success = await importData();
            if (success) {
              await fetchSettings();
              router.replace('/(tabs)');
              Alert.alert("Succès", "Données restaurées.");
            }
          },
        },
      ]
    );
  };


  const handleExportJSON = async () => {
    await exportDataToJSON();
  };

  const handleExportCSV = async () => {
    await exportDataToCSV();
  };

  const handleShareProgress = async () => {
    await shareProgress();
  };

  const handleResetData = async () => {
    try {
      const success = await resetAllData();
      setResetModalVisible(false);
      if (success) {
        Alert.alert('Réinitialisé', 'Toutes les données ont été effacées.');
        fetchSettings();
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer.');
    }
  };

  const handleGenerateMockData = async () => {
    Alert.alert(
      'Générer des données de démo',
      'Cela va créer 6 mois de données fictives pour visualiser une transformation réaliste : 99.9kg → 86kg avec :\n\n• ~144 pesées\n• 26 mensurations\n• ~104 entraînements\n• 4 clubs de sport\n• Planning hebdomadaire\n\nLes données existantes seront EFFACÉES.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Générer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Effacer les données existantes
              await clearAllData();
              // Inserer les nouvelles donnees demo
              await insertDemoData();
              Alert.alert('✅ Données de démo créées !', 'Profil Houari avec 6 mois de transformation : 99.9kg → 86kg');
              fetchSettings();
              router.replace('/(tabs)');
            } catch (error) {
              console.error('Erreur génération données:', error);
              Alert.alert('Erreur', 'Impossible de générer les données.');
            }
          },
        },
      ]
    );
  };

  // Helper pour les lignes de menu
  const MenuRow = ({ icon: Icon, color, label, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? '#3A1F1F' : `${color}20` }]}>
          <Icon size={20} color={isDestructive ? '#D32F2F' : color} strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[styles.rowLabel, { color: textColor }, isDestructive && { color: '#D32F2F' }]}>{label}</Text>
          {value && <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>}
        </View>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper noPadding>
      <Header title="Reglages" showBack onBack={onClose} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

        {/* PROFIL */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PROFIL</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Taille (cm)</Text>
                <TextInput 
                    style={[styles.input, { color: textColor, backgroundColor: colors.cardHover, borderColor: colors.border }]} 
                    value={height} 
                    onChangeText={setHeight} 
                    placeholder="175" 
                    keyboardType="numeric"
                    onBlur={handleSaveProfile}
                />
            </View>
            <View style={styles.inputRow}>
                <Text style={[styles.inputLabel, { color: textColor }]}>Poids Cible (kg)</Text>
                <TextInput 
                    style={[styles.input, { color: textColor, backgroundColor: colors.cardHover, borderColor: colors.border }]} 
                    value={weightGoal} 
                    onChangeText={setWeightGoal} 
                    placeholder="75" 
                    keyboardType="numeric"
                    onBlur={handleSaveProfile}
                />
            </View>
            <MenuRow
                icon={User}
                color={colors.gold}
                label="Avatar"
                value={avatarGender === 'male' ? 'Homme/Samouraï' : 'Femme/Onna-musha'}
                onPress={() => {
                  Alert.alert(
                    'Genre de l\'Avatar',
                    'Choisissez le genre de votre avatar',
                    [
                      { text: 'Homme/Samouraï', onPress: async () => {
                        await saveUserSettings({ gender: 'male' });
                        fetchSettings();
                      }},
                      { text: 'Femme/Onna-musha', onPress: async () => {
                        await saveUserSettings({ gender: 'female' });
                        fetchSettings();
                      }},
                      { text: 'Annuler', style: 'cancel' },
                    ]
                  );
                }}
            />
        </View>

        {/* GAMIFICATION */}
        <Text style={styles.sectionHeader}>GAMIFICATION</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow 
                icon={Award} 
                color="#4CAF50" 
                label="Mes badges" 
                onPress={() => setBadgesModalVisible(true)} 
            />
        </View>

        {/* MON CLAN / DOJO */}
        <Text style={styles.sectionHeader}>MON CLAN / DOJO</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow
                icon={Users}
                color="#007AFF"
                label="Mon Clan"
                value={userClan === 'GB' ? 'Gracie Barra' : userClan === 'MFC' ? 'Marseille Fight Club' : userClan === 'Ronin' ? 'Ronin' : 'Non sélectionné'}
                onPress={() => setClanModalVisible(true)}
            />
            <MenuRow
                icon={Award}
                color="#F59E0B"
                label="Mes Équipements"
                value={`${userGear.length} équipement${userGear.length > 1 ? 's' : ''}`}
                onPress={() => setGearModalVisible(true)}
            />
            <TouchableOpacity
                style={[styles.teamPhotoButton, { backgroundColor: colors.cardHover }]}
                onPress={async () => {
                    try {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permission requise', 'Nous avons besoin de l\'accès à vos photos pour importer votre photo d\'équipe.');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 0.8,
                        });
                        if (!result.canceled && result.assets[0]) {
                            Alert.alert('Photo importée', 'Votre photo d\'équipe a été importée avec succès !');
                        }
                    } catch (error) {
                        console.error('Erreur import photo:', error);
                        Alert.alert('Erreur', 'Impossible d\'importer la photo.');
                    }
                }}
                activeOpacity={0.7}
            >
                <CloudUpload size={20} color={colors.gold} strokeWidth={2.5} />
                <Text style={[styles.teamPhotoButtonText, { color: textColor }]}>Importer ma photo d'équipe</Text>
            </TouchableOpacity>
        </View>

        {/* COMMUNAUTÉ */}
        <Text style={styles.sectionHeader}>COMMUNAUTÉ</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow
                icon={Users}
                color="#9B59B6"
                label="Club & Coachs"
                value="Coachs et structures recommandés"
                onPress={() => setPartnersModalVisible(true)}
            />
        </View>

        {/* MES CLUBS / Q.G. */}
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>MES CLUBS / Q.G.</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow
                icon={Award}
                color="#007AFF"
                label="Mes Clubs"
                value={`${userClubs.length} club${userClubs.length > 1 ? 's' : ''}`}
                onPress={() => setClubsModalVisible(true)}
            />
            {/* Aperçu des clubs */}
            {userClubs.length > 0 && (
                <View style={styles.clubsPreview}>
                    {userClubs.slice(0, 3).map((club) => (
                        <View key={club.id} style={styles.clubPreviewItem}>
                            {club.logoUri ? (
                                <Image source={{ uri: club.logoUri }} style={styles.clubPreviewLogo} />
                            ) : (
                                <View style={[styles.clubPreviewLogo, styles.clubPreviewPlaceholder]}>
                                    <Award size={20} color="#9CA3AF" />
                                </View>
                            )}
                            <Text style={[styles.clubPreviewName, { color: textColor }]} numberOfLines={1}>
                                {club.name}
                            </Text>
                        </View>
                    ))}
                    {userClubs.length > 3 && (
                        <Text style={[styles.clubPreviewMore, { color: colors.textSecondary }]}>
                          +{userClubs.length - 3}
                        </Text>
                    )}
                </View>
            )}
        </View>

        {/* AFFICHAGE */}
        <Text style={styles.sectionHeader}>AFFICHAGE</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow
                icon={Palette}
                color={colors.gold}
                label="Thème"
                value={appTheme === 'light' ? 'Clair' : appTheme === 'dark' ? 'Sombre' : 'Système'}
                onPress={() => setThemeModalVisible(true)}
            />
            <MenuRow
                icon={Sparkles}
                color={colorPalettes[colorTheme].primary}
                label="Couleur d'accent"
                value={`${colorPalettes[colorTheme].emoji} ${colorPalettes[colorTheme].name}`}
                onPress={() => setColorThemeModalVisible(true)}
            />
            <MenuRow 
                icon={Scale} 
                color={colors.gold} 
                label="Unité de poids" 
                value={weightUnit === 'kg' ? 'Kilogrammes' : 'Livres'}
                onPress={() => setWeightUnitModalVisible(true)}
            />
            <MenuRow 
                icon={TrendingDown} 
                color={colors.gold} 
                label="Unité de mesure" 
                value={measurementUnit === 'cm' ? 'Centimètres' : 'Pouces'}
                onPress={() => setMeasurementUnitModalVisible(true)}
            />
        </View>

        {/* RAPPELS & NOTIFICATIONS */}
        <Text style={styles.sectionHeader}>RAPPELS & NOTIFICATIONS</Text>
        <ReminderSettingsComponent />

        {/* APPLE HEALTH */}
        <Text style={styles.sectionHeader}>APPLE HEALTH</Text>
        <HealthSyncSettings />


        {/* EXPORT & PARTAGE */}
        <Text style={styles.sectionHeader}>EXPORT & PARTAGE</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow 
                icon={CloudUpload} 
                color="#8ecfe4" 
                label="Exporter en JSON" 
                value="Backup complet de vos données" 
                onPress={handleExportJSON} 
            />
            <MenuRow 
                icon={CloudUpload} 
                color={colors.gold} 
                label="Exporter en CSV" 
                value="Format tableur (Excel, Numbers)" 
                onPress={handleExportCSV} 
            />
            <MenuRow 
                icon={Sparkles} 
                color={colors.success} 
                label="Partager ma progression" 
                value="Partager mon parcours sur les réseaux" 
                onPress={handleShareProgress} 
            />
        </View>
        {/* SÉCURITÉ DES DONNÉES */}
        <Text style={styles.sectionHeader}>SÉCURITÉ DES DONNÉES</Text>
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
            <MenuRow 
                icon={CloudUpload} 
                color={colors.gold} 
                label="Sauvegarder mes données" 
                value="Créer un fichier de backup JSON" 
                onPress={handleExport} 
            />
            <MenuRow 
                icon={CloudDownload} 
                color={colors.gold} 
                label="Restaurer une sauvegarde" 
                value="Importer un fichier de backup JSON" 
                onPress={handleImport} 
            />
            <MenuRow 
                icon={Sparkles} 
                color="#F59E0B" 
                label="Générer données de démo (6 mois)" 
                value="180 jours : 100kg → 86kg" 
                onPress={handleGenerateMockData} 
            />
            <MenuRow 
                icon={Trash2} 
                color="#D32F2F" 
                label="Réinitialiser toutes les données" 
                value="Supprimer définitivement tout" 
                onPress={() => setResetModalVisible(true)} 
                isDestructive={true}
            />
        </View>

        <View style={styles.offlineNotice}>
            <Text style={styles.offlineTitle}><ShieldCheck size={18} color="#4CAF50" /> Mode Confidentialité Totale</Text>
            <Text style={styles.offlineDescription}>
              Toutes vos données restent sur votre téléphone. Aucune information n'est envoyée vers un serveur externe. L'application fonctionne à 100% en mode avion.
            </Text>
          </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Version 1.0.0</Text>
          <Text style={styles.footerText}>Yoroi - Health Tracker Pro</Text>
        </View>
      </ScrollView>

      {/* Modal Thème */}
      <Modal visible={themeModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setThemeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir le thème</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, appTheme === 'light' && styles.optionButtonActive]}
              onPress={() => {
                setThemeMode('light');
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, appTheme === 'light' && styles.optionTextActive]}>Clair</Text>
              {appTheme === 'light' && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, appTheme === 'dark' && styles.optionButtonActive]}
              onPress={() => {
                setThemeMode('dark');
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, appTheme === 'dark' && styles.optionTextActive]}>🌙 Sombre</Text>
              {appTheme === 'dark' && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, appTheme === 'system' && styles.optionButtonActive]}
              onPress={() => {
                setThemeMode('system');
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, appTheme === 'system' && styles.optionTextActive]}>Automatique (Système)</Text>
              {appTheme === 'system' && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>

          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Couleur d'accent */}
      <Modal visible={colorThemeModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setColorThemeModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Couleur d'accent</Text>
              <TouchableOpacity onPress={() => setColorThemeModalVisible(false)}>
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {Object.values(colorPalettes).map((palette) => (
              <TouchableOpacity
                key={palette.id}
                style={[
                  styles.colorOptionButton,
                  colorTheme === palette.id && styles.colorOptionButtonActive,
                  { borderColor: colorTheme === palette.id ? palette.primary : 'transparent' },
                ]}
                onPress={() => {
                  setColorTheme(palette.id);
                  setColorThemeModalVisible(false);
                }}
              >
                <View style={[styles.colorPreview, { backgroundColor: palette.primary }]} />
                <View style={styles.colorOptionInfo}>
                  <Text style={[styles.colorOptionName, colorTheme === palette.id && { color: palette.primary }]}>
                    {palette.emoji} {palette.name}
                  </Text>
                </View>
                {colorTheme === palette.id && <Check size={20} color={palette.primary} strokeWidth={2.5} />}
              </TouchableOpacity>
            ))}

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
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, weightUnit === 'kg' && styles.optionButtonActive]}
              onPress={() => {
                setWeightUnit('kg');
                saveUserSettings({ weight_unit: 'kg' });
                setWeightUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, weightUnit === 'kg' && styles.optionTextActive]}>Kilogrammes (kg)</Text>
              {weightUnit === 'kg' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, weightUnit === 'lbs' && styles.optionButtonActive]}
              onPress={() => {
                setWeightUnit('lbs');
                saveUserSettings({ weight_unit: 'lbs' });
                setWeightUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, weightUnit === 'lbs' && styles.optionTextActive]}>Livres (lbs)</Text>
              {weightUnit === 'lbs' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
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
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, measurementUnit === 'cm' && styles.optionButtonActive]}
              onPress={() => {
                setMeasurementUnit('cm');
                saveUserSettings({ measurement_unit: 'cm' });
                setMeasurementUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, measurementUnit === 'cm' && styles.optionTextActive]}>Centimètres (cm)</Text>
              {measurementUnit === 'cm' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, measurementUnit === 'in' && styles.optionButtonActive]}
              onPress={() => {
                setMeasurementUnit('in');
                saveUserSettings({ measurement_unit: 'in' });
                setMeasurementUnitModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, measurementUnit === 'in' && styles.optionTextActive]}>Pouces (inches)</Text>
              {measurementUnit === 'in' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Sélection Clan */}
      <Modal visible={clanModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setClanModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir ton Clan</Text>
              <TouchableOpacity onPress={() => setClanModalVisible(false)}>
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, userClan === 'GB' && styles.optionButtonActive]}
              onPress={async () => {
                setUserClan('GB');
                await saveUserSettings({ userClan: 'GB' });
                setClanModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, userClan === 'GB' && styles.optionTextActive]}>Gracie Barra</Text>
              {userClan === 'GB' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, userClan === 'MFC' && styles.optionButtonActive]}
              onPress={async () => {
                setUserClan('MFC');
                await saveUserSettings({ userClan: 'MFC' });
                setClanModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, userClan === 'MFC' && styles.optionTextActive]}>Marseille Fight Club</Text>
              {userClan === 'MFC' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, userClan === 'Ronin' && styles.optionButtonActive]}
              onPress={async () => {
                setUserClan('Ronin');
                await saveUserSettings({ userClan: 'Ronin' });
                setClanModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, userClan === 'Ronin' && styles.optionTextActive]}>Ronin</Text>
              {userClan === 'Ronin' && <Check size={20} color={colors.gold} strokeWidth={2.5} />}
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
                <X size={24} color="#636E72" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Cette action supprimera définitivement toutes vos données (poids, mensurations, entraînements, photos, badges, paramètres). Cette action est irréversible.
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

      {/* Modal Badges */}
      <BadgesScreen
        visible={badgesModalVisible}
        onClose={() => setBadgesModalVisible(false)}
      />


      {/* Modal Partenaires */}
      <PartnersScreen
        visible={partnersModalVisible}
        onClose={() => setPartnersModalVisible(false)}
      />

      {/* Modal Clubs Management */}
      <ClubsManagementModal
        visible={clubsModalVisible}
        onClose={() => {
          setClubsModalVisible(false);
          setEditingClub(null);
        }}
        userClubs={userClubs}
        onClubsChange={async (clubs) => {
          setUserClubs(clubs);
          await fetchSettings();
        }}
        editingClub={editingClub}
        setEditingClub={setEditingClub}
        newClubName={newClubName}
        setNewClubName={setNewClubName}
        newClubType={newClubType}
        setNewClubType={setNewClubType}
        newClubLogo={newClubLogo}
        setNewClubLogo={setNewClubLogo}
      />

      {/* Modal Gestion Équipements */}
      <GearManagementModal
        visible={gearModalVisible}
        onClose={() => {
          setGearModalVisible(false);
          setEditingGear(null);
          setNewGearName('');
          setNewGearBrand('');
          setNewGearType('kimono');
          setNewGearPhoto(null);
        }}
        userGear={userGear}
        onGearChange={async (gear) => {
          setUserGear(gear);
          await fetchSettings();
        }}
        editingGear={editingGear}
        setEditingGear={setEditingGear}
        newGearName={newGearName}
        setNewGearName={setNewGearName}
        newGearBrand={newGearBrand}
        setNewGearBrand={setNewGearBrand}
        newGearType={newGearType}
        setNewGearType={setNewGearType}
        newGearPhoto={newGearPhoto}
        setNewGearPhoto={setNewGearPhoto}
      />
    </ScreenWrapper>
  );
}

// ============================================
// 🎒 MODAL GEAR MANAGEMENT
// ============================================
function GearManagementModal({ 
  visible, 
  onClose, 
  userGear,
  onGearChange,
  editingGear,
  setEditingGear,
  newGearName,
  setNewGearName,
  newGearBrand,
  setNewGearBrand,
  newGearType,
  setNewGearType,
  newGearPhoto,
  setNewGearPhoto,
}: { 
  visible: boolean; 
  onClose: () => void;
  userGear: UserGear[];
  onGearChange: (gear: UserGear[]) => Promise<void>;
  editingGear: UserGear | null;
  setEditingGear: (gear: UserGear | null) => void;
  newGearName: string;
  setNewGearName: (name: string) => void;
  newGearBrand: string;
  setNewGearBrand: (brand: string) => void;
  newGearType: 'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre';
  setNewGearType: (type: 'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre') => void;
  newGearPhoto: string | null;
  setNewGearPhoto: (photo: string | null) => void;
}) {
  const { colors, isDark } = useTheme();
  const textColor = colors.textPrimary;
  const cardBackground = colors.card;

  const GEAR_TYPES = [
    { key: 'kimono', label: 'Kimono', icon: '🥋' },
    { key: 'chaussure', label: 'Chaussures', icon: '👟' },
    { key: 'gants', label: 'Gants', icon: '🥊' },
    { key: 'protections', label: 'Protections', icon: '🛡️' },
    { key: 'autre', label: 'Autre', icon: '🎒' },
  ] as const;

  const pickGearPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewGearPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection photo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la photo.');
    }
  };

  const handleSaveGear = async () => {
    if (!newGearName.trim()) {
      Alert.alert('Nom requis', 'Veuillez entrer un nom pour votre équipement.');
      return;
    }
    if (!newGearBrand.trim()) {
      Alert.alert('Marque requise', 'Veuillez entrer une marque/modèle.');
      return;
    }

    try {
      if (editingGear) {
        // Mettre à jour
        await updateUserGear(editingGear.id, {
          name: newGearName,
          brand: newGearBrand,
          type: newGearType,
          photoUri: newGearPhoto,
        });
      } else {
        // Créer nouveau
        await addUserGear({
          name: newGearName,
          brand: newGearBrand,
          type: newGearType,
          photoUri: newGearPhoto,
        });
      }
      
      const updatedGear = await getUserGear();
      await onGearChange(updatedGear);
      
      setEditingGear(null);
      setNewGearName('');
      setNewGearBrand('');
      setNewGearType('kimono');
      setNewGearPhoto(null);
      
      Alert.alert('✅ Succès', editingGear ? 'Équipement modifié !' : 'Équipement ajouté !');
    } catch (error) {
      console.error('Erreur sauvegarde équipement:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'équipement.');
    }
  };

  const handleDeleteGear = async (gearId: string) => {
    Alert.alert(
      'Supprimer l\'équipement',
      'Êtes-vous sûr de vouloir supprimer cet équipement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteUserGear(gearId);
            const updatedGear = await getUserGear();
            await onGearChange(updatedGear);
          },
        },
      ]
    );
  };

  const startEditing = (gear: UserGear) => {
    setEditingGear(gear);
    setNewGearName(gear.name);
    setNewGearBrand(gear.brand);
    setNewGearType(gear.type);
    setNewGearPhoto(gear.photoUri || null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.clubsModalContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.clubsModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.clubsModalCloseButton}>
              <X size={24} color={textColor} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Mes Équipements</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Liste des équipements existants */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor }]}>MES ÉQUIPEMENTS</Text>
            <View style={styles.clubsList}>
              {userGear.map((gear) => {
                const gearType = GEAR_TYPES.find(t => t.key === gear.type);
                return (
                  <View key={gear.id} style={[styles.clubItem, { backgroundColor: colors.cardHover }]}>
                    <View style={styles.clubItemLeft}>
                      {gear.photoUri ? (
                        <Image source={{ uri: gear.photoUri }} style={styles.clubItemLogo} />
                      ) : (
                        <View style={[styles.clubItemLogo, styles.clubItemLogoPlaceholder]}>
                          <Text style={styles.clubItemLogoText}>
                            {gearType?.icon || '🎒'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.clubItemInfo}>
                        <Text style={[styles.clubItemName, { color: textColor }]}>{gear.name}</Text>
                        <Text style={[styles.clubItemType, { color: colors.textSecondary }]}>
                          {gear.brand} • {gearType?.label || 'Autre'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clubItemActions}>
                      <TouchableOpacity
                        onPress={() => startEditing(gear)}
                        style={styles.clubEditButton}
                      >
                        <Text style={styles.clubEditText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteGear(gear.id)}
                        style={styles.clubDeleteButton}
                      >
                        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Formulaire d'ajout/édition */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor, marginTop: 32 }]}>
              {editingGear ? 'MODIFIER L\'ÉQUIPEMENT' : 'AJOUTER UN ÉQUIPEMENT'}
            </Text>
            <View style={[styles.addClubForm, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.clubNameInput, { color: textColor, backgroundColor: cardBackground }]}
                placeholder="Nom (ex: Kimono Blanc)"
                placeholderTextColor={isDark ? '#9E9E9E' : '#9CA3AF'}
                value={newGearName}
                onChangeText={setNewGearName}
              />

              <TextInput
                style={[styles.clubNameInput, { color: textColor, backgroundColor: cardBackground, marginTop: 12 }]}
                placeholder="Marque/Modèle (ex: Gracie Barra)"
                placeholderTextColor={isDark ? '#9E9E9E' : '#9CA3AF'}
                value={newGearBrand}
                onChangeText={setNewGearBrand}
              />

              {/* Sélecteur de type */}
              <Text style={[styles.clubFormLabel, { color: textColor, marginTop: 12 }]}>Type</Text>
              <View style={styles.clubTypesGrid}>
                {GEAR_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.clubTypeButton,
                      { backgroundColor: newGearType === type.key ? colors.gold : colors.card },
                    ]}
                    onPress={() => setNewGearType(type.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clubTypeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.clubTypeLabel,
                      { color: newGearType === type.key ? colors.background : textColor }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Photo */}
              <Text style={[styles.clubFormLabel, { color: textColor, marginTop: 12 }]}>Photo</Text>
              <TouchableOpacity
                style={[styles.logoPickerButton, { backgroundColor: cardBackground }]}
                onPress={pickGearPhoto}
                activeOpacity={0.7}
              >
                {newGearPhoto ? (
                  <Image source={{ uri: newGearPhoto }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Award size={32} color={isDark ? '#9E9E9E' : '#9CA3AF'} />
                    <Text style={[styles.logoPlaceholderText, { color: isDark ? '#9E9E9E' : '#9CA3AF' }]}>
                      Choisir une photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Bouton sauvegarder */}
              <TouchableOpacity
                style={[styles.saveClubButton, { backgroundColor: colors.gold }]}
                onPress={handleSaveGear}
                activeOpacity={0.7}
              >
                <Text style={styles.saveClubText}>
                  {editingGear ? 'Modifier' : 'Ajouter'}
                </Text>
              </TouchableOpacity>

              {editingGear && (
                <TouchableOpacity
                  style={[styles.cancelButton, { marginTop: 12 }]}
                  onPress={() => {
                    setEditingGear(null);
                    setNewGearName('');
                    setNewGearBrand('');
                    setNewGearType('kimono');
                    setNewGearPhoto(null);
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: textColor }]}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================
// 🏋️ MODAL CLUBS MANAGEMENT
// ============================================
function ClubsManagementModal({ 
  visible, 
  onClose, 
  userClubs,
  onClubsChange,
  editingClub,
  setEditingClub,
  newClubName,
  setNewClubName,
  newClubType,
  setNewClubType,
  newClubLogo,
  setNewClubLogo,
}: { 
  visible: boolean; 
  onClose: () => void;
  userClubs: UserClub[];
  onClubsChange: (clubs: UserClub[]) => Promise<void>;
  editingClub: UserClub | null;
  setEditingClub: (club: UserClub | null) => void;
  newClubName: string;
  setNewClubName: (name: string) => void;
  newClubType: 'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other';
  setNewClubType: (type: 'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other') => void;
  newClubLogo: string | null;
  setNewClubLogo: (logo: string | null) => void;
}) {
  const { colors, isDark } = useTheme();
  const textColor = colors.textPrimary;
  const cardBackground = colors.card;

  const CLUB_TYPES = [
    { key: 'gracie_barra', label: 'JJB', icon: '🥋' },
    { key: 'basic_fit', label: 'Muscu', icon: '🏋️' },
    { key: 'running', label: 'Running', icon: '🏃' },
    { key: 'mma', label: 'MMA', icon: '🥊' },
    { key: 'foot', label: 'Foot', icon: '⚽' },
    { key: 'other', label: 'Autre', icon: '🏟️' },
  ] as const;

  const pickClubLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewClubLogo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection logo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le logo.');
    }
  };

  const handleSaveClub = async () => {
    if (!newClubName.trim()) {
      Alert.alert('Nom requis', 'Veuillez entrer un nom pour votre club.');
      return;
    }

    try {
      if (editingClub) {
        // Mettre à jour
        await updateUserClub(editingClub.id, {
          name: newClubName,
          type: newClubType,
          logoUri: newClubLogo,
        });
      } else {
        // Créer nouveau
        await addUserClub({
          name: newClubName,
          type: newClubType,
          logoUri: newClubLogo,
        });
      }
      
      const updatedClubs = await getUserClubs();
      await onClubsChange(updatedClubs);
      
      setEditingClub(null);
      setNewClubName('');
      setNewClubType('basic_fit');
      setNewClubLogo(null);
      
      Alert.alert('✅ Succès', editingClub ? 'Club modifié !' : 'Club ajouté !');
    } catch (error) {
      console.error('Erreur sauvegarde club:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le club.');
    }
  };

  const handleDeleteClub = async (clubId: string) => {
    Alert.alert(
      'Supprimer le club',
      'Êtes-vous sûr de vouloir supprimer ce club ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteUserClub(clubId);
            const updatedClubs = await getUserClubs();
            await onClubsChange(updatedClubs);
          },
        },
      ]
    );
  };

  const startEditing = (club: UserClub) => {
    setEditingClub(club);
    setNewClubName(club.name);
    setNewClubType(club.type);
    setNewClubLogo(club.logoUri || null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.clubsModalContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.clubsModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.clubsModalCloseButton}>
              <X size={24} color={textColor} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: textColor }]}>Mes Clubs / Q.G.</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Liste des clubs existants */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor }]}>MES CLUBS</Text>
            <View style={styles.clubsList}>
              {userClubs.map((club) => {
                const clubType = CLUB_TYPES.find(t => t.key === club.type);
                return (
                  <View key={club.id} style={[styles.clubItem, { backgroundColor: colors.cardHover }]}>
                    <View style={styles.clubItemLeft}>
                      {club.logoUri ? (
                        <Image source={{ uri: club.logoUri }} style={styles.clubItemLogo} />
                      ) : (
                        <View style={[styles.clubItemLogo, styles.clubItemLogoPlaceholder]}>
                          <Text style={styles.clubItemLogoText}>
                            {clubType?.icon || '🏟️'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.clubItemInfo}>
                        <Text style={[styles.clubItemName, { color: textColor }]}>{club.name}</Text>
                        <Text style={[styles.clubItemType, { color: colors.textSecondary }]}>
                          {clubType?.label || 'Autre'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.clubItemActions}>
                      <TouchableOpacity
                        onPress={() => startEditing(club)}
                        style={styles.clubEditButton}
                      >
                        <Text style={styles.clubEditText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteClub(club.id)}
                        style={styles.clubDeleteButton}
                      >
                        <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Formulaire d'ajout/édition */}
            <Text style={[styles.clubsModalSectionTitle, { color: textColor, marginTop: 32 }]}>
              {editingClub ? 'MODIFIER LE CLUB' : 'AJOUTER UN CLUB'}
            </Text>
            <View style={[styles.addClubForm, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.clubNameInput, { color: textColor, backgroundColor: cardBackground }]}
                placeholder="Nom du club (ex: Marseille Fight Club)"
                placeholderTextColor={isDark ? '#9E9E9E' : '#9CA3AF'}
                value={newClubName}
                onChangeText={setNewClubName}
              />

              {/* Sélecteur de type */}
              <Text style={[styles.clubFormLabel, { color: textColor }]}>Type</Text>
              <View style={styles.clubTypesGrid}>
                {CLUB_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.clubTypeButton,
                      { backgroundColor: newClubType === type.key ? colors.gold : colors.card },
                    ]}
                    onPress={() => setNewClubType(type.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clubTypeIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.clubTypeLabel,
                      { color: newClubType === type.key ? colors.background : textColor }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Logo */}
              <Text style={[styles.clubFormLabel, { color: textColor }]}>Logo</Text>
              <TouchableOpacity
                style={[styles.logoPickerButton, { backgroundColor: cardBackground }]}
                onPress={pickClubLogo}
                activeOpacity={0.7}
              >
                {newClubLogo ? (
                  <Image source={{ uri: newClubLogo }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Award size={32} color={isDark ? '#9E9E9E' : '#9CA3AF'} />
                    <Text style={[styles.logoPlaceholderText, { color: isDark ? '#9E9E9E' : '#9CA3AF' }]}>
                      Choisir un logo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Boutons d'action */}
              <View style={styles.clubFormActions}>
                {editingClub && (
                  <TouchableOpacity
                    style={styles.cancelClubButton}
                    onPress={() => {
                      setEditingClub(null);
                      setNewClubName('');
                      setNewClubType('basic_fit');
                      setNewClubLogo(null);
                    }}
                  >
                    <Text style={styles.cancelClubText}>Annuler</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveClubButton, !newClubName.trim() && styles.saveClubButtonDisabled]}
                  onPress={handleSaveClub}
                  disabled={!newClubName.trim()}
                >
                  <Text style={styles.saveClubText}>
                    {editingClub ? 'Enregistrer' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 90,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZE.display,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
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
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#636E72',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  input: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
    minWidth: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginLeft: 60, // IconContainer width + gap
  },
  offlineNotice: {
    backgroundColor: '#E8F8F5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  offlineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B894',
    letterSpacing: 0.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: '#636E72',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#636E72',
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
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 22,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#E8F4FD',
    borderColor: '#4D96FF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  optionTextActive: {
    color: '#4D96FF',
    fontWeight: '700',
  },
  // Color Theme Selector
  colorOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
    borderWidth: 2,
    gap: 12,
  },
  colorOptionButtonActive: {
    backgroundColor: '#FEFCE8',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorOptionInfo: {
    flex: 1,
  },
  colorOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
    letterSpacing: -0.2,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  // Logos personnalisés
  logosPreview: {
    paddingTop: 16,
    gap: 12,
  },
  logoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  logoPreviewOld: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8EDF2',
  },
  logoLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  // Clubs Management Modal Styles
  clubsModalScroll: {
    flex: 1,
  },
  clubsModalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  clubsModalSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#636E72',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  clubsList: {
    gap: 12,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  clubItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  clubItemLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8EDF2',
  },
  clubItemLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  clubItemLogoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#007AFF',
  },
  clubsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  clubPreviewItem: {
    alignItems: 'center',
    gap: 4,
  },
  clubPreviewLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  clubPreviewPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPreviewName: {
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 60,
  },
  clubPreviewMore: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
  clubItemInfo: {
    flex: 1,
  },
  clubItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    marginBottom: 2,
  },
  clubItemType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#636E72',
  },
  clubItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clubEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
  },
  clubEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  clubDeleteButton: {
    padding: 6,
  },
  addClubForm: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  clubNameInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  clubFormLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  clubTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  clubTypeButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  clubTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  clubTypeLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoPickerButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    minHeight: 120,
  },
  logoPreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  logoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clubFormActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelClubButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelClubText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  saveClubButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  saveClubButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  saveClubText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addCustomButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EDEF',
    borderStyle: 'dashed',
  },
  addCustomButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  customInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  customNameInput: {
    backgroundColor: '#E8EDF2',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    borderWidth: 1,
    borderColor: '#E8EDEF',
  },
  customInputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  customCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#E8EDF2',
    alignItems: 'center',
  },
  customCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#636E72',
  },
  customAddButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  customAddText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teamPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  teamPhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Clubs Management Modal Styles
  clubsModalContainer: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  clubsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  clubsModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
});