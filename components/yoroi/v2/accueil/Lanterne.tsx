/**
 * Petite lanterne de l'accueil (vague 35) : un toucher fait tourner Clair, Sombre et Auto (comme ton iPhone).
 * Eteinte en clair, allumee en sombre, une demi-lueur en auto. Un petit message dit le mode choisi.
 * Le meme choix se trouve dans Reglages, Apparence.
 * 27 octobre 2026 (refonte Pastel) : prop relief, la lanterne dans un rond blanc de 46 en relief, a cote de la cloche.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme, libelleMode } from '@/components/yoroi/YoroiThemeProvider';
import type { YoroiMode } from '@/components/yoroi/tokens';
import { Press, RondRelief } from './kit';
import { traduire } from '@/lib/i18n/tr';

/** Diametre du rond (la zone de toucher monte a 44 points avec hitSlop) */
export const ROND_ENTETE = 34;

/** Fond du petit rond translucide, selon que la scene derriere est sombre ou claire */
export function verreEntete(sceneSombre: boolean): { backgroundColor: string; borderColor: string } {
  return sceneSombre
    ? { backgroundColor: 'rgba(14,17,26,0.38)', borderColor: 'rgba(255,255,255,0.22)' }
    : { backgroundColor: 'rgba(255,255,255,0.55)', borderColor: 'rgba(255,255,255,0.8)' };
}

/** Le dessin seul : chochin rond, cerclages, chapeau et pied laques */
export function LanterneDessin({ mode, size = 22 }: { mode: YoroiMode; size?: number }) {
  const allumee = mode === 'sombre';
  const demi = mode === 'auto';
  const papierEteint = '#EFE8D8';
  const papierAllume = '#FFB54D';
  const laque = '#2B2D36';
  const trait = allumee || demi ? '#B5452E' : '#8C8577';
  const corps = allumee ? 'url(#lanterneOn)' : demi ? 'url(#lanterneDemi)' : papierEteint;
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 24 27">
      <Defs>
        <SvgGradient id="lanterneOn" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD27A" />
          <Stop offset="0.55" stopColor={papierAllume} />
          <Stop offset="1" stopColor="#E9833A" />
        </SvgGradient>
        <SvgGradient id="lanterneDemi" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFC766" />
          <Stop offset="0.5" stopColor="#FFB54D" />
          <Stop offset="0.5" stopColor={papierEteint} />
          <Stop offset="1" stopColor={papierEteint} />
        </SvgGradient>
      </Defs>
      {/* lueur autour de la lanterne */}
      {allumee ? <Circle cx={12} cy={14} r={11.5} fill="#FFB54D" opacity={0.28} /> : null}
      {demi ? <Circle cx={12} cy={14} r={10.5} fill="#FFB54D" opacity={0.14} /> : null}
      {/* crochet */}
      <Path d="M12 0.8v2.6" stroke={laque} strokeWidth={1.4} strokeLinecap="round" />
      {/* chapeau */}
      <Rect x={7.2} y={3.2} width={9.6} height={2.6} rx={1} fill={laque} />
      {/* corps */}
      <Path d="M7.6 5.8 C3.6 7.4 3 10.6 3 14 C3 17.4 3.6 20.6 7.6 22.2 H16.4 C20.4 20.6 21 17.4 21 14 C21 10.6 20.4 7.4 16.4 5.8 Z" fill={corps} stroke={trait} strokeWidth={0.9} />
      {/* cerclages de bambou */}
      <Path d="M4.1 9.6 Q12 11.1 19.9 9.6 M3.1 14 Q12 15.6 20.9 14 M4.1 18.4 Q12 19.9 19.9 18.4" stroke={trait} strokeWidth={0.8} fill="none" opacity={0.75} />
      {/* pied */}
      <Rect x={7.8} y={22.2} width={8.4} height={2.4} rx={1} fill={laque} />
      <Path d="M12 24.6v1.8" stroke={laque} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Bouton lanterne de l'en-tete : fait tourner les modes et previent avec onChange (pour le petit message) */
export function LanterneMode({ sceneSombre, onChange, relief = false }: { sceneSombre: boolean; onChange?: (mode: YoroiMode) => void; relief?: boolean }) {
  const { mode, cycleMode } = useYoroiTheme();
  const S = ROND_ENTETE;
  return (
    <Press
      haptic="none"
      onPress={() => {
        selectionAsync().catch(() => {});
        const next = cycleMode();
        onChange?.(next);
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire("Affichage : {0}. Touche pour changer.", libelleMode(mode))}
      hitSlop={relief ? 0 : (44 - S) / 2}
    >
      {relief ? (
        <RondRelief taille={46}>
          <LanterneDessin mode={mode} size={20} />
        </RondRelief>
      ) : (
      <View style={[{ width: S, height: S, borderRadius: S / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, verreEntete(sceneSombre)]}>
        <LanterneDessin mode={mode} size={19} />
      </View>
      )}
    </Press>
  );
}
