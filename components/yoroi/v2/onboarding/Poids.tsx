/**
 * Ecran 6 : ton poids aujourd'hui, a la regle (comme l'ecran Pesee) ou au clavier.
 * Dans un vrai build, « Reprendre ma derniere pesee » demande l'acces a la sante a ce moment-la seulement.
 * Valider enregistre une vraie pesee et montre ce que l'armure a reellement credite.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { Kozane } from '@/components/yoroi/v2/dojo/Kozane';
import { fontStyle } from '@/components/yoroi/fonts';
import type { Reward } from '@/lib/v2/onboarding/draft';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { Ruler } from './Ruler';
import { PAS_KG, Pas } from './Pas';
import { MainButton, Shell, kg, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

const MIN = 30;
const MAX = 250;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));

/** Vague 45 : pastilles de séance (ex plaques kozane) qui se remplissent doucement de leur valeur de depart a leur valeur d'arrivee */
function FillingPlates({ from, to }: { from: number; to: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    let raf = 0;
    const start = Date.now() + 350;
    const step = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / 1100));
      const e = 1 - Math.pow(1 - t, 3);
      setV(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return <Kozane nombre={3} rempli={Math.max(v, 0.08)} taille={54} lumiere={Math.min(2, Math.floor(to))} accessibilityLabel={traduire("Ta première pastille commence à se remplir")} />;
}

/** Vague 45 : les phrases suivent l'univers choisi (l'armure au Japon, la tenue en Classique, ta progression sans personnage) */
const TEXTES_RECOMPENSE: Record<ChoixUnivers, { haut: string; bas: string }> = {
  japon: { haut: traduire('Ton armure se forme avec toi, tu la retrouves dans le Dojo.'), bas: traduire('Ta première plaque d’armure commence à se remplir. Chaque pesée et chaque séance la complètent.') },
  classique: { haut: traduire('Ta tenue se construit avec toi, tu la retrouves dans le Dojo.'), bas: traduire('Ta première pastille commence à se remplir. Chaque pesée et chaque séance la complètent.') },
  aucun: { haut: traduire('Ta progression commence, tu la suis dans le Dojo.'), bas: traduire('Ta première pastille commence à se remplir. Chaque pesée et chaque séance la complètent.') },
};

export function RewardPanel({ reward, univers = 'japon' }: { reward: Reward; univers?: ChoixUnivers }) {
  const c = useColors();
  const t = TEXTES_RECOMPENSE[univers] ?? TEXTES_RECOMPENSE.japon;
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Ink size={18} weight="black">{traduire("Ton suivi commence")}</Ink>
          <Ink size={13} color={c.textSecondary}>{t.haut}</Ink>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        {reward.lines.map((l, i) => (
          <Animated.View key={`${l.label}${i}`} entering={FadeInDown.delay(250 + i * 140).duration(300)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={12} color={c.accent} stroke={3} />
            </View>
            <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire(l.label)}</Ink>
          </Animated.View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <FillingPlates from={reward.platesBefore} to={reward.platesAfter} />
        <Ink size={13} color={c.textSecondary} style={{ flex: 1, lineHeight: 18 }}>{t.bas}</Ink>
      </View>
    </Animated.View>
  );
}

export function Poids({
  nav,
  value,
  onChange,
  origin,
  healthLabel,
  healthAvailable,
  healthName,
  onUseHealth,
  reading,
  notice,
  saving,
  reward,
  univers = 'japon',
  onValidate,
  onNext,
}: {
  nav: Nav;
  value: number;
  onChange: (v: number, fromUser: boolean) => void;
  origin: 'manual' | 'health';
  /** « Pesée du 8 octobre, balance Withings » quand la valeur vient de la sante */
  healthLabel: string | null;
  healthAvailable: boolean;
  healthName: string;
  onUseHealth: () => void;
  reading: boolean;
  notice: string | null;
  saving: boolean;
  reward: Reward | null;
  /** vague 45 : univers choisi a l'ecran 4 */
  univers?: ChoixUnivers;
  onValidate: () => void;
  onNext: () => void;
}) {
  const c = useColors();
  const [text, setText] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const endEdit = () => {
    if (text == null) return;
    const v = parseFloat(text.replace(',', '.'));
    setText(null);
    if (Number.isFinite(v) && v >= MIN && v <= MAX) onChange(clamp(v), true);
  };

  if (reward) {
    return (
      <Shell {...nav} title={traduire("**Première pesée**, c’est noté")} sub={traduire("**{0} kg**, le point de départ de ta courbe.", kg(value))} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
        <RewardPanel reward={reward} univers={univers} />
      </Shell>
    );
  }

  return (
    <Shell {...nav} title={traduire("Ton **point de départ**")} sub={traduire("Ton poids aujourd’hui. Fais glisser la règle, touche les boutons ou le chiffre.")} footer={<MainButton label={traduire("Valider mon poids")} onPress={onValidate} loading={saving} />}>
      <View style={{ alignItems: 'center', gap: 2 }} accessibilityLiveRegion="polite">
        <TextInput
          ref={inputRef}
          value={text ?? kg(value)}
          onFocus={() => setText(kg(value))}
          onChangeText={setText}
          onEndEditing={endEdit}
          onSubmitEditing={endEdit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={5}
          accessibilityLabel={traduire("Ton poids en kilos, touche pour le taper")}
          style={[fontStyle('black'), { fontSize: 88, color: c.ink, textAlign: 'center', minWidth: 200, paddingVertical: 0, letterSpacing: -3, fontVariant: ['tabular-nums'] }]}
        />
        <Ink size={17} weight="bold" color={c.textSecondary}>kilos</Ink>
        {healthLabel && origin === 'health' ? (
          <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Icon name="heart" size={14} color={c.indigo} />
            <Ink size={13} weight="bold" color={c.indigo}>{healthLabel}</Ink>
          </Animated.View>
        ) : null}
      </View>

      <Ruler value={value} onChange={(v) => onChange(v, true)} hardMin={MIN} hardMax={MAX} label={traduire("Règle de poids, fais glisser pour régler")} />

      {/* vague 30 : au kilo et au dixieme, appui long pour aller vite */}
      <Pas value={value} onChange={(v) => onChange(v, true)} pas={PAS_KG} clamp={clamp} />

      {healthAvailable && origin !== 'health' ? (
        <View style={{ borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14, gap: 10 }}>
          <Pressable onPress={reading ? undefined : onUseHealth} accessibilityRole="button" accessibilityLabel={traduire("Reprendre ma dernière pesée")} style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, backgroundColor: pressed ? c.fillSubtle : c.fillSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 })}>
            {reading ? <ActivityIndicator color={c.indigo} /> : <Icon name="heart" size={18} color={c.indigo} />}
            <Ink size={15} weight="extraBold" color={c.indigo}>{reading ? traduire('Lecture en cours') : traduire('Reprendre ma dernière pesée')}</Ink>
          </Pressable>
          <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{traduire("YOROI te demandera l’accès à {0} pour lire ta dernière pesée. Ensuite, tes pesées et tes séances arrivent toutes seules. Rien ne quitte ton téléphone.", healthName)}</Ink>
        </View>
      ) : null}
      {notice ? (
        <Ink size={13} weight="bold" color={c.textSecondary} accessibilityLiveRegion="polite">{notice}</Ink>
      ) : null}
    </Shell>
  );
}

export default Poids;
