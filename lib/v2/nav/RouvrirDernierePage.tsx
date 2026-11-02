/**
 * Revenir sur ta derniere page apres une fermeture complete de l'app (2 novembre 2026).
 * Logique pure et testee : ./dernierePage.ts. Monte une seule fois dans app/_layout.tsx (composant RouvrirDernierePage), a cote d'OuvertureNotifications.
 *
 * - A chaque changement d'ecran : la page et ses parametres sont gardes (cle yoroi_derniere_page_v1, ce telephone
 *   seulement), ecrits apres un petit delai, et tout de suite quand l'app passe en arriere-plan.
 * - Au demarrage a froid seulement : une fois arrive normalement sur l'accueil (apres le verrou, l'onboarding et la
 *   base), si la page date de moins de 2 heures et que sa donnee existe encore, elle se rouvre par-dessus l'accueil :
 *   le retour ramene a l'accueil. Sinon tu restes sur l'accueil.
 * - Une notification ou un widget qui ouvre deja un ecran passe toujours avant.
 * - La seance en direct n'est jamais rouverte ici : la barre « Séance en cours » de l'accueil la reprend deja.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalSearchParams, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { logger } from '@/lib/security/logger';
import { vitrineActive } from '@/lib/v2/visite/vitrine';
import { cibleEnAttente, surCible } from '@/lib/v2/notifications/toucher';
import { lienEnAttente, surLien } from '@/lib/v2/widgets/liens';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { _fenetreCurrent } from '@/components/yoroi/v2/fenetre/api';
import {
  CLE_DERNIERE_PAGE,
  creerMemoire,
  decider,
  estAccueil,
  lire,
  pageDe,
  poserDetailsRestaures,
  verifierDonnees,
  type DernierePage as Page,
  type Verifs,
} from './dernierePage';

/** Laisse la redirection de la route racine et les liens du demarrage passer avant */
const DELAI_MS = 700;
/** Verrou Face ID : l'attente maximale avant de renoncer (tu restes sur l'accueil) */
const VERROU_MAX_MS = 90000;
/** Meme cle et meme duree que lib/biometricLockService.ts */
const CLE_DERNIER_DEVERROUILLAGE = '@yoroi_biometric_last_auth';
const VERROU_VALIDE_MS = 5 * 60 * 1000;

const memoire = creerMemoire({ setItem: (k, v) => AsyncStorage.setItem(k, v) });

/** Une page donne ses details (onglet, chiffres de la carte, fiche ouverte...), rendus a sa reouverture */
export function noterDetailsPage(chemin: string, details: Record<string, unknown>): void {
  if (vitrineActive()) return;
  memoire.noterDetails(chemin, details, Date.now());
}

/** Une fois par lancement : le demarrage a froid. Un retour du premier plan ne rouvre rien. */
let decide = false;

function attendreActive(): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

/** Vrai quand le verrou Face ID est leve (ou absent) ; faux si on a trop attendu */
async function attendreVerrou(): Promise<boolean> {
  try {
    const svc = await import('@/lib/biometricLockService');
    if (!(await svc.isBiometricLockEnabled())) return true;
    if (!(await svc.isBiometricHardwareAvailable())) return true;
    const fin = Date.now() + VERROU_MAX_MS;
    while (Date.now() < fin) {
      const dernier = Number((await AsyncStorage.getItem(CLE_DERNIER_DEVERROUILLAGE)) ?? 0);
      if (dernier && Date.now() - dernier < VERROU_VALIDE_MS) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return false;
  } catch {
    return false;
  }
}

async function baseOuverte() {
  const db = await import('@/lib/database');
  await db.initDatabase();
  return db;
}

/** Chaque donnee qu'une page peut demander, relue dans la base (une erreur compte comme absente) */
const verifs: Verifs = {
  seance: async (id) => !!(await (await baseOuverte()).getTrainingById(id)),
  carte: async (q) => {
    await baseOuverte();
    const m = await import('@/lib/v2/cartes/charger');
    const b = await import('@/lib/v2/cartes/bibliotheque');
    // memes branches qu'app/carte.tsx
    let d: unknown = null;
    if (q.moment === 'exploit' && (q.src === 'objectif' || q.src === 'compteur')) d = await b.chargerDuMoment(q.src, q.cle ?? '');
    else if ((q.moment === 'mois' || q.moment === 'annee') && q.ref) d = await b.chargerPeriode(q.moment, q.ref);
    else if (q.moment === 'exploit' && q.src && q.ref) d = await m.chargerExploit(q.src, q.ref, q.cle ?? '');
    else if (q.moment === 'pesee') d = await m.chargerPesee({ id: q.id ? Number(q.id) : undefined, date: q.date });
    else if (q.moment === 'semaine' && q.debut) d = await m.chargerSemaine(q.debut);
    else if (q.id) d = await m.chargerSeance(Number(q.id));
    return !!d;
  },
  programme: async (id) => {
    const { estProgrammePerso } = await import('@/lib/v2/programmes/registrePerso');
    if (estProgrammePerso(id)) {
      const { chargerProgrammesPerso } = await import('@/lib/v2/programmes/monProgramme');
      const l = await chargerProgrammesPerso();
      return l.some((p) => p.id === id);
    }
    const { programmeParId } = await import('@/lib/v2/programmes/catalogue');
    return !!programmeParId(id);
  },
  competition: async (id) => {
    await baseOuverte();
    const { getCompetitionById } = await import('@/lib/fighterModeService');
    return !!(await getCompetitionById(id));
  },
  combat: async (id) => {
    await baseOuverte();
    const { getCombatById } = await import('@/lib/fighterModeService');
    return !!(await getCombatById(id));
  },
  pesee: async (id) => {
    const db = await baseOuverte();
    return (await db.getAllWeights()).some((w) => w.id === id);
  },
};

export function RouvrirDernierePage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const segments = useSegments() as string[];
  const etatNav = useRootNavigationState();
  const visite = useVisiteEnCours();
  const cleNav = etatNav?.key;
  const chargement = !cleNav || !segments.length;
  const cleSegments = segments.join('/');
  const cleParams = JSON.stringify(params ?? {});
  const ici = useRef(pathname);
  ici.current = pathname;
  const enVisite = useRef(visite);
  enVisite.current = visite;
  /** undefined : la page d'avant n'est pas encore relue */
  const [avant, setAvant] = useState<Page | null | undefined>(decide ? null : undefined);
  /** une notification ou un widget a demande un ecran : il gagne */
  const autre = useRef(false);

  useEffect(() => {
    const a = surCible(() => {
      autre.current = true;
    });
    const b = surLien(() => {
      autre.current = true;
    });
    return () => {
      a();
      b();
    };
  }, []);

  // 1. relire la page d'avant, avant toute ecriture (sinon l'accueil l'ecraserait)
  useEffect(() => {
    if (decide) {
      memoire.activer();
      return;
    }
    let vivant = true;
    AsyncStorage.getItem(CLE_DERNIERE_PAGE)
      .then((brut) => lire(brut))
      .catch(() => null)
      .then((p) => {
        if (vivant) setAvant(p);
      });
    return () => {
      vivant = false;
    };
  }, []);

  // 2. memoriser chaque ecran (en memoire tout de suite, ecrit apres la decision seulement)
  useEffect(() => {
    if (chargement || vitrineActive()) return;
    memoire.noter(pageDe(pathname, params as Record<string, unknown>, segments, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, cleParams, cleSegments, chargement]);

  // l'heure gardee est celle ou tu quittes l'app
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background' || s === 'inactive') memoire.vider(Date.now());
    });
    return () => sub.remove();
  }, []);

  // 3. au demarrage a froid : rouvrir la page, une seule fois
  const premier = segments[0];
  useEffect(() => {
    if (decide || avant === undefined || chargement) return;
    const finir = (raison: string) => {
      decide = true;
      memoire.activer();
      logger.info(`[DernierePage] ${raison}`);
    };
    // onboarding, nouveautes, paywall, lien ouvert au lancement : pas une arrivee normale sur l'accueil
    if (premier !== '(tabs)' || !estAccueil(pathname)) {
      finir('pas d’arrivée sur l’accueil');
      return;
    }
    let annule = false;
    const t = setTimeout(() => {
      (async () => {
        const d = decider(avant, Date.now());
        if (!d.rouvrir || !avant) return finir(d.rouvrir ? 'rien' : d.raison);
        const occupe = () => autre.current || !!cibleEnAttente() || !!lienEnAttente() || enVisite.current || !!_fenetreCurrent();
        if (occupe()) return finir('autre ouverture');
        await attendreActive();
        if (!(await attendreVerrou())) return finir('verrou');
        const ok = await verifierDonnees(avant, verifs);
        if (annule) return;
        if (!ok) return finir('donnée absente, accueil');
        if (occupe() || !estAccueil(ici.current)) return finir('autre ouverture');
        poserDetailsRestaures(avant.details);
        decide = true;
        // l'accueil est deja en dessous : le retour y ramene
        if (d.onglet) router.navigate(d.href as never);
        else router.push(d.href as never);
        finir(`rouverte ${avant.chemin}`);
      })().catch((e) => {
        logger.warn('[DernierePage] non rouverte', e);
        finir('erreur');
      });
    }, DELAI_MS);
    return () => {
      annule = true;
      clearTimeout(t);
    };
  }, [avant, chargement, premier, pathname, router]);

  return null;
}
