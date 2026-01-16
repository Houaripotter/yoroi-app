// ============================================
// MODAL DE DÉCOUVERTE DES FONCTIONNALITÉS
// Affiche un tutoriel à la première visite de chaque page
// ============================================

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BlurView } from 'expo-blur';
import {
  Home,
  BarChart3,
  Calendar,
  Plus,
  Menu,
  BookOpen,
  Scale,
  Activity,
  Clock,
  HeartPulse,
  Gauge,
  Check,
} from 'lucide-react-native';
import { PageTutorial } from '@/lib/featureDiscoveryService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeatureDiscoveryModalProps {
  visible: boolean;
  tutorial: PageTutorial;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  home: Home,
  'bar-chart': BarChart3,
  calendar: Calendar,
  plus: Plus,
  menu: Menu,
  book: BookOpen,
  scale: Scale,
  activity: Activity,
  clock: Clock,
  'heart-pulse': HeartPulse,
  gauge: Gauge,
};

export const FeatureDiscoveryModal: React.FC<FeatureDiscoveryModalProps> = ({
  visible,
  tutorial,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const IconComponent = ICON_MAP[tutorial.icon] || Home;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={isDark ? 60 : 80} style={styles.overlay} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.container}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            {/* Icône et Titre */}
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: tutorial.color + '20' }]}>
                <IconComponent size={40} color={tutorial.color} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {tutorial.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {tutorial.description}
              </Text>
            </View>

            {/* Liste des fonctionnalités */}
            <ScrollView
              style={styles.featureList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {tutorial.features.map((feature, index) => (
                <View
                  key={index}
                  style={[
                    styles.featureItem,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.checkCircle, { backgroundColor: tutorial.color + '20' }]}>
                    <Check size={14} color={tutorial.color} strokeWidth={3} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Bouton Compris */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: tutorial.color }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>C'est compris !</Text>
            </TouchableOpacity>

            {/* Note */}
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Tu peux revoir ce tutoriel depuis le Menu → Aide & Tutoriels
            </Text>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  featureList: {
    maxHeight: 300,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
