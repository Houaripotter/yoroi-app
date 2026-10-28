/**
 * Studio, rubrique Abonnement, en LECTURE SEULE : Premium reel ou offert, entitlement, expiration,
 * identifiant client RevenueCat a copier, offering current et ses paquets avec leurs prix.
 * Lit seulement getCustomerInfo et getOfferings : aucun achat, aucune restauration.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card } from '@/components/yoroi/v2/espace/ui';
import { usePremium } from '@/context/PremiumContext';
import { PREMIUM_ENTITLEMENT_ID } from '@/constants/premium';
import { formatDateTime } from '@/lib/v2/creator/deviceInfo';
import { KV, Note, SmallAction, StudioSection, SubTitle } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

type Info = {
  active: boolean;
  product: string | null;
  expires: string | null;
  willRenew: boolean | null;
  period: string | null;
  store: string | null;
  offering: string | null;
  packages: { id: string; product: string; price: string }[];
  error: string | null;
};

const PERIOD: Record<string, string> = { NORMAL: traduire('Normale'), TRIAL: traduire('Essai gratuit'), INTRO: traduire('Prix de lancement'), PREPAID: traduire('Prépayée') };

function purchases(): { getCustomerInfo: () => Promise<any>; getOfferings: () => Promise<any> } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

export function Abonnement() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { isPremium, hasActiveSubscription, isStoreReady, appUserId, offersStatus, simulateFreeUser, refresh } = usePremium();
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const P = purchases();
    if (!P || !isStoreReady) {
      setInfo({ active: false, product: null, expires: null, willRenew: null, period: null, store: null, offering: null, packages: [], error: traduire('RevenueCat n’est pas disponible ici (Expo Go, web ou clé absente).') });
      return;
    }
    const out: Info = { active: false, product: null, expires: null, willRenew: null, period: null, store: null, offering: null, packages: [], error: null };
    try {
      const ci = await P.getCustomerInfo();
      const ent = ci?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] ?? ci?.entitlements?.all?.[PREMIUM_ENTITLEMENT_ID] ?? null;
      out.active = Boolean(ci?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]);
      if (ent) {
        out.product = ent.productIdentifier ?? null;
        out.expires = ent.expirationDate ? formatDateTime(Date.parse(ent.expirationDate)) : null;
        out.willRenew = typeof ent.willRenew === 'boolean' ? ent.willRenew : null;
        out.period = ent.periodType ? PERIOD[String(ent.periodType).toUpperCase()] ?? String(ent.periodType) : null;
        out.store = ent.store ?? null;
      }
    } catch {
      out.error = traduire('Les infos du client n’ont pas pu être lues.');
    }
    try {
      const off = await P.getOfferings();
      const cur = off?.current;
      out.offering = cur?.identifier ?? null;
      out.packages = (cur?.availablePackages ?? []).map((p: any) => ({ id: String(p.identifier), product: String(p.product?.identifier ?? ''), price: String(p.product?.priceString ?? '') }));
    } catch {
      out.error = out.error ?? traduire('Les offres n’ont pas pu être lues.');
    }
    setInfo(out);
  }, [isStoreReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = async () => {
    setBusy(true);
    await refresh().catch(() => undefined);
    await load();
    setBusy(false);
  };

  const copyId = async () => {
    if (!appUserId) return;
    try {
      await Clipboard.setStringAsync(appUserId);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      appAlert(traduire('Copié'), traduire('L’identifiant client RevenueCat est copié.'));
    } catch {
      appAlert(traduire('Oups'), traduire('La copie est indisponible.'));
    }
  };

  const yesNo = (b: boolean | null) => (b === null ? traduire('Inconnu') : b ? traduire('Oui') : traduire('Non'));
  const access = simulateFreeUser ? traduire('Gratuit (vue gratuite)') : hasActiveSubscription ? traduire('Premium, abonnement réel') : isPremium ? traduire('Premium offert (Studio)') : traduire('Gratuit');

  return (
    <StudioSection id="abonnement" icon="crown" title={traduire("Abonnement")} sub={traduire("Lecture seule : RevenueCat, entitlement, offres")} keywords="abonnement premium revenuecat entitlement expiration client identifiant offering paquets prix store">
      <Card>
        <KV first label={traduire("Accès dans l’app")} value={access} />
        <KV label={traduire("Abonnement réel")} value={hasActiveSubscription ? 'Actif' : traduire('Aucun')} />
        <KV label={traduire("Store prêt")} value={isStoreReady ? traduire('Oui') : traduire('Non')} />
        <KV label={traduire("Offres")} value={offersStatus === 'ready' ? traduire('Chargées') : offersStatus === 'loading' ? traduire('En chargement') : offersStatus === 'error' ? traduire('En erreur') : 'Indisponibles'} />
      </Card>

      <SubTitle>{`Entitlement « ${PREMIUM_ENTITLEMENT_ID} »`}</SubTitle>
      <Card>
        <KV first label={traduire("Actif chez RevenueCat")} value={info ? yesNo(info.error && !info.product ? null : info.active) : 'Lecture'} />
        <KV label={traduire("Produit")} value={info?.product ?? traduire('Aucun')} />
        <KV label={traduire("Expiration")} value={info?.expires ?? traduire('Aucune')} />
        <KV label={traduire("Période")} value={info?.period ?? traduire('Aucune')} />
        <KV label={traduire("Renouvellement")} value={yesNo(info?.willRenew ?? null)} />
        <KV label={traduire("Store")} value={info?.store ?? traduire('Aucun')} />
      </Card>

      <SubTitle>{traduire("Identifiant client RevenueCat")}</SubTitle>
      <Card>
        <KV first label={appUserId ?? traduire('Pas encore connu')} value="" right={appUserId ? <SmallAction label={traduire("Copier")} onPress={() => void copyId()} /> : undefined} />
      </Card>
      <Note>{traduire("Colle ce numéro dans RevenueCat pour offrir Premium à ce téléphone. Ce n’est pas un secret, juste un numéro de client.")}</Note>

      <SubTitle>{`Offering current${info?.offering ? ` : ${info.offering}` : ''}`}</SubTitle>
      <Card>
        {info && info.packages.length > 0 ? (
          info.packages.map((p, i) => <KV key={p.id} first={i === 0} label={`${p.id}\n${p.product}`} value={p.price || traduire('Sans prix')} />)
        ) : (
          <View style={{ padding: 14 }}>
            <Ink size={13} color={c.textSecondary}>{info?.error ?? traduire('Aucun paquet dans l’offering current.')}</Ink>
          </View>
        )}
      </Card>
      <Button tone="ghost" small icon="sync" label={traduire("Rafraîchir")} onPress={() => void reload()} loading={busy} disabled={busy} />
    </StudioSection>
  );
}

export default Abonnement;
