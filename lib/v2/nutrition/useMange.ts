/**
 * « Mangé aujourd'hui » : chargement (16 octobre 2026). Les entrées des 8 derniers jours lues dans Apple Santé
 * ou Health Connect (./lireRepas), sinon, en repli, les totaux par jour que YOROI lit déjà (séries Santé).
 * Le résumé (./mange.ts) est null quand il n'y a aucune donnée de repas : rien ne s'affiche alors.
 */
import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/security/logger';
import { lireRepas, FOURNISSEUR_REPAS } from './lireRepas';
import { cleJour, entreesDepuisSeries, resumerRepas } from './mange';
import type { ResumeRepas } from './mange';

type SeriesRepas = Parameters<typeof entreesDepuisSeries>[0];

let memo: { cle: string; resume: ResumeRepas | null } | null = null;

/** Le résumé du jour, prêt pour l'accueil, le détail et le bilan. Ne lève jamais d'erreur. */
export async function chargerResumeRepas(series?: SeriesRepas): Promise<ResumeRepas | null> {
  const today = cleJour(new Date());
  try {
    let entrees = await lireRepas(8);
    if (!entrees || entrees.length === 0) entrees = entreesDepuisSeries(series, '');
    const resume = resumerRepas(entrees, today, FOURNISSEUR_REPAS);
    memo = { cle: today, resume };
    return resume;
  } catch (e) {
    logger.info('[Mange] résumé indisponible', e);
    return null;
  }
}

/** Dernier résumé connu (même jour), pour un premier rendu sans attente */
export function resumeRepasEnMemoire(): ResumeRepas | null {
  return memo && memo.cle === cleJour(new Date()) ? memo.resume : null;
}

/** Se recharge quand les données Santé changent (retour sur l'accueil, synchronisation) */
export function useMange(series?: SeriesRepas | null): ResumeRepas | null {
  const [resume, setResume] = useState<ResumeRepas | null>(resumeRepasEnMemoire());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    chargerResumeRepas(series ?? undefined).then((r) => {
      if (alive.current) setResume(r);
    });
    return () => {
      alive.current = false;
    };
  }, [series]);
  return resume;
}
