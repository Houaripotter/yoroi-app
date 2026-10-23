/**
 * Ecoute les demandes de bilan qui arrivent sans ecran (montre, widgets) et ouvre la page de bilan,
 * une seule fois pour un lot : plusieurs seances recues d'un coup donnent un seul bilan (la derniere,
 * avec le nombre recu). Jamais par-dessus une autre fenetre, et rien si le bilan automatique est coupe.
 * Monte au-dessus des onglets.
 * 16 octobre (agent BILAN COULEURS) : heberge aussi la feuille « Tu aimes YOROI ? », ouverte 5 secondes
 * apres « Terminer » d'un bilan (lib/v2/bilan/avis.ts), jamais par-dessus une autre fenetre.
 */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import { _fenetreCurrent } from '@/components/yoroi/v2/fenetre/api';
import { propositionEnCours } from '@/lib/v2/notifications/permission';
import { BILAN_DEMANDE_EVENT, lienBilan, lireBilanAuto } from '@/lib/v2/bilan/reglage';
import type { DemandeBilan } from '@/lib/v2/bilan/reglage';
import { AVIS_MAISON_EVENT, avisMontre, avisNote, avisPlusTard, peutMontrerAvis } from '@/lib/v2/bilan/avis';
import { AvisFeuille, ouvrirNoteStore } from '@/components/yoroi/v2/bilan/AvisFeuille';

const REGROUPE_MS = 1500;

export function BilanAuto() {
  const router = useRouter();
  const lot = useRef<DemandeBilan[]>([]);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [avis, setAvis] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(AVIS_MAISON_EVENT, () => {
      void (async () => {
        if (AppState.currentState !== 'active') return;
        if (!(await peutMontrerAvis(!!_fenetreCurrent() || propositionEnCours()))) return;
        await avisMontre();
        setAvis(true);
      })();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const ouvrir = async () => {
      const l = lot.current;
      lot.current = [];
      if (!l.length) return;
      if (!(await lireBilanAuto())) return;
      if (AppState.currentState !== 'active' || _fenetreCurrent() || propositionEnCours()) return;
      const seances = l.filter((d): d is Extract<DemandeBilan, { type: 'seance' }> => d.type === 'seance');
      const d: DemandeBilan = seances.length ? { ...seances[seances.length - 1], recues: seances.length } : l[l.length - 1];
      router.push(lienBilan(d) as never);
    };
    const sub = DeviceEventEmitter.addListener(BILAN_DEMANDE_EVENT, (d: DemandeBilan) => {
      lot.current.push(d);
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => void ouvrir(), REGROUPE_MS);
    });
    return () => {
      sub.remove();
      if (t.current) clearTimeout(t.current);
    };
  }, [router]);

  return (
    <AvisFeuille
      visible={avis}
      onNoter={() => {
        setAvis(false);
        void avisNote().then(ouvrirNoteStore);
      }}
      onPlusTard={() => {
        setAvis(false);
        void avisPlusTard();
      }}
    />
  );
}
