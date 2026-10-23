// ============================================
// BJJ SCORECARD : Noms complets, favoris, points CFJJB
// ============================================
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Star, Check, X, Search } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { traduire } from '@/lib/i18n/tr';

const FAV_KEY = 'bjj_fav_submissions_v2';

// ── Soumissions : nom français en premier, nom international en description ──
export const ALL_SUBMISSIONS: { id: string; short: string; full: string }[] = [
  // ── ÉTRANGLEMENTS DOS ──────────────────────────────────────
  { id: 'rnc',          short: 'RNC / Mata Leão',     full: traduire('Rear Naked Choke, étranglement dos') },
  { id: 'bowarrow',     short: 'Bow & Arrow',         full: traduire('Bow & Arrow Choke, étrang. gi depuis le dos') },
  { id: 'bodytri',      short: 'Body Triangle',       full: traduire('Body Triangle RNC : ciseaux + étrang. dos') },
  { id: 'reartri',      short: traduire('Triangle arrière'),    full: traduire('Rear Triangle, triangle depuis le dos') },
  { id: 'crucifix',     short: 'Crucifix',            full: traduire('Crucifix Choke, dos, bras verrouillé') },

  // ── ÉTRANGLEMENTS GARDE ────────────────────────────────────
  { id: 'triangle',     short: 'Triangle',            full: traduire('Triangle Choke, étranglement par les jambes') },
  { id: 'triangleinv',  short: traduire('Triangle inversé'),    full: traduire('Inverted Triangle, depuis les hanches') },
  { id: 'montedtri',    short: traduire('Triangle monté'),      full: traduire('Mounted Triangle, position montée') },
  { id: 'guillotine',   short: 'Guillotine',          full: traduire('Guillotine Choke, avant du cou') },
  { id: 'guillarmin',   short: 'Arm-in Guillotine',   full: traduire('Guillotine bras inclus, emprisonne le bras') },
  { id: 'marcelo',      short: 'Guillotine haute',    full: 'High Elbow Guillotine, Marcelotine' },
  { id: 'hipbumpguil',  short: 'Hip Bump Guillotine', full: traduire('Hip Bump + Guillotine, rebond de hanche') },

  // ── ÉTRANGLEMENTS AU SOL ───────────────────────────────────
  { id: 'darce',        short: "D'Arce",              full: traduire("D'Arce Choke, étranglement latéral avant") },
  { id: 'anaconda',     short: 'Anaconda',            full: traduire('Anaconda Choke, roulade, avant gorge') },
  { id: 'armtri',       short: 'Arm Triangle',        full: traduire('Arm Triangle / Kata Gatame, bras + épaule') },
  { id: 'northsouth',   short: 'Nord-Sud',            full: 'North-South Choke, position nord-sud' },
  { id: 'ezekiel',      short: 'Ezekiel',             full: traduire('Ezekiel Choke / Sode Guruma, depuis mont') },
  { id: 'buggy',        short: 'Buggy Choke',         full: traduire('Buggy Choke, avant-bras, de côté') },
  { id: 'loop',         short: 'Loop Choke',          full: 'Loop Choke, gi, col + manche' },
  { id: 'baseball',     short: 'Baseball Bat',        full: traduire('Baseball Bat Choke, gi, croisé') },
  { id: 'papercutter',  short: 'Paper Cutter',        full: 'Paper Cutter Choke, gi, tranche' },
  { id: 'brabo',        short: 'Brabo',               full: traduire('Brabo Choke, gi, sous l\'aisselle') },
  { id: 'clockchoke',   short: 'Clock Choke',         full: traduire('Clock Choke, depuis turtle, gi') },
  { id: 'vonflue',      short: 'Von Flue',            full: 'Von Flue Choke, contre guillotine' },
  { id: 'peruvian',     short: 'Peruvian Necktie',    full: 'Peruvian Necktie, triangle + rotation' },
  { id: 'gogoplata',    short: 'Gogoplata',           full: traduire('Gogoplata, tibia sur la gorge') },
  { id: 'twister',      short: 'Twister',             full: traduire('Twister, rotation vertébrale') },
  { id: 'lapelchoke',   short: 'Lapel Choke',         full: traduire('Lapel Choke, gi, revers de veste') },
  { id: 'daratine',     short: 'Daratine',            full: traduire("D'Arce-Triangle, combiné") },
  { id: 'katahajime',   short: 'Kata Ha Jime',        full: traduire('Kata Ha Jime, étranglement épaule + cou') },
  { id: 'japanesenetie',short: 'Japanese Necktie',    full: traduire('Japanese Necktie, étranglement avant-bras') },
  { id: 'mountedguill', short: traduire('Guillotine montée'),   full: traduire('Mounted Guillotine, depuis position montée') },
  { id: 'kesagatame',   short: 'Kesa Gatame',         full: traduire('Kesa Gatame Choke, étranglement écharpe') },
  { id: 'headscissor',  short: 'Head Scissors',       full: traduire('Head Scissors, pression tête par les jambes') },
  { id: 'ezekielguard', short: 'Ezekiel garde',       full: traduire('Ezekiel depuis garde fermée') },
  { id: 'necklace',     short: 'Necklace Choke',      full: 'Necklace Choke, cou libre, no-gi' },
  { id: 'chinstrap',    short: 'Chin Strap',          full: 'Chin Strap Choke, pression menton no-gi' },
  { id: 'crosstri',     short: traduire('Triangle croisé'),     full: traduire('Cross Body Triangle, sol croisé') },

  // ── LOCKS DE BRAS ──────────────────────────────────────────
  { id: 'armbar',       short: traduire('Clé de bras'),         full: 'Armbar / Juji-gatame, hyperextension coude' },
  { id: 'armbarguard',  short: traduire('Clé de bras garde'),   full: traduire('Armbar depuis garde fermée') },
  { id: 'armbarmount',  short: traduire('Clé de bras montée'),  full: traduire('Armbar depuis position montée') },
  { id: 'armbarback',   short: traduire('Clé de bras dos'),     full: traduire('Armbar depuis contrôle du dos') },
  { id: 'kimura',       short: 'Kimura',              full: traduire('Kimura, rotation épaule externe (bras derrière)') },
  { id: 'kimuratrap',   short: 'Kimura Trap',         full: traduire('Kimura Trap, système de contrôle kimura') },
  { id: 'americana',    short: traduire('Américaine'),          full: traduire('Americana / Ude-garami, rotation épaule interne') },
  { id: 'omoplata',     short: 'Omoplata',            full: traduire('Omoplata, rotation épaule par les jambes') },
  { id: 'monoplata',    short: 'Monoplata',           full: traduire('Monoplata, variante omoplata une jambe') },
  { id: 'baratoplata',  short: 'Baratoplata',         full: traduire('Baratoplata, lock épaule inversé') },
  { id: 'tarikoplata',  short: 'Tarikoplata',         full: traduire('Tarikoplata, depuis turtle, épaule') },
  { id: 'wristlock',    short: traduire('Clé de poignet'),      full: traduire('Wristlock, verrouillage du poignet') },
  { id: 'bicepslicer',  short: 'Bicep Slicer',        full: 'Bicep Slicer, compression biceps' },
  { id: 'shoulder',     short: traduire('Clé d\'épaule'),       full: traduire('Shoulder Lock, luxation épaule') },
  { id: 'hammerlock',   short: 'Hammerlock',          full: traduire('Hammerlock, bras verrouillé dans le dos') },
  { id: 'straightarm',  short: 'Straight Arm Lock',   full: 'Straight Arm Lock, coude tendu en extension' },
  { id: 'chickenwing',  short: 'Chicken Wing',        full: traduire('Chicken Wing, clé épaule + dos') },
  { id: 'spiderweb',    short: 'Spider Web',          full: traduire('Spider Web Armbar, isolation du bras') },
  { id: 'reversearmbar',short: 'Reverse Armbar',      full: traduire('Reverse Armbar, coude vers intérieur') },
  { id: 'mirlock',      short: 'Mir Lock',            full: traduire('Mir Lock, genou + bras combinés') },
  { id: 'gooseneck',    short: 'Gooseneck',           full: 'Gooseneck Wristlock, verrou poignet en S' },
  { id: 'canopener',    short: 'Can Opener',          full: traduire('Can Opener, pression nuque en garde fermée') },

  // ── LOCKS DE JAMBES ────────────────────────────────────────
  { id: 'heelint',      short: 'Heel Hook int.',      full: 'Inside Heel Hook, rotation genou interne' },
  { id: 'heelext',      short: 'Heel Hook ext.',      full: 'Outside Heel Hook, rotation genou externe' },
  { id: 'crossheel',    short: 'Cross Heel Hook',     full: traduire('Cross Heel Hook, heel hook croisé') },
  { id: 'kneebar',      short: traduire('Clé de genou'),        full: 'Kneebar, hyperextension genou' },
  { id: 'anklelock',    short: traduire('Clé de cheville'),     full: 'Straight Ankle Lock, extension cheville' },
  { id: 'anklerot',     short: 'Ankle Lock rotatif',  full: 'Rotational Ankle Lock, rotation + extension' },
  { id: 'toehold',      short: traduire('Clé de pied'),         full: 'Toe Hold, rotation pied + cheville' },
  { id: 'calfslicer',   short: 'Calf Slicer',         full: 'Calf Slicer, compression mollet' },
  { id: 'estima',       short: 'Estima Lock',         full: traduire('Estima Lock, depuis spider guard') },
  { id: 'electricchair',short: 'Electric Chair',      full: traduire('Electric Chair, depuis demi-garde') },
  { id: 'bananasplit',  short: 'Banana Split',        full: traduire('Banana Split, écartement des jambes') },
  { id: 'saddle',       short: 'Saddle / Sankaku',    full: traduire('Inside Sankaku / Saddle, heel hook intérieur') },
  { id: 'straightfoot', short: 'Straight Foot Lock',  full: 'Straight Foot Lock, extension cheville droite' },
  { id: 'suloev',       short: 'Suloev Stretch',      full: traduire('Suloev Stretch, extension hanche depuis turtle') },
  { id: 'aokilock',     short: 'Aoki Lock',           full: 'Aoki Lock, rotation cheville + pied' },
  { id: 'revheelhook',  short: 'Reverse Heel Hook',   full: 'Reverse Heel Hook, rotation interne genou' },
  { id: 'fig4ankle',    short: 'Figure 4 Ankle',      full: traduire('Figure 4 Ankle Lock, cheville croisée') },
  { id: 'texasclover',  short: 'Texas Cloverleaf',    full: 'Texas Cloverleaf, dos + jambes' },
];

// ── Points CFJJB par groupe ──────────────────────────────────────
const POINTS_GROUPS = [
  {
    label: 'DEBOUT',
    color: '#3B82F6',
    actions: [
      { label: 'Takedown', pts: 2, desc: traduire('Amenée au sol') },
      { label: 'Renversement debout', pts: 2, desc: 'Projection / trip' },
    ],
  },
  {
    label: 'SOL : 2 pts',
    color: '#22C55E',
    actions: [
      { label: 'Sweep', pts: 2, desc: traduire('Renversement depuis garde') },
      { label: traduire("Genou sur l'estomac"), pts: 2, desc: 'Knee on belly' },
    ],
  },
  {
    label: 'SOL : 3 pts',
    color: '#10B981',
    actions: [
      { label: traduire('Passage de garde'), pts: 3, desc: 'Guard pass' },
    ],
  },
  {
    label: 'POSITIONS DOMINANTES : 4 pts',
    color: '#A855F7',
    actions: [
      { label: traduire('Position montée'), pts: 4, desc: 'Mount' },
      { label: traduire('Montée arrière'), pts: 4, desc: 'Back mount' },
      { label: traduire('Contrôle du dos'), pts: 4, desc: 'Back control' },
      { label: 'Body triangle', pts: 4, desc: 'Body triangle dos' },
    ],
  },
  {
    label: 'AVANTAGES',
    color: '#F59E0B',
    actions: [
      { label: 'Avantage', pts: 1, desc: 'Quasi-technique' },
      { label: 'Quasi-soumission', pts: 1, desc: 'Near submission' },
      { label: 'Quasi-sweep', pts: 1, desc: 'Near sweep' },
      { label: 'Quasi-takedown', pts: 1, desc: 'Near takedown' },
      { label: 'Quasi-passe', pts: 1, desc: 'Near guard pass' },
      { label: traduire('Pénalité adv. +1'), pts: 1, desc: '2e faute adverse' },
      { label: traduire('Pénalité adv. +2'), pts: 2, desc: '3e faute adverse' },
    ],
  },
];

// ── Helper : convertit un ID stocké en base (ex: "reartri") vers son nom affichable (ex: "Triangle arrière") ──
// Si la valeur n'est pas un ID connu (saisie libre), elle est retournée telle quelle.
const SUBMISSION_BY_ID: Record<string, string> = ALL_SUBMISSIONS.reduce((acc, s) => {
  acc[s.id] = s.short;
  return acc;
}, {} as Record<string, string>);

export function getMethodDisplayName(idOrName: string): string {
  if (!idOrName) return '';
  return SUBMISSION_BY_ID[idOrName.trim().toLowerCase()] ?? idOrName;
}

// Hauteur ~5 items visibles
const SCROLL_HEIGHT = 5 * 50;

interface BJJBodyMapProps {
  myName?: string;
  opponentName?: string;
  methodsGiven: string[];
  methodsTaken: string[];
  pointsFor: number;
  pointsAgainst: number;
  usedTechniques: { label: string; count?: number; pts?: number }[];
  onUpdate: (updates: {
    methodsGiven?: string[];
    methodsTaken?: string[];
    pointsFor?: number;
    pointsAgainst?: number;
    usedTechniques?: { label: string; count?: number; pts?: number }[];
    submissionsGiven?: number;
    submissionsTaken?: number;
  }) => void;
}

export function BJJBodyMap({
  myName = 'MOI',
  opponentName = 'ADV',
  methodsGiven,
  methodsTaken,
  pointsFor,
  pointsAgainst,
  usedTechniques,
  onUpdate,
}: BJJBodyMapProps) {
  const { colors, isDark } = useTheme();
  const [favSubs, setFavSubs] = useState<string[]>([]);
  const [searchMe, setSearchMe]   = useState('');
  const [searchOpp, setSearchOpp] = useState('');
  const [showSearchMe, setShowSearchMe]   = useState(false);
  const [showSearchOpp, setShowSearchOpp] = useState(false);
  const inputMeRef  = useRef<TextInput>(null);
  const inputOppRef = useRef<TextInput>(null);

  // Charger les favoris au montage
  useEffect(() => {
    AsyncStorage.getItem(FAV_KEY).then(val => {
      if (val) setFavSubs(JSON.parse(val));
    }).catch(() => {});
  }, []);

  const toggleFav = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const next = favSubs.includes(id) ? favSubs.filter(f => f !== id) : [...favSubs, id];
    setFavSubs(next);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next)).catch(() => {});
  }, [favSubs]);

  const toggleSub = (id: string, side: 'me' | 'opp') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (side === 'me') {
      const arr = methodsGiven.includes(id)
        ? methodsGiven.filter(m => m !== id)
        : [...methodsGiven, id];
      onUpdate({ methodsGiven: arr, submissionsGiven: arr.length });
    } else {
      const arr = methodsTaken.includes(id)
        ? methodsTaken.filter(m => m !== id)
        : [...methodsTaken, id];
      onUpdate({ methodsTaken: arr, submissionsTaken: arr.length });
    }
  };

  const addPoint = (label: string, pts: number, side: 'me' | 'opp', remove = false) => {
    Haptics.impactAsync(remove ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
    const key = side === 'opp' ? `${label} (adv)` : label;
    const newTechs = [...(usedTechniques ?? [])];
    const idx = newTechs.findIndex(t => t.label === key);

    if (remove) {
      if (idx < 0) return;
      const current = newTechs[idx].count ?? 1;
      if (current <= 1) {
        newTechs.splice(idx, 1);
      } else {
        newTechs[idx] = { ...newTechs[idx], count: current - 1 };
      }
      if (side === 'me') {
        onUpdate({ pointsFor: Math.max(0, pointsFor - pts), usedTechniques: newTechs });
      } else {
        onUpdate({ pointsAgainst: Math.max(0, pointsAgainst - pts), usedTechniques: newTechs });
      }
    } else {
      if (idx >= 0) {
        newTechs[idx] = { ...newTechs[idx], count: (newTechs[idx].count ?? 1) + 1 };
      } else {
        newTechs.push({ label: key, count: 1, pts });
      }
      if (side === 'me') {
        onUpdate({ pointsFor: pointsFor + pts, usedTechniques: newTechs });
      } else {
        onUpdate({ pointsAgainst: pointsAgainst + pts, usedTechniques: newTechs });
      }
    }
  };

  const borderColor = colors.border ?? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
  const mutedColor = colors.textMuted ?? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.38)');
  const textColor = colors.text;
  const cardBg = colors.backgroundCard ?? (isDark ? '#1a1a1a' : '#f8f8f8');

  // Construire la liste ordonnée : favoris en tête, puis le reste
  const orderedSubs = [
    ...ALL_SUBMISSIONS.filter(s => favSubs.includes(s.id)),
    ...ALL_SUBMISSIONS.filter(s => !favSubs.includes(s.id)),
  ];

  const filterSubs = (query: string) => {
    if (!query.trim()) return orderedSubs;
    const q = query.toLowerCase();
    return ALL_SUBMISSIONS.filter(s =>
      s.short.toLowerCase().includes(q) || s.full.toLowerCase().includes(q)
    );
  };

  const filteredMe  = filterSubs(searchMe);
  const filteredOpp = filterSubs(searchOpp);

  const toggleSearchMe = () => {
    if (showSearchMe) { setSearchMe(''); setShowSearchMe(false); }
    else { setShowSearchMe(true); setTimeout(() => inputMeRef.current?.focus(), 80); }
  };
  const toggleSearchOpp = () => {
    if (showSearchOpp) { setSearchOpp(''); setShowSearchOpp(false); }
    else { setShowSearchOpp(true); setTimeout(() => inputOppRef.current?.focus(), 80); }
  };

  const SubItem = ({ sub, side }: { sub: typeof ALL_SUBMISSIONS[0]; side: 'me' | 'opp' }) => {
    const color = side === 'me' ? '#22C55E' : '#EF4444';
    const selected = side === 'me' ? methodsGiven.includes(sub.id) : methodsTaken.includes(sub.id);
    const isFav = favSubs.includes(sub.id);
    return (
      <TouchableOpacity
        onPress={() => toggleSub(sub.id, side)}
        onLongPress={() => toggleFav(sub.id)}
        delayLongPress={600}
        style={[
          styles.subItem,
          { borderBottomColor: borderColor },
          selected && { backgroundColor: `${color}12` },
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.subItemInner}>
          {isFav && side === 'me' && (
            <Star size={12} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 4 }} />
          )}
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <Text style={[
              styles.subShort,
              { color: selected ? color : textColor, fontWeight: selected ? '700' : '600' },
            ]} numberOfLines={1}>
              {sub.short}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled
              nestedScrollEnabled
              bounces={false}
            >
              <Text style={[styles.subFull, { color: mutedColor }]}>
                {sub.full}
              </Text>
            </ScrollView>
          </View>
          {selected && (
            <View style={[styles.checkBadge, { backgroundColor: color }]}>
              <Check size={12} color="#fff" strokeWidth={3} />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>

      {/* ══ Deux colonnes soumissions ══════════════════════════ */}
      <View style={styles.columnsRow}>
        {/* Colonne MOI */}
        <View style={[styles.column, { borderColor, backgroundColor: cardBg }]}>
          <View style={[styles.colHeader, { backgroundColor: 'rgba(34,197,94,0.12)', borderBottomColor: borderColor }]}>
            <Text style={[styles.colName, { color: '#22C55E' }]} numberOfLines={1}>
              {myName.slice(0, 10).toUpperCase()}
            </Text>
            {methodsGiven.length > 0 && (
              <View style={[styles.colBadge, { backgroundColor: '#22C55E' }]}>
                <Text style={styles.colBadgeText}>{methodsGiven.length}</Text>
              </View>
            )}
            <TouchableOpacity onPress={toggleSearchMe} style={[styles.searchBtn, showSearchMe && { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
              {showSearchMe
                ? <X size={22} color="#22C55E" />
                : <Search size={22} color={mutedColor} />}
            </TouchableOpacity>
          </View>
          {showSearchMe && (
            <View style={[styles.searchRow, { borderBottomColor: borderColor, backgroundColor: 'rgba(34,197,94,0.06)' }]}>
              <TextInput
                ref={inputMeRef}
                value={searchMe}
                onChangeText={setSearchMe}
                placeholder="Rechercher..."
                placeholderTextColor={mutedColor}
                style={[styles.searchInput, { color: textColor }]}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchMe.length > 0 && (
                <TouchableOpacity onPress={() => setSearchMe('')}>
                  <X size={16} color={mutedColor} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {!showSearchMe && favSubs.length > 0 && (
            <View style={[styles.favHeader, { backgroundColor: 'rgba(251,191,36,0.1)', borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Star size={11} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.favHeaderText, { color: '#F59E0B' }]}>FAVORIS</Text>
            </View>
          )}
          <ScrollView style={{ maxHeight: SCROLL_HEIGHT }} nestedScrollEnabled showsVerticalScrollIndicator>
            {filteredMe.length === 0 ? (
              <Text style={[styles.noResult, { color: mutedColor }]}>{traduire("Aucun résultat")}</Text>
            ) : filteredMe.map((sub, i) => (
              <React.Fragment key={sub.id}>
                {!showSearchMe && i === favSubs.length && favSubs.length > 0 && (
                  <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                )}
                <SubItem sub={sub} side="me" />
              </React.Fragment>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
            <Text style={[styles.longPressHint, { color: mutedColor }]}>Appui long =</Text>
            <Star size={9} color={mutedColor} fill={mutedColor} />
            <Text style={[styles.longPressHint, { color: mutedColor }]}>favori</Text>
          </View>
        </View>

        <View style={{ width: 6 }} />

        {/* Colonne ADVERSAIRE */}
        <View style={[styles.column, { borderColor, backgroundColor: cardBg }]}>
          <View style={[styles.colHeader, { backgroundColor: 'rgba(239,68,68,0.12)', borderBottomColor: borderColor }]}>
            <Text style={[styles.colName, { color: '#EF4444' }]} numberOfLines={1}>
              {(opponentName || 'ADV').slice(0, 10).toUpperCase()}
            </Text>
            {methodsTaken.length > 0 && (
              <View style={[styles.colBadge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.colBadgeText}>{methodsTaken.length}</Text>
              </View>
            )}
            <TouchableOpacity onPress={toggleSearchOpp} style={[styles.searchBtn, showSearchOpp && { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
              {showSearchOpp
                ? <X size={22} color="#EF4444" />
                : <Search size={22} color={mutedColor} />}
            </TouchableOpacity>
          </View>
          {showSearchOpp && (
            <View style={[styles.searchRow, { borderBottomColor: borderColor, backgroundColor: 'rgba(239,68,68,0.06)' }]}>
              <TextInput
                ref={inputOppRef}
                value={searchOpp}
                onChangeText={setSearchOpp}
                placeholder="Rechercher..."
                placeholderTextColor={mutedColor}
                style={[styles.searchInput, { color: textColor }]}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchOpp.length > 0 && (
                <TouchableOpacity onPress={() => setSearchOpp('')}>
                  <X size={16} color={mutedColor} />
                </TouchableOpacity>
              )}
            </View>
          )}
          {!showSearchOpp && favSubs.length > 0 && (
            <View style={[styles.favHeader, { backgroundColor: 'rgba(251,191,36,0.1)', borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Star size={11} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.favHeaderText, { color: '#F59E0B' }]}>FAVORIS</Text>
            </View>
          )}
          <ScrollView style={{ maxHeight: SCROLL_HEIGHT }} nestedScrollEnabled showsVerticalScrollIndicator>
            {filteredOpp.length === 0 ? (
              <Text style={[styles.noResult, { color: mutedColor }]}>{traduire("Aucun résultat")}</Text>
            ) : filteredOpp.map((sub, i) => (
              <React.Fragment key={sub.id}>
                {!showSearchOpp && i === favSubs.length && favSubs.length > 0 && (
                  <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
                )}
                <SubItem sub={sub} side="opp" />
              </React.Fragment>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
            <Text style={[styles.longPressHint, { color: mutedColor }]}>Appui long =</Text>
            <Star size={9} color={mutedColor} fill={mutedColor} />
            <Text style={[styles.longPressHint, { color: mutedColor }]}>favori</Text>
          </View>
        </View>
      </View>

      {/* ══ Points CFJJB ══════════════════════════════════════ */}
      <View style={[styles.pointsWrapper, { borderTopColor: borderColor }]}>
        <View style={styles.pointsColHeader}>
          <Text style={[styles.pointsColName, { color: '#22C55E' }]}>
            {myName.slice(0, 8).toUpperCase()}
          </Text>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.pointsColMid, { color: mutedColor }]}>POINTS CFJJB</Text>
            <Text style={{ fontSize: 8, color: mutedColor, fontStyle: 'italic', marginTop: 1 }}>{traduire("Appui long = annuler")}</Text>
          </View>
          <Text style={[styles.pointsColName, { color: '#EF4444', textAlign: 'right' }]}>
            {(opponentName || 'ADV').slice(0, 8).toUpperCase()}
          </Text>
        </View>

        {POINTS_GROUPS.map(group => (
          <View key={group.label} style={{ marginBottom: 4 }}>
            {/* Header groupe */}
            <View style={[styles.groupHeader, { backgroundColor: `${group.color}12` }]}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={[styles.groupLabel, { color: group.color }]}>{group.label}</Text>
            </View>

            {group.actions.map(action => {
              const myUsed = usedTechniques?.find(u => u.label === action.label);
              const oppUsed = usedTechniques?.find(u => u.label === `${action.label} (adv)`);
              const myCount = myUsed?.count ?? 0;
              const oppCount = oppUsed?.count ?? 0;

              return (
                <View key={action.label} style={[styles.ptRow, { borderBottomColor: borderColor }]}>
                  {/* Bouton MOI */}
                  <TouchableOpacity
                    onPress={() => addPoint(action.label, action.pts, 'me')}
                    onLongPress={() => addPoint(action.label, action.pts, 'me', true)}
                    delayLongPress={400}
                    style={[styles.ptBtn, {
                      borderColor: '#22C55E',
                      backgroundColor: myCount > 0 ? 'rgba(34,197,94,0.18)' : 'transparent',
                    }]}
                  >
                    <Text style={[styles.ptBtnTop, { color: '#22C55E' }]}>
                      {myCount > 0 ? `×${myCount}` : `+${action.pts}`}
                    </Text>
                    <Text style={[styles.ptBtnSub, { color: '#22C55E' }]}>
                      {myCount > 0 ? 'pts' : ''}
                    </Text>
                  </TouchableOpacity>

                  {/* Nom + description */}
                  <View style={styles.ptCenter}>
                    <Text style={[styles.ptLabel, { color: (myCount > 0 || oppCount > 0) ? textColor : mutedColor }]} numberOfLines={1}>
                      {action.label}
                    </Text>
                    <Text style={[styles.ptDesc, { color: mutedColor }]} numberOfLines={1}>
                      {action.desc}
                    </Text>
                  </View>

                  {/* Bouton ADVERSAIRE */}
                  <TouchableOpacity
                    onPress={() => addPoint(action.label, action.pts, 'opp')}
                    onLongPress={() => addPoint(action.label, action.pts, 'opp', true)}
                    delayLongPress={400}
                    style={[styles.ptBtn, {
                      borderColor: '#EF4444',
                      backgroundColor: oppCount > 0 ? 'rgba(239,68,68,0.18)' : 'transparent',
                    }]}
                  >
                    <Text style={[styles.ptBtnTop, { color: '#EF4444' }]}>
                      {oppCount > 0 ? `×${oppCount}` : `+${action.pts}`}
                    </Text>
                    <Text style={[styles.ptBtnSub, { color: '#EF4444' }]}>
                      {oppCount > 0 ? 'pts' : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 10 },

  // ── Colonnes ────────────────────────────────────────────────
  columnsRow: { flexDirection: 'row' },
  column: {
    flex: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  colHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, gap: 6,
  },
  colName: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, flex: 1 },
  colBadge: {
    minWidth: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  colBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  searchBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  searchBtnIcon: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  searchInput: {
    flex: 1, fontSize: 12, paddingVertical: 4,
  },
  searchClear: { fontSize: 12, paddingHorizontal: 4 },
  noResult: {
    fontSize: 11, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic',
  },

  favHeader: {
    paddingHorizontal: 10, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  favHeaderText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  dividerLine: { height: StyleSheet.hairlineWidth, marginHorizontal: 10 },

  // ── Items soumission ────────────────────────────────────────
  subItem: {
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subItemInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  starIcon: { fontSize: 10, color: '#F59E0B' },
  subShort: { fontSize: 12 },
  subFull: { fontSize: 9, marginTop: 1 },
  checkBadge: {
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  checkBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  longPressHint: {
    fontSize: 8, textAlign: 'center',
    paddingVertical: 4, fontStyle: 'italic',
  },

  // ── Points CFJJB ─────────────────────────────────────────────
  pointsWrapper: {
    marginTop: 10, borderTopWidth: 1, paddingTop: 8,
  },
  pointsColHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2,
  },
  pointsColName: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, width: 60 },
  pointsColMid: { flex: 1, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    marginBottom: 4,
  },
  groupDot: { width: 6, height: 6, borderRadius: 3 },
  groupLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

  ptRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 2,
    gap: 6, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ptBtn: {
    width: 44, height: 36, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  ptBtnTop: { fontSize: 11, fontWeight: '900', lineHeight: 13 },
  ptBtnSub: { fontSize: 7, fontWeight: '700' },
  ptCenter: { flex: 1, alignItems: 'center' },
  ptLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  ptDesc: { fontSize: 9, marginTop: 1, textAlign: 'center' },
});
