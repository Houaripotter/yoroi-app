/**
 * Rappel de copie de l'accueil (refait le 15 octobre 2026, carte de message illustree).
 * Il n'y a pas de compte : tes donnees restent sur ton telephone. Si ta derniere copie HORS du telephone
 * (partage vers ton cloud, ou dossier cloud relie) date de plus de 7 jours, ou s'il n'y en a jamais eu
 * passe les 48 premieres heures, la carte le dit simplement. Les sauvegardes automatiques restent
 * sur le telephone : elles ne comptent pas ici (un telephone perdu les emporte avec lui).
 * « Faire ma copie » ouvre la feuille de partage ; « Plus tard » la range 7 jours. Jamais rouge, jamais culpabilisant.
 *
 * 18 octobre 2026 : la carte propose d'abord la COPIE AUTOMATIQUE (lib/v2/sauvegarde/copieAuto.ts) : un dossier
 * iCloud Drive ou Google Drive choisi une fois, puis une copie chaque jour sans rien faire. Une fois active,
 * la carte disparait. Elle revient seulement si la copie automatique ne passe plus depuis 3 jours.
 * Sans module natif (web, Expo Go) : la copie a la main, comme avant.
 *
 * 28 octobre 2026 : plus d'attente de 48 heures. La proposition vient des que tu as quelque chose a proteger,
 * apres la visite guidee et la carte du coach, sans jamais deux cartes a la fois ni le meme jour que la carte de
 * fin de seance. La regle, testee a part : lib/v2/sauvegarde/momentCopie.ts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getLastOffPhoneBackupDate, sauvegarderMaintenant } from '@/lib/v2/sauvegarde/rappel';
import { heuresDepuisInstallation, lireMontreeFinSeance, lirePlusTard, montrerCarteAccueil, noterMontreeAccueil, noterPlusTard, premierMomentArrive } from '@/lib/v2/sauvegarde/momentCopie';
import { localISO } from '@/lib/v2/accueil/hydration';
import { PROPOSITION_COACH_EVENT, lireProposition } from '@/lib/v2/onboarding/propositionCoach';
import { lireDepart } from '@/lib/v2/programmes/depart';
import { isVisiteDone } from '@/components/yoroi/v2/tour/keys';
import { useVisiteEnCours } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { PROTECTION_CHANGED_EVENT, etatProtection, joursDepuisCopie, lireProtection, type EtatProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { texteCopieAuto } from '@/lib/v2/sauvegarde/textesCopie';
import { lancerCopieAuto } from '@/components/yoroi/v2/sauvegarde/lancerCopieAuto';
import { CarteMessage } from '@/components/yoroi/v2/messages/CarteMessage';
import { IllusSauvegarde } from '@/components/yoroi/v2/messages/Illustrations';
import { traduire } from '@/lib/i18n/tr';

/**
 * Ta premiere pesee ou ta premiere seance enregistree apres l'onboarding : il y a quelque chose a proteger.
 * Le poids donne pendant l'onboarding est deja une pesee a la main : il en faut donc une deuxieme.
 */
async function aDesDonnees(): Promise<boolean> {
  try {
    const db = await import('@/lib/database');
    const ws = await db.getWeights().catch(() => []);
    if ((ws ?? []).filter((w) => (w.source ?? 'manual') === 'manual' && Number(w.weight) > 0).length >= 2) return true;
    const ts = await db.getTrainings().catch(() => []);
    return (ts ?? []).length > 0;
  } catch {
    return false;
  }
}

/** Titre et texte de la carte (exportes pour les tests et la galerie) */
export function texteRappelCopie(days: number | null, os: string = Platform.OS): { titre: string; texte: string } {
  const cloud = os === 'android' ? 'Google Drive' : 'iCloud Drive';
  if (days === null) {
    return { titre: traduire('Tes données vivent sur ce téléphone'), texte: traduire("Une copie dans {0} les garde à l’abri, même si tu changes de téléphone.", cloud) };
  }
  return { titre: traduire("Ta dernière copie a {0} jours", days), texte: traduire("Une copie fraîche dans {0} garde tes dernières séances à l’abri.", cloud) };
}

export function BackupNotice() {
  const router = useRouter();
  const [state, setState] = useState<{ show: boolean; days: number | null; etat: EtatProtection; dossier: string | null }>({ show: false, days: null, etat: 'non_dispo', dossier: null });
  const [busy, setBusy] = useState(false);

  const visiteEnCours = useVisiteEnCours();

  const load = useCallback(async () => {
    try {
      const now = Date.now();
      const aujourdhui = localISO(new Date(now));
      const [heures, plusTardLe, autreCarteLe, infos, visiteFaite, proposition, depart] = await Promise.all([
        heuresDepuisInstallation(now),
        lirePlusTard(),
        lireMontreeFinSeance(),
        lireProtection(),
        isVisiteDone().catch(() => false),
        lireProposition(),
        lireDepart().catch(() => null),
      ]);
      const etat = etatProtection(infos);
      const auto = etat !== 'non_dispo';
      const last = auto ? null : await getLastOffPhoneBackupDate();
      const days = auto ? joursDepuisCopie(infos) : last ? Math.floor((now - last.getTime()) / 86400000) : null;
      const base = {
        etat,
        joursDepuisCopie: auto ? null : days,
        heuresDepuisInstallation: heures,
        visiteFaite,
        visiteEnCours,
        coachEnAttente: proposition === 'a_proposer' && depart == null,
        aDesDonnees: false,
        plusTardLe,
        autreCarteLe,
        aujourdhui,
        now,
      };
      // les donnees ne se lisent que si elles peuvent changer la reponse
      if (!premierMomentArrive(base) && !base.visiteEnCours && !base.coachEnAttente) base.aDesDonnees = await aDesDonnees();
      const show = montrerCarteAccueil(base);
      if (show) void noterMontreeAccueil(aujourdhui);
      setState({ show, days, etat, dossier: auto ? infos.dossier : null });
    } catch {
      setState({ show: false, days: null, etat: 'non_dispo', dossier: null });
    }
  }, [visiteEnCours]);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_DONE', load);
      const sub2 = DeviceEventEmitter.addListener(PROTECTION_CHANGED_EVENT, load);
      // la carte du coach vient d'etre repondue : la copie peut venir tout de suite, une carte apres l'autre
      const sub3 = DeviceEventEmitter.addListener(PROPOSITION_COACH_EVENT, () => setTimeout(load, 600));
      return () => {
        sub.remove();
        sub2.remove();
        sub3.remove();
      };
    }, [load]),
  );

  // fin de la visite guidee : on relit un peu apres, le temps qu'elle soit notee faite
  useEffect(() => {
    if (visiteEnCours) return;
    const t = setTimeout(load, 1500);
    return () => clearTimeout(t);
  }, [visiteEnCours, load]);

  if (!state.show) return null;
  const auto = state.etat === 'a_activer' || state.etat === 'en_panne';
  const t = auto ? texteCopieAuto(state.etat, state.days, state.dossier) : { ...texteRappelCopie(state.days), bouton: traduire('Faire ma copie') };
  const { titre, texte } = t;

  const activer = () => lancerCopieAuto(() => load());

  const copier = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await sauvegarderMaintenant();
      if (!ok) router.push('/backup-history' as any);
    } finally {
      setBusy(false);
      load();
    }
  };

  const plusTard = async () => {
    setState((s) => ({ ...s, show: false }));
    await noterPlusTard();
  };

  return (
    <CarteMessage
      illustration={<IllusSauvegarde size={64} disque />}
      titre={titre}
      texte={texte}
      principal={{ label: t.bouton, onPress: auto ? activer : copier, busy, busyLabel: traduire('Un instant…') }}
      liens={[{ label: traduire('Plus tard'), onPress: plusTard }]}
    />
  );
}
