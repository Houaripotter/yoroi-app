/**
 * « Séance supprimée, Annuler », « Pesée supprimée, Annuler » (28 octobre 2026, audit « ne jamais perdre de
 * données »). Après chaque suppression d'une séance, d'une pesée ou d'une mensuration (lib/database.native.ts deleteTraining, qui la met d'abord à la corbeille), une barre
 * reste 8 secondes en bas de l'écran : « Annuler » la remet telle quelle. Ensuite, elle reste 30 jours dans la
 * Corbeille (app/corbeille.tsx). Monté une fois, dans app/_layout.tsx : visible quel que soit l'écran.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/v2/accueil/kit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { EVENEMENT_CORPS_SUPPRIME, restaurerCorpsSupprime, restaurerSeanceSupprimee, SEANCE_SUPPRIMEE, texteSuppression } from '@/lib/v2/seances/corbeille';
import type { QuoiSupprime } from '@/lib/v2/seances/corbeille';
import { traduire } from '@/lib/i18n/tr';

const DUREE_MS = 8000;
/** Suppressions arrivées ensemble (un jour entier : pesée et mensurations) : un seul « Annuler » pour tout */
const ENSEMBLE_MS = 1500;

type Supprime = { quoi: QuoiSupprime; trashId: number; at: number };


export function AnnulerSuppression() {
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<Supprime[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const occupe = useRef(false);

  const fermer = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
    setListe([]);
  }, []);

  useEffect(() => {
    const ajouter = (quoi: Supprime['quoi']) => (e: { trashId?: number }) => {
      if (!e?.trashId) return;
      const now = Date.now();
      if (minuteur.current) clearTimeout(minuteur.current);
      setListe((l) => [...l.filter((x) => now - x.at < ENSEMBLE_MS), { quoi, trashId: e.trashId!, at: now }]);
      minuteur.current = setTimeout(() => setListe([]), DUREE_MS);
    };
    const subs = [
      DeviceEventEmitter.addListener(SEANCE_SUPPRIMEE, ajouter('seance')),
      DeviceEventEmitter.addListener(EVENEMENT_CORPS_SUPPRIME, (e: { trashId?: number; kind?: string }) => ajouter(e?.kind === 'measurements' ? 'measurements' : 'weights')(e)),
    ];
    return () => {
      subs.forEach((x) => x.remove());
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  const annuler = async () => {
    if (!liste.length || occupe.current) return;
    occupe.current = true;
    const aRemettre = liste;
    fermer();
    try {
      for (const x of aRemettre) {
        if (x.quoi === 'seance') await restaurerSeanceSupprimee(x.trashId);
        else await restaurerCorpsSupprime(x.trashId);
      }
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    } catch {
      appAlert(traduire('Oups'), traduire('Ce qui a été supprimé n’a pas pu être remis. Tout reste dans la corbeille, 30 jours.'));
    } finally {
      occupe.current = false;
    }
  };

  if (!liste.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingLeft: 18, paddingRight: 6, borderRadius: 27, backgroundColor: P.ink }}>
        <Ink size={14} weight="extraBold" color={P.white} style={{ flex: 1 }}>{texteSuppression(liste)}</Ink>
        <Pressable onPress={annuler} accessibilityRole="button" accessibilityLabel={traduire('Annuler la suppression')} hitSlop={8} style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center' }}>
          <Ink size={15} weight="black" color={P.goldLight}>{traduire('Annuler')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}
