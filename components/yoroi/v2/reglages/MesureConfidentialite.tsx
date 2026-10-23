/**
 * Reglages, Confidentialite : interrupteur de la mesure d'audience et des rapports de plantage, et compteur local
 * des evenements notes (13 octobre 2026). Le compteur ne quitte jamais le telephone.
 * Decision de Houari : actif par defaut, coupable a tout moment, la coupure agit au niveau du SDK.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, SectionTitle, ToggleRow } from '@/components/yoroi/v2/espace/ui';
import { consentementActif, lireCompteurLocal, mesureDisponible, setConsentement } from '@/utils/telemetry';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function MesureConfidentialite() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [actif, setActif] = useState(consentementActif());
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    lireCompteurLocal().then((x) => setTotal(x.total)).catch(() => setTotal(0));
  }, []);

  const changer = (v: boolean) => {
    setActif(v);
    void setConsentement(v);
  };

  return (
    <>
      <SectionTitle title={traduire("Mesure de l’app")} sub={traduire("Pour savoir ce qui sert et corriger les bugs")} />
      <Card style={{ padding: 16, gap: 10 }}>
        <ToggleRow first icon="eye" label={traduire("Statistiques d’usage et plantages")} sub={actif ? traduire('Activé') : traduire('Coupé')} value={actif} onChange={changer} />
        <Ink size={13} color={c.textSecondary}>
          {traduire("Ce qui part : des faits, sans valeur. Par exemple « une pesée a été saisie » ou « l’écran Progrès a été ouvert ».")}</Ink>
        <Ink size={13} color={c.textSecondary}>
          {traduire("Ce qui ne part jamais : ton poids, tes mensurations, tes calories, ta fréquence cardiaque, tes séances en détail, tes données Apple Santé ou Health Connect, ce que tu écris.")}</Ink>
        <Ink size={13} color={c.textSecondary}>
          {traduire("Couper arrête tout envoi tout de suite, rapports de plantage compris.")}</Ink>
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>
            {total == null
              ? traduire('Compteur local : lecture en cours')
              : traduirePluriel(total, total > 1, "Compteur local : {0} événement noté sur ce téléphone{1}", "Compteur local : {0} événements notés sur ce téléphone{1}", total, mesureDisponible() ? '' : traduire(', rien n’est encore envoyé'))}
          </Ink>
        </View>
      </Card>
    </>
  );
}
