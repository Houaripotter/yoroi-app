/**
 * Morceaux des ecrans Appareils et Connexion sante : guide par marque,
 * feuille de diagnostic, tableau de ce que chaque appareil envoie.
 */
import React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seances/ui';
import type { BrandConfig } from './brands';
import { DATA_MATRIX, DATA_TYPE_LABELS, SOURCE_DISPLAY } from './brands';
import { SanteIcon } from './SanteIcon';
import { Accordion, BrandMark, S, SmallButton, Steps } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export function BrandGuide({ brand, detected }: { brand: BrandConfig; detected?: boolean }) {
  const ios = Platform.OS !== 'android';
  const steps = ios ? brand.stepsIOS : brand.stepsAndroid;
  const intro = ios ? brand.introIOS : brand.introAndroid;
  return (
    <Accordion title={traduire(brand.name)} sub={brand.types.join(', ')} badge={detected ? traduire('Détecté') : undefined} color={brand.color} mark={<BrandMark text={brand.emoji} kind={brand.key === 'scales' ? 'Balance' : undefined} />}>
      {intro ? (
        <View style={{ borderRadius: 16, backgroundColor: '#F7F5F0', padding: 12 }}>
          <Ink size={13} weight="medium" color={S.ink2}>
            {intro}
          </Ink>
        </View>
      ) : null}
      {steps.length > 0 ? <Steps steps={steps} color={brand.color} /> : null}
    </Accordion>
  );
}

export type SheetAction = { label: string; onPress: () => void; tone?: 'ink' | 'red' | 'light' };

/** Feuille qui affiche un rapport ligne a ligne, avec actions en bas */
export function LinesSheet({ visible, title, lines, actions, onClose }: { visible: boolean; title: string; lines: string[]; actions?: SheetAction[]; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 14, gap: 3 }}>
        {lines.map((l, i) =>
          l === '' ? (
            <View key={i} style={{ height: 8 }} />
          ) : (
            <Ink key={i} size={13} weight={/^(Autorisation de lecture|Module Swift|Lecture Apple Santé|Base YOROI)$/.test(l) || l.startsWith('Cause') ? 'extraBold' : 'medium'} color={l.startsWith('Cause') ? S.danger : S.ink}>
              {l}
            </Ink>
          ),
        )}
      </View>
      {(actions ?? []).map((a) => (
        <SmallButton key={a.label} label={traduire(a.label)} tone={a.tone ?? 'ink'} onPress={a.onPress} />
      ))}
      <SmallButton label={traduire("Fermer")} tone="light" onPress={onClose} />
    </Sheet>
  );
}

const MATRIX_TYPES = ['weight', 'body_fat', 'heart_rate', 'hrv', 'sleep', 'steps', 'calories_active', 'vo2max'];

/** Ce que chaque appareil envoie : points pleins quand la mesure existe */
export function DataMatrix() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ paddingVertical: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8 }}>
          <View style={{ width: 112 }} />
          {MATRIX_TYPES.map((t) => (
            <View key={t} style={{ width: 62, alignItems: 'center' }}>
              <Ink size={11} weight="extraBold" color={S.ink2} style={{ textAlign: 'center' }}>
                {DATA_TYPE_LABELS[t] ?? t}
              </Ink>
            </View>
          ))}
        </View>
        {Object.entries(DATA_MATRIX).map(([k, types]) => {
          const d = SOURCE_DISPLAY[k];
          if (!d) return null;
          return (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, borderTopWidth: 1, borderTopColor: S.line2 }}>
              <View style={{ width: 112, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
                <Ink size={12} weight="extraBold" numberOfLines={1} style={{ flex: 1 }}>
                  {traduire(d.name)}
                </Ink>
              </View>
              {MATRIX_TYPES.map((t) => (
                <View key={t} style={{ width: 62, alignItems: 'center' }}>
                  {types.includes(t) ? <SanteIcon name="check" size={16} color={S.mossText} width={2.6} /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: S.line }} />}
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
