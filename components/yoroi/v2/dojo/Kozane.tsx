/**
 * Vague 45 : pastilles de séance à la place des plaques kozane.
 * Une pastille ronde par séance : pleine (indigo, coche blanche) quand elle est faite,
 * vide (contour fin en pointillé) quand elle reste à faire, contour indigo épais quand elle est partielle.
 * Kozane garde son nom et ses props pour ne rien casser : nombre pastilles au total,
 * rempli = nombre décimal de pastilles remplies (la pastille en cours se remplit par un arc),
 * taille = diamètre d'une pastille en points.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { P } from '@/components/yoroi/livePalette';
import { getSportIcon } from '@/lib/sports';
import { traduire } from '@/lib/i18n/tr';

export type PastilleEtat = 'fait' | 'vide' | 'partiel';

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Nom d'icône MaterialCommunityIcons d'un sport, ou null si l'icône n'existe pas */
function iconeDuSport(sport?: string): McIconName | null {
  if (!sport) return null;
  const nom = getSportIcon(sport);
  const glyphes = (MaterialCommunityIcons as unknown as { glyphMap?: Record<string, number> }).glyphMap;
  if (glyphes && !(nom in glyphes)) return null;
  return nom as McIconName;
}

export type PastilleProps = {
  etat: PastilleEtat;
  /** diamètre en points */
  taille?: number;
  /** identifiant du sport (lib/sports.ts) : son icône apparaît dans la pastille à faire */
  sport?: string;
  /** pastille en cours : part déjà remplie, de 0 à 1, dessinée en arc */
  remplissage?: number;
  /** petit signe dans une pastille vide : jour de repos ou séance manquée */
  signe?: 'repos' | 'manque';
  /** 'sombre' quand la pastille est posée sur une carte encre */
  ton?: 'clair' | 'sombre';
};

/** Vague 45 : une pastille ronde de séance (faite, à faire ou partielle) */
export function Pastille({ etat, taille = 26, sport, remplissage, signe, ton = 'clair' }: PastilleProps) {
  const { theme } = useYoroiTheme();
  const accent = theme.colors.accent;
  const contour = ton === 'sombre' ? P.muted : P.dashed;
  const r = 12;

  if (etat === 'fait') {
    return (
      <Svg width={taille} height={taille} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={r} fill={accent} />
        {/* coche blanche (onAccent du thème : blanc en clair, encre sur l'indigo éclairci du mode sombre) */}
        <Path d="M7.6 13.4 L11.3 17 L18.4 9.6" stroke={theme.colors.onAccent} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    );
  }

  if (etat === 'partiel') {
    return (
      <Svg width={taille} height={taille} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={r - 1.2} fill={P.accentSoft} stroke={accent} strokeWidth={2.6} />
      </Svg>
    );
  }

  const icone = iconeDuSport(sport);
  const part = remplissage !== undefined ? Math.max(0, Math.min(1, remplissage)) : 0;
  const circ = 2 * Math.PI * (r - 1.2);
  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={taille} height={taille} viewBox="0 0 26 26" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Circle cx={13} cy={13} r={r - 0.6} fill="none" stroke={contour} strokeWidth={1.2} strokeDasharray="2.6 2.2" />
        {part > 0.02 ? (
          <>
            <Circle cx={13} cy={13} r={r - 1.2} fill={P.accentSoft} opacity={0.6} />
            <Circle
              cx={13}
              cy={13}
              r={r - 1.2}
              fill="none"
              stroke={accent}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeDasharray={`${(circ * part).toFixed(2)} ${circ.toFixed(2)}`}
              transform="rotate(-90 13 13)"
            />
          </>
        ) : null}
        {signe === 'manque' ? <Path d="M9 13 H17" stroke={P.muted} strokeWidth={2} strokeLinecap="round" /> : null}
        {signe === 'repos' ? <Path d="M15.6 10.6a4.4 4.4 0 1 1-5-2.4 3.4 3.4 0 0 0 5 2.4z" fill={P.muted} /> : null}
      </Svg>
      {icone && !signe ? <MaterialCommunityIcons name={icone} size={Math.round(taille * 0.52)} color={P.muted} /> : null}
    </View>
  );
}

export type KozaneProps = {
  nombre: number;
  rempli: number;
  taille?: number;
  /** 'clair' sur fond papier, 'sombre' sur une carte encre */
  ton?: 'clair' | 'sombre';
  /** index de la pastille mise en avant (la dernière gagnée, par exemple) */
  lumiere?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** identifiant du sport : son icône apparaît dans les pastilles à faire */
  sport?: string;
  /** écart entre deux pastilles */
  ecart?: number;
};

/** Vague 45 : rangée de pastilles de séance à la place des plaques kozane (passe à la ligne si besoin) */
export function Kozane({ nombre, rempli, taille = 30, ton = 'clair', lumiere, style, accessibilityLabel, sport, ecart }: KozaneProps) {
  const full = Math.floor(rempli);
  const part = rempli - full;
  const gap = ecart ?? Math.max(4, Math.round(taille * 0.18));
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? traduire("{0} sur {1}", full, nombre)}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }, style]}
    >
      {Array.from({ length: Math.max(0, nombre) }).map((_, i) => {
        const on = i < full;
        const enCours = !on && i === full && part > 0.02;
        const lit = lumiere === i;
        return (
          <View key={i} style={lit ? { transform: [{ scale: 1.1 }] } : null}>
            <Pastille etat={on ? 'fait' : 'vide'} taille={taille} sport={sport} remplissage={enCours ? part : undefined} ton={ton} />
          </View>
        );
      })}
    </View>
  );
}

export default Kozane;
