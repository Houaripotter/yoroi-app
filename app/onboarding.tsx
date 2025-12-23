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
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
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
      title: 'Bienvenue Guerrier',
      description: 'YOROI est ton armure digitale pour devenir la meilleure version de toi-même.',
      color: colors.accent,
    },
    {
      id: 'tracking',
      icon: <Scale size={64} color="#4ECDC4" />,
      title: 'Suivi Intelligent',
      description: 'Poids, composition corporelle, mensurations, hydratation... Tout en un seul endroit avec des prédictions personnalisées.',
      color: '#4ECDC4',
    },
    {
      id: 'timer',
      icon: <Timer size={64} color="#FF6B6B" />,
      title: 'Timer Multi-Modes',
      description: 'Musculation, JJB, MMA, Boxe, Tabata, EMOM... Le timer parfait pour chaque type d\'entraînement.',
      color: '#FF6B6B',
    },
    {
      id: 'transformation',
      icon: <Camera size={64} color="#45B7D1" />,
      title: 'Ta Transformation',
      description: 'Prends des photos, compare ton évolution et visualise tes progrès au fil du temps.',
      color: '#45B7D1',
    },
    {
      id: 'gamification',
      icon: <Trophy size={64} color="#FFD700" />,
      title: 'Reste Motivé',
      description: 'Gagne des XP, monte en grade, débloque des badges et reste motivé chaque jour !',
      color: '#FFD700',
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

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <View style={[styles.slide, { width }]}>
      {/* Icon avec cercle de fond */}
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        {item.icon}
      </View>

      {/* Titre - TOUJOURS VISIBLE */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {item.title}
      </Text>

      {/* Description - TOUJOURS VISIBLE */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
    </View>
  );

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
