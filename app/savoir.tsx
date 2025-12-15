import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
  Linking,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { 
  Heart, 
  UtensilsCrossed, 
  Bed, 
  TrendingUp, 
  Droplet,
  Activity,
  ChevronDown,
  ChevronUp,
  Scale,
  Wheat,
  Clock,
  Mountain,
  Footprints,
  Calculator,
} from 'lucide-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ScienceCard {
  id: string;
  title: string;
  icon: string;
  category: string;
  content: {
    what: string;
    why: string;
    how: string;
    sourceName: string;
    sourceUrl: string;
  };
}

const scienceData: ScienceCard[] = [
  {
    id: '1',
    title: "La Marche Inclinée (LISS)",
    icon: "slope-uphill",
    category: "Cardio",
    content: {
      what: "Marcher sur un tapis avec une inclinaison (12-15%) à vitesse modérée (4-5 km/h).",
      why: "L'inclinaison augmente la dépense énergétique de +50% vs le plat sans l'impact articulaire de la course. Une étude prouve qu'elle recrute massivement la chaîne postérieure (fessiers/ischios) et élève le métabolisme post-effort.",
      how: "Protocole '12-3-30' ou variante : 12% de pente, 5 km/h, 30 min. Idéal en fin de séance musculation.",
      sourceName: "Étude : Ehlen et al. (2011) - J Strength Cond Res",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/21904245/"
    }
  },
  {
    id: '2',
    title: "Déficit Calorique : La Loi Physique",
    icon: "scale-balance",
    category: "Nutrition",
    content: {
      what: "Consommer moins d'énergie que ton corps n'en dépense. C'est la seule condition physiologique obligatoire pour perdre du gras.",
      why: "C'est la Première Loi de la Thermodynamique. Peu importe le régime (Keto, Jeûne, Paleo), s'il n'y a pas de déficit, il n'y a pas de perte de gras. Kevin Hall (NIH) a prouvé que c'est le bilan énergétique qui pilote le poids, pas l'insuline seule.",
      how: "Calcule ton maintien (TDEE) et retire 300 à 500 kcal. Ne descends jamais sous ton métabolisme de base (BMR).",
      sourceName: "Étude : Hall et al. (2017) - NIH / Am J Clin Nutr",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/28765272/"
    }
  },
  {
    id: '3',
    title: "La Zone 2 : Usine à Mitochondries",
    icon: "heart-pulse",
    category: "Endurance",
    content: {
      what: "L'intensité où le lactate reste stable (< 2 mmol/L). Tu peux tenir une conversation.",
      why: "C'est la seule zone qui améliore la 'flexibilité métabolique' : la capacité de tes cellules à utiliser le gras comme carburant principal. San Millán a prouvé que c'est le marqueur #1 de la santé métabolique.",
      how: "45-60 min en continu, 1 à 2 fois/semaine. Reste strict : si tu es essoufflé, tu perds les bénéfices mitochondriaux.",
      sourceName: "Étude : San Millán & Brooks (2018) - Cell Metab",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/29283004/"
    }
  },
  {
    id: '4',
    title: "Protéines & TEF",
    icon: "food-steak",
    category: "Nutrition",
    content: {
      what: "Le macronutriment bâtisseur.",
      why: "L'Effet Thermique (TEF) des protéines est de 20-30%. Pour 100kcal ingérées, 25 sont brûlées par la digestion (contre 3% pour le gras). De plus, elles sont les plus rassasiantes via la sécrétion de l'hormone PYY.",
      how: "Vise 1.6g à 2.2g par kg de poids. Une source à chaque repas.",
      sourceName: "Consensus : ISSN Position Stand (2017)",
      sourceUrl: "https://jissn.biomedcentral.com/articles/10.1186/s12970-017-0177-8"
    }
  },
  {
    id: '5',
    title: "Fibres : L'Ozempic Naturel",
    icon: "barley",
    category: "Nutrition",
    content: {
      what: "Glucides non digestibles présents dans les végétaux.",
      why: "Les fibres solubles gonflent dans l'estomac et déclenchent la libération de GLP-1 (l'hormone de satiété imitée par les médicaments). Elles nourrissent aussi le microbiote qui régule le poids.",
      how: "Mange 30g de fibres par jour (Légumes verts, avoine, graines de chia, pommes). Mange tes légumes en premier dans le repas.",
      sourceName: "Recherche : Slavin (2005) - Nutrition",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15797686/"
    }
  },
  {
    id: '6',
    title: "Sommeil & Risque de Blessure",
    icon: "bed-clock",
    category: "Récupération",
    content: {
      what: "Le pilier oublié de la performance.",
      why: "Dormir < 8h augmente le risque de blessure de 1.7x. Le manque de sommeil élève le cortisol (catabolique) et bloque l'hormone de croissance. C'est pendant la nuit que le gras s'oxyde et le muscle se répare.",
      how: "Chambre fraîche (18°C). Pas d'écrans 1h avant (lumière bleue bloque la mélatonine).",
      sourceName: "Étude : Milewski et al. (2014) - J Pediatr Orthop",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/25028798/"
    }
  },
  {
    id: '7',
    title: "Hydratation & Thermogenèse",
    icon: "water",
    category: "Métabolisme",
    content: {
      what: "L'impact de l'eau sur la dépense énergétique.",
      why: "Boire 500ml d'eau augmente le métabolisme de 30% pendant l'heure qui suit (thermogenèse induite par l'eau). Une déshydratation de 2% baisse les performances de 10-20%.",
      how: "Bois 500ml d'eau dès le réveil. Bois 1 verre avant chaque repas.",
      sourceName: "Étude : Boschmann et al. (2003) - JCEM",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/14671205/"
    }
  },
  {
    id: '8',
    title: "NEAT : L'Activité Invisible",
    icon: "walk",
    category: "Activité",
    content: {
      what: "Non-Exercise Activity Thermogenesis (Activité hors sport).",
      why: "Le Dr Levine a prouvé que la différence entre une personne mince et en surpoids réside souvent dans ces 2h de mouvement inconscient par jour. C'est 500 à 800 kcal 'gratuites'.",
      how: "Téléphone debout. Gare-toi loin. Prends les escaliers. Vise 8000 pas hors séance.",
      sourceName: "Recherche : Levine (2002) - Science",
      sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/12468415/"
    }
  },
];

const getIcon = (iconName: string, size: number = 24, color: string) => {
  switch (iconName) {
    case 'heart-pulse':
      return <Heart size={size} color={color} strokeWidth={2.5} />;
    case 'food-steak':
      return <UtensilsCrossed size={size} color={color} strokeWidth={2.5} />;
    case 'bed':
    case 'bed-clock':
      return <Bed size={size} color={color} strokeWidth={2.5} />;
    case 'trending-up':
      return <TrendingUp size={size} color={color} strokeWidth={2.5} />;
    case 'slope-uphill':
      return <Mountain size={size} color={color} strokeWidth={2.5} />;
    case 'scale':
    case 'scale-balance':
      return <Scale size={size} color={color} strokeWidth={2.5} />;
    case 'wheat':
    case 'barley':
      return <Wheat size={size} color={color} strokeWidth={2.5} />;
    case 'water':
      return <Droplet size={size} color={color} strokeWidth={2.5} />;
    case 'activity':
      return <Activity size={size} color={color} strokeWidth={2.5} />;
    case 'walk':
      return <Footprints size={size} color={color} strokeWidth={2.5} />;
    default:
      return <Activity size={size} color={color} strokeWidth={2.5} />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Cardio':
    case 'Endurance':
      return '#FF6B9D'; // Light Red/Pink
    case 'Nutrition':
      return '#90EE90'; // Light Green
    case 'Récupération':
      return '#87CEEB'; // Light Blue (Sleep)
    case 'Métabolisme':
      return '#DDA0DD'; // Light Purple
    case 'Activité':
      return '#FFD700'; // Light Gold/Yellow
    default:
      return '#D3D3D3'; // Light Gray
  }
};

const getCategoryHeaderColor = (category: string) => {
  switch (category) {
    case 'Cardio':
    case 'Endurance':
      return '#FFE4E1'; // Light Red/Pink background
    case 'Nutrition':
      return '#E8F5E9'; // Light Green background
    case 'Récupération':
      return '#E3F2FD'; // Light Blue background
    case 'Métabolisme':
      return '#F3E5F5'; // Light Purple background
    case 'Activité':
      return '#FFF9C4'; // Light Yellow background
    default:
      return '#F5F5F5'; // Light Gray background
  }
};

export default function SavoirScreen() {
  const router = useRouter();
  const { colors: themeColors, isDark } = useTheme();
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleSourcePress = async (url: string) => {
    try {
      // Clean URL from markdown format if present
      const cleanUrl = url.replace(/\[([^\]]+)\]\(([^)]+)\)/, '$2');
      const canOpen = await Linking.canOpenURL(cleanUrl);
      if (canOpen) {
        await Linking.openURL(cleanUrl);
      } else {
        console.error('Impossible d\'ouvrir l\'URL:', cleanUrl);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'URL:', error);
    }
  };

  return (
    <ScreenWrapper noPadding>
      <Header title="LABO" showBack />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: themeColors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header description */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Outils cliniques & Base de donnees scientifique
          </Text>
        </View>

        {/* SECTION 1: OUTILS CLINIQUES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>OUTILS CLINIQUES</Text>
          
          <TouchableOpacity
            style={styles.clinicalToolCard}
            onPress={() => router.push('/calculator' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.clinicalToolContent}>
              <View style={styles.clinicalToolIconContainer}>
                <Calculator size={28} color="#1F2937" strokeWidth={2.5} />
              </View>
              <View style={styles.clinicalToolText}>
                <Text style={styles.clinicalToolTitle}>Calculateur Métabolique</Text>
                <Text style={styles.clinicalToolSubtitle}>BMR & TDEE (Mifflin-St Jeor)</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: BASE DE DONNÉES */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>BASE DE DONNÉES</Text>
          
          {/* Scientific Cards - Accordion */}
          <View style={styles.cardsContainer}>
          {scienceData.map((card) => {
            const categoryColor = getCategoryColor(card.category);
            const isExpanded = expandedCards.has(card.id);
            
            const headerBgColor = getCategoryHeaderColor(card.category);
            
            return (
              <View key={card.id} style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
                {/* Header with Colored Background */}
                <TouchableOpacity
                  style={[styles.cardHeaderButton, { backgroundColor: headerBgColor }]}
                  onPress={() => toggleCard(card.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIconContainer, { backgroundColor: '#FFFFFF' }]}>
                      {getIcon(card.icon, 24, categoryColor)}
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={[styles.cardCategory, { color: categoryColor }]}>
                        {card.category}
                      </Text>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
                        {card.title}
                      </Text>
                    </View>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={20} color={categoryColor} strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={20} color={categoryColor} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>

                {/* Expanded Content - White Background */}
                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {/* C'est quoi ? */}
                    <View style={styles.sectionFirst}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>C'est quoi ?</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {card.content.what}
                      </Text>
                    </View>

                    {/* Pourquoi ça marche ? */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Pourquoi ça marche ?</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {card.content.why}
                      </Text>
                    </View>

                    {/* Comment l'appliquer ? */}
                    <View style={styles.section}>
                      <Text style={[styles.cardSectionHeader, { color: categoryColor }]}>Comment l'appliquer ?</Text>
                      <Text style={[styles.sectionBody, { color: themeColors.textSecondary }]}>
                        {card.content.how}
                      </Text>
                    </View>

                    {/* LA SOURCE */}
                    <TouchableOpacity
                      style={[styles.sourceButton, { backgroundColor: `${categoryColor}15` }]}
                      onPress={() => handleSourcePress(card.content.sourceUrl)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sourceButtonText, { color: categoryColor }]}>
                        {card.content.sourceName}
                      </Text>
                      <Text style={[styles.sourceButtonArrow, { color: categoryColor }]}>→</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    gap: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 28,
    padding: 0,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    flex: 1,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionFirst: {
    marginTop: 0,
  },
  section: {
    marginTop: 24,
  },
  cardSectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
    fontWeight: '500',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  sourceButtonText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  },
  sourceButtonArrow: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  disclaimerBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#424242',
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  disclaimerBold: {
    fontWeight: '800',
    color: '#212121',
    fontSize: 15,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  clinicalToolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  clinicalToolContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clinicalToolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clinicalToolText: {
    flex: 1,
    gap: 4,
  },
  clinicalToolTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  clinicalToolSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
