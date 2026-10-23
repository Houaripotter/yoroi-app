// ============================================
// PARTNER FIGHTER PROFILE : Carte Combattant visuelle
// ============================================
// Remplace le simple formulaire par une carte premium :
//  - Identite (archetype + niveau) en gradient
//  - Radar de style (5 axes) en SVG
//  - Comparaison physique visuelle (barres moi vs lui)
//  - Niveau de menace auto-calcule
//  - Techniques dangereuses (editable)
//  - Fighter de reference (optionnel)
// ============================================

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon, Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import * as LucideIcons from 'lucide-react-native';
import { ChevronDown, X, Plus, AlertTriangle, Target as TargetIcon, Zap, Heart, Mountain, Shield, Sparkles, Flame } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, selectionHaptic } from '@/lib/haptics';
import {
  ARCHETYPE_META, EXPERIENCE_LEVEL_META,
  type Archetype, type ExperienceLevel,
} from '@/lib/partnerModel';

export interface StyleStats {
  garde: number;        // 0-5
  passage: number;      // 0-5
  debout: number;       // 0-5
  cardio: number;       // 0-5
  explosivite: number;  // 0-5
}

interface Props {
  partnerName: string;
  archetype?: Archetype;
  experienceLevel?: ExperienceLevel;
  weightDeltaKg?: number;
  heightDeltaCm?: number;
  reachDeltaCm?: number;
  nickname?: string;
  gardePreferred?: string[];
  styleStats?: StyleStats;
  dangerousMoves?: string[];
  similarTo?: string;
  winrate?: number | null;
  totalRounds?: number;
  onChange: (patch: {
    archetype?: Archetype;
    experienceLevel?: ExperienceLevel;
    weightDeltaKg?: number;
    heightDeltaCm?: number;
    reachDeltaCm?: number;
    nickname?: string;
    gardePreferred?: string[];
    styleStats?: StyleStats;
    dangerousMoves?: string[];
    similarTo?: string;
  }) => void;
}

const GARDE_OPTIONS = ['Fermee', 'De La Riva', 'X-Guard', 'Spider', 'Lasso', '50/50', 'Demi-garde', 'Butterfly', 'Debout (striker)'];

const DEFAULT_STYLE: StyleStats = { garde: 3, passage: 3, debout: 3, cardio: 3, explosivite: 3 };

const RADAR_AXES = [
  { key: 'garde', label: 'Garde' },
  { key: 'passage', label: 'Passage' },
  { key: 'debout', label: 'Debout' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'explosivite', label: 'Explosivite' },
] as const;

const { width: SCREEN_W } = Dimensions.get('window');
const RADAR_SIZE = Math.min(260, SCREEN_W - 80);
const RADAR_CX = RADAR_SIZE / 2;
const RADAR_CY = RADAR_SIZE / 2;
const RADAR_R = RADAR_SIZE / 2 - 30;

function pointOnAxis(axisIdx: number, value: number): { x: number; y: number } {
  // value 0..5, radius = R * (value / 5)
  const angle = (-Math.PI / 2) + (axisIdx * (2 * Math.PI / RADAR_AXES.length));
  const r = RADAR_R * (value / 5);
  return {
    x: RADAR_CX + r * Math.cos(angle),
    y: RADAR_CY + r * Math.sin(angle),
  };
}

function axisOuterPoint(axisIdx: number, scale = 1): { x: number; y: number } {
  const angle = (-Math.PI / 2) + (axisIdx * (2 * Math.PI / RADAR_AXES.length));
  return {
    x: RADAR_CX + RADAR_R * scale * Math.cos(angle),
    y: RADAR_CY + RADAR_R * scale * Math.sin(angle),
  };
}

export const PartnerFighterProfile: React.FC<Props> = ({
  partnerName,
  archetype, experienceLevel, weightDeltaKg, heightDeltaCm, reachDeltaCm,
  nickname, gardePreferred = [],
  styleStats, dangerousMoves = [], similarTo,
  winrate, totalRounds = 0,
  onChange,
}) => {
  const [nickDraft, setNickDraft] = useState(nickname || '');
  const { colors, isDark } = useTheme();
  const [showArchPicker, setShowArchPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  const [newMove, setNewMove] = useState('');
  const [similarDraft, setSimilarDraft] = useState(similarTo || '');

  const stats = styleStats || DEFAULT_STYLE;
  const archMeta = archetype ? ARCHETYPE_META[archetype] : null;
  const lvlMeta = experienceLevel ? EXPERIENCE_LEVEL_META[experienceLevel] : null;

  const ArchIcon = archMeta ? ((LucideIcons as any)[archMeta.icon] || LucideIcons.Star) : LucideIcons.Sparkles;
  const mainColor = archMeta?.color || '#D4AF37';

  // Niveau de menace auto-calcule (0-10)
  const threatLevel = useMemo(() => {
    let score = 5;
    // Winrate : si je perds souvent contre lui, il est dangereux
    if (winrate != null) {
      if (winrate < 30) score += 2.5;
      else if (winrate < 50) score += 1;
      else if (winrate > 70) score -= 1.5;
    }
    // Niveau d'experience
    if (experienceLevel === 'pro') score += 2;
    else if (experienceLevel === 'competiteur') score += 1;
    else if (experienceLevel === 'debutant') score -= 1;
    // Ecart physique
    if (weightDeltaKg && weightDeltaKg > 10) score += 0.5;
    if (heightDeltaCm && heightDeltaCm > 10) score += 0.3;
    // Style stats (moyenne)
    const avgStats = (stats.garde + stats.passage + stats.debout + stats.cardio + stats.explosivite) / 5;
    if (avgStats >= 4) score += 1;
    if (totalRounds >= 10) score += 0.3; // connait mon jeu
    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  }, [winrate, experienceLevel, weightDeltaKg, heightDeltaCm, stats, totalRounds]);

  const threatColor =
    threatLevel >= 8 ? '#EF4444' :
    threatLevel >= 6 ? '#F59E0B' :
    threatLevel >= 4 ? '#3B82F6' : '#10B981';
  const threatLabel =
    threatLevel >= 8 ? 'BETE NOIRE' :
    threatLevel >= 6 ? 'SERIEUX CHALLENGE' :
    threatLevel >= 4 ? 'PARTENAIRE SOLIDE' : 'ACCESSIBLE';

  const updateStat = (key: keyof StyleStats, value: number) => {
    selectionHaptic().catch(() => {});
    onChange({ styleStats: { ...stats, [key]: value } });
  };

  const addDangerousMove = () => {
    const m = newMove.trim();
    if (!m) return;
    onChange({ dangerousMoves: [...dangerousMoves, m] });
    setNewMove('');
    lightHaptic().catch(() => {});
  };

  const removeDangerousMove = (i: number) => {
    onChange({ dangerousMoves: dangerousMoves.filter((_, idx) => idx !== i) });
    lightHaptic().catch(() => {});
  };

  const pickArch = (a: Archetype) => {
    lightHaptic().catch(() => {});
    onChange({ archetype: a });
    setShowArchPicker(false);
  };
  const pickLevel = (lvl: ExperienceLevel) => {
    lightHaptic().catch(() => {});
    onChange({ experienceLevel: lvl });
    setShowLevelPicker(false);
  };

  // Points du polygon radar
  const polygonPoints = RADAR_AXES
    .map((ax, i) => {
      const pt = pointOnAxis(i, (stats as any)[ax.key] || 0);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <View>
      {/* ═══════════════════════════════════════════
          IDENTITE : Gradient hero
          ═══════════════════════════════════════════ */}
      <TouchableOpacity
        onPress={() => setShowArchPicker(true)}
        activeOpacity={0.9}
        style={styles.heroWrap}
      >
        <LinearGradient
          colors={[mainColor + 'CC', mainColor + '40', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.4)' }]}>
            <ArchIcon size={34} color="#fff" strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>STYLE DE COMBAT</Text>
            <Text style={styles.heroTitle}>{archMeta?.label || 'Non defini'}</Text>
            {nickname ? (
              <Text style={styles.heroNick} numberOfLines={1}>« {nickname} »</Text>
            ) : null}
            <Text style={styles.heroDesc} numberOfLines={2}>
              {archMeta?.description || 'Touche pour choisir son archetype dominant'}
            </Text>
          </View>
          <ChevronDown size={20} color="rgba(255,255,255,0.7)" />
        </View>
      </TouchableOpacity>

      {/* Niveau d'experience + menace */}
      <View style={styles.inlineRow}>
        <TouchableOpacity
          onPress={() => setShowLevelPicker(true)}
          activeOpacity={0.85}
          style={[styles.levelPill, { backgroundColor: (lvlMeta?.color || colors.textMuted) + '25', borderColor: (lvlMeta?.color || colors.textMuted) + '60' }]}
        >
          <Sparkles size={14} color={lvlMeta?.color || colors.textMuted} />
          <Text style={[styles.levelText, { color: lvlMeta?.color || colors.textMuted }]}>
            {lvlMeta?.label || 'Niveau ?'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.threatPill, { backgroundColor: threatColor + '20', borderColor: threatColor }]}>
          <Flame size={13} color={threatColor} />
          <Text style={[styles.threatLabel, { color: threatColor }]}>{threatLabel}</Text>
          <View style={[styles.threatBadge, { backgroundColor: threatColor }]}>
            <Text style={styles.threatScore}>{threatLevel.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════════
          RADAR DE STYLE : SVG pentagon
          ═══════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>ADN de jeu</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Touche un axe pour ajuster (0 a 5)
        </Text>

        <View style={styles.radarWrap}>
          <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
            {/* Grille : 5 niveaux */}
            {[1, 2, 3, 4, 5].map(level => {
              const pts = RADAR_AXES.map((_, i) => {
                const pt = pointOnAxis(i, level);
                return `${pt.x},${pt.y}`;
              }).join(' ');
              return (
                <Polygon
                  key={level}
                  points={pts}
                  stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                  strokeWidth={1}
                  fill="none"
                />
              );
            })}
            {/* Axes */}
            {RADAR_AXES.map((_, i) => {
              const end = axisOuterPoint(i);
              return (
                <Line
                  key={i}
                  x1={RADAR_CX}
                  y1={RADAR_CY}
                  x2={end.x}
                  y2={end.y}
                  stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth={1}
                />
              );
            })}
            {/* Zone de stats */}
            <Polygon
              points={polygonPoints}
              fill={mainColor + '50'}
              stroke={mainColor}
              strokeWidth={2}
            />
            {/* Points sur chaque sommet */}
            {RADAR_AXES.map((ax, i) => {
              const pt = pointOnAxis(i, (stats as any)[ax.key] || 0);
              return (
                <SvgCircle
                  key={ax.key}
                  cx={pt.x}
                  cy={pt.y}
                  r={4}
                  fill={mainColor}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            })}
            {/* Labels des axes */}
            {RADAR_AXES.map((ax, i) => {
              const labelPt = axisOuterPoint(i, 1.22);
              return (
                <SvgText
                  key={`lbl-${ax.key}`}
                  x={labelPt.x}
                  y={labelPt.y}
                  fontSize="11"
                  fontWeight="700"
                  fill={colors.text}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {ax.label}
                </SvgText>
              );
            })}
          </Svg>
        </View>

        {/* Sliders rapides pour ajuster */}
        <View style={{ marginTop: 10, gap: 8 }}>
          {RADAR_AXES.map(ax => {
            const value = (stats as any)[ax.key] || 0;
            return (
              <View key={ax.key} style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.text }]}>{ax.label}</Text>
                <View style={styles.dotsRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => updateStat(ax.key as keyof StyleStats, n)}
                      hitSlop={6}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: n <= value ? mainColor : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* ═══════════════════════════════════════════
          NICKNAME : surnom fun
          ═══════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Nickname</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Son surnom de combat
        </Text>
        <TextInput
          value={nickDraft}
          onChangeText={setNickDraft}
          onEndEditing={() => {
            if (nickDraft !== (nickname || '')) onChange({ nickname: nickDraft });
          }}
          placeholder='Ex : "The Triangle Wizard"'
          placeholderTextColor={colors.textMuted}
          style={[styles.similarInput, {
            color: colors.text,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }]}
        />
      </View>

      {/* ═══════════════════════════════════════════
          GARDE PREFEREE : chips multi-select
          ═══════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gardes / positions preferees</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Ou il est a l'aise</Text>
        <View style={styles.tagsRow}>
          {GARDE_OPTIONS.map(g => {
            const sel = gardePreferred.includes(g);
            return (
              <TouchableOpacity
                key={g}
                onPress={() => {
                  lightHaptic().catch(() => {});
                  const next = sel ? gardePreferred.filter(x => x !== g) : [...gardePreferred, g];
                  onChange({ gardePreferred: next });
                }}
                style={[
                  styles.gardeChip,
                  {
                    backgroundColor: sel ? mainColor + '25' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    borderColor: sel ? mainColor : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.gardeChipText, { color: sel ? mainColor : colors.text }]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ═══════════════════════════════════════════
          COMPARAISON PHYSIQUE (poids + taille + allonge)
          ═══════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Comparaison physique</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Ecarts par rapport a toi</Text>

        <PhysicalBar
          label="Poids"
          deltaValue={weightDeltaKg}
          unit="kg"
          onChange={v => onChange({ weightDeltaKg: v })}
          isDark={isDark}
          colorText={colors.text}
          colorMuted={colors.textMuted}
        />
        <PhysicalBar
          label="Taille"
          deltaValue={heightDeltaCm}
          unit="cm"
          onChange={v => onChange({ heightDeltaCm: v })}
          isDark={isDark}
          colorText={colors.text}
          colorMuted={colors.textMuted}
        />
        <PhysicalBar
          label="Allonge (reach)"
          deltaValue={reachDeltaCm}
          unit="cm"
          onChange={v => onChange({ reachDeltaCm: v })}
          isDark={isDark}
          colorText={colors.text}
          colorMuted={colors.textMuted}
        />
      </View>

      {/* ═══════════════════════════════════════════
          TECHNIQUES DANGEREUSES (gere "attention a")
          ═══════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: '#EF444440' }]}>
        <View style={styles.sectionHeaderRow}>
          <AlertTriangle size={14} color="#EF4444" />
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Attention a</Text>
        </View>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Les attaques qu'il place regulierement
        </Text>

        <View style={styles.tagsRow}>
          {dangerousMoves.length === 0 && (
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Triangle, levier de coude, kimura...
            </Text>
          )}
          {dangerousMoves.map((move, i) => (
            <View key={i} style={styles.dangerTag}>
              <Text style={styles.dangerText}>{move}</Text>
              <TouchableOpacity onPress={() => removeDangerousMove(i)} hitSlop={6}>
                <X size={11} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.addRow}>
          <TextInput
            value={newMove}
            onChangeText={setNewMove}
            placeholder="Ajouter une attaque dangereuse"
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addDangerousMove}
            returnKeyType="done"
            style={[styles.addInput, {
              color: colors.text,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }]}
          />
          <TouchableOpacity onPress={addDangerousMove} style={[styles.addBtn, { backgroundColor: '#EF4444' }]}>
            <Plus size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ═══════════════════════════════════════════
          JOUEUR DE REFERENCE (optionnel)
          ═══════════════════════════════════════════ */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ressemble a</Text>
        <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
          Un fighter pro qui a le meme jeu
        </Text>
        <TextInput
          value={similarDraft}
          onChangeText={setSimilarDraft}
          onEndEditing={() => {
            if (similarDraft !== (similarTo || '')) {
              onChange({ similarTo: similarDraft });
            }
          }}
          placeholder="Ex : Gordon Ryan, Roger Gracie..."
          placeholderTextColor={colors.textMuted}
          style={[styles.similarInput, {
            color: colors.text,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          }]}
        />
      </View>

      {/* ═══════════════════════════════════════════
          MODAL Archetype picker
          ═══════════════════════════════════════════ */}
      <Modal visible={showArchPicker} transparent animationType="slide" onRequestClose={() => setShowArchPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Style de combat de {partnerName}</Text>
              <TouchableOpacity onPress={() => setShowArchPicker(false)}><X size={22} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {(Object.keys(ARCHETYPE_META) as Archetype[]).map(a => {
                const meta = ARCHETYPE_META[a];
                const Icon = (LucideIcons as any)[meta.icon] || LucideIcons.Star;
                const sel = archetype === a;
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => pickArch(a)}
                    activeOpacity={0.85}
                    style={[
                      styles.archOption,
                      {
                        backgroundColor: sel ? meta.color + '25' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                        borderColor: sel ? meta.color : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.archOptionIcon, { backgroundColor: meta.color + '30' }]}>
                      <Icon size={22} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.archOptionTitle, { color: sel ? meta.color : colors.text }]}>
                        {meta.label}
                      </Text>
                      <Text style={[styles.archOptionDesc, { color: colors.textMuted }]}>
                        {meta.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Niveau picker */}
      <Modal visible={showLevelPicker} transparent animationType="slide" onRequestClose={() => setShowLevelPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Niveau d'experience</Text>
              <TouchableOpacity onPress={() => setShowLevelPicker(false)}><X size={22} color={colors.text} /></TouchableOpacity>
            </View>
            {(Object.keys(EXPERIENCE_LEVEL_META) as ExperienceLevel[]).map(lvl => {
              const meta = EXPERIENCE_LEVEL_META[lvl];
              const sel = experienceLevel === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => pickLevel(lvl)}
                  style={[
                    styles.levelOption,
                    {
                      backgroundColor: sel ? meta.color + '25' : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                      borderColor: sel ? meta.color : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.levelOptionText, { color: sel ? meta.color : colors.text }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ============================================
// SOUS-COMPOSANT, BARRE PHYSIQUE
// ============================================
interface PhysicalBarProps {
  label: string;
  deltaValue?: number;
  unit: string;
  onChange: (v: number | undefined) => void;
  isDark: boolean;
  colorText: string;
  colorMuted: string;
}

const PhysicalBar: React.FC<PhysicalBarProps> = ({
  label, deltaValue, unit, onChange, isDark, colorText, colorMuted,
}) => {
  const [draft, setDraft] = useState(deltaValue != null ? String(deltaValue) : '');
  const delta = deltaValue ?? 0;
  const absDelta = Math.abs(delta);
  // Pour visualiser : barre centree, delta max affiche = 30
  const maxDelta = 30;
  const clamped = Math.min(absDelta, maxDelta);
  const pct = (clamped / maxDelta) * 50; // 0..50% de chaque cote

  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const color = isPositive ? '#EF4444' : isNegative ? '#10B981' : '#6B7280';
  const advantage = isPositive ? '+' : isNegative ? '-' : '';

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colorText }}>{label}</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onEndEditing={() => {
            const v = draft.trim();
            if (v === '' || v === '-') {
              onChange(undefined);
              setDraft('');
              return;
            }
            const n = Number(v.replace(',', '.'));
            onChange(isNaN(n) ? undefined : n);
          }}
          keyboardType="numbers-and-punctuation"
          placeholder={`+/- ${unit}`}
          placeholderTextColor={colorMuted}
          style={{
            fontSize: 13,
            fontWeight: '800',
            color,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            minWidth: 72,
            textAlign: 'right',
          }}
        />
      </View>
      <View style={styles.physTrack}>
        {/* Moitie gauche (plus leger/petit → avantage toi) */}
        <View style={[styles.physHalf, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.1)' }]}>
          {isNegative && (
            <View style={{ position: 'absolute', right: 0, height: '100%', width: `${pct}%`, backgroundColor: '#10B981' }} />
          )}
        </View>
        {/* Centre (toi) */}
        <View style={styles.physCenterMark} />
        {/* Moitie droite (plus lourd/grand → il a l'avantage) */}
        <View style={[styles.physHalf, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.1)' }]}>
          {isPositive && (
            <View style={{ position: 'absolute', left: 0, height: '100%', width: `${pct}%`, backgroundColor: '#EF4444' }} />
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <Text style={{ fontSize: 9, color: colorMuted, fontWeight: '600' }}>Avantage toi</Text>
        <Text style={{ fontSize: 9, color: colorMuted, fontWeight: '600' }}>Moi</Text>
        <Text style={{ fontSize: 9, color: colorMuted, fontWeight: '600' }}>Avantage lui</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 18,
    marginBottom: 12,
    minHeight: 100,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  heroLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroNick: { fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '600' },
  heroDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 16 },

  inlineRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  levelText: { fontSize: 12, fontWeight: '800' },
  threatPill: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 18,
    borderWidth: 1,
  },
  threatLabel: { flex: 1, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  threatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  threatScore: { fontSize: 12, fontWeight: '900', color: '#fff' },

  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  sectionSub: { fontSize: 11, marginBottom: 10 },

  radarWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: { width: 18, height: 18, borderRadius: 9 },

  physTrack: {
    height: 10,
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  physHalf: { flex: 1, overflow: 'hidden' },
  physCenterMark: {
    position: 'absolute',
    left: '50%', marginLeft: -1,
    top: -3, bottom: -3,
    width: 2,
    backgroundColor: '#D4AF37',
    borderRadius: 1,
  },

  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginTop: 4, marginBottom: 10,
  },
  dangerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF444418',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dangerText: { fontSize: 12, fontWeight: '700', color: '#EF4444' },
  gardeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  gardeChipText: { fontSize: 12, fontWeight: '700' },
  emptyHint: { fontSize: 12, fontStyle: 'italic' },
  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  similarInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  archOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  archOptionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  archOptionTitle: { fontSize: 14, fontWeight: '800' },
  archOptionDesc: { fontSize: 11, marginTop: 2, lineHeight: 15 },

  levelOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  levelOptionText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});

export default React.memo(PartnerFighterProfile);
