// ============================================
// YOROI MEDIC - BODY MAP (VERSION COMPLÈTE)
// ============================================
// 70 zones anatomiques pour sportifs

import React, { useState, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Copy,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { SPACING, RADIUS } from '@/constants/appTheme';
import { BodyZone as BodyZoneData } from '@/constants/bodyZones';

// ============================================
// TYPES
// ============================================

export interface BodyZone {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  injuries?: string[];
}

interface BodyMapProps {
  onZonePress: (zone: BodyZone, view: 'front' | 'back') => void;
  injuredZones?: Array<{ zone_id: string; zone_view: 'front' | 'back'; eva_score: number }>;
  isCreatorMode?: boolean;
}

// ============================================
// DONNÉES CALIBRÉES - VUE DE FACE (42 zones)
// ============================================

export const INITIAL_DATA: { front: BodyZone[]; back: BodyZone[] } = {
  front: [
    // === TÊTE & COU ===
    { id: 'head', label: 'Tête / Visage', x: 50, y: 6, w: 15, h: 8, injuries: ['Commotion', 'Coupure arcade', 'Contusion', 'Fracture nez'] },
    { id: 'jaw', label: 'Mâchoire', x: 50, y: 13, w: 14, h: 5, injuries: ['Fracture', 'Luxation ATM', 'Contusion'] },
    { id: 'neck_front', label: 'Cou (avant)', x: 50, y: 18, w: 10, h: 6, injuries: ['Torticolis', 'Contracture', 'Coup du lapin'] },
    
    // === ÉPAULES ===
    { id: 'shoulder_l', label: 'Épaule G', x: 66, y: 23, w: 14, h: 8, injuries: ['Luxation', 'Tendinite coiffe', 'Bursite', 'Fracture clavicule'] },
    { id: 'shoulder_r', label: 'Épaule D', x: 35, y: 23, w: 14, h: 9, injuries: ['Luxation', 'Tendinite coiffe', 'Bursite', 'Fracture clavicule'] },
    
    // === PECTORAUX ===
    { id: 'pec_l', label: 'Pectoral G', x: 57, y: 26, w: 11, h: 9, injuries: ['Déchirure', 'Contracture', 'Claquage'] },
    { id: 'pec_r', label: 'Pectoral D', x: 44, y: 26, w: 11, h: 9, injuries: ['Déchirure', 'Contracture', 'Claquage'] },
    
    // === BRAS ===
    { id: 'biceps_l', label: 'Biceps G', x: 66, y: 32, w: 9, h: 7, injuries: ['Déchirure', 'Tendinite', 'Contracture'] },
    { id: 'biceps_r', label: 'Biceps D', x: 35, y: 31, w: 8, h: 7, injuries: ['Déchirure', 'Tendinite', 'Contracture'] },
    
    // === COUDES ===
    { id: 'elbow_l', label: 'Coude G', x: 69, y: 36, w: 12, h: 5, injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Hygroma'] },
    { id: 'elbow_r', label: 'Coude D', x: 32, y: 36, w: 11, h: 6, injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Hygroma'] },
    
    // === AVANT-BRAS ===
    { id: 'forearm_l', label: 'Avant-bras G', x: 71, y: 42, w: 11, h: 8, injuries: ['Tendinite', 'Contracture', 'Fracture'] },
    { id: 'forearm_r', label: 'Avant-bras D', x: 32, y: 41, w: 8, h: 10, injuries: ['Tendinite', 'Contracture', 'Fracture'] },
    
    // === POIGNETS ===
    { id: 'wrist_l', label: 'Poignet G', x: 75, y: 48, w: 9, h: 4, injuries: ['Entorse', 'Fracture scaphoïde', 'Tendinite', 'Kyste synovial'] },
    { id: 'wrist_r', label: 'Poignet D', x: 26, y: 48, w: 10, h: 4, injuries: ['Entorse', 'Fracture scaphoïde', 'Tendinite', 'Kyste synovial'] },
    
    // === MAINS ===
    { id: 'hand_l', label: 'Main G', x: 77, y: 53, w: 10, h: 11, injuries: ['Entorse doigt', 'Fracture métacarpe', 'Luxation', 'Contusion'] },
    { id: 'hand_r', label: 'Main D', x: 23, y: 53, w: 10, h: 10, injuries: ['Entorse doigt', 'Fracture métacarpe', 'Luxation', 'Contusion'] },
    { id: 'thumb_l', label: 'Pouce G', x: 82, y: 51, w: 5, h: 6, injuries: ['Entorse', 'Fracture Bennett', 'Luxation'] },
    { id: 'thumb_r', label: 'Pouce D', x: 20, y: 51, w: 6, h: 6, injuries: ['Entorse', 'Fracture Bennett', 'Luxation'] },
    
    // === TRONC ===
    { id: 'sternum', label: 'Sternum', x: 50, y: 26, w: 5, h: 9, injuries: ['Contusion', 'Fracture', 'Point douloureux'] },
    { id: 'ribs_l', label: 'Côtes G', x: 60, y: 34, w: 8, h: 8, injuries: ['Fracture', 'Fissure', 'Contusion'] },
    { id: 'ribs_r', label: 'Côtes D', x: 41, y: 34, w: 8, h: 7, injuries: ['Fracture', 'Fissure', 'Contusion'] },
    { id: 'abs', label: 'Abdominaux', x: 50, y: 39, w: 12, h: 18, injuries: ['Déchirure', 'Contracture', 'Hernie'] },
    { id: 'oblique_l', label: 'Oblique G', x: 59, y: 41, w: 8, h: 8, injuries: ['Élongation', 'Déchirure', 'Point de côté'] },
    { id: 'oblique_r', label: 'Oblique D', x: 41, y: 41, w: 8, h: 7, injuries: ['Élongation', 'Déchirure', 'Point de côté'] },
    
    // === BASSIN & HANCHES ===
    { id: 'pubis', label: 'Pubis', x: 50, y: 50, w: 16, h: 4, injuries: ['Pubalgie', 'Ostéite pubienne', 'Tendinite adducteurs'] },
    { id: 'hip_l', label: 'Hanche G', x: 61, y: 48, w: 11, h: 8, injuries: ['Bursite', 'Tendinite TFL', 'Conflit FAI', 'Arthrose'] },
    { id: 'hip_r', label: 'Hanche D', x: 40, y: 48, w: 9, h: 8, injuries: ['Bursite', 'Tendinite TFL', 'Conflit FAI', 'Arthrose'] },
    { id: 'groin_l', label: 'Aine G', x: 58, y: 52, w: 10, h: 6, injuries: ['Pubalgie', 'Hernie inguinale', 'Adducteurs'] },
    { id: 'groin_r', label: 'Aine D', x: 47, y: 52, w: 8, h: 3, injuries: ['Pubalgie', 'Hernie inguinale', 'Adducteurs'] },
    
    // === CUISSES ===
    { id: 'quad_l', label: 'Quadriceps G', x: 58, y: 59, w: 14, h: 20, injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion'] },
    { id: 'quad_r', label: 'Quadriceps D', x: 42, y: 59, w: 14, h: 20, injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion'] },
    { id: 'adductor_l', label: 'Adducteur G', x: 54, y: 55, w: 8, h: 9, injuries: ['Élongation', 'Déchirure', 'Pubalgie'] },
    { id: 'adductor_r', label: 'Adducteur D', x: 48, y: 55, w: 5, h: 9, injuries: ['Élongation', 'Déchirure', 'Pubalgie'] },
    
    // === GENOUX ===
    { id: 'knee_l', label: 'Genou G', x: 57, y: 72, w: 10, h: 9, injuries: ['Entorse LCA', 'LCL', 'Ménisque', 'Tendinite rotulienne', 'Syndrome rotulien'] },
    { id: 'knee_r', label: 'Genou D', x: 43, y: 72, w: 10, h: 8, injuries: ['Entorse LCA', 'LCL', 'Ménisque', 'Tendinite rotulienne', 'Syndrome rotulien'] },
    
    // === JAMBES ===
    { id: 'shin_l', label: 'Tibia G', x: 56, y: 82, w: 12, h: 13, injuries: ['Périostite', 'Fracture de fatigue', 'Contusion'] },
    { id: 'shin_r', label: 'Tibia D', x: 43, y: 82, w: 11, h: 12, injuries: ['Périostite', 'Fracture de fatigue', 'Contusion'] },
    
    // === CHEVILLES ===
    { id: 'ankle_l', label: 'Cheville G', x: 56, y: 91, w: 10, h: 4, injuries: ['Entorse', 'Fracture malléole', 'Tendinite péroniers'] },
    { id: 'ankle_r', label: 'Cheville D', x: 44, y: 91, w: 10, h: 4, injuries: ['Entorse', 'Fracture malléole', 'Tendinite péroniers'] },
    
    // === PIEDS ===
    { id: 'foot_l', label: 'Pied G', x: 58, y: 95, w: 13, h: 5, injuries: ['Fasciite plantaire', 'Fracture métatarse', 'Entorse Lisfranc'] },
    { id: 'foot_r', label: 'Pied D', x: 42, y: 95, w: 11, h: 5, injuries: ['Fasciite plantaire', 'Fracture métatarse', 'Entorse Lisfranc'] },
  ],
  
  // ============================================
  // DONNÉES CALIBRÉES - VUE DE DOS (29 zones)
  // ============================================
  back: [
    // === TÊTE & COU ===
    { id: 'skull', label: 'Crâne', x: 50, y: 7, w: 15, h: 10, injuries: ['Commotion', 'Contusion', 'Plaie'] },
    { id: 'neck_back', label: 'Nuque', x: 50, y: 15, w: 12, h: 6, injuries: ['Torticolis', 'Cervicalgie', 'Contracture trapèze'] },
    
    // === TRAPÈZES & ÉPAULES ===
    { id: 'trap_l', label: 'Trapèze G', x: 58, y: 18, w: 10, h: 5, injuries: ['Contracture', 'Tension', 'Point trigger'] },
    { id: 'trap_r', label: 'Trapèze D', x: 43, y: 18, w: 10, h: 4, injuries: ['Contracture', 'Tension', 'Point trigger'] },
    { id: 'shoulder_back_l', label: 'Épaule G (arr)', x: 66, y: 22, w: 12, h: 8, injuries: ['Tendinite infra-épineux', 'Bursite', 'SLAP'] },
    { id: 'shoulder_back_r', label: 'Épaule D (arr)', x: 37, y: 22, w: 12, h: 8, injuries: ['Tendinite infra-épineux', 'Bursite', 'SLAP'] },
    
    // === DOS HAUT ===
    { id: 'rhomboid_l', label: 'Rhomboïde G', x: 57, y: 21, w: 16, h: 10, injuries: ['Contracture', 'Élongation', 'Point douloureux'] },
    { id: 'rhomboid_r', label: 'Rhomboïde D', x: 45, y: 21, w: 16, h: 10, injuries: ['Contracture', 'Élongation', 'Point douloureux'] },
    { id: 'thoracic', label: 'Dorsales', x: 50, y: 28, w: 15, h: 15, injuries: ['Dorsalgie', 'Blocage vertébral', 'Contracture'] },
    { id: 'lat_l', label: 'Grand dorsal G', x: 56, y: 32, w: 12, h: 15, injuries: ['Contracture', 'Déchirure', 'Élongation'] },
    { id: 'lat_r', label: 'Grand dorsal D', x: 44, y: 32, w: 11, h: 14, injuries: ['Contracture', 'Déchirure', 'Élongation'] },
    
    // === TRICEPS ===
    { id: 'triceps_l', label: 'Triceps G', x: 66, y: 30, w: 9, h: 11, injuries: ['Tendinite', 'Déchirure', 'Contracture'] },
    { id: 'triceps_r', label: 'Triceps D', x: 34, y: 30, w: 11, h: 12, injuries: ['Tendinite', 'Déchirure', 'Contracture'] },
    
    // === COUDES (dos) ===
    { id: 'elbow_back_l', label: 'Coude G (arr)', x: 69, y: 38, w: 14, h: 6, injuries: ['Bursite olécrane', 'Tendinite triceps'] },
    { id: 'elbow_back_r', label: 'Coude D (arr)', x: 31, y: 37, w: 10, h: 6, injuries: ['Bursite olécrane', 'Tendinite triceps'] },
    
    // === LOMBAIRES ===
    { id: 'lumbar', label: 'Lombaires', x: 50, y: 42, w: 26, h: 9, injuries: ['Lumbago', 'Hernie discale', 'Sciatique', 'Contracture'] },
    { id: 'sacrum', label: 'Sacrum', x: 50, y: 48, w: 9, h: 8, injuries: ['Sacro-iliaque', 'Contusion', 'Fracture de fatigue'] },
    
    // === FESSIERS ===
    { id: 'glute_l', label: 'Fessier G', x: 56, y: 50, w: 13, h: 10, injuries: ['Contracture', 'Syndrome piriforme', 'Tendinite moyen fessier'] },
    { id: 'glute_r', label: 'Fessier D', x: 42, y: 50, w: 14, h: 11, injuries: ['Contracture', 'Syndrome piriforme', 'Tendinite moyen fessier'] },
    
    // === ISCHIO-JAMBIERS ===
    { id: 'hamstring_l', label: 'Ischio G', x: 57, y: 63, w: 14, h: 17, injuries: ['Élongation', 'Déchirure', 'Claquage', 'Tendinite'] },
    { id: 'hamstring_r', label: 'Ischio D', x: 44, y: 63, w: 14, h: 16, injuries: ['Élongation', 'Déchirure', 'Claquage', 'Tendinite'] },
    
    // === CREUX POPLITÉ ===
    { id: 'popliteal_l', label: 'Creux poplité G', x: 57, y: 71, w: 13, h: 6, injuries: ['Kyste Baker', 'Tendinite', 'Lésion LCP'] },
    { id: 'popliteal_r', label: 'Creux poplité D', x: 43, y: 71, w: 14, h: 5, injuries: ['Kyste Baker', 'Tendinite', 'Lésion LCP'] },
    
    // === MOLLETS ===
    { id: 'calf_l', label: 'Mollet G', x: 58, y: 78, w: 14, h: 12, injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe'] },
    { id: 'calf_r', label: 'Mollet D', x: 43, y: 78, w: 14, h: 12, injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe'] },
    
    // === TENDON D'ACHILLE ===
    { id: 'achilles_l', label: 'Achille G', x: 58, y: 94, w: 11, h: 3, injuries: ['Tendinite', 'Rupture', 'Tendinopathie'] },
    { id: 'achilles_r', label: 'Achille D', x: 43, y: 94, w: 12, h: 3, injuries: ['Tendinite', 'Rupture', 'Tendinopathie'] },
    
    // === TALONS ===
    { id: 'heel_l', label: 'Talon G', x: 58, y: 96, w: 11, h: 3, injuries: ['Épine calcanéenne', 'Contusion', 'Fracture de fatigue'] },
    { id: 'heel_r', label: 'Talon D', x: 43, y: 96, w: 10, h: 3, injuries: ['Épine calcanéenne', 'Contusion', 'Fracture de fatigue'] },
  ],
};

const FORCED_ASPECT_RATIO = 0.45;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const BodyMap: React.FC<BodyMapProps> = memo(({ onZonePress, injuredZones = [], isCreatorMode = false }) => {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [zones, setZones] = useState(INITIAL_DATA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [debug, setDebug] = useState(false); // Mode chirurgien désactivé

  const activeZones = zones[view];
  const selectedZone = activeZones.find((z) => z.id === selectedId);
  const isUpperBody = selectedZone ? selectedZone.y < 50 : true;

  const imageSource = view === 'front'
    ? require('@/assets/body-images/body_front.png')
    : require('@/assets/body-images/body_back.png');

  // Fonctions d'édition
  const updateZone = (updates: Partial<BodyZone>) => {
    if (!selectedId) return;
    setZones((prev) => ({
      ...prev,
      [view]: prev[view].map((z) => z.id === selectedId ? { ...z, ...updates } : z),
    }));
  };

  const move = (dx: number, dy: number) => {
    if (!selectedZone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateZone({ x: selectedZone.x + dx, y: selectedZone.y + dy });
  };

  const resize = (dw: number, dh: number) => {
    if (!selectedZone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateZone({ w: Math.max(3, selectedZone.w + dw), h: Math.max(3, selectedZone.h + dh) });
  };

  const handleZonePress = (zone: BodyZone) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (debug) {
      setSelectedId(zone.id);
    } else {
      // Appeler directement onZonePress pour gérer la détection des chevauchements
      onZonePress(zone, view);
    }
  };

  const toggleView = (newView: 'front' | 'back') => {
    if (view !== newView) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedId(null);
      setView(newView);
    }
  };

  const getZoneColor = (zoneId: string): string => {
    const injury = injuredZones.find((inj) => inj.zone_id === zoneId && inj.zone_view === view);
    if (!injury) return 'transparent';
    if (injury.eva_score >= 7) return 'rgba(244, 67, 54, 0.6)';
    if (injury.eva_score >= 4) return 'rgba(255, 152, 0, 0.6)';
    return 'rgba(139, 195, 74, 0.6)';
  };

  // === FONCTIONS COPIER ===
  const copyAllZones = async () => {
    const code = `// === VUE ${view.toUpperCase()} ===\n` +
      activeZones.map((z) =>
        `{ id: '${z.id}', label: '${z.label}', x: ${z.x}, y: ${z.y}, w: ${z.w}, h: ${z.h} },`
      ).join('\n');

    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showPopup('Copie !', `${activeZones.length} zones copiees dans le presse-papier`, [{ text: 'OK', style: 'primary' }]);
  };

  const copySelectedZone = async () => {
    if (!selectedZone) return;
    const code = `{ id: '${selectedZone.id}', label: '${selectedZone.label}', x: ${selectedZone.x}, y: ${selectedZone.y}, w: ${selectedZone.w}, h: ${selectedZone.h} }`;
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showPopup('Copie !', `Zone "${selectedZone.label}" copiee`, [{ text: 'OK', style: 'primary' }]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER - Seulement en mode créateur */}
      {isCreatorMode && (
        <View style={[styles.header, { backgroundColor: colors.backgroundCard }]}>
          <View>
            <Text style={[styles.title, { color: colors.accent }]}>
              {debug ? 'Mode Chirurgien' : 'Sélecteur'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {view === 'front' ? activeZones.length : activeZones.length} zones
            </Text>
          </View>
          <TouchableOpacity onPress={() => setDebug(!debug)} style={styles.iconBtn}>
            {debug ? <EyeOff size={20} color={colors.textPrimary} /> : <Eye size={20} color={colors.textPrimary} />}
          </TouchableOpacity>
        </View>
      )}

      {/* FACE/DOS + Légende - Pour tous les utilisateurs */}
      <View style={[styles.viewSwitcher, { backgroundColor: colors.backgroundCard, marginBottom: SPACING.md }]}>
        <TouchableOpacity
          onPress={() => toggleView('front')}
          style={[styles.btn, view === 'front' ? { backgroundColor: colors.accent } : { backgroundColor: colors.backgroundCard }]}
        >
          <Text style={[styles.btnText, { color: view === 'front' ? '#FFF' : colors.textPrimary }]}>
            FACE{isCreatorMode ? ` (${INITIAL_DATA.front.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => toggleView('back')}
          style={[styles.btn, view === 'back' ? { backgroundColor: colors.accent } : { backgroundColor: colors.backgroundCard }]}
        >
          <Text style={[styles.btnText, { color: view === 'back' ? '#FFF' : colors.textPrimary }]}>
            DOS{isCreatorMode ? ` (${INITIAL_DATA.back.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Légende des couleurs */}
      <View style={[styles.legend, { backgroundColor: colors.backgroundCard, marginBottom: SPACING.md }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(139, 195, 74, 0.8)' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Léger</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(255, 152, 0, 0.8)' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Modéré</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: 'rgba(244, 67, 54, 0.8)' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Sévère</Text>
        </View>
      </View>

      {/* PANNEAU EN HAUT (zones du haut) */}
      {debug && selectedZone && isUpperBody && (
        <View style={[styles.controlPanel, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlTitle}>✏️ {selectedZone.label.toUpperCase()}</Text>
            <TouchableOpacity onPress={copySelectedZone} style={styles.copyBtn}>
              <Copy size={14} color="#4ADE80" />
              <Text style={styles.copyBtnText}>Copier</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <View style={styles.padGroup}>
              <Text style={[styles.padLabel, { color: colors.textSecondary }]}>Position</Text>
              <View style={styles.dpad}>
                <TouchableOpacity onPress={() => move(0, -1)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                  <ArrowUp size={14} color="white" />
                </TouchableOpacity>
                <View style={styles.dpadMid}>
                  <TouchableOpacity onPress={() => move(-1, 0)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                    <ArrowLeft size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => move(1, 0)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                    <ArrowRight size={14} color="white" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => move(0, 1)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                  <ArrowDown size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.padGroup}>
              <Text style={[styles.padLabel, { color: colors.textSecondary }]}>Taille</Text>
              <View style={styles.sizeControls}>
                <View style={styles.sizeRow}>
                  <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>L</Text>
                  <TouchableOpacity onPress={() => resize(-1, 0)} style={styles.sbtn}><Minus size={12} color="white" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => resize(1, 0)} style={styles.sbtn}><Plus size={12} color="white" /></TouchableOpacity>
                </View>
                <View style={styles.sizeRow}>
                  <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>H</Text>
                  <TouchableOpacity onPress={() => resize(0, -1)} style={styles.sbtn}><Minus size={12} color="white" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => resize(0, 1)} style={styles.sbtn}><Plus size={12} color="white" /></TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.valuesGroup}>
              <Text style={styles.valueText}>x:{selectedZone.x} y:{selectedZone.y}</Text>
              <Text style={styles.valueText}>w:{selectedZone.w} h:{selectedZone.h}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ZONE IMAGE */}
      <View style={styles.mainArea}>
        <View style={[styles.imageFrame, { aspectRatio: FORCED_ASPECT_RATIO }]}>
          <Image source={imageSource} style={styles.image} resizeMode="stretch" />

          {activeZones.map((zone) => {
            const isSelected = zone.id === selectedId;
            const zoneColor = getZoneColor(zone.id);
            const hasInjury = zoneColor !== 'transparent';

            return (
              <TouchableOpacity
                key={zone.id}
                onPress={() => handleZonePress(zone)}
                activeOpacity={0.8}
                style={[
                  styles.zone,
                  {
                    left: `${zone.x - zone.w / 2}%`,
                    top: `${zone.y - zone.h / 2}%`,
                    width: `${zone.w}%`,
                    height: `${zone.h}%`,
                    backgroundColor: isSelected
                      ? 'rgba(0, 255, 0, 0.4)'
                      : debug
                      ? 'rgba(255, 0, 0, 0.15)'
                      : hasInjury
                      ? zoneColor
                      : 'transparent',
                    borderColor: isSelected ? '#00FF00' : debug ? 'rgba(255,0,0,0.5)' : hasInjury ? '#FFF' : 'transparent',
                    borderWidth: isSelected ? 2 : debug ? 1 : hasInjury ? 2 : 0,
                    zIndex: isSelected ? 100 : 10,
                  },
                ]}
              >
                {/* Cercle au centre pour les zones blessées */}
                {hasInjury && !debug && (
                  <View style={styles.injuryMarker}>
                    <View style={[styles.injuryCircle, { backgroundColor: zoneColor, borderColor: '#FFF' }]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* PANNEAU EN BAS (zones du bas) */}
      {debug && selectedZone && !isUpperBody && (
        <View style={[styles.controlPanel, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.controlHeader}>
            <Text style={styles.controlTitle}>✏️ {selectedZone.label.toUpperCase()}</Text>
            <TouchableOpacity onPress={copySelectedZone} style={styles.copyBtn}>
              <Copy size={14} color="#4ADE80" />
              <Text style={styles.copyBtnText}>Copier</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.controlRow}>
            <View style={styles.padGroup}>
              <Text style={[styles.padLabel, { color: colors.textSecondary }]}>Position</Text>
              <View style={styles.dpad}>
                <TouchableOpacity onPress={() => move(0, -1)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                  <ArrowUp size={14} color="white" />
                </TouchableOpacity>
                <View style={styles.dpadMid}>
                  <TouchableOpacity onPress={() => move(-1, 0)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                    <ArrowLeft size={14} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => move(1, 0)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                    <ArrowRight size={14} color="white" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => move(0, 1)} style={[styles.dbtn, { backgroundColor: colors.accent }]}>
                  <ArrowDown size={14} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.padGroup}>
              <Text style={[styles.padLabel, { color: colors.textSecondary }]}>Taille</Text>
              <View style={styles.sizeControls}>
                <View style={styles.sizeRow}>
                  <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>L</Text>
                  <TouchableOpacity onPress={() => resize(-1, 0)} style={styles.sbtn}><Minus size={12} color="white" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => resize(1, 0)} style={styles.sbtn}><Plus size={12} color="white" /></TouchableOpacity>
                </View>
                <View style={styles.sizeRow}>
                  <Text style={[styles.sizeLabel, { color: colors.textSecondary }]}>H</Text>
                  <TouchableOpacity onPress={() => resize(0, -1)} style={styles.sbtn}><Minus size={12} color="white" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => resize(0, 1)} style={styles.sbtn}><Plus size={12} color="white" /></TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.valuesGroup}>
              <Text style={styles.valueText}>x:{selectedZone.x} y:{selectedZone.y}</Text>
              <Text style={styles.valueText}>w:{selectedZone.w} h:{selectedZone.h}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Message aide + Bouton Copier Tout */}
      {debug && !selectedZone && (
        <View style={[styles.helpBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            Touche une zone pour la modifier
          </Text>
          <TouchableOpacity onPress={copyAllZones} style={styles.copyAllBtn}>
            <Copy size={18} color="white" />
            <Text style={styles.copyAllBtnText}>COPIER TOUTES LES ZONES ({activeZones.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      <PopupComponent />
    </View>
  );
});

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  title: { fontWeight: 'bold', fontSize: 16 },
  subtitle: { fontSize: 10 },
  iconBtn: { padding: 5 },
  mainArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  imageFrame: { width: '100%', maxWidth: 500, position: 'relative' },
  image: { width: '100%', height: '100%' },
  zone: { position: 'absolute', borderRadius: 4 },
  // Marqueur de blessure
  injuryMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    zIndex: 20,
  },
  injuryCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  // Control Panel
  controlPanel: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  controlTitle: { color: '#4ADE80', fontWeight: 'bold', fontSize: 12 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  copyBtnText: { color: '#4ADE80', fontSize: 10, fontWeight: '600' },
  controlRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  padGroup: { alignItems: 'center' },
  padLabel: { fontSize: 8, marginBottom: 2 },
  dpad: { alignItems: 'center', gap: 1 },
  dpadMid: { flexDirection: 'row', gap: 12 },
  dbtn: { width: 24, height: 24, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  sizeControls: { gap: 2 },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sizeLabel: { fontSize: 9, width: 12, fontWeight: 'bold' },
  sbtn: { backgroundColor: '#6366F1', width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  valuesGroup: { backgroundColor: '#000', padding: 4, borderRadius: 4 },
  valueText: { color: '#00FF00', fontFamily: 'monospace', fontSize: 9 },
  helpBox: { padding: SPACING.sm, borderRadius: RADIUS.md, marginVertical: SPACING.xs, alignItems: 'center' },
  helpText: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  copyAllBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600' },
  viewSwitcher: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 13 },
});

export default BodyMap;
