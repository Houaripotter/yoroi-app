/**
 * Ouvre l'ecran vise par un widget (lib/v2/widgets/liens.ts) quand la navigation est prete :
 * chargement fini et utilisateur dans l'app (un lien recu pendant l'onboarding attend la fin).
 * Ne double pas l'ecran si on y est deja (le chrono en cours reste le meme).
 * Lit aussi le lien laisse par iOS dans l'App Group (demarrage a froid, Centre de controle), au montage
 * et a chaque retour au premier plan. Monte dans app/_layout.tsx.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useGlobalSearchParams, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { logger } from '@/lib/security/logger';
import { decider, lienEnAttente, navigationPrete, prendreLien, recevoirUrl, surLien } from './liens';
import { lienEnAttenteNatif } from './natif';
import { delaiRestant } from '@/lib/v2/nav/direct';
import { repriseSeance } from '@/lib/v2/seance/reprendre';

/** Laisse la redirection de la route racine se terminer avant d'ouvrir l'ecran */
const DELAI_MS = 350;

export function LiensWidgets() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const etatNav = useRootNavigationState();
  const [tic, setTic] = useState(0);
  const ici = useRef({ pathname, params });
  ici.current = { pathname, params };

  const pret = navigationPrete(segments, etatNav?.key);
  // navigation directe : l'attente ne sert qu'au demarrage (redirection de la route racine) ;
  // app deja ouverte, le widget ouvre son ecran tout de suite
  const pretDepuis = useRef<number | null>(null);
  if (pret && pretDepuis.current === null) pretDepuis.current = Date.now();
  if (!pret) pretDepuis.current = null;

  useEffect(() => surLien(() => setTic((t) => t + 1)), []);

  useEffect(() => {
    const lire = () => {
      lienEnAttenteNatif()
        .then((url) => {
          if (url) recevoirUrl(url);
        })
        .catch(() => {});
    };
    lire();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') lire();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!pret || !lienEnAttente()) return;
    const t = setTimeout(() => {
      const d = prendreLien();
      if (!d) return;
      // 26 octobre 2026 : l'ecran verrouille ou la Dynamic Island pendant une seance rouvre la seance, pas le chrono seul
      if (d.cible === 'chronoEnCours') {
        repriseSeance(ici.current.pathname)
          .then((r) => {
            if (r) router.navigate(r as never);
            else if (!ici.current.pathname.startsWith('/seance/')) router.navigate({ pathname: d.href, params: d.params } as never);
          })
          .catch(() => {});
        return;
      }
      const a = decider(d, ici.current);
      try {
        if (a.type === 'push') router.push({ pathname: a.href, params: a.params } as never);
        else if (a.type === 'navigate') router.navigate({ pathname: a.href, params: a.params } as never);
        else if (a.type === 'setParams') router.setParams(a.params as never);
      } catch (e) {
        logger.warn('[Widgets] lien non ouvert', e);
      }
    }, delaiRestant(pretDepuis.current ?? Date.now(), Date.now(), DELAI_MS));
    return () => clearTimeout(t);
  }, [pret, tic, pathname, router]);

  return null;
}
