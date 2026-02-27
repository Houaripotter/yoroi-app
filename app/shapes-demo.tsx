// ============================================
// DÉMO DES 100 FORMES GÉOMÉTRIQUES
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Defs, ClipPath, G, Polygon, Rect, Ellipse } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHAPE_SIZE = (SCREEN_WIDTH - 48) / 3 - 8;

const TEST_IMAGE = 'https://i.pravatar.cc/300';

export default function ShapesDemo() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const renderShape = (id: number, size: number) => {
    const s = size;
    const half = s / 2;
    const accent = colors.accent;
    const bg = colors.backgroundCard;

    // Helper pour créer des polygones réguliers
    const createPolygon = (sides: number, radius: number, rotation: number = 0) => {
      let points = '';
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2 + rotation;
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle);
        points += `${x},${y} `;
      }
      return points.trim();
    };

    // Helper pour étoiles
    const createStar = (points: number, outerR: number, innerR: number) => {
      let path = '';
      for (let i = 0; i < points * 2; i++) {
        const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        path += `${x},${y} `;
      }
      return path.trim();
    };

    switch (id) {
      // ═══════════════════════════════════════
      // 1-10: CERCLES ET VARIATIONS
      // ═══════════════════════════════════════
      case 1: // Cercle simple
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-8, height: s-8, borderRadius: (s-8)/2, borderWidth: 3, borderColor: accent, overflow: 'hidden', backgroundColor: bg }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 2: // Cercle double bordure
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-4, height: s-4, borderRadius: (s-4)/2, borderWidth: 3, borderColor: accent, padding: 3 }}>
              <View style={{ flex: 1, borderRadius: s/2, borderWidth: 2, borderColor: `${accent}50`, overflow: 'hidden', backgroundColor: bg }}>
                <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
              </View>
            </View>
          </View>
        );

      case 3: // Cercle avec glow
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-10, height: s-10, borderRadius: (s-10)/2, borderWidth: 3, borderColor: accent, overflow: 'hidden', shadowColor: accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12, elevation: 12 }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 4: // Cercle épais
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-6, height: s-6, borderRadius: (s-6)/2, borderWidth: 5, borderColor: accent, overflow: 'hidden', backgroundColor: bg }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 5: // Cercle triple
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="47" stroke={accent} strokeWidth="2" fill="none" />
              <Circle cx="50" cy="50" r="42" stroke={accent} strokeWidth="2" fill="none" />
              <Circle cx="50" cy="50" r="37" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.62, height: s*0.62, borderRadius: s*0.31 }} />
          </View>
        );

      case 6: // Cercle pointillé
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="44" stroke={accent} strokeWidth="3" strokeDasharray="8 4" fill="none" />
              <Circle cx="50" cy="50" r="38" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.65, height: s*0.65, borderRadius: s*0.325 }} />
          </View>
        );

      case 7: // Cercle avec anneau externe
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="46" stroke={accent} strokeWidth="6" fill="none" />
              <Circle cx="50" cy="50" r="36" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.6, height: s*0.6, borderRadius: s*0.3 }} />
          </View>
        );

      case 8: // Ellipse horizontale
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Ellipse cx="50" cy="50" rx="45" ry="35" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.75, height: s*0.55, borderRadius: s*0.2 }} />
          </View>
        );

      case 9: // Ellipse verticale
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Ellipse cx="50" cy="50" rx="32" ry="44" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.75, borderRadius: s*0.15 }} />
          </View>
        );

      case 10: // Cercle avec encoche
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 3 A47 47 0 1 1 49.9 3 M50 3 L50 15" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.7, height: s*0.7, borderRadius: s*0.35 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 11-25: CARRÉS ET RECTANGLES
      // ═══════════════════════════════════════
      case 11: // Carré simple
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-10, height: s-10, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 12: // Carré arrondi (Squircle léger)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-8, height: s-8, borderRadius: 12, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 13: // Squircle (Apple style)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-8, height: s-8, borderRadius: (s-8)*0.28, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 14: // Carré très arrondi
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-8, height: s-8, borderRadius: (s-8)*0.35, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 15: // Carré double bordure
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-6, height: s-6, borderRadius: 8, borderWidth: 3, borderColor: accent, padding: 3 }}>
              <View style={{ flex: 1, borderRadius: 4, borderWidth: 2, borderColor: `${accent}50`, backgroundColor: bg, overflow: 'hidden' }}>
                <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
              </View>
            </View>
          </View>
        );

      case 16: // Carré coins coupés
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="15,5 85,5 95,15 95,85 85,95 15,95 5,85 5,15" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.7, height: s*0.7, borderRadius: 4 }} />
          </View>
        );

      case 17: // Carré rotation 45°
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s*0.65, height: s*0.65, transform: [{ rotate: '45deg' }], borderRadius: 8, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '140%', height: '140%', marginLeft: '-20%', marginTop: '-20%', transform: [{ rotate: '-45deg' }] }} />
            </View>
          </View>
        );

      case 18: // Rectangle horizontal
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-6, height: s*0.7, borderRadius: 10, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '130%', marginTop: '-15%' }} />
            </View>
          </View>
        );

      case 19: // Rectangle vertical
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s*0.7, height: s-6, borderRadius: 10, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '130%', height: '100%', marginLeft: '-15%' }} />
            </View>
          </View>
        );

      case 20: // Carré avec encoche
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M10 10 H40 V5 H60 V10 H90 V90 H10 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.65, height: s*0.65, top: s*0.22, borderRadius: 4 }} />
          </View>
        );

      case 21: // Ticket/Coupon
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M10 20 H90 V40 A10 10 0 0 0 90 60 V80 H10 V60 A10 10 0 0 0 10 40 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.65, height: s*0.5, borderRadius: 4 }} />
          </View>
        );

      case 22: // Carré ondulé
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M10 20 Q25 10 40 20 T70 20 T100 20 V80 Q85 90 70 80 T40 80 T10 80 Z" stroke={accent} strokeWidth="3" fill={bg} transform="translate(-5, 0)" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.65, height: s*0.55, borderRadius: 4 }} />
          </View>
        );

      case 23: // Carré avec coins ronds alternés
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-10, height: s-10, borderTopLeftRadius: 20, borderTopRightRadius: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 20, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 24: // Carré avec un seul coin arrondi
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-10, height: s-10, borderTopRightRadius: 30, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 25: // Parallélogramme
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="20,15 95,15 80,85 5,85" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: 4 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 26-40: TRIANGLES ET POINTES
      // ═══════════════════════════════════════
      case 26: // Triangle équilatéral
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,8 95,85 5,85" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.45, top: s*0.32, borderRadius: s*0.225 }} />
          </View>
        );

      case 27: // Triangle inversé
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="5,15 95,15 50,92" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.45, top: s*0.15, borderRadius: s*0.225 }} />
          </View>
        );

      case 28: // Triangle arrondi
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 10 Q52 10 90 80 Q92 85 87 88 H13 Q8 85 10 80 Q48 10 50 10" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.42, height: s*0.42, top: s*0.3, borderRadius: s*0.21 }} />
          </View>
        );

      case 29: // Losange/Diamond
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,5 95,50 50,95 5,50" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.5, borderRadius: s*0.25 }} />
          </View>
        );

      case 30: // Losange arrondi
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 8 Q55 8 92 47 Q95 50 92 53 Q55 92 50 92 Q45 92 8 53 Q5 50 8 47 Q45 8 50 8" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.48, height: s*0.48, borderRadius: s*0.24 }} />
          </View>
        );

      case 31: // Flèche haut
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,5 80,40 65,40 65,95 35,95 35,40 20,40" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.35, height: s*0.45, top: s*0.35, borderRadius: 4 }} />
          </View>
        );

      case 32: // Chevron
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M10 30 L50 10 L90 30 L90 70 L50 90 L10 70 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 33: // Pentagon
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(5, 45)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.52, height: s*0.52, borderRadius: s*0.26 }} />
          </View>
        );

      case 34: // Pentagon pointu
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 L90 38 L75 90 H25 L10 38 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.48, height: s*0.5, top: s*0.22, borderRadius: s*0.1 }} />
          </View>
        );

      case 35: // Kite/Cerf-volant
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,5 85,40 50,95 15,40" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.42, height: s*0.42, top: s*0.2, borderRadius: s*0.21 }} />
          </View>
        );

      case 36: // Trapèze
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="25,20 75,20 95,80 5,80" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.45, borderRadius: 4 }} />
          </View>
        );

      case 37: // Trapèze inversé
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="5,20 95,20 75,80 25,80" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.45, borderRadius: 4 }} />
          </View>
        );

      case 38: // Home/Maison
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 10 L90 45 V90 H10 V45 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.45, top: s*0.32, borderRadius: 4 }} />
          </View>
        );

      case 39: // Croix
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M35 10 H65 V35 H90 V65 H65 V90 H35 V65 H10 V35 H35 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.4, height: s*0.4, borderRadius: s*0.2 }} />
          </View>
        );

      case 40: // Plus arrondi
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M35 10 Q35 5 40 5 H60 Q65 5 65 10 V35 H90 Q95 35 95 40 V60 Q95 65 90 65 H65 V90 Q65 95 60 95 H40 Q35 95 35 90 V65 H10 Q5 65 5 60 V40 Q5 35 10 35 H35 Z" stroke={accent} strokeWidth="2" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.38, height: s*0.38, borderRadius: s*0.19 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 41-60: HEXAGONES ET POLYGONES
      // ═══════════════════════════════════════
      case 41: // Hexagone régulier
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(6, 45)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.58, height: s*0.58, borderRadius: s*0.29 }} />
          </View>
        );

      case 42: // Hexagone horizontal
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(6, 45, Math.PI/6)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 43: // Heptagone (7 côtés)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(7, 44)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 44: // Octogone
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(8, 45)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.58, height: s*0.58, borderRadius: s*0.29 }} />
          </View>
        );

      case 45: // Octogone horizontal
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="30,5 70,5 95,30 95,70 70,95 30,95 5,70 5,30" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.6, height: s*0.6, borderRadius: 8 }} />
          </View>
        );

      case 46: // Nonagone (9 côtés)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(9, 44)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 47: // Décagone (10 côtés)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(10, 44)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.58, height: s*0.58, borderRadius: s*0.29 }} />
          </View>
        );

      case 48: // Dodécagone (12 côtés)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createPolygon(12, 44)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.6, height: s*0.6, borderRadius: s*0.3 }} />
          </View>
        );

      case 49: // Hexagone allongé vertical
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,5 80,20 80,80 50,95 20,80 20,20" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.6, borderRadius: 6 }} />
          </View>
        );

      case 50: // Hexagone allongé horizontal
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="5,50 20,20 80,20 95,50 80,80 20,80" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.6, height: s*0.45, borderRadius: 6 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 51-70: ÉTOILES ET FORMES RAYONNANTES
      // ═══════════════════════════════════════
      case 51: // Étoile 4 branches
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(4, 45, 20)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.4, height: s*0.4, borderRadius: s*0.2 }} />
          </View>
        );

      case 52: // Étoile 5 branches
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(5, 45, 18)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.38, height: s*0.38, borderRadius: s*0.19 }} />
          </View>
        );

      case 53: // Étoile 6 branches
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(6, 45, 22)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.42, height: s*0.42, borderRadius: s*0.21 }} />
          </View>
        );

      case 54: // Étoile 8 branches
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(8, 44, 25)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.45, borderRadius: s*0.225 }} />
          </View>
        );

      case 55: // Étoile 12 branches
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(12, 44, 30)} stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.5, borderRadius: s*0.25 }} />
          </View>
        );

      case 56: // Soleil (étoile douce)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(16, 44, 35)} stroke={accent} strokeWidth="2" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 57: // Badge étoile
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(5, 46, 28)} stroke={accent} strokeWidth="3" fill={bg} />
              <Circle cx="50" cy="50" r="25" fill={bg} stroke={accent} strokeWidth="2" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.4, height: s*0.4, borderRadius: s*0.2 }} />
          </View>
        );

      case 58: // Explosion
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(10, 46, 28)} stroke={accent} strokeWidth="2" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.45, borderRadius: s*0.225 }} />
          </View>
        );

      case 59: // Gear/Engrenage
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points={createStar(8, 44, 35)} stroke={accent} strokeWidth="3" fill={bg} />
              <Circle cx="50" cy="50" r="28" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.45, borderRadius: s*0.225 }} />
          </View>
        );

      case 60: // Fleur 6 pétales
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <G fill={accent}>
                <Circle cx="50" cy="22" r="16" />
                <Circle cx="74" cy="36" r="16" />
                <Circle cx="74" cy="64" r="16" />
                <Circle cx="50" cy="78" r="16" />
                <Circle cx="26" cy="64" r="16" />
                <Circle cx="26" cy="36" r="16" />
              </G>
              <Circle cx="50" cy="50" r="24" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.4, height: s*0.4, borderRadius: s*0.2 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 61-80: FORMES SPÉCIALES ET BADGES
      // ═══════════════════════════════════════
      case 61: // Bouclier simple
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 L90 20 V55 Q90 85 50 95 Q10 85 10 55 V20 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.6, top: s*0.15, borderRadius: 6 }} />
          </View>
        );

      case 62: // Bouclier arrondi
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 Q90 5 90 25 V55 Q90 90 50 95 Q10 90 10 55 V25 Q10 5 50 5" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.6, top: s*0.12, borderRadius: 8 }} />
          </View>
        );

      case 63: // Badge police
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 L65 15 L90 15 L85 40 L95 60 L75 75 L70 95 L50 85 L30 95 L25 75 L5 60 L15 40 L10 15 L35 15 Z" stroke={accent} strokeWidth="2" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.48, height: s*0.48, borderRadius: s*0.24 }} />
          </View>
        );

      case 64: // Médaille
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="35,5 45,5 50,15 55,5 65,5 65,30 50,45 35,30" fill={accent} />
              <Circle cx="50" cy="60" r="32" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.48, height: s*0.48, top: s*0.32, borderRadius: s*0.24 }} />
          </View>
        );

      case 65: // Cœur
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 88 C20 65 5 45 5 30 C5 15 18 5 32 5 C42 5 50 12 50 12 C50 12 58 5 68 5 C82 5 95 15 95 30 C95 45 80 65 50 88" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.4, top: s*0.22, borderRadius: 6 }} />
          </View>
        );

      case 66: // Goutte
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 Q85 45 85 60 Q85 92 50 92 Q15 92 15 60 Q15 45 50 5" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.48, height: s*0.48, top: s*0.3, borderRadius: s*0.24 }} />
          </View>
        );

      case 67: // Œuf
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Ellipse cx="50" cy="55" rx="35" ry="42" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.52, height: s*0.6, top: s*0.18, borderRadius: s*0.26 }} />
          </View>
        );

      case 68: // Capsule horizontale
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-8, height: s*0.55, borderRadius: s*0.275, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '180%', marginTop: '-40%' }} />
            </View>
          </View>
        );

      case 69: // Capsule verticale
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s*0.55, height: s-8, borderRadius: s*0.275, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '180%', height: '100%', marginLeft: '-40%' }} />
            </View>
          </View>
        );

      case 70: // Nuage
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <G fill={accent}>
                <Circle cx="30" cy="60" r="22" />
                <Circle cx="55" cy="55" r="26" />
                <Circle cx="75" cy="62" r="18" />
                <Rect x="30" y="60" width="45" height="25" />
              </G>
              <Circle cx="52" cy="58" r="20" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.35, height: s*0.35, top: s*0.38, borderRadius: s*0.175 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 71-85: STYLE JAPONAIS / YOROI
      // ═══════════════════════════════════════
      case 71: // Mon (emblème japonais)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="46" stroke={accent} strokeWidth="4" fill="none" />
              <Circle cx="50" cy="50" r="38" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.62, height: s*0.62, borderRadius: s*0.31 }} />
          </View>
        );

      case 72: // Double cercle japonais
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="46" stroke={accent} strokeWidth="2" fill="none" />
              <Circle cx="50" cy="50" r="40" stroke={accent} strokeWidth="2" fill="none" />
              <Circle cx="50" cy="50" r="34" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 73: // Sakura (5 pétales)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <G fill={accent}>
                <Ellipse cx="50" cy="20" rx="12" ry="18" />
                <Ellipse cx="50" cy="20" rx="12" ry="18" transform="rotate(72 50 50)" />
                <Ellipse cx="50" cy="20" rx="12" ry="18" transform="rotate(144 50 50)" />
                <Ellipse cx="50" cy="20" rx="12" ry="18" transform="rotate(216 50 50)" />
                <Ellipse cx="50" cy="20" rx="12" ry="18" transform="rotate(288 50 50)" />
              </G>
              <Circle cx="50" cy="50" r="20" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.35, height: s*0.35, borderRadius: s*0.175 }} />
          </View>
        );

      case 74: // Tomoe (magatama)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Circle cx="50" cy="50" r="44" stroke={accent} strokeWidth="3" fill={bg} />
              <Circle cx="50" cy="32" r="8" fill={accent} />
              <Path d="M50 32 Q65 50 50 68 Q35 50 50 32" fill={accent} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.5, top: s*0.28, borderRadius: s*0.25 }} />
          </View>
        );

      case 75: // Kamon carré
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Rect x="8" y="8" width="84" height="84" rx="8" stroke={accent} strokeWidth="3" fill="none" />
              <Circle cx="50" cy="50" r="32" fill={bg} stroke={accent} strokeWidth="2" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.52, height: s*0.52, borderRadius: s*0.26 }} />
          </View>
        );

      case 76: // Kabuto (casque)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 3 L55 15 L50 12 L45 15 Z" fill={accent} />
              <Path d="M50 12 L78 22 L85 50 L80 75 Q75 92 50 95 Q25 92 20 75 L15 50 L22 22 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.55, top: s*0.25, borderRadius: 6 }} />
          </View>
        );

      case 77: // Shuriken
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,5 55,40 95,50 55,60 50,95 45,60 5,50 45,40" stroke={accent} strokeWidth="2" fill={bg} />
              <Circle cx="50" cy="50" r="15" fill={bg} stroke={accent} strokeWidth="2" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.28, height: s*0.28, borderRadius: s*0.14 }} />
          </View>
        );

      case 78: // Katana tsuba (garde)
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Ellipse cx="50" cy="50" rx="44" ry="38" stroke={accent} strokeWidth="3" fill={bg} />
              <Rect x="45" y="5" width="10" height="90" fill={bg} stroke={accent} strokeWidth="2" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.5, height: s*0.42, borderRadius: 6 }} />
          </View>
        );

      case 79: // Torii simplifié
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Rect x="10" y="10" width="80" height="8" rx="4" fill={accent} />
              <Rect x="5" y="18" width="90" height="5" rx="2" fill={accent} />
              <Rect x="15" y="23" width="8" height="72" fill={accent} />
              <Rect x="77" y="23" width="8" height="72" fill={accent} />
              <Rect x="23" y="45" width="54" height="5" fill={accent} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.38, top: s*0.52, borderRadius: 4 }} />
          </View>
        );

      case 80: // Daruma
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Ellipse cx="50" cy="55" rx="40" ry="42" stroke={accent} strokeWidth="3" fill={bg} />
              <Path d="M25 35 Q50 15 75 35" stroke={accent} strokeWidth="3" fill="none" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, top: s*0.25, borderRadius: s*0.275 }} />
          </View>
        );

      // ═══════════════════════════════════════
      // 81-100: FORMES MODERNES ET CRÉATIVES
      // ═══════════════════════════════════════
      case 81: // Blob 1
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 8 Q80 5 90 35 Q95 65 70 85 Q40 95 20 70 Q5 45 25 20 Q40 8 50 8" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 82: // Blob 2
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M45 8 Q75 5 88 30 Q98 55 80 80 Q55 98 30 85 Q8 70 10 45 Q12 20 45 8" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.52, height: s*0.52, borderRadius: s*0.26 }} />
          </View>
        );

      case 83: // Blob 3
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 Q85 15 92 50 Q85 85 50 92 Q15 85 8 50 Q15 15 50 5" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.58, height: s*0.58, borderRadius: s*0.29 }} />
          </View>
        );

      case 84: // Superellipse
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-10, height: s-10, borderRadius: (s-10)*0.42, borderWidth: 3, borderColor: accent, backgroundColor: bg, overflow: 'hidden' }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 85: // Arche
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M10 90 V40 Q10 10 50 10 Q90 10 90 40 V90 H70 V50 Q70 30 50 30 Q30 30 30 50 V90 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.35, height: s*0.4, top: s*0.35, borderRadius: 4 }} />
          </View>
        );

      case 86: // Demi-cercle haut
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M5 55 A45 45 0 1 1 95 55 H5" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.6, height: s*0.4, top: s*0.12, borderRadius: 6 }} />
          </View>
        );

      case 87: // Demi-cercle bas
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M5 45 A45 45 0 0 0 95 45 H5" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.6, height: s*0.4, top: s*0.42, borderRadius: 6 }} />
          </View>
        );

      case 88: // Feuille
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 5 Q95 30 90 70 Q80 95 50 95 Q20 95 10 70 Q5 30 50 5" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.52, height: s*0.58, top: s*0.18, borderRadius: s*0.15 }} />
          </View>
        );

      case 89: // Citron
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M50 8 Q92 25 92 50 Q92 75 50 92 Q8 75 8 50 Q8 25 50 8" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.55, borderRadius: s*0.275 }} />
          </View>
        );

      case 90: // Œil
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M5 50 Q50 10 95 50 Q50 90 5 50" stroke={accent} strokeWidth="3" fill={bg} />
              <Circle cx="50" cy="50" r="18" fill={accent} opacity="0.2" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.32, height: s*0.32, borderRadius: s*0.16 }} />
          </View>
        );

      case 91: // TV/Écran rétro
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Rect x="8" y="15" width="84" height="65" rx="15" stroke={accent} strokeWidth="3" fill={bg} />
              <Rect x="35" y="80" width="30" height="8" fill={accent} />
              <Rect x="25" y="88" width="50" height="5" rx="2" fill={accent} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.65, height: s*0.48, top: s*0.18, borderRadius: 8 }} />
          </View>
        );

      case 92: // Ticket
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M8 25 H92 V42 A8 8 0 0 0 92 58 V75 H8 V58 A8 8 0 0 0 8 42 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.65, height: s*0.38, borderRadius: 4 }} />
          </View>
        );

      case 93: // Bannière
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M15 10 H85 V75 L50 90 L15 75 Z" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.55, height: s*0.5, top: s*0.15, borderRadius: 4 }} />
          </View>
        );

      case 94: // Ruban
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M5 30 L20 35 V65 L5 70 V30 M95 30 L80 35 V65 L95 70 V30 M20 25 H80 V75 H20 Z" stroke={accent} strokeWidth="2" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.48, height: s*0.42, borderRadius: 4 }} />
          </View>
        );

      case 95: // Parchemin
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M20 15 Q10 15 10 25 V75 Q10 85 20 85 H80 Q90 85 90 75 V25 Q90 15 80 15 Q80 25 75 25 H25 Q20 25 20 15" stroke={accent} strokeWidth="2" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.58, height: s*0.5, top: s*0.28, borderRadius: 4 }} />
          </View>
        );

      case 96: // Polaroid
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-10, height: s-6, borderRadius: 4, borderWidth: 3, borderColor: accent, backgroundColor: bg, paddingTop: 5, paddingHorizontal: 5, paddingBottom: 18 }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%', borderRadius: 2 }} />
            </View>
          </View>
        );

      case 97: // App icon style
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-8, height: s-8, borderRadius: (s-8)*0.22, borderWidth: 0, backgroundColor: accent, padding: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 }}>
              <View style={{ flex: 1, borderRadius: (s-14)*0.2, backgroundColor: bg, overflow: 'hidden' }}>
                <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
              </View>
            </View>
          </View>
        );

      case 98: // Cadre photo
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: s-6, height: s-6, borderWidth: 6, borderColor: accent, backgroundColor: bg, padding: 4 }}>
              <Image source={{ uri: TEST_IMAGE }} style={{ width: '100%', height: '100%' }} />
            </View>
          </View>
        );

      case 99: // Infinity/Infini simplifié
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Path d="M30 50 Q30 30 50 30 Q70 30 70 50 Q70 70 50 70 Q30 70 30 50 M70 50 Q70 30 50 30" stroke={accent} strokeWidth="12" fill="none" strokeLinecap="round" />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.35, height: s*0.35, borderRadius: s*0.175 }} />
          </View>
        );

      case 100: // Diamant précieux
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={s} height={s} viewBox="0 0 100 100">
              <Polygon points="50,5 90,35 75,35 50,10 25,35 10,35" fill={accent} opacity="0.7" />
              <Polygon points="10,35 50,95 90,35 75,35 50,80 25,35" stroke={accent} strokeWidth="3" fill={bg} />
            </Svg>
            <Image source={{ uri: TEST_IMAGE }} style={{ position: 'absolute', width: s*0.45, height: s*0.4, top: s*0.35, borderRadius: 4 }} />
          </View>
        );

      default:
        return (
          <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center', backgroundColor: bg, borderRadius: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>#{id}</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>100 Formes</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Choisis ta forme préférée et dis-moi le numéro !
      </Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {Array.from({ length: 100 }, (_, i) => i + 1).map((id) => (
            <View key={id} style={styles.gridItem}>
              {renderShape(id, SHAPE_SIZE)}
              <View style={[styles.label, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.labelText, { color: colors.accent }]}>#{id}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 12, textAlign: 'center', paddingHorizontal: 20, marginBottom: 12 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { alignItems: 'center', marginBottom: 16 },
  label: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  labelText: { fontSize: 11, fontWeight: '700' },
});
