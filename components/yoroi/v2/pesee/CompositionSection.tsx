/**
 * Section Composition de la pesee : repliable, chaque mesure de la balance a sa ligne,
 * pre-remplie (Apple Sante du jour, sinon ta derniere saisie) avec sa provenance ecrite en petit.
 */
import React from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { COMPO_FIELDS, fmtValue } from '@/lib/v2/pesee/fields';
import type { CompoField, FieldSpec } from '@/lib/v2/pesee/fields';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export type Origin = 'health' | 'row' | 'last' | 'user' | 'none';

type Props = {
  open: boolean;
  onToggle: () => void;
  text: Partial<Record<CompoField, string>>;
  origin: Partial<Record<CompoField, Origin>>;
  /** date courte de la derniere saisie, par mesure */
  lastDate: Partial<Record<CompoField, string>>;
  onChange: (k: CompoField, t: string) => void;
  onBump: (k: CompoField, dir: 1 | -1) => void;
  /** « depuis Apple Santé, balance Withings » */
  healthText?: string;
  /** nom de la marque de la balance, pour dire ou recopier */
  scaleBrand?: string;
  provider: string;
  live: boolean;
  lean?: number;
  bmi?: { value: number; from: 'health' | 'calc' };
};

export function CompositionSection({ open, onToggle, text, origin, lastDate, onChange, onBump, healthText, scaleBrand, provider, live, lean, bmi }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const filled = COMPO_FIELDS.filter((f) => text[f.key]);
  const fromHealth = COMPO_FIELDS.some((f) => origin[f.key] === 'health');
  // Vague 31 : si tout vient de la pesee deja enregistree ce jour-la, on le dit une fois dans le resume, pas sous chaque ligne
  const allRow = filled.length > 0 && filled.every((f) => origin[f.key] === 'row');

  const summary = filled.length === 0
    ? traduire('masse grasse, muscle, eau, os, viscérale')
    : allRow
    ? traduirePluriel(filled.length, filled.length > 1, "{0} mesure déjà enregistrée ce jour", "{0} mesures déjà enregistrées ce jour", filled.length)
    : `${filled.length} ${filled.length > 1 ? traduire('mesures pré-remplies') : traduire('mesure pré-remplie')}${fromHealth ? `, ${healthText ?? traduire("depuis {0}", provider)}` : ''}`;

  const subOf = (f: FieldSpec): { t: string; tone: 'health' | 'muted' | 'plain' } => {
    const o = origin[f.key] ?? 'none';
    if (o === 'health') return { t: healthText ?? traduire("depuis {0}", provider), tone: 'health' };
    if (o === 'row') return { t: allRow ? '' : traduire('déjà enregistrée ce jour'), tone: 'plain' };
    if (o === 'last') return { t: lastDate[f.key] ? traduire("ta dernière mesure, le {0}", lastDate[f.key]) : traduire('ta dernière mesure'), tone: 'muted' };
    if (o === 'user') return { t: traduire('saisie à la main'), tone: 'plain' };
    if (!f.fromHealth && live && scaleBrand) return { t: traduire("à recopier depuis l’app {0}", scaleBrand), tone: 'plain' };
    return { t: f.hint ?? traduire('si ta balance la donne'), tone: 'plain' };
  };

  return (
    <View style={{ borderRadius: 22, backgroundColor: blancA(0.78), borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? traduire('Masquer la composition') : traduire('Afficher la composition')}
        style={({ pressed }) => ({ minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
      >
        <BodyGlyph color={c.indigo} bg={c.indigoTint} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={16} weight="extraBold">{traduire("Composition")}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{summary}</Ink>
        </View>
        <Svg width={18} height={18} viewBox="0 0 24 24" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Path d="M6 9l6 6 6-6" stroke={c.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>

      {open ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          {COMPO_FIELDS.map((f) => {
            const sub = subOf(f);
            const muted = origin[f.key] === 'last';
            return (
              <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, borderTopWidth: 1, borderColor: c.divider }}>
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <Ink size={14} weight="bold" numberOfLines={2}>{traduire(f.label)}</Ink>
                  {sub.t ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {sub.tone === 'health' ? <HeartDot color={c.indigo} /> : null}
                      <Ink size={12} color={sub.tone === 'health' ? c.indigo : c.textSecondary} numberOfLines={2} style={{ flexShrink: 1 }}>{sub.t}</Ink>
                    </View>
                  ) : null}
                </View>
                <Pressable onPress={() => onBump(f.key, -1)} accessibilityRole="button" accessibilityLabel={traduire("{0}, moins", f.label)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? c.fillSoft : c.fillSubtle, alignItems: 'center', justifyContent: 'center' })}>
                  <Ink size={20} weight="extraBold">−</Ink>
                </Pressable>
                <View style={{ width: 90, height: 50, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                  <TextInput
                    value={text[f.key] ?? ''}
                    onChangeText={(t) => onChange(f.key, t.replace('.', DECIMAL))}
                    placeholder={f.int ? '0' : '0,0'}
                    placeholderTextColor={c.textMuted}
                    keyboardType={f.int ? 'number-pad' : 'decimal-pad'}
                    returnKeyType="done"
                    selectTextOnFocus
                    maxLength={6}
                    accessibilityLabel={`${f.label} en ${f.unit}`}
                    style={[fontStyle('black'), { flexShrink: 1, minWidth: 40, height: 44, fontSize: 20, lineHeight: Platform.OS === 'ios' ? undefined : 26, color: muted ? c.textSecondary : c.ink, textAlign: 'right', paddingVertical: 0, includeFontPadding: false }]}
                  />
                  <Ink size={11} weight="bold" color={c.textSecondary} style={{ marginLeft: 4 }}>{f.unit}</Ink>
                </View>
                <Pressable onPress={() => onBump(f.key, 1)} accessibilityRole="button" accessibilityLabel={traduire("{0}, plus", f.label)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pressed ? c.fillSoft : c.fillSubtle, alignItems: 'center', justifyContent: 'center' })}>
                  <Ink size={20} weight="extraBold">+</Ink>
                </Pressable>
              </View>
            );
          })}

          {lean || bmi ? (
            <View style={{ flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderColor: c.divider }}>
              {lean ? <Info label={traduire("Masse maigre")} value={`${fmtValue(lean)} kg`} sub={traduire("lue dans {0}", provider)} /> : null}
              {bmi ? <Info label={traduire("IMC")} value={fmtValue(bmi.value)} sub={bmi.from === 'health' ? traduire("lu dans {0}", provider) : traduire('calculé avec ta taille')} /> : null}
            </View>
          ) : null}

          <Ink size={12} color={c.textSecondary} style={{ marginTop: 12 }}>
            {scaleBrand != null ? traduire("{0} reçoit de ta balance le poids, la masse grasse et la masse maigre. La masse musculaire, l’eau, l’os et la graisse viscérale n’y passent pas : recopie ces mesures depuis l’app {1}. Une mesure grisée vient de ta dernière saisie : tu peux l’ajuster ou l’effacer.", provider, scaleBrand) : traduire("{0} reçoit de ta balance le poids, la masse grasse et la masse maigre. La masse musculaire, l’eau, l’os et la graisse viscérale n’y passent pas : recopie ces mesures depuis l’app de ta balance. Une mesure grisée vient de ta dernière saisie : tu peux l’ajuster ou l’effacer.", provider)}
          </Ink>
        </View>
      ) : null}
    </View>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: c.indigoTint, gap: 2 }}>
      <Ink size={12} weight="bold" color={c.textSecondary}>{label}</Ink>
      <Ink size={20} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{value}</Ink>
      <Ink size={11} color={c.textSecondary} numberOfLines={2}>{sub}</Ink>
    </View>
  );
}

export function HeartDot({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={color} />
    </Svg>
  );
}

function BodyGlyph({ color, bg }: { color: string; bg: string }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path d="M12 3.5a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z" fill={color} />
        <Path d="M6 10.5l6-1.5 6 1.5M12 9v6.5M12 15.5l-3 5M12 15.5l3 5" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
