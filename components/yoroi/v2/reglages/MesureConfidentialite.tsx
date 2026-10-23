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
      <SectionTitle title="Mesure de l’app" sub="Pour savoir ce qui sert et corriger les bugs" />
      <Card style={{ padding: 16, gap: 10 }}>
        <ToggleRow first icon="eye" label="Statistiques d’usage et plantages" sub={actif ? 'Activé' : 'Coupé'} value={actif} onChange={changer} />
        <Ink size={13} color={c.textSecondary}>
          Ce qui part : des faits, sans valeur. Par exemple « une pesée a été saisie » ou « l’écran Progrès a été ouvert ».
        </Ink>
        <Ink size={13} color={c.textSecondary}>
          Ce qui ne part jamais : ton poids, tes mensurations, tes calories, ta fréquence cardiaque, tes séances en détail, tes données Apple Santé ou Health Connect, ce que tu écris.
        </Ink>
        <Ink size={13} color={c.textSecondary}>
          Couper arrête tout envoi tout de suite, rapports de plantage compris.
        </Ink>
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>
            {total == null
              ? 'Compteur local : lecture en cours'
              : `Compteur local : ${total} événement${total > 1 ? 's' : ''} noté${total > 1 ? 's' : ''} sur ce téléphone${mesureDisponible() ? '' : ', rien n’est encore envoyé'}`}
          </Ink>
        </View>
      </Card>
    </>
  );
}
