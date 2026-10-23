/**
 * Studio, rubrique Tests de l'appareil : notification test, apercu de chaque type de notification
 * de l'app (dans 5 secondes), notifications programmees avec suppression une par une, vraie demande
 * d'avis, chaque vibration, etat des autorisations et lien vers les reglages du telephone.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Platform, Vibration, View, useWindowDimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Row } from '@/components/yoroi/v2/espace/ui';
import { healthConnect } from '@/lib/healthConnect';
import { getRandomQuote } from '@/lib/citations';
import { formatDateTime } from '@/lib/v2/creator/deviceInfo';
import { Chip, ChipWrap, KV, Note, SmallAction, StudioSection, SubTitle } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIMULER_INSTALLATION_KEY } from '@/lib/v2/onboarding/etatOuverture';
import { ApercuScenes } from './ApercuScenes';
import { DecorCarte, DecorOutils, DecorScene } from '@/components/yoroi/v2/saisons/DecorSaison';
import { P as PA } from '@/components/yoroi/v2/accueil/kit';
import { CitationDuJour } from '@/components/yoroi/v2/accueil/Citation';
import { citationDuJour } from '@/lib/v2/accueil/citations';
import { useStyleCitation } from '@/lib/v2/accueil/styleCitation';
import { setApercuSaison, useApercuSaison } from '@/lib/v2/saisons/apercu';
import { useDecorationsSaison } from '@/lib/v2/saisons/reglage';
import { FENETRES_SAISONS, saisonAffichee, type ChoixApercu } from '@/lib/v2/saisons/calendrier';
import { devNow } from '@/lib/v2/creator/devClock';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { traduire } from '@/lib/i18n/tr';

/** 18 octobre 2026 : forcer une saison pour voir ses decorations des aujourd'hui (en memoire seulement) */
const CHOIX_SAISON: { id: ChoixApercu; label: string }[] = [
  { id: 'auto', label: traduire('Date du jour') },
  { id: 'halloween', label: 'Halloween' },
  { id: 'noel', label: traduire('Noël') },
  { id: 'aucune', label: traduire('Aucune saison') },
];

const fmtJour = (j: { mois: number; jour: number }) => `${j.jour === 1 ? '1er' : j.jour} ${[traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')][j.mois - 1]}`;

/** Decorations de saison : le choix force, et un apercu sur ta scene, tel que sur l'accueil */
function ApercuSaison() {
  const choix = useApercuSaison();
  const { active } = useDecorationsSaison();
  const { espace } = useEspace();
  const { width } = useWindowDimensions();
  const saison = saisonAffichee({ date: devNow(), active, apercu: choix });
  const L = Math.min(560, width) - 32;
  const H = 236;
  const scene = sceneMeta(espace.sceneFixe ?? espace.scene);
  const { style: styleCitation } = useStyleCitation();
  return (
    <>
      <SubTitle>{traduire("Décorations de saison")}</SubTitle>
      <Card style={{ padding: 14, gap: 12 }}>
        <ChipWrap>
          {CHOIX_SAISON.map((o) => (
            <Chip key={o.id} label={o.label} on={choix === o.id} onPress={() => setApercuSaison(o.id)} accessibilityLabel={`Saison : ${o.label}`} />
          ))}
        </ChipWrap>
        <View style={{ width: L - 28, height: H, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1E2336' }}>
          <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          <DecorScene saison={saison} largeur={L - 28} hauteur={H} haut={8} />
          {saison ? null : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={13} weight="bold" color="#F2F1EC">{active ? traduire('Aucune saison aujourd’hui') : traduire('Décorations coupées dans Personnaliser')}</Ink>
            </View>
          )}
        </View>
        {/* comme sur l'accueil : le bas de tes outils (leurs libelles devant le decor), puis la ligne de la citation avec ses
            marges de 22 (tombe et chat, squelette et zombie ; ou kadomatsu, cadeaux et bonhomme de neige), puis le haut de la carte poids */}
        <View style={{ width: L - 28, paddingBottom: 16 }}>
          <View style={{ height: 48, justifyContent: 'flex-end' }}>
            <DecorOutils saison={saison} largeur={L - 28} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 2 }}>
              {['Chrono', traduire('Partager'), traduire('Objectifs'), 'Records'].map((t) => (
                <Ink key={t} size={12.5} weight="extraBold" style={{ lineHeight: 15 }}>{t}</Ink>
              ))}
            </View>
          </View>
          <View style={{ marginTop: 12, paddingHorizontal: 22 }}>
            <View style={{ height: 20, marginTop: -18, marginBottom: 2, justifyContent: 'center', paddingHorizontal: 2 }}>
              <CitationDuJour texte={citationDuJour(devNow())} style={styleCitation} />
            </View>
          </View>
          {/* le haut de la carte « Ton poids », memes marges que la vraie : touche les citrouilles ou les sapins */}
          <View style={{ marginTop: 12 }}>
            <View style={{ borderRadius: 22, backgroundColor: PA.white, borderWidth: 1, borderColor: PA.line2, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 20 }}>
                <Ink size={13} weight="extraBold" color={PA.ink2}>{traduire("Ton poids")}</Ink>
                <Ink size={12} weight="bold" color={PA.ink2}>{traduire("il y a 2 jours")}</Ink>
              </View>
              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                <Ink size={48} weight="black" tight numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                  80,3
                  <Ink size={17} weight="bold" color={PA.ink2}>{' kg'}</Ink>
                </Ink>
              </View>
            </View>
            <DecorCarte saison={saison} largeur={L - 28} />
          </View>
        </View>
      </Card>
      <Note>{traduire("Le choix vaut aussi pour ton accueil, jusqu’à la fermeture de l’app. Périodes : {0}. Halloween : chauves souris puis fantôme toutes les 15 secondes, squelette toutes les 35 secondes, zombie toutes les 50 secondes. Noël : traîneau puis étoile filante toutes les 30 secondes, bonhomme de neige toutes les 35 secondes. Touche une citrouille ou un sapin de la carte poids. Avec « Réduire les animations », seuls les décors fixes restent, immobiles, et le toucher pose quelques bonbons ou flocons.", FENETRES_SAISONS.map((f) => `${f.nom} du ${fmtJour(f.debut)} au ${fmtJour(f.fin)}`).join(', '))}</Note>
    </>
  );
}

/** Les notifications que l'app envoie, avec le même texte que les vrais services */
const NOTIF_TYPES: { id: string; label: string; title: string; body: string }[] = [
  { id: 'entrainement', label: traduire('Rappel d’entraînement'), title: traduire('C’est l’heure !'), body: traduire('Ton entraînement t’attend. Donne tout !') },
  { id: 'pesee', label: traduire('Pesée du matin'), title: traduire('Pesée du matin'), body: traduire('N’oublie pas ta pesée quotidienne !') },
  { id: 'eau', label: traduire('Hydratation'), title: traduire('Hydratation'), body: traduire('Tu n’as rien bu depuis 2 h. Une petite gorgée ?') },
  { id: 'serie', label: traduire('Série en danger'), title: traduire('Ne casse pas ta série de 12 jours'), body: traduire('Il te reste 2 h pour noter une séance aujourd’hui et garder ta série.') },
  { id: 'recap', label: traduire('Récap de la semaine'), title: traduire('Récap de ta semaine'), body: traduire('Découvre ton bilan sportif des 7 derniers jours dans Yoroi') },
  { id: 'sparring', label: 'Sparring', title: traduire('Sparring avec Larbi ?'), body: traduire('Objectif en cours : atteindre 20 % de victoires contre lui') },
  { id: 'j7', label: traduire('Compétition dans 7 jours'), title: traduire('Dans 7 jours : Open de la Côte'), body: traduire('Dernière semaine. Surveille ton poids : Médio, moins de 82,3 kg.') },
  { id: 'veille', label: traduire('Veille de compétition'), title: traduire('Demain : Open de la Côte'), body: traduire('Rendez-vous à Montpellier. Prépare ton sac et couche-toi tôt.') },
  { id: 'jourpesee', label: traduire('Jour de pesée'), title: traduire('Jour de pesée : Open de la Côte'), body: traduire('Médio, moins de 82,3 kg. Pèse-toi ce matin pour savoir où tu en es.') },
  { id: 'resultat', label: traduire('Résultat de compétition'), title: traduire('Comment s’est passée ta compétition ?'), body: traduire('Note ton résultat de Open de la Côte : il rejoint ton palmarès.') },
  { id: 'citation', label: traduire('Citation du jour'), title: traduire('Citation du jour'), body: '' },
  { id: 'essai', label: traduire('Fin de l’essai Premium'), title: traduire('Ton essai Premium se termine bientôt'), body: traduire('Il prend fin le 17 octobre. Pour ne pas être débité, annule-le avant dans les réglages de ton compte App Store.') },
  { id: 'chrono', label: traduire('Chrono terminé'), title: traduire('Entraînement terminé !'), body: 'Excellent travail !' },
];

const VIBRATIONS: { id: string; label: string; run: () => void }[] = [
  { id: 'selection', label: traduire('Sélection'), run: () => void Haptics.selectionAsync().catch(() => {}) },
  { id: 'legere', label: traduire('Légère'), run: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  { id: 'moyenne', label: traduire('Moyenne'), run: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}) },
  { id: 'forte', label: 'Forte', run: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}) },
  { id: 'douce', label: 'Douce', run: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {}) },
  { id: 'seche', label: traduire('Sèche'), run: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {}) },
  { id: 'succes', label: traduire('Succès'), run: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  { id: 'alerte', label: 'Alerte', run: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}) },
  { id: 'erreur', label: traduire('Erreur'), run: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}) },
  { id: 'longue', label: 'Longue (chrono)', run: () => Vibration.vibrate(Platform.OS === 'android' ? [0, 400, 150, 400] : 400) },
];

type Scheduled = { id: string; title: string; when: string };
type Perm = { label: string; state: string; ok: boolean };

function permText(status: string | undefined, granted: boolean | undefined): { state: string; ok: boolean } {
  if (granted || status === 'granted') return { state: traduire('Autorisé'), ok: true };
  if (status === 'denied') return { state: traduire('Refusé'), ok: false };
  return { state: traduire('Pas encore demandé'), ok: false };
}

function triggerText(t: unknown): string {
  const tr = t as { type?: string; value?: number; date?: number | string; seconds?: number; hour?: number; minute?: number; weekday?: number } | null;
  if (!tr) return traduire('Immédiate');
  if (tr.date !== undefined) return formatDateTime(typeof tr.date === 'number' ? tr.date : Date.parse(String(tr.date)));
  if (tr.value !== undefined && String(tr.type).includes('date')) return formatDateTime(Number(tr.value));
  if (tr.seconds !== undefined) return traduire("Dans {0} s", tr.seconds);
  if (tr.hour !== undefined) return `${tr.weekday ? traduire("Chaque semaine, jour {0}, ", tr.weekday) : traduire('Chaque jour, ')}${tr.hour} h ${String(tr.minute ?? 0).padStart(2, '0')}`;
  return String(tr.type ?? traduire('Programmée'));
}

async function ensureNotifPermission(): Promise<boolean> {
  const perm = await Notifications.getPermissionsAsync();
  if (perm.granted) return true;
  if (perm.canAskAgain) return (await Notifications.requestPermissionsAsync()).granted;
  return false;
}

/**
 * 18 octobre 2026 : un seul lancement comme une installation neuve (lib/v2/onboarding/etatOuverture.ts), rien n'est efface.
 * 19 octobre 2026 : sortie de Tests pour la grille d'un toucher du Studio (meme confirmation).
 */
export function simulerPremiereInstallation(router: ReturnType<typeof useRouter>) {
  appAlert(
    traduire('Simuler une première installation ?'),
    traduire('Tu repars sur l’onboarding complet puis le paywall, comme après une réinstallation. Rien n’est effacé : ton profil, tes séances et tes pesées restent, tes réponses préremplies sont fusionnées. Tes choix de l’onboarding (univers, rappels, jours, sports) remplaceront ces réglages-là.'),
    [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: 'Simuler',
        onPress: () => {
          AsyncStorage.setItem(SIMULER_INSTALLATION_KEY, 'true')
            .then(() => router.replace('/' as never))
            .catch(() => appAlert('Oups', traduire('La simulation n’a pas pu démarrer.')));
        },
      },
    ],
  );
}

/** Programme une notification dans 5 secondes (meme texte que les vrais services). Renvoie false si rien n'est parti. */
export async function programmerNotificationTest(title = 'YOROI', body = traduire('Notification de test du Studio. Tout marche.')): Promise<boolean> {
  try {
    if (!(await ensureNotifPermission())) {
      appAlert(traduire('Notifications coupées'), traduire('Autorise les notifications de YOROI dans les réglages du téléphone, puis réessaie.'), [
        { text: traduire('Plus tard'), style: 'cancel' },
        { text: traduire('Ouvrir les réglages'), onPress: () => void Linking.openSettings() },
      ]);
      return false;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: { type: 'studio_apercu' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 } as Notifications.TimeIntervalTriggerInput,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return true;
  } catch {
    appAlert('Oups', traduire('La notification n’a pas pu être programmée.'));
    return false;
  }
}

export function Tests() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [sent, setSent] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<Scheduled[] | null>(null);
  const [perms, setPerms] = useState<Perm[] | null>(null);
  const [apercuScenes, setApercuScenes] = useState(false);

  const loadScheduled = useCallback(async () => {
    try {
      const list = await Notifications.getAllScheduledNotificationsAsync();
      setScheduled(list.map((n) => ({ id: n.identifier, title: n.content.title || n.content.body || traduire('Sans titre'), when: triggerText(n.trigger) })));
    } catch {
      setScheduled([]);
    }
  }, []);

  const loadPerms = useCallback(async () => {
    const out: Perm[] = [];
    try {
      const n = await Notifications.getPermissionsAsync();
      out.push({ label: 'Notifications', ...permText(n.status, n.granted) });
    } catch {
      out.push({ label: 'Notifications', state: 'Illisible', ok: false });
    }
    try {
      const cam = await ImagePicker.getCameraPermissionsAsync();
      out.push({ label: 'Appareil photo', ...permText(cam.status, cam.granted) });
    } catch {
      out.push({ label: 'Appareil photo', state: 'Illisible', ok: false });
    }
    try {
      const lib = await ImagePicker.getMediaLibraryPermissionsAsync();
      out.push({ label: 'Photos', ...permText(lib.status, lib.granted) });
    } catch {
      out.push({ label: 'Photos', state: 'Illisible', ok: false });
    }
    try {
      const s = healthConnect.getSyncStatus();
      out.push({ label: Platform.OS === 'ios' ? 'Apple Santé' : 'Health Connect', state: s.isConnected ? traduire('Connecté') : traduire('Pas connecté'), ok: s.isConnected });
    } catch {
      out.push({ label: 'Santé', state: traduire('Indisponible ici'), ok: false });
    }
    setPerms(out);
  }, []);

  useEffect(() => {
    void loadScheduled();
    void loadPerms();
  }, [loadScheduled, loadPerms]);

  const schedule = async (id: string, title: string, body: string) => {
    if (!(await programmerNotificationTest(title, body))) return;
    setSent(id);
    setTimeout(() => setSent((s) => (s === id ? null : s)), 6000);
    void loadScheduled();
  };

  const cancelOne = async (id: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      Haptics.selectionAsync().catch(() => {});
    } catch {
      appAlert('Oups', traduire('Cette notification n’a pas pu être annulée.'));
    }
    void loadScheduled();
  };

  const review = async () => {
    try {
      if (!(await StoreReview.isAvailableAsync())) {
        appAlert('Indisponible', traduire('La demande d’avis n’est pas disponible sur ce téléphone.'));
        return;
      }
      await StoreReview.requestReview();
    } catch {
      appAlert('Oups', traduire('La demande d’avis n’a pas pu s’ouvrir.'));
    }
  };

  const simulerInstallation = () => simulerPremiereInstallation(router);

  return (
    <StudioSection id="tests" icon="bell" title={traduire("Tests de l’appareil")} sub="Notifications, avis, vibrations, autorisations" keywords="notification rappel programmee avis note store vibration haptique autorisation permission reglages camera photos sante installation reinstallation onboarding paywall simuler scene scenes animees animation pluie neige saison saisons halloween noel decoration decorations">
      <Card>
        <Row first icon="bell" label="Notification test" sub={sent === 'test' ? traduire('Programmée, elle arrive dans 5 secondes') : traduire('Elle arrive dans 5 secondes, sors de l’app pour la voir')} onPress={() => void schedule('test', 'YOROI', traduire('Notification de test du Studio. Tout marche.'))} />
        <Row icon="star" label="Demande d’avis" sub={Platform.OS === 'ios' ? traduire('La vraie fenêtre de l’App Store') : traduire('La vraie fenêtre du Play Store')} onPress={() => void review()} />
        <Row icon="doc" label={traduire("Centre des notifications")} sub={traduire("Ce que YOROI t’a envoyé")} onPress={() => router.push('/notification-center' as never)} />
        <Row icon="restore" label={traduire("Simuler une première installation")} sub={traduire("Onboarding complet et paywall, sans rien effacer")} onPress={simulerInstallation} />
        <Row icon="image" label={traduire("Aperçu des scènes animées")} sub={traduire("Les 12 nouvelles scènes et leurs effets, pluie, neige, étoiles")} onPress={() => setApercuScenes(true)} />
      </Card>
      <Note>{traduire("Le store décide seul d’afficher la demande d’avis : Apple la limite à trois fois par an et ne la montre pas dans TestFlight. Si rien ne s’ouvre, ce n’est pas une panne.")}</Note>

      <ApercuSaison />

      <SubTitle>{traduire("Chaque notification de l’app, dans 5 secondes")}</SubTitle>
      <Card>
        {NOTIF_TYPES.map((n, i) => (
          <Row key={n.id} first={i === 0} label={n.label} sub={sent === n.id ? traduire('Programmée, elle arrive dans 5 secondes') : n.title} chevron={false} right={<SmallAction label={sent === n.id ? traduire('Envoyée') : traduire('Voir')} onPress={() => void schedule(n.id, n.title, n.id === 'citation' ? getRandomQuote().text : n.body)} />} />
        ))}
      </Card>

      <SubTitle>{traduire("Notifications programmées{0}", scheduled ? `, ${scheduled.length}` : '')}</SubTitle>
      <Card>
        {scheduled === null ? (
          <View style={{ padding: 16 }}>
            <Ink size={14} color={c.textSecondary}>Lecture en cours</Ink>
          </View>
        ) : scheduled.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Ink size={14} color={c.textSecondary}>{traduire("Aucune notification programmée sur ce téléphone.")}</Ink>
          </View>
        ) : (
          scheduled.map((n, i) => <Row key={n.id} first={i === 0} label={n.title} sub={n.when} chevron={false} right={<SmallAction label={traduire("Annuler")} danger onPress={() => void cancelOne(n.id)} />} />)
        )}
      </Card>
      <Button tone="ghost" small icon="sync" label={traduire("Relire la liste")} onPress={() => void loadScheduled()} />

      <SubTitle>Vibrations</SubTitle>
      <Card style={{ padding: 14 }}>
        <ChipWrap>
          {VIBRATIONS.map((v) => (
            <Chip key={v.id} label={v.label} onPress={v.run} accessibilityLabel={`Vibration ${v.label}`} />
          ))}
        </ChipWrap>
      </Card>

      <SubTitle>Autorisations</SubTitle>
      <Card>
        {(perms ?? []).map((p, i) => (
          <KV key={p.label} first={i === 0} label={p.label} value={p.state} />
        ))}
        {perms === null ? <KV first label="Lecture en cours" value="" /> : null}
      </Card>
      <Card>
        <Row first icon="exit" label={traduire("Réglages du téléphone")} sub={traduire("Les autorisations de YOROI")} onPress={() => void Linking.openSettings()} />
        <Row icon="sync" label={traduire("Relire les autorisations")} onPress={() => void loadPerms()} />
      </Card>
      <ApercuScenes visible={apercuScenes} onClose={() => setApercuScenes(false)} />
    </StudioSection>
  );
}

export default Tests;
