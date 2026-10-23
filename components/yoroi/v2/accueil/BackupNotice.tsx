/**
 * Rappel de copie de l'accueil (refait le 15 octobre 2026, carte de message illustree).
 * Il n'y a pas de compte : tes donnees restent sur ton telephone. Si ta derniere copie HORS du telephone
 * (partage vers ton cloud, ou dossier cloud relie) date de plus de 7 jours, ou s'il n'y en a jamais eu
 * passe les 48 premieres heures, la carte le dit simplement. Les sauvegardes automatiques restent
 * sur le telephone : elles ne comptent pas ici (un telephone perdu les emporte avec lui).
 * « Faire ma copie » ouvre la feuille de partage ; « Plus tard » la range 3 jours. Jamais rouge, jamais culpabilisant.
 *
 * 18 octobre 2026 : la carte propose d'abord la COPIE AUTOMATIQUE (lib/v2/sauvegarde/copieAuto.ts) : un dossier
 * iCloud Drive ou Google Drive choisi une fois, puis une copie chaque jour sans rien faire. Une fois active,
 * la carte disparait. Elle revient seulement si la copie automatique ne passe plus depuis 3 jours.
 * Sans module natif (web, Expo Go) : la copie a la main, comme avant.
 */
import React, { useCallback, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLastOffPhoneBackupDate, sauvegarderMaintenant } from '@/lib/v2/sauvegarde/rappel';
import { PROTECTION_CHANGED_EVENT, etatProtection, joursDepuisCopie, lireProtection, type EtatProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { texteCopieAuto } from '@/lib/v2/sauvegarde/textesCopie';
import { lancerCopieAuto } from '@/components/yoroi/v2/sauvegarde/lancerCopieAuto';
import { CarteMessage } from '@/components/yoroi/v2/messages/CarteMessage';
import { IllusSauvegarde } from '@/components/yoroi/v2/messages/Illustrations';
import { traduire } from '@/lib/i18n/tr';

const WARNING_DAYS = 7;
const GRACE_HOURS = 48;
const LATER_DAYS = 3;
const INSTALL_DATE_KEY = '@yoroi_install_date';
const LATER_KEY = '@yoroi_rappel_copie_plus_tard';

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

  const load = useCallback(async () => {
    try {
      let grace = false;
      const raw = await AsyncStorage.getItem(INSTALL_DATE_KEY);
      if (!raw) {
        await AsyncStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
        grace = true;
      } else {
        grace = (Date.now() - new Date(raw).getTime()) / 3600000 < GRACE_HOURS;
      }
      const later = await AsyncStorage.getItem(LATER_KEY);
      const snoozed = later ? (Date.now() - new Date(later).getTime()) / 86400000 < LATER_DAYS : false;
      const infos = await lireProtection();
      const etat = etatProtection(infos);
      if (etat !== 'non_dispo') {
        // copie automatique : rien a dire quand elle marche ; a activer apres les 48 premieres heures
        const show = etat === 'en_panne' || (etat === 'a_activer' && !grace);
        setState({ show: show && !snoozed, days: joursDepuisCopie(infos), etat, dossier: infos.dossier });
        return;
      }
      const last = await getLastOffPhoneBackupDate();
      const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
      const due = days === null ? !grace : days >= WARNING_DAYS;
      setState({ show: due && !snoozed, days, etat, dossier: null });
    } catch {
      setState({ show: false, days: null, etat: 'non_dispo', dossier: null });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const sub = DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_DONE', load);
      const sub2 = DeviceEventEmitter.addListener(PROTECTION_CHANGED_EVENT, load);
      return () => {
        sub.remove();
        sub2.remove();
      };
    }, [load]),
  );

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
    try {
      await AsyncStorage.setItem(LATER_KEY, new Date().toISOString());
    } catch {
      // la carte reviendra a la prochaine ouverture, rien de grave
    }
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
