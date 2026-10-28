/**
 * Bras, jambes, tronc : la graisse (%) et le muscle (kg) de chaque segment, quand la balance les donne
 * (Tanita BC-545N et autres balances segmentaires, souvent importes depuis une photo).
 * L'ecart entre droite et gauche, et la morphologie (physique rating de 1 a 9).
 * Rien ne s'affiche sans mesure. Couleurs de composition : graisse ambre, muscle violet indigo.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import { CORPS } from '@/lib/v2/progres/couleursCorps';
import type { CompoPoint, SegmentId } from '@/lib/v2/progres/composition';
import { num } from '@/lib/v2/progres/format';
import { BALANCE_FIELDS, fmtAutre, fmtBalance } from '@/lib/v2/balance/format';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const ROWS: { id: SegmentId; label: string }[] = [
  { id: 'arm_right', label: traduire('Bras droit') },
  { id: 'arm_left', label: traduire('Bras gauche') },
  { id: 'trunk', label: traduire('Tronc') },
  { id: 'leg_right', label: traduire('Jambe droite') },
  { id: 'leg_left', label: traduire('Jambe gauche') },
];

const PHYSIQUE: Record<number, string> = {
  1: traduire('obésité cachée'),
  2: traduire('obèse'),
  3: 'costaud',
  4: traduire('manque d’exercice'),
  5: 'standard',
  6: traduire('standard musclé'),
  7: 'mince',
  8: traduire('mince et musclé'),
  9: traduire('très musclé'),
};

/** L'ecart droite gauche d'une paire, en phrase courte */
function gap(what: 'Bras' | 'Jambes', right?: number, left?: number): string | null {
  if (right === undefined || left === undefined) return null;
  const d = Math.round((right - left) * 10) / 10;
  if (Math.abs(d) < 0.1) return traduire("{0} : autant de muscle à droite qu’à gauche", traduire(what));
  return traduire("{0} : {1} kg de muscle de plus à {2}", traduire(what), num(Math.abs(d), 1), d > 0 ? traduire('droite') : traduire('gauche'));
}

export function hasSegments(p: CompoPoint | null | undefined): boolean {
  return !!(p && (p.seg || p.physique));
}

export function SegmentsCard({ point, style }: { point: CompoPoint; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (!hasSegments(point)) return null;
  const fat = point.seg?.fat ?? {};
  const muscle = point.seg?.muscle ?? {};
  const rows = ROWS.filter((r) => fat[r.id] !== undefined || muscle[r.id] !== undefined);
  const hasFat = rows.some((r) => fat[r.id] !== undefined);
  const hasMuscle = rows.some((r) => muscle[r.id] !== undefined);
  const lines = [gap('Bras', muscle.arm_right, muscle.arm_left), gap('Jambes', muscle.leg_right, muscle.leg_left)].filter((l): l is string => !!l);
  const physique = point.physique ? Math.round(point.physique) : undefined;

  return (
    <View style={[{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, padding: 16, gap: 10 }, style]}>
      {rows.length ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{traduire("Bras, jambes, tronc")}</Ink>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 106 }} />
            {hasFat ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CORPS.graisse }} />
                <Ink size={12} weight="bold" color={c.textSecondary}>Graisse</Ink>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {hasMuscle ? (
              <View style={{ width: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CORPS.muscle }} />
                <Ink size={12} weight="bold" color={c.textSecondary}>Muscle</Ink>
              </View>
            ) : null}
          </View>
          {rows.map((r, i) => {
            const f = fat[r.id];
            const m = muscle[r.id];
            return (
              <View
                key={r.id}
                accessible
                accessibilityLabel={`${traduire(r.label)}${f !== undefined ? traduire(", graisse {0} pour cent", num(f, 1)) : ''}${m !== undefined ? traduire(", muscle {0} kilos", num(m, 1)) : ''}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider, paddingTop: i === 0 ? 0 : 8 }}
              >
                <Ink size={13} weight="extraBold" numberOfLines={1} style={{ width: 106 }}>{traduire(r.label)}</Ink>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {f !== undefined ? (
                    <>
                      <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: c.fillSoft, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.min(100, (f / 50) * 100)}%`, height: 10, borderRadius: 5, backgroundColor: CORPS.graisse }} />
                      </View>
                      <Ink size={13} weight="black" numberOfLines={1} style={{ width: 46, textAlign: 'right' }}>{`${num(f, 1)} %`}</Ink>
                    </>
                  ) : null}
                </View>
                {hasMuscle ? (
                  <Ink size={13} weight="black" numberOfLines={1} style={{ width: 64, textAlign: 'right' }}>
                    {m !== undefined ? `${num(m, 1)} kg` : ''}
                  </Ink>
                ) : null}
              </View>
            );
          })}
          {lines.length ? (
            <View style={{ gap: 2, paddingTop: 8, borderTopWidth: 1, borderColor: c.divider }}>
              {lines.map((l) => (
                <Ink key={l} size={12} color={c.textSecondary}>{l}</Ink>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
      {physique ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: rows.length ? 10 : 0, borderTopWidth: rows.length ? 1 : 0, borderColor: c.divider }}>
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={14} weight="extraBold">{traduire("Morphologie")}</Ink>
            <Ink size={12} color={c.textSecondary} numberOfLines={2}>{traduire("Selon ta balance, de 1 à 9")}</Ink>
          </View>
          <Ink size={14} weight="black" numberOfLines={2} style={{ flexShrink: 1, textAlign: 'right' }}>{`${physique}, ${PHYSIQUE[physique] ?? ''}`}</Ink>
        </View>
      ) : null}
    </View>
  );
}

/**
 * BALANCE 2 : « Autres mesures de ta balance », tout ce que la balance a donne en plus (masse maigre, proteines,
 * angle de phase, lignes autre de la consigne...). Rien ne s'affiche sans mesure.
 */
export function ExtrasCard({ point, style }: { point: CompoPoint; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const mesures = point.extra?.mesures ?? {};
  const known = BALANCE_FIELDS.filter((f) => typeof mesures[f.key] === 'number');
  const autres = point.extra?.autres ?? [];
  if (!known.length && !autres.length) return null;
  const rows: { id: string; label: string; value: string; dot: string }[] = [
    ...known.map((f) => ({
      id: f.key,
      label: f.label,
      value: `${fmtBalance(mesures[f.key], f.step)}${f.unit && f.unit !== 'points' ? ` ${traduire(f.unit)}` : f.unit === 'points' ? traduire(' sur 100') : ''}`,
      dot: f.kind ? CORPS[f.kind] : c.textMuted,
    })),
    ...autres.map((a, i) => ({ id: `autre_${i}`, label: sansTiret(a.nom), value: `${fmtAutre(a.valeur)}${a.unite ? ` ${a.unite}` : ''}`, dot: c.textMuted })),
  ];
  return (
    <View style={[{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, padding: 16, gap: 6 }, style]}>
      <Ink size={15} weight="extraBold">{traduire("Autres mesures de ta balance")}</Ink>
      <Ink size={12} color={c.textSecondary} style={{ marginBottom: 4 }}>{traduire("Telles que ta balance les affiche, sur sa propre échelle.")}</Ink>
      {rows.map((r, i) => (
        <View
          key={r.id}
          accessible
          accessibilityLabel={`${traduire(r.label)}, ${r.value}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider, paddingTop: i === 0 ? 0 : 6 }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.dot }} />
          <Ink size={13} weight="extraBold" numberOfLines={2} style={{ flex: 1 }}>{traduire(r.label)}</Ink>
          <Ink size={13} weight="black" numberOfLines={1} style={{ flexShrink: 0, textAlign: 'right', maxWidth: '45%' }}>{r.value}</Ink>
        </View>
      ))}
    </View>
  );
}
