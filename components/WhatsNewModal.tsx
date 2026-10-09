/**
 * WhatsNewModal — Yoroi
 *
 * S'affiche automatiquement une seule fois après chaque mise à jour.
 * Compare la version stockée en AsyncStorage avec la version courante.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, X, Check } from 'lucide-react-native';

const CURRENT_VERSION = '2.4.2';
const STORAGE_KEY = 'WHATS_NEW_LAST_SEEN_VERSION';

const CHANGES = [
  {
    title: 'ABONNEMENT PREMIUM',
    items: [
      'Yoroi est maintenant freemium, toujours gratuit à télécharger',
      'Abonnement mensuel ou annuel avec essai gratuit inclus',
      'Stats avancées, carnet illimité et tous les outils débloqués',
      'Restauration des achats depuis ton compte App Store',
    ],
  },
  {
    title: 'CORRECTIONS DE BUGS',
    items: [
      'Crash au démarrage sur certains appareils, corrigé',
      'Carnet : onglets Vidéos et Progression stabilisés',
      'Gestures de navigation corrigés (swipe back)',
      'Doublons dans les données HealthKit réglés',
    ],
  },
  {
    title: 'AMÉLIORATIONS',
    items: [
      'Popups premium avec icônes et couleurs par section',
      'Navigation entre onglets plus fluide',
      'Interface nettoyée pour le lancement officiel',
    ],
  },
];

export function WhatsNewModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(lastSeen => {
      if (lastSeen !== CURRENT_VERSION) {
        setVisible(true);
      }
    });
  }, []);

  const handleClose = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header gradient */}
          <LinearGradient
            colors={['#4C1D95', '#7C3AED', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <X size={15} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.iconCircle}>
              <Sparkles size={26} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <Text style={styles.headerTitle}>Nouveautés</Text>
            <Text style={styles.headerVersion}>Version 2.4.2</Text>
          </LinearGradient>

          {/* Contenu scrollable */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {CHANGES.map((section, sIdx) => (
              <View key={sIdx} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item, iIdx) => (
                  <View key={iIdx} style={styles.itemRow}>
                    <View style={styles.checkCircle}>
                      <Check size={10} color="#7C3AED" strokeWidth={3} />
                    </View>
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
            <Text style={styles.thanks}>
              Merci pour vos retours, continuez, c'est ce qui fait grandir l'app.
            </Text>
          </ScrollView>

          {/* Bouton bas */}
          <View style={styles.ctaWrapper}>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.85}
              style={styles.ctaBtn}
            >
              <LinearGradient
                colors={['#7C3AED', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGrad}
              >
                <Text style={styles.ctaText}>C'est noté</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  header: {
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerVersion: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#7C3AED',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
    marginRight: 10,
  },
  itemText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    lineHeight: 19,
  },
  thanks: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 17,
  },
  ctaWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
    backgroundColor: '#FFFFFF',
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
  },
  ctaGrad: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
});
