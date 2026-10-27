/**
 * Briques des ecrans d'import (refonte v2) : etapes numerotees, lignes analysees,
 * pastilles de type, bloc de fin avec tampon.
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, P } from '@/components/yoroi/v2/accueil/kit';
import { Icon as EIcon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { Stamp, paletteOf } from './cardKit';
import { traduire } from '@/lib/i18n/tr';

const papier = paletteOf('papier');

export function NumberedSteps({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <Card style={{ gap: 16 }}>
      {steps.map((s, i) => (
        <View key={s.title} style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ width: 36, height: 44, borderRadius: 10, backgroundColor: P.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', left: 0, right: 0, top: 26, height: 4, backgroundColor: P.detail }} />
            <Ink size={17} weight="black" color={P.paper} style={{ marginTop: -8 }}>{i + 1}</Ink>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={15} weight="extraBold">{traduire(s.title)}</Ink>
            <Ink size={13} color={P.ink2}>{traduire(s.text)}</Ink>
          </View>
        </View>
      ))}
    </Card>
  );
}

export function TypeBadge({ icon, label, tint, soft }: { icon: IconName; label: string; tint: string; soft: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: soft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
      <EIcon name={icon} size={15} color={tint} />
      <Ink size={13} weight="extraBold" color={tint}>{label}</Ink>
    </View>
  );
}

export function ParsedRow({ ok, title, error }: { ok: boolean; title: string; error?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderColor: P.line2 }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: ok ? P.mossSoft : P.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
        <EIcon name={ok ? 'check' : 'close'} size={14} color={ok ? P.mossText : P.danger} stroke={3} />
      </View>
      <View style={{ flex: 1 }}>
        <Ink size={14} weight="bold" numberOfLines={1}>{title}</Ink>
        {error ? <Ink size={12} color={P.danger} numberOfLines={2}>{error}</Ink> : null}
      </View>
    </View>
  );
}

export function SummaryHero({ big, label, sub }: { big: string | number; label: string; sub?: string }) {
  return (
    <Card style={{ gap: 4, paddingVertical: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Ink size={64} weight="black" tight style={{ lineHeight: 66 }}>{String(big)}</Ink>
        <Ink size={17} weight="extraBold" color={P.ink2} style={{ marginBottom: 8, flexShrink: 1 }}>{label}</Ink>
      </View>
      {sub ? <Ink size={14} weight="bold" color={P.muted}>{sub}</Ink> : null}
    </Card>
  );
}

export function DoneBlock({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 30 }}>
      <Stamp p={papier} size={70} />
      <Ink size={26} weight="black" tight style={{ textAlign: 'center' }}>{title}</Ink>
      <Ink size={15} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>{sub}</Ink>
      {children}
    </Card>
  );
}
