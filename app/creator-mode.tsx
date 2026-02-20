import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/lib/ThemeContext';
import { Card } from '@/components/ui/Card';
import {
  Trash2,
  BookOpen,
  Activity,
  Smartphone,
  CheckCircle,
  Syringe,
  BarChart3
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { generateScreenshotDemoData, clearScreenshotDemoData, DEMO_PROFILES, setActiveDemoProfile, DemoProfileKey } from '@/lib/screenshotDemoData';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';

export default function CreatorModeScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  
  const [isGlobalScreenshotMode, setIsGlobalScreenshotMode] = useState(false);
  const [isJournalScreenshotMode, setIsJournalScreenshotMode] = useState(false);
  const [isSurgeonMode, setIsSurgeonMode] = useState(false);
  const [isMockStatsMode, setIsMockStatsMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DemoProfileKey>('germain');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const globalMode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
      setIsGlobalScreenshotMode(globalMode === 'true');

      const journalMode = await AsyncStorage.getItem('@yoroi_journal_screenshot_mode');
      setIsJournalScreenshotMode(journalMode === 'true');

      const surgeonMode = await AsyncStorage.getItem('@yoroi_surgeon_mode');
      setIsSurgeonMode(surgeonMode === 'true');

      const mockStats = await AsyncStorage.getItem('@yoroi_mock_stats_mode');
      setIsMockStatsMode(mockStats === 'true');
    } catch (e) {
      logger.error('Error loading creator settings', e);
    }
  };

  const toggleGlobalScreenshotMode = async (value: boolean) => {
    setIsGlobalScreenshotMode(value);
    await AsyncStorage.setItem('@yoroi_screenshot_mode', String(value));
    
    if (value) {
      showPopup(
        'Mode Global Activé', 
        "Les données de démonstration (Germain) vont être générées.",
        [
          { 
            text: 'Générer', 
            style: 'primary',
            onPress: async () => {
              await generateScreenshotDemoData();
              showPopup('Prêt', "Données générées. Redémarre l'app si nécessaire.", [{ text: 'OK', style: 'primary' }]);
            }
          }
        ]
      );
    } else {
       showPopup(
        'Mode Global Désactivé', 
        'Tu veux nettoyer les données de démo ?',
        [
          { text: 'Non', style: 'cancel' },
          { 
            text: 'Oui, Nettoyer', 
            style: 'destructive',
            onPress: async () => {
              await clearScreenshotDemoData();
              showPopup('Nettoyé', "Retour à la normale.", [{ text: 'OK', style: 'primary' }]);
            }
          }
        ]
      );
    }
  };

  const toggleJournalScreenshotMode = async (value: boolean) => {
    setIsJournalScreenshotMode(value);
    await AsyncStorage.setItem('@yoroi_journal_screenshot_mode', String(value));
  };

  const toggleSurgeonMode = async (value: boolean) => {
    setIsSurgeonMode(value);
    await AsyncStorage.setItem('@yoroi_surgeon_mode', String(value));
    showPopup(
      value ? 'Mode Chirurgien Activé' : 'Mode Chirurgien Désactivé',
      value ? 'Tu peux maintenant manipuler les données de blessures et BodyMap.' : 'Mode normal restauré.',
      [{ text: 'OK', style: 'primary' }]
    );
  };

  const toggleMockStatsMode = async (value: boolean) => {
    setIsMockStatsMode(value);
    await AsyncStorage.setItem('@yoroi_mock_stats_mode', String(value));
    showPopup(
      value ? 'Stats Mock Activées' : 'Stats Mock Désactivées',
      value ? 'Les graphiques afficheront des données parfaites.' : 'Retour aux vraies données.',
      [{ text: 'OK', style: 'primary' }]
    );
  };

  const openJournal = () => {
    router.push('/journal');
  };

  return (
    <ScreenWrapper>
      <Header title="Mode Créateur" showBack />
      <ScrollView style={styles.content}>
        
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Outils de Création
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Configuration pour screenshots App Store
          </Text>
        </View>

        {/* SECTION PROFILS DÉMO */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PROFILS DE DÉMO</Text>
          <Card style={styles.card}>
            {Object.entries(DEMO_PROFILES).map(([key, profile]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.profileItem,
                  selectedProfile === key && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
                onPress={() => setSelectedProfile(key as DemoProfileKey)}
              >
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.textPrimary }]}>{profile.name}</Text>
                  <Text style={[styles.profileDesc, { color: colors.textMuted }]}>{profile.description}</Text>
                  <Text style={[styles.profileStats, { color: colors.textMuted }]}>
                    {profile.start_weight}kg → {profile.target_weight}kg • {profile.sport.toUpperCase()}
                  </Text>
                </View>
                {selectedProfile === key && (
                  <CheckCircle size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.generateButton, { backgroundColor: colors.primary }, isGenerating && { opacity: 0.6 }]}
              onPress={async () => {
                if (isGenerating) return;
                setIsGenerating(true);
                setActiveDemoProfile(selectedProfile);
                const result = await generateScreenshotDemoData();
                setIsGenerating(false);
                if (result.success) {
                  setIsGlobalScreenshotMode(true);
                  await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');
                  showPopup('Profil Généré', `${DEMO_PROFILES[selectedProfile].name} est prêt ! Redémarre l'app.`, [{ text: 'OK', style: 'primary' }]);
                } else {
                  showPopup('Erreur', result.error || 'Erreur inconnue', [{ text: 'OK', style: 'cancel' }]);
                }
              }}
              disabled={isGenerating}
            >
              <Text style={styles.generateButtonText}>
                {isGenerating ? 'Génération...' : `Générer ${DEMO_PROFILES[selectedProfile].name}`}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* SECTION GLOBAL */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ÉTAT ACTUEL</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconBox}>
                <Smartphone size={24} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Mode Screenshot Actif</Text>
                <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                  Données de démo chargées
                </Text>
              </View>
              <Switch
                value={isGlobalScreenshotMode}
                onValueChange={toggleGlobalScreenshotMode}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </Card>
        </View>

        {/* SECTION JOURNAL */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CARNET D'ENTRAÎNEMENT</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#F9731620' }]}>
                <BookOpen size={24} color="#F97316" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Mode Screenshot Carnet</Text>
                <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                  Affiche des entrées parfaites et cache l'UI
                </Text>
              </View>
              <Switch 
                value={isJournalScreenshotMode}
                onValueChange={toggleJournalScreenshotMode}
                trackColor={{ false: colors.border, true: '#F97316' }}
              />
            </View>
            
            {isJournalScreenshotMode && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#F97316' }]}
                onPress={openJournal}
              >
                <Text style={styles.actionButtonText}>Ouvrir le Journal</Text>
                <BookOpen size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </Card>
        </View>

        {/* MODE CHIRURGIEN */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BLESSURES & BODYMAP</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#EF444420' }]}>
                <Syringe size={24} color="#EF4444" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Mode Chirurgien</Text>
                <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                  Manipuler EVA et données blessures
                </Text>
              </View>
              <Switch
                value={isSurgeonMode}
                onValueChange={toggleSurgeonMode}
                trackColor={{ false: colors.border, true: '#EF4444' }}
              />
            </View>
          </Card>
        </View>

        {/* STATS MOCK */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STATISTIQUES</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
                <BarChart3 size={24} color="#8B5CF6" />
              </View>
              <View style={styles.info}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Stats Mock</Text>
                <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                  Graphiques avec données parfaites
                </Text>
              </View>
              <Switch
                value={isMockStatsMode}
                onValueChange={toggleMockStatsMode}
                trackColor={{ false: colors.border, true: '#8B5CF6' }}
              />
            </View>
          </Card>
        </View>

        {/* OTHER TOOLS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>OUTILS</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => router.push('/screenshot-mode')}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.accent + '20' }]}>
              <Activity size={24} color={colors.accent} />
            </View>
            <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>
              Voir Mock Screen (Ancien)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: '#EF444420', marginTop: 10 }]}
            onPress={async () => {
              await clearScreenshotDemoData();
              await AsyncStorage.removeItem('@yoroi_screenshot_mode');
              await AsyncStorage.removeItem('@yoroi_journal_screenshot_mode');
              await AsyncStorage.removeItem('@yoroi_surgeon_mode');
              await AsyncStorage.removeItem('@yoroi_mock_stats_mode');
              setIsGlobalScreenshotMode(false);
              setIsJournalScreenshotMode(false);
              setIsSurgeonMode(false);
              setIsMockStatsMode(false);
              showPopup('Reset', 'Tous les modes sont désactivés.', [{ text: 'OK', style: 'primary' }]);
            }}
          >
             <View style={[styles.iconBox, { backgroundColor: '#EF4444' }]}>
              <Trash2 size={24} color="#FFF" />
            </View>
            <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
              Tout Désactiver & Nettoyer
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  card: {
    padding: 16,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 13,
  },
  actionButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileDesc: {
    fontSize: 12,
    marginBottom: 2,
  },
  profileStats: {
    fontSize: 11,
  },
  generateButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});