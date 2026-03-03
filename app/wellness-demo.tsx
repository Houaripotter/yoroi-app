import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Image,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Scale,
  Droplets,
  Moon,
  Flame,
  Footprints,
  Zap,
  Trophy,
  Target,
  TrendingDown,
  TrendingUp,
  Dumbbell,
  Activity,
  Star,
  BookOpen,
  CheckCircle2,
  Camera,
  Sparkles,
  Share2,
  FileText,
  Apple,
  Coffee,
  Minus,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { getProfile } from '@/lib/database';

const { width: SW } = Dimensions.get('window');

// ============================================================
// 2 COMBOS DE COULEURS
// ============================================================
const OCEAN = {
  name: 'Ocean Blue + Cloudy Sky',
  bg: '#CBDDE9',
  primary: '#2972A1',
  primaryLight: '#3A8ABD',
  primaryDark: '#1E5A82',
  primarySoft: '#D6E8F4',
  secondary: '#CBDDE9',
  card: '#FFFFFF',
  cardAlt: '#F4F8FB',
  text: '#0D1B2A',
  textSec: '#3D5A72',
  textMuted: '#7A99B0',
  success: '#10B981',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  error: '#EF4444',
  water: '#3B82F6',
  waterSoft: '#DBEAFE',
  sleep: '#8B5CF6',
  sleepSoft: '#EDE9FE',
  fire: '#F97316',
  fireSoft: '#FFEDD5',
  gold: '#FFD700',
  goldDark: '#FFA500',
};

const VISTA = {
  name: 'Vista Blue + Mindaro',
  bg: '#D6E2EE',
  primary: '#84ABD6',
  primaryLight: '#9ABDE2',
  primaryDark: '#5A8BBE',
  primarySoft: '#E4EEF8',
  secondary: '#FEFFB9',
  card: '#FFFFFF',
  cardAlt: '#F6F9FC',
  text: '#0D1B2A',
  textSec: '#4A6580',
  textMuted: '#8AA4BA',
  success: '#10B981',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  error: '#EF4444',
  water: '#3B82F6',
  waterSoft: '#DBEAFE',
  sleep: '#8B5CF6',
  sleepSoft: '#EDE9FE',
  fire: '#F97316',
  fireSoft: '#FFEDD5',
  gold: '#FFD700',
  goldDark: '#FFA500',
};

type T = typeof OCEAN;

// ============================================================
// CARD COMPONENT
// ============================================================
const Card = ({ children, style, t }: { children: React.ReactNode; style?: any; t: T }) => (
  <View style={[{
    borderRadius: 20,
    backgroundColor: t.card,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: t.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14 },
      android: { elevation: 4 },
    }),
  }, style]}>
    {children}
  </View>
);

// ============================================================
// PROGRESS BAR
// ============================================================
const Bar = ({ pct, color, bg, h = 8 }: { pct: number; color: string; bg: string; h?: number }) => (
  <View style={{ height: h, borderRadius: h / 2, backgroundColor: bg, overflow: 'hidden' }}>
    <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: h / 2, backgroundColor: color }} />
  </View>
);

// ============================================================
// MAIN
// ============================================================
export default function WellnessDemo() {
  const insets = useSafeAreaInsets();
  const [combo, setCombo] = useState<'ocean' | 'vista'>('ocean');
  const c = combo === 'ocean' ? OCEAN : VISTA;
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState('Guerrier');
  const [questTab, setQuestTab] = useState<'day' | 'week' | 'month'>('day');

  // Charger le vrai profil
  useEffect(() => {
    const load = async () => {
      try {
        const profile = await getProfile();
        if (profile?.profile_photo) setProfilePhoto(profile.profile_photo);
        if (profile?.name) setUserName(profile.name);
      } catch {}
    };
    load();
  }, []);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [combo]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

  // Mock weight data
  const weights = [82.5, 82.1, 81.8, 81.5, 81.2, 80.9, 80.5, 80.2, 80.0, 79.8, 80.1, 80.3, 80.0, 79.7, 79.5];
  const maxW = Math.max(...weights);
  const minW = Math.min(...weights);
  const wRange = maxW - minW || 1;

  // Quests data
  const quests = [
    { id: 'weigh', title: 'Enregistre ton poids', desc: 'Pesée quotidienne', xp: 15, done: true, icon: Target, color: '#EC4899' },
    { id: 'hydration', title: 'Bois 2L d\'eau', desc: 'Hydratation complète', xp: 10, done: true, icon: Droplets, color: '#06B6D4' },
    { id: 'training', title: 'Fais un entraînement', desc: '30 min minimum', xp: 25, done: false, icon: Dumbbell, color: '#F97316', progress: 0 },
    { id: 'sleep', title: 'Dors 7h minimum', desc: 'Sommeil récupérateur', xp: 20, done: false, icon: Moon, color: '#8B5CF6' },
    { id: 'steps', title: 'Marche 8000 pas', desc: 'Activité quotidienne', xp: 15, done: false, icon: Footprints, color: '#10B981', progress: 65 },
    { id: 'breakfast', title: 'Petit-déj protéiné', desc: 'Commence bien la journée', xp: 10, done: false, icon: Coffee, color: '#FBBF24' },
  ];

  const completedCount = quests.filter(q => q.done).length;
  const totalXP = quests.filter(q => q.done).reduce((s, q) => s + q.xp, 0);

  return (
    <View style={[st.screen, { backgroundColor: c.bg }]}>
      {/* SWITCHER */}
      <View style={[st.switchWrap, { top: insets.top + 6 }]}>
        <TouchableOpacity style={[st.backBtn, { backgroundColor: c.card }]} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={22} color={c.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={[st.switcher, { backgroundColor: c.card }]}>
          {(['ocean', 'vista'] as const).map(k => (
            <TouchableOpacity
              key={k}
              style={[st.switchBtn, combo === k && { backgroundColor: c.primary }]}
              onPress={() => setCombo(k)}
              activeOpacity={0.7}
            >
              <Text style={[st.switchTxt, combo === k && { color: '#FFF' }]}>
                {k === 'ocean' ? 'Ocean Blue' : 'Vista Blue'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={[st.content, { paddingTop: insets.top + 58 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ 1. HEADER avec photo profil ═══ */}
        <View style={st.header}>
          <TouchableOpacity activeOpacity={0.8}>
            <View style={[st.profileFrame, { borderColor: c.primary }]}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={st.profileImg} />
              ) : (
                <View style={[st.profilePlaceholder, { backgroundColor: c.cardAlt }]}>
                  <Ionicons name="person" size={40} color={c.textMuted} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[st.greetSmall, { color: c.textMuted }]}>{greeting},</Text>
            <Text style={[st.greetBig, { color: c.text }]}>{userName}</Text>
          </View>
        </View>

        {/* ═══ 2. CITATION DU JOUR ═══ */}
        <Card t={c} style={{ marginBottom: 12, padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, color: c.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
            CITATION DU JOUR
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', fontStyle: 'italic', lineHeight: 22, textAlign: 'center', color: c.text, letterSpacing: 0.2 }}>
            "Le guerrier qui s'entraîne chaque jour n'a pas peur du combat."
          </Text>
        </Card>

        {/* ═══ 3. CARTE RANG ═══ */}
        <Card t={c} style={{ marginBottom: 12, padding: 16 }}>
          <View style={st.rankRow}>
            {/* Avatar */}
            <View style={st.avatarWrap}>
              <View style={[st.avatarFrame, { borderColor: c.primary, backgroundColor: c.card }]}>
                <Ionicons name="person" size={30} color={c.textMuted} />
              </View>
              <View style={[st.levelBadge, { backgroundColor: c.primary }]}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF' }}>3</Text>
              </View>
            </View>
            {/* Info */}
            <View style={{ flex: 1 }}>
              <View style={st.rankNameRow}>
                <Text style={[st.rankName, { color: c.text }]}>SAMOURAÏ</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9731615', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 2 }}>
                  <Flame size={10} color="#F97316" fill="#F97316" />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#F97316' }}>14j</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '500', color: c.textMuted, marginTop: 1 }}>侍</Text>
              {/* Progress bar */}
              <View style={{ marginTop: 6 }}>
                <Bar pct={68} color={c.primary} bg={c.primarySoft} h={5} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316' }} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted }}>
                  <Text style={{ fontWeight: '800', color: '#F97316' }}>Rōnin</Text> dans 32 jours
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color={c.textMuted} />
          </View>
        </Card>

        {/* ═══ 4. POIDS - Carte Premium ═══ */}
        <Card t={c} style={{ marginBottom: 12, padding: 16 }}>
          {/* Header poids */}
          <View style={st.rowBtw}>
            <View style={st.rowC}>
              <LinearGradient colors={[c.success, '#059669']} style={st.weightIcon}>
                <Ionicons name="fitness" size={16} color="#FFF" />
              </LinearGradient>
              <View style={{ marginLeft: 10 }}>
                <Text style={[st.cardTitle, { color: c.text }]}>Poids actuel</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>Objectif 75 kg</Text>
              </View>
            </View>
            <View style={[st.goalBadge, { backgroundColor: c.primarySoft, borderColor: c.primary + '50' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>Perte de poids</Text>
            </View>
          </View>

          {/* 3 metrics */}
          <View style={st.threeMetrics}>
            <View style={st.metricCol}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted, letterSpacing: 1 }}>PERDU</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: c.primary }}>-2.3 kg</Text>
            </View>
            <View style={[st.metricCol, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.cardAlt }]}>
              <View style={st.rowC}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: c.text }}>80.2</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.textMuted, marginTop: 10 }}>kg</Text>
              </View>
            </View>
            <View style={[st.metricCol, { alignItems: 'flex-end' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted, letterSpacing: 1 }}>RESTE</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: c.primary }}>5.2 kg</Text>
            </View>
          </View>

          {/* Progress bar poids */}
          <View style={{ marginTop: 10, marginBottom: 6 }}>
            <View style={{ height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.primary + '40', overflow: 'hidden' }}>
              <View style={{ width: '44%', height: '100%', borderRadius: 5, backgroundColor: c.primary }} />
            </View>
            <View style={st.rowBtw}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary, marginTop: 4 }}>82.5 kg</Text>
              <Text style={{ fontSize: 11, fontWeight: '800', color: c.primary, marginTop: 4 }}>44%</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary, marginTop: 4 }}>75.0 kg</Text>
            </View>
          </View>

          {/* Body composition */}
          <View style={[st.bodyComp, { backgroundColor: c.cardAlt }]}>
            <View style={st.bodyCompItem}>
              <Dumbbell size={13} color="#EF4444" strokeWidth={2.5} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted }}>Muscle</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.text }}>43.5 kg</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#EF4444' }}>54%</Text>
            </View>
            <View style={{ width: 1, backgroundColor: c.card, height: '100%' }} />
            <View style={st.bodyCompItem}>
              <Apple size={13} color="#F59E0B" strokeWidth={2.5} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted }}>Graisse</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.text }}>13.0 kg</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#F59E0B' }}>16%</Text>
            </View>
            <View style={{ width: 1, backgroundColor: c.card, height: '100%' }} />
            <View style={st.bodyCompItem}>
              <Droplets size={13} color="#3B82F6" strokeWidth={2.5} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: c.textMuted }}>Eau</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.text }}>46.8 kg</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#3B82F6' }}>58%</Text>
            </View>
          </View>

          {/* Graphique barres horizontales scrollable */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12, height: 140 }}
            data={weights}
            keyExtractor={(_, i) => `w${i}`}
            renderItem={({ item: w, index }) => {
              const pct = 30 + ((w - minW) / wRange) * 70;
              const d = new Date();
              d.setDate(d.getDate() - index);
              return (
                <View style={{ alignItems: 'center', width: 42 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{w.toFixed(1)}</Text>
                  <View style={{ flex: 1, width: 22, borderRadius: 6, backgroundColor: c.cardAlt, marginVertical: 4, overflow: 'hidden', justifyContent: 'flex-end' }}>
                    <LinearGradient
                      colors={[c.primary, c.primary + 'CC', c.primary + '88']}
                      style={{ height: `${pct}%`, borderRadius: 6 }}
                    />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{d.getDate()}</Text>
                  <Text style={{ fontSize: 8, fontWeight: '600', color: c.textMuted }}>
                    {['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'][d.getMonth()]}
                  </Text>
                </View>
              );
            }}
          />

          {/* Prédictions */}
          <View style={[st.predictions, { backgroundColor: c.sleepSoft }]}>
            <View style={[st.rowC, { gap: 4, marginBottom: 6 }]}>
              <TrendingUp size={13} color={c.sleep} strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.sleep }}>Prédictions</Text>
            </View>
            <View style={st.rowBtw}>
              {[{ l: '30j', v: '79.3' }, { l: '90j', v: '77.8' }, { l: '6 mois', v: '76.0' }, { l: '1 an', v: '75.0' }].map((p, i) => (
                <View key={i} style={{ alignItems: 'center', flex: 1, borderRightWidth: i < 3 ? 1 : 0, borderRightColor: c.sleep + '20' }}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: c.textMuted }}>{p.l}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{p.v} kg</Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        {/* ═══ 5. DÉFIS GAMING ═══ */}
        <LinearGradient
          colors={combo === 'ocean'
            ? [c.card, c.primarySoft, c.card]
            : [c.card, c.primarySoft, c.card]
          }
          style={{ borderRadius: 20, marginBottom: 12, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 14 }, android: { elevation: 4 } }) }}
        >
          <View style={{ padding: 16 }}>
            {/* Header gaming */}
            <View style={st.rowBtw}>
              <View style={st.rowC}>
                <LinearGradient colors={[c.gold, c.goldDark]} style={st.questIconWrap}>
                  <Target size={20} color="#000" strokeWidth={2.5} />
                </LinearGradient>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[st.cardTitle, { color: c.text }]}>Défis</Text>
                  <View style={[st.rowC, { gap: 3 }]}>
                    <Zap size={12} color={c.gold} fill={c.gold} />
                    <Text style={{ fontSize: 12, fontWeight: '800', color: c.gold }}>+{totalXP} XP</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: c.gold }}>{completedCount}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>/{quests.length}</Text>
              </View>
            </View>

            {/* Tabs */}
            <View style={[st.rowC, { gap: 8, marginTop: 12, marginBottom: 10 }]}>
              {(['day', 'week', 'month'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[st.questTab, { backgroundColor: questTab === tab ? c.primary : c.cardAlt, borderColor: questTab === tab ? c.primary : 'transparent' }]}
                  onPress={() => setQuestTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, fontWeight: questTab === tab ? '800' : '600', color: questTab === tab ? '#FFF' : c.textMuted }}>
                    {tab === 'day' ? 'Jour' : tab === 'week' ? 'Semaine' : 'Mois'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Progress bar gaming */}
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.cardAlt, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
              <LinearGradient
                colors={[c.gold, c.goldDark, '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: `${(completedCount / quests.length) * 100}%`, height: '100%', borderRadius: 5 }}
              />
              {[0.25, 0.5, 0.75, 1].map((pos, i) => (
                <View key={i} style={{ position: 'absolute', left: `${pos * 100 - 3}%`, top: -2 }}>
                  <Star size={14} color={(completedCount / quests.length) >= pos ? c.gold : c.textMuted + '40'} fill={(completedCount / quests.length) >= pos ? c.gold : 'transparent'} />
                </View>
              ))}
            </View>

            {/* Quest list */}
            {quests.map((q, i) => (
              <View key={q.id} style={[st.questItem, { backgroundColor: q.done ? c.success + '15' : c.cardAlt }]}>
                <View style={[st.questIconBg, { backgroundColor: q.color + '20' }]}>
                  {q.done ? (
                    <CheckCircle2 size={18} color={c.success} fill={c.success + '30'} />
                  ) : (
                    <q.icon size={18} color={q.color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ fontSize: 13, fontWeight: '700', color: q.done ? c.textMuted : c.text }, q.done && { textDecorationLine: 'line-through' }]} numberOfLines={1}>
                    {q.title}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '500', color: c.textMuted }} numberOfLines={1}>{q.desc}</Text>
                  {!q.done && q.progress !== undefined && (
                    <View style={{ marginTop: 4 }}>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.cardAlt, overflow: 'hidden' }}>
                        <View style={{ width: `${q.progress}%`, height: '100%', borderRadius: 2, backgroundColor: q.color }} />
                      </View>
                    </View>
                  )}
                </View>
                <View style={[st.xpBadge, { backgroundColor: q.done ? c.success + '30' : c.gold }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: q.done ? '#FFF' : '#000' }}>
                    {q.done ? '✓' : `+${q.xp}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ═══ 6. HYDRATATION ═══ */}
        <Card t={c} style={{ marginBottom: 12, padding: 16 }}>
          <View style={st.rowBtw}>
            <View style={st.rowC}>
              <View style={[st.iconCircle, { backgroundColor: c.waterSoft }]}>
                <Droplets size={18} color={c.water} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[st.cardTitle, { color: c.text }]}>Hydratation</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>Objectif 2500 ml</Text>
              </View>
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: c.water }}>
              1800<Text style={{ fontSize: 12, fontWeight: '600' }}> ml</Text>
            </Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <Bar pct={72} color={c.water} bg={c.waterSoft} h={10} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted, marginTop: 4 }}>72% — il te reste 700 ml</Text>
          </View>
        </Card>

        {/* ═══ 7. SOMMEIL ═══ */}
        <Card t={c} style={{ marginBottom: 12, padding: 16 }}>
          <View style={st.rowBtw}>
            <View style={st.rowC}>
              <View style={[st.iconCircle, { backgroundColor: c.sleepSoft }]}>
                <Moon size={18} color={c.sleep} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[st.cardTitle, { color: c.text }]}>Sommeil</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>Objectif 8h</Text>
              </View>
            </View>
            <View style={st.rowC}>
              <Text style={{ fontSize: 30, fontWeight: '900', color: c.sleep }}>7</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted }}>h</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', color: c.sleep }}> 32</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted }}>m</Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Bar pct={94} color={c.sleep} bg={c.sleepSoft} h={10} />
            <View style={[st.rowBtw, { marginTop: 4 }]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>94% de l'objectif</Text>
              <View style={{ backgroundColor: c.warningSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: c.warning }}>Dette: 2h30</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* ═══ 8. CHARGE ═══ */}
        <Card t={c} style={{ marginBottom: 12, padding: 16 }}>
          <View style={[st.rowBtw, { marginBottom: 10 }]}>
            <View style={st.rowC}>
              <View style={[st.iconCircle, { backgroundColor: c.successSoft }]}>
                <Activity size={18} color={c.success} />
              </View>
              <Text style={[st.cardTitle, { color: c.text, marginLeft: 10 }]}>Charge d'entraînement</Text>
            </View>
            <View style={{ backgroundColor: c.successSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: c.success }}>Modérée</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, gap: 4 }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
              const h = [0.4, 0.7, 0.3, 0.8, 0.5, 0.9, 0.2][i];
              const today = i === 4;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 22, height: h * 55, borderRadius: 7, backgroundColor: today ? c.primary : c.primarySoft }} />
                  <Text style={{ fontSize: 10, fontWeight: today ? '800' : '600', color: today ? c.text : c.textMuted, marginTop: 3 }}>{d}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* ═══ 9. STATS ROW ═══ */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          {[
            { label: 'pas', val: '8 432', icon: Footprints, color: c.primary, bg: c.primarySoft },
            { label: 'kcal', val: '486', icon: Flame, color: c.fire, bg: c.fireSoft },
            { label: 'jours', val: '14', icon: Zap, color: c.warning, bg: c.warningSoft },
          ].map((s, i) => (
            <Card key={i} t={c} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <View style={[st.iconCircle, { backgroundColor: s.bg, width: 36, height: 36, borderRadius: 18 }]}>
                <s.icon size={16} color={s.color} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: c.text, marginTop: 6 }}>{s.val}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* ═══ 10. RAPPORT HEBDO ═══ */}
        <Card t={c} style={{ marginBottom: 12, overflow: 'hidden' }}>
          <LinearGradient colors={[c.primary, c.primaryDark]} style={{ padding: 18 }}>
            <View style={[st.rowC, { gap: 8, marginBottom: 14 }]}>
              <FileText size={20} color="#FFF" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>Rapport Hebdomadaire</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                { l: 'Poids', v: '-0.7 kg', icon: <TrendingDown size={13} color="#FFF" /> },
                { l: 'Entraînements', v: '4 séances', icon: <Dumbbell size={13} color="#FFF" /> },
                { l: 'Sommeil moy.', v: '7h15', icon: <Moon size={13} color="#FFF" /> },
                { l: 'Pas totaux', v: '52 840', icon: <Footprints size={13} color="#FFF" /> },
              ].map((r, i) => (
                <View key={i} style={{ width: (SW - 62) / 2, backgroundColor: '#FFFFFF12', borderRadius: 14, padding: 12, gap: 3 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF20', alignItems: 'center', justifyContent: 'center' }}>
                    {r.icon}
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '900', color: '#FFF' }}>{r.v}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFFAA' }}>{r.l}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Card>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>
    </View>
  );
}

// ============================================================
const st = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16 },

  // Switcher
  switchWrap: { position: 'absolute', left: 0, right: 0, zIndex: 100, flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 } }) },
  switcher: { flex: 1, flexDirection: 'row', borderRadius: 14, padding: 3, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 } }) },
  switchBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11 },
  switchTxt: { fontSize: 13, fontWeight: '700', color: '#5A6A7A' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  profileFrame: { width: 80, height: 80, borderRadius: 18, borderWidth: 2.5, overflow: 'hidden', backgroundColor: '#FFF' },
  profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  profilePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  greetSmall: { fontSize: 14, fontWeight: '500' },
  greetBig: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },

  // Rank
  rankRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatarFrame: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  levelBadge: { position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  rankNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankName: { fontSize: 14, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },

  // Shared
  rowBtw: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowC: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Weight
  weightIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5 },
  threeMetrics: { flexDirection: 'row', marginTop: 14 },
  metricCol: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bodyComp: { flexDirection: 'row', borderRadius: 14, padding: 10, marginTop: 10 },
  bodyCompItem: { flex: 1, alignItems: 'center', gap: 2 },
  predictions: { borderRadius: 14, padding: 12, marginTop: 10 },

  // Quests
  questIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  questTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  questItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 10, marginBottom: 6, gap: 10 },
  questIconBg: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  xpBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, minWidth: 40, alignItems: 'center' },
});
