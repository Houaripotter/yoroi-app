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
  Switch
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
  CloudUpload, // Sauvegarder
  CloudDownload, // Restaurer
  ShieldCheck
} from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { useFocusEffect, router } from 'expo-router';
// Assure-toi que ces composants existent, sinon commente-les temporairement
import { BadgesScreen } from '@/components/BadgesScreen'; 
import { ReminderSettingsComponent } from '@/components/ReminderSettings';
import { HealthSyncSettings } from '@/components/HealthSyncSettings';
import { 
  exportData, 
  importData, 
  resetAllData, 
  getUserSettings, 
  saveUserSettings 
} from '@/lib/storage';

export default function SettingsScreen() {
  const [height, setHeight] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [measurementUnit, setMeasurementUnit] = useState<'cm' | 'in'>('cm');
  const [appTheme, setAppTheme] = useState<'light' | 'dark' | 'system'>('light');

  // Modals
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [weightUnitModalVisible, setWeightUnitModalVisible] = useState(false);
  const [measurementUnitModalVisible, setMeasurementUnitModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await getUserSettings();
      setHeight(settings.height?.toString() || '');
      setWeightGoal(settings.weight_goal?.toString() || '');
      setTargetDate(settings.target_date || '');
      setWeightUnit(settings.weight_unit || 'kg');
      setMeasurementUnit(settings.measurement_unit || 'cm');
      setAppTheme(settings.theme || 'light');
    } catch (e) {
      console.log("Erreur chargement settings", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSettings();
    }, [fetchSettings])
  );

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

  // Helper pour les lignes de menu
  const MenuRow = ({ icon: Icon, color, label, value, onPress, isDestructive = false }: any) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: isDestructive ? '#FFEBEE' : `${color}20` }]}>
          <Icon size={20} color={isDestructive ? theme.colors.error : color} strokeWidth={2.5} />
        </View>
        <View>
          <Text style={[styles.rowLabel, isDestructive && { color: theme.colors.error }]}>{label}</Text>
          {value && <Text style={styles.rowValue}>{value}</Text>}
        </View>
      </View>
      <ChevronRight size={20} color={theme.colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Réglages</Text>
        </View>

        {/* PROFIL */}
        <Text style={styles.sectionHeader}>PROFIL</Text>
        <View style={styles.card}>
            <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Taille (cm)</Text>
                <TextInput 
                    style={styles.input} 
                    value={height} 
                    onChangeText={setHeight} 
                    placeholder="175" 
                    keyboardType="numeric"
                    onBlur={handleSaveProfile}
                />
            </View>
            <View style={styles.divider} />
            <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Poids Cible (kg)</Text>
                <TextInput 
                    style={styles.input} 
                    value={weightGoal} 
                    onChangeText={setWeightGoal} 
                    placeholder="75" 
                    keyboardType="numeric"
                    onBlur={handleSaveProfile}
                />
            </View>
        </View>

        {/* GAMIFICATION */}
        <Text style={styles.sectionHeader}>GAMIFICATION</Text>
        <View style={styles.card}>
            <MenuRow 
                icon={Award} 
                color={theme.colors.success} 
                label="Mes badges" 
                onPress={() => setBadgesModalVisible(true)} 
            />
        </View>

        {/* AFFICHAGE */}
        <Text style={styles.sectionHeader}>AFFICHAGE</Text>
        <View style={styles.card}>
            <MenuRow 
                icon={Palette} 
                color={theme.colors.primary} 
                label="Thème" 
                value={appTheme === 'light' ? 'Clair' : appTheme === 'dark' ? 'Sombre' : 'Système'}
                onPress={() => setThemeModalVisible(true)}
            />
            <View style={styles.divider} />
            <MenuRow 
                icon={Scale} 
                color={theme.colors.primary} 
                label="Unité de poids" 
                value={weightUnit === 'kg' ? 'Kilogrammes' : 'Livres'}
                onPress={() => setWeightUnitModalVisible(true)}
            />
            <View style={styles.divider} />
            <MenuRow 
                icon={TrendingDown} 
                color={theme.colors.primary} 
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

        {/* SÉCURITÉ DES DONNÉES */}
        <Text style={styles.sectionHeader}>SÉCURITÉ DES DONNÉES</Text>
        <View style={styles.card}>
            <MenuRow 
                icon={CloudUpload} 
                color={theme.colors.primary} 
                label="Sauvegarder mes données" 
                value="Créer un fichier de backup JSON" 
                onPress={handleExport} 
            />
            <View style={styles.divider} />
            <MenuRow 
                icon={CloudDownload} 
                color={theme.colors.primary} 
                label="Restaurer une sauvegarde" 
                value="Importer un fichier de backup JSON" 
                onPress={handleImport} 
            />
            <View style={styles.divider} />
            <MenuRow 
                icon={Trash2} 
                color={theme.colors.error} 
                label="Réinitialiser toutes les données" 
                value="Supprimer définitivement tout" 
                onPress={() => setResetModalVisible(true)} 
                isDestructive={true}
            />
        </View>

        <View style={styles.offlineNotice}>
            <Text style={styles.offlineTitle}><ShieldCheck size={18} color={theme.colors.success} /> Mode Confidentialité Totale</Text>
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
                <X size={24} color={theme.colors.textSecondary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.optionButton, appTheme === 'light' && styles.optionButtonActive]}
              onPress={() => {
                setAppTheme('light');
                saveUserSettings({ theme: 'light' });
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, appTheme === 'light' && styles.optionTextActive]}>Clair</Text>
              {appTheme === 'light' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, appTheme === 'dark' && styles.optionButtonActive]}
              onPress={() => {
                setAppTheme('dark');
                saveUserSettings({ theme: 'dark' });
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, appTheme === 'dark' && styles.optionTextActive]}>Sombre</Text>
              {appTheme === 'dark' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, appTheme === 'system' && styles.optionButtonActive]}
              onPress={() => {
                setAppTheme('system');
                saveUserSettings({ theme: 'system' });
                setThemeModalVisible(false);
              }}
            >
              <Text style={[styles.optionText, appTheme === 'system' && styles.optionTextActive]}>Automatique (Système)</Text>
              {appTheme === 'system' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
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
                <X size={24} color={theme.colors.textSecondary} strokeWidth={2.5} />
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
              {weightUnit === 'kg' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
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
              {weightUnit === 'lbs' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
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
                <X size={24} color={theme.colors.textSecondary} strokeWidth={2.5} />
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
              {measurementUnit === 'cm' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
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
              {measurementUnit === 'in' && <Check size={20} color={theme.colors.primary} strokeWidth={2.5} />}
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
                <X size={24} color={theme.colors.textSecondary} strokeWidth={2.5} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : theme.spacing.md,
    paddingBottom: theme.spacing.xxl * 2,
    paddingHorizontal: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.black,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg, // Ajouté pour espacement entre sections
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.xl,
    ...theme.shadow.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 56,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  rowValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.textSecondary,
    letterSpacing: -0.2,
  },
  rowSubtitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 56,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  input: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.textPrimary,
    textAlign: 'right',
    minWidth: 100,
    backgroundColor: theme.colors.background,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.lg + 40, // IconContainer width + gap
  },
  offlineNotice: {
    backgroundColor: `${theme.colors.success}10`,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.xl,
    borderWidth: 1,
    borderColor: `${theme.colors.success}30`,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xxl,
  },
  offlineTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  offlineDescription: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.textSecondary,
    lineHeight: theme.fontSize.md * 1.4,
  },
  footer: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadow.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.textSecondary,
    lineHeight: theme.fontSize.md * 1.4,
    marginBottom: theme.spacing.xl,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: `${theme.colors.primary}10`,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  optionTextActive: {
    color: theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: -0.2,
  },
  deleteButton: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.surface,
    letterSpacing: -0.2,
  },
});