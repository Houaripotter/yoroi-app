import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import {
  Wrench,
  X,
  Timer,
  BookOpen,
  Heart,
  Share2,
  Camera,
  Target,
  Trophy,
  Settings,
  Calculator,
  Utensils,
  Droplet,
  Moon,
  Dumbbell,
  Swords,
  Stethoscope,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { logger } from '@/lib/security/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ToolOption {
  id: string;
  icon: any;
  label: string;
  route: string;
  colors: [string, string];
  isDefault?: boolean;
}

// Outils par defaut (principaux)
const DEFAULT_TOOLS: ToolOption[] = [
  { id: 'timer', icon: Timer, label: 'Timer', route: '/timer', colors: ['#4ECDC4', '#3DBDB5'], isDefault: true },
  { id: 'journal', icon: BookOpen, label: 'Carnet', route: '/training-journal', colors: ['#F97316', '#EA580C'], isDefault: true },
  { id: 'infirmerie', icon: Heart, label: 'Infirmerie', route: '/infirmary', colors: ['#EF4444', '#DC2626'], isDefault: true },
  { id: 'share', icon: Share2, label: 'Partager', route: '/share-hub', colors: ['#EC4899', '#BE185D'], isDefault: true },
  { id: 'photos', icon: Camera, label: 'Photos', route: '/photos', colors: ['#8B5CF6', '#7C3AED'], isDefault: true },
  { id: 'goals', icon: Target, label: 'Objectifs', route: '/training-goals', colors: ['#10B981', '#059669'], isDefault: true },
  { id: 'records', icon: Trophy, label: 'Records', route: '/records', colors: ['#F59E0B', '#D97706'], isDefault: true },
];

// Outils additionnels (optionnels)
const ADDITIONAL_TOOLS: ToolOption[] = [
  { id: 'calculator', icon: Calculator, label: 'Calculs', route: '/calculators', colors: ['#F59E0B', '#D97706'] },
  { id: 'fasting', icon: Utensils, label: 'Jeune', route: '/fasting', colors: ['#A855F7', '#9333EA'] },
  { id: 'hydration', icon: Droplet, label: 'Hydratation', route: '/hydration', colors: ['#3B82F6', '#2563EB'] },
  { id: 'sleep', icon: Moon, label: 'Sommeil', route: '/sleep', colors: ['#6366F1', '#4F46E5'] },
  { id: 'workout', icon: Dumbbell, label: 'Seance', route: '/add-training', colors: ['#EF4444', '#DC2626'] },
  { id: 'coaches-clubs', icon: Swords, label: 'Coachs & Clubs', route: '/partners', colors: ['#818CF8', '#6366F1'] },
  { id: 'health-pros', icon: Stethoscope, label: 'Pros de Santé', route: '/health-professionals', colors: ['#F87171', '#EF4444'] },
];

const TOOLS_STORAGE_KEY = '@yoroi_tools_config';

export const HomeToolsMenu: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set([...DEFAULT_TOOLS, ...ADDITIONAL_TOOLS].map(t => t.id)));
  const animation = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animations pour chaque outil (forme Y)
  const toolAnims = useRef(
    [...DEFAULT_TOOLS, ...ADDITIONAL_TOOLS].map(() => new Animated.Value(0))
  ).current;

  // Charger la configuration sauvegardee
  useEffect(() => {
    loadToolsConfig();
  }, []);

  const loadToolsConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(TOOLS_STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        setEnabledTools(new Set(config.enabled));
      }
    } catch (error) {
      logger.error('Error loading tools config:', error);
    }
  };

  const saveToolsConfig = async (enabled: Set<string>) => {
    try {
      await AsyncStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify({ enabled: Array.from(enabled) }));
    } catch (error) {
      logger.error('Error saving tools config:', error);
    }
  };

  const toggleTool = (toolId: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setEnabledTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      saveToolsConfig(newSet);
      return newSet;
    });
  };

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;

    if (!isOpen) {
      impactAsync(ImpactFeedbackStyle.Medium);
    } else {
      impactAsync(ImpactFeedbackStyle.Light);
    }

    Animated.spring(rotateAnim, {
      toValue: isOpen ? 0 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.spring(animation, {
      toValue,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();

    // Animation cascade des outils
    if (!isOpen) {
      toolAnims.forEach((anim, index) => {
        Animated.spring(anim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          delay: index * 40,
          useNativeDriver: true,
        }).start();
      });
    } else {
      toolAnims.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }

    setIsOpen(!isOpen);
  };

  const navigateToTool = (route: string) => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    toggleMenu();
    setTimeout(() => router.push(route as any), 200);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Outils additionnels en BAS de la tige (près du bouton), défaut en HAUT (branches du Y)
  const additionalActive = ADDITIONAL_TOOLS.filter(t => enabledTools.has(t.id));
  const defaultActive = DEFAULT_TOOLS.filter(t => enabledTools.has(t.id));
  const activeTools = [...additionalActive, ...defaultActive];

  // Centre de l'écran (le bouton est en bas à droite)
  const centerX = -(SCREEN_WIDTH / 2 - 50);

  // Forme Y:
  //        O   O     <- Branches (outils par défaut - toujours en haut)
  //         \ /
  //        O   O     <- Convergence
  //          |
  //          O       <- Tige (outils par défaut)
  //          O       <- Tige (outils additionnels - toujours en bas)
  //          O
  //         [+]      <- Bouton principal

  const getYPosition = (index: number, total: number) => {
    const addCount = additionalActive.length;
    const defCount = defaultActive.length;

    // Espace disponible: entre le bouton et le haut de l'écran (sous Dynamic Island)
    const topSafeMargin = 90;
    const buttonOffset = Platform.OS === 'ios' ? 115 : 95;
    const maxHeight = SCREEN_HEIGHT - buttonOffset - topSafeMargin - 50;

    // Niveaux verticaux: tige additionnelle + point convergence + paires de branches
    const branchPairLevels = Math.ceil(Math.max(defCount - 1, 0) / 2);
    const totalLevels = addCount + (defCount > 0 ? 1 : 0) + branchPairLevels;
    const vSpace = Math.min(78, Math.max(55, maxHeight / Math.max(totalLevels, 1)));

    const startY = -68;

    if (index < addCount) {
      // OUTILS ADDITIONNELS: tige droite, près du bouton
      return { x: centerX, y: startY - index * vSpace };
    }

    // OUTILS PAR DÉFAUT: forment le Y au-dessus
    const defIdx = index - addCount;
    const baseY = startY - addCount * vSpace;

    if (defIdx === 0) {
      // Point de convergence (centre)
      return { x: centerX, y: baseY };
    }

    // Branches du Y: paires qui s'écartent progressivement
    //     O       O    <- paire 3 (spread large)
    //      O     O     <- paire 2 (spread moyen)
    //       O   O      <- paire 1 (spread petit)
    //         O        <- convergence
    const pairLevel = Math.ceil(defIdx / 2);
    const isLeft = defIdx % 2 === 1;
    const spread = 30 + pairLevel * 32;

    return {
      x: centerX + (isLeft ? -spread : spread),
      y: baseY - pairLevel * vSpace,
    };
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Overlay sombre quand ouvert */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {/* Outils flottants en forme de Y */}
      {isOpen && activeTools.map((tool, index) => {
        const position = getYPosition(index, activeTools.length);
        const IconComponent = tool.icon;
        const toolAnim = toolAnims[index];

        return (
          <Animated.View
            key={tool.id}
            style={[
              styles.floatingTool,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: toolAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, position.y],
                  })},
                  { scale: toolAnim },
                ],
                opacity: toolAnim,
              }
            ]}
          >
            <TouchableOpacity
              onPress={() => navigateToTool(tool.route)}
              activeOpacity={0.8}
              style={styles.toolTouchable}
            >
              <LinearGradient
                colors={tool.colors}
                style={styles.toolButton}
              >
                <IconComponent size={22} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
              <Text style={[styles.toolLabel, { color: '#FFFFFF' }]} numberOfLines={1}>
                {tool.label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Lettre Y decorative en arriere-plan - CENTRE */}
      {isOpen && (
        <Animated.View
          style={[
            styles.yLetterContainer,
            {
              opacity: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.12],
              }),
              transform: [
                { translateX: -(SCREEN_WIDTH / 2 - 50) - 100 }, // Centre
              ],
            }
          ]}
        >
          <Svg width={200} height={300} viewBox="0 0 200 300">
            <Defs>
              <SvgLinearGradient id="yGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#8B5CF6" stopOpacity="1" />
                <Stop offset="1" stopColor="#EC4899" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M 40 0 L 100 100 L 160 0 L 140 0 L 100 70 L 60 0 Z M 90 90 L 90 300 L 110 300 L 110 90 Z"
              fill="url(#yGrad)"
            />
          </Svg>
        </Animated.View>
      )}

      {/* Bouton parametres - A GAUCHE du bouton principal (petit) */}
      {isOpen && (
        <Animated.View
          style={[
            styles.settingsButton,
            {
              opacity: animation,
              transform: [
                { translateX: -70 },
                { translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 5],
                })},
                { scale: animation },
              ],
            }
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
            activeOpacity={0.8}
            style={styles.settingsTouchable}
          >
            <View style={[styles.settingsButtonInner, { backgroundColor: 'rgba(107,114,128,0.9)' }]}>
              <Settings size={16} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bouton principal Outils */}
      <TouchableOpacity
        onPress={toggleMenu}
        activeOpacity={0.9}
        style={styles.mainButtonWrapper}
      >
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainButton}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Wrench size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal parametres */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Personnaliser les outils</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.toolsList}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>OUTILS PRINCIPAUX</Text>
              {DEFAULT_TOOLS.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <View key={tool.id} style={styles.toolRow}>
                    <View style={styles.toolInfo}>
                      <LinearGradient colors={tool.colors} style={styles.toolIconSmall}>
                        <IconComponent size={16} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={[styles.toolName, { color: colors.textPrimary }]}>{tool.label}</Text>
                    </View>
                    <Switch
                      value={enabledTools.has(tool.id)}
                      onValueChange={() => toggleTool(tool.id)}
                      trackColor={{ false: '#767577', true: tool.colors[0] }}
                      thumbColor={enabledTools.has(tool.id) ? '#FFFFFF' : '#f4f3f4'}
                    />
                  </View>
                );
              })}

              <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 20 }]}>OUTILS SUPPLEMENTAIRES</Text>
              {ADDITIONAL_TOOLS.map(tool => {
                const IconComponent = tool.icon;
                return (
                  <View key={tool.id} style={styles.toolRow}>
                    <View style={styles.toolInfo}>
                      <LinearGradient colors={tool.colors} style={styles.toolIconSmall}>
                        <IconComponent size={16} color="#FFFFFF" />
                      </LinearGradient>
                      <Text style={[styles.toolName, { color: colors.textPrimary }]}>{tool.label}</Text>
                    </View>
                    <Switch
                      value={enabledTools.has(tool.id)}
                      onValueChange={() => toggleTool(tool.id)}
                      trackColor={{ false: '#767577', true: tool.colors[0] }}
                      thumbColor={enabledTools.has(tool.id) ? '#FFFFFF' : '#f4f3f4'}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 95 : 75,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: -SCREEN_HEIGHT,
    left: -SCREEN_WIDTH + 20,
    right: -20,
    bottom: -200,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  floatingTool: {
    position: 'absolute',
    alignItems: 'center',
    bottom: 31,
    right: 11,
  },
  toolTouchable: {
    alignItems: 'center',
    gap: 4,
  },
  toolButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  toolLabel: {
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    maxWidth: 70,
    textAlign: 'center',
  },
  yLetterContainer: {
    position: 'absolute',
    bottom: -50,
    right: 11,
    zIndex: -1,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 31,
    right: 11,
    alignItems: 'center',
  },
  settingsTouchable: {
    alignItems: 'center',
    gap: 4,
  },
  settingsButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  settingsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mainButtonWrapper: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
  },
  mainButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  toolsList: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolName: {
    fontSize: 15,
    fontWeight: '600',
  },
});
