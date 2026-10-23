/**
 * Proposition automatique d'une carte, une seule fois par moment, jamais par-dessus une autre fenetre.
 * - PropositionCarte : a monter sur l'ecran de fin de seance ou de pesee. actif passe a vrai quand l'ecran
 *   est pret (pas de celebration de rang en cours). onFini(montree) previent l'ecran que la feuille
 *   est fermee (ou qu'elle ne s'ouvrira pas), pour enchainer la suite (rappels, avis).
 * - PropositionSemaine : montee au-dessus des onglets, propose le bilan le dimanche des 17 h
 *   ou le lundi matin, s'il y a eu au moins une seance dans la semaine ; et aussi le bilan du mois
 *   (du 1er au 7) et celui de l'annee (du 1er au 15 janvier), regroupes dans la meme feuille.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { logger } from '@/lib/security/logger';
import { chargerBilanAnnee, chargerBilanMois, chargerExploitsPesee, chargerExploitsSeance, chargerPesee, chargerSeance, chargerSemaine } from '@/lib/v2/cartes/charger';
import { chiffresDisponibles } from '@/lib/v2/cartes/chiffres';
import { aProposer, anneeAProposer, moisAProposer } from '@/lib/v2/cartes/exploits';
import { isoJour, peutProposer, semaineAProposer } from '@/lib/v2/cartes/moments';
import { lireJournal, marquerVu } from '@/lib/v2/cartes/store';
import type { CarteData } from '@/lib/v2/cartes/types';
import { _fenetreCurrent } from '@/components/yoroi/v2/fenetre/api';
import { propositionEnCours } from '@/lib/v2/notifications/permission';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { FeuilleCarte } from './FeuilleCarte';

const DELAI_MS = 900;
/** derniere feuille montree : jamais deux propositions coup sur coup (10 minutes d'ecart) */
let derniereFeuille = 0;
const ECART_MS = 10 * 60 * 1000;

/**
 * Charge le moment et ses exploits, et dit quoi proposer. Plusieurs moments ensemble (record, palier,
 * objectif, compteur) arrivent dans une seule feuille, ou tu choisis ta carte. Chaque moment
 * n'est propose qu'une fois : tout ce qui est montre est marque comme vu.
 */
async function preparer(moment: 'seance' | 'pesee', ref: { id?: number; date?: string }): Promise<CarteData[]> {
  const j = await lireJournal();
  if (!j.auto) return [];
  const aujourdhui = isoJour(new Date());
  const d = moment === 'seance' && ref.id ? await chargerSeance(ref.id) : moment === 'pesee' ? await chargerPesee({ date: ref.date }) : null;
  const base = d && chiffresDisponibles(d).length > 0 && peutProposer(j, d.cle, { raison: d.pesee?.raison, aujourdhui }) ? d : null;
  let exploits: CarteData[] = [];
  try {
    exploits = moment === 'seance' && ref.id ? await chargerExploitsSeance(ref.id) : moment === 'pesee' ? await chargerExploitsPesee(ref.date) : [];
  } catch (e) {
    logger.warn('[cartes] exploits', e);
  }
  // pesee : les exploits ne viennent qu'avec une pesee qui montre un progres
  if (moment === 'pesee' && !base) exploits = [];
  const neufs = aProposer(exploits, j.vus, 6);
  // d'abord les vrais exploits, puis la carte de la seance, puis l'annee et le compteur
  const avant = neufs.filter((c) => (c.exploit?.priorite ?? 0) < 60);
  const apres = neufs.filter((c) => (c.exploit?.priorite ?? 0) >= 60);
  const cartes = [...avant, ...(base ? [base] : []), ...apres];
  // le compteur seul ne vaut pas une feuille si la seance elle-meme n'a rien a montrer
  if (!base && avant.length === 0) return [];
  for (const c of cartes) await marquerVu(c.cle, { raison: c.pesee?.raison, aujourdhui });
  return cartes;
}

export function PropositionCarte({ moment, id, date, actif, onFini }: { moment: 'seance' | 'pesee'; id?: number; date?: string; actif: boolean; onFini?: (montree: boolean) => void }) {
  const [cartes, setCartes] = useState<CarteData[]>([]);
  const [visible, setVisible] = useState(false);
  const lance = useRef(false);
  const fini = useRef(onFini);
  fini.current = onFini;

  useEffect(() => {
    if (!actif || lance.current) return;
    lance.current = true;
    let alive = true;
    let t: ReturnType<typeof setTimeout> | null = null;
    preparer(moment, { id, date })
      .then((l) => {
        if (!alive) return;
        if (!l.length) {
          fini.current?.(false);
          return;
        }
        setCartes(l);
        t = setTimeout(() => {
          // une autre fenetre est deja la : on n'empile pas, la carte reste dans Mes cartes
          if (_fenetreCurrent() || propositionEnCours()) {
            fini.current?.(false);
            return;
          }
          derniereFeuille = Date.now();
          setVisible(true);
        }, DELAI_MS);
      })
      .catch((e) => {
        logger.warn('[cartes] proposition', e);
        fini.current?.(false);
      });
    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [actif, moment, id, date]);

  if (!cartes.length) return null;
  return (
    <FeuilleCarte
      data={cartes[0]}
      autres={cartes.slice(1)}
      visible={visible}
      onClose={() => {
        setVisible(false);
        fini.current?.(true);
      }}
    />
  );
}

export function PropositionSemaine() {
  const [data, setData] = useState<CarteData | null>(null);
  const [autres, setAutres] = useState<CarteData[]>([]);
  const [visible, setVisible] = useState(false);
  const visite = useVisiteEnCours();
  const visiteRef = useRef(visite);
  visiteRef.current = visite;
  const enCours = useRef(false);

  useEffect(() => {
    const essayer = async () => {
      if (enCours.current) return;
      const now = new Date();
      const lundi = semaineAProposer(now);
      const mois = moisAProposer(now);
      const annee = anneeAProposer(now);
      if (!lundi && !mois && !annee) return;
      enCours.current = true;
      try {
        const j = await lireJournal();
        if (!j.auto) return;
        const liste: CarteData[] = [];
        // bilan de l'annee (1er au 15 janvier), du mois (1er au 7), puis la semaine (dimanche soir, lundi matin)
        if (annee) {
          const b = await chargerBilanAnnee(annee).catch(() => null);
          if (b) liste.push(b);
        }
        if (mois) {
          const b = await chargerBilanMois(mois).catch(() => null);
          if (b) liste.push(b);
        }
        if (lundi) {
          const w = await chargerSemaine(lundi).catch(() => null);
          if (w) liste.push(w);
        }
        const neufs = liste.filter((c) => peutProposer(j, c.cle));
        if (!neufs.length) return;
        // quelques secondes apres l'ouverture, seulement si rien d'autre n'est a l'ecran
        await new Promise((r) => setTimeout(r, 5000));
        if (visiteRef.current || _fenetreCurrent() || propositionEnCours()) return;
        if (Date.now() - derniereFeuille < ECART_MS) return;
        derniereFeuille = Date.now();
        for (const c of neufs) await marquerVu(c.cle);
        setData(neufs[0]);
        setAutres(neufs.slice(1));
        setVisible(true);
      } catch (e) {
        logger.warn('[cartes] semaine', e);
      } finally {
        enCours.current = false;
      }
    };
    void essayer();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void essayer();
    });
    return () => sub.remove();
  }, []);

  if (!data) return null;
  return <FeuilleCarte data={data} autres={autres} visible={visible} onClose={() => setVisible(false)} />;
}
