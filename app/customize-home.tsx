// ============================================
// YOROI - PERSONNALISATION ACCUEIL (VISIBILITÉ DES SECTIONS)
// ============================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  User,
  Trophy,
  Scale,
  Grid,
  Moon,
  Battery,
  Target,
  Activity,
  Heart,
  FileText,
  Settings,
  Calendar,
  Sword,
  Info,
  ChevronUp,
  ChevronDown,
  Award,
  BookOpen,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  HomeSection,
  getHomeCustomization,
  saveHomeCustomization,
  resetHomeCustomization,
  DEFAULT_HOME_SECTIONS,
} from '@/lib/homeCustomizationService';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import logger from '@/lib/security/logger';

const ICON_MAP: Record<string, any> = {
  user: User,
  trophy: Trophy,
  scale: Scale,
  grid: Grid,
  moon: Moon,
  battery: Battery,
  target: Target,
  activity: Activity,
  heart: Heart,
  'file-text': FileText,
  tool: Settings,
  calendar: Calendar,
  sword: Sword,
  award: Award,
  'book-open': BookOpen,
};

export default function CustomizeHomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [sections, setSections] = useState<HomeSection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger la config
  const loadCustomization = useCallback(async () => {
    try {
      const config = await getHomeCustomization();
      setSections(config);
      setLoading(false);
    } catch (error) {
      logger.error('Erreur chargement:', error);
      setSections(DEFAULT_HOME_SECTIONS);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomization();
  }, [loadCustomization]);

  // Toggle visibilité
  const toggleVisibility = (id: string) => {
    const section = sections.find(s => s.id === id);
    if (section?.mandatory) {
      showPopup(
        'Section obligatoire',
        'Cette section ne peut pas être cachée car elle est essentielle à l\'interface.',
        [{ text: 'OK', style: 'primary' }]
      );
      return;
    }

    impactAsync(ImpactFeedbackStyle.Light);
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
    setHasChanges(true);
  };

  // Déplacer une section vers le haut
  const moveUp = (id: string) => {
    const index = sections.findIndex(s => s.id === id);
    if (index <= 0) return; // Déjà en haut

    impactAsync(ImpactFeedbackStyle.Light);

    const newSections = [...sections];
    const temp = newSections[index - 1];
    newSections[index - 1] = newSections[index];
    newSections[index] = temp;

    // Réattribuer les order
    const reordered = newSections.map((section, idx) => ({
      ...section,
      order: idx,
    }));

    setSections(reordered);
    setHasChanges(true);
  };

  // Déplacer une section vers le bas
  const moveDown = (id: string) => {
    const index = sections.findIndex(s => s.id === id);
    if (index < 0 || index >= sections.length - 1) return; // Déjà en bas

    impactAsync(ImpactFeedbackStyle.Light);

    const newSections = [...sections];
    const temp = newSections[index + 1];
    newSections[index + 1] = newSections[index];
    newSections[index] = temp;

    // Réattribuer les order
    const reordered = newSections.map((section, idx) => ({
      ...section,
      order: idx,
    }));

    setSections(reordered);
    setHasChanges(true);
  };

  // Sauvegarder automatiquement
  const handleSave = async () => {
    try {
      notificationAsync(NotificationFeedbackType.Success);
      await saveHomeCustomization(sections);
      setHasChanges(false);
      router.back();
    } catch (error) {
      logger.error('[CUSTOMIZE] Erreur sauvegarde:', error);
      showPopup('Erreur', 'Impossible de sauvegarder.', [{ text: 'OK', style: 'primary' }]);
    }
  };

  // Reset
  const handleReset = () => {
    showPopup(
      'Réinitialiser ?',
      'Cela restaurera la disposition par défaut de l\'accueil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: async () => {
            try {
              notificationAsync(NotificationFeedbackType.Warning);
              await resetHomeCustomization();
              setSections(DEFAULT_HOME_SECTIONS);
              setHasChanges(true);
            } catch (error) {
              showPopup('Erreur', 'Impossible de réinitialiser.', [{ text: 'OK', style: 'primary' }]);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Personnaliser
        </Text>
        <TouchableOpacity
          onPress={async () => {
            if (hasChanges) {
              await handleSave();
            } else {
              router.back();
            }
          }}
          style={styles.doneBtn}
        >
          <Check size={24} color={hasChanges ? colors.accent : colors.textMuted} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={[styles.instructionsCard, { backgroundColor: colors.accent + '15' }]}>
        <Text style={[styles.instructionsText, { color: colors.accent }]}>
          Utilise les flèches ↑ ↓ pour réorganiser les sections
        </Text>
        <Text style={[styles.instructionsSubtext, { color: colors.accent }]}>
          Tape sur l'œil pour masquer/afficher
        </Text>
      </View>

      {/* Liste des sections */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sections
          .sort((a, b) => a.order - b.order)
          .map((item, index) => {
            const Icon = ICON_MAP[item.icon] || Info;
            const isFirst = index === 0;
            const isLast = index === sections.length - 1;

            return (
              <View
                key={item.id}
                style={[
                  styles.sectionCard,
                  { backgroundColor: colors.backgroundCard },
                  !item.visible && { opacity: 0.5 },
                ]}
              >
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: `${colors.accent}15` }]}>
                  <Icon size={22} color={item.visible ? colors.accentText : colors.textMuted} />
                </View>

                {/* Info */}
                <View style={styles.sectionInfo}>
                  <Text style={[styles.sectionName, { color: item.visible ? colors.textPrimary : colors.textMuted }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.sectionDesc, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                  {item.mandatory && (
                    <Text style={[styles.mandatoryLabel, { color: colors.accentText }]}>
                      Toujours visible
                    </Text>
                  )}
                </View>

                {/* Boutons UP/DOWN */}
                <View style={styles.moveButtons}>
                  <TouchableOpacity
                    onPress={() => moveUp(item.id)}
                    disabled={isFirst}
                    style={[styles.moveBtn, isFirst && { opacity: 0.3 }]}
                  >
                    <ChevronUp size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(item.id)}
                    disabled={isLast}
                    style={[styles.moveBtn, isLast && { opacity: 0.3 }]}
                  >
                    <ChevronDown size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Toggle visibilité */}
                <TouchableOpacity
                  onPress={() => toggleVisibility(item.id)}
                  disabled={item.mandatory}
                  style={styles.toggleBtn}
                >
                  {item.visible ? (
                    <Eye size={24} color={colors.accentText} />
                  ) : (
                    <EyeOff size={24} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleReset}
          style={[styles.footerBtn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        >
          <RotateCcw size={18} color={colors.textMuted} />
          <Text style={[styles.footerBtnText, { color: colors.textMuted }]}>
            Réinitialiser
          </Text>
        </TouchableOpacity>
      </View>

      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  doneBtn: {
    padding: 8,
  },
  instructionsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  instructionsText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionsSubtext: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  sectionDesc: {
    fontSize: 12,
  },
  mandatoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  moveButtons: {
    flexDirection: 'column',
    marginRight: 8,
  },
  moveBtn: {
    padding: 4,
  },
  toggleBtn: {
    padding: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
