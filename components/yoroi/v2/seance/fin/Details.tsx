/**
 * Le detail utile de la seance quand il existe (24 octobre 2026) : ton cœur (moyenne, max, zones),
 * l'intensite ressentie, les techniques travaillees. Lu dans le bilan de la seance (lib/v2/bilan).
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { BilanSeance } from '@/lib/v2/bilan/texte';
import { traduire } from '@/lib/i18n/tr';

const ZONE_TEINTES = [0.25, 0.4, 0.58, 0.78, 1];

function Chiffre({ v, l }: { v: string; l: string }) {
  const { theme } = useYoroiTheme();
  return (
    <View>
      <Ink size={22} weight="black" tight>{v}</Ink>
      <Ink size={12} weight="bold" color={theme.colors.textMuted}>{l}</Ink>
    </View>
  );
}

export function DetailsSeance({ b }: { b: BilanSeance }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const coeur = b.coeur;
  const intensite = b.intensite;
  if (!coeur && !intensite && !b.techniques.length) return null;
  return (
    <View style={{ marginHorizontal: 22, marginTop: 12, borderRadius: 22, padding: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 12 }}>
      {coeur || intensite ? (
        <View style={{ gap: 10 }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }} accessibilityRole="header">
            {coeur ? traduire("Ton cœur") : traduire("Ton ressenti")}
          </Ink>
          <View style={{ flexDirection: 'row', gap: 22 }}>
            {coeur?.fcMoy ? <Chiffre v={String(coeur.fcMoy)} l={traduire("bpm moyen")} /> : null}
            {coeur?.fcMax ? <Chiffre v={String(coeur.fcMax)} l={traduire("bpm max")} /> : null}
            {intensite ? <Chiffre v={`${intensite.valeur}/10`} l={intensite.mot} /> : null}
          </View>
          {coeur?.zones ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: c.fillSubtle }}>
                {coeur.zones.map((z) => (z.part > 0 ? <View key={z.zone} style={{ flex: z.part, backgroundColor: c.indigo, opacity: ZONE_TEINTES[z.zone - 1] }} /> : null))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {coeur.zones.map((z) => (
                  <Ink key={z.zone} size={11} weight="bold" color={c.textMuted}>{`Z${z.zone} ${Math.round(z.part * 100)} %`}</Ink>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {b.techniques.length ? (
        <View style={{ gap: 8 }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }} accessibilityRole="header">
            {b.techniquesTitre ?? traduire('Techniques')}
          </Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {b.techniques.map((t) => (
              <View key={t} style={{ paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', borderRadius: 17, backgroundColor: c.indigoTint }}>
                <Ink size={14} weight="extraBold" color={c.indigo}>{t}</Ink>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
