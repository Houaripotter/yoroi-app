/**
 * Carte « Importe tes données » de l'Accueil (18 octobre 2026).
 * Visible seulement quand c'est utile : aucune pesee et aucune seance, ou Sante jamais reliee (jamais en demo).
 * Le bouton reutilise la connexion existante (demanderAccesSanteIssue, lib/v2/sante/demandeActions.ts) puis attend
 * l'import de l'historique deja lance par la connexion (lancerImportInitial, lib/v2/sante/connecter.ts).
 * « Plus tard » la masque pour de bon (AsyncStorage). Regles pures : lib/v2/sante/importAccueil.ts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import healthConnect from '@/lib/healthConnect';
import { getTrainingsCount, getWeights } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { CarteMessage } from '@/components/yoroi/v2/messages/CarteMessage';
import { IllusSante } from '@/components/yoroi/v2/messages/Illustrations';
import { demoActive } from '@/lib/v2/demo/garde';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { demanderAccesSanteIssue } from '@/lib/v2/sante/demandeActions';
import { lancerImportInitial } from '@/lib/v2/sante/connecter';
import { lireEtatSante } from '@/lib/v2/sante/importEtat';
import { ouvrirReglagesSante } from '@/lib/v2/sante/demande';
import {
  CLE_IMPORT_ACCUEIL_FAIT,
  CLE_IMPORT_ACCUEIL_MASQUE,
  carteImportVisible,
  libellesImport,
  messageImport,
  type CompteImportAccueil,
} from '@/lib/v2/sante/importAccueil';
import type { IssueConnexion } from '@/lib/v2/sante/connexion';
import { tap } from './kit';
import { traduire } from '@/lib/i18n/tr';

/** L'import de tout l'historique peut etre long : au dela, il continue en arriere-plan */
const ATTENTE_IMPORT_MAX_MS = 180000;

type Comptes = { pesees: number; seances: number };

async function compter(): Promise<Comptes> {
  const [w, t] = await Promise.all([
    getWeights().then((l) => l?.length ?? 0).catch(() => 0),
    getTrainingsCount().then((c) => c.total).catch(() => 0),
  ]);
  return { pesees: w, seances: t };
}

async function lireDrapeau(cle: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(cle)) === 'true';
  } catch {
    return false;
  }
}

async function poserDrapeau(cle: string): Promise<void> {
  try {
    await AsyncStorage.setItem(cle, 'true');
  } catch (e) {
    logger.warn('[Accueil] import sante : drapeau non enregistre', e);
  }
}

/** Visibilite de la carte (utilisee par l'Accueil pour ne pas montrer en meme temps l'ancienne carte Sante) */
export function useCarteImportSante(sante: { loading: boolean; source: { mode: string } | null }) {
  const [comptes, setComptes] = useState<Comptes | null>(null);
  const [drapeaux, setDrapeaux] = useState<{ demo: boolean; masquee: boolean; faite: boolean } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const relire = useCallback(async () => {
    const [c, demo, masquee, faite] = await Promise.all([compter(), demoActive(), lireDrapeau(CLE_IMPORT_ACCUEIL_MASQUE), lireDrapeau(CLE_IMPORT_ACCUEIL_FAIT)]);
    setComptes(c);
    setDrapeaux({ demo, masquee, faite });
  }, []);

  useEffect(() => {
    void relire();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, () => void relire());
    return () => sub.remove();
  }, [relire]);

  const visible =
    enCours ||
    carteImportVisible({
      pret: comptes !== null && drapeaux !== null && !sante.loading,
      demo: drapeaux?.demo ?? true,
      masquee: drapeaux?.masquee ?? true,
      faite: drapeaux?.faite ?? false,
      pesees: comptes?.pesees ?? 0,
      seances: comptes?.seances ?? 0,
      santeRelie: sante.source?.mode === 'live',
    });

  const masquer = useCallback(async () => {
    setDrapeaux((d) => (d ? { ...d, masquee: true } : d));
    await poserDrapeau(CLE_IMPORT_ACCUEIL_MASQUE);
  }, []);

  const marquerFaite = useCallback(async () => {
    setDrapeaux((d) => (d ? { ...d, faite: true } : d));
    await poserDrapeau(CLE_IMPORT_ACCUEIL_FAIT);
  }, []);

  return { visible, enCours, setEnCours, masquer, marquerFaite };
}

type Controle = ReturnType<typeof useCarteImportSante>;

export function CarteImportSante({ controle, onImporte }: { controle: Controle; onImporte: () => void }) {
  const { enCours, setEnCours, masquer, marquerFaite } = controle;
  const verrou = useRef(false);
  const l = libellesImport(Platform.OS);

  const importer = async () => {
    if (verrou.current) return;
    verrou.current = true;
    setEnCours(true);
    let issue: IssueConnexion = 'erreur';
    let compte: CompteImportAccueil | null = null;
    let longue = false;
    try {
      const avant = await compter();
      // la demande d'autorisation existante (fenetre du systeme, verification par une vraie lecture)
      issue = await demanderAccesSanteIssue({ alerte: false });
      if (issue === 'connecte') {
        // la connexion a deja lance l'import de l'historique : on attend sa fin (meme promesse, pas de deuxieme import)
        if (lancerImportInitial.enCours()) {
          // audit 18 octobre : le minuteur de 3 minutes est arrete des que l'import se termine
          let minuteur: ReturnType<typeof setTimeout> | null = null;
          const fin = await Promise.race([
            lancerImportInitial().then(() => 'fin' as const),
            new Promise<'delai'>((r) => {
              minuteur = setTimeout(() => r('delai'), ATTENTE_IMPORT_MAX_MS);
            }),
          ]).finally(() => {
            if (minuteur) clearTimeout(minuteur);
          });
          longue = fin === 'delai';
        }
        const apres = await compter();
        compte = {
          pesees: Math.max(0, apres.pesees - avant.pesees),
          seances: Math.max(0, apres.seances - avant.seances),
          nuits: Math.max(0, Number(lireEtatSante().compte?.sleep) || 0),
        };
        tap('success');
        await marquerFaite();
        onImporte();
      }
    } catch (e) {
      logger.warn('[Accueil] import sante', e);
    } finally {
      verrou.current = false;
      setEnCours(false);
    }

    if (longue) {
      appAlert('Import en cours', traduire('L’import continue en arrière-plan. Tes données arrivent d’ici quelques minutes.'));
      return;
    }
    const m = messageImport(issue, Platform.OS, compte);
    if (m.action === 'playstore') {
      const fn = (healthConnect as unknown as { openHealthConnectPlayStore?: () => Promise<void> }).openHealthConnectPlayStore;
      appAlert(m.titre, m.texte, [
        { text: traduire('Plus tard'), style: 'cancel' },
        { text: traduire('Installer'), onPress: () => void (typeof fn === 'function' ? fn.call(healthConnect) : undefined) },
      ]);
      return;
    }
    if (m.action === 'reglages') {
      const fn = (healthConnect as unknown as { openHealthConnectSettings?: () => Promise<void> }).openHealthConnectSettings;
      appAlert(m.titre, m.texte, [
        { text: traduire('Plus tard'), style: 'cancel' },
        {
          text: Platform.OS === 'android' ? 'Ouvrir Health Connect' : traduire('Ouvrir Santé'),
          onPress: () => void ouvrirReglagesSante(Platform.OS === 'android' && typeof fn === 'function' ? () => fn.call(healthConnect) : undefined),
        },
      ]);
      return;
    }
    appAlert(m.titre, m.texte);
  };

  return (
    <CarteMessage
      illustration={<IllusSante size={64} disque />}
      titre={l.titre}
      texte={l.texte}
      principal={{ label: l.bouton, onPress: () => void importer(), busy: enCours, busyLabel: l.enCours }}
      liens={enCours ? [] : [{ label: l.plusTard, onPress: () => void masquer() }]}
    />
  );
}

export default CarteImportSante;
