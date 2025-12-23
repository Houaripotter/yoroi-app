import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
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
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT, SHADOWS } from '@/constants/appTheme';

// ============================================
// BOÎTE À IDÉES
// ============================================
// Permet aux utilisateurs d'envoyer des suggestions

type IdeaCategory = 'feature' | 'design' | 'bug' | 'other';

const CATEGORIES = [
  { id: 'feature' as IdeaCategory, label: 'Fonctionnalité', icon: Sparkles, color: '#10B981' },
  { id: 'design' as IdeaCategory, label: 'Design', icon: Palette, color: '#8B5CF6' },
  { id: 'bug' as IdeaCategory, label: 'Bug', icon: Bug, color: '#EF4444' },
  { id: 'other' as IdeaCategory, label: 'Autre', icon: HelpCircle, color: '#6B7280' },
];

export default function IdeasScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [ideaText, setIdeaText] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const sendIdea = async () => {
    if (!ideaText.trim()) {
      Alert.alert('Oups', 'Écris ton idée avant de l\'envoyer !');
      return;
    }

    triggerHaptic();
    setIsSending(true);

    // Simulate sending (in real app, would send to backend)
    setTimeout(() => {
      setIsSending(false);
      setSent(true);

      // Reset after showing success
      setTimeout(() => {
        setSent(false);
        setIdeaText('');
        setCategory('feature');
      }, 2000);
    }, 1000);
  };

  const sendByEmail = () => {
    const categoryLabel = CATEGORIES.find(c => c.id === category)?.label || 'Autre';
    const subject = encodeURIComponent(`[Yoroi] ${categoryLabel}: Suggestion`);
    const body = encodeURIComponent(`Catégorie: ${categoryLabel}\n\n${ideaText}\n\n---\nEnvoyé depuis l'app Yoroi`);
    const mailto = `mailto:contact@yoroi-app.com?subject=${subject}&body=${body}`;

    Linking.openURL(mailto).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir l\'app de mail');
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Boîte à Idées</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={[styles.heroIconBg, { backgroundColor: `${colors.accent}20` }]}>
              <Lightbulb size={32} color={colors.accent} />
            </View>
            <Text style={styles.heroTitle}>Une idée pour améliorer Yoroi ?</Text>
            <Text style={styles.heroText}>
              Dis-nous tout ! Chaque suggestion est lue et prise en compte pour les prochaines mises à jour.
            </Text>
          </View>

          {/* Category Selection */}
          <Text style={styles.sectionTitle}>Catégorie</Text>
          <View style={styles.categoriesRow}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBtn,
                    isSelected && { backgroundColor: cat.color },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Icon size={18} color={isSelected ? '#FFF' : cat.color} />
                  <Text style={[styles.categoryText, isSelected && { color: '#FFF' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Idea Input */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Ton idée</Text>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder="Écris ton idée ici..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={ideaText}
              onChangeText={setIdeaText}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{ideaText.length}/1000</Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: sent ? COLORS.success : colors.accent },
              (!ideaText.trim() || isSending) && styles.sendBtnDisabled,
            ]}
            onPress={sendIdea}
            disabled={!ideaText.trim() || isSending}
          >
            {sent ? (
              <>
                <Check size={22} color="#FFF" />
                <Text style={styles.sendBtnText}>Merci !</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#FFF" />
                <Text style={styles.sendBtnText}>
                  {isSending ? 'Envoi...' : 'Envoyer mon idée'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Alternative: Email */}
          <TouchableOpacity style={styles.emailBtn} onPress={sendByEmail}>
            <Mail size={18} color={COLORS.textSecondary} />
            <Text style={styles.emailBtnText}>Ou envoyer par email</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
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
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  headerTitle: {
    fontSize: FONT.size.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
  },

  // Hero
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  heroText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  // Section
  sectionTitle: {
    fontSize: FONT.size.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  // Categories
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
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  categoryText: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Input
  inputCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  textInput: {
    fontSize: FONT.size.md,
    color: COLORS.text,
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: {
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: SPACING.sm,
  },

  // Buttons
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
    marginTop: SPACING.xl,
    ...SHADOWS.button,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
    color: '#FFF',
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  emailBtnText: {
    fontSize: FONT.size.sm,
    color: COLORS.textSecondary,
  },
});
