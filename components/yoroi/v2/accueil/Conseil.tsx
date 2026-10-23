/**
 * Carte « Le conseil du jour » de l'accueil : une icone dessinee, une phrase tiree de tes donnees,
 * et l'action qui va avec (voir sa forme, ses seances). Remplace l'ancien « Coach du jour ».
 * Un conseil qui pousse a ajouter (s'entrainer, se peser) ne lance rien : il montre le repere vers le bouton +,
 * seule zone pour ajouter, et un appui ouvre l'onglet concerne.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Training } from '@/lib/database';
import { conseilDuJour } from '@/lib/v2/accueil/conseil';
import Svg, { Path } from 'react-native-svg';
import { PlusHint } from '@/components/yoroi/v2/PlusHint';
import { Card, P, Press, useAccent } from './kit';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { devNow } from '@/lib/v2/creator/devClock';

const TONES = {
  red: { ink: P.accent, soft: P.accentSoft },
  indigo: { ink: P.indigo, soft: P.indigoSoft },
  gold: { ink: P.goldDark, soft: P.goldSoft },
  moss: { ink: P.mossText, soft: P.mossSoft },
} as const;

export function ConseilDuJour({ trainings, lastWeighIso, goal, freins }: { trainings: Training[]; lastWeighIso: string | null; goal: number; freins?: string[] }) {
  const router = useRouter();
  const today = devNow().toDateString();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const freinsKey = (freins ?? []).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const c = useMemo(() => conseilDuJour({ trainings, lastWeighIso, goal, now: devNow(), freins }), [trainings, lastWeighIso, goal, today, freinsKey]);
  const { accent, accentTint } = useAccent();
  const tone = c.tone === 'red' ? { ink: accent, soft: accentTint } : TONES[c.tone];
  // ajout : repere vers le +, et l'appui ouvre l'onglet qui montre le resultat
  const addHint = c.href === '/pesee' ? 'Touche + pour te peser' : c.href === '/seance' ? 'Touche + pour t’entraîner' : null;
  const href = c.href === '/pesee' ? '/progres' : c.href === '/seance' ? '/seances' : c.href;

  const body = (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: tone.soft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Icon name={c.picto} size={26} color={tone.ink} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Ink size={12} weight="bold" color={P.muted}>
          Le conseil du jour
        </Ink>
        <Ink size={17} weight="black" tight numberOfLines={2}>
          {c.title}
        </Ink>
        <Ink size={13} color={P.ink2}>
          {c.text}
        </Ink>
        {addHint ? (
          <PlusHint text={addHint} style={{ marginTop: 6 }} />
        ) : c.action ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ink size={14} weight="extraBold" color={tone.ink}>
              {c.action}
            </Ink>
            <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" stroke={tone.ink} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </View>
        ) : null}
      </View>
    </Card>
  );

  if (!href) return <View accessible accessibilityLabel={`Le conseil du jour : ${c.title}. ${c.text}`}>{body}</View>;
  return (
    <Press onPress={() => router.push(href as any)} accessibilityRole="button" accessibilityLabel={`Le conseil du jour : ${c.title}. ${c.text} ${addHint ?? c.action ?? ''}`}>
      {body}
    </Press>
  );
}
