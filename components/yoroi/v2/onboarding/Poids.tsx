/**
 * Ecran 6 : ton poids aujourd'hui, a la regle (comme l'ecran Pesee) ou au clavier.
 * Dans un vrai build, « Reprendre ma derniere pesee » demande l'acces a la sante a ce moment-la seulement.
 * Valider enregistre une vraie pesee et montre ce que l'armure a reellement credite.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import Svg, { Circle } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Icon as IconS } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { Cercles, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { fontStyle } from '@/components/yoroi/fonts';
import type { Reward } from '@/lib/v2/onboarding/draft';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { Ruler } from './Ruler';
import { PAS_KG, Pas } from './Pas';
import { MainButton, Riche, Shell, kg, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

const MIN = 30;
const MAX = 250;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));

/** 26 octobre 2026 : la valeur qui se remplit doucement, de la valeur de depart a la valeur d'arrivee (Reduire les animations : tout de suite) */
function useRemplissage(from: number, to: number, calme: boolean): number {
  const [v, setV] = useState(calme ? to : from);
  useEffect(() => {
    if (calme) {
      setV(to);
      return;
    }
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
  }, [from, to, calme]);
  return v;
}

const OR = '#E3C47B';
const TAILLE = 64;
const TRAIT = 7;

/** Une pastille : pleine (coche), en cours (anneau dore et pourcentage) ou a venir (icone, plus tard) */
function PastilleProgres({ part, etat, icone, legende }: { part: number; etat: 'pleine' | 'en_cours' | 'a_venir'; icone: IconName; legende: string }) {
  const { theme } = useYoroiTheme();
  const tc = theme.colors;
  const r = (TAILLE - TRAIT) / 2;
  const tour = 2 * Math.PI * r;
  const visible = etat === 'en_cours' ? Math.max(0.06, Math.min(1, part)) : 0;
  const pct = Math.max(1, Math.round(Math.min(1, part) * 100));
  return (
    <View style={{ alignItems: 'center', gap: 6, width: TAILLE + 12 }}>
      <View style={{ width: TAILLE, height: TAILLE, alignItems: 'center', justifyContent: 'center' }}>
        {etat === 'pleine' ? (
          <View style={{ width: TAILLE, height: TAILLE, borderRadius: TAILLE / 2, backgroundColor: OR, alignItems: 'center', justifyContent: 'center' }}>
            <IconS name="check" size={28} color="#3A2A08" strokeWidth={3} />
          </View>
        ) : etat === 'en_cours' ? (
          <>
            <Svg width={TAILLE} height={TAILLE} style={{ position: 'absolute' }}>
              <Circle cx={TAILLE / 2} cy={TAILLE / 2} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={TRAIT} fill="rgba(255,255,255,0.10)" />
              <Circle
                cx={TAILLE / 2}
                cy={TAILLE / 2}
                r={r}
                stroke={OR}
                strokeWidth={TRAIT}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${tour * visible} ${tour}`}
                transform={`rotate(-90 ${TAILLE / 2} ${TAILLE / 2})`}
              />
            </Svg>
            <Ink size={17} weight="black" tight color={tc.onDark}>{`${pct} %`}</Ink>
          </>
        ) : (
          <View style={{ width: TAILLE - 8, height: TAILLE - 8, borderRadius: (TAILLE - 8) / 2, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <IconS name={icone} size={22} color={tc.onDarkSecondary} />
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9, backgroundColor: etat === 'a_venir' ? 'rgba(255,255,255,0.12)' : OR }}>
        <Ink size={10.5} weight="black" color={etat === 'a_venir' ? tc.onDarkSecondary : '#3A2A08'} numberOfLines={1}>{legende}</Ink>
      </View>
    </View>
  );
}

/** Vague 45 : les phrases suivent l'univers choisi (les plaques d'armure au Japon, des pastilles en Classique et sans personnage).
 * 26 octobre 2026 (Houari : « les pastilles sont vides, c'est normal ? », « ta tenue », on ne comprend pas) :
 * on dit simplement ce que c'est, des recompenses a remplir dans l'onglet Dojo, et l'apercu montre la premiere
 * en train de se remplir (pourcentage), les suivantes a venir avec leur icone. */
function textesRecompense(u: ChoixUnivers, pct: number, premiere: boolean): { haut: string; bas: string; aVenir: string } {
  if (!premiere) {
    return {
      haut: u === 'japon' ? traduire('Tes récompenses sont des plaques d’armure à remplir. Tu les retrouves dans l’onglet Dojo.') : traduire('Tes récompenses sont des pastilles à remplir. Tu les retrouves dans l’onglet Dojo.'),
      bas: traduire('Celle en cours est remplie à **{0} %**. Chaque pesée et chaque séance la complètent, puis la suivante s’ouvre.', pct),
      aVenir: u === 'japon' ? traduire('Tes prochaines plaques') : traduire('Tes prochaines pastilles'),
    };
  }
  if (u === 'japon') {
    return {
      haut: traduire('Tes récompenses sont des plaques d’armure à remplir. Tu les retrouves dans l’onglet Dojo.'),
      bas: traduire('Ta première plaque est déjà remplie à **{0} %**. Chaque pesée et chaque séance la complètent, puis la suivante s’ouvre.', pct),
      aVenir: traduire('Tes prochaines plaques'),
    };
  }
  return {
    haut: traduire('Tes récompenses sont des pastilles à remplir. Tu les retrouves dans l’onglet Dojo.'),
    bas: traduire('Ta première pastille est déjà remplie à **{0} %**. Chaque pesée et chaque séance la complètent, puis la suivante s’ouvre.', pct),
    aVenir: traduire('Tes prochaines pastilles'),
  };
}

const ICONES_A_VENIR: IconName[] = ['dumbbell', 'trophy'];

export function RewardPanel({ reward, univers = 'japon' }: { reward: Reward; univers?: ChoixUnivers }) {
  const c = useColors();
  const pal = usePaletteProgramme();
  const { theme } = useYoroiTheme();
  const tc = theme.colors;
  const calme = !!useReducedMotion();
  const v = useRemplissage(Math.max(0, reward.platesBefore), Math.max(0, Math.min(3, reward.platesAfter)), calme);
  // la pastille en cours : la premiere qui n'est pas pleine (au moins la premiere)
  const enCours = Math.max(0, Math.min(2, Math.floor(v)));
  const partEnCours = Math.max(0, Math.min(1, v - enCours));
  const pctFinal = Math.max(1, Math.round(Math.min(1, Math.max(0, reward.platesAfter - Math.floor(Math.min(2, reward.platesAfter)))) * 100));
  const t = textesRecompense(univers, pctFinal, reward.platesAfter < 1);
  return (
    <Animated.View entering={FadeInDown.duration(380)} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: pal.vertTint, alignItems: 'center', justifyContent: 'center' }}>
          <IconS name="medal" size={22} color={pal.vert} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={18} weight="black">{traduire("Ton suivi commence")}</Ink>
          <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{t.haut}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {reward.lines.map((l, i) => (
          <Animated.View key={`${l.label}${i}`} entering={FadeInDown.delay(250 + i * 140).duration(300)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: pal.teinte }}>
            <IconS name="check" size={13} color={pal.indigo} strokeWidth={3} />
            <Ink size={13} weight="bold" color={pal.indigo}>{traduire(l.label)}</Ink>
          </Animated.View>
        ))}
      </View>
      <View style={{ borderRadius: 22, backgroundColor: pal.indigo, overflow: 'hidden', padding: 16, gap: 14 }}>
        <Cercles />
        <Ink size={11} weight="black" color={tc.onDarkSecondary} style={{ letterSpacing: 0.6 }}>{traduire('APERÇU DE TA PROGRESSION')}</Ink>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start' }} accessible accessibilityLabel={`${traduire('Ta progression')} : ${pctFinal} %. ${t.aVenir}.`}>
          {[0, 1, 2].map((i) => {
            const etat = i < enCours ? 'pleine' : i === enCours ? 'en_cours' : 'a_venir';
            const legende = etat === 'pleine' ? traduire('Pleine') : etat === 'en_cours' ? traduire('En cours') : traduire('À venir');
            return <PastilleProgres key={i} part={etat === 'en_cours' ? partEnCours : 0} etat={etat} icone={ICONES_A_VENIR[(i + 1) % 2]} legende={legende} />;
          })}
        </View>
        <Riche size={13} lineHeight={18} color={tc.onDark} ink={OR} text={t.bas} />
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
