/**
 * Carte discrete de l'Accueil (14 octobre 2026) : relier Apple Sante ou Health Connect, apres un refus ou un « Plus tard ».
 * Au plus 3 fois (apres la 1re seance notee a la main, puis 3 jours, puis 7 jours), « Ne plus me demander » coupe tout
 * (calendrier : lib/v2/sante/demande.ts).
 * iOS ne remontre jamais sa fenetre : la carte affiche alors les etapes et ouvre l'app Sante.
 * Gabarit commun des messages illustres (components/yoroi/v2/messages, 15 octobre 2026).
 * Elle verifie aussi qu'une autorisation donne vraiment des donnees (iOS ne dit pas si la lecture est refusee).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import healthConnect from '@/lib/healthConnect';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, tap } from './kit';
import { CarteMessage } from '@/components/yoroi/v2/messages/CarteMessage';
import { IllusSante } from '@/components/yoroi/v2/messages/Illustrations';
import {
  aDesDonneesSante,
  apresAutorisation,
  apresLecture,
  apresRefus,
  cheminReglagesIos,
  etapesReglages,
  getDemandeSante,
  modeDemande,
  nomSante,
  ouvrirReglagesSante,
  relanceDue,
  saveDemandeSante,
  type DemandeSante,
} from '@/lib/v2/sante/demande';
import { demanderAccesSante, nePlusDemanderSante, reporterRelanceSante, seancesManuelles } from '@/lib/v2/sante/demandeActions';
import { traduire } from '@/lib/i18n/tr';

type SanteVue = { loading: boolean; source: { mode: string } | null; series: Record<string, { value: number }[] | undefined> | null; reload: () => void };

export function CarteSante({ sante }: { sante: SanteVue }) {
  const [etat, setEtat] = useState<DemandeSante | null>(null);
  const [visible, setVisible] = useState(false);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const partiReglages = useRef(false);
  const mode = sante.source?.mode ?? null;
  const donnees = aDesDonneesSante(sante.series);

  const evaluer = useCallback(async () => {
    if (sante.loading || (mode !== 'off' && mode !== 'live')) {
      setVisible(false);
      return;
    }
    const now = new Date();
    const n = await seancesManuelles();
    const avant = await getDemandeSante();
    let s = avant;
    // relie ailleurs (Reglages, ancienne version) : on le note, puis on verifie la lecture
    if (mode === 'live' && s.statut !== 'acceptee' && !s.lectureVide) s = apresAutorisation(s, now);
    // (deconnecte depuis YOROI : c'est un choix, on ne relance pas)
    if (s.statut === 'acceptee' && mode === 'live') s = apresLecture(s, now, donnees, n);
    // jamais propose sur ce telephone (sauvegarde restauree...) : le calendrier commence aujourd'hui
    if (s.statut === 'jamais' && mode === 'off') s = apresRefus(s, now, n, 'passee');
    if (JSON.stringify(s) !== JSON.stringify(avant)) await saveDemandeSante(s);
    setEtat(s);
    setVisible(relanceDue(s, now, n));
  }, [sante.loading, mode, donnees]);

  useEffect(() => {
    void evaluer();
  }, [evaluer]);

  // retour des Reglages ou de l'app Sante : on relit
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && partiReglages.current) {
        partiReglages.current = false;
        // Android : les autorisations donnees dans Health Connect se recuperent sans fenetre
        if (Platform.OS === 'android') void demanderAccesSante({ alerte: false }).then(() => sante.reload());
        else sante.reload();
      }
    });
    return () => sub.remove();
  }, [sante]);

  if (!visible || !etat) return null;
  const nom = nomSante();
  const reglages = guide || modeDemande(etat, Platform.OS) === 'reglages';
  const titre = etat.lectureVide ? traduire("YOROI ne reçoit rien de {0}", nom) : traduire("Relie {0} à YOROI", nom);
  const texte = reglages
    ? traduire('La fenêtre d’autorisation ne revient pas toute seule. Ça se règle en trois touches :')
    : traduire('Tes pesées, tes pas et tes séances arrivent tout seuls. Rien ne quitte ton téléphone.');

  const autoriser = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // la carte affiche elle-meme les etapes (guide) : pas de fenetre en plus
      const ok = await demanderAccesSante({ alerte: false });
      if (ok) {
        tap('success');
        setVisible(false);
        sante.reload();
      } else {
        setGuide(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const ouvrir = async () => {
    partiReglages.current = true;
    // on laisse le temps de regler, puis la lecture dira si c'est bon ; la relance compte
    await reporterRelanceSante();
    // iOS : la lecture des prochains jours dira si l'acces est ouvert (au plus 3 relances en tout)
    if (Platform.OS === 'ios') await saveDemandeSante(apresAutorisation(await getDemandeSante(), new Date()));
    setVisible(false);
    const fn = (healthConnect as unknown as { openHealthConnectSettings?: () => Promise<void> }).openHealthConnectSettings;
    await ouvrirReglagesSante(Platform.OS === 'android' && typeof fn === 'function' ? () => fn.call(healthConnect) : undefined);
  };

  const plusTard = async () => {
    setVisible(false);
    await reporterRelanceSante();
  };

  const jamais = async () => {
    setVisible(false);
    await nePlusDemanderSante();
  };

  const app = Platform.OS === 'android' ? 'Health Connect' : 'Santé';
  return (
    <CarteMessage
      illustration={<IllusSante size={64} disque />}
      titre={titre}
      texte={texte}
      principal={reglages ? { label: `Ouvrir ${app}`, onPress: ouvrir } : { label: traduire('Autoriser'), onPress: autoriser, busy, busyLabel: traduire('Un instant…') }}
      liens={[
        { label: traduire('Plus tard'), onPress: plusTard },
        { label: traduire('Ne plus demander'), onPress: jamais },
      ]}
    >
      {reglages ? (
        <View style={{ gap: 4, paddingLeft: 78 }}>
          {etapesReglages().map((e, i) => (
            <Ink key={i} size={13} color={P.ink} style={{ lineHeight: 19 }}>{`${i + 1}. ${e}`}</Ink>
          ))}
          {Platform.OS === 'ios' ? <Ink size={12} color={P.ink2} style={{ lineHeight: 17 }}>{cheminReglagesIos}</Ink> : null}
        </View>
      ) : null}
    </CarteMessage>
  );
}

export default CarteSante;
