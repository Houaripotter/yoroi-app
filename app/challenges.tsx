import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
} from 'lucide-react-native';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

import { useTheme } from '@/lib/ThemeContext';
import {
  getDailyChallenges,
  getWeeklyChallenges,
  MONTHLY_CHALLENGES,
  claimChallengeReward,
  manualCompleteChallenge,
  getTotalChallengeXP,
  ActiveChallenge,
} from '@/lib/challengesService';
import { ChallengeConfetti } from '@/components/ChallengeConfetti';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [dailyChallenges, setDailyChallenges] = useState<ActiveChallenge[]>([]);
  const [weeklyChallenges, setWeeklyChallenges] = useState<ActiveChallenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [completedChallengeId, setCompletedChallengeId] = useState<string | null>(null);
  const [expandedChallenges, setExpandedChallenges] = useState<Set<string>>(new Set());

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
      const [daily, weekly, xp] = await Promise.all([
        getDailyChallenges(),
        getWeeklyChallenges(),
        getTotalChallengeXP(),
      ]);
      setDailyChallenges(daily);
      setWeeklyChallenges(weekly);
      setTotalXP(xp);
    } catch (error) {
      logger.error('Erreur:', error);
    }
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  const handleClaim = async (challenge: ActiveChallenge) => {
    if (!challenge?.progress?.completed || challenge?.progress?.claimed) return;

    notificationAsync(NotificationFeedbackType.Success);
    const xp = await claimChallengeReward(challenge.id);

    if (xp > 0) {
      setCompletedChallengeId(challenge.id);
      setConfettiVisible(true);

      // Popup après l'animation
      setTimeout(() => {
        showPopup(
          'Récompense réclamée !',
          `Tu as gagné +${xp} XP !`,
          [{ text: 'Super !', style: 'primary' }]
        );
      }, 500);

      loadData();
    }
  };

  // Valider manuellement un défi
  const handleValidate = async (challenge: ActiveChallenge) => {
    if (challenge?.progress?.completed) return;

    impactAsync(ImpactFeedbackStyle.Medium);
    const success = await manualCompleteChallenge(challenge.id);

    if (success) {
      setCompletedChallengeId(challenge.id);
      setConfettiVisible(true);
      loadData();
    }
  };

  const getChallenges = () => {
    switch (activeTab) {
      case 'daily': return dailyChallenges;
      case 'weekly': return weeklyChallenges;
      case 'monthly': return MONTHLY_CHALLENGES.map(c => ({
        ...c,
        progress: { challengeId: c.id, current: 0, target: c.target, completed: false, claimed: false },
      }));
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Confetti animé */}
        <ChallengeConfetti
          visible={confettiVisible}
          onComplete={() => {
            setConfettiVisible(false);
            setCompletedChallengeId(null);
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
              style={[styles.challengeCard, { backgroundColor: colors.backgroundCard }]}
              onLongPress={() => toggleExpand(challenge.id)}
              onPress={() => toggleExpand(challenge.id)}
              activeOpacity={0.9}
              delayLongPress={300}
            >
              {/* Header toujours visible */}
              <View style={styles.challengeHeader}>
                <View style={[styles.challengeIconWrap, { backgroundColor: `${colors.accent}15` }]}>
                  {renderChallengeIcon(challenge.icon)}
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>{challenge.title}</Text>
                  {/* Hint ou description selon expansion */}
                  {!isExpanded ? (
                    <View style={styles.hintRow}>
                      <Text style={[styles.hintText, { color: colors.textMuted }]}>
                        {isCompleted ? 'Complété ✓' : progress > 0 ? `En cours (${Math.round(progress)}%)` : 'Appuie pour voir les détails'}
                      </Text>
                      <ChevronDown size={12} color={colors.textMuted} />
                    </View>
                  ) : (
                    <>
                      <Text style={[styles.challengeDesc, { color: colors.textMuted }]}>{challenge.description}</Text>
                      {!isCompleted && (
                        <Text style={[styles.validateHint, { color: colors.accent }]}>
                          💡 Reste appuyé sur "Valider" pour compléter
                        </Text>
                      )}
                    </>
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
                        <Text style={styles.claimBtnText}>Réclamer</Text>
                      </TouchableOpacity>
                    ) : isCompleted && isClaimed ? (
                      <View style={[styles.completedBadge, { backgroundColor: colors.successLight }]}>
                        <CheckCircle2 size={14} color={colors.success} />
                        <Text style={[styles.completedText, { color: colors.success }]}>Complété</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.validateBtn, { backgroundColor: colors.accent }]}
                        onPress={(e) => { e.stopPropagation(); handleValidate(challenge); }}
                      >
                        <CheckCircle2 size={14} color={colors.textOnGold} />
                        <Text style={[styles.validateBtnText, { color: colors.textOnGold }]}>Valider</Text>
                      </TouchableOpacity>
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
  challengeTitle: { fontSize: 16, fontWeight: '700' },
  challengeDesc: { fontSize: 12, marginTop: 2 },

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

  validateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  validateBtnText: { fontSize: 12, fontWeight: '700' },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  hintText: { fontSize: 11, fontStyle: 'italic' },
  collapseHint: { alignItems: 'center', marginTop: 8 },
  validateHint: { fontSize: 10, fontStyle: 'italic', marginTop: 6 },
});

