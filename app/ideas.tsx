import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Lightbulb,
  Send,
  Bug,
  Palette,
  Sparkles,
  HelpCircle,
  Mail,
  Check,
  Instagram,
  Inbox,
  ArrowDown,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT, SHADOWS, TIFFANY } from '@/constants/appTheme';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================ 
// BOÎTE À IDÉES (HURNE)
// ============================================ 

type IdeaCategory = 'feature' | 'design' | 'bug' | 'other';

const CATEGORIES = [
  { id: 'feature' as IdeaCategory, label: 'Fonctionnalité', icon: Sparkles, color: TIFFANY.accent },
  { id: 'design' as IdeaCategory, label: 'Design', icon: Palette, color: '#8B5CF6' },
  { id: 'bug' as IdeaCategory, label: 'Bug', icon: Bug, color: '#EF4444' },
  { id: 'other' as IdeaCategory, label: 'Autre', icon: HelpCircle, color: '#6B7280' },
];

export default function IdeasScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const params = useLocalSearchParams();

  const [ideaText, setIdeaText] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [isSending, setIsSending] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // Initialisation via params
  useEffect(() => {
    if (params.category && CATEGORIES.some(c => c.id === params.category)) {
      setCategory(params.category as IdeaCategory);
    }
  }, [params.category]);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'medium') => {
    if (Platform.OS !== 'web') {
      if (type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'light') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const sendIdea = async () => {
    if (!ideaText.trim()) {
      showPopup('Oups', 'Écris ton idée avant de l\'envoyer !', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    triggerHaptic('light');
    setIsSending(true);

    // Démarrer l'animation de l'enveloppe
    setTimeout(() => {
      setShowAnimation(true);
      triggerHaptic('medium');

      // Simuler la fin de l\'envoi
      setTimeout(() => {
        setIsSending(false);
        setIsSent(true);
        triggerHaptic('success');
        
        // Reset après un délai
        setTimeout(() => {
          setShowAnimation(false);
          setIsSent(false);
          setIdeaText('');
          // Optionnel: retour arrière ou rester sur la page
        }, 3000);
      }, 1500);
    }, 200);
  };

  const sendByEmail = async () => {
    try {
      const categoryLabel = CATEGORIES.find(c => c.id === category)?.label || 'Autre';
      const subject = encodeURIComponent(`[Yoroi] ${categoryLabel}: Suggestion`);
      const body = encodeURIComponent(`Catégorie: ${categoryLabel}\n\n${ideaText}\n\n---\nEnvoyé depuis l\'app Yoroi`);
      const mailto = `mailto:yoroiapp@hotmail.com?subject=${subject}&body=${body}`;

      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await safeOpenURL(mailto);
      } else {
        showPopup(
          'Email non configuré',
          'Impossible d\'ouvrir ton application mail. Tu peux nous écrire directement à yoroiapp@hotmail.com',
          [{ text: 'OK', style: 'primary' }]
        );
      }
    } catch (error) {
      showPopup('Erreur', 'Impossible d\'ouvrir l\'application mail.', [{ text: 'OK', style: 'primary' }]);
    }
  };

  const sendByInstagram = () => {
    const instagramUrl = 'instagram://user?username=yoroiapp';
    const webUrl = 'https://www.instagram.com/yoroiapp';

    Linking.canOpenURL(instagramUrl).then(supported => {
      if (supported) {
        safeOpenURL(instagramUrl);
      } else {
        safeOpenURL(webUrl);
      }
    }).catch(() => {
      showPopup('Erreur', 'Impossible d\'ouvrir Instagram', [{ text: 'OK', style: 'primary' }]);
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Boîte à Idées</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Visual Hurne Section */}
          <View style={styles.hurneContainer}>
            <MotiView
              from={{ opacity: 0, scale: 0.5, translateY: 20 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              style={[styles.hurneBase, { backgroundColor: colors.card, borderColor: TIFFANY.accent }]}
            >
              <View style={[styles.hurneSlot, { backgroundColor: colors.background }]} />
              <Inbox size={48} color={TIFFANY.accent} strokeWidth={1.5} />
              
              {/* Animation de l\'enveloppe */}
              <AnimatePresence>
                {showAnimation && !isSent && (
                  <MotiView
                    from={{ opacity: 0, translateY: 100, scale: 1, rotate: '0deg' }}
                    animate={{ opacity: 1, translateY: -20, scale: 0.2, rotate: '15deg' }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: 'timing', duration: 1000 }}
                    style={styles.envelopeAnimation}
                  >
                    <View style={[styles.envelopeInner, { backgroundColor: TIFFANY.accent }]}>
                      <Mail size={40} color="#FFF" />
                    </View>
                  </MotiView>
                )}
              </AnimatePresence>

              {/* Message de succès */}
              <AnimatePresence>
                {isSent && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={styles.successMessage}
                  >
                    <View style={styles.successIcon}>
                      <Check size={32} color={COLORS.success} />
                    </View>
                    <Text style={[styles.successText, { color: colors.text }]}>Idée reçue ! Merci !</Text>
                  </MotiView>
                )}
              </AnimatePresence>
            </MotiView>
            
            {!showAnimation && !isSent && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={styles.hurneHint}
              >
                <ArrowDown size={16} color={colors.textMuted} />
                <Text style={[styles.hurneHintText, { color: colors.textMuted }]}>
                  Envoie ton message dans la hurne
                </Text>
              </MotiView>
            )}
          </View>

          {/* Category Selection */}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TYPE DE MESSAGE</Text>
          <View style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBtn,
                    {
                      backgroundColor: isSelected ? `${cat.color}20` : colors.card,
                      borderColor: isSelected ? cat.color : colors.border,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setCategory(cat.id);
                  }}
                >
                  <Icon size={18} color={isSelected ? cat.color : colors.textMuted} />
                  <Text style={[styles.categoryText, { color: isSelected ? colors.text : colors.textSecondary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Idea Input */}
          <View style={[styles.inputContainer, { marginTop: SPACING.xl }]}>
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Décris ton idée, un bug ou une amélioration..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={ideaText}
                onChangeText={setIdeaText}
                maxLength={1000}
                editable={!isSending && !isSent}
              />
              <View style={styles.inputFooter}>
                <Lightbulb size={14} color={colors.textMuted} />
                <Text style={[styles.charCount, { color: colors.textMuted }]}>{ideaText.length}/1000</Text>
              </View>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: isSent ? COLORS.success : TIFFANY.accent },
              (!ideaText.trim() || isSending || isSent) && styles.sendBtnDisabled,
            ]}
            onPress={sendIdea}
            disabled={!ideaText.trim() || isSending || isSent}
          >
            {isSending ? (
              <Text style={styles.sendBtnText}>Envoi en cours...</Text>
            ) : isSent ? (
              <>
                <Check size={22} color="#FFF" />
                <Text style={styles.sendBtnText}>C\'est envoyé !</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#FFF" />
                <Text style={[styles.sendBtnText, { color: '#FFF' }]}>
                  Glisser dans la hurne
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Alternative: Instagram */}
          <View style={styles.alternativeButtons}>
            <TouchableOpacity style={styles.emailBtn} onPress={sendByInstagram}>
              <Instagram size={18} color={colors.textSecondary} />
              <Text style={[styles.emailBtnText, { color: colors.textSecondary }]}>Discute avec nous sur Instagram</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.emailBtn} onPress={sendByEmail}>
              <Mail size={16} color={colors.textMuted} />
              <Text style={[styles.emailBtnText, { color: colors.textMuted, fontSize: 12 }]}>Un souci ? Contacte le support</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
        <PopupComponent />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT.size.xl,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
  },

  // Hurne Visual
  hurneContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  hurneBase: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glowSubtle,
    position: 'relative',
    overflow: 'visible',
  },
  hurneSlot: {
    position: 'absolute',
    top: 20,
    width: 60,
    height: 8,
    borderRadius: 4,
    opacity: 0.5,
  },
  hurneHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
  },
  hurneHintText: {
    fontSize: FONT.size.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  envelopeAnimation: {
    position: 'absolute',
    bottom: -100,
    zIndex: 10,
  },
  envelopeInner: {
    width: 80,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  successMessage: {
    position: 'absolute',
    top: -40,
    alignItems: 'center',
    width: 200,
  },
  successIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: FONT.size.md,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Categories
  sectionTitle: {
    fontSize: FONT.size.xs,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  categoryText: {
    fontSize: FONT.size.sm,
    fontWeight: '700',
  },

  // Input
  inputContainer: {
    width: '100%',
  },
  inputCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  textInput: {
    fontSize: FONT.size.md,
    minHeight: 120,
    lineHeight: 22,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  charCount: {
    fontSize: FONT.size.xs,
    fontWeight: '600',
  },

  // Buttons
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xxl,
    marginTop: SPACING.xxl,
    ...SHADOWS.button,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: '800',
    color: '#FFF',
  },
  alternativeButtons: {
    marginTop: SPACING.xl,
    gap: SPACING.xs,
    alignItems: 'center',
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    width: '100%',
  },
  emailBtnText: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
  },
});