/**
 * HealthStatusModal.tsx
 * Modal explicative pour les statuts de santé (OPTIMAL, ÉLEVÉ, DANGER, etc.)
 * Affichée quand on clique sur les petits carrés colorés dans l'historique
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, AlertTriangle, CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HealthStatusModalProps {
  visible: boolean;
  onClose: () => void;
  status: 'optimal' | 'good' | 'elevated' | 'high' | 'danger' | 'unknown';
  value: number;
  unit: string;
  metricName: string;
}

export const HealthStatusModal: React.FC<HealthStatusModalProps> = ({
  visible,
  onClose,
  status,
  value,
  unit,
  metricName,
}) => {
  const { colors, isDark } = useTheme();

  const handleClose = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    onClose();
  };

  // Infos selon le statut
  const getStatusInfo = () => {
    switch (status) {
      case 'optimal':
        return {
          icon: <CheckCircle2 size={48} color="#10B981" strokeWidth={2.5} />,
          color: '#10B981',
          bgColor: '#10B981' + '20',
          label: 'OPTIMAL',
          title: 'Excellent!',
          description: `Ton ${metricName} de ${value}${unit} est dans la zone optimale. Continue comme ça!`,
          advice: [
            'Maintiens tes bonnes habitudes actuelles',
            'Continue à suivre régulièrement tes données',
            'Partage tes progrès pour rester motivé',
          ],
        };

      case 'good':
        return {
          icon: <CheckCircle2 size={48} color="#3B82F6" strokeWidth={2.5} />,
          color: '#3B82F6',
          bgColor: '#3B82F6' + '20',
          label: 'BON',
          title: 'Très bien!',
          description: `Ton ${metricName} de ${value}${unit} est dans une bonne zone.`,
          advice: [
            'Tu es sur la bonne voie',
            'Continue tes efforts actuels',
            'Surveille ton évolution régulièrement',
          ],
        };

      case 'elevated':
        return {
          icon: <AlertCircle size={48} color="#F59E0B" strokeWidth={2.5} />,
          color: '#F59E0B',
          bgColor: '#F59E0B' + '20',
          label: 'ÉLEVÉ',
          title: 'Attention',
          description: `Ton ${metricName} de ${value}${unit} commence à s'écarter de la zone optimale.`,
          advice: [
            'Surveille cette métrique de près',
            'Ajuste tes habitudes si nécessaire',
            'Consulte un professionnel si ça persiste',
          ],
        };

      case 'high':
        return {
          icon: <TrendingUp size={48} color="#EF4444" strokeWidth={2.5} />,
          color: '#EF4444',
          bgColor: '#EF4444' + '20',
          label: 'HAUT',
          title: 'Vigilance requise',
          description: `Ton ${metricName} de ${value}${unit} est élevé et nécessite ton attention.`,
          advice: [
            'Prends des mesures correctives',
            'Consulte un professionnel de santé',
            'Surveille quotidiennement cette métrique',
          ],
        };

      case 'danger':
        return {
          icon: <AlertTriangle size={48} color="#DC2626" strokeWidth={2.5} />,
          color: '#DC2626',
          bgColor: '#DC2626' + '20',
          label: 'DANGER',
          title: '⚠️ Zone dangereuse',
          description: `Ton ${metricName} de ${value}${unit} est dans une zone préoccupante.`,
          advice: [
            '⚠️ Consulte rapidement un médecin',
            'Ne néglige pas cette valeur',
            'Adapte immédiatement ton mode de vie',
          ],
        };

      case 'unknown':
      default:
        return {
          icon: <AlertCircle size={48} color="#6B7280" strokeWidth={2.5} />,
          color: '#6B7280',
          bgColor: '#6B7280' + '20',
          label: 'INCONNU',
          title: 'Données insuffisantes',
          description: `Les données pour ${metricName} ne sont pas disponibles ou invalides.`,
          advice: [
            'Vérifie que tu as autorisé l\'accès à Apple Santé',
            'Assure-toi que tes appareils synchronisent les données',
            'Consulte les paramètres de confidentialité iOS',
          ],
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <BlurView
        intensity={isDark ? 60 : 40}
        tint={isDark ? 'dark' : 'light'}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View
            style={[styles.modalContainer, { backgroundColor: colors.card }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header avec icône et statut */}
            <View style={[styles.header, { backgroundColor: statusInfo.bgColor }]}>
              {statusInfo.icon}
              <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={24} color={colors.text} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Contenu */}
            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentContainer}
            >
              {/* Titre */}
              <Text style={[styles.title, { color: colors.text }]}>
                {statusInfo.title}
              </Text>

              {/* Valeur */}
              <View style={[styles.valueCard, { backgroundColor: colors.background }]}>
                <Text style={[styles.valueLabel, { color: colors.textMuted }]}>
                  {metricName}
                </Text>
                <Text style={[styles.valueText, { color: statusInfo.color }]}>
                  {value}{unit}
                </Text>
              </View>

              {/* Description */}
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {statusInfo.description}
              </Text>

              {/* Conseils */}
              <View style={[styles.adviceSection, { backgroundColor: colors.background }]}>
                <Text style={[styles.adviceTitle, { color: colors.text }]}>
                  💡 Conseils
                </Text>
                {statusInfo.advice.map((tip, index) => (
                  <View key={index} style={styles.adviceItem}>
                    <View style={[styles.bullet, { backgroundColor: statusInfo.color }]} />
                    <Text style={[styles.adviceText, { color: colors.textMuted }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Espace en bas */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
    letterSpacing: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  valueCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  valueText: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  adviceSection: {
    borderRadius: 16,
    padding: 20,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  adviceItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  adviceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
});
