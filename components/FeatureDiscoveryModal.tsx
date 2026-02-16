// ============================================
// MODAL DE DÉCOUVERTE DES FONCTIONNALITÉS - PLEIN ÉCRAN
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
  StatusBar,
  Image,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  ChevronRight,
} from 'lucide-react-native';
import { PageTutorial } from '@/lib/featureDiscoveryService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeatureDiscoveryModalProps {
  visible: boolean;
  tutorial: PageTutorial;
  onClose: () => void; // Appelé quand l'utilisateur clique sur "Compris" (marque comme vu)
  onSkip?: () => void; // Appelé quand l'utilisateur clique sur "Plus tard" (ne marque pas comme vu)
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
  onSkip,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const IconComponent = ICON_MAP[tutorial.icon] || Home;

  // Si onSkip n'est pas fourni, on utilise onClose pour fermer sans marquer comme vu
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 120 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Header */}
          <View style={styles.logoHeader}>
            <Image
              source={require('../assets/images/logo2010.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { color: colors.textPrimary }]}>YOROI</Text>
          </View>

          {/* Titre principal avec icône */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: tutorial.color + '20' }]}>
              <IconComponent size={56} color={tutorial.color} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {tutorial.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {tutorial.description}
            </Text>
          </View>

          {/* Badge "Découvre cette section" */}
          <View style={[styles.discoveryBadge, { backgroundColor: tutorial.color + '15', borderColor: tutorial.color + '30' }]}>
            <Text style={[styles.discoveryText, { color: tutorial.color }]}>
              Découvre cette section
            </Text>
          </View>

          {/* Liste des fonctionnalités */}
          <View style={styles.featureList}>
            {tutorial.features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureItem,
                  {
                    backgroundColor: colors.backgroundCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.checkCircle, { backgroundColor: tutorial.color + '20' }]}>
                  <Check size={16} color={tutorial.color} strokeWidth={3} />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Note */}
          <View style={[styles.noteBox, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Tu peux revoir ce tutoriel depuis{'\n'}
              <Text style={{ fontWeight: '700', color: colors.textSecondary }}>Menu → Aide & Tutoriels</Text>
            </Text>
          </View>
        </ScrollView>

        {/* Boutons en bas fixes */}
        <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          {/* Bouton Compris - Principal */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tutorial.color }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Check size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>C'est compris !</Text>
          </TouchableOpacity>

          {/* Bouton Plus tard - Secondaire */}
          {onSkip && (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textMuted }]}>
                Plus tard
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 40,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  discoveryBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 28,
  },
  discoveryText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 14,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  noteBox: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
