/**
 * Ouvre l'écran d'une notification touchée (./toucher.ts) quand la navigation est prête : chargement fini,
 * route racine redirigée, onboarding ou paywall terminés. Couvre le démarrage à froid (app fermée) et le
 * lancement en arrière plan par Apple Santé. Séance : sa carte de partage ; séance disparue : tes séances,
 * avec un mot doux. Monté dans app/_layout.tsx, à côté de LiensWidgets.
 */
import { useEffect, useRef, useState } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { logger } from '@/lib/security/logger';
import { navigationPrete } from '@/lib/v2/widgets/liens';
import { delaiRestant } from '@/lib/v2/nav/direct';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { cibleEnAttente, lienCarteSeance, prendreCible, resoudreSeance, ROUTE_SEANCES, surCible } from './toucher';

/** Laisse la redirection de la route racine se terminer avant d'ouvrir l'écran */
const DELAI_MS = 350;

async function parId(id: number) {
  const { getTrainingById } = await import('@/lib/database');
  return getTrainingById(id);
}

async function parUuid(uuid: string): Promise<number | null> {
  const { openDatabase } = await import('@/lib/database');
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM trainings WHERE healthkit_uuid = ? LIMIT 1', [uuid]);
  return row?.id ?? null;
}

export function OuvertureNotifications() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const etatNav = useRootNavigationState();
  const [tic, setTic] = useState(0);

  const pret = navigationPrete(segments, etatNav?.key);
  const pretDepuis = useRef<number | null>(null);
  if (pret && pretDepuis.current === null) pretDepuis.current = Date.now();
  if (!pret) pretDepuis.current = null;

  useEffect(() => surCible(() => setTic((t) => t + 1)), []);

  useEffect(() => {
    if (!pret || !cibleEnAttente()) return;
    const t = setTimeout(() => {
      const cible = prendreCible();
      if (!cible) return;
      (async () => {
        try {
          if (cible.type === 'route') {
            router.push(cible.href as never);
            return;
          }
          if (cible.type === 'seances') {
            router.navigate(ROUTE_SEANCES as never);
            return;
          }
          const id = await resoudreSeance(cible.ref, { parId, parUuid });
          if (id) {
            router.push(lienCarteSeance(id) as never);
          } else {
            router.navigate(ROUTE_SEANCES as never);
            appAlert('Séance introuvable', 'Cette séance n’est plus dans ton carnet. Voici tes séances : choisis celle que tu veux partager.');
          }
        } catch (e) {
          logger.warn('[Notifications] écran non ouvert', e);
        }
      })();
    }, delaiRestant(pretDepuis.current ?? Date.now(), Date.now(), DELAI_MS));
    return () => clearTimeout(t);
  }, [pret, tic, router]);

  return null;
}
