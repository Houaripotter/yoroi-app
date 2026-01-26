import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/lib/ThemeContext';
import { Card } from '@/components/ui/Card';
import { 
  Camera, 
  Trash2, 
  BookOpen, 
  Activity, 
  User, 
  Smartphone,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { generateScreenshotDemoData, clearScreenshotDemoData } from '@/lib/screenshotDemoData';
import { useCustomPopup } from '@/components/CustomPopup';
import logger from '@/lib/security/logger';

export default function CreatorModeScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  
  const [isGlobalScreenshotMode, setIsGlobalScreenshotMode] = useState(false);
  const [isJournalScreenshotMode, setIsJournalScreenshotMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const globalMode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
      setIsGlobalScreenshotMode(globalMode === 'true');
      
      const journalMode = await AsyncStorage.getItem('@yoroi_journal_screenshot_mode');
      setIsJournalScreenshotMode(journalMode === 'true');
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

        {/* SECTION GLOBAL */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>GLOBAL</Text>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconBox}>
                <Smartphone size={24} color={colors.primary} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Mode Screenshot Global</Text>
                <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                  Active le profil "Germain" (Stats parfaites)
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

        {/* OTHER TOOLS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>AUTRES</Text>
          
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
              setIsGlobalScreenshotMode(false);
              setIsJournalScreenshotMode(false);
              showPopup('Reset', 'Tout est remis à zéro.', [{ text: 'OK', style: 'primary' }]);
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
});