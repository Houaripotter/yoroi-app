// ============================================
// YOROI : cadres photo (formes, accessoires, bordures)
// L'ecran de choix est abandonne (decision de Houari) : la route redirige vers Ton espace.
// Les formes et outils restent exportes ici car components/FramedProfilePhoto.tsx les utilise.
// ============================================

import React from 'react';
import { Redirect } from 'expo-router';
import Svg, { Path, Circle, Rect, Polygon, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

export const FRAME_SHAPE_CHANGED_EVENT = 'FRAME_SHAPE_CHANGED';
export const FRAME_ACCESSORY_CHANGED_EVENT = 'FRAME_ACCESSORY_CHANGED';

export const FRAME_STORAGE_KEY = '@yoroi_frame_shape';
export const ACCESSORY_STORAGE_KEY = '@yoroi_frame_accessory';
export const ACCESSORY_2_STORAGE_KEY = '@yoroi_frame_accessory_2';
export const BORDER_COLOR_STORAGE_KEY = '@yoroi_frame_border_color';
export const BORDER_THICKNESS_STORAGE_KEY = '@yoroi_frame_border_thickness';
export const BORDER_EFFECT_STORAGE_KEY = '@yoroi_frame_border_effect';
export const ACCESSORY_2_CHANGED_EVENT = 'FRAME_ACCESSORY_2_CHANGED';
export const BORDER_COLOR_CHANGED_EVENT = 'FRAME_BORDER_COLOR_CHANGED';
export const BORDER_THICKNESS_CHANGED_EVENT = 'FRAME_BORDER_THICKNESS_CHANGED';
export const BORDER_EFFECT_CHANGED_EVENT = 'FRAME_BORDER_EFFECT_CHANGED';

export type BorderEffect = 'none' | 'gold' | 'neon';

// 30 formes - toutes avec assez d'aire pour une photo
export type FrameShape =
  | 'circle'
  | 'rounded-square'
  | 'squircle'
  | 'hexagon'
  | 'octagon'
  | 'diamond'
  | 'shield'
  | 'star'
  | 'heart'
  | 'drop'
  | 'arch'
  | 'pentagon'
  | 'ovale'
  | 'plaque'
  | 'tonneau'
  | 'capsule'
  | 'coquille'
  | 'medaillon'
  | 'sceau'
  | 'ticket'
  | 'stade'
  | 'nuage'
  | 'tv-retro'
  | 'clover'
  | 'soft-diamond'
  | 'egg'
  | 'wide-barrel'
  | 'leaf-wide'
  | 'nonagon'
  | 'super-ellipse'
  | 'star-6'
  | 'sakura-bloom'
  | 'speech-bubble'
  | 'burst'
  | 'scroll';

// Accessoires decoratifs (rendus par-dessus la bordure, style badge notification)
export type FrameAccessory =
  | 'none'
  | 'flower'
  | 'bow'
  | 'crown'
  | 'halo'
  | 'mini-star'
  | 'mini-heart'
  | 'lightning'
  | 'wings'
  | 'horns'
  | 'laurel'
  | 'sakura'
  | 'fire'
  | 'moon-star'
  | 'katana'
  | 'ice'
  | 'dragon'
  | 'sun';

interface FrameOption {
  id: FrameShape;
  name: string;
}

interface AccessoryOption {
  id: FrameAccessory;
  name: string;
}

const FRAME_OPTIONS: FrameOption[] = [
  { id: 'circle', name: 'Cercle' },
  { id: 'rounded-square', name: 'Carre arrondi' },
  { id: 'squircle', name: 'Squircle' },
  { id: 'hexagon', name: 'Hexagone' },
  { id: 'octagon', name: 'Octogone' },
  { id: 'diamond', name: 'Diamant' },
  { id: 'shield', name: 'Bouclier' },
  { id: 'star', name: 'Etoile' },
  { id: 'heart', name: 'Coeur' },
  { id: 'drop', name: 'Goutte' },
  { id: 'arch', name: 'Arche' },
  { id: 'pentagon', name: 'Pentagone' },
  { id: 'ovale', name: 'Ovale' },
  { id: 'plaque', name: 'Plaque' },
  { id: 'tonneau', name: 'Tonneau' },
  { id: 'capsule', name: 'Capsule' },
  { id: 'coquille', name: 'Coquille' },
  { id: 'medaillon', name: 'Medaillon' },
  { id: 'sceau', name: 'Sceau' },
  { id: 'ticket', name: 'Ticket' },
  { id: 'stade', name: 'Stade' },
  { id: 'nuage', name: 'Nuage' },
  { id: 'tv-retro', name: 'TV Retro' },
  { id: 'clover', name: 'Trefle' },
  { id: 'soft-diamond', name: 'Coussin' },
  { id: 'egg', name: 'Oeuf' },
  { id: 'wide-barrel', name: 'Barrique' },
  { id: 'leaf-wide', name: 'Feuille' },
  { id: 'nonagon', name: 'Nonagone' },
  { id: 'super-ellipse', name: 'Super Ellipse' },
  { id: 'star-6', name: 'Etoile 6' },
  { id: 'sakura-bloom', name: 'Sakura' },
  { id: 'speech-bubble', name: 'Bulle' },
  { id: 'burst', name: 'Explosion' },
  { id: 'scroll', name: 'Parchemin' },
];

const ACCESSORY_OPTIONS: AccessoryOption[] = [
  { id: 'none', name: traduire('Aucun') },
  { id: 'flower', name: 'Fleur' },
  { id: 'bow', name: 'Noeud' },
  { id: 'crown', name: 'Couronne' },
  { id: 'halo', name: 'Aureole' },
  { id: 'mini-star', name: 'Etoile' },
  { id: 'mini-heart', name: 'Coeur' },
  { id: 'lightning', name: 'Eclair' },
  { id: 'wings', name: 'Ailes' },
  { id: 'horns', name: 'Cornes' },
  { id: 'laurel', name: 'Laurier' },
  { id: 'sakura', name: 'Sakura' },
  { id: 'fire', name: 'Flammes' },
  { id: 'moon-star', name: 'Lune' },
  { id: 'katana', name: 'Katana' },
  { id: 'ice', name: 'Cristaux' },
  { id: 'dragon', name: 'Dragon' },
  { id: 'sun', name: 'Soleil' },
];

// ============================================
// ACCESSORY SVG RENDERER
// Gros ornements decoratifs EXTERIEURS au cadre
// Positionnes sur le bord comme un noeud cadeau
// ============================================
export function renderAccessorySvg(
  accessory: FrameAccessory,
  frameSize: number,
  accentColor: string,
): React.ReactNode {
  if (accessory === 'none') return null;

  // Taille de l'accessoire
  const frameScale = frameSize * 0.38;

  // Position par defaut : bord droit en haut (pour fleur, noeud, etoile, coeur, eclair)
  const cx = frameSize - frameScale * 0.15;
  const cy = frameSize * 0.18;

  // Position CENTRE HAUT (pour couronne et aureole - au-dessus de la tete)
  const topCx = frameSize / 2;
  const topCy = -frameScale * 0.15;

  switch (accessory) {
    case 'flower': {
      // Grosse fleur 5 petales sur le bord droit
      const petalR = frameScale * 0.24;
      const petalDist = frameScale * 0.28;
      const centerR = frameScale * 0.15;
      return (
        <G>
          <Circle cx={cx + 1} cy={cy + 1.5} r={frameScale * 0.45} fill="rgba(0,0,0,0.12)" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
            return (
              <Circle
                key={i}
                cx={cx + petalDist * Math.cos(a)}
                cy={cy + petalDist * Math.sin(a)}
                r={petalR}
                fill={accentColor}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            );
          })}
          <Circle cx={cx} cy={cy} r={centerR} fill="#FFD700" stroke="#FFFFFF" strokeWidth={1} />
        </G>
      );
    }

    case 'bow': {
      // Gros noeud papillon cadeau - bord droit
      const w = frameScale * 0.48;
      const h = frameScale * 0.32;
      return (
        <G>
          <Path
            d={`M ${cx + 1} ${cy + 1.5}
                C ${cx - w + 1} ${cy - h * 1.4 + 1.5}, ${cx - w * 1.1 + 1} ${cy + h * 1.4 + 1.5}, ${cx + 1} ${cy + 1.5}
                C ${cx + w + 1} ${cy - h * 1.4 + 1.5}, ${cx + w * 1.1 + 1} ${cy + h * 1.4 + 1.5}, ${cx + 1} ${cy + 1.5} Z`}
            fill="rgba(0,0,0,0.12)"
          />
          <Path
            d={`M ${cx} ${cy}
                C ${cx - w} ${cy - h * 1.4}, ${cx - w * 1.1} ${cy + h * 1.4}, ${cx} ${cy} Z`}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Path
            d={`M ${cx} ${cy}
                C ${cx + w} ${cy - h * 1.4}, ${cx + w * 1.1} ${cy + h * 1.4}, ${cx} ${cy} Z`}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Path
            d={`M ${cx - frameScale * 0.08} ${cy + frameScale * 0.05}
                L ${cx - frameScale * 0.18} ${cy + frameScale * 0.35}
                L ${cx - frameScale * 0.06} ${cy + frameScale * 0.25}
                L ${cx + frameScale * 0.06} ${cy + frameScale * 0.25}
                L ${cx + frameScale * 0.18} ${cy + frameScale * 0.35}
                L ${cx + frameScale * 0.08} ${cy + frameScale * 0.05} Z`}
            fill={accentColor}
            stroke="#FFFFFF"
            strokeWidth={1}
          />
          <Circle cx={cx} cy={cy} r={frameScale * 0.08} fill="#FFFFFF" />
        </G>
      );
    }

    case 'crown': {
      // Couronne doree CENTREE EN HAUT - au dessus de la tete
      const crownW = frameSize * 0.28;
      const crownH = frameSize * 0.18;
      const crCx = topCx;
      const crBase = topCy + crownH * 0.65;
      const crTop = topCy - crownH * 0.35;
      return (
        <G>
          {/* Ombre */}
          <Path
            d={`M ${crCx - crownW} ${crBase + 2}
                L ${crCx - crownW} ${crTop + crownH * 0.3 + 2}
                L ${crCx - crownW * 0.5} ${crTop + crownH * 0.6 + 2}
                L ${crCx} ${crTop + 2}
                L ${crCx + crownW * 0.5} ${crTop + crownH * 0.6 + 2}
                L ${crCx + crownW} ${crTop + crownH * 0.3 + 2}
                L ${crCx + crownW} ${crBase + 2} Z`}
            fill="rgba(0,0,0,0.1)"
          />
          {/* Corps */}
          <Path
            d={`M ${crCx - crownW} ${crBase}
                L ${crCx - crownW} ${crTop + crownH * 0.3}
                L ${crCx - crownW * 0.5} ${crTop + crownH * 0.6}
                L ${crCx} ${crTop}
                L ${crCx + crownW * 0.5} ${crTop + crownH * 0.6}
                L ${crCx + crownW} ${crTop + crownH * 0.3}
                L ${crCx + crownW} ${crBase}
                Z`}
            fill="#FFD700"
            stroke="#FFFFFF"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Bande base */}
          <Rect
            x={crCx - crownW}
            y={crBase - crownH * 0.12}
            width={crownW * 2}
            height={crownH * 0.2}
            rx={2}
            fill="#DAA520"
            stroke="#FFFFFF"
            strokeWidth={1}
          />
          {/* Gemmes */}
          <Circle cx={crCx} cy={crTop + crownH * 0.1} r={frameSize * 0.025} fill={accentColor} stroke="#FFFFFF" strokeWidth={1} />
          <Circle cx={crCx - crownW * 0.5} cy={crTop + crownH * 0.5} r={frameSize * 0.02} fill={accentColor} stroke="#FFFFFF" strokeWidth={0.8} />
          <Circle cx={crCx + crownW * 0.5} cy={crTop + crownH * 0.5} r={frameSize * 0.02} fill={accentColor} stroke="#FFFFFF" strokeWidth={0.8} />
        </G>
      );
    }

    case 'halo': {
      // Aureole CENTREE EN HAUT - anneau complet dore brillant
      const haloW = frameSize * 0.4;
      const haloH = frameSize * 0.13;
      const haloCx = topCx;
      const haloCy = topCy + frameSize * 0.01;
      const haloColor = '#FFD700';
      const haloGlow = '#FFF176';
      const sw = frameSize * 0.052; // epaisseur du trait
      // Ellipse complete : deux demi-arcs (sweep=1 = clockwise)
      const ellipse = `M ${haloCx + haloW} ${haloCy} A ${haloW} ${haloH} 0 1 1 ${haloCx - haloW} ${haloCy} A ${haloW} ${haloH} 0 1 1 ${haloCx + haloW} ${haloCy}`;
      // Ombre decalee
      const ellipseShadow = `M ${haloCx + haloW} ${haloCy + 3} A ${haloW} ${haloH} 0 1 1 ${haloCx - haloW} ${haloCy + 3} A ${haloW} ${haloH} 0 1 1 ${haloCx + haloW} ${haloCy + 3}`;
      // Reflet brillant sur la partie superieure
      const shine = `M ${haloCx - haloW * 0.5} ${haloCy - haloH * 0.55} A ${haloW * 0.5} ${haloH * 0.85} 0 0 1 ${haloCx + haloW * 0.5} ${haloCy - haloH * 0.55}`;
      return (
        <G>
          {/* Ombre */}
          <Path d={ellipseShadow} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={sw + 3} />
          {/* Lueur externe large */}
          <Path d={ellipse} fill="none" stroke={haloGlow} strokeWidth={sw * 2.4} opacity={0.3} />
          {/* Lueur intermédiaire */}
          <Path d={ellipse} fill="none" stroke={haloColor} strokeWidth={sw * 1.5} opacity={0.45} />
          {/* Corps or principal */}
          <Path d={ellipse} fill="none" stroke={haloColor} strokeWidth={sw} />
          {/* Bordure interieure lumineuse */}
          <Path d={ellipse} fill="none" stroke="#FFF9C4" strokeWidth={sw * 0.38} opacity={0.7} />
          {/* Reflet blanc sur le dessus */}
          <Path d={shine} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={sw * 0.28} strokeLinecap="round" />
        </G>
      );
    }

    case 'mini-star': {
      // Grosse etoile brillante - bord droit
      const outerR = frameScale * 0.4;
      const innerR = outerR * 0.42;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const rad = i % 2 === 0 ? outerR : innerR;
        const a = (Math.PI / 5) * i - Math.PI / 2;
        return `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
      }).join(' ');
      return (
        <G>
          <Polygon
            points={Array.from({ length: 10 }, (_, i) => {
              const rad = i % 2 === 0 ? outerR : innerR;
              const a = (Math.PI / 5) * i - Math.PI / 2;
              return `${cx + 1 + rad * Math.cos(a)},${cy + 1.5 + rad * Math.sin(a)}`;
            }).join(' ')}
            fill="rgba(0,0,0,0.12)"
          />
          <Polygon
            points={pts}
            fill="#FFD700"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <Circle cx={cx - outerR * 0.15} cy={cy - outerR * 0.2} r={frameScale * 0.04} fill="rgba(255,255,255,0.6)" />
        </G>
      );
    }

    case 'mini-heart': {
      // Gros coeur - bord droit
      const hs = frameScale * 0.45;
      return (
        <G>
          <Path
            d={`M ${cx + 1} ${cy + hs * 0.85 + 1.5}
                C ${cx - hs * 0.9 + 1} ${cy + hs * 0.3 + 1.5}, ${cx - hs + 1} ${cy - hs * 0.3 + 1.5}, ${cx - hs + 1} ${cy - hs * 0.45 + 1.5}
                C ${cx - hs + 1} ${cy - hs * 0.85 + 1.5}, ${cx - hs * 0.3 + 1} ${cy - hs * 0.9 + 1.5}, ${cx + 1} ${cy - hs * 0.35 + 1.5}
                C ${cx + hs * 0.3 + 1} ${cy - hs * 0.9 + 1.5}, ${cx + hs + 1} ${cy - hs * 0.85 + 1.5}, ${cx + hs + 1} ${cy - hs * 0.45 + 1.5}
                C ${cx + hs + 1} ${cy - hs * 0.3 + 1.5}, ${cx + hs * 0.9 + 1} ${cy + hs * 0.3 + 1.5}, ${cx + 1} ${cy + hs * 0.85 + 1.5} Z`}
            fill="rgba(0,0,0,0.12)"
          />
          <Path
            d={`M ${cx} ${cy + hs * 0.85}
                C ${cx - hs * 0.9} ${cy + hs * 0.3}, ${cx - hs} ${cy - hs * 0.3}, ${cx - hs} ${cy - hs * 0.45}
                C ${cx - hs} ${cy - hs * 0.85}, ${cx - hs * 0.3} ${cy - hs * 0.9}, ${cx} ${cy - hs * 0.35}
                C ${cx + hs * 0.3} ${cy - hs * 0.9}, ${cx + hs} ${cy - hs * 0.85}, ${cx + hs} ${cy - hs * 0.45}
                C ${cx + hs} ${cy - hs * 0.3}, ${cx + hs * 0.9} ${cy + hs * 0.3}, ${cx} ${cy + hs * 0.85} Z`}
            fill="#FF4466"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
          <Circle cx={cx - hs * 0.3} cy={cy - hs * 0.45} r={frameScale * 0.05} fill="rgba(255,255,255,0.4)" />
        </G>
      );
    }

    case 'lightning': {
      // Eclair dans un cercle - bord droit
      const er = frameScale * 0.32;
      return (
        <G>
          <Circle cx={cx + 1} cy={cy + 1.5} r={er + 2} fill="rgba(0,0,0,0.12)" />
          <Circle cx={cx} cy={cy} r={er + 2} fill={accentColor} stroke="#FFFFFF" strokeWidth={1.5} />
          <Path
            d={`M ${cx + er * 0.15} ${cy - er * 0.8}
                L ${cx - er * 0.3} ${cy + er * 0.05}
                L ${cx + er * 0.05} ${cy + er * 0.05}
                L ${cx - er * 0.15} ${cy + er * 0.8}
                L ${cx + er * 0.3} ${cy - er * 0.05}
                L ${cx - er * 0.05} ${cy - er * 0.05}
                Z`}
            fill="#FFD700"
            stroke="#FFFFFF"
            strokeWidth={0.8}
          />
        </G>
      );
    }

    case 'wings': {
      // Ailes de chaque COTE du cadre - gauche et droite
      const wCy = frameSize * 0.6;   // position verticale (milieu-bas)
      const wH = frameSize * 0.3;    // hauteur de l'aile
      const wW = frameSize * 0.55;   // extension laterale

      // Aile GAUCHE - s'etend vers la gauche depuis le bord gauche
      const lCx = 0;
      const lOuter = `M ${lCx} ${wCy}
        C ${lCx - wW * 0.3} ${wCy - wH * 0.15},
          ${lCx - wW * 0.82} ${wCy - wH * 0.62},
          ${lCx - wW} ${wCy - wH * 0.88}
        C ${lCx - wW * 1.04} ${wCy - wH},
          ${lCx - wW * 0.86} ${wCy - wH * 0.98},
          ${lCx - wW * 0.7} ${wCy - wH * 0.82}
        C ${lCx - wW * 0.45} ${wCy - wH * 0.52},
          ${lCx - frameSize * 0.1} ${wCy - wH * 0.2},
          ${lCx} ${wCy} Z`;
      const lVein = `M ${lCx - frameSize * 0.04} ${wCy - wH * 0.1}
        C ${lCx - wW * 0.38} ${wCy - wH * 0.38},
          ${lCx - wW * 0.72} ${wCy - wH * 0.62},
          ${lCx - wW * 0.9} ${wCy - wH * 0.8}`;
      const lVein2 = `M ${lCx - frameSize * 0.05} ${wCy - wH * 0.05}
        C ${lCx - wW * 0.2} ${wCy - wH * 0.22},
          ${lCx - wW * 0.44} ${wCy - wH * 0.36},
          ${lCx - wW * 0.57} ${wCy - wH * 0.54}`;

      // Aile DROITE - miroir de la gauche
      const rCx = frameSize;
      const rOuter = `M ${rCx} ${wCy}
        C ${rCx + wW * 0.3} ${wCy - wH * 0.15},
          ${rCx + wW * 0.82} ${wCy - wH * 0.62},
          ${rCx + wW} ${wCy - wH * 0.88}
        C ${rCx + wW * 1.04} ${wCy - wH},
          ${rCx + wW * 0.86} ${wCy - wH * 0.98},
          ${rCx + wW * 0.7} ${wCy - wH * 0.82}
        C ${rCx + wW * 0.45} ${wCy - wH * 0.52},
          ${rCx + frameSize * 0.1} ${wCy - wH * 0.2},
          ${rCx} ${wCy} Z`;
      const rVein = `M ${rCx + frameSize * 0.04} ${wCy - wH * 0.1}
        C ${rCx + wW * 0.38} ${wCy - wH * 0.38},
          ${rCx + wW * 0.72} ${wCy - wH * 0.62},
          ${rCx + wW * 0.9} ${wCy - wH * 0.8}`;
      const rVein2 = `M ${rCx + frameSize * 0.05} ${wCy - wH * 0.05}
        C ${rCx + wW * 0.2} ${wCy - wH * 0.22},
          ${rCx + wW * 0.44} ${wCy - wH * 0.36},
          ${rCx + wW * 0.57} ${wCy - wH * 0.54}`;
      return (
        <G>
          {/* Ombres */}
          <Path d={lOuter} fill="rgba(0,0,0,0.1)" transform="translate(-2,3)" />
          <Path d={rOuter} fill="rgba(0,0,0,0.1)" transform="translate(2,3)" />
          {/* Ailes - blanc nacre */}
          <Path d={lOuter} fill="rgba(255,255,255,0.97)" stroke="rgba(180,200,255,0.6)" strokeWidth={1.2} />
          <Path d={rOuter} fill="rgba(255,255,255,0.97)" stroke="rgba(180,200,255,0.6)" strokeWidth={1.2} />
          {/* Nervures */}
          <Path d={lVein} fill="none" stroke="rgba(160,180,240,0.55)" strokeWidth={1.8} strokeLinecap="round" />
          <Path d={lVein2} fill="none" stroke="rgba(160,180,240,0.4)" strokeWidth={1.2} strokeLinecap="round" />
          <Path d={rVein} fill="none" stroke="rgba(160,180,240,0.55)" strokeWidth={1.8} strokeLinecap="round" />
          <Path d={rVein2} fill="none" stroke="rgba(160,180,240,0.4)" strokeWidth={1.2} strokeLinecap="round" />
          {/* Lueur */}
          <Path d={lOuter} fill="none" stroke="rgba(200,220,255,0.35)" strokeWidth={3} />
          <Path d={rOuter} fill="none" stroke="rgba(200,220,255,0.35)" strokeWidth={3} />
        </G>
      );
    }

    case 'horns': {
      // Cornes de demon rouges - centrees en haut
      const hCx = frameSize / 2;
      const hCy = topCy + frameSize * 0.04;
      const hornSpread = frameSize * 0.18;
      const hornH = frameSize * 0.22;
      const hornW = frameSize * 0.09;
      // Corne gauche - courbe vers l'interieur en pointe
      const lHorn = `M ${hCx - hornSpread - hornW * 0.5} ${hCy + hornH * 0.25}
        C ${hCx - hornSpread - hornW * 0.6} ${hCy - hornH * 0.15},
          ${hCx - hornSpread + hornW * 0.1} ${hCy - hornH * 0.75},
          ${hCx - hornSpread + hornW * 0.45} ${hCy - hornH}
        C ${hCx - hornSpread + hornW * 0.6} ${hCy - hornH * 0.75},
          ${hCx - hornSpread + hornW * 0.5} ${hCy - hornH * 0.1},
          ${hCx - hornSpread + hornW * 0.7} ${hCy + hornH * 0.25} Z`;
      // Corne droite (miroir)
      const rHorn = `M ${hCx + hornSpread + hornW * 0.5} ${hCy + hornH * 0.25}
        C ${hCx + hornSpread + hornW * 0.6} ${hCy - hornH * 0.15},
          ${hCx + hornSpread - hornW * 0.1} ${hCy - hornH * 0.75},
          ${hCx + hornSpread - hornW * 0.45} ${hCy - hornH}
        C ${hCx + hornSpread - hornW * 0.6} ${hCy - hornH * 0.75},
          ${hCx + hornSpread - hornW * 0.5} ${hCy - hornH * 0.1},
          ${hCx + hornSpread - hornW * 0.7} ${hCy + hornH * 0.25} Z`;
      return (
        <G>
          {/* Ombres */}
          <Path d={lHorn} fill="rgba(0,0,0,0.15)" transform="translate(2,2)" />
          <Path d={rHorn} fill="rgba(0,0,0,0.15)" transform="translate(-2,2)" />
          {/* Corps des cornes - degradé rouge sombre */}
          <Path d={lHorn} fill="#C0392B" stroke="#8B0000" strokeWidth={1} strokeLinejoin="round" />
          <Path d={rHorn} fill="#C0392B" stroke="#8B0000" strokeWidth={1} strokeLinejoin="round" />
          {/* Reflet lateral gauche */}
          <Path
            d={`M ${hCx - hornSpread - hornW * 0.3} ${hCy + hornH * 0.15}
              C ${hCx - hornSpread - hornW * 0.35} ${hCy - hornH * 0.1},
                ${hCx - hornSpread + hornW * 0.05} ${hCy - hornH * 0.55},
                ${hCx - hornSpread + hornW * 0.38} ${hCy - hornH * 0.88}`}
            fill="none" stroke="rgba(255,100,80,0.55)" strokeWidth={2.5} strokeLinecap="round"
          />
          {/* Reflet lateral droit */}
          <Path
            d={`M ${hCx + hornSpread + hornW * 0.3} ${hCy + hornH * 0.15}
              C ${hCx + hornSpread + hornW * 0.35} ${hCy - hornH * 0.1},
                ${hCx + hornSpread - hornW * 0.05} ${hCy - hornH * 0.55},
                ${hCx + hornSpread - hornW * 0.38} ${hCy - hornH * 0.88}`}
            fill="none" stroke="rgba(255,100,80,0.55)" strokeWidth={2.5} strokeLinecap="round"
          />
        </G>
      );
    }

    case 'laurel': {
      // Couronne de laurier doree - centree en haut
      const lCx = frameSize / 2;
      const lCy = topCy + frameSize * 0.06;
      const branchW = frameSize * 0.36;
      const branchH = frameSize * 0.22;
      const leafColor = '#4CAF50';
      const leafDark = '#2E7D32';
      const goldColor = '#FFD700';
      // Genere une feuille de laurier ovale orientee
      const makeLeaf = (cx: number, cy: number, angle: number, size: number) => {
        const lw = size * 0.11;
        const lh = size * 0.22;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const tip = { x: cx + lh * cos, y: cy + lh * sin };
        const base = { x: cx - lh * 0.4 * cos, y: cy - lh * 0.4 * sin };
        const ctrl1 = { x: cx + lw * -sin + lh * 0.4 * cos, y: cy + lw * cos + lh * 0.4 * sin };
        const ctrl2 = { x: cx - lw * -sin + lh * 0.4 * cos, y: cy - lw * cos + lh * 0.4 * sin };
        return `M ${base.x} ${base.y} C ${ctrl1.x} ${ctrl1.y}, ${tip.x} ${tip.y}, ${tip.x} ${tip.y} C ${tip.x} ${tip.y}, ${ctrl2.x} ${ctrl2.y}, ${base.x} ${base.y} Z`;
      };
      // 6 feuilles de chaque cote en arc
      const leaves: React.ReactNode[] = [];
      const leafCount = 6;
      for (let i = 0; i < leafCount; i++) {
        const t = i / (leafCount - 1);
        // Cote gauche - arc de haut en bas a gauche
        const lx = lCx - branchW * (0.3 + t * 0.7);
        const ly = lCy + branchH * (-0.5 + t * 0.9);
        const leafAngle = Math.PI * 0.85 + t * Math.PI * 0.45;
        const lSize = frameSize * (0.9 + i * 0.05);
        // Cote droit - miroir
        const rx = lCx + branchW * (0.3 + t * 0.7);
        const ry = ly;
        const rLeafAngle = Math.PI * 0.15 - t * Math.PI * 0.45;
        leaves.push(
          <Path key={`ll${i}`} d={makeLeaf(lx, ly, leafAngle, lSize)} fill={i % 2 === 0 ? leafColor : leafDark} stroke={leafDark} strokeWidth={0.5} />,
          <Path key={`rl${i}`} d={makeLeaf(rx, ry, rLeafAngle, lSize)} fill={i % 2 === 0 ? leafColor : leafDark} stroke={leafDark} strokeWidth={0.5} />,
        );
      }
      return (
        <G>
          {leaves}
          {/* Ruban dore au centre */}
          <Path
            d={`M ${lCx - frameSize * 0.12} ${lCy + branchH * 0.4}
              Q ${lCx} ${lCy + branchH * 0.28}, ${lCx + frameSize * 0.12} ${lCy + branchH * 0.4}`}
            fill="none" stroke={goldColor} strokeWidth={frameSize * 0.035} strokeLinecap="round"
          />
          {/* Point central or */}
          <Circle cx={lCx} cy={lCy + branchH * 0.28} r={frameSize * 0.035} fill={goldColor} stroke="#FFF" strokeWidth={1} />
        </G>
      );
    }

    case 'sakura': {
      // Fleurs de cerisier roses - bord droit en haut
      const skColor = '#F48FB1';
      const skDark = '#E91E63';
      const skCenter = '#FFEB3B';
      // 3 fleurs a 5 petales disposees en grappe
      const flowers = [
        { cx: cx - frameScale * 0.05, cy: cy - frameScale * 0.08, r: frameScale * 0.22 },
        { cx: cx + frameScale * 0.2, cy: cy + frameScale * 0.2, r: frameScale * 0.18 },
        { cx: cx - frameScale * 0.18, cy: cy + frameScale * 0.22, r: frameScale * 0.16 },
      ];
      const petals: React.ReactNode[] = [];
      flowers.forEach((f, fi) => {
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
          petals.push(
            <Path
              key={`p${fi}_${i}`}
              d={`M ${f.cx} ${f.cy}
                C ${f.cx + f.r * 0.6 * Math.cos(a - 0.5)} ${f.cy + f.r * 0.6 * Math.sin(a - 0.5)},
                  ${f.cx + f.r * 1.05 * Math.cos(a - 0.2)} ${f.cy + f.r * 1.05 * Math.sin(a - 0.2)},
                  ${f.cx + f.r * Math.cos(a)} ${f.cy + f.r * Math.sin(a)}
                C ${f.cx + f.r * 1.05 * Math.cos(a + 0.2)} ${f.cy + f.r * 1.05 * Math.sin(a + 0.2)},
                  ${f.cx + f.r * 0.6 * Math.cos(a + 0.5)} ${f.cy + f.r * 0.6 * Math.sin(a + 0.5)},
                  ${f.cx} ${f.cy} Z`}
              fill={fi === 1 ? '#FCE4EC' : skColor}
              stroke={skDark}
              strokeWidth={0.7}
              opacity={0.95}
            />
          );
        }
        petals.push(
          <Circle key={`c${fi}`} cx={f.cx} cy={f.cy} r={f.r * 0.2} fill={skCenter} stroke="#F9A825" strokeWidth={0.5} />
        );
      });
      return (
        <G>
          {/* Ombre globale */}
          <Circle cx={cx + 1.5} cy={cy + 2} r={frameScale * 0.48} fill="rgba(0,0,0,0.08)" />
          {petals}
        </G>
      );
    }

    case 'fire': {
      // Flammes qui s'elevent depuis en dessous du cadre
      const fCx = frameSize / 2;
      const fCy = frameSize * 1.38;
      const fH = frameSize * 0.42;
      const fW = frameSize * 0.55;
      // Flamme principale (orange vif)
      const mainFlame = `M ${fCx - fW * 0.5} ${fCy}
        C ${fCx - fW * 0.6} ${fCy - fH * 0.3},
          ${fCx - fW * 0.35} ${fCy - fH * 0.5},
          ${fCx} ${fCy - fH}
        C ${fCx + fW * 0.35} ${fCy - fH * 0.5},
          ${fCx + fW * 0.6} ${fCy - fH * 0.3},
          ${fCx + fW * 0.5} ${fCy} Z`;
      // Flamme gauche (rouge)
      const lFlame = `M ${fCx - fW * 0.42} ${fCy}
        C ${fCx - fW * 0.62} ${fCy - fH * 0.25},
          ${fCx - fW * 0.55} ${fCy - fH * 0.55},
          ${fCx - fW * 0.28} ${fCy - fH * 0.72}
        C ${fCx - fW * 0.12} ${fCy - fH * 0.48},
          ${fCx - fW * 0.18} ${fCy - fH * 0.22},
          ${fCx - fW * 0.12} ${fCy} Z`;
      // Flamme droite (rouge)
      const rFlame = `M ${fCx + fW * 0.42} ${fCy}
        C ${fCx + fW * 0.62} ${fCy - fH * 0.25},
          ${fCx + fW * 0.55} ${fCy - fH * 0.55},
          ${fCx + fW * 0.28} ${fCy - fH * 0.72}
        C ${fCx + fW * 0.12} ${fCy - fH * 0.48},
          ${fCx + fW * 0.18} ${fCy - fH * 0.22},
          ${fCx + fW * 0.12} ${fCy} Z`;
      // Coeur jaune de la flamme
      const innerFlame = `M ${fCx - fW * 0.25} ${fCy}
        C ${fCx - fW * 0.3} ${fCy - fH * 0.28},
          ${fCx - fW * 0.15} ${fCy - fH * 0.55},
          ${fCx} ${fCy - fH * 0.75}
        C ${fCx + fW * 0.15} ${fCy - fH * 0.55},
          ${fCx + fW * 0.3} ${fCy - fH * 0.28},
          ${fCx + fW * 0.25} ${fCy} Z`;
      // Centre blanc-jaune (tres chaud)
      const coreFlame = `M ${fCx - fW * 0.1} ${fCy}
        C ${fCx - fW * 0.12} ${fCy - fH * 0.22},
          ${fCx - fW * 0.05} ${fCy - fH * 0.42},
          ${fCx} ${fCy - fH * 0.52}
        C ${fCx + fW * 0.05} ${fCy - fH * 0.42},
          ${fCx + fW * 0.12} ${fCy - fH * 0.22},
          ${fCx + fW * 0.1} ${fCy} Z`;
      return (
        <G>
          {/* Lueur chaude en bas */}
          <Path d={mainFlame} fill="rgba(255,80,0,0.18)" transform="translate(0,4) scale(1.05)" />
          {/* Flammes exterieures rouges */}
          <Path d={lFlame} fill="#EF5350" />
          <Path d={rFlame} fill="#EF5350" />
          {/* Flamme principale orange */}
          <Path d={mainFlame} fill="#FF6F00" />
          {/* Coeur jaune-orange */}
          <Path d={innerFlame} fill="#FFAB00" />
          {/* Centre chaud jaune clair */}
          <Path d={coreFlame} fill="#FFE57F" />
          {/* Etincelles */}
          <Circle cx={fCx - fW * 0.22} cy={fCy - fH * 0.85} r={frameSize * 0.018} fill="#FFEE58" opacity={0.9} />
          <Circle cx={fCx + fW * 0.18} cy={fCy - fH * 0.92} r={frameSize * 0.013} fill="#FFEE58" opacity={0.8} />
          <Circle cx={fCx - fW * 0.05} cy={fCy - fH * 1.0} r={frameSize * 0.012} fill="#FFFFFF" opacity={0.85} />
        </G>
      );
    }

    case 'moon-star': {
      // Croissant de lune argente + etoile - bord droit haut
      const mR = frameScale * 0.38;
      const mColor = '#E8EAF6';
      const mStroke = '#9FA8DA';
      // Croissant : grand cercle moins petit cercle decale
      const mOuter = `M ${cx + mR} ${cy} A ${mR} ${mR} 0 1 1 ${cx + mR * 0.1} ${cy - mR * 0.98} A ${mR * 0.75} ${mR * 0.75} 0 1 0 ${cx + mR} ${cy} Z`;
      // Petite etoile a 5 branches en haut a droite du croissant
      const stCx = cx + mR * 0.55;
      const stCy = cy - mR * 1.15;
      const stOr = mR * 0.22;
      const stIr = stOr * 0.4;
      const stPts = Array.from({length:10},(_,i)=>{const r=i%2===0?stOr:stIr;const a=(Math.PI/5)*i-Math.PI/2;return `${stCx+r*Math.cos(a)},${stCy+r*Math.sin(a)}`;}).join(' ');
      return (
        <G>
          <Path d={mOuter} fill="rgba(0,0,0,0.12)" transform="translate(2,2)" />
          <Path d={mOuter} fill={mColor} stroke={mStroke} strokeWidth={1.5} />
          {/* Reflet sur le croissant */}
          <Path d={`M ${cx + mR * 0.6} ${cy - mR * 0.15} A ${mR * 0.35} ${mR * 0.35} 0 0 1 ${cx + mR * 0.55} ${cy + mR * 0.35}`} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5} strokeLinecap="round" />
          {/* Ombre etoile */}
          <Polygon points={Array.from({length:10},(_,i)=>{const r=i%2===0?stOr:stIr;const a=(Math.PI/5)*i-Math.PI/2;return `${stCx+r*Math.cos(a)+1.5},${stCy+r*Math.sin(a)+1.5}`;}).join(' ')} fill="rgba(0,0,0,0.12)" />
          {/* Etoile */}
          <Polygon points={stPts} fill="#FFF9C4" stroke="#F9A825" strokeWidth={0.8} />
        </G>
      );
    }

    case 'katana': {
      // Katana diagonal - bord droit haut (de bas-gauche vers haut-droit)
      const kLen = frameScale * 0.88;
      const kW = frameScale * 0.06;
      const kCx = cx + frameScale * 0.05;
      const kCy = cy - frameScale * 0.18;
      const kAng = -Math.PI / 4; // 45 degres
      const kCos = Math.cos(kAng), kSin = Math.sin(kAng);
      // Lame (rectangle elong fin)
      const blade = [
        { x: kCx - kW * 0.3 * -kSin, y: kCy - kW * 0.3 * kCos }, // base gauche
        { x: kCx + kW * 0.3 * -kSin, y: kCy + kW * 0.3 * kCos }, // base droite
        { x: kCx + kLen * kCos + kW * 0.1 * -kSin, y: kCy + kLen * kSin + kW * 0.1 * kCos }, // pointe droite
        { x: kCx + kLen * kCos - kW * 0.1 * -kSin, y: kCy + kLen * kSin - kW * 0.1 * kCos }, // pointe gauche
      ];
      const bladePts = blade.map(p => `${p.x},${p.y}`).join(' ');
      // Garde (tsuba)
      const gCx = kCx - kLen * 0.08 * kCos;
      const gCy = kCy - kLen * 0.08 * kSin;
      const gW = kLen * 0.14;
      const guardPts = [
        `${gCx + gW * -kSin},${gCy + gW * kCos}`,
        `${gCx - gW * -kSin},${gCy - gW * kCos}`,
        `${gCx - gW * 0.3 * -kSin - kW * 0.6 * kCos},${gCy - gW * 0.3 * kCos - kW * 0.6 * kSin}`,
        `${gCx + gW * 0.3 * -kSin - kW * 0.6 * kCos},${gCy + gW * 0.3 * kCos - kW * 0.6 * kSin}`,
      ].join(' ');
      // Poignee (manche)
      const hLen = kLen * 0.28;
      const hx1 = kCx - kW * 0.28 * -kSin;
      const hy1 = kCy + kW * 0.28 * kCos;
      const hx2 = kCx + kW * 0.28 * -kSin;
      const hy2 = kCy - kW * 0.28 * kCos;
      const handlePts = [
        `${hx1},${hy1}`,
        `${hx2},${hy2}`,
        `${hx2 - hLen * kCos},${hy2 - hLen * kSin}`,
        `${hx1 - hLen * kCos},${hy1 - hLen * kSin}`,
      ].join(' ');
      return (
        <G>
          {/* Ombre */}
          <Polygon points={bladePts} fill="rgba(0,0,0,0.15)" transform="translate(2,2)" />
          {/* Lame - argent brillant */}
          <Polygon points={bladePts} fill="#ECEFF1" stroke="#90A4AE" strokeWidth={0.8} />
          {/* Fil tranchant (reflet) */}
          <Path d={`M ${kCx + kLen * 0.05 * kCos} ${kCy + kLen * 0.05 * kSin} L ${kCx + kLen * 0.92 * kCos} ${kCy + kLen * 0.92 * kSin}`} stroke="rgba(255,255,255,0.8)" strokeWidth={1.5} strokeLinecap="round" />
          {/* Garde or */}
          <Polygon points={guardPts} fill="#FFD700" stroke="#F9A825" strokeWidth={1} />
          {/* Manche noir */}
          <Polygon points={handlePts} fill="#37474F" stroke="#263238" strokeWidth={1} />
          {/* Enroulement manche */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <Path key={i} d={`M ${hx1 - t * hLen * kCos} ${hy1 - t * hLen * kSin} L ${hx2 - t * hLen * kCos} ${hy2 - t * hLen * kSin}`} stroke="#546E7A" strokeWidth={1.5} />
          ))}
        </G>
      );
    }

    case 'ice': {
      // Cristaux de glace - bord droit haut, 3 pics aceres
      const iCx = cx;
      const iCy = cy;
      const iColor = '#B3E5FC';
      const iStroke = '#4FC3F7';
      const iGlow = '#E1F5FE';
      // 3 cristaux en eventail
      const crystals = [
        { angle: -Math.PI / 2, len: frameScale * 0.55, w: frameScale * 0.1 },
        { angle: -Math.PI / 2 - 0.55, len: frameScale * 0.42, w: frameScale * 0.08 },
        { angle: -Math.PI / 2 + 0.55, len: frameScale * 0.42, w: frameScale * 0.08 },
      ];
      return (
        <G>
          {/* Lueur globale */}
          <Circle cx={iCx + 1} cy={iCy + 1.5} r={frameScale * 0.45} fill="rgba(179,229,252,0.18)" />
          {crystals.map((c, i) => {
            const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
            const perpCos = Math.cos(c.angle + Math.PI/2), perpSin = Math.sin(c.angle + Math.PI/2);
            const pts = [
              `${iCx + c.w * perpCos},${iCy + c.w * perpSin}`,
              `${iCx + c.len * cos},${iCy + c.len * sin}`,
              `${iCx - c.w * perpCos},${iCy - c.w * perpSin}`,
              `${iCx - c.len * 0.18 * cos},${iCy - c.len * 0.18 * sin}`,
            ].join(' ');
            // barres transversales
            const mid1x = iCx + c.len * 0.4 * cos;
            const mid1y = iCy + c.len * 0.4 * sin;
            const mid2x = iCx + c.len * 0.7 * cos;
            const mid2y = iCy + c.len * 0.7 * sin;
            const bw = c.w * 1.1;
            return (
              <G key={i}>
                <Polygon points={pts} fill="rgba(0,0,0,0.1)" transform="translate(1.5,1.5)" />
                <Polygon points={pts} fill={iColor} stroke={iStroke} strokeWidth={0.8} />
                {/* Reflet */}
                <Path d={`M ${iCx + c.w * 0.4 * perpCos} ${iCy + c.w * 0.4 * perpSin} L ${iCx + c.len * 0.85 * cos} ${iCy + c.len * 0.85 * sin}`} fill="none" stroke={iGlow} strokeWidth={1.5} strokeLinecap="round" />
                {/* Barres transversales */}
                <Path d={`M ${mid1x + bw * perpCos} ${mid1y + bw * perpSin} L ${mid1x - bw * perpCos} ${mid1y - bw * perpSin}`} stroke={iStroke} strokeWidth={0.7} />
                <Path d={`M ${mid2x + bw * 0.7 * perpCos} ${mid2y + bw * 0.7 * perpSin} L ${mid2x - bw * 0.7 * perpCos} ${mid2y - bw * 0.7 * perpSin}`} stroke={iStroke} strokeWidth={0.7} />
              </G>
            );
          })}
        </G>
      );
    }

    case 'dragon': {
      // Dragon stylise - bord droit haut (tete de dragon en silhouette)
      const dCx = cx - frameScale * 0.02;
      const dCy = cy;
      const dS = frameScale * 0.5;
      // Corps du dragon : S-curve stylisee
      const bodyPath = `M ${dCx - dS * 0.3} ${dCy + dS * 0.55}
        C ${dCx - dS * 0.4} ${dCy + dS * 0.2},
          ${dCx + dS * 0.2} ${dCy + dS * 0.15},
          ${dCx} ${dCy - dS * 0.1}
        C ${dCx - dS * 0.15} ${dCy - dS * 0.35},
          ${dCx + dS * 0.3} ${dCy - dS * 0.55},
          ${dCx + dS * 0.2} ${dCy - dS * 0.8}`;
      // Tete : pointe en haut-droit
      const headPath = `M ${dCx + dS * 0.2} ${dCy - dS * 0.8}
        C ${dCx + dS * 0.5} ${dCy - dS * 0.95},
          ${dCx + dS * 0.55} ${dCy - dS * 0.7},
          ${dCx + dS * 0.45} ${dCy - dS * 0.6}
        C ${dCx + dS * 0.38} ${dCy - dS * 0.55},
          ${dCx + dS * 0.25} ${dCy - dS * 0.6},
          ${dCx + dS * 0.2} ${dCy - dS * 0.8} Z`;
      // Aile de dragon
      const wingPath = `M ${dCx - dS * 0.05} ${dCy + dS * 0.05}
        C ${dCx - dS * 0.5} ${dCy - dS * 0.3},
          ${dCx - dS * 0.55} ${dCy - dS * 0.2},
          ${dCx - dS * 0.45} ${dCy}
        C ${dCx - dS * 0.35} ${dCy + dS * 0.08},
          ${dCx - dS * 0.15} ${dCy + dS * 0.08},
          ${dCx - dS * 0.05} ${dCy + dS * 0.05} Z`;
      // Queue
      const tailPath = `M ${dCx - dS * 0.3} ${dCy + dS * 0.55}
        C ${dCx - dS * 0.2} ${dCy + dS * 0.75},
          ${dCx - dS * 0.05} ${dCy + dS * 0.82},
          ${dCx + dS * 0.1} ${dCy + dS * 0.75}`;
      const dColor = '#B71C1C';
      const dDark = '#7F0000';
      const dScale = '#EF5350';
      return (
        <G>
          {/* Ombre */}
          <Path d={bodyPath} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={frameScale * 0.14} strokeLinecap="round" transform="translate(2,2)" />
          {/* Aile */}
          <Path d={wingPath} fill={dColor} stroke={dDark} strokeWidth={0.8} opacity={0.85} />
          {/* Corps epais */}
          <Path d={bodyPath} fill="none" stroke={dColor} strokeWidth={frameScale * 0.12} strokeLinecap="round" />
          <Path d={bodyPath} fill="none" stroke={dScale} strokeWidth={frameScale * 0.05} strokeLinecap="round" opacity={0.5} />
          {/* Tete */}
          <Path d={headPath} fill={dColor} stroke={dDark} strokeWidth={0.8} />
          {/* Oeil */}
          <Circle cx={dCx + dS * 0.41} cy={dCy - dS * 0.73} r={frameScale * 0.03} fill="#FFD700" />
          {/* Queue */}
          <Path d={tailPath} fill="none" stroke={dColor} strokeWidth={frameScale * 0.08} strokeLinecap="round" />
          {/* Corne */}
          <Path d={`M ${dCx + dS * 0.3} ${dCy - dS * 0.85} L ${dCx + dS * 0.22} ${dCy - dS * 1.02}`} stroke={dDark} strokeWidth={frameScale * 0.05} strokeLinecap="round" />
          {/* Flamme */}
          <Path d={`M ${dCx + dS * 0.52} ${dCy - dS * 0.65} C ${dCx + dS * 0.7} ${dCy - dS * 0.55}, ${dCx + dS * 0.72} ${dCy - dS * 0.45}, ${dCx + dS * 0.62} ${dCy - dS * 0.4}`} fill="none" stroke="#FF6F00" strokeWidth={frameScale * 0.07} strokeLinecap="round" opacity={0.9} />
          <Path d={`M ${dCx + dS * 0.52} ${dCy - dS * 0.65} C ${dCx + dS * 0.68} ${dCy - dS * 0.6}, ${dCx + dS * 0.68} ${dCy - dS * 0.5}, ${dCx + dS * 0.6} ${dCy - dS * 0.44}`} fill="none" stroke="#FFD700" strokeWidth={frameScale * 0.035} strokeLinecap="round" />
        </G>
      );
    }

    case 'sun': {
      // Soleil rayonnant - bord droit haut
      const sunR = frameScale * 0.22;
      const rayLen = frameScale * 0.16;
      const rayCount = 12;
      const sunColor = '#FFD700';
      const sunGlow = '#FFF176';
      return (
        <G>
          {/* Ombre */}
          <Circle cx={cx + 1.5} cy={cy + 2} r={sunR + rayLen + 2} fill="rgba(255,200,0,0.12)" />
          {/* Rayons (longs et courts en alternance) */}
          {Array.from({ length: rayCount }, (_, i) => {
            const a = (Math.PI * 2 / rayCount) * i - Math.PI / 2;
            const isLong = i % 2 === 0;
            const innerR = sunR + frameScale * 0.05;
            const outerR = sunR + (isLong ? rayLen : rayLen * 0.55);
            return (
              <Path
                key={i}
                d={`M ${cx + innerR * Math.cos(a)} ${cy + innerR * Math.sin(a)} L ${cx + outerR * Math.cos(a)} ${cy + outerR * Math.sin(a)}`}
                stroke={isLong ? sunColor : '#FFCC02'}
                strokeWidth={isLong ? frameScale * 0.055 : frameScale * 0.04}
                strokeLinecap="round"
              />
            );
          })}
          {/* Lueur externe */}
          <Circle cx={cx} cy={cy} r={sunR + frameScale * 0.04} fill={sunGlow} opacity={0.35} />
          {/* Corps principal */}
          <Circle cx={cx} cy={cy} r={sunR} fill={sunColor} />
          {/* Reflet */}
          <Circle cx={cx - sunR * 0.25} cy={cy - sunR * 0.28} r={sunR * 0.3} fill="rgba(255,255,255,0.4)" />
        </G>
      );
    }

    default:
      return null;
  }
}

// ============================================
// ACCESSORY PREVIEW for grid
// ============================================
const AccessoryPreview: React.FC<{
  accessory: FrameAccessory;
  size: number;
  accentColor: string;
  bgColor: string;
  isSelected: boolean;
}> = ({ accessory, size, accentColor, bgColor, isSelected }) => {
  if (accessory === 'none') {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={size * 0.3} fill="none" stroke={isSelected ? accentColor : '#888'} strokeWidth={2} strokeDasharray="4,3" />
        <Path
          d={`M ${size * 0.35} ${size * 0.35} L ${size * 0.65} ${size * 0.65}`}
          stroke={isSelected ? accentColor : '#888'}
          strokeWidth={1.5}
        />
      </Svg>
    );
  }

  // Viewbox adapte selon la position de l'accessoire
  const previewScale = 1.8;
  const vbSize = size * previewScale;

  // Accessories positionnes en haut centre
  const topCenterAccs: FrameAccessory[] = ['crown', 'halo', 'horns', 'laurel'];
  // Accessories positionnes en bas
  const bottomAccs: FrameAccessory[] = ['fire'];
  // Accessories positionnes sur les cotes
  const sideAccs: FrameAccessory[] = ['wings'];

  let offsetX: number;
  let offsetY: number;
  if (topCenterAccs.includes(accessory)) {
    offsetX = vbSize * 0.05;
    offsetY = -vbSize * 0.16;
  } else if (bottomAccs.includes(accessory)) {
    offsetX = vbSize * 0.05;
    offsetY = vbSize * 0.75;
  } else if (sideAccs.includes(accessory)) {
    // Montrer l'aile droite (bord droit)
    offsetX = vbSize * 0.52;
    offsetY = vbSize * 0.3;
  } else {
    // top-right (flower, bow, star, heart, lightning, sakura)
    offsetX = vbSize * 0.32;
    offsetY = -vbSize * 0.08;
  }

  return (
    <Svg width={size} height={size} viewBox={`${offsetX} ${offsetY} ${vbSize} ${vbSize}`}>
      {renderAccessorySvg(accessory, vbSize, accentColor)}
    </Svg>
  );
};

// Composant pour afficher une forme
const FrameShapePreview: React.FC<{
  shape: FrameShape;
  size: number;
  color: string;
  fillColor: string;
  isSelected: boolean;
}> = ({ shape, size, color, fillColor, isSelected }) => {
  const strokeWidth = isSelected ? 3 : 2;
  const innerSize = size - 10;

  const renderShape = () => {
    switch (shape) {
      case 'circle':
        return (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={innerSize / 2 - 2}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'rounded-square':
        return (
          <Rect
            x={5}
            y={5}
            width={innerSize}
            height={innerSize}
            rx={innerSize * 0.2}
            ry={innerSize * 0.2}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'squircle': {
        return (
          <Path
            d={`M ${size/2} 5
                C ${size - 8} 5, ${size - 5} 8, ${size - 5} ${size/2}
                C ${size - 5} ${size - 8}, ${size - 8} ${size - 5}, ${size/2} ${size - 5}
                C 8 ${size - 5}, 5 ${size - 8}, 5 ${size/2}
                C 5 8, 8 5, ${size/2} 5 Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'hexagon': {
        const hx = size / 2;
        const hy = size / 2;
        const hr = innerSize / 2 - 2;
        const hexPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          return `${hx + hr * Math.cos(angle)},${hy + hr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={hexPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'octagon': {
        const ox = size / 2;
        const oy = size / 2;
        const or2 = innerSize / 2 - 2;
        const octPoints = Array.from({ length: 8 }, (_, i) => {
          const angle = (Math.PI / 4) * i - Math.PI / 8;
          return `${ox + or2 * Math.cos(angle)},${oy + or2 * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={octPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'diamond': {
        const dx = size / 2;
        const dy = size / 2;
        return (
          <Polygon
            points={`${dx},${5} ${size - 5},${dy} ${dx},${size - 5} ${5},${dy}`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'shield':
        return (
          <Path
            d={`M ${size/2} 5
                L ${size - 5} ${size * 0.25}
                L ${size - 5} ${size * 0.55}
                Q ${size - 5} ${size * 0.75}, ${size/2} ${size - 5}
                Q 5 ${size * 0.75}, 5 ${size * 0.55}
                L 5 ${size * 0.25}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'star': {
        const sx = size / 2;
        const sy = size / 2;
        const outerR = innerSize / 2 - 2;
        const innerR = outerR * 0.58;
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? outerR : innerR;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          return `${sx + r * Math.cos(angle)},${sy + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={starPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'heart': {
        const scale = size;
        const padding = 5;
        return (
          <Path
            d={`M ${scale/2} ${scale - padding - 2}
                C ${scale * 0.15} ${scale * 0.68}, ${padding} ${scale * 0.48}, ${padding} ${scale * 0.35}
                C ${padding} ${scale * 0.2}, ${scale * 0.2} ${padding + 2}, ${scale * 0.35} ${padding + 2}
                C ${scale * 0.42} ${padding + 2}, ${scale * 0.48} ${scale * 0.15}, ${scale/2} ${scale * 0.22}
                C ${scale * 0.52} ${scale * 0.15}, ${scale * 0.58} ${padding + 2}, ${scale * 0.65} ${padding + 2}
                C ${scale * 0.8} ${padding + 2}, ${scale - padding} ${scale * 0.2}, ${scale - padding} ${scale * 0.35}
                C ${scale - padding} ${scale * 0.48}, ${scale * 0.85} ${scale * 0.68}, ${scale/2} ${scale - padding - 2}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'drop':
        return (
          <Path
            d={`M ${size/2} 5
                Q ${size - 5} ${size * 0.4}, ${size - 5} ${size * 0.6}
                C ${size - 5} ${size - 5}, ${size/2} ${size - 5}, ${size/2} ${size - 5}
                C ${size/2} ${size - 5}, 5 ${size - 5}, 5 ${size * 0.6}
                Q 5 ${size * 0.4}, ${size/2} 5
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );

      case 'arch': {
        const ap = 5;
        const aR = (size - ap * 2) / 2;
        return (
          <Path
            d={`M ${ap} ${size - ap}
                L ${ap} ${ap + aR}
                A ${aR} ${aR} 0 0 1 ${size - ap} ${ap + aR}
                L ${size - ap} ${size - ap}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'pentagon': {
        const px = size / 2;
        const py = size / 2;
        const pr = innerSize / 2 - 2;
        const pentPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          return `${px + pr * Math.cos(angle)},${py + pr * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={pentPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'ovale': {
        const orx = innerSize / 2 - 2;
        const ory = orx * 0.7;
        return (
          <Path
            d={`M ${size/2 - orx},${size/2}
                A ${orx} ${ory} 0 1 1 ${size/2 + orx},${size/2}
                A ${orx} ${ory} 0 1 1 ${size/2 - orx},${size/2} Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'plaque': {
        const pp = 5;
        const cut = (size - pp * 2) * 0.2;
        return (
          <Polygon
            points={`${pp + cut},${pp} ${size - pp - cut},${pp} ${size - pp},${pp + cut} ${size - pp},${size - pp - cut} ${size - pp - cut},${size - pp} ${pp + cut},${size - pp} ${pp},${size - pp - cut} ${pp},${pp + cut}`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'tonneau': {
        const tp = 5;
        const bulge = (size - tp * 2) * 0.12;
        return (
          <Path
            d={`M ${tp + 8},${tp}
                L ${size - tp - 8},${tp}
                Q ${size - tp},${tp} ${size - tp},${tp + 8}
                Q ${size - tp + bulge},${size/2} ${size - tp},${size - tp - 8}
                Q ${size - tp},${size - tp} ${size - tp - 8},${size - tp}
                L ${tp + 8},${size - tp}
                Q ${tp},${size - tp} ${tp},${size - tp - 8}
                Q ${tp - bulge},${size/2} ${tp},${tp + 8}
                Q ${tp},${tp} ${tp + 8},${tp}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'capsule': {
        const capInset = size * 0.15;
        const capR = (size - capInset * 2) / 2;
        const capP = 5;
        return (
          <Path
            d={`M ${capInset} ${capP + capR}
                A ${capR} ${capR} 0 0 1 ${size - capInset} ${capP + capR}
                L ${size - capInset} ${size - capP - capR}
                A ${capR} ${capR} 0 0 1 ${capInset} ${size - capP - capR}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'coquille': {
        const scCx = size / 2;
        const scCy = size / 2;
        const scR = innerSize / 2 - 4;
        const scN = 10;
        let scD = '';
        for (let i = 0; i < scN; i++) {
          const a1 = (2 * Math.PI * i / scN) - Math.PI / 2;
          const a2 = (2 * Math.PI * (i + 1) / scN) - Math.PI / 2;
          const x1 = scCx + scR * Math.cos(a1);
          const y1 = scCy + scR * Math.sin(a1);
          const x2 = scCx + scR * Math.cos(a2);
          const y2 = scCy + scR * Math.sin(a2);
          const midA = (a1 + a2) / 2;
          const cpx = scCx + scR * 1.18 * Math.cos(midA);
          const cpy = scCy + scR * 1.18 * Math.sin(midA);
          if (i === 0) scD += `M ${x1},${y1} `;
          scD += `Q ${cpx},${cpy} ${x2},${y2} `;
        }
        scD += 'Z';
        return (
          <Path
            d={scD}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'medaillon': {
        const mdCx = size / 2;
        const mdCy = size / 2;
        const mdR = innerSize / 2 - 2;
        const mdPoints = Array.from({ length: 12 }, (_, i) => {
          const angle = (Math.PI * 2 / 12) * i - Math.PI / 2;
          return `${mdCx + mdR * Math.cos(angle)},${mdCy + mdR * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={mdPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'sceau': {
        const seCx = size / 2;
        const seCy = size / 2;
        const seOuter = innerSize / 2 - 2;
        const seInner = seOuter * 0.88;
        const seN = 16;
        let seD = '';
        for (let i = 0; i < seN * 2; i++) {
          const a = (Math.PI * i / seN) - Math.PI / 2;
          const r = i % 2 === 0 ? seOuter : seInner;
          const x = seCx + r * Math.cos(a);
          const y = seCy + r * Math.sin(a);
          seD += (i === 0 ? `M ` : `L `) + `${x},${y} `;
        }
        seD += 'Z';
        return (
          <Path
            d={seD}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'ticket': {
        const tkP = 5;
        const tkR = innerSize * 0.08;
        return (
          <Path
            d={`M ${tkP} ${tkP}
                L ${size - tkP} ${tkP}
                L ${size - tkP} ${size/2 - tkR}
                A ${tkR} ${tkR} 0 0 0 ${size - tkP} ${size/2 + tkR}
                L ${size - tkP} ${size - tkP}
                L ${tkP} ${size - tkP}
                L ${tkP} ${size/2 + tkR}
                A ${tkR} ${tkR} 0 0 0 ${tkP} ${size/2 - tkR}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'stade': {
        const stInset = size * 0.15;
        const stR = (size - stInset * 2) / 2;
        const stP = 5;
        return (
          <Path
            d={`M ${stP + stR} ${stInset}
                L ${size - stP - stR} ${stInset}
                A ${stR} ${stR} 0 0 1 ${size - stP - stR} ${size - stInset}
                L ${stP + stR} ${size - stInset}
                A ${stR} ${stR} 0 0 1 ${stP + stR} ${stInset}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'nuage': {
        const nP = 5;
        return (
          <Path
            d={`M ${nP} ${size * 0.65}
                Q ${nP} ${size * 0.4}, ${size * 0.25} ${size * 0.32}
                Q ${size * 0.3} ${size * 0.15}, ${size/2} ${size * 0.2}
                Q ${size * 0.7} ${size * 0.15}, ${size * 0.75} ${size * 0.32}
                Q ${size - nP} ${size * 0.4}, ${size - nP} ${size * 0.65}
                Q ${size - nP} ${size - nP}, ${size/2} ${size - nP}
                Q ${nP} ${size - nP}, ${nP} ${size * 0.65}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      // ===== 8 NEW SHAPES =====

      case 'tv-retro': {
        // TV retro - rectangle avec bords bombes (large, pas etroit)
        const tp2 = 5;
        const tw = innerSize;
        const th = innerSize * 0.82;
        const ty = (size - th) / 2;
        const bulge2 = tw * 0.06;
        return (
          <Path
            d={`M ${tp2 + 12},${ty}
                L ${size - tp2 - 12},${ty}
                Q ${size - tp2},${ty} ${size - tp2},${ty + 12}
                Q ${size - tp2 + bulge2},${size/2} ${size - tp2},${ty + th - 12}
                Q ${size - tp2},${ty + th} ${size - tp2 - 12},${ty + th}
                L ${tp2 + 12},${ty + th}
                Q ${tp2},${ty + th} ${tp2},${ty + th - 12}
                Q ${tp2 - bulge2},${size/2} ${tp2},${ty + 12}
                Q ${tp2},${ty} ${tp2 + 12},${ty}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'clover': {
        // Trefle a 4 feuilles - 4 cercles qui se chevauchent avec large zone centrale
        const clCx = size / 2;
        const clCy = size / 2;
        const clR = innerSize * 0.27;
        const clOffset = innerSize * 0.18;
        return (
          <G>
            <Circle cx={clCx} cy={clCy - clOffset} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            <Circle cx={clCx + clOffset} cy={clCy} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            <Circle cx={clCx} cy={clCy + clOffset} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            <Circle cx={clCx - clOffset} cy={clCy} r={clR} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />
            {/* Zone centrale - remplissage pour masquer les bordures internes */}
            <Circle cx={clCx} cy={clCy} r={clOffset * 0.9} fill={fillColor} />
          </G>
        );
      }

      case 'soft-diamond': {
        // Diamant arrondi / coussin - losange avec courbes douces
        const sdP = 5;
        const sdW = innerSize / 2;
        return (
          <Path
            d={`M ${size/2} ${sdP}
                Q ${size - sdP + 4} ${sdP + 4}, ${size - sdP} ${size/2}
                Q ${size - sdP + 4} ${size - sdP - 4}, ${size/2} ${size - sdP}
                Q ${sdP - 4} ${size - sdP - 4}, ${sdP} ${size/2}
                Q ${sdP - 4} ${sdP + 4}, ${size/2} ${sdP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'egg': {
        // Oeuf - cercle plus large en bas, plus etroit en haut, bonne surface
        const ep = 5;
        const eW = innerSize * 0.45;
        const eH = innerSize / 2;
        return (
          <Path
            d={`M ${size/2} ${ep}
                C ${size/2 + eW * 0.85} ${ep}, ${size/2 + eW} ${size * 0.3}, ${size/2 + eW} ${size * 0.45}
                C ${size/2 + eW} ${size * 0.65}, ${size/2 + eW * 0.9} ${size - ep}, ${size/2} ${size - ep}
                C ${size/2 - eW * 0.9} ${size - ep}, ${size/2 - eW} ${size * 0.65}, ${size/2 - eW} ${size * 0.45}
                C ${size/2 - eW} ${size * 0.3}, ${size/2 - eW * 0.85} ${ep}, ${size/2} ${ep}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'wide-barrel': {
        // Barrique - tonneau horizontal, plus large que haut
        const wbP = 5;
        const wbH = innerSize * 0.78;
        const wbY = (size - wbH) / 2;
        const wbBulge = wbH * 0.1;
        return (
          <Path
            d={`M ${wbP + 6},${wbY}
                L ${size - wbP - 6},${wbY}
                Q ${size - wbP},${wbY} ${size - wbP},${wbY + 6}
                L ${size - wbP},${wbY + wbH - 6}
                Q ${size - wbP},${wbY + wbH} ${size - wbP - 6},${wbY + wbH}
                L ${wbP + 6},${wbY + wbH}
                Q ${wbP},${wbY + wbH} ${wbP},${wbY + wbH - 6}
                L ${wbP},${wbY + 6}
                Q ${wbP},${wbY} ${wbP + 6},${wbY}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'leaf-wide': {
        // Feuille large - forme organique avec pointes douces, bonne surface
        const lfP = 5;
        return (
          <Path
            d={`M ${size/2} ${lfP}
                Q ${size - lfP + 3} ${lfP - 3}, ${size - lfP} ${size/2}
                Q ${size - lfP + 3} ${size - lfP + 3}, ${size/2} ${size - lfP}
                Q ${lfP - 3} ${size - lfP + 3}, ${lfP} ${size/2}
                Q ${lfP - 3} ${lfP - 3}, ${size/2} ${lfP}
                Z`}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'nonagon': {
        // Nonagone - 9 cotes, entre octogone et cercle
        const nCx = size / 2;
        const nCy = size / 2;
        const nR = innerSize / 2 - 2;
        const nonPoints = Array.from({ length: 9 }, (_, i) => {
          const angle = (Math.PI * 2 / 9) * i - Math.PI / 2;
          return `${nCx + nR * Math.cos(angle)},${nCy + nR * Math.sin(angle)}`;
        }).join(' ');
        return (
          <Polygon
            points={nonPoints}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        );
      }

      case 'super-ellipse': {
        // Super ellipse - entre carre arrondi et cercle, forme Piet Hein
        const seP = 6;
        const seR = (size - seP * 2) / 2;
        const n = 4; // exposant (2=ellipse, inf=rect)
        const pts: string[] = [];
        for (let i = 0; i <= 64; i++) {
          const t = (2 * Math.PI * i) / 64;
          const cosT = Math.cos(t);
          const sinT = Math.sin(t);
          const x = size / 2 + seR * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n);
          const y = size / 2 + seR * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n);
          pts.push(`${x},${y}`);
        }
        return (
          <Polygon
            points={pts.join(' ')}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
      }

      case 'star-6': {
        // Etoile 6 branches (hexagramme) - alternance 12 pointes
        const s6Cx = size / 2, s6Cy = size / 2;
        const s6Out = innerSize / 2 - 2;
        const s6In = s6Out * 0.48;
        const s6Pts = Array.from({ length: 12 }, (_, i) => {
          const r = i % 2 === 0 ? s6Out : s6In;
          const a = (Math.PI / 6) * i - Math.PI / 2;
          return `${s6Cx + r * Math.cos(a)},${s6Cy + r * Math.sin(a)}`;
        }).join(' ');
        return <Polygon points={s6Pts} fill={fillColor} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />;
      }

      case 'sakura-bloom': {
        // Fleur de cerisier - 5 petales arrondies
        const skCx = size / 2, skCy = size / 2;
        const skOut = innerSize / 2 - 2;
        const skIn = skOut * 0.38;
        const numP = 5, ptsPerPetal = 24;
        const total = numP * ptsPerPetal;
        const skPts = Array.from({ length: total }, (_, i) => {
          const ang = (Math.PI * 2 / total) * i - Math.PI / 2;
          const phase = (i % ptsPerPetal) / ptsPerPetal;
          const r = skIn + (skOut - skIn) * Math.pow(Math.sin(phase * Math.PI), 1.6);
          return `${skCx + r * Math.cos(ang)},${skCy + r * Math.sin(ang)}`;
        }).join(' ');
        return <Polygon points={skPts} fill={fillColor} stroke={color} strokeWidth={strokeWidth} />;
      }

      case 'speech-bubble': {
        // Bulle de dialogue avec queue en bas a gauche
        const sbP = 5;
        const sbCr = (size - 2 * sbP) * 0.15;
        const sbBH = (size - 2 * sbP) * 0.74; // hauteur bulle
        const sbTailX = sbP + (size - 2 * sbP) * 0.28; // droite de la queue
        return (
          <Path
            d={`M ${sbP + sbCr} ${sbP}
                L ${size - sbP - sbCr} ${sbP}
                Q ${size - sbP} ${sbP} ${size - sbP} ${sbP + sbCr}
                L ${size - sbP} ${sbP + sbBH - sbCr}
                Q ${size - sbP} ${sbP + sbBH} ${size - sbP - sbCr} ${sbP + sbBH}
                L ${sbTailX} ${sbP + sbBH}
                L ${sbP + (size - 2 * sbP) * 0.08} ${size - sbP}
                L ${sbP} ${sbP + sbBH}
                L ${sbP + sbCr} ${sbP + sbBH}
                Q ${sbP} ${sbP + sbBH} ${sbP} ${sbP + sbBH - sbCr}
                L ${sbP} ${sbP + sbCr}
                Q ${sbP} ${sbP} ${sbP + sbCr} ${sbP} Z`}
            fill={fillColor} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round"
          />
        );
      }

      case 'burst': {
        // Explosion/rafale - 18 pointes tres marquees
        const buCx = size / 2, buCy = size / 2;
        const buOut = innerSize / 2 - 2;
        const buIn = buOut * 0.62;
        const buN = 18;
        const buPts = Array.from({ length: buN * 2 }, (_, i) => {
          const r = i % 2 === 0 ? buOut : buIn;
          const a = (Math.PI / buN) * i - Math.PI / 2;
          return `${buCx + r * Math.cos(a)},${buCy + r * Math.sin(a)}`;
        }).join(' ');
        return <Polygon points={buPts} fill={fillColor} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />;
      }

      case 'scroll': {
        // Parchemin - rectangle avec bords enroules en haut et bas
        const scP = 5;
        const scW = size - 2 * scP;
        const scCH = scW * 0.74; // hauteur de la zone centrale
        const scCY = (size - scCH) / 2;
        const scCurl = scW * 0.11;
        return (
          <Path
            d={`M ${scP} ${scCY + scCurl}
                Q ${scP} ${scCY} ${scP + scCurl} ${scCY}
                L ${size - scP - scCurl} ${scCY}
                Q ${size - scP} ${scCY} ${size - scP} ${scCY + scCurl}
                L ${size - scP} ${scCY + scCH - scCurl}
                Q ${size - scP} ${scCY + scCH} ${size - scP - scCurl} ${scCY + scCH}
                Q ${size / 2} ${scCY + scCH + scCurl * 0.7} ${scP + scCurl} ${scCY + scCH}
                Q ${scP} ${scCY + scCH} ${scP} ${scCY + scCH - scCurl}
                Z`}
            fill={fillColor} stroke={color} strokeWidth={strokeWidth}
          />
        );
      }

      default:
        return (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={innerSize / 2 - 2}
            fill={fillColor}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        );
    }
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {renderShape()}
    </Svg>
  );
};

// Storage keys
const PHOTO_HISTORY_KEY = '@yoroi_photo_history';
const PHOTO_TRANSFORM_KEY = '@yoroi_frame_transform';

export interface PhotoTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

// Charger / sauvegarder l'historique des photos
const loadPhotoHistory = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(PHOTO_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const savePhotoHistory = async (history: string[]) => {
  try {
    await AsyncStorage.setItem(PHOTO_HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
  } catch (e) { logger.error('Error saving photo history:', e); }
};

const addToPhotoHistory = async (uri: string): Promise<string[]> => {
  const history = await loadPhotoHistory();
  const filtered = history.filter(h => h !== uri);
  const updated = [uri, ...filtered].slice(0, 5);
  await savePhotoHistory(updated);
  return updated;
};

// Charger / sauvegarder le transform
const loadTransform = async (): Promise<PhotoTransform> => {
  try {
    const raw = await AsyncStorage.getItem(PHOTO_TRANSFORM_KEY);
    return raw ? JSON.parse(raw) : { scale: 1, translateX: 0, translateY: 0 };
  } catch { return { scale: 1, translateX: 0, translateY: 0 }; }
};

const saveTransform = async (t: PhotoTransform) => {
  try {
    await AsyncStorage.setItem(PHOTO_TRANSFORM_KEY, JSON.stringify(t));
  } catch (e) { logger.error('Error saving transform:', e); }
};

// ============================================
// CLIP PATH GENERATOR (shared between preview and FramedProfilePhoto)
// ============================================
export function generateClipPath(shape: FrameShape, s: number, pad: number = 4): string {
  const inner = s - pad * 2;

  switch (shape) {
    case 'circle': return '';
    case 'rounded-square': {
      const r = inner * 0.2;
      return `M ${pad+r},${pad} L ${pad+inner-r},${pad} Q ${pad+inner},${pad} ${pad+inner},${pad+r} L ${pad+inner},${pad+inner-r} Q ${pad+inner},${pad+inner} ${pad+inner-r},${pad+inner} L ${pad+r},${pad+inner} Q ${pad},${pad+inner} ${pad},${pad+inner-r} L ${pad},${pad+r} Q ${pad},${pad} ${pad+r},${pad} Z`;
    }
    case 'squircle': return `M ${s/2} ${pad} C ${s-pad-3} ${pad}, ${s-pad} ${pad+3}, ${s-pad} ${s/2} C ${s-pad} ${s-pad-3}, ${s-pad-3} ${s-pad}, ${s/2} ${s-pad} C ${pad+3} ${s-pad}, ${pad} ${s-pad-3}, ${pad} ${s/2} C ${pad} ${pad+3}, ${pad+3} ${pad}, ${s/2} ${pad} Z`;
    case 'hexagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts = Array.from({length:6},(_,i)=>{const a=(Math.PI/3)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
    }
    case 'octagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts = Array.from({length:8},(_,i)=>{const a=(Math.PI/4)*i-Math.PI/8;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} Z`;
    }
    case 'diamond': return `M ${s/2},${pad} L ${s-pad},${s/2} L ${s/2},${s-pad} L ${pad},${s/2} Z`;
    case 'shield': return `M ${s/2} ${pad} L ${s-pad} ${s*0.25} L ${s-pad} ${s*0.55} Q ${s-pad} ${s*0.75}, ${s/2} ${s-pad} Q ${pad} ${s*0.75}, ${pad} ${s*0.55} L ${pad} ${s*0.25} Z`;
    case 'star': {
      const cx=s/2, cy=s/2, outerR=inner/2, innerR=outerR*0.58;
      const pts = Array.from({length:10},(_,i)=>{const r=i%2===0?outerR:innerR;const a=(Math.PI/5)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} L ${pts[8]} L ${pts[9]} Z`;
    }
    case 'heart': return `M ${s/2} ${s-pad-2} C ${s*0.15} ${s*0.68}, ${pad} ${s*0.48}, ${pad} ${s*0.35} C ${pad} ${s*0.2}, ${s*0.2} ${pad+2}, ${s*0.35} ${pad+2} C ${s*0.42} ${pad+2}, ${s*0.48} ${s*0.15}, ${s/2} ${s*0.22} C ${s*0.52} ${s*0.15}, ${s*0.58} ${pad+2}, ${s*0.65} ${pad+2} C ${s*0.8} ${pad+2}, ${s-pad} ${s*0.2}, ${s-pad} ${s*0.35} C ${s-pad} ${s*0.48}, ${s*0.85} ${s*0.68}, ${s/2} ${s-pad-2} Z`;
    case 'drop': return `M ${s/2} ${pad} Q ${s-pad} ${s*0.4}, ${s-pad} ${s*0.6} C ${s-pad} ${s-pad}, ${s/2} ${s-pad}, ${s/2} ${s-pad} C ${s/2} ${s-pad}, ${pad} ${s-pad}, ${pad} ${s*0.6} Q ${pad} ${s*0.4}, ${s/2} ${pad} Z`;
    case 'arch': {
      const aR=(s-pad*2)/2;
      return `M ${pad} ${s-pad} L ${pad} ${pad+aR} A ${aR} ${aR} 0 0 1 ${s-pad} ${pad+aR} L ${s-pad} ${s-pad} Z`;
    }
    case 'pentagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts = Array.from({length:5},(_,i)=>{const a=(Math.PI*2/5)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} Z`;
    }
    case 'ovale': {
      const orx=inner/2, ory=orx*0.7;
      return `M ${s/2-orx},${s/2} A ${orx} ${ory} 0 1 1 ${s/2+orx},${s/2} A ${orx} ${ory} 0 1 1 ${s/2-orx},${s/2} Z`;
    }
    case 'plaque': {
      const cut=inner*0.2;
      return `M ${pad+cut},${pad} L ${s-pad-cut},${pad} L ${s-pad},${pad+cut} L ${s-pad},${s-pad-cut} L ${s-pad-cut},${s-pad} L ${pad+cut},${s-pad} L ${pad},${s-pad-cut} L ${pad},${pad+cut} Z`;
    }
    case 'tonneau': {
      const bulge=inner*0.12;
      return `M ${pad+8},${pad} L ${s-pad-8},${pad} Q ${s-pad},${pad} ${s-pad},${pad+8} Q ${s-pad+bulge},${s/2} ${s-pad},${s-pad-8} Q ${s-pad},${s-pad} ${s-pad-8},${s-pad} L ${pad+8},${s-pad} Q ${pad},${s-pad} ${pad},${s-pad-8} Q ${pad-bulge},${s/2} ${pad},${pad+8} Q ${pad},${pad} ${pad+8},${pad} Z`;
    }
    case 'capsule': {
      const ci=s*0.15, cr=(s-ci*2)/2;
      return `M ${ci} ${pad+cr} A ${cr} ${cr} 0 0 1 ${s-ci} ${pad+cr} L ${s-ci} ${s-pad-cr} A ${cr} ${cr} 0 0 1 ${ci} ${s-pad-cr} Z`;
    }
    case 'coquille': {
      const scR=inner/2-2, scN=10;
      let scD='';
      for(let i=0;i<scN;i++){const a1=(2*Math.PI*i/scN)-Math.PI/2;const a2=(2*Math.PI*(i+1)/scN)-Math.PI/2;const x1=s/2+scR*Math.cos(a1);const y1=s/2+scR*Math.sin(a1);const x2=s/2+scR*Math.cos(a2);const y2=s/2+scR*Math.sin(a2);const mA=(a1+a2)/2;const cpx=s/2+scR*1.18*Math.cos(mA);const cpy=s/2+scR*1.18*Math.sin(mA);if(i===0)scD+=`M ${x1},${y1} `;scD+=`Q ${cpx},${cpy} ${x2},${y2} `;}
      return scD+'Z';
    }
    case 'medaillon': {
      const mr=inner/2;
      const pts=Array.from({length:12},(_,i)=>{const a=(Math.PI*2/12)*i-Math.PI/2;return `${s/2+mr*Math.cos(a)},${s/2+mr*Math.sin(a)}`;});
      return `M ${pts[0]} ${pts.slice(1).map(pt=>`L ${pt}`).join(' ')} Z`;
    }
    case 'sceau': {
      const seOuter=inner/2, seInner=seOuter*0.88, seN=16;
      let seD='';
      for(let i=0;i<seN*2;i++){const a=(Math.PI*i/seN)-Math.PI/2;const r=i%2===0?seOuter:seInner;seD+=(i===0?`M `:`L `)+`${s/2+r*Math.cos(a)},${s/2+r*Math.sin(a)} `;}
      return seD+'Z';
    }
    case 'ticket': {
      const tkR=inner*0.08;
      return `M ${pad} ${pad} L ${s-pad} ${pad} L ${s-pad} ${s/2-tkR} A ${tkR} ${tkR} 0 0 0 ${s-pad} ${s/2+tkR} L ${s-pad} ${s-pad} L ${pad} ${s-pad} L ${pad} ${s/2+tkR} A ${tkR} ${tkR} 0 0 0 ${pad} ${s/2-tkR} Z`;
    }
    case 'stade': {
      const stI=s*0.15, stR=(s-stI*2)/2;
      return `M ${pad+stR} ${stI} L ${s-pad-stR} ${stI} A ${stR} ${stR} 0 0 1 ${s-pad-stR} ${s-stI} L ${pad+stR} ${s-stI} A ${stR} ${stR} 0 0 1 ${pad+stR} ${stI} Z`;
    }
    case 'nuage':
      return `M ${pad} ${s*0.65} Q ${pad} ${s*0.4}, ${s*0.25} ${s*0.32} Q ${s*0.3} ${s*0.15}, ${s/2} ${s*0.2} Q ${s*0.7} ${s*0.15}, ${s*0.75} ${s*0.32} Q ${s-pad} ${s*0.4}, ${s-pad} ${s*0.65} Q ${s-pad} ${s-pad}, ${s/2} ${s-pad} Q ${pad} ${s-pad}, ${pad} ${s*0.65} Z`;

    // ===== 8 NEW SHAPES =====
    case 'tv-retro': {
      const tw = inner;
      const th = inner * 0.82;
      const ty = (s - th) / 2;
      const bulge2 = tw * 0.06;
      return `M ${pad+12},${ty} L ${s-pad-12},${ty} Q ${s-pad},${ty} ${s-pad},${ty+12} Q ${s-pad+bulge2},${s/2} ${s-pad},${ty+th-12} Q ${s-pad},${ty+th} ${s-pad-12},${ty+th} L ${pad+12},${ty+th} Q ${pad},${ty+th} ${pad},${ty+th-12} Q ${pad-bulge2},${s/2} ${pad},${ty+12} Q ${pad},${ty} ${pad+12},${ty} Z`;
    }
    case 'clover': {
      // Trefle - 4 lobes arrondis
      const clR = inner * 0.27;
      const clO = inner * 0.18;
      const cx2 = s / 2;
      const cy2 = s / 2;
      // Generate path for 4 overlapping circles as a union
      // Approximate with a smooth path
      return `M ${cx2} ${cy2-clO-clR} A ${clR} ${clR} 0 1 1 ${cx2+clO} ${cy2-clO} Q ${cx2+clO+clR*0.5} ${cy2-clO-clR*0.5} ${cx2+clO+clR} ${cy2} A ${clR} ${clR} 0 1 1 ${cx2+clO} ${cy2+clO} Q ${cx2+clO+clR*0.5} ${cy2+clO+clR*0.5} ${cx2} ${cy2+clO+clR} A ${clR} ${clR} 0 1 1 ${cx2-clO} ${cy2+clO} Q ${cx2-clO-clR*0.5} ${cy2+clO+clR*0.5} ${cx2-clO-clR} ${cy2} A ${clR} ${clR} 0 1 1 ${cx2-clO} ${cy2-clO} Q ${cx2-clO-clR*0.5} ${cy2-clO-clR*0.5} ${cx2} ${cy2-clO-clR} Z`;
    }
    case 'soft-diamond': {
      return `M ${s/2} ${pad} Q ${s-pad+4} ${pad+4}, ${s-pad} ${s/2} Q ${s-pad+4} ${s-pad-4}, ${s/2} ${s-pad} Q ${pad-4} ${s-pad-4}, ${pad} ${s/2} Q ${pad-4} ${pad+4}, ${s/2} ${pad} Z`;
    }
    case 'egg': {
      const eW = inner * 0.45;
      return `M ${s/2} ${pad} C ${s/2+eW*0.85} ${pad}, ${s/2+eW} ${s*0.3}, ${s/2+eW} ${s*0.45} C ${s/2+eW} ${s*0.65}, ${s/2+eW*0.9} ${s-pad}, ${s/2} ${s-pad} C ${s/2-eW*0.9} ${s-pad}, ${s/2-eW} ${s*0.65}, ${s/2-eW} ${s*0.45} C ${s/2-eW} ${s*0.3}, ${s/2-eW*0.85} ${pad}, ${s/2} ${pad} Z`;
    }
    case 'wide-barrel': {
      const wbH = inner * 0.78;
      const wbY = (s - wbH) / 2;
      return `M ${pad+6},${wbY} L ${s-pad-6},${wbY} Q ${s-pad},${wbY} ${s-pad},${wbY+6} L ${s-pad},${wbY+wbH-6} Q ${s-pad},${wbY+wbH} ${s-pad-6},${wbY+wbH} L ${pad+6},${wbY+wbH} Q ${pad},${wbY+wbH} ${pad},${wbY+wbH-6} L ${pad},${wbY+6} Q ${pad},${wbY} ${pad+6},${wbY} Z`;
    }
    case 'leaf-wide': {
      return `M ${s/2} ${pad} Q ${s-pad+3} ${pad-3}, ${s-pad} ${s/2} Q ${s-pad+3} ${s-pad+3}, ${s/2} ${s-pad} Q ${pad-3} ${s-pad+3}, ${pad} ${s/2} Q ${pad-3} ${pad-3}, ${s/2} ${pad} Z`;
    }
    case 'nonagon': {
      const cx=s/2, cy=s/2, r=inner/2;
      const pts=Array.from({length:9},(_,i)=>{const a=(Math.PI*2/9)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} L ${pts[6]} L ${pts[7]} L ${pts[8]} Z`;
    }
    case 'super-ellipse': {
      const seR = inner / 2;
      const n = 4;
      const pts: string[] = [];
      for (let i = 0; i <= 64; i++) {
        const t = (2 * Math.PI * i) / 64;
        const cosT = Math.cos(t);
        const sinT = Math.sin(t);
        const x = s / 2 + seR * Math.sign(cosT) * Math.pow(Math.abs(cosT), 2 / n);
        const y = s / 2 + seR * Math.sign(sinT) * Math.pow(Math.abs(sinT), 2 / n);
        pts.push(`${x},${y}`);
      }
      return `M ${pts[0]} ${pts.slice(1).map(p => `L ${p}`).join(' ')} Z`;
    }

    case 'star-6': {
      const cx = s/2, cy = s/2, outerR = inner/2, innerR = outerR * 0.48;
      const pts = Array.from({length:12},(_,i)=>{const r=i%2===0?outerR:innerR;const a=(Math.PI/6)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} ${pts.slice(1).map(p=>`L ${p}`).join(' ')} Z`;
    }
    case 'sakura-bloom': {
      const cx=s/2, cy=s/2, outerR=inner/2, innerR=outerR*0.38;
      const numP=5, ppp=24, total=numP*ppp;
      const pts = Array.from({length:total},(_,i)=>{const ang=(Math.PI*2/total)*i-Math.PI/2;const phase=(i%ppp)/ppp;const r=innerR+(outerR-innerR)*Math.pow(Math.sin(phase*Math.PI),1.6);return `${cx+r*Math.cos(ang)},${cy+r*Math.sin(ang)}`;});
      return `M ${pts[0]} ${pts.slice(1).map(p=>`L ${p}`).join(' ')} Z`;
    }
    case 'speech-bubble': {
      const sbP=pad, scr=(s-2*sbP)*0.15, bh=(s-2*sbP)*0.74, tX=sbP+(s-2*sbP)*0.28;
      return `M ${sbP+scr} ${sbP} L ${s-sbP-scr} ${sbP} Q ${s-sbP} ${sbP} ${s-sbP} ${sbP+scr} L ${s-sbP} ${sbP+bh-scr} Q ${s-sbP} ${sbP+bh} ${s-sbP-scr} ${sbP+bh} L ${tX} ${sbP+bh} L ${sbP+(s-2*sbP)*0.08} ${s-sbP} L ${sbP} ${sbP+bh} L ${sbP+scr} ${sbP+bh} Q ${sbP} ${sbP+bh} ${sbP} ${sbP+bh-scr} L ${sbP} ${sbP+scr} Q ${sbP} ${sbP} ${sbP+scr} ${sbP} Z`;
    }
    case 'burst': {
      const cx=s/2, cy=s/2, outerR=inner/2, innerR=outerR*0.62, buN=18;
      const pts = Array.from({length:buN*2},(_,i)=>{const r=i%2===0?outerR:innerR;const a=(Math.PI/buN)*i-Math.PI/2;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;});
      return `M ${pts[0]} ${pts.slice(1).map(p=>`L ${p}`).join(' ')} Z`;
    }
    case 'scroll': {
      const scP=pad, scW=s-2*scP, scCH=scW*0.74, scCY=(s-scCH)/2, scCurl=scW*0.11;
      return `M ${scP} ${scCY+scCurl} Q ${scP} ${scCY} ${scP+scCurl} ${scCY} L ${s-scP-scCurl} ${scCY} Q ${s-scP} ${scCY} ${s-scP} ${scCY+scCurl} L ${s-scP} ${scCY+scCH-scCurl} Q ${s-scP} ${scCY+scCH} ${s-scP-scCurl} ${scCY+scCH} Q ${s/2} ${scCY+scCH+scCurl*0.7} ${scP+scCurl} ${scCY+scCH} Q ${scP} ${scCY+scCH} ${scP} ${scCY+scCH-scCurl} Z`;
    }
    default: return '';
  }
}

// ============================================
// BORDER COLOR PALETTE
// ============================================
export const BORDER_COLORS = [
  { id: 'none', label: traduire('Aucun'), color: null as string | null },
  { id: 'theme', label: traduire('Theme'), color: null as string | null },
  { id: 'white', label: 'Blanc', color: '#FFFFFF' },
  { id: 'black', label: 'Noir', color: '#1A1A1A' },
  { id: 'gold', label: 'Or', color: '#FFD700' },
  { id: 'silver', label: traduire('Argent'), color: '#C0C0C0' },
  { id: 'rose', label: 'Rose', color: '#F06292' },
  { id: 'red', label: traduire('Rouge'), color: '#EF4444' },
  { id: 'orange', label: traduire('Orange'), color: '#F97316' },
  { id: 'cyan', label: traduire('Cyan'), color: '#06B6D4' },
  { id: 'purple', label: 'Violet', color: '#8B5CF6' },
  { id: 'green', label: 'Vert', color: '#10B981' },
  { id: 'blue', label: traduire('Bleu'), color: '#3B82F6' },
];

export const BORDER_THICKNESS_OPTIONS = [
  { id: 'thin', label: traduire('Fine'), value: 1.5 },
  { id: 'normal', label: traduire('Normale'), value: 2.5 },
  { id: 'thick', label: traduire('Epaisse'), value: 5 },
];

export const BORDER_EFFECT_OPTIONS = [
  { id: 'none' as BorderEffect, label: traduire('Solide') },
  { id: 'gold' as BorderEffect, label: traduire('Or brillant') },
  { id: 'neon' as BorderEffect, label: traduire('Neon') },
];

// ============================================
// ROUTE : redirection vers Reglages
// ============================================
export default function FrameSelectionScreen() {
  // 16 octobre 2026 : le contour du rond de profil vit dans Photo et contour (app/settings/photo.tsx)
  return <Redirect href={'/settings/photo' as any} />;
}
