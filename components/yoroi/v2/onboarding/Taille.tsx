/**
 * Ecran 9 (vague 27, facultatif) : ta taille, a la regle. Elle sert a l'IMC (profil, carte Poids)
 * et a la silhouette du personnage si tu choisis qu'il te ressemble (Reglages, Apparence).
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Ruler } from './Ruler';
import { PAS_CM, Pas } from './Pas';
import { MainButton, Riche, Shell, kg, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

export function bmi(weight: number, heightCm: number | null): number | null {
  if (!heightCm || heightCm < 100 || heightCm > 250) return null;
  const m = heightCm / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

export function Taille({ nav, height, weight, genre, onHeight, onNext }: {
  nav: Nav;
  height: number | null;
  weight: number;
  genre: 'h' | 'f';
  onHeight: (v: number) => void;
  onNext: () => void;
}) {
  const c = useColors();
  const shown = height ?? (genre === 'f' ? 165 : 175);
  const imc = bmi(weight, height);
  return (
    <Shell {...nav} title={traduire("Et **ta taille** ?")} sub={traduire("Pour ton IMC, et pour que ton personnage prenne ta silhouette si tu le veux.")} footer={<MainButton label={height ? traduire('Continuer') : traduire('Valider ma taille')} onPress={() => { if (!height) onHeight(shown); onNext(); }} />}>
      <View style={{ alignItems: 'center', gap: 2, paddingTop: 10 }} accessibilityLiveRegion="polite">
        <Ink size={88} weight="black" tight style={{ letterSpacing: -3, fontVariant: ['tabular-nums'] }}>{String(shown)}</Ink>
        <Ink size={17} weight="bold" color={c.textSecondary}>{traduire("centimètres")}</Ink>
      </View>
      <Ruler value={shown} onChange={(v) => onHeight(Math.round(v))} step={1} tick={10} span={40} hardMin={120} hardMax={230} label={traduire("Règle de taille, fais glisser pour régler")} />
      {/* vague 30 : au centimètre ou par 5, appui long pour aller vite */}
      <Pas value={shown} onChange={(v) => onHeight(Math.round(v))} pas={PAS_CM} clamp={(v) => Math.min(230, Math.max(120, Math.round(v)))} />
      <View style={{ borderRadius: 18, backgroundColor: c.accentTint, padding: 14, minHeight: 50, justifyContent: 'center' }}>
        <Riche size={14} color={c.ink} lineHeight={20} text={imc ? traduire("Ton IMC aujourd’hui : **{0}**. Un repère parmi d’autres, ta composition compte aussi.", kg(imc)) : traduire('Fais glisser la règle ou touche les boutons. Tu pourras la changer dans ton profil.')} />
      </View>
    </Shell>
  );
}

export default Taille;
