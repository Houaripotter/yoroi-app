/**
 * PAYWALL, YOROI Premium (source app). L'ecran est le meme que celui de la fin de l'onboarding :
 * components/yoroi/v2/premium/Paywall.tsx. Prix, periodes et essai viennent toujours du store.
 * Apercu : /paywall?preview=1 bloque achat et restauration (purchasePreview) pendant l'affichage,
 * avec un bandeau « Aperçu, aucun achat possible ». L'ancien preview=true reste accepte.
 * Source : /paywall?source=photos_limite&n=12 (lib/v2/premium/sources.ts, ouvrirPaywall). Elle part a la mesure
 * (paywallEvent) et choisit l'apercu du contenu bloque ; n est le compteur reel du mur, s'il y en a un.
 */
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Paywall } from '@/components/yoroi/v2/premium/Paywall';
import { setPurchasePreview } from '@/lib/v2/creator/premiumFlags';
import { lireCompteur, lireSourcePaywall } from '@/lib/v2/premium/sources';
import { ONBOARDING_NEUF_ACTIF } from '@/lib/v2/onboarding/interrupteur';
import { PaywallInterieurEcran } from '@/components/yoroi/v2/onboarding-neuf/PaywallInterieur';

export default function PaywallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string; source?: string; n?: string }>();
  const preview = params.preview === '1' || params.preview === 'true';
  const origine = lireSourcePaywall(params.source);
  const compteur = lireCompteur(params.n);

  useEffect(() => {
    if (!preview) return;
    setPurchasePreview(true);
    return () => setPurchasePreview(false);
  }, [preview]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  // 22 novembre 2026 (Houari) : avec le nouvel onboarding, le paywall de l'app prend son design, comme INRO
  // (components/yoroi/v2/onboarding-neuf/PaywallInterieur.tsx) ; achats, restauration et mentions inchanges
  if (ONBOARDING_NEUF_ACTIF) return <PaywallInterieurEcran origine={origine} compteur={compteur} apercu={preview} onFini={close} />;
  return <Paywall source="app" origine={origine} compteur={compteur} preview={preview} onFinish={close} onClose={close} />;
}
