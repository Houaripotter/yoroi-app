import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Target,
  Gift,
  CheckCircle2,
  Clock,
  Flame,
  Zap,
  Trophy,
  Calendar,
  Dumbbell,
  Droplets,
  Moon,
  Scale,
  Waves,
  Bed,
  TrendingDown,
  Crown,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Info,
  BookOpen,
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import { useTheme } from '@/lib/ThemeContext';
import {
  syncAllChallenges,
  syncAndGetNewlyCompleted,
  getActiveChallenges,
  claimChallengeReward,
  getTotalChallengeXP,
  ActiveChallenge,
} from '@/lib/challengesService';
import { addWeight } from '@/lib/database';
import { addHydration } from '@/lib/quests';
import { addSleepEntry } from '@/lib/sleepService';
import { ChallengeConfetti } from '@/components/ChallengeConfetti';
import logger from '@/lib/security/logger';

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [dailyChallenges, setDailyChallenges] = useState<ActiveChallenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<ActiveChallenge[]>([]);
  const [monthlyChallenges, setMonthlyChallenges] = useState<ActiveChallenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);

  // Quick action modal
  const [quickActionChallenge, setQuickActionChallenge] = useState<ActiveChallenge | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);

  // Toggle expansion d'une carte
  const toggleExpand = (challengeId: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setExpandedChallenges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(challengeId)) {
        newSet.delete(challengeId);
      } else {
        newSet.add(challengeId);
      }
      return newSet;
    });
  };

  // Rendu icône défi - Style premium avec couleurs vives
  const renderChallengeIcon = (iconName: string) => {
    const iconSize = 26;
    switch (iconName) {
      case 'dumbbell': return <Dumbbell size={iconSize} color="#F97316" strokeWidth={2.5} />;
      case 'droplets': return <Droplets size={iconSize} color="#06B6D4" strokeWidth={2.5} />;
      case 'moon': return <Moon size={iconSize} color="#A78BFA" strokeWidth={2.5} />;
      case 'scale': return <Scale size={iconSize} color="#EC4899" strokeWidth={2.5} />;
      case 'flame': return <Flame size={iconSize} color="#EF4444" strokeWidth={2.5} />;
      case 'zap': return <Zap size={iconSize} color="#FBBF24" fill="#FBBF24" strokeWidth={2} />;
      case 'waves': return <Waves size={iconSize} color="#22D3EE" strokeWidth={2.5} />;
      case 'bed': return <Bed size={iconSize} color="#8B5CF6" strokeWidth={2.5} />;
      case 'trophy': return <Trophy size={iconSize} color="#FFD700" fill="#FFD70030" strokeWidth={2.5} />;
      case 'trending-down': return <TrendingDown size={iconSize} color="#10B981" strokeWidth={2.5} />;
      case 'crown': return <Crown size={iconSize} color="#FFD700" fill="#FFD70030" strokeWidth={2.5} />;
      default: return <Target size={iconSize} color="#3B82F6" strokeWidth={2.5} />;
    }
  };

  const loadData = useCallback(async () => {
    try {
      // Sync une seule fois, puis lire tous les défis
      await syncAllChallenges();
      const [all, xp] = await Promise.all([
        getActiveChallenges(),
        getTotalChallengeXP(),
      ]);
      setDailyChallenges(all.filter(c => c.type === 'daily'));
      setWeeklyChallenges(all.filter(c => c.type === 'weekly'));
      setMonthlyChallenges(all.filter(c => c.type === 'monthly'));
      setTotalXP(xp);
    } catch (error) {
      logger.error('Erreur:', error);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  const handleClaim = async (challenge: ActiveChallenge) => {
    if (!challenge?.progress?.completed || challenge?.progress?.claimed) return;

    notificationAsync(NotificationFeedbackType.Success);
    const xp = await claimChallengeReward(challenge.id);

    if (xp > 0) {
      setJustClaimedId(challenge.id);
      setConfettiVisible(true);

      // Effacer le highlight après 3s
      setTimeout(() => setJustClaimedId(null), 3000);

      // Popup après l'animation
      setTimeout(() => {
        showPopup(
          'Recompense reclamee !',
          `Tu as gagne +${xp} XP !`,
          [{ text: 'Super !', style: 'primary' }]
        );
      }, 500);

      loadData();
    }
  };

  // Ouvre la modal d'action rapide selon la catégorie du défi
  const handleLongPress = (challenge: ActiveChallenge) => {
    if (challenge.progress?.completed) return; // Déjà complété, rien à faire
    impactAsync(ImpactFeedbackStyle.Medium);
    setInputValue('');
    setQuickActionChallenge(challenge);
  };

  const closeQuickAction = () => {
    setQuickActionChallenge(null);
    setInputValue('');
  };

  // Sauvegarde selon la catégorie + resync challenges
  const handleQuickActionSave = async () => {
    if (!quickActionChallenge || isSavingAction) return;
    setIsSavingAction(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const category = quickActionChallenge.category;

      if (category === 'weight') {
        const kg = parseFloat(inputValue.replace(',', '.'));
        if (!kg || kg < 20 || kg > 500) {
          showPopup('Valeur invalide', 'Entre un poids entre 20 et 500 kg.', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        await addWeight({ weight: kg, date: today });

      } else if (category === 'hydration') {
        const ml = parseFloat(inputValue.replace(',', '.'));
        if (!ml || ml < 1) {
          showPopup('Valeur invalide', 'Entre une quantité en ml (ex: 250).', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        await addHydration(ml / 1000); // addHydration prend des litres

      } else if (category === 'sleep') {
        const hours = parseFloat(inputValue.replace(',', '.'));
        if (!hours || hours < 0.5 || hours > 24) {
          showPopup('Valeur invalide', 'Entre une durée entre 0.5 et 24 heures.', [{ text: 'OK', style: 'primary' }]);
          return;
        }
        // Calculer heure de réveil = heure actuelle, heure de coucher = maintenant - hours
        const now = new Date();
        const wake = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const bedDate = new Date(now.getTime() - hours * 3600 * 1000);
        const bed = `${String(bedDate.getHours()).padStart(2,'0')}:${String(bedDate.getMinutes()).padStart(2,'0')}`;
        await addSleepEntry(bed, wake, 3, '', today);
      }

      closeQuickAction();

      // Resync et vérifier si un défi est nouvellement complété
      const newlyCompleted = await syncAndGetNewlyCompleted();
      await loadData();

      if (newlyCompleted.length > 0) {
        notificationAsync(NotificationFeedbackType.Success);
        setConfettiVisible(true);
        setTimeout(() => {
          const names = newlyCompleted.map(c => `"${c.title}" (+${c.xp} XP)`).join('\n');
          showPopup(
            'Bravo, défi valide !',
            `Tu as complete :\n${names}\n\nClique sur "Reclamer" pour recuperer tes XP !`,
            [{ text: 'Super !', style: 'primary' }]
          );
        }, 600);
      }
    } catch (e) {
      logger.error('Erreur action rapide:', e);
      showPopup('Erreur', 'Impossible de sauvegarder. Réessaye.', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSavingAction(false);
    }
  };

  // Ajoute de l'eau rapidement (preset boutons)
  const handleHydrationPreset = async (ml: number) => {
    if (isSavingAction) return;
    setIsSavingAction(true);
    try {
      await addHydration(ml / 1000);
      closeQuickAction();
      const newlyCompleted = await syncAndGetNewlyCompleted();
      await loadData();
      if (newlyCompleted.length > 0) {
        notificationAsync(NotificationFeedbackType.Success);
        setConfettiVisible(true);
        setTimeout(() => {
          const names = newlyCompleted.map(c => `"${c.title}" (+${c.xp} XP)`).join('\n');
          showPopup('Bravo, défi valide !', `Tu as complete :\n${names}`, [{ text: 'Super !', style: 'primary' }]);
        }, 600);
      }
    } catch (e) {
      logger.error('Erreur hydratation preset:', e);
    } finally {
      setIsSavingAction(false);
    }
  };

  const getChallenges = () => {
    switch (activeTab) {
      case 'daily': return dailyChallenges;
      case 'weekly': return weeklyChallenges;
      case 'monthly': return monthlyChallenges;
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'daily': return <Clock size={14} color={activeTab === tab ? colors.textOnGold : colors.textMuted} />;
      case 'weekly': return <Calendar size={14} color={activeTab === tab ? colors.textOnGold : colors.textMuted} />;
      case 'monthly': return <Trophy size={14} color={activeTab === tab ? colors.textOnGold : colors.textMuted} />;
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Défis</Text>
        <View style={[styles.xpBadge, { backgroundColor: colors.accent }]}>
          <Zap size={12} color={colors.textOnGold} />
          <Text style={[styles.xpText, { color: colors.textOnGold }]}>{totalXP} XP</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.backgroundCard }]}>
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { backgroundColor: colors.accent }]}
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setActiveTab(tab); }}
          >
            {getTabIcon(tab)}
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.textOnGold : colors.textMuted }]}>
              {tab === 'daily' ? 'Jour' : tab === 'weekly' ? 'Semaine' : 'Mois'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {/* Confetti animé */}
        <ChallengeConfetti
          visible={confettiVisible}
          onComplete={() => {
            setConfettiVisible(false);
          }}
        />
        
        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
          <Target size={16} color={colors.accentText} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {activeTab === 'daily' 
              ? 'Les défis quotidiens se réinitialisent chaque matin'
              : activeTab === 'weekly'
              ? 'Les défis hebdomadaires sont évalués chaque lundi'
              : 'Les défis mensuels offrent les meilleures récompenses'}
          </Text>
        </View>

        {/* Challenges */}
        {getChallenges().map((challenge) => {
          const progress = Math.min(100, ((challenge?.progress?.current ?? 0) / (challenge?.progress?.target || 1)) * 100);
          const isCompleted = challenge?.progress?.completed;
          const isClaimed = challenge?.progress?.claimed;
          const isExpanded = expandedChallenges.has(challenge.id);

          return (
            <TouchableOpacity
              key={challenge.id}
              style={[styles.challengeCard, {
                backgroundColor: isClaimed
                  ? `${colors.accent}18`
                  : isCompleted
                    ? `${colors.accent}10`
                    : colors.backgroundCard,
                borderWidth: (isCompleted || isClaimed) ? 1.5 : 0,
                borderColor: justClaimedId === challenge.id
                  ? colors.accent
                  : isClaimed ? `${colors.accent}60` : isCompleted ? `${colors.accent}80` : 'transparent',
              }]}
              onLongPress={() => handleLongPress(challenge)}
              onPress={() => {
                if (!challenge.progress?.completed) {
                  handleLongPress(challenge);
                } else {
                  toggleExpand(challenge.id);
                }
              }}
              activeOpacity={0.9}
              delayLongPress={400}
            >
              {/* Header toujours visible */}
              <View style={styles.challengeHeader}>
                <View style={[styles.challengeIconWrap, {
                  backgroundColor: isClaimed ? `${colors.accent}25` : `${colors.accent}15`,
                }]}>
                  {isClaimed
                    ? <CheckCircle2 size={26} color={colors.accent} strokeWidth={2.5} />
                    : renderChallengeIcon(challenge.icon)
                  }
                </View>
                <View style={styles.challengeInfo}>
                  <View style={styles.challengeTitleRow}>
                    <Text style={[styles.challengeTitle, {
                      color: isClaimed ? colors.accent : colors.textPrimary,
                    }]}>{challenge.title}</Text>
                    {justClaimedId === challenge.id && (
                      <View style={[styles.justClaimedBadge, { backgroundColor: colors.accent }]}>
                        <CheckCircle2 size={10} color="#FFFFFF" />
                        <Text style={styles.justClaimedText}>VALIDE</Text>
                      </View>
                    )}
                  </View>
                  {/* Hint ou description selon expansion */}
                  {!isExpanded ? (
                    <View style={styles.hintRow}>
                      <Text style={[styles.hintText, { color: isClaimed ? colors.accent : colors.textMuted }]}>
                        {isClaimed ? 'XP collecte avec succes' : isCompleted ? 'Complete - reclame ta recompense' : progress > 0 ? `En cours (${Math.round(progress)}%) - appuie pour noter` : 'Appuie pour saisir ta data'}
                      </Text>
                      <ChevronDown size={12} color={isClaimed ? colors.accent : colors.textMuted} />
                    </View>
                  ) : (
                    <Text style={[styles.challengeDesc, { color: colors.textMuted }]}>{challenge.description}</Text>
                  )}
                </View>
              </View>

              {/* Détails visibles seulement si expanded */}
              {isExpanded && (
                <>
                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View style={[
                        styles.progressFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: isCompleted ? colors.success : colors.accent,
                        }
                      ]} />
                    </View>
                    <Text style={[styles.progressText, { color: colors.textMuted }]}>
                      {challenge.progress.current}/{challenge.progress.target}
                    </Text>
                  </View>

                  {/* Reward */}
                  <View style={styles.challengeFooter}>
                    <View style={[styles.rewardBadge, { backgroundColor: colors.accentMuted }]}>
                      <Gift size={12} color={colors.accentText} />
                      <Text style={[styles.rewardText, { color: isDark ? colors.accent : colors.textPrimary }]}>+{challenge?.reward?.xp ?? 0} XP</Text>
                      {challenge?.reward?.badge && (
                        <Text style={[styles.rewardBadgeText, { color: isDark ? colors.accent : colors.textPrimary }]}>+ Badge</Text>
                      )}
                    </View>

                    {isCompleted && !isClaimed ? (
                      <TouchableOpacity
                        style={[styles.claimBtn, { backgroundColor: colors.success }]}
                        onPress={() => handleClaim(challenge)}
                      >
                        <Gift size={14} color="#FFFFFF" />
                        <Text style={styles.claimBtnText}>Reclamer</Text>
                      </TouchableOpacity>
                    ) : isCompleted && isClaimed ? (
                      <View style={[styles.completedBadge, { backgroundColor: colors.successLight }]}>
                        <CheckCircle2 size={14} color={colors.success} />
                        <Text style={[styles.completedText, { color: colors.success }]}>Complete</Text>
                      </View>
                    ) : (
                      <View style={[styles.pendingBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                        <Clock size={14} color={colors.textMuted} />
                        <Text style={[styles.pendingText, { color: colors.textMuted }]}>En cours</Text>
                      </View>
                    )}
                  </View>

                  {/* Indicateur pour replier */}
                  <View style={styles.collapseHint}>
                    <ChevronUp size={14} color={colors.textMuted} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      <PopupComponent />

      {/* Modal action rapide */}
      <Modal
        visible={!!quickActionChallenge}
        transparent
        animationType="slide"
        onRequestClose={closeQuickAction}
      >
        {/* Tap sur l'overlay = ferme la modal */}
        <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); closeQuickAction(); }}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.modalSheet, { backgroundColor: colors.backgroundCard }]}>
                {/* Header modal */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconWrap, { backgroundColor: `${colors.accent}20` }]}>
                    {quickActionChallenge && renderChallengeIcon(quickActionChallenge.icon)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      {quickActionChallenge?.title}
                    </Text>
                    <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
                      {quickActionChallenge?.description}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeQuickAction} style={styles.modalClose}>
                    <X size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Contenu selon catégorie */}
                {quickActionChallenge?.category === 'weight' && (
                  <View style={styles.modalContent}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Ton poids ce matin (kg)</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Ex: 75.5"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={inputValue}
                      onChangeText={setInputValue}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: colors.accent, opacity: isSavingAction ? 0.6 : 1 }]}
                      onPress={handleQuickActionSave}
                      disabled={isSavingAction}
                    >
                      <Scale size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Enregistrer le poids</Text>
                    </TouchableOpacity>
                    {/* Options supplémentaires */}
                    <View style={[styles.extraOptionsLabel, { borderTopColor: colors.border }]}>
                      <Text style={[styles.modalLabel, { color: colors.textMuted, fontSize: 11 }]}>Aller plus loin (optionnel)</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.extraOptionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => { closeQuickAction(); router.push('/body-composition' as any); }}
                    >
                      <TrendingDown size={16} color={colors.accent} />
                      <Text style={[styles.extraOptionText, { color: colors.textPrimary }]}>Composition corporelle</Text>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.extraOptionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => { closeQuickAction(); router.push('/measurements' as any); }}
                    >
                      <Scale size={16} color={colors.accent} />
                      <Text style={[styles.extraOptionText, { color: colors.textPrimary }]}>Mensurations</Text>
                      <ChevronRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                {quickActionChallenge?.category === 'hydration' && (
                  <View style={styles.modalContent}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Ajoute ta consommation d'eau</Text>
                    <View style={styles.presetRow}>
                      {[250, 330, 500, 750, 1000].map(ml => (
                        <TouchableOpacity
                          key={ml}
                          style={[styles.presetBtn, { backgroundColor: `${colors.accent}20`, borderColor: colors.accent }]}
                          onPress={() => handleHydrationPreset(ml)}
                          disabled={isSavingAction}
                        >
                          <Text style={[styles.presetBtnText, { color: colors.accent }]}>+{ml >= 1000 ? `${ml/1000}L` : `${ml}ml`}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 12 }]}>Ou entre un montant custom (ml)</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Ex: 400"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      value={inputValue}
                      onChangeText={setInputValue}
                    />
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: '#06B6D4', opacity: isSavingAction ? 0.6 : 1 }]}
                      onPress={handleQuickActionSave}
                      disabled={isSavingAction}
                    >
                      <Droplets size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Enregistrer</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {quickActionChallenge?.category === 'sleep' && (
                  <View style={styles.modalContent}>
                    {/* Article sommeil à lire */}
                    <View style={[styles.sleepArticle, { backgroundColor: `${'#8B5CF6'}12`, borderColor: `${'#8B5CF6'}30` }]}>
                      <View style={styles.sleepArticleHeader}>
                        <BookOpen size={16} color="#8B5CF6" />
                        <Text style={[styles.sleepArticleTitle, { color: colors.textPrimary }]}>Le sommeil du champion</Text>
                      </View>
                      <Text style={[styles.sleepArticleBody, { color: colors.textSecondary || colors.textMuted }]}>
                        Le sommeil est l'outil de récupération n°1. Durant la phase de sommeil profond, ton corps libere l'hormone de croissance qui repare les muscles. 7 a 9 heures par nuit optimisent les performances, la concentration et la composition corporelle.
                        {'\n\n'}
                        Astuce : couche-toi a la meme heure chaque soir pour ancrer ton rythme circadien.
                      </Text>
                    </View>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Combien d'heures as-tu dormi ?</Text>
                    <TextInput
                      style={[styles.modalInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                      placeholder="Ex: 7.5"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                      value={inputValue}
                      onChangeText={setInputValue}
                    />
                    <View style={styles.presetRow}>
                      {[6, 7, 7.5, 8, 9].map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.presetBtn, { backgroundColor: '#A78BFA20', borderColor: '#A78BFA' }]}
                          onPress={() => setInputValue(h.toString())}
                        >
                          <Text style={[styles.presetBtnText, { color: '#A78BFA' }]}>{h}h</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: '#8B5CF6', opacity: isSavingAction ? 0.6 : 1 }]}
                      onPress={handleQuickActionSave}
                      disabled={isSavingAction}
                    >
                      <Moon size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Enregistrer le sommeil</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {quickActionChallenge?.category === 'training' && (
                  <View style={styles.modalContent}>
                    <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                      Enregistre une séance pour valider ce défi
                    </Text>
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: '#F97316' }]}
                      onPress={() => { closeQuickAction(); router.push('/add-training'); }}
                    >
                      <Dumbbell size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Ajouter une séance</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {quickActionChallenge?.category === 'streak' && (
                  <View style={styles.modalContent}>
                    <View style={[styles.infoBox, { backgroundColor: `${colors.accent}15`, borderColor: colors.border }]}>
                      <Info size={18} color={colors.accent} />
                      <Text style={[styles.infoBoxText, { color: colors.textPrimary }]}>
                        Le streak se calcule automatiquement selon ton historique d'entraînements. Fais une séance chaque jour pour le maintenir !
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalSaveBtn, { backgroundColor: '#FBBF24' }]}
                      onPress={() => { closeQuickAction(); router.push('/add-training'); }}
                    >
                      <Zap size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Ajouter une séance aujourd'hui</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  xpText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  
  tabs: { flexDirection: 'row', padding: 6, marginHorizontal: 16, marginBottom: 12, borderRadius: 12 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 8 },
  tabText: { fontSize: 12, fontWeight: '600' },

  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16 },

  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 16 },

  challengeCard: { padding: 16, borderRadius: 16, marginBottom: 12 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  challengeIconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  challengeInfo: { flex: 1 },
  challengeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  challengeTitle: { fontSize: 16, fontWeight: '700' },
  challengeDesc: { fontSize: 12, marginTop: 2 },
  justClaimedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  justClaimedText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  progressSection: { marginBottom: 12 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 10, textAlign: 'right' },

  challengeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  rewardText: { fontSize: 11, fontWeight: '700' },
  rewardBadgeText: { fontSize: 10, fontWeight: '600' },

  claimBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  claimBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  completedText: { fontSize: 11, fontWeight: '600' },

  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  pendingText: { fontSize: 11, fontWeight: '600' },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hintText: { fontSize: 11, fontStyle: 'italic' },
  collapseHint: { alignItems: 'center', marginTop: 8 },

  // Modal action rapide
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet: { width: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 0 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalDesc: { fontSize: 12, marginTop: 2 },
  modalClose: { padding: 4 },
  modalContent: { gap: 12 },
  modalLabel: { fontSize: 13, fontWeight: '600' },
  modalInput: { height: 52, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, fontSize: 18, fontWeight: '700' },
  modalSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  modalSaveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  presetBtnText: { fontSize: 13, fontWeight: '700' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoBoxText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Extra options (poids)
  extraOptionsLabel: { borderTopWidth: 1, paddingTop: 16, marginTop: 4 },
  extraOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  extraOptionText: { flex: 1, fontSize: 14, fontWeight: '600' },

  // Article sommeil
  sleepArticle: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 4 },
  sleepArticleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sleepArticleTitle: { fontSize: 14, fontWeight: '700' },
  sleepArticleBody: { fontSize: 12, lineHeight: 18 },
});

