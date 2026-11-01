/**
 * Conditions et confidentialite (vague 41) : les textes juridiques en un seul endroit.
 * Les reglages de confidentialite (verrou, donnees partagees) restent dans Mes donnees.
 * 1er novembre 2026 : Crédits, obligatoires tant que les illustrations Everkinetic (CC BY-SA 4.0) sont dans l'app
 * (lib/v2/programmes/everkinetic.ts) : nom, dépôt, licence et son lien, couleurs adaptées.
 */
import React from 'react';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { Groupe, TUILE } from '@/components/yoroi/v2/reglages/kit';
import { CREDIT_EVERKINETIC, EVERKINETIC_ACTIF } from '@/lib/v2/programmes/everkinetic';
import { traduire } from '@/lib/i18n/tr';

export default function Legal() {
  const router = useRouter();
  const go = (href: string) => router.push(href as any);
  return (
    <EspaceScreen title={traduire("Conditions et confidentialité")} subtitle={traduire("Tes données restent sur ton téléphone. Voici les textes complets.")} gap={14}>
      <Card>
        <ValueRow first tint={TUILE.ardoise} sticker="conditions" icon="doc" label={traduire("Conditions d’utilisation")} onPress={() => go('/terms')} />
        <ValueRow tint={TUILE.indigo} sticker="donnees_telephone" icon="lock" label={traduire("Politique de confidentialité")} onPress={() => go('/privacy-policy')} />
        <ValueRow tint={TUILE.mousse} sticker="coffre_ferme" icon="shield" label={traduire("Ce que YOROI garde")} onPress={() => go('/privacy-data')} />
      </Card>
      {EVERKINETIC_ACTIF ? (
        <>
          <Groupe title={traduire('Crédits')} />
          <Card>
            <ValueRow first tint={TUILE.bleu} icon="doc" label={CREDIT_EVERKINETIC.nom} sub={`${traduire('Illustrations des exercices, couleurs adaptées')}\n${CREDIT_EVERKINETIC.depot.replace('https://', '')}`} onPress={() => void Linking.openURL(CREDIT_EVERKINETIC.depot)} />
            <ValueRow tint={TUILE.ardoise} icon="doc" label={`${traduire('Licence')} ${CREDIT_EVERKINETIC.licence}`} sub={CREDIT_EVERKINETIC.lienLicence.replace('https://', '')} onPress={() => void Linking.openURL(CREDIT_EVERKINETIC.lienLicence)} />
          </Card>
        </>
      ) : null}
    </EspaceScreen>
  );
}
