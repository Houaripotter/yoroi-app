import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  Scale,
  Timer,
  Camera,
  Trophy,
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  Award,
  Zap,
  Clock,
  Dumbbell,
  Volume2,
  Image as ImageIcon,
  Repeat,
  CalendarDays,
  Star,
  Swords,
  Medal,
  LineChart,
  TrendingUp,
  Layout,
  HeartHandshake,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Highlight {
  icon: React.ReactNode;
  text: string;
}

interface Slide {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  highlights?: Highlight[];
}

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const slides: Slide[] = [
    {
      id: 'welcome',
      icon: <Sparkles size={64} color={colors.accent} />,
      title: 'Bienvenue Guerrier(e)',
      description: 'YOROI est ton armure digitale pour devenir la meilleure version de toi-même.',
      color: colors.accent,
      highlights: [
        { icon: <BarChart3 size={14} color={colors.accent} />, text: 'Suivi complet' },
        { icon: <Target size={14} color={colors.accent} />, text: 'Objectifs clairs' },
        { icon: <Award size={14} color={colors.accent} />, text: 'Gamification' },
      ],
    },
    {
      id: 'tracking',
      icon: <Scale size={64} color="#4ECDC4" />,
      title: 'Suivi Complet',
      description: 'Toutes tes données de santé et performance centralisées en un seul endroit.',
      color: '#4ECDC4',
      highlights: [
        { icon: <Scale size={14} color="#4ECDC4" />, text: 'Poids & composition' },
        { icon: <BarChart3 size={14} color="#4ECDC4" />, text: 'Mensurations' },
        { icon: <Clock size={14} color="#4ECDC4" />, text: 'Hydratation & sommeil' },
      ],
    },
    {
      id: 'statistics',
      icon: <LineChart size={64} color="#A78BFA" />,
      title: 'Graphiques & Statistiques',
      description: 'Visualise ton évolution avec des graphiques détaillés et des analyses précises.',
      color: '#A78BFA',
      highlights: [
        { icon: <TrendingUp size={14} color="#A78BFA" />, text: 'Évolution du poids' },
        { icon: <BarChart3 size={14} color="#A78BFA" />, text: 'Graphiques mensurations' },
        { icon: <Target size={14} color="#A78BFA" />, text: 'Suivi de performance' },
      ],
    },
    {
      id: 'competition',
      icon: <Trophy size={64} color="#F59E0B" />,
      title: 'Mode Compétiteur',
      description: 'Prépare tes combats comme un vrai guerrier professionnel.',
      color: '#F59E0B',
      highlights: [
        { icon: <Clock size={14} color="#F59E0B" />, text: 'Compte à rebours' },
        { icon: <Swords size={14} color="#F59E0B" />, text: 'Catégories officielles' },
        { icon: <BarChart3 size={14} color="#F59E0B" />, text: 'Gestion de poids' },
      ],
    },
    {
      id: 'timer',
      icon: <Timer size={64} color="#FF6B6B" />,
      title: 'Timer Multi-Modes',
      description: 'Le chronomètre parfait pour tous tes types d\'entraînement.',
      color: '#FF6B6B',
      highlights: [
        { icon: <Dumbbell size={14} color="#FF6B6B" />, text: 'Temps de repos musculation' },
        { icon: <Zap size={14} color="#FF6B6B" />, text: 'Rounds sans extinction écran' },
        { icon: <Volume2 size={14} color="#FF6B6B" />, text: 'JJB, Boxe, HIIT, Tabata' },
      ],
    },
    {
      id: 'transformation',
      icon: <Camera size={64} color="#45B7D1" />,
      title: 'Ta Transformation',
      description: 'Visualise tes progrès physiques au fil du temps.',
      color: '#45B7D1',
      highlights: [
        { icon: <ImageIcon size={14} color="#45B7D1" />, text: 'Photos avant/après' },
        { icon: <Repeat size={14} color="#45B7D1" />, text: 'Comparaison interactive' },
        { icon: <CalendarDays size={14} color="#45B7D1" />, text: 'Historique complet' },
      ],
    },
    {
      id: 'gamification',
      icon: <Trophy size={64} color="#FFD700" />,
      title: 'Progression Gamifiée',
      description: 'Reste motivé avec un système de progression addictif.',
      color: '#FFD700',
      highlights: [
        { icon: <Star size={14} color="#FFD700" />, text: 'Système de XP' },
        { icon: <Swords size={14} color="#FFD700" />, text: 'Grades (Samurai, Ninja...)' },
        { icon: <Medal size={14} color="#FFD700" />, text: '50+ badges à débloquer' },
      ],
    },
    {
      id: 'final',
      icon: <HeartHandshake size={64} color="#EC4899" />,
      title: '100% Gratuit',
      description: 'YOROI est entièrement gratuit. L\'app vient de sortir, sois indulgent s\'il y a des bugs.',
      color: '#EC4899',
      highlights: [
        { icon: <Layout size={14} color="#EC4899" />, text: 'Mode Condensé & Mode Light' },
        { icon: <Sparkles size={14} color="#EC4899" />, text: 'Aucun achat, aucun abonnement' },
        { icon: <HeartHandshake size={14} color="#EC4899" />, text: 'Boîte à idées dans Support' },
      ],
    },
  ];

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/mode-selection');
    }
  };

  const skipToSetup = () => {
    router.replace('/mode-selection');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => {
    // Animation pour l'icône
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width }]}>
        {/* Icon avec cercle de fond animé */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: item.color + '20',
              transform: [{ scale }],
              opacity,
            }
          ]}
        >
          {item.icon}
        </Animated.View>

        {/* Titre - TOUJOURS VISIBLE */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {item.title}
        </Text>

        {/* Description - TOUJOURS VISIBLE */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>

        {/* Highlights */}
        {item.highlights && item.highlights.length > 0 && (
          <View style={styles.highlightsContainer}>
            {item.highlights.map((highlight, idx) => (
              <View key={idx} style={[styles.highlightItem, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.highlightIcon}>{highlight.icon}</View>
                <Text style={[styles.highlightText, { color: colors.textPrimary }]}>
                  {highlight.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo en haut */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo2010.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.logoText, { color: colors.textPrimary }]}>
          YOROI
        </Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
      />

      {/* Indicateurs */}
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Bouton */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={goToNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? "C'est parti !" : 'Continuer'}
          </Text>
          <ChevronRight size={22} color="#FFF" />
        </TouchableOpacity>

        {/* Skip */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipToSetup}
          >
            <Text style={[styles.skipText, { color: colors.textMuted }]}>
              Passer
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
    letterSpacing: 4,
  },

  // Slide
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },

  // Highlights
  highlightsContainer: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    paddingHorizontal: 20,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  highlightIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    marginTop: 16,
    padding: 10,
  },
  skipText: {
    fontSize: 15,
  },
});
