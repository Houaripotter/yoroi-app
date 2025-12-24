# YOROI - Plan Technique Détaillé - Amélioration Stats

**Date:** 23 décembre 2025
**Version:** 1.0
**Status:** Ready for Implementation

---

## 📋 EXECUTIVE SUMMARY

Ce document présente le plan technique détaillé pour l'implémentation des améliorations de l'écran Stats et des nouvelles fonctionnalités de YOROI, basé sur l'analyse du cahier des charges et l'exploration approfondie du code existant.

### Découvertes Clés de l'Exploration

✅ **Infrastructures Déjà en Place:**
- Services complets pour le sommeil et l'hydratation (AsyncStorage)
- Système de logos de clubs déjà implémenté (inactif)
- Composants d'affichage riches (SleepCard, HydrationTracker, WeightCard)
- Bouton Competition déjà présent sur l'écran d'accueil
- Database schema prête pour les mesures et composition corporelle
- Service de calcul de charge d'entraînement (RPE × Durée)

⚠️ **Éléments Manquants:**
- Onglet Vitalité (regroupant sommeil + hydratation)
- Onglet Performance (Work/Rest Ratio, charge cumulative)
- Visualisation de la composition corporelle
- Onglet Mesures avec interface utilisateur
- Logos de sports activés dans l'affichage des stats
- Tab Compétitions dans le Planning
- Database tables pour sleep/hydration dans Supabase (actuellement AsyncStorage uniquement)

---

## 🎯 PHASE 1 - IMPLÉMENTATION (Semaine 1)

### Objectifs Phase 1:
1. ✅ Ajouter scroll horizontal aux tabs Stats
2. ✅ Créer onglet Vitalité (Sommeil + Hydratation)
3. ✅ Activer logos/icônes pour les sports
4. ✅ Améliorer affichage "PAR SPORT" avec logos
5. ✅ Ajouter onglet Composition corporelle
6. ✅ Ajouter onglet Mesures

---

## 📐 ARCHITECTURE ACTUELLE

### Écran Stats (`app/stats.tsx`)

**Onglets Actuels (5):**
```typescript
type StatsTab = 'charge' | 'radar' | 'sante' | 'poids' | 'resume';
```

1. **Charge** (Flame) - Charge d'entraînement hebdomadaire
2. **Radar** (Target) - Radar de performance (5 axes)
3. **Santé** (Activity) - Tendances santé (MOCK: sommeil, stress)
4. **Poids** (Target) - Évolution du poids (14 derniers jours)
5. **Résumé** (Calendar) - Résumé hebdomadaire

**Pattern d'Implémentation:**
- Custom tab system (NO external library)
- `useState` pour tab state
- Support URL params (`?tab=charge`)
- ScrollView horizontal pour tab bar
- TouchableOpacity buttons pour switching
- Conditional rendering basé sur `activeTab`

**Data Loading:**
```typescript
const loadAllStats = async () => {
  // Training Load
  const stats = await getWeeklyLoadStats(); // AsyncStorage

  // Health (MOCK)
  const mockHealthData = [...]; // Generated

  // Weight
  const weights = await getWeights(); // SQLite
  const last14 = weights.slice(0, 14).reverse();

  // Trainings
  const trainings = await getTrainings(); // SQLite
};
```

### Services Disponibles

**1. Sleep Service (`lib/sleepService.ts`)**
- ✅ Persistance AsyncStorage
- ✅ Calcul dette de sommeil (7 jours)
- ✅ Quality rating (1-5 étoiles)
- ✅ Bedtime/Wake time tracking
- ✅ Sleep goal management (défaut 8h)
- ✅ Trend analysis
- ✅ Apple Health integration (via `healthConnect.ios.ts`)

**2. Hydration (`lib/storage.ts`)**
- ✅ Logging avec timestamps
- ✅ Training day bonus (+0.5L)
- ✅ Weight-based goal calculation (poids × 0.033L)
- ✅ Reminder system
- ✅ 7-day historical tracking
- ✅ Corrélation hydratation/perte de poids

**3. Training Load Service (`lib/trainingLoadService.ts`)**
- ✅ AsyncStorage persistence
- ✅ RPE × Duration calculation
- ✅ Weekly stats avec risk levels
- ✅ Safe < 1500, Moderate < 2000, High < 2500, Danger > 2500

**4. Readiness Service (`lib/readinessService.ts`)**
- ✅ Score global (0-100)
- ✅ Facteurs: Sleep (35%), Charge (30%), Hydration (20%), Streak (15%)
- ✅ Niveaux: optimal/good/moderate/poor/critical
- ✅ Recommandations: go/caution/rest

### Database Schema Existante

**Tables Pertinentes:**

```sql
-- Poids et composition corporelle
CREATE TABLE weights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weight REAL NOT NULL,
  fat_percent REAL,
  muscle_percent REAL,
  water_percent REAL,
  bone_mass REAL,
  visceral_fat INTEGER,
  metabolic_age INTEGER,
  bmr INTEGER,
  note TEXT,
  source TEXT DEFAULT 'manual',
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Mesures corporelles
CREATE TABLE measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chest REAL,
  waist REAL,
  hips REAL,
  left_arm REAL,
  right_arm REAL,
  left_thigh REAL,
  right_thigh REAL,
  left_calf REAL,
  right_calf REAL,
  shoulders REAL,
  neck REAL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Entraînements
CREATE TABLE trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER,
  sport TEXT NOT NULL,
  session_type TEXT,
  date TEXT NOT NULL,
  start_time TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  muscles TEXT,
  exercises TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs (id)
);

-- Clubs
CREATE TABLE clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  logo_uri TEXT,
  color TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Compétitions (EXISTE DÉJÀ!)
CREATE TABLE competitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sport TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  category TEXT,
  weight_class TEXT,
  notes TEXT,
  status TEXT DEFAULT 'upcoming',
  result TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Fonctions DB Disponibles:**
- `getWeights(days?)`
- `getCompositionHistory(limit)`
- `getTrainings(days?)`
- `getTrainingStats()` - Groupé par sport/club
- `getMeasurements(days?)`
- `getLatestMeasurement()`

### Composants Existants

**Cartes Animées:**
- `WeightCard.tsx` - Poids avec sparkline
- `SleepCard.tsx` - Sommeil avec breathing animation
- `ChargeCard.tsx` - Charge avec circular progress
- `HydrationTracker.tsx` - Hydratation avec 12 gouttes animées
- `AnimatedCard.tsx` - Wrapper pour animations d'entrée
- `PerformanceRadar.tsx` - Radar 5 axes SVG

**Charts:**
- `AnimatedSparkline.tsx` - Mini graphique pour tendances
- `WeightSparkline.tsx` - Sparkline spécifique poids
- Custom SVG bar charts (inline dans stats.tsx)
- Custom SVG line charts (inline dans stats.tsx)

### Sport Icons System

**Fichier:** `lib/sports.ts`

**40+ sports définis** avec:
```typescript
interface Sport {
  id: string;
  name: string;
  icon: string; // MaterialCommunityIcons name
  color: string; // Hex color
  category: string;
  muscles?: string[];
}
```

**Helper functions:**
- `getSportById(id)` - Retourne Sport object
- `getSportIcon(sportId)` - Retourne icon name
- `getSportColor(sportId)` - Retourne hex color
- `getSportName(sportId)` - Retourne display name

**Club Logos (DÉJÀ IMPLÉMENTÉ mais commenté):**
```typescript
// Dans lib/sports.ts - ACTUELLEMENT COMMENTÉ
const CLUB_LOGOS: { [key: string]: any } = {
  'gracie-barra': require('@/assets/images/gracie-barra.png'),
  'basic-fit': require('@/assets/images/basic-fit.png'),
  'marseille-fight-club': require('@/assets/images/marseille-fight-club.jpg'),
};

// Fonction disponible
export const getClubLogoSource = (logoUri: string) => {
  if (!logoUri) return null;
  if (logoUri.startsWith('file://') || logoUri.startsWith('content://')) {
    return { uri: logoUri };
  }
  return CLUB_LOGOS[logoUri] || null;
};
```

**Assets Existants:**
- `assets/images/gracie-barra.png`
- `assets/images/basic-fit.png`
- `assets/images/marseille-fight-club.jpg`
- `assets/images/gracie-barra-olives.jpg`
- `assets/images/bodygator.jpg`

---

## 🔧 IMPLÉMENTATION DÉTAILLÉE - PHASE 1

### 1️⃣ Modifier la Structure des Tabs Stats

**Fichier:** `app/stats.tsx`

**Changements:**

**A. Nouveau type StatsTab**
```typescript
// AVANT (ligne ~60)
type StatsTab = 'charge' | 'radar' | 'sante' | 'poids' | 'resume';

// APRÈS
type StatsTab = 'discipline' | 'poids' | 'composition' | 'mesures' | 'vitalite' | 'performance';
```

**B. Nouvelle définition des tabs (ligne ~95)**
```typescript
const tabs: { id: StatsTab; label: string; icon: any }[] = [
  { id: 'discipline', label: 'Discipline', icon: Flame },
  { id: 'poids', label: 'Poids', icon: Target },
  { id: 'composition', label: 'Compo', icon: Activity },
  { id: 'mesures', label: 'Mesures', icon: Ruler },
  { id: 'vitalite', label: 'Vitalité', icon: Heart },
  { id: 'performance', label: 'Perf', icon: TrendingUp },
];
```

**C. Tab state initial avec URL param support**
```typescript
const params = useLocalSearchParams();
const [activeTab, setActiveTab] = useState<StatsTab>(
  (params.tab as StatsTab) || 'discipline'
);
```

**D. Scroll horizontal pour tabs (DÉJÀ EN PLACE, conserver)**
```tsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.tabsContainer}
>
  {tabs.map((tab) => (
    <TouchableOpacity
      key={tab.id}
      style={[
        styles.tab,
        activeTab === tab.id && {
          backgroundColor: colors.accent,
        },
      ]}
      onPress={() => setActiveTab(tab.id)}
    >
      <tab.icon
        size={16}
        color={activeTab === tab.id ? '#FFF' : colors.textSecondary}
      />
      <Text
        style={[
          styles.tabText,
          activeTab === tab.id && styles.tabTextActive,
        ]}
      >
        {tab.label}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
```

**E. Conditional rendering des tabs**
```tsx
{activeTab === 'discipline' && <DisciplineTab />}
{activeTab === 'poids' && <PoidsTab />}
{activeTab === 'composition' && <CompositionTab />}
{activeTab === 'mesures' && <MesuresTab />}
{activeTab === 'vitalite' && <VitaliteTab />}
{activeTab === 'performance' && <PerformanceTab />}
```

---

### 2️⃣ Créer l'Onglet DISCIPLINE

**Fichier à créer:** `components/stats/DisciplineTab.tsx`

**Fonctionnalités:**
1. Réutiliser le contenu actuel de l'onglet "Charge"
2. Ajouter les logos de sports dans "PAR SPORT"
3. Garder le graphique de charge hebdomadaire
4. Ajouter le cercle objectif d'entraînements

**Code:**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTheme } from '@/lib/appearanceService';
import { getWeeklyLoadStats } from '@/lib/trainingLoadService';
import { getTrainingStats, getTrainings } from '@/lib/database';
import { getSportColor, getSportIcon, getClubLogoSource } from '@/lib/sports';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Flame, Target } from 'lucide-react-native';
import ChargeCard from '@/components/ChargeCard';

interface SportStat {
  sport: string;
  count: number;
  club_name?: string;
  club_logo?: string;
  club_color?: string;
}

export default function DisciplineTab() {
  const colors = useTheme();
  const [loadStats, setLoadStats] = useState<any>(null);
  const [sportStats, setSportStats] = useState<SportStat[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(4); // Objectif hebdomadaire

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Charge d'entraînement
    const stats = await getWeeklyLoadStats();
    setLoadStats(stats);

    // Stats par sport
    const stats = await getTrainingStats();
    setSportStats(stats);
  };

  // Compter entraînements de la semaine
  const getWeekTrainingCount = async () => {
    const trainings = await getTrainings(7);
    return trainings.length;
  };

  const [weekCount, setWeekCount] = useState(0);

  useEffect(() => {
    getWeekTrainingCount().then(setWeekCount);
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* CHARGE HEBDOMADAIRE */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Flame size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Charge Hebdomadaire
          </Text>
        </View>

        {loadStats && (
          <ChargeCard
            totalLoad={loadStats.currentWeekLoad}
            maxLoad={loadStats.maxWeeklyLoad}
            riskLevel={loadStats.riskLevel}
            onPress={() => {}}
          />
        )}

        {/* Graphique de charge (réutiliser le code existant de stats.tsx) */}
        {loadStats?.weeklyLoads && (
          <View style={styles.chartContainer}>
            {/* SVG Bar Chart ici - copier de stats.tsx lignes ~250-290 */}
          </View>
        )}
      </View>

      {/* OBJECTIF D'ENTRAÎNEMENTS */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Target size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Objectif Hebdomadaire
          </Text>
        </View>

        <View style={styles.goalContainer}>
          <View style={styles.goalCircle}>
            <Text style={[styles.goalCount, { color: colors.accent }]}>
              {weekCount}/{weeklyGoal}
            </Text>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
              Entraînements
            </Text>
          </View>

          {/* Barre de progression */}
          <View style={[styles.goalBar, { backgroundColor: colors.background }]}>
            <View
              style={[
                styles.goalBarFill,
                {
                  backgroundColor: colors.accent,
                  width: `${Math.min((weekCount / weeklyGoal) * 100, 100)}%`,
                },
              ]}
            />
          </View>

          {weekCount >= weeklyGoal && (
            <Text style={[styles.goalAchieved, { color: colors.accent }]}>
              ✓ Objectif atteint !
            </Text>
          )}
        </View>
      </View>

      {/* PAR SPORT (avec logos) */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Par Sport
        </Text>

        {sportStats.slice(0, 5).map((stat, index) => {
          const sportColor = getSportColor(stat.sport);
          const sportIcon = getSportIcon(stat.sport);
          const clubLogo = stat.club_logo ? getClubLogoSource(stat.club_logo) : null;

          return (
            <View key={index} style={styles.sportItem}>
              {/* Logo ou Icône */}
              <View
                style={[
                  styles.sportIconContainer,
                  { backgroundColor: sportColor + '20' },
                ]}
              >
                {clubLogo ? (
                  <Image source={clubLogo} style={styles.clubLogo} />
                ) : (
                  <MaterialCommunityIcons
                    name={sportIcon}
                    size={24}
                    color={sportColor}
                  />
                )}
              </View>

              {/* Infos */}
              <View style={styles.sportInfo}>
                <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                  {stat.sport}
                </Text>
                {stat.club_name && (
                  <Text style={[styles.clubName, { color: colors.textSecondary }]}>
                    {stat.club_name}
                  </Text>
                )}
              </View>

              {/* Compteur */}
              <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
                <Text style={[styles.countText, { color: colors.textPrimary }]}>
                  {stat.count}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  goalCircle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  goalCount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  goalLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  goalBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalAchieved: {
    fontSize: 14,
    fontWeight: '600',
  },
  sportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sportIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clubLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sportInfo: {
    flex: 1,
  },
  sportName: {
    fontSize: 16,
    fontWeight: '600',
  },
  clubName: {
    fontSize: 13,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    marginTop: 16,
    height: 200,
  },
});
```

---

### 3️⃣ Créer l'Onglet VITALITÉ

**Fichier à créer:** `components/stats/VitaliteTab.tsx`

**Fonctionnalités:**
1. Score Vitalité global (basé sur readinessService)
2. Section Sommeil avec dette, moyenne, tendance
3. Section Hydratation avec objectif, moyenne
4. Graphique combiné Sleep + Hydration (7 jours)
5. Insights expert (corrélations)

**Code:**

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/appearanceService';
import { getSleepStats } from '@/lib/sleepService';
import { getHydrationHistory, getAverageHydration } from '@/lib/storage';
import { calculateReadinessScore } from '@/lib/readinessService';
import { Heart, Moon, Droplet } from 'lucide-react-native';
import SleepCard from '@/components/SleepCard';
import HydrationTracker from '@/components/HydrationTracker';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 180;

export default function VitaliteTab() {
  const colors = useTheme();
  const [vitalityScore, setVitalityScore] = useState(0);
  const [sleepStats, setSleepStats] = useState<any>(null);
  const [hydrationData, setHydrationData] = useState<any[]>([]);
  const [avgHydration, setAvgHydration] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Score Vitalité (readiness)
    const streakDays = 7; // À récupérer du service de streaks
    const readiness = await calculateReadinessScore(streakDays);
    setVitalityScore(readiness.score);

    // Stats sommeil
    const sleep = await getSleepStats();
    setSleepStats(sleep);

    // Hydratation
    const hydro = await getHydrationHistory(7);
    setHydrationData(hydro);
    const avg = await getAverageHydration(7);
    setAvgHydration(avg);
  };

  // Couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'; // Excellent
    if (score >= 60) return '#F59E0B'; // Bon
    if (score >= 40) return '#FF9800'; // Moyen
    return '#EF4444'; // Faible
  };

  // Niveau du score
  const getScoreLevel = (score: number) => {
    if (score >= 80) return 'Excellente forme';
    if (score >= 60) return 'Bonne forme';
    if (score >= 40) return 'Forme modérée';
    return 'Récupération nécessaire';
  };

  return (
    <ScrollView style={styles.container}>
      {/* SCORE VITALITÉ */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Heart size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Score Vitalité
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: getScoreColor(vitalityScore) }]}>
            {vitalityScore}/100
          </Text>
          <Text style={[styles.scoreLevel, { color: colors.textSecondary }]}>
            {getScoreLevel(vitalityScore)}
          </Text>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          <View style={styles.breakdownItem}>
            <Moon size={16} color={colors.accent} />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Sommeil (35%)
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
              {sleepStats ? Math.round((sleepStats.averageDuration / 480) * 100) : 0}%
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Droplet size={16} color="#3B82F6" />
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Hydratation (20%)
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.textPrimary }]}>
              {Math.round((avgHydration / 2.5) * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* SOMMEIL - Détails */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Moon size={18} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Sommeil
          </Text>
        </View>

        {sleepStats && (
          <>
            <SleepCard
              duration={sleepStats.averageDuration}
              goal={sleepStats.goal}
              debtHours={sleepStats.debtHours}
              onPress={() => {}}
            />

            {/* Stats détaillées */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Moyenne
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {Math.floor(sleepStats.averageDuration / 60)}h
                  {String(sleepStats.averageDuration % 60).padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Dette
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        sleepStats.debtHours < -5
                          ? '#EF4444'
                          : sleepStats.debtHours < -2
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                >
                  {sleepStats.debtHours > 0 ? '+' : ''}
                  {sleepStats.debtHours.toFixed(1)}h
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Tendance
                </Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {sleepStats.trend === 'improving'
                    ? '📈'
                    : sleepStats.trend === 'declining'
                    ? '📉'
                    : '➡️'}
                </Text>
              </View>
            </View>

            {/* Insight Expert */}
            {sleepStats.debtHours < -5 && (
              <View style={[styles.insight, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.insightIcon}>💡</Text>
                <Text style={styles.insightText}>
                  Ton déficit de sommeil est important. Les semaines où tu dors moins de 6h,
                  ta fréquence d'entraînement baisse de 23%.
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* HYDRATATION - Détails */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.sectionHeader}>
          <Droplet size={18} color="#3B82F6" />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Hydratation
          </Text>
        </View>

        <HydrationTracker compact={false} />

        {/* Stats 7 derniers jours */}
        <View style={styles.hydrationWeek}>
          <Text style={[styles.weekLabel, { color: colors.textSecondary }]}>
            7 derniers jours
          </Text>
          <View style={styles.weekDays}>
            {hydrationData.map((day, index) => {
              const goalMet = day.totalAmount >= day.goal;
              return (
                <View key={index} style={styles.dayItem}>
                  <View
                    style={[
                      styles.dayDot,
                      { backgroundColor: goalMet ? '#10B981' : '#E5E7EB' },
                    ]}
                  />
                  <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'][new Date(day.date).getDay()]}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={[styles.weekStat, { color: colors.textPrimary }]}>
            Taux de réussite : {Math.round((hydrationData.filter(d => d.totalAmount >= d.goal).length / 7) * 100)}%
          </Text>
          <Text style={[styles.weekStat, { color: colors.textSecondary }]}>
            Moyenne : {avgHydration.toFixed(1)}L / jour
          </Text>
        </View>
      </View>

      {/* GRAPHIQUE COMBINÉ Sleep + Hydration */}
      <View style={[styles.section, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Tendances (7 jours)
        </Text>

        {/* TODO: Créer un graphique combiné avec Sleep (ligne) et Hydration (barres) */}
        <View style={styles.chartPlaceholder}>
          <Text style={{ color: colors.textSecondary }}>
            Graphique combiné Sommeil + Hydratation
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLevel: {
    fontSize: 16,
    marginTop: 8,
  },
  breakdown: {
    marginTop: 16,
    gap: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  insight: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  insightIcon: {
    fontSize: 20,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  hydrationWeek: {
    marginTop: 16,
  },
  weekLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayItem: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 11,
  },
  weekStat: {
    fontSize: 13,
    marginTop: 4,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 12,
  },
});
```

---

### 4️⃣ Activer les Logos de Sports

**Fichier:** `lib/sports.ts`

**Action:** Décommenter la section CLUB_LOGOS (ligne ~400)

```typescript
// AVANT (commenté)
// const CLUB_LOGOS: { [key: string]: any } = {
//   'gracie-barra': require('@/assets/images/gracie-barra.png'),
//   'basic-fit': require('@/assets/images/basic-fit.png'),
//   'marseille-fight-club': require('@/assets/images/marseille-fight-club.jpg'),
// };

// APRÈS (décommenté et étendu)
const CLUB_LOGOS: { [key: string]: any } = {
  // JJB
  'gracie-barra': require('@/assets/images/gracie-barra.png'),
  'gracie-barra-olives': require('@/assets/images/gracie-barra-olives.jpg'),

  // Fitness
  'basic-fit': require('@/assets/images/basic-fit.png'),
  'bodygator': require('@/assets/images/bodygator.jpg'),

  // MMA
  'marseille-fight-club': require('@/assets/images/marseille-fight-club.jpg'),
};

export const getClubLogoSource = (logoUri: string) => {
  if (!logoUri) return null;
  if (logoUri.startsWith('file://') || logoUri.startsWith('content://')) {
    return { uri: logoUri };
  }
  return CLUB_LOGOS[logoUri] || null;
};
```

---

### 5️⃣ Créer Onglets Restants (Stubs)

**Fichiers à créer:**

**A. `components/stats/PoidsTab.tsx`**
- Réutiliser le code actuel de l'onglet "poids" dans stats.tsx
- WeightCard avec sparkline
- Graphique d'évolution 14 jours

**B. `components/stats/CompositionTab.tsx`**
- Afficher fat_percent, muscle_percent, water_percent
- Graphiques d'évolution pour chaque métrique
- Calculer les variations

**C. `components/stats/MesuresTab.tsx`**
- Afficher les mesures corporelles (waist, chest, arms, etc.)
- Graphiques d'évolution
- Comparaison date vs date

**D. `components/stats/PerformanceTab.tsx`** (Phase 2)
- Work/Rest Ratio
- Charge cumulative
- RPE breakdown
- Stub pour Phase 1

---

## 📊 MODIFICATIONS DE LA BASE DE DONNÉES

### Nouvelles Tables Recommandées (Supabase)

**Note:** Actuellement sleep et hydration sont dans AsyncStorage. Pour le sync cloud, créer:

```sql
-- Sleep entries
CREATE TABLE sleep_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  bed_time time NOT NULL,
  wake_time time NOT NULL,
  duration integer NOT NULL, -- minutes
  quality integer CHECK (quality >= 1 AND quality <= 5),
  notes text,
  source varchar(20) DEFAULT 'manual', -- manual, apple_health
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sleep_entries_user_date ON sleep_entries(user_id, date DESC);

-- Hydration entries
CREATE TABLE hydration_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount integer NOT NULL, -- ml
  timestamp timestamptz NOT NULL,
  source varchar(20) DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_hydration_entries_user_date ON hydration_entries(user_id, date DESC);

-- Hydration settings
CREATE TABLE hydration_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_goal_liters decimal(3,1) NOT NULL DEFAULT 2.5,
  custom_goal_liters decimal(3,1),
  reminder_enabled boolean DEFAULT false,
  reminder_interval_minutes integer DEFAULT 120,
  training_day_bonus_liters decimal(2,1) DEFAULT 0.5,
  updated_at timestamptz DEFAULT now()
);
```

**Migration Strategy:**
- Phase 1: Continuer avec AsyncStorage (pas de breaking changes)
- Phase 2: Migrer vers Supabase pour sync multi-device

---

## 🎨 CONSTANTES ET ICÔNES

### Sport Icons Extension

**Fichier à créer:** `constants/sportIcons.ts`

```typescript
// Extension du système existant avec emojis pour affichage
export const SPORT_ICONS_EMOJI = {
  // Combat
  'jjb': '🥋',
  'bjj': '🥋',
  'mma': '🥊',
  'boxe': '🥊',
  'muay_thai': '🥊',
  'judo': '🥋',

  // Fitness
  'musculation': '🏋️',
  'fitness': '🏋️',
  'crossfit': '🏋️',
  'hiit': '⚡',

  // Cardio
  'running': '🏃',
  'cyclisme': '🚴',
  'natation': '🏊',

  // Autres
  'yoga': '🧘',
  'escalade': '🧗',

  'default': '💪',
};

export const getSportEmoji = (sportName: string): string => {
  const key = sportName.toLowerCase().replace(/\s+/g, '_');
  return SPORT_ICONS_EMOJI[key] || SPORT_ICONS_EMOJI['default'];
};
```

---

## 📱 MODIFICATIONS DE L'ÉCRAN D'ACCUEIL

### Bouton Competition

**Fichier:** `app/(tabs)/index.tsx`

**Status:** ✅ Déjà implémenté ! Pas de changements nécessaires.

Le bouton Competition existe déjà (lignes 511-560) et affiche:
- Soit le prochain événement (J-XX + nom + sport)
- Soit "Ajouter" si pas d'événement

**Amélioration recommandée:** Afficher le nom du sport avec emoji
```typescript
// Dans le composant Competition button (ligne ~520)
const sportEmoji = getSportEmoji(nextEvent.sport);

<Text style={styles.eventIcon}>{sportEmoji}</Text>
<Text style={styles.countdown}>J-{nextEvent.daysRemaining}</Text>
<Text style={styles.eventName}>{nextEvent.name}</Text>
```

---

## 🗓️ PLANNING - TAB COMPÉTITIONS (Phase 2)

**Fichier:** `app/planning.tsx` (modifier pour ajouter un tab)

**Nouveau composant:** `components/CompetitionsTab.tsx`

**Fonctionnalités:**
1. Liste des compétitions programmées
2. Calendrier officiel (scraping CFJJB, FFBoxe, etc.)
3. Système de rappels
4. Lien d'inscription
5. Suivi de résultats

**Database (déjà existante):**
Table `competitions` avec tous les champs nécessaires

---

## ✅ CHECKLIST D'IMPLÉMENTATION PHASE 1

### Semaine 1 - Priorité Haute

- [ ] **1. Modifier app/stats.tsx**
  - [ ] Changer type `StatsTab` (6 tabs au lieu de 5)
  - [ ] Modifier array `tabs` avec nouvelles définitions
  - [ ] Ajouter conditional rendering pour nouveaux tabs
  - [ ] Tester scroll horizontal

- [ ] **2. Créer DisciplineTab.tsx**
  - [ ] Copier code de l'onglet "Charge" actuel
  - [ ] Ajouter section "Objectif Hebdomadaire" avec cercle
  - [ ] Implémenter SportItem avec logos
  - [ ] Intégrer ChargeCard existant
  - [ ] Tester avec données réelles

- [ ] **3. Créer VitaliteTab.tsx**
  - [ ] Créer composant de base
  - [ ] Intégrer Score Vitalité (readinessService)
  - [ ] Ajouter section Sommeil (SleepCard)
  - [ ] Ajouter section Hydratation (HydrationTracker)
  - [ ] Implémenter stats détaillées
  - [ ] Ajouter insights expert
  - [ ] Tester avec données réelles

- [ ] **4. Activer logos de sports**
  - [ ] Décommenter CLUB_LOGOS dans lib/sports.ts
  - [ ] Vérifier que getClubLogoSource fonctionne
  - [ ] Tester avec clubs existants (Gracie Barra, Basic Fit)
  - [ ] Vérifier affichage dans DisciplineTab

- [ ] **5. Créer PoidsTab.tsx**
  - [ ] Extraire code de l'onglet "poids" actuel
  - [ ] Créer composant séparé
  - [ ] Tester affichage

- [ ] **6. Créer CompositionTab.tsx**
  - [ ] Récupérer données de composition (getCompositionHistory)
  - [ ] Créer graphiques pour fat%, muscle%, water%
  - [ ] Afficher métabolisme de base (BMR)
  - [ ] Tester avec données réelles

- [ ] **7. Créer MesuresTab.tsx**
  - [ ] Récupérer getMeasurements()
  - [ ] Afficher liste des mesures
  - [ ] Créer graphiques d'évolution
  - [ ] Tester avec données réelles

- [ ] **8. Créer PerformanceTab.tsx (Stub)**
  - [ ] Créer composant vide avec placeholder
  - [ ] Afficher "Disponible prochainement"
  - [ ] Prévoir structure pour Phase 2

- [ ] **9. Tests finaux**
  - [ ] Tester tous les tabs
  - [ ] Vérifier scroll horizontal
  - [ ] Vérifier URL params (?tab=vitalite)
  - [ ] Tester avec données vides
  - [ ] Tester avec données complètes
  - [ ] Vérifier thème clair/sombre

---

## 🚀 PHASE 2 - FONCTIONNALITÉS AVANCÉES (Semaine 2-4)

### Semaine 2: Performance & Insights

- [ ] **PerformanceTab.tsx complet**
  - [ ] Work/Rest Ratio graphique
  - [ ] Charge cumulative avec seuils
  - [ ] RPE breakdown (légère/modérée/intense)
  - [ ] Alertes de surcharge

- [ ] **Insights Expert (AI-like)**
  - [ ] Service de corrélations
  - [ ] Analyse sommeil vs entraînement
  - [ ] Analyse hydratation vs performance
  - [ ] Analyse poids vs volume
  - [ ] Affichage contextualisé

### Semaine 3: Compétitions

- [ ] **Tab Compétitions dans Planning**
  - [ ] Modifier app/planning.tsx (2 tabs)
  - [ ] Créer CompetitionsTab.tsx
  - [ ] Liste des compétitions
  - [ ] Calendrier officiel
  - [ ] Système de rappels
  - [ ] Gestion des inscriptions

- [ ] **Database migrations**
  - [ ] Créer tables sleep_entries, hydration_entries
  - [ ] Migration AsyncStorage → Supabase
  - [ ] Service de sync

### Semaine 4: Body Map & Polish

- [ ] **Body Map pour Mesures**
  - [ ] Silhouette interactive SVG
  - [ ] Tap sur zone → graphique
  - [ ] Animation de sélection

- [ ] **Polish général**
  - [ ] Animations
  - [ ] Skeleton loaders
  - [ ] Error states
  - [ ] Empty states

---

## 📖 RÉFÉRENCES DE CODE

### Fichiers Clés à Étudier

| Fichier | Utilité |
|---------|---------|
| `app/stats.tsx` | Architecture actuelle des tabs |
| `lib/sleepService.ts` | Service sommeil complet |
| `lib/storage.ts` | Service hydratation |
| `lib/trainingLoadService.ts` | Calcul de charge |
| `lib/readinessService.ts` | Score de vitalité |
| `lib/sports.ts` | Définitions sports + logos |
| `components/SleepCard.tsx` | Composant sommeil |
| `components/HydrationTracker.tsx` | Composant hydratation |
| `components/WeightCard.tsx` | Composant poids |
| `components/ChargeCard.tsx` | Composant charge |

### Fonctions DB Importantes

```typescript
// Database
getWeights(days?)
getCompositionHistory(limit)
getTrainings(days?)
getTrainingStats() // ← Important pour PAR SPORT
getMeasurements(days?)

// Services
getWeeklyLoadStats() // trainingLoadService
getSleepStats() // sleepService
getHydrationHistory(days) // storage
calculateReadinessScore(streakDays) // readinessService

// Sports
getSportIcon(sportId)
getSportColor(sportId)
getClubLogoSource(logoUri) // ← À activer!
```

---

## 🎯 RÉSUMÉ DES ACTIONS IMMÉDIATES

### Pour commencer l'implémentation:

1. **Créer la structure des tabs** (app/stats.tsx)
   - Modifier type StatsTab
   - Ajouter nouveaux tabs
   - Configurer conditional rendering

2. **Créer les composants de tabs** (components/stats/)
   - DisciplineTab.tsx (priorité 1)
   - VitaliteTab.tsx (priorité 1)
   - PoidsTab.tsx (priorité 2)
   - CompositionTab.tsx (priorité 2)
   - MesuresTab.tsx (priorité 3)
   - PerformanceTab.tsx (stub, Phase 2)

3. **Activer les logos de sports** (lib/sports.ts)
   - Décommenter CLUB_LOGOS
   - Tester getClubLogoSource

4. **Tester avec données réelles**
   - Vérifier chaque tab
   - Tester scroll
   - Vérifier thèmes

**Estimation temps:** 3-4 jours pour Phase 1 complète

---

## 🔍 NOTES TECHNIQUES

### Performance

- **Lazy loading:** Charger les données du tab uniquement quand activé
- **Memoization:** Utiliser `useMemo` pour calculs lourds
- **Animated:** Utiliser `react-native-reanimated` pour animations fluides

### Accessibilité

- Ajouter `accessibilityLabel` sur tous les boutons
- Contraste de couleurs suffisant (WCAG AA)
- Taille des touch targets ≥ 44px

### Testing

- Tester avec compte vide (empty states)
- Tester avec beaucoup de données (pagination)
- Tester changements de thème
- Tester orientations (portrait/landscape)

---

**Document créé le:** 23 décembre 2025
**Dernière mise à jour:** 23 décembre 2025
**Status:** ✅ Ready for Implementation
