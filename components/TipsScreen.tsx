import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { X, BookOpen, Heart, Moon, Footprints, ChevronRight, Sparkles, ExternalLink, Droplet } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';

interface TipsScreenProps {
  visible: boolean;
  onClose: () => void;
}

// ============================================
// 📚 FICHES TECHNIQUES
// ============================================

interface Tip {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  gradient: [string, string];
  content: {
    intro: string;
    science: string;
    practice: string;
      source?: string;
      sourceUrl?: string;
  };
}

const TIPS: Tip[] = [
  {
    id: 'zone2',
    title: 'La Zone 2',
    subtitle: 'Cardio fondamentale',
    icon: <Heart size={24} color="#FFFFFF" />,
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF8E53'],
    content: {
      intro: "La Zone 2 correspond à une intensité d'effort où tu peux encore tenir une conversation. C'est entre 60-70% de ta fréquence cardiaque maximale.",
      science: "À cette intensité, ton corps utilise principalement les graisses comme source d'énergie. Tu développes tes mitochondries (les \"usines à énergie\" de tes cellules) et améliores ta capacité à brûler les graisses, même au repos.",
      practice: "• 30-60 minutes de marche rapide, vélo ou natation\n• Tu dois pouvoir parler sans être essoufflé\n• 2-3 séances par semaine minimum\n• Idéal le matin à jeun pour maximiser la lipolyse",
      source: "Dr. Peter Attia, Inigo San Millán",
      sourceUrl: "https://www.google.com/search?q=Peter+Attia+Zone+2+cardio",
    },
  },
  {
    id: 'incline',
    title: 'Marche Inclinée',
    subtitle: 'Le hack métabolique',
    icon: <Footprints size={24} color="#FFFFFF" />,
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A08D'],
    content: {
      intro: "Marcher sur un tapis à 12-15% d'inclinaison à 5-6 km/h est l'un des exercices les plus efficaces pour brûler des calories sans stresser ton corps.",
      science: "L'inclinaison recrute davantage les muscles des fessiers, ischio-jambiers et mollets. Tu brûles jusqu'à 3x plus de calories qu'une marche plate, tout en restant en Zone 2 (pas de pic de cortisol).",
      practice: "• 12-15% d'inclinaison\n• 5-6 km/h de vitesse\n• 30-45 minutes par session\n• Ne pas se tenir aux barres !\n• Parfait en fin de séance muscu",
      source: "12-3-30 Method, Lauren Giraldo",
      sourceUrl: "https://www.google.com/search?q=12-3-30+method+Lauren+Giraldo",
    },
  },
  {
    id: 'sleep',
    title: 'Sommeil & Récup',
    subtitle: 'Le facteur oublié',
    icon: <Moon size={24} color="#FFFFFF" />,
    color: '#A29BFE',
    gradient: ['#A29BFE', '#6C5CE7'],
    content: {
      intro: "Le sommeil est le moment où ton corps se répare et où les hormones de croissance sont libérées. Sans bon sommeil, pas de bons résultats.",
      science: "Pendant le sommeil profond, ton corps sécrète l'hormone de croissance (GH) qui aide à la récupération musculaire et à la combustion des graisses. Le manque de sommeil augmente la ghréline (hormone de la faim) et diminue la leptine (satiété).",
      practice: "• 7-9 heures de sommeil par nuit\n• Se coucher et se lever à heures fixes\n• Éviter les écrans 1h avant le coucher\n• Chambre fraîche (18-20°C)\n• Pas de caféine après 14h",
      source: "Matthew Walker, Dr. Andrew Huberman",
      sourceUrl: "https://www.google.com/search?q=Matthew+Walker+Andrew+Huberman+sleep",
    },
  },
  {
    id: 'hydration',
    title: 'Hydratation & Performance',
    subtitle: 'L\'eau, carburant essentiel',
    icon: <Droplet size={24} color="#FFFFFF" />,
    color: '#32ADE6',
    gradient: ['#32ADE6', '#1E90FF'],
    content: {
      intro: "L'hydratation est cruciale pour les performances physiques et la récupération. Une déshydratation même légère peut impacter significativement tes résultats.",
      science: "Une déshydratation de 2% réduit les performances de 20%. L'eau transporte les nutriments, régule la température corporelle, et facilite l'élimination des déchets métaboliques. Pendant l'effort, tu perds de l'eau par la transpiration, et cette perte doit être compensée.",
      practice: "• 35-40ml d'eau par kg de poids corporel par jour\n• Boire 500ml 2h avant l'entraînement\n• 150-250ml toutes les 15-20min pendant l'effort\n• Ajouter du sel si effort > 1h\n• Surveiller la couleur de l'urine (jaune clair = bien hydraté)",
      source: "Consensus médical général, ACSM (American College of Sports Medicine)",
      sourceUrl: "https://www.google.com/search?q=ACSM+hydration+performance",
    },
  },
];

export function TipsScreen({ visible, onClose }: TipsScreenProps) {
  const [selectedTip, setSelectedTip] = useState<Tip | null>(null);

  const TipCard = ({ tip }: { tip: Tip }) => (
    <TouchableOpacity
      style={styles.tipCard}
      onPress={() => setSelectedTip(tip)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={tip.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tipCardGradient}
      >
        <View style={styles.tipCardContent}>
          <View style={styles.tipIconContainer}>
            {tip.icon}
          </View>
          <View style={styles.tipTextContainer}>
            <Text style={styles.tipTitle}>{tip.title}</Text>
            <Text style={styles.tipSubtitle}>{tip.subtitle}</Text>
          </View>
          <ChevronRight size={24} color="rgba(255,255,255,0.7)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#2D3436" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>Zone Astuces</Text>
          <View style={styles.headerIcon}>
            <BookOpen size={24} color="#4ECDC4" strokeWidth={2.5} />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View style={styles.introCard}>
            <Sparkles size={24} color="#F1C40F" />
            <Text style={styles.introText}>
              Savoir, c'est pouvoir. Découvre les techniques validées par la science pour optimiser ta transformation.
            </Text>
          </View>

          {/* Tips */}
          {TIPS.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </ScrollView>

        {/* Detail Modal */}
        {selectedTip && (
          <Modal
            visible={!!selectedTip}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setSelectedTip(null)}
          >
            <View style={styles.detailContainer}>
              <LinearGradient
                colors={selectedTip.gradient}
                style={styles.detailHeader}
              >
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={() => setSelectedTip(null)}
                >
                  <X size={24} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
                <View style={styles.detailIconContainer}>
                  {selectedTip.icon}
                </View>
                <Text style={styles.detailTitle}>{selectedTip.title}</Text>
                <Text style={styles.detailSubtitle}>{selectedTip.subtitle}</Text>
              </LinearGradient>

              <ScrollView 
                style={styles.detailScroll}
                contentContainerStyle={styles.detailContent}
              >
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📖 C'est quoi ?</Text>
                  <Text style={styles.detailText}>{selectedTip.content.intro}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>🔬 Pourquoi ça marche ?</Text>
                  <Text style={styles.detailText}>{selectedTip.content.science}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>💪 En pratique</Text>
                  <Text style={styles.detailText}>{selectedTip.content.practice}</Text>
                </View>

                {selectedTip.content.source && (
                  <TouchableOpacity
                    style={styles.sourceContainer}
                    onPress={() => {
                      if (selectedTip.content.sourceUrl) {
                        Linking.openURL(selectedTip.content.sourceUrl);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={!selectedTip.content.sourceUrl}
                  >
                    <View style={styles.sourceRow}>
                      <View style={styles.sourceTextContainer}>
                        <Text style={styles.sourceLabel}>Sources :</Text>
                        <Text style={styles.sourceText}>{selectedTip.content.source}</Text>
                      </View>
                      {selectedTip.content.sourceUrl && (
                        <ExternalLink size={18} color="#007AFF" strokeWidth={2.5} />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    letterSpacing: -0.3,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 8,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6914',
    lineHeight: 20,
  },
  tipCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  tipCardGradient: {
    padding: 20,
  },
  tipCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tipIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tipSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },

  // Detail
  detailContainer: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  detailHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  detailCloseButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  detailSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    padding: 20,
    gap: 20,
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 24,
  },
  sourceContainer: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourceTextContainer: {
    flex: 1,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B2BEC3',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    fontStyle: 'italic',
  },
});
