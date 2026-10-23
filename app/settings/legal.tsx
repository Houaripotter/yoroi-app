/**
 * Conditions et confidentialite (vague 41) : les textes juridiques en un seul endroit.
 * Les reglages de confidentialite (verrou, donnees partagees) restent dans Mes donnees.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { TUILE } from '@/components/yoroi/v2/reglages/kit';
import { traduire } from '@/lib/i18n/tr';

export default function Legal() {
  const router = useRouter();
  const go = (href: string) => router.push(href as any);
  return (
    <EspaceScreen title={traduire("Conditions et confidentialité")} subtitle={traduire("Tes données restent sur ton téléphone. Voici les textes complets.")} gap={14}>
      <Card>
        <ValueRow first tint={TUILE.ardoise} icon="doc" label={traduire("Conditions d’utilisation")} onPress={() => go('/terms')} />
        <ValueRow tint={TUILE.indigo} icon="lock" label={traduire("Politique de confidentialité")} onPress={() => go('/privacy-policy')} />
        <ValueRow tint={TUILE.mousse} icon="shield" label={traduire("Ce que YOROI garde")} onPress={() => go('/privacy-data')} />
      </Card>
    </EspaceScreen>
  );
}
