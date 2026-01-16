// ============================================
// MODAL DE MISE À JOUR / CHANGELOG
// Affiche les nouveautés après chaque mise à jour
// ============================================

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BlurView } from 'expo-blur';
import {
  Sparkles,
  Heart,
  Star,
  Instagram,
  MessageCircle,
  ExternalLink,
  Check,
  TrendingUp,
  Trash2,
  BarChart3,
  Moon,
  Lock,
  Zap,
  Target,
} from 'lucide-react-native';
import { safeOpenURL } from '@/lib/security/validators';

interface UpdateChangelogModalProps {
  visible: boolean;
  onClose: () => void;
}

const CHANGELOG_ITEMS = [
  {
    icon: Trash2,
    color: '#EF4444',
    title: 'Système de corbeille',
    description: 'Restaure tes records et techniques supprimés par erreur',
  },
  {
    icon: BarChart3,
    color: '#8B5CF6',
    title: 'Graphiques améliorés',
    description: 'Graphiques scrollables pour voir toutes tes données',
  },
  {
    icon: TrendingUp,
    color: '#10B981',
    title: 'Sélecteur de période',
    description: 'Analyse tes stats sur 7j, 30j, 90j, 6 mois ou 1 an',
  },
  {
    icon: Moon,
    color: '#F59E0B',
    title: 'Mode sombre optimisé',
    description: 'Meilleure visibilité des graphiques en mode sombre',
  },
  {
    icon: Zap,
    color: '#06B6D4',
    title: 'Interface plus spacieuse',
    description: 'Onglets redessinés pour une meilleure expérience',
  },
  {
    icon: Lock,
    color: '#3B82F6',
    title: 'Sécurité renforcée',
    description: 'Protection contre les injections et vulnérabilités',
  },
  {
    icon: Target,
    color: '#EC4899',
    title: 'Nettoyage des données',
    description: 'Supprime facilement les données de démo',
  },
];

export const UpdateChangelogModal: React.FC<UpdateChangelogModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const handleRateApp = () => {
    safeOpenURL('https://apps.apple.com/us/app/yoroi-suivi-poids-sport/id6757306612');
  };

  const handleInstagram = () => {
    safeOpenURL('https://instagram.com/yoroiapp');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={isDark ? 60 : 80} style={styles.overlay} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.container}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header avec icône */}
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
                  <Sparkles size={40} color={colors.accentText} />
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Nouveautés v2.1
                </Text>
              </View>

              {/* Message personnel */}
              <View style={[styles.messageBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Heart size={20} color="#EF4444" style={{ marginBottom: 12 }} />
                <Text style={[styles.messageText, { color: colors.textPrimary }]}>
                  Salut la famille Yoroi !{'\n\n'}

                  Je m'excuse d'abord pour les soucis que tu as peut-être rencontrés récemment.
                  J'ai fait un gros travail sur l'app pour l'améliorer, et il se peut qu'il reste quelques bugs.
                  Je te demande d'être indulgent avec moi, je suis seul sur ce projet et je fais de mon mieux pour te proposer la meilleure expérience possible.{'\n\n'}

                  J'ai rendu les onglets plus spacieux et j'ai ajouté plein de nouvelles fonctionnalités !
                  N'hésite pas à faire un tour dans chaque onglet pour découvrir tout ça.{'\n\n'}

                  Si tu vois une erreur, même minime, je suis dispo sur mon Instagram{' '}
                  <Text style={{ fontWeight: '800', color: colors.accent }}>@Yoroiapp</Text>
                  {' '}ou dans la boîte à idées dans le menu.
                </Text>
              </View>

              {/* Liste des nouveautés */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Ce qui a changé
                </Text>
                {CHANGELOG_ITEMS.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.changeItem,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.changeIcon, { backgroundColor: item.color + '20' }]}>
                        <IconComponent size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.changeTitle, { color: colors.textPrimary }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.changeDescription, { color: colors.textMuted }]}>
                          {item.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Call to action */}
              <View style={[styles.ctaBox, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '30' }]}>
                <Text style={[styles.ctaTitle, { color: colors.accent }]}>
                  Aide-moi à faire grandir Yoroi
                </Text>
                <Text style={[styles.ctaText, { color: colors.textMuted }]}>
                  Partage l'app à ceux qui pourraient en avoir besoin et laisse une note sur l'App Store.
                  Ça m'aide énormément à progresser et à faire connaître notre famille Yoroi.
                </Text>
              </View>

              {/* Boutons d'action */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.accent }]}
                  onPress={handleRateApp}
                  activeOpacity={0.8}
                >
                  <Star size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Noter l'app</Text>
                  <ExternalLink size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#E1306C' }]}
                  onPress={handleInstagram}
                  activeOpacity={0.8}
                >
                  <Instagram size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>@Yoroiapp</Text>
                  <ExternalLink size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Bouton Fermer */}
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Check size={20} color={colors.textPrimary} />
                <Text style={[styles.closeButtonText, { color: colors.textPrimary }]}>
                  C'est parti !
                </Text>
              </TouchableOpacity>
            </ScrollView>
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
    maxWidth: 450,
    maxHeight: '90%',
  },
  modalContent: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 24,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  changeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  changeDescription: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  ctaBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
