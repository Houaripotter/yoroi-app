/**
 * Vague 47 : garde de la fin du Premium, montee une fois dans app/_layout.tsx. Ne rend rien.
 * Au lancement et a chaque changement de l'etat Premium (RevenueCat, entitlement premium) :
 *  - abonnement inactif (confirme ou dernier etat en cache) : les choix reserves a Premium sont mis de cote
 *    (lib/v2/premium/finPremiumStore), avec une fenetre douce la premiere fois ;
 *  - abonnement actif : les choix mis de cote reviennent ;
 *  - etat inconnu, mode createur ou apercu Premium du Studio : rien ne bouge.
 * Note aussi la derniere scene gratuite choisie, qui sert de repli.
 */
import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { usePremium } from '@/context/PremiumContext';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { usePremiumFlags } from '@/lib/v2/creator/premiumFlags';
import { getArmureState } from '@/lib/v2/armure';
import { ESPACE_CHANGED_EVENT, getEspace, type Espace } from '@/lib/v2/espace';
import { actionPremium } from '@/lib/v2/premium/finPremium';
import { noterSceneGratuite, remettreChoixPremium, retirerChoixPremium } from '@/lib/v2/premium/finPremiumStore';
import { fenetreFinPremium } from './finPremiumFenetre';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { logger } from '@/lib/security/logger';
import { chargerScenesGagnees, terminerEssaiSiFini } from '@/lib/v2/dojo/recompensesScenes';
import { saveEspace } from '@/lib/v2/espace';

async function rangDuDojo(): Promise<number | null> {
  try {
    const a = await getArmureState();
    const i = a?.rank?.index;
    return typeof i === 'number' && Number.isFinite(i) ? i : null;
  } catch {
    return null;
  }
}

export function FinPremiumGuard() {
  const { etatAbonnement, isAnnualPremium } = usePremium();
  const { isCreator, ready } = useCreatorMode();
  const { creatorPremium, purchasePreview } = usePremiumFlags();
  // une seule mise a jour a la fois
  const file = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!ready) return;
    const action = actionPremium({ etat: etatAbonnement, createur: isCreator, apercu: creatorPremium || purchasePreview, rangConnu: true });
    if (action === 'rien') return;
    let vivant = true;
    file.current = file.current.then(async () => {
      try {
        // 18 octobre : les scenes gagnees avec la serie restent ouvertes, le cache doit etre lu avant
        await chargerScenesGagnees();
        const rang = await rangDuDojo();
        if (rang === null || !vivant) return;
        if (action === 'remettre') {
          await remettreChoixPremium(rang, isAnnualPremium);
          return;
        }
        const r = await retirerChoixPremium(rang);
        if (r.premiereFois && vivant) fenetreFinPremium(() => ouvrirPaywall('fin_premium'));
      } catch (err) {
        logger.warn('Fin du Premium : mise à jour des choix impossible', err);
      }
    });
    return () => {
      vivant = false;
    };
  }, [ready, etatAbonnement, isAnnualPremium, isCreator, creatorPremium, purchasePreview]);

  // la derniere scene gratuite choisie, au lancement et a chaque changement de l'espace
  useEffect(() => {
    const noter = (e: Espace | null | undefined) => {
      if (!e) return;
      rangDuDojo().then((rang) => (rang === null ? undefined : noterSceneGratuite(e, rang))).catch(() => undefined);
    };
    // 18 octobre : fin de l'essai 24 h d'une scene (grand coffre) : ta scene d'avant revient
    const finEssai = () =>
      getEspace()
        .then((e) => terminerEssaiSiFini(e.sceneFixe ?? e.scene, async (id) => { await saveEspace({ scene: id as Espace['scene'] }); }))
        .catch(() => false);
    void finEssai().then(() => getEspace().then(noter)).catch(() => undefined);
    const minuteur = setInterval(() => void finEssai(), 10 * 60 * 1000);
    const sub = DeviceEventEmitter.addListener(ESPACE_CHANGED_EVENT, noter);
    return () => {
      sub.remove();
      clearInterval(minuteur);
    };
  }, []);

  return null;
}

export default FinPremiumGuard;
