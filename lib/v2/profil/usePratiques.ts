/**
 * Tes pratiques dans un ecran (28 octobre 2026) : lecture (avec la migration a la volee), mise a jour
 * immediate a chaque appui, et le club de chaque pratique (nom, logo importe) dans la table clubs.
 * Les ecrans ouverts se redessinent quand la liste change (evenement EVENT_PRATIQUES) ou quand un club
 * change ailleurs (DATA_CHANGED_EVENT).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { addClub, getClubs, updateClub } from '@/lib/database';
import type { Club } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { EVENT_PRATIQUES, ecrirePratiques, lierClub, lirePratiques, type EtatPratiques } from './pratiques';

export function usePratiques(sportCombatFavori?: string | null) {
  const [etat, setEtat] = useState<EtatPratiques>({ v: 1, pratiques: [], ignores: [] });
  const [clubs, setClubs] = useState<Club[]>([]);
  const [pret, setPret] = useState(false);
  const etatRef = useRef(etat);
  etatRef.current = etat;
  const favRef = useRef(sportCombatFavori);
  favRef.current = sportCombatFavori;

  const charger = useCallback(async () => {
    try {
      const cl = await getClubs().catch(() => [] as Club[]);
      const e = await lirePratiques(cl, favRef.current);
      setClubs(cl);
      setEtat({ v: 1, pratiques: e.pratiques, ignores: e.ignores });
    } catch (err) {
      logger.error('[Profil] pratiques', err);
    } finally {
      setPret(true);
    }
  }, []);

  useEffect(() => {
    charger();
    const a = DeviceEventEmitter.addListener(EVENT_PRATIQUES, charger);
    const b = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, charger);
    return () => {
      a.remove();
      b.remove();
    };
  }, [charger]);

  /** Applique un changement tout de suite a l'ecran, puis l'enregistre */
  const changer = useCallback(async (fn: (e: EtatPratiques) => EtatPratiques) => {
    const n = fn(etatRef.current);
    etatRef.current = n;
    setEtat(n);
    try {
      await ecrirePratiques(n);
    } catch (err) {
      logger.error('[Profil] enregistrement des pratiques', err);
    }
  }, []);

  /** Le club d'une pratique : modifie le club lie, ou en cree un (nom, logo importe), puis le relie */
  const enregistrerClub = useCallback(async (pratiqueId: string, o: { nom: string; logo: string | null; clubExistant?: number | null }) => {
    const p = etatRef.current.pratiques.find((x) => x.id === pratiqueId);
    if (!p) return;
    const nom = o.nom.trim();
    let id: number | null = o.clubExistant ?? null;
    if (id == null && nom) {
      const lie = p.clubId != null ? clubs.find((c) => c.id === p.clubId) : undefined;
      if (lie?.id != null) {
        await updateClub(lie.id, { name: nom, logo_uri: o.logo ?? '' });
        id = lie.id;
      } else {
        id = await addClub({ name: nom, sport: p.sport, logo_uri: o.logo ?? undefined });
      }
    }
    const club = id != null ? (await getClubs().catch(() => clubs)).find((c) => c.id === id) : undefined;
    await changer((e) => lierClub(e, pratiqueId, { id, nom: club?.name ?? (nom || null) }));
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
  }, [clubs, changer]);

  return { etat, pratiques: etat.pratiques, clubs, pret, changer, enregistrerClub, recharger: charger };
}
