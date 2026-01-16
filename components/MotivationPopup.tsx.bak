import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';

const MOTIVATIONS = [
  "La douleur que tu ressens aujourd'hui sera la force que tu ressentiras demain.",
  "Chaque rep compte. Chaque goutte de sueur compte.",
  "Tu ne regrettes jamais un entraînement.",
  "Le corps atteint ce que l'esprit croit.",
  "Pas d'excuses. Que des résultats.",
  "La discipline bat la motivation.",
  "Un jour ou jour un. C'est toi qui décides.",
  "Sois plus fort que tes excuses.",
  "Le succès commence par la décision d'essayer.",
  "Ta seule limite, c'est toi.",
  "L'armure se forge dans l'effort. 鎧",
  "Deviens la meilleure version de toi-même.",
  "Chaque jour est une chance de progresser.",
  "Le champion se construit jour après jour.",
];

export const MotivationPopup: React.FC = () => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    checkAndShowMotivation();
  }, []);

  const checkAndShowMotivation = async () => {
    try {
      const lastShown = await AsyncStorage.getItem('last_motivation_date');
      const today = new Date().toDateString();

      // Afficher seulement une fois par jour
      if (lastShown !== today) {
        const randomQuote = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
        setQuote(randomQuote);
        setVisible(true);
        await AsyncStorage.setItem('last_motivation_date', today);
      }
    } catch (error) {
      logger.error('Erreur motivation:', error);
    }
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: colors.backgroundElevated }]}>
          {/* Icône */}
          <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Flame size={32} color={colors.accent} />
          </View>

          {/* Citation */}
          <Text style={[styles.quote, { color: colors.textPrimary }]}>
            "{quote}"
          </Text>

          {/* Bouton */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={handleClose}
          >
            <Text style={styles.buttonText}>C'est parti ! 💪</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  popup: {
    width: '100%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  quote: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
