/**
 * Coach vocal : branché sur la séance de musculation en direct (app/seance/muscu.tsx) par un seul appel,
 * useCoachVocal(draft, toutesSeances). Les évènements sont lus dans le brouillon (brouillon.ts), le moteur
 * choisit la phrase (moteur.ts), le lecteur la dit en baissant ta musique (lecteur.ts).
 *
 * Rien en saisie après coup ni en modification d'une séance : seulement en direct.
 *
 * Écran verrouillé : le compte à rebours du repos est une heure de fin (restEndsAt), il reste juste.
 * Mais le JavaScript est mis en pause par iOS quand l'app est en arrière plan et que rien ne joue : les
 * repères du repos ne peuvent pas être dits téléphone verrouillé (la notification de fin de repos,
 * lib/v2/seance/rappelRepos.ts, prend le relais). Un repère en retard au retour dans l'app est oublié.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import type { MuscuDraft } from '@/lib/v2/seance/model';
import { seancesDeLExo } from '@/lib/v2/programmes/progression';
import { SEANCE_LIVE_ENREGISTREE_EVENT } from '@/lib/v2/seance/save';
import { getEspace } from '@/lib/v2/espace';
import { chargeVaMonter, evenementsEntre, prochaineEstDerniere } from './brouillon';
import { decider, etatInitial, objectifDuProfil, REPERE_REPOS_S, type EvenementCoach, type NiveauCoach, type ObjectifCoach } from './moteur';
import { useNiveauCoach } from './reglages';
import { dire, taire } from './lecteur';

type Seances = Parameters<typeof seancesDeLExo>[0];

/** une séance plus vieille que ça (brouillon repris) ne dit pas « c'est parti » */
const DEBUT_MAX_MS = 2 * 60_000;
/** un repère du repos arrivé avec plus de retard que ça (app endormie) est oublié */
const RETARD_MAX_MS = 3000;
/** repos fini depuis ce temps sans série validée, app ouverte : « concentre toi » (motivant, une fois) */
const DISTRACTION_MS = 90_000;

export function useCoachVocal(draft: MuscuDraft | null, toutesSeances?: Seances): void {
  const [niveau] = useNiveauCoach();
  // Premium plus tard : const { isPremium } = usePremium(); et actif seulement si isPremium
  const actif = !!draft && !draft.form && !draft.editId && niveau !== 'off';
  const [objectif, setObjectif] = useState<ObjectifCoach | null>(null);

  const etat = useRef(etatInitial());
  const avant = useRef<MuscuDraft | null>(null);
  const brouillon = useRef(draft);
  brouillon.current = draft;
  const seances = useRef(toutesSeances);
  seances.current = toutesSeances;
  const effectif: NiveauCoach = actif ? niveau : 'off';
  const reglages = useRef({ niveau: effectif, objectif });
  reglages.current = { niveau: effectif, objectif };
  const distraction = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emettre = useCallback((evs: EvenementCoach[]) => {
    try {
      const r = reglages.current;
      if (r.niveau === 'off') return;
      for (const ev of evs) {
        const d = decider(etat.current, ev, r, Date.now());
        etat.current = d.etat;
        if (d.phrase) {
          void dire(d.phrase);
          return;
        }
      }
    } catch {
      // le coach ne gêne jamais la séance
    }
  }, []);

  const annulerDistraction = useCallback(() => {
    if (distraction.current) clearTimeout(distraction.current);
    distraction.current = null;
  }, []);

  // ton objectif de l'onboarding, sans chiffre
  useEffect(() => {
    getEspace().then((e) => setObjectif(objectifDuProfil(e?.objectifs)), () => undefined);
  }, []);

  // coach coupé : la phrase en cours s'arrête
  useEffect(() => {
    if (niveau === 'off') taire();
  }, [niveau]);

  // début de séance (une fois, seulement une séance qui vient de commencer)
  useEffect(() => {
    if (!actif || !draft || etat.current.debutFait) return;
    const jeune = Date.now() - draft.startedAt < DEBUT_MAX_MS;
    const rien = draft.exercises.every((e) => e.sets.every((s) => !s.done));
    if (jeune && rien) emettre([{ type: 'sessionStart' }]);
  }, [actif, draft, emettre]);

  // séries, records, charge validée, moitié, exercice suivant : lus en comparant au brouillon d'avant
  useEffect(() => {
    const prec = avant.current;
    avant.current = draft;
    if (!draft || !prec || !actif) return;
    const evs = evenementsEntre(prec, draft, (ex) => chargeVaMonter(ex, seancesDeLExo(seances.current ?? [], ex.name, 2)));
    if (evs.some((e) => e.type === 'setDone')) annulerDistraction();
    if (evs.length) emettre(evs);
  }, [draft, actif, emettre, annulerDistraction]);

  // repos : dix secondes avant la fin, puis la reprise (ou la dernière série)
  const finRepos = draft?.restEndsAt ?? null;
  useEffect(() => {
    if (!actif || !finRepos) return;
    const fin = finRepos;
    const minuteurs: ReturnType<typeof setTimeout>[] = [];
    const t10 = fin - REPERE_REPOS_S * 1000 - Date.now();
    if (t10 > 1500) {
      minuteurs.push(setTimeout(() => {
        if (brouillon.current?.restEndsAt !== fin || Date.now() - (fin - REPERE_REPOS_S * 1000) > RETARD_MAX_MS) return;
        emettre([{ type: 'restTick', remaining: REPERE_REPOS_S }]);
      }, t10));
    }
    const tf = fin - Date.now();
    if (tf > 0) {
      minuteurs.push(setTimeout(() => {
        const d = brouillon.current;
        if (!d || d.restEndsAt !== fin || Date.now() - fin > RETARD_MAX_MS) return;
        emettre([{ type: 'restEnd', derniereSerie: prochaineEstDerniere(d) }]);
        annulerDistraction();
        distraction.current = setTimeout(() => {
          distraction.current = null;
          const now = brouillon.current;
          if (!now || now.restEndsAt || AppState.currentState !== 'active') return;
          emettre([{ type: 'distraction' }]);
        }, DISTRACTION_MS);
      }, tf));
    }
    return () => minuteurs.forEach(clearTimeout);
  }, [actif, finRepos, emettre, annulerDistraction]);

  // fin de séance : dite quand la séance en direct est enregistrée (lib/v2/seance/save.ts)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SEANCE_LIVE_ENREGISTREE_EVENT, () => emettre([{ type: 'sessionEnd' }]));
    return () => {
      sub.remove();
      annulerDistraction();
    };
  }, [emettre, annulerDistraction]);
}
