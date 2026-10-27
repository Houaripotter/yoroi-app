/**
 * Bloc « discipline » (14 octobre 2026, demande de Houari) : sous l'affirmation de l'ecran 7 de l'onboarding,
 * et comme etape « Tes rappels » des « Nouveautes de la 3.0 ».
 * Un message court et fier, puis les rappels a la demande (rien n'est allume par defaut).
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { RappelsDiscipline } from '@/components/yoroi/v2/notifications/RappelsDiscipline';
import type { ChoixRappels } from '@/lib/v2/notifications/discipline';
import type { EcranPermission } from '@/lib/v2/notifications/permission';
import { useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

export const DISCIPLINE_TITRE = traduire('La régularité fait le résultat.');
export const DISCIPLINE_TEXTE = traduire('YOROI t’aide à tenir ton rythme, semaine après semaine. Des rappels, seulement si tu les veux : rien ne s’allume sans toi.');

/** Le message seul (carte indigo) */
export function MessageDiscipline() {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderRadius: 22, backgroundColor: c.accentTint, padding: 16 }}>
      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="target" size={24} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Ink size={18} weight="black" tight color={c.accent}>{DISCIPLINE_TITRE}</Ink>
        <Ink size={14} weight="medium" color={c.ink} style={{ lineHeight: 20 }}>{DISCIPLINE_TEXTE}</Ink>
      </View>
    </View>
  );
}

export function BlocDiscipline({ value, onChange, ecran, apercu, joursAutoTexte, sansMessage = false }: {
  value: ChoixRappels;
  onChange: (c: ChoixRappels) => void;
  ecran: EcranPermission;
  apercu?: boolean;
  joursAutoTexte?: string;
  sansMessage?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ gap: 12, paddingTop: 6 }}>
      {sansMessage ? null : <MessageDiscipline />}
      <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Tes rappels, si tu veux. Tu pourras les changer dans Réglages, Rappels.")}</Ink>
      <RappelsDiscipline value={value} onChange={onChange} ecran={ecran} apercu={apercu} joursAutoTexte={joursAutoTexte} />
    </View>
  );
}

export default BlocDiscipline;
