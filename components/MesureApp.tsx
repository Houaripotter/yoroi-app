/**
 * Mesure du cycle de vie de l'app (13 octobre 2026) : premiere ouverture, demarrage, premier ecran, ecrans et onglets
 * (noms construits depuis les routes, jamais RNSScreen), retours, serie de semaines, rang, notifications ouvertes,
 * statut d'abonnement. Ne rend rien. Monte une seule fois dans app/_layout.tsx, sous les providers.
 */
import { useEffect, useRef } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { usePremium } from '@/context/PremiumContext';
import {
  initTelemetry,
  nomEcran,
  setProprietes,
  track,
  trackBoot,
  trackFirstOpen,
  trackFirstScreenRendered,
  trackReturn,
  trackSerie,
  type Onglet,
  type Origine,
  type Rang,
  type TypeNotif,
} from '@/utils/telemetry';

const ONGLETS: Record<string, Onglet> = { index: 'accueil', seances: 'seances', progres: 'progres', dojo: 'dojo' };

/** Type de notification ouverte, ramene a la liste fermee */
export function typeNotifDe(type: unknown): TypeNotif {
  const t = typeof type === 'string' ? type : '';
  if (/weigh|weight|pesee/.test(t)) return 'pesee';
  if (/workout|watch|montre/.test(t)) return 'montre';
  if (/training|seance|session/.test(t)) return 'seance';
  if (/sleep|sommeil/.test(t)) return 'sommeil';
  if (/hydrat/.test(t)) return 'hydratation';
  if (/streak|serie/.test(t)) return 'serie';
  if (/social_card/.test(t)) return 'carte_sociale';
  if (/recap/.test(t)) return 'recap';
  if (/citation/.test(t)) return 'citation';
  if (/tip|conseil|smart|briefing/.test(t)) return 'conseil';
  if (/charge|load/.test(t)) return 'charge';
  if (/compet/.test(t)) return 'competition';
  if (/sparring|partner/.test(t)) return 'sparring';
  if (/trial|essai/.test(t)) return 'fin_essai';
  if (/sync/.test(t)) return 'synchro';
  return 'autre';
}

async function origineDuLancement(): Promise<Origine> {
  try {
    const rep = await Notifications.getLastNotificationResponseAsync();
    if (rep) return 'notification';
  } catch {
    // module absent
  }
  try {
    const url = await Linking.getInitialURL();
    if (url) return /\/w\//.test(url) || /widget/.test(url) ? 'widget' : 'lien';
  } catch {
    // rien
  }
  return 'icone';
}

const rangDe = (index: number): Rang => String(Math.min(5, Math.max(1, index + 1))) as Rang;

export function MesureApp() {
  const segments = useSegments();
  const dernierEcran = useRef<string | null>(null);
  const dernierRang = useRef<number | null>(null);
  const { hasActiveSubscription, isLoading } = usePremium();

  // demarrage : une seule fois
  useEffect(() => {
    let vivant = true;
    (async () => {
      await initTelemetry();
      if (!vivant) return;
      await trackFirstOpen();
      trackBoot(await origineDuLancement());
      await trackReturn();
      try {
        const { getArmureState } = await import('@/lib/v2/armure');
        const etat = await getArmureState();
        dernierRang.current = etat.rank.index;
        await trackSerie(etat.weekStreak);
      } catch {
        // armure indisponible
      }
    })();
    let etatPrecedent = AppState.currentState;
    const sub = AppState.addEventListener('change', (etat) => {
      if (etatPrecedent.match(/inactive|background/) && etat === 'active') void trackReturn();
      etatPrecedent = etat;
    });
    const rang = DeviceEventEmitter.addListener('YOROI_ARMURE_CHANGED', (apres?: { rank?: { index?: number } }) => {
      const i = apres?.rank?.index;
      if (typeof i !== 'number') return;
      if (dernierRang.current != null && i > dernierRang.current) track('rang_atteint', { rang: rangDe(i) });
      dernierRang.current = i;
    });
    const notif = Notifications.addNotificationResponseReceivedListener((r) => {
      track('notif_ouverte', { type: typeNotifDe(r?.notification?.request?.content?.data?.type) });
    });
    return () => {
      vivant = false;
      sub.remove();
      rang.remove();
      notif.remove();
    };
  }, []);

  // ecrans et onglets, noms construits depuis les segments de route
  useEffect(() => {
    // lecture en tableau simple : le type de useSegments depend de .expo/types/router.d.ts (tuple [string] sans lui)
    const segs = segments as readonly string[];
    if (!segs.length) return;
    const premier = segs[0];
    if (premier === '(tabs)' || premier === 'onboarding') trackFirstScreenRendered();
    const ecran = nomEcran(segs);
    if (ecran === dernierEcran.current) return;
    dernierEcran.current = ecran;
    track('screen_view', { ecran });
    if (premier === '(tabs)') {
      const onglet = ONGLETS[segs[1] ?? 'index'] ?? 'accueil';
      track('tab_open', { onglet });
    }
  }, [segments]);

  // statut d'abonnement en propriete utilisateur
  useEffect(() => {
    if (isLoading) return;
    setProprietes({ statut_premium: hasActiveSubscription ? 'abonne' : 'gratuit' });
  }, [hasActiveSubscription, isLoading]);

  return null;
}
