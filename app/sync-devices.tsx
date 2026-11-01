/**
 * Synchronisation locale entre tes appareils, iPhone, iPad et Mac. 100 % en local.
 *
 * 13 octobre 2026 : seulement avec un appareil appaire par un code a 6 chiffres. Voir lib/peerSyncService.ts.
 * 30 octobre 2026 : la synchro est automatique (lib/v2/synchro/auto.ts) quand l'app est ouverte et un appareil
 * appaire proche ; cet ecran la garde en marche pour appairer, il ne l'arrete plus en se fermant.
 * 31 octobre 2026 (Houari : « fais-moi un truc hyper simple pour les raccorder entre eux ») : un seul ecran
 * « Relie tes appareils ». Ouvert sur les deux appareils, ils se voient tout seuls ; « Relier » sur l'un affiche
 * le code, l'autre propose aussitot de le taper. Etapes dans lib/v2/synchro/ecranRelier.ts, rendu dans
 * components/yoroi/v2/synchro/Relier.tsx.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Label } from '@/components/yoroi/v2/sante/ui';
import {
  annulerAppairage,
  commencerAppairageAffiche,
  commencerAppairageSaisi,
  forceSync,
  getSyncStatus,
  ignorerInvitation,
  isPeerSyncAvailable,
  onSyncStatusChange,
  oublierAppareil,
} from '@/lib/peerSyncService';
import { garderSynchro } from '@/lib/v2/synchro/auto';
import { etapeRelier, appareilsAProposer, secondesRestantes } from '@/lib/v2/synchro/ecranRelier';
import type { SyncStatus } from '@/lib/peerSyncService';
import EtatSynchro from '@/components/yoroi/v2/synchro/EtatSynchro';
import { RelierVue } from '@/components/yoroi/v2/synchro/Relier';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function SyncDevicesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'neutral' | 'good' | 'bad' } | null>(null);
  const [isAvailable] = useState<boolean>(isPeerSyncAvailable());
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [saisie, setSaisie] = useState('');
  const [maintenant, setMaintenant] = useState(Date.now());

  useEffect(() => {
    // Ecran ouvert : la recherche tourne, meme sans appareil appaire (pour appairer). En le quittant, la synchro
    // automatique continue si un appareil est appaire, sinon elle s'arrete.
    const relacher = isAvailable ? garderSynchro('ecran') : () => undefined;
    const unsub = onSyncStatusChange(setStatus);
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => {
      unsub();
      clearInterval(t);
      relacher();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status.appairageResultat === 'reussi') {
      setSaisieOuverte(false);
      setSaisie('');
      setMsg({ tone: 'good', text: traduire('Reliés. La synchro se fait toute seule quand tes appareils sont proches et YOROI ouvert.') });
    } else if (status.appairageResultat === 'expire') {
      setMsg({ tone: 'bad', text: traduire('Le code a expiré. Touche « Relier » de nouveau.') });
    } else if (status.appairageResultat === 'mauvais_code') {
      // 1er novembre 2026 : code faux, la saisie se rouvre tout de suite
      setSaisie('');
      setSaisieOuverte(true);
      setMsg({ tone: 'bad', text: traduire('Ce n’est pas le bon code. Regarde ton autre appareil et retape-le.') });
    } else if (status.appairageResultat === 'annule') {
      setSaisieOuverte(false);
      setSaisie('');
    }
  }, [status.appairageResultat]);

  const nomsPaires = status.paires.map((p) => p.nom);
  const entree = {
    disponible: isAvailable,
    rechercheDepuis: status.rechercheDepuis,
    maintenant,
    aProximite: status.aProximite,
    connectes: status.connectedPeers,
    nomsPaires,
    appairage: status.appairage,
    invitation: status.invitation,
    saisieOuverte,
    erreurReseau: status.erreurReseau,
  };
  const etape = etapeRelier(entree);
  const proposes = appareilsAProposer(entree);

  const relier = useCallback(async () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setMsg(null);
    setSaisieOuverte(false);
    setSaisie('');
    await commencerAppairageAffiche();
  }, []);

  const validerCode = useCallback(async () => {
    setMsg(null);
    const ok = await commencerAppairageSaisi(saisie);
    if (!ok) setMsg({ tone: 'bad', text: traduire('Le code fait 6 chiffres.') });
    else setSaisieOuverte(false);
  }, [saisie]);

  const annuler = useCallback(() => {
    setSaisieOuverte(false);
    setSaisie('');
    ignorerInvitation();
    annulerAppairage();
  }, []);

  const synchroniser = useCallback(async () => {
    if (syncing) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setSyncing(true);
    setMsg(null);
    try {
      const count = await forceSync();
      if (count === 0) setMsg({ tone: 'bad', text: traduire('Problème : vérifie que le Wi-Fi ou le Bluetooth est activé et que YOROI est ouvert sur les deux.') });
      else setMsg({ tone: 'good', text: traduirePluriel(count, count > 1, "Synchronisation envoyée à {0} appareil. Les données se mettent à jour dans quelques secondes.", "Synchronisation envoyée à {0} appareils. Les données se mettent à jour dans quelques secondes.", count) });
    } catch (e: any) {
      setMsg({ tone: 'bad', text: traduire("Erreur : {0}", e?.message || traduire('inconnue')) });
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  const derniereSynchro = status.lastSyncTs
    ? (() => {
        try {
          return format(parseISO(status.lastSyncTs), traduire("d MMM yyyy 'à' HH:mm"), { locale: fr });
        } catch {
          return status.lastSyncTs;
        }
      })()
    : null;

  return (
    <DetailScreen title={traduire('Relie tes appareils')} subtitle={traduire('iPhone, iPad et Mac, sans internet')}>
      <RelierVue
        etape={etape}
        proposes={proposes}
        connectes={status.connectedPeers}
        paires={status.paires}
        code={status.appairage?.role === 'affiche' ? status.appairage.code : null}
        secondes={status.appairage ? secondesRestantes(status.appairage.expireA, maintenant) : 0}
        invitationDe={status.invitation?.device ?? null}
        saisie={saisie}
        onSaisie={setSaisie}
        onRelier={() => { void relier(); }}
        onValiderCode={() => { void validerCode(); }}
        onAnnuler={annuler}
        onAfficherCode={() => { void relier(); }}
        onJaiUnCode={() => { setMsg(null); setSaisie(''); setSaisieOuverte(true); }}
        onSynchroniser={() => { void synchroniser(); }}
        synchroEnCours={syncing}
        message={msg}
        onOuvrirReglages={() => { void Linking.openSettings().catch(() => undefined); }}
        onOublier={(id) => { void oublierAppareil(id); }}
        derniereSynchro={derniereSynchro}
        onJournal={() => router.push('/sync-history' as any)}
        apresRelies={
          <>
            <Label>{traduire('Dernier échange')}</Label>
            <EtatSynchro />
          </>
        }
      />
    </DetailScreen>
  );
}
