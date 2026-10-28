/**
 * Studio, rubrique Demo et captures : UN seul profil de demo, Heny (musculation et jiu-jitsu
 * bresilien, sept mois d'historique). Avant le chargement, toutes tes vraies donnees sont copiees
 * dans la base (backupRealData) ; « Revenir a mes donnees » les remet ligne par ligne
 * (restoreRealData). Puis le mode capture, la barre 09:41, le carnet rempli et le kit marketing.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Row, ToggleRow } from '@/components/yoroi/v2/espace/ui';
import { guerrierImage } from '@/components/yoroi/v2/espace/assets';
import { useScreenshotMode } from '@/lib/ScreenshotModeContext';
import { usePremium } from '@/context/PremiumContext';
import { generateHenyDemoData, inspectDemoBackup, restoreRealData, type HenyStats } from '@/lib/demoDataService';
import { requestArmureCatchup } from '@/lib/v2/armure';
import { setDevClockOffset } from '@/lib/v2/creator/devClock';
import { setPaywallVariant } from '@/lib/v2/creator/paywallVariant';
import { setApercuSaison } from '@/lib/v2/saisons/apercu';
import logger from '@/lib/security/logger';
import { STUDIO_TEST_KEYS } from './CreatorGuard';
import { KV, Note, StudioSection, SubTitle, useStudio } from './parts';
import { vueNouvelUtilisateurActive } from './BandeauNouvelUtilisateur';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, LOCALE } from '@/lib/i18n/tr';

const DATA_EVENTS = ['YOROI_DATA_CHANGED', 'YOROI_PARTNERS_CHANGED', 'YOROI_PROFILE_CHANGED', 'YOROI_DEMO_CHANGED'];

export function emitAllData() {
  DATA_EVENTS.forEach((e) => DeviceEventEmitter.emit(e));
}

/** Ce que contient Heny, dit simplement */
export const HENY_LINES = [
  traduire('Musculation quatre fois par semaine à 18 h à la salle de musculation (poussée, tirage, jambes, haut du corps)'),
  traduire('Jiu jitsu brésilien lundi, mardi et jeudi à midi au club de JJB : cours, drilling et sparring'),
  traduire('Course sur la Corniche le samedi matin, avec trace et zones cardiaques, et foot à 5 un dimanche soir sur deux ou trois'),
  traduire('Ceinture bleue, rounds de sparring avec six partenaires et leurs fiches'),
  traduire('Pesées de 86,4 à 81,6 kg, composition du corps et mensurations'),
  traduire('Charges et records qui montent : squat, couché, soulevé de terre, tractions'),
  traduire('Six combats (argent puis or), aucune compétition : c’est toi qui ajoutes les tiennes'),
  traduire('Sommeil, eau, santé du jour (pas, cœur, oxygène, respiration), une blessure guérie et une légère. Santé n’est pas lue pendant la démo'),
];

/** Charge Heny (tes vraies donnees sont copiees avant). Renvoie le message a montrer. */
export async function loadHeny(): Promise<string> {
  const r: HenyStats = await generateHenyDemoData();
  emitAllData();
  return traduire("Heny est chargée : {0} séances ({1} de musculation, {2} de JJB, {3} courses, {4} foot à 5), {5} pesées, {6} mensurations, {7} combats, {8} nuits.", r.workouts, r.muscu, r.jjb, r.course, r.foot, r.weights, r.measurements, r.combats, r.sleepEntries);
}

/** Remet tes vraies donnees, tes vraies XP et l'heure reelle */
export async function backToRealData(): Promise<void> {
  await restoreRealData();
  setDevClockOffset(0);
  await requestArmureCatchup().catch(() => undefined);
  emitAllData();
}

export function Demo() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { demoActive, refreshDemo } = useStudio();
  const { isScreenshotMode, useFakeStatusBar, toggleScreenshotMode, toggleFakeStatusBar } = useScreenshotMode();
  const [journal, setJournal] = useState(false);
  const [backup, setBackup] = useState<Awaited<ReturnType<typeof inspectDemoBackup>> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [j, b] = await Promise.all([AsyncStorage.getItem('@yoroi_journal_screenshot_mode'), inspectDemoBackup().catch(() => null)]);
      setJournal(j === 'true');
      setBackup(b);
    } catch (e) {
      logger.error('[Studio] lecture de la démo', e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, demoActive]);

  const run = async (id: string, fn: () => Promise<string | null>) => {
    if (busy) return;
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setBusy(id);
    try {
      const msg = await fn();
      refreshDemo();
      await load();
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      if (msg) appAlert(traduire('C’est fait'), msg);
    } catch (e) {
      logger.error(`[Studio] ${id}`, e);
      appAlert('Oups', traduire('L’opération n’a pas abouti. Tes vraies données restent de côté.'));
    } finally {
      setBusy(null);
    }
  };

  const heny = async () => {
    // pendant la vue nouvel utilisateur, Heny mettrait de cote l'app vide : retour a tes donnees d'abord
    if (await vueNouvelUtilisateurActive()) {
      appAlert(traduire('Vue nouvel utilisateur en cours'), traduire('La vue nouvel utilisateur est en cours. Reviens d’abord à tes données avec le bandeau du haut.'));
      return;
    }
    await run('heny', loadHeny);
  };

  const restore = () =>
    appAlert(traduire('Revenir à tes données ?'), traduire('Heny est retirée et tes vraies données reviennent, avec tes vraies XP.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: 'Revenir',
        onPress: () =>
          void run('restore', async () => {
            await backToRealData();
            return traduire('Tes vraies données sont de retour.');
          }),
      },
    ]);

  const toggleJournal = async (v: boolean) => {
    setJournal(v);
    await AsyncStorage.setItem('@yoroi_journal_screenshot_mode', String(v)).catch(() => {});
    emitAllData();
  };

  const working = busy !== null;

  return (
    <StudioSection id="demo" icon="camera" title={traduire("Démo et captures")} sub={traduire("Heny, retour à tes données, captures")} keywords="demo heny profil captures screenshot 09:41 barre etat marketing kit carnet vraies donnees sauvegarde restaurer">
      <Card style={{ padding: 14, gap: 12, borderWidth: demoActive ? 2 : 1, borderColor: demoActive ? c.success : c.border }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 64, height: 80, borderRadius: 16, backgroundColor: c.accentTint, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Image source={guerrierImage('h', 2)} style={{ width: 64, height: 80 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ink size={20} weight="black">Heny</Ink>
              {demoActive ? (
                <View style={{ backgroundColor: c.successTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Ink size={11} weight="extraBold" color={c.successText}>{traduire("Chargée")}</Ink>
                </View>
              ) : null}
            </View>
            <Ink size={13} color={c.textSecondary}>{traduire("Musculation et jiu jitsu brésilien, 30 ans, 1,78 m, ceinture bleue. Sept mois d’historique.")}</Ink>
          </View>
          {working ? <ActivityIndicator color={c.accent} /> : null}
        </View>
        <View style={{ gap: 4 }}>
          {HENY_LINES.map((l) => (
            <View key={l} style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.detail, marginTop: 7 }} />
              <Ink size={13} color={c.ink} style={{ flex: 1, lineHeight: 19 }}>{l}</Ink>
            </View>
          ))}
        </View>
        <Button tone="accent" icon="sync" label={demoActive ? 'Recharger Heny' : 'Charger Heny'} onPress={() => void heny()} loading={busy === 'heny'} disabled={working} />
        <Button tone="ghost" icon="restore" label={traduire("Revenir à mes données")} onPress={restore} loading={busy === 'restore'} disabled={working || !demoActive} />
      </Card>

      <SubTitle>{traduire("Tes vraies données")}</SubTitle>
      <Card>
        {backup?.active ? (
          <>
            <KV first label={traduire("À l’abri pendant la démo")} value={backup.mode === 'full' ? traduire('Copie complète') : backup.mode === 'legacy' ? traduire('Copie d’une ancienne démo') : traduire('Copie de secours')} />
            {backup.tables ? <KV label={traduire("Tables copiées")} value={`${backup.tables}, ${backup.rows.toLocaleString(LOCALE)} lignes`} /> : null}
            {backup.at ? <KV label={traduire("Depuis")} value={new Date(backup.at).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' })} /> : null}
          </>
        ) : (
          <KV first label={traduire("Dans l’app")} value={traduire("Tes vraies données")} />
        )}
      </Card>
      <Note>{traduire("Avant Heny, chaque table de la base est copiée dans la même base, avec tes réglages, ton XP et tes clés sécurisées. Au retour, tout est remis ligne par ligne, puis les copies sont effacées. La synchro entre appareils est coupée pendant la démo.")}</Note>

      <SubTitle>Captures</SubTitle>
      <Card>
        <ToggleRow first icon="camera" label="Mode capture propre" sub={traduire("Masque badges, boutons et messages de test")} value={isScreenshotMode} onChange={() => void toggleScreenshotMode()} />
        <ToggleRow icon="timer" label={traduire("Barre d’état 09:41")} sub={isScreenshotMode ? traduire('Heure, batterie et réseau parfaits') : traduire('Allume d’abord le mode capture')} value={useFakeStatusBar} onChange={() => void toggleFakeStatusBar()} disabled={!isScreenshotMode} />
        <ToggleRow icon="doc" label="Carnet rempli" sub={traduire("Le carnet montre des données d’exemple")} value={journal} onChange={(v) => void toggleJournal(v)} />
        <Row icon="image" label="Kit marketing" sub={traduire("Les 6 captures qui racontent l’app")} onPress={() => router.push('/marketing-kit' as never)} />
      </Card>
    </StudioSection>
  );
}

/**
 * « Tout remettre normal » (19 octobre 2026) : coupe les forcages d'apercu seulement, saison forcee, horloge,
 * variantes du paywall, captures, barre 09:41, carnet rempli et vue gratuite. Ne touche a aucune donnee :
 * Heny reste chargee si elle l'est (son propre bouton remet tes vraies donnees, avec sa confirmation).
 */
export function useResetAll() {
  const { setScreenshotMode, useFakeStatusBar, toggleFakeStatusBar } = useScreenshotMode();
  const { simulateFreeUser, setSimulateFreeUser } = usePremium();
  return async (demoActive: boolean): Promise<string> => {
    setApercuSaison('auto');
    setDevClockOffset(0);
    setPaywallVariant('reel');
    await AsyncStorage.multiRemove(STUDIO_TEST_KEYS).catch(() => undefined);
    await setScreenshotMode(false).catch(() => undefined);
    if (useFakeStatusBar) await toggleFakeStatusBar().catch(() => undefined);
    if (simulateFreeUser) setSimulateFreeUser(false);
    emitAllData();
    return demoActive ? traduire('Les aperçus sont remis normal. Heny reste chargée : son bouton te ramène à tes vraies données.') : traduire('Tout est remis normal.');
  };
}

export default Demo;
