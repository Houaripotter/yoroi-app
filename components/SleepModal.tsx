// ============================================
// YOROI - MODAL CONSEIL SOMMEIL
// ============================================
// S'affiche quand l'utilisateur utilise l'app après minuit

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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, X, Brain, Dumbbell, Scale, Clock, Heart } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SleepModalProps {
  visible: boolean;
  onClose: () => void;
}

interface TipItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  colors: any;
}

const TipItem: React.FC<TipItemProps> = ({ icon, title, description, colors }) => (
  <View style={[styles.tipItem, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
    <View style={[styles.tipIcon, { backgroundColor: 'rgba(138, 43, 226, 0.2)' }]}>
      {icon}
    </View>
    <View style={styles.tipContent}>
      <Text style={[styles.tipTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.tipDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  </View>
);

export const SleepModal: React.FC<SleepModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();

  const tips = [
    {
      icon: <Scale size={20} color="#8A2BE2" />,
      title: "Perte de poids",
      description: "Le manque de sommeil augmente la ghréline (hormone de la faim) et diminue la leptine (hormone de satiété). Résultat : tu manges plus !",
    },
    {
      icon: <Dumbbell size={20} color="#8A2BE2" />,
      title: "Récupération musculaire",
      description: "L'hormone de croissance est sécrétée principalement pendant le sommeil profond. C'est là que tes muscles se réparent et grandissent.",
    },
    {
      icon: <Brain size={20} color="#8A2BE2" />,
      title: "Métabolisme",
      description: "Un mauvais sommeil ralentit ton métabolisme de base. Tu brûles moins de calories au repos !",
    },
    {
      icon: <Heart size={20} color="#8A2BE2" />,
      title: "Motivation",
      description: "Fatigué = moins de volonté = plus de tentations. Le sommeil booste ta discipline.",
    },
    {
      icon: <Clock size={20} color="#8A2BE2" />,
      title: "Performance",
      description: "7-9h de sommeil = meilleure performance à l'entraînement, meilleure concentration.",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />

        <View style={[styles.card, { backgroundColor: isDark ? '#12121A' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.moonContainer}>
              <LinearGradient
                colors={['#8A2BE2', '#4B0082']}
                style={styles.moonGradient}
              >
                <Moon size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            🌙 Pourquoi le sommeil est crucial
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Pour ta transformation physique
          </Text>

          {/* Tips */}
          <ScrollView
            style={styles.tipsContainer}
            showsVerticalScrollIndicator={false}
          >
            {tips.map((tip, index) => (
              <TipItem
                key={index}
                icon={tip.icon}
                title={tip.title}
                description={tip.description}
                colors={colors}
              />
            ))}

            {/* Conseil */}
            <View style={[styles.adviceBox, { backgroundColor: 'rgba(138, 43, 226, 0.15)' }]}>
              <Text style={[styles.adviceTitle, { color: '#8A2BE2' }]}>
                💡 Conseil du Guerrier
              </Text>
              <Text style={[styles.adviceText, { color: colors.textSecondary }]}>
                Pose ton téléphone, éteins les écrans 30 min avant de dormir.
                Ton corps te remerciera demain matin sur la balance !
              </Text>
            </View>
          </ScrollView>

          {/* Button */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <LinearGradient
              colors={['#8A2BE2', '#4B0082']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>J'ai compris, je vais dormir 😴</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    maxHeight: '85%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  moonContainer: {
    alignItems: 'center',
  },
  moonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  tipsContainer: {
    maxHeight: 350,
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  adviceBox: {
    padding: 16,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 10,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default SleepModal;
