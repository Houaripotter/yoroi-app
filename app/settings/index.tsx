/**
 * Reglages (vague 41, nouvelle organisation) : la porte ouverte par le rond de profil de l'accueil.
 * Pense comme les Reglages d'iOS : la carte de profil en haut, puis cinq groupes courts,
 * une petite icone de couleur par ligne et la valeur actuelle a droite.
 * - Ton entrainement : Mes sports, Calendrier et clubs, Objectif de la semaine, Rappels.
 * - Tes reglages (13 octobre, soir : trois sous-pages pour que la page tienne en un ecran et demi) :
 *   Apparence et style (/settings/style : Theme, Ta scene, Ton personnage, Ton accueil, Tes courbes,
 *   Style des widgets, Affichage et icone), Sante et appareils (/settings/appareils : Apple Sante et ta montre,
 *   Balance connectee), Donnees et sauvegardes (/settings/sauvegardes : Sauvegarde, Copies de securite
 *   automatiques, Mes donnees, Coffre photos). Le bouton Sauvegarder reste aussi sur cette page.
 * - YOROI : Abonnement, Aide et questions, Noter l'app, Conditions et confidentialite.
 * Studio YOROI tout en bas, seulement en mode createur (appui long de 1,5 s sur la version, puis le jeton signe).
 * L'ancienne page Apparence (/settings/apparence) renvoie ici : chaque reglage a garde sa fonction.
 * 16 octobre (Houari : « c'est grave caché ») : l'entree « Personnaliser » passe tout en haut, sous le titre, en
 * grande carte visuelle (EntreePersonnaliser) ; la ligne « Apparence et style » de Tes reglages, qui ouvrait le
 * meme ecran, est retiree pour ne pas l'avoir deux fois.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Platform, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceHeader, Icon } from '@/components/yoroi/v2/espace/ui';
import { personnageImage, personnageNom, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { MiniAction, ProfileHeader, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { ObjectifSheet } from '@/components/yoroi/v2/espace/ObjectifSheet';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { TokenSheet } from '@/components/yoroi/v2/studio/TokenSheet';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { backupAgeDays, backupWhen, useEspaceStatus } from '@/components/yoroi/v2/espace/reglages/useEspaceStatus';
import { WhatsNewSheet } from '@/components/yoroi/v2/espace/reglages/WhatsNew';
import { APP_VERSION } from '@/components/yoroi/v2/espace/reglages/version';
import { syncIdentite } from '@/components/yoroi/v2/espace/identite';
import { Embleme } from '@/components/yoroi/v2/accueil/Ornements';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { Groupe, TUILE } from '@/components/yoroi/v2/reglages/kit';
import { EntreePersonnaliser } from '@/components/yoroi/v2/reglages/EntreePersonnaliser';
import { resumePersonnaliser, ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { objectifVise } from '@/lib/v2/espace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { useYoroiTheme as useModeTheme } from '@/components/yoroi/YoroiThemeProvider';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/constants/partage';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import { exportDataToJSON } from '@/lib/exportService';
import { logger } from '@/lib/security/logger';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { usePremium } from '@/context/PremiumContext';
import { isDemoDataActive } from '@/lib/demoDataService';
import { ecrireBilanAuto, lireBilanAuto } from '@/lib/v2/bilan/reglage';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { FeuilleLangue, langueEnCours } from '@/components/yoroi/v2/langue/ChoixLangue';


const MODES: { key: string; label: string; court: string; sub: string }[] = [
  { key: 'clair', label: traduire('Clair'), court: traduire('Clair'), sub: traduire('Le papier de riz, de jour comme de nuit') },
  { key: 'sombre', label: traduire('Sombre'), court: traduire('Sombre'), sub: traduire('L’encre de nuit, plus douce le soir') },
  { key: 'auto', label: traduire('Automatique'), court: traduire('Auto'), sub: traduire('Suit le réglage clair ou sombre de ton téléphone') },
];

export default function Reglages() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const { espace, update } = useEspace();
  const { profile, armure } = useIdentite();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isPremium, hasActiveSubscription, simulateFreeUser } = usePremium();
  const { status, reload: reloadStatus } = useEspaceStatus();
  const { mode } = useModeTheme();
  const courbes = usePrefsCourbes();

  const [backingUp, setBackingUp] = useState(false);
  const [objectifOpen, setObjectifOpen] = useState(false);
  const [langueOpen, setLangueOpen] = useState(false);
  // /settings?objectif=1 : ouvert depuis « Choisir un objectif » (accueil, seances, Dojo)
  const params = useLocalSearchParams<{ objectif?: string }>();
  useEffect(() => {
    if (params.objectif === '1') setObjectifOpen(true);
  }, [params.objectif]);
  const [whatsNew, setWhatsNew] = useState(false);

  const { isCreator: creatorUnlocked } = useCreatorMode();
  const [codeVisible, setCodeVisible] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  // 16 octobre : la page de bilan apres chaque mesure et chaque seance (active par defaut)
  const [bilanAuto, setBilanAuto] = useState(true);
  useEffect(() => {
    lireBilanAuto().then(setBilanAuto).catch(() => {});
  }, []);

  const loadValues = useCallback(async () => {
    isDemoDataActive().then(setDemoActive).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('SHOW_WHATS_NEW', () => setWhatsNew(true));
    return () => sub.remove();
  }, []);

  // Une photo ajoutee dans le profil passe le rond sur "Ta photo" tout de suite
  useEffect(() => {
    syncIdentite(profile?.profile_photo ?? null).catch(() => {});
  }, [profile?.profile_photo]);

  // Au retour d'une sous-page ou du studio : on relit l'etat
  useFocusEffect(
    useCallback(() => {
      loadValues();
      reloadStatus();
    }, [loadValues, reloadStatus]),
  );

  const backupNow = async () => {
    if (backingUp) return;
    setBackingUp(true);
    try {
      await exportDataToJSON();
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      reloadStatus();
    } catch (e) {
      logger.error('[Reglages] sauvegarde', e);
      showPopup(traduire('Oups'), traduire('La sauvegarde n’a pas abouti. Réessaie.'));
    } finally {
      setBackingUp(false);
    }
  };

  // ============================================
  // STUDIO YOROI : appui long sur la version, puis le jeton signe
  // ============================================

  const onVersionLongPress = () => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (creatorUnlocked) router.push('/creator-mode' as any);
    else setCodeVisible(true);
  };

  const onCreatorUnlocked = () => {
    // navigation directe : le Studio s'ouvre sous la feuille, qui se ferme par-dessus
    router.push('/creator-mode' as any);
    setCodeVisible(false);
  };

  const manageSub = () =>
    safeOpenURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions');
  const rate = () => safeOpenURL(Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL);

  // ============================================
  // VALEURS AFFICHEES
  // ============================================

  const go = (href: string) => router.push(href as any);
  const rankIndex = armure?.rank.index ?? 0;
  const genre: 'h' | 'f' = espace.personnage === 'guerrier_f' ? 'f' : espace.personnage === 'guerrier_h' ? 'h' : profile?.avatar_gender === 'femme' ? 'f' : 'h';
  // avec la scene qui change, la ligne montre ton choix a toi
  const scene = sceneMeta(espace.sceneFixe ?? espace.scene);
  const nbSports = espace.sportsFavoris.length;
  const obj = objectifVise(espace);
  const modeMeta = MODES.find((m) => m.key === mode) ?? MODES[0];

  // Sauvegarde
  const age = backupAgeDays(status.lastBackup);
  const backupLate = status.lastBackup !== undefined && (age === null || age >= 14);
  // Derniere copie rangee hors du telephone (il n'y a pas de compte : sans copie, un telephone perdu emporte tout)
  const backupSub = status.lastBackup === undefined ? traduire('Une copie de tes données') : status.lastBackup ? traduire("Dans ton cloud : {0}", backupWhen(status.lastBackup)) : traduire('Aucune copie dans ton cloud');

  // Sante
  const sante = status.sante;
  const santeValue = sante ? (sante.mode === 'live' ? traduire('Relié') : traduire('Non relié')) : undefined;

  // Abonnement
  const subValue = simulateFreeUser ? traduire('Gratuit (simulé)') : isPremium ? (creatorUnlocked && !hasActiveSubscription ? traduire('Premium, Studio') : traduire('Premium')) : traduire('Gratuit');

  // Rappels
  const rem = status.reminders;
  const remValue = rem === null ? undefined : rem.length ? `${rem.length} actif${rem.length > 1 ? 's' : ''}` : traduire('Aucun');

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 10 }} showsVerticalScrollIndicator={false}>
        <EspaceHeader title={traduire("Réglages")} />

        {/* 16 octobre : Personnaliser, tout en haut et bien visible */}
        <EntreePersonnaliser
          scene={scene.image}
          personnage={aUnPersonnage(espace.personnage) ? personnageImage(espace.personnage, rankIndex, genre) : undefined}
          style={courbes.style}
          resume={resumePersonnaliser({ theme: modeMeta.court, scene: espace.sceneRotation ? traduire('scène qui change') : scene.nom, personnage: personnageNom(espace.personnage), styleCourbe: courbes.style })}
          onPress={() => go(ROUTES_PERSONNALISER.personnaliser)}
        />

        <View style={{ marginTop: 4 }}>
          <ProfileHeader profile={profile} espace={espace} rankIndex={rankIndex} onPress={() => go('/profile')} onEditPhoto={() => go(ROUTES_PERSONNALISER.photo)} />
        </View>

        <Groupe title={traduire("Ton entraînement")} />
        <Card>
          <ValueRow first tint={TUILE.indigo} icon="dumbbell" sticker="mes_sports" label={traduire("Mes sports")} value={nbSports ? traduirePluriel(nbSports, nbSports > 1, "{0} sport", "{0} sports", nbSports) : traduire('À choisir')} valueColor={nbSports ? undefined : c.accent} onPress={() => go('/espace/sports')} />
          <ValueRow tint={TUILE.bleu} icon="calendar" sticker="calendrier" label={traduire("Calendrier et clubs")} onPress={() => go('/planning?tab=mois')} />
          <ValueRow tint={TUILE.mousse} icon="target" sticker="objectif_semaine" label={traduire("Objectif de la semaine")} sub={espace.joursSemaine?.length ? joursTexte(espace.joursSemaine).replace(/^./, (x) => x.toUpperCase()) : undefined} value={obj ? traduirePluriel(obj, obj > 1, "{0} séance", "{0} séances", obj) : traduire('À choisir')} valueColor={obj ? undefined : c.accent} onPress={() => setObjectifOpen(true)} />
          <ValueRow tint={TUILE.or} icon="bell" sticker="rappels" label={traduire("Rappels")} value={remValue} onPress={() => go('/notifications')} />
          <ValueRow tint={TUILE.bleu} icon="pulse" sticker="bilan" label={traduire("Bilan après chaque mesure")} sub={traduire("Pesée, composition, mensurations et séances")} value={bilanAuto ? traduire('Activé') : traduire('Coupé')} valueColor={bilanAuto ? c.successText : undefined} onPress={() => { const n = !bilanAuto; setBilanAuto(n); ecrireBilanAuto(n).catch(() => {}); }} />
        </Card>

        {/* 13 octobre, soir : style, appareils et donnees ranges en trois sous-pages, pour une page plus courte.
            Rien n'a ete retire : chaque ligne d'avant est dans sa sous-page. Le bouton Sauvegarder reste ici. */}
        <Groupe title={traduire("Tes réglages")} />
        <Card>
          <ValueRow first tint={TUILE.mousse} icon="heart" sticker="sante_appareils" label={traduire("Santé et appareils")} sub={Platform.OS === 'android' ? 'Health Connect, montre, balance' : traduire('Apple Santé, montre, balance')} value={santeValue} valueColor={sante?.mode === 'live' ? c.successText : undefined} onPress={() => go('/settings/appareils')} />
          <ValueRow tint={TUILE.ardoise} icon="save" sticker="donnees" label={traduire("Données et sauvegardes")} sub={backupSub} valueColor={backupLate ? c.accent : undefined} onPress={() => go('/settings/sauvegardes')} action={<MiniAction label={traduire("Sauvegarder")} onPress={backupNow} busy={backingUp} />} />
          <ValueRow tint={TUILE.bleu} icon="globe" sticker="langue" label={traduire('Langue')} value={langueEnCours()} onPress={() => setLangueOpen(true)} />
        </Card>

        <Groupe title="YOROI" />
        <Card>
          <ValueRow first tint={TUILE.or} icon="crown" sticker="abonnement" label={traduire("Abonnement")} value={subValue} valueColor={isPremium && !simulateFreeUser ? c.goldDeep : undefined} onPress={isPremium && hasActiveSubscription ? manageSub : () => ouvrirPaywall('reglages')} />
          <ValueRow tint={TUILE.bleu} icon="info" sticker="aide" label={traduire("Aide et questions")} onPress={() => go('/settings/aide')} />
          <ValueRow tint={TUILE.indigo} icon="spark" sticker="presentation" label={traduire("Revoir la présentation")} sub={traduire("Personnage, Santé, scène et visite guidée")} onPress={() => go('/nouveautes?revoir=1')} />
          <ValueRow tint={TUILE.or} icon="star" sticker="noter" label={traduire("Noter l’app")} onPress={rate} />
          <ValueRow tint={TUILE.ardoise} icon="doc" sticker="conditions" label={traduire("Conditions et confidentialité")} onPress={() => go('/settings/legal')} />
        </Card>

        {/* ============ STUDIO : visible seulement quand le mode createur est actif ============ */}
        {creatorUnlocked ? (
          <Pressable
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); go('/creator-mode'); }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Ouvrir le Studio YOROI")}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 10, borderRadius: 22, backgroundColor: c.carteDouce, overflow: 'hidden', transform: [{ scale: pressed ? 0.99 : 1 }] })}
          >
            {/* 27 octobre 2026 soir : le sticker a gauche, plus de torii fantome qui deborde */}
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={illus.img('cle')} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={17} weight="black" color={c.ink}>{traduire("Studio YOROI")}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>
                {demoActive ? traduire('Profil démo chargé, tes vraies données sont de côté') : traduire('Profils démo, captures, outils de test')}
              </Ink>
            </View>
            <Icon name="chevron" size={16} color={c.textSecondary} stroke={2.4} />
          </Pressable>
        ) : null}

        <Pressable
          onLongPress={onVersionLongPress}
          delayLongPress={1500}
          accessibilityLabel={`YOROI, version ${APP_VERSION}`}
          style={{ alignItems: 'center', paddingVertical: 14, gap: 4 }}
        >
          <Embleme size={34} color={c.textMuted} ring={c.border} />
          <Ink size={13} weight="bold" color={c.textMuted}>{APP_VERSION ? `YOROI, version ${APP_VERSION}` : 'YOROI'}</Ink>
          <Ink size={12} color={c.textMuted}>{traduire("Fait à Marseille, 100 % hors ligne")}</Ink>
        </Pressable>
      </ScrollView>

      {/* le nombre de seances et, si tu veux, tes jours */}
      <FeuilleLangue visible={langueOpen} onClose={() => setLangueOpen(false)} />
      <ObjectifSheet visible={objectifOpen} onClose={() => setObjectifOpen(false)} espace={espace} onSave={(p) => { update(p).catch(() => {}); }} />

      <WhatsNewSheet visible={whatsNew} onClose={() => setWhatsNew(false)} />
      <TokenSheet visible={codeVisible} onClose={() => setCodeVisible(false)} onUnlocked={onCreatorUnlocked} />
      <PopupComponent />
    </View>
  );
}
