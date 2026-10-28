/**
 * Ton profil (sous-page de Reglages). 28 octobre 2026, maquette validee « le melange » :
 * - en haut, ta carte d'athlete (scene, rond decore, prenom, ceinture du sport principal, age, taille, IMC,
 *   club principal) puis ton chemin vers le torii ;
 * - en bas, des rubriques teintees : Ton objectif (peche), Sur le tapis (menthe : tes pratiques, plusieurs sports
 *   chacun avec son club et sa ceinture), Tes preferences (lilas, avec les reperes des calculs).
 * Le prenom, l'objectif et les poids s'enregistrent avec le bouton Enregistrer (il apparait des qu'un champ change) ;
 * la photo, l'age, la taille, les reperes et les pratiques s'enregistrent tout de suite.
 */
import { setProprietes, track } from '@/utils/telemetry';
import { trancheDuProfil } from '@/lib/v2/onboarding/trancheAge';
import { bmiOf } from '@/lib/v2/progres/biomarkers';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Image, Keyboard, Linking, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import Animated from 'react-native-reanimated';
import { ProfilEcran } from '@/components/yoroi/v2/profil/ProfilEcran';
import { CheminCarte } from '@/components/yoroi/v2/profil/CheminCarte';
import { CarteAthlete, MARGE } from '@/components/yoroi/v2/profil/CarteAthlete';
import { LigneRubrique, Rubrique, SegmentTeinte, teinteRubrique } from '@/components/yoroi/v2/profil/Rubriques';
import { TapisPratiques, logoDuClub } from '@/components/yoroi/v2/profil/TapisPratiques';
import { RondInitiales } from '@/components/yoroi/v2/espace/RondInitiales';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { styleRondDe } from '@/components/yoroi/v2/reglages/contour';
import { ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { usePratiques } from '@/lib/v2/profil/usePratiques';
import { pratiqueACeinture, principale as principaleDe } from '@/lib/v2/profil/pratiques';
import { gammeDe } from '@/lib/v2/profil/gammes';
import { useModeDemo } from '@/lib/v2/demo/useModeDemo';
import { getUserSettingsStrict, saveUserSettings } from '@/lib/storage';
import { genreDesReglages, type GenreFormule } from '@/lib/genreCalcul';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';
import { ChoiceSheet, Sheet } from '@/components/yoroi/v2/espace/reglages/parts';
import { DatePickerSheet, isoLocalDay } from '@/components/yoroi/v2/DateChips';
import { avantChangementDebut, debutPropose, nouveauDebut } from '@/lib/v2/pesee/debutObjectif';
import { jourCourt } from '@/lib/v2/pesee/ligneDirectrice';
import { useUnits } from '@/components/yoroi/v2/espace/reglages/prefs';
import { onPhotoChanged } from '@/components/yoroi/v2/espace/identite';
import { useCustomPopup } from '@/components/CustomPopup';
import { getProfile, getWeightProgress, getWeights, saveProfile } from '@/lib/database';
import { departDuChemin, goalProgress } from '@/lib/v2/accueil/projection';
import type { Profile } from '@/lib/database';
import { getSportCategory } from '@/lib/sports';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { traduire, DECIMAL } from '@/lib/i18n/tr';
import { FeuilleLangue, langueEnCours } from '@/components/yoroi/v2/langue/ChoixLangue';

type Goal = 'lose' | 'maintain' | 'gain';

const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

function num(s: string): number | undefined {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return String(Math.round(n * 10) / 10).replace('.', DECIMAL);
}

/** Poids affiche : toujours une decimale, virgule francaise (80,9 kg, 76,0 kg), comme l'accueil */
function fmtKg1(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '';
  return n.toFixed(1).replace('.', DECIMAL);
}

/** JJ/MM/AAAA ou AAAA-MM-JJ vers AAAA-MM-JJ, null si invalide */
function normalizeBirth(str: string): string | null {
  const s = str.trim();
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y: number;
  let m: number;
  let d: number;
  if (fr) { d = +fr[1]; m = +fr[2]; y = +fr[3]; } else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; } else return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  const a = ageOf(dt);
  if (a === null) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function ageOf(dt: Date): number | null {
  const t = new Date();
  let a = t.getFullYear() - dt.getFullYear();
  const md = t.getMonth() - dt.getMonth();
  if (md < 0 || (md === 0 && t.getDate() < dt.getDate())) a--;
  return a > 0 && a < 120 ? a : null;
}

function isoToFr(iso?: string): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Ajoute les barres pendant la saisie : 15061995 devient 15/06/1995 */
function maskDate(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}


export default function TonProfil() {
  const router = useRouter();
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();
  const { espace } = useEspace();
  const { armure } = useIdentite();
  const demo = useModeDemo();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  // pesees : depart par defaut (regle unique departDuChemin, lib/v2/accueil/projection.ts)
  const [pesees, setPesees] = useState<{ date: string; value: number }[]>([]);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [startW, setStartW] = useState('');
  // courbe v2 : « Début de mon objectif » (start_date), au calendrier
  const [debut, setDebut] = useState('');
  const [choixDebut, setChoixDebut] = useState(false);
  const [targetW, setTargetW] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pref, setPref] = useState<null | 'poids' | 'mesures' | 'reperes'>(null);
  const { weightUnit, measurementUnit, setWeightUnit, setMeasurementUnit } = useUnits();
  // 23 octobre 2026 : la langue se choisit dans l'app (feuille des langues)
  const [langueOpen, setLangueOpen] = useState(false);
  // 28 octobre 2026 : age et taille se modifient depuis leurs tuiles
  const [saisie, setSaisie] = useState<null | 'naissance' | 'taille'>(null);
  const [brouillon, setBrouillon] = useState('');
  // reperes des calculs (reglage gender : male, female, neutral), independants du personnage
  const [genre, setGenre] = useState<GenreFormule | undefined>(undefined);
  const [reglagesLisibles, setReglagesLisibles] = useState(true);
  // Sur le tapis : la pratique ouverte, et la position de la rubrique pour y descendre
  const [ouverte, setOuverte] = useState<string | null>(null);
  const scrollRef = React.useRef<React.ComponentRef<typeof Animated.ScrollView> | null>(null);
  const posTapis = React.useRef(0);
  const posContenu = React.useRef(0);

  const sportCombatFavori = espace.sportsFavoris.find((id) => !!gammeDe(id)) ?? espace.sportsFavoris.find((id) => getSportCategory(id).startsWith('combat')) ?? null;
  const { etat, clubs, changer, enregistrerClub, pret } = usePratiques(sportCombatFavori);
  const ouvertInit = React.useRef(false);
  useEffect(() => {
    // la pratique principale s'ouvre au premier affichage
    if (!pret || ouvertInit.current) return;
    ouvertInit.current = true;
    const p = principaleDe(etat.pratiques);
    if (p) setOuverte(p.id);
  }, [pret, etat.pratiques]);

  const load = useCallback(async () => {
    try {
      const [p, wp] = await Promise.all([getProfile(), getWeightProgress()]);
      setProfile(p);
      setCurrent(wp.current);
      getWeights()
        .then((ws) => setPesees((ws ?? []).filter((w) => w && w.weight > 0 && w.date).map((w) => ({ date: w.date.slice(0, 10), value: w.weight }))))
        .catch(() => setPesees([]));
      setName(p?.name ?? '');
      setPhoto(p?.profile_photo ?? null);
      setStartW(fmt(p?.start_weight));
      setDebut(p?.start_date && /^\d{4}-\d{2}-\d{2}/.test(p.start_date) ? p.start_date.slice(0, 10) : '');
      setTargetW(fmt(p?.target_weight));
      setGoal((p?.weight_goal as Goal) || 'maintain');
    } catch (err) {
      logger.error('[Profil] chargement', err);
    }
    getUserSettingsStrict()
      .then((s) => { setReglagesLisibles(true); setGenre(genreDesReglages(s)); })
      .catch(() => setReglagesLisibles(false));
  }, []);

  useEffect(() => {
    load();
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ScreenCapture = require('expo-screen-capture');
      ScreenCapture.allowScreenCaptureAsync?.().catch(() => {});
    } catch {
      // module absent
    }
  }, [load]);

  const dirty = useMemo(() => {
    if (!profile && !name.trim()) return false;
    return (
      name.trim() !== (profile?.name ?? '') ||
      startW !== fmt(profile?.start_weight) ||
      debut !== (profile?.start_date?.slice(0, 10) ?? '') ||
      targetW !== fmt(profile?.target_weight) ||
      goal !== ((profile?.weight_goal as Goal) || 'maintain')
    );
  }, [profile, name, startW, targetW, goal, debut]);

  const birthIso = profile?.birth_date && /^\d{4}-\d{2}-\d{2}/.test(profile.birth_date) ? profile.birth_date.slice(0, 10) : null;
  const age = birthIso ? ageOf(new Date(birthIso + 'T12:00:00')) : null;
  const rankIndex = armure?.rank.index ?? 0;
  const genrePerso: 'h' | 'f' = espace.personnage === 'guerrier_f' ? 'f' : espace.personnage === 'guerrier_h' ? 'h' : profile?.avatar_gender === 'femme' ? 'f' : 'h';
  const personnage = personnageImage(espace.personnage, rankIndex, genrePerso);
  const sansPerso = !aUnPersonnage(espace.personnage);

  // Progression vers l'objectif
  // Meme regle que l'accueil (lib/v2/accueil/projection.ts) : depart du profil, sinon ta premiere pesee du plan
  const s = num(startW) ?? departDuChemin(profile, pesees) ?? undefined;
  const t = num(targetW);
  const progress = s && t && current && Math.abs(s - t) >= 0.05 ? goalProgress(s, t, current).pct : null;

  // tes pratiques : la principale (pastille et club), celle dont la ceinture est en haut
  const princ = principaleDe(etat.pratiques);
  const aCeinture = pratiqueACeinture(etat.pratiques);
  const montrerCeinture = !!aCeinture || etat.pratiques.length === 0 || etat.pratiques.some((p) => !!gammeDe(p.sport));
  const clubPrinc = princ?.clubId != null ? clubs.find((x) => x.id === princ.clubId) : undefined;
  const nomClubPrinc = clubPrinc?.name ?? princ?.clubNom ?? null;

  const handleSave = async () => {
    Keyboard.dismiss();
    if (saving) return;
    if (!name.trim()) {
      showPopup(traduire('Ton prénom'), traduire('Indique ton prénom pour enregistrer ton profil.'));
      return;
    }
    const sw = num(startW);
    const tw = num(targetW);
    if ((sw !== undefined && (sw < 20 || sw > 350)) || (tw !== undefined && (tw < 20 || tw > 350))) {
      showPopup('Poids', traduire('Indique un poids en kilos, entre 20 et 350.'));
      return;
    }
    setSaving(true);
    try {
      const today = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      const base = profile ?? (await getProfile());
      await saveProfile({
        ...(base ?? {}),
        name: name.trim(),
        target_weight: tw,
        start_weight: sw,
        start_date: debut || base?.start_date || `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
        avatar_gender: base?.avatar_gender || (genrePerso === 'f' ? 'femme' : 'homme'),
        profile_photo: photo,
        weight_goal: goal,
      });
      if (tw && fmt(tw) !== fmt(profile?.target_weight)) track('objectif_defini', { type: 'poids' });
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      await load();
    } catch (err) {
      logger.error('[Profil] enregistrement', err);
      showPopup(traduire('Oups'), traduire('Ton profil n’a pas pu être enregistré.'));
    } finally {
      setSaving(false);
    }
  };

  /** Age et taille : enregistres tout de suite depuis leur feuille */
  const validerSaisie = async () => {
    Keyboard.dismiss();
    const base = profile ?? (await getProfile());
    try {
      if (saisie === 'naissance') {
        const iso = brouillon.trim() ? normalizeBirth(brouillon) : null;
        if (brouillon.trim() && !iso) {
          showPopup(traduire('Date de naissance'), traduire('Écris la comme ceci : 15/06/1995.'));
          return;
        }
        const a = iso ? ageOf(new Date(iso + 'T12:00:00')) : null;
        await saveProfile({ ...(base ?? {}), name: base?.name?.trim() || name.trim() || 'Guerrier', avatar_gender: base?.avatar_gender || (genrePerso === 'f' ? 'femme' : 'homme'), birth_date: iso ?? undefined, age: a ?? undefined });
        // 26 octobre 2026 : seule la tranche d'age part (propriete utilisateur), jamais la date ni l'age
        const tranche = trancheDuProfil({ birth_date: iso, age: a });
        if (tranche && tranche !== trancheDuProfil(profile)) setProprietes({ tranche_age: tranche });
      } else if (saisie === 'taille') {
        const h = brouillon ? parseInt(brouillon, 10) : undefined;
        if (h !== undefined && (h < 100 || h > 250)) {
          showPopup(traduire('Taille'), traduire('Indique ta taille en centimètres, entre 100 et 250.'));
          return;
        }
        await saveProfile({ ...(base ?? {}), name: base?.name?.trim() || name.trim() || 'Guerrier', avatar_gender: base?.avatar_gender || (genrePerso === 'f' ? 'femme' : 'homme'), height_cm: h });
      }
      setSaisie(null);
      DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      const fresh = await getProfile();
      setProfile(fresh);
    } catch (err) {
      logger.error('[Profil] age ou taille', err);
      showPopup(traduire('Oups'), traduire('Ton profil n’a pas pu être enregistré.'));
    }
  };

  /** Reperes des calculs : le reglage gender, comme a l'onboarding, sans toucher au personnage */
  const choisirGenre = async (g: GenreFormule) => {
    try {
      await getUserSettingsStrict();
    } catch {
      showPopup(traduire('Oups'), traduire('Tes réglages ne sont pas lisibles pour le moment. Réessaie dans un instant.'));
      return;
    }
    setGenre(g);
    await saveUserSettings({ gender: g });
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };

  // ============================================
  // PHOTO
  // ============================================

  const keepPhoto = async (uri: string): Promise<string> => {
    const target = `${FileSystem.documentDirectory}profile_photo_${Date.now()}.jpg`;
    try {
      const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
      await FileSystem.copyAsync({ from: r.uri, to: target });
      return target;
    } catch {
      try {
        await FileSystem.copyAsync({ from: uri, to: target });
        return target;
      } catch {
        return uri;
      }
    }
  };

  const savePhoto = async (uri: string) => {
    const kept = await keepPhoto(uri);
    setPhoto(kept);
    const base = profile ?? (await getProfile());
    await saveProfile({
      ...(base ?? {}),
      name: base?.name?.trim() || name.trim() || 'Guerrier',
      avatar_gender: base?.avatar_gender || (genrePerso === 'f' ? 'femme' : 'homme'),
      profile_photo: kept,
    });
    // le rond de profil de l'accueil et de Reglages montre la photo tout de suite
    await onPhotoChanged(kept).catch(() => {});
    DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
    DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    const fresh = await getProfile();
    setProfile(fresh);
  };

  const takePhoto = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const { status } = await requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPopup(traduire('Caméra'), traduire('Autorise la caméra dans les réglages du téléphone pour prendre une photo.'), [
          { text: traduire('Ouvrir les réglages'), style: 'primary', onPress: () => Linking.openSettings() },
          { text: traduire('Annuler'), style: 'cancel' },
        ]);
        return;
      }
      const r = await launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (!r.canceled && r.assets?.[0]) await savePhoto(r.assets[0].uri);
    } catch (err) {
      logger.error('[Profil] caméra', err);
      showPopup(traduire('Caméra indisponible'), traduire('Choisis plutôt une photo dans ta galerie.'), [{ text: traduire('Galerie'), style: 'primary', onPress: () => setTimeout(pickPhoto, 500) }]);
    } finally {
      setPicking(false);
    }
  };

  const pickPhoto = async () => {
    if (picking) return;
    setPicking(true);
    try {
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted' && (status as string) !== 'limited') {
        showPopup('Photos', traduire('Autorise l’accès aux photos dans les réglages du téléphone.'), [
          { text: traduire('Ouvrir les réglages'), style: 'primary', onPress: () => Linking.openSettings() },
          { text: traduire('Annuler'), style: 'cancel' },
        ]);
        return;
      }
      const r = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85, selectionLimit: 1 });
      if (!r.canceled && r.assets?.[0]) await savePhoto(r.assets[0].uri);
    } catch (err) {
      logger.error('[Profil] galerie', err);
      showPopup(traduire('Oups'), traduire('La photo n’a pas pu être chargée.'));
    } finally {
      setPicking(false);
    }
  };

  const changePhoto = () => {
    showPopup(traduire('Ta photo'), traduire('Comment veux tu l’ajouter ?'), [
      { text: traduire('Prendre une photo'), style: 'primary', onPress: () => setTimeout(takePhoto, 500) },
      { text: traduire('Choisir dans la galerie'), style: 'default', onPress: () => setTimeout(pickPhoto, 500) },
      ...(photo
        ? [{ text: traduire('Retirer la photo'), style: 'destructive' as const, onPress: async () => {
            setPhoto(null);
            if (profile) {
              await saveProfile({ ...profile, profile_photo: null });
              await onPhotoChanged(null).catch(() => {});
              DeviceEventEmitter.emit('YOROI_PROFILE_CHANGED');
              setProfile(await getProfile());
            }
          } }]
        : []),
      { text: traduire('Annuler'), style: 'cancel' },
    ]);
  };

  const since = profile?.start_date ? (() => {
    const d = new Date(profile.start_date + 'T12:00:00');
    return Number.isNaN(d.getTime()) ? null : traduire("Membre depuis {0} {1}", MONTHS[d.getMonth()], d.getFullYear());
  })() : null;

  // IMC : source unique (lib/v2/progres/biomarkers), derniere pesee et taille, une decimale
  const bmi = (current && profile?.height_cm ? bmiOf(current, profile.height_cm) : undefined) ?? null;

  /** Descend jusqu'a Sur le tapis et ouvre une pratique (la principale par defaut) */
  const allerAuTapis = (id?: string | null) => {
    const cible = id ?? princ?.id ?? null;
    if (cible) setOuverte(cible);
    setTimeout(() => {
      (scrollRef.current as unknown as { scrollTo?: (o: { y: number; animated: boolean }) => void } | null)?.scrollTo?.({ y: Math.max(0, posContenu.current + posTapis.current - 90), animated: true });
    }, 60);
  };

  const rond = photo ? (
    <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
  ) : sansPerso ? (
    <RondInitiales size={118} nom={name} />
  ) : (
    <BusteRond source={personnage} />
  );
  const jeton = photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} /> : sansPerso ? <RondInitiales size={28} nom={name} /> : <BusteRond source={personnage} />;
  const lilas = teinteRubrique('lilas', isDark);
  const peche = teinteRubrique('peche', isDark);
  const nomGenre = genre === 'male' ? traduire('Homme') : genre === 'female' ? traduire('Femme') : genre === 'neutral' ? traduire('Neutre') : null;

  return (
    <ProfilEcran
      gutter={MARGE}
      gap={12}
      fondDes={40}
      scrollRef={scrollRef}
      footer={dirty ? <BoutonPrincipal label={traduire("Enregistrer")} loading={saving} onPress={handleSave} lignes={1} /> : undefined}
      hero={(top) => (
        <View onLayout={(e) => { posContenu.current = e.nativeEvent.layout.height + 6; }}>
          <CarteAthlete
            top={top}
            scene={espace.scene}
            rond={rond}
            styleRond={styleRondDe(espace)}
            name={name}
            onName={setName}
            since={since}
            principale={princ}
            ceinture={aCeinture ?? (princ && gammeDe(princ.sport) ? princ : etat.pratiques.find((p) => !!gammeDe(p.sport)) ?? null)}
            montrerCeinture={montrerCeinture}
            onDecorer={() => router.push(ROUTES_PERSONNALISER.photo as never)}
            onPhoto={changePhoto}
            onCeinture={() => allerAuTapis(aCeinture?.id)}
            age={age}
            naissance={isoToFr(birthIso ?? undefined)}
            onAge={() => { setBrouillon(isoToFr(birthIso ?? undefined)); setSaisie('naissance'); }}
            taille={profile?.height_cm ?? null}
            onTaille={() => { setBrouillon(profile?.height_cm ? String(profile.height_cm) : ''); setSaisie('taille'); }}
            imc={bmi ? bmi.toFixed(1).replace('.', DECIMAL) : null}
            club={nomClubPrinc ? { nom: nomClubPrinc, logo: logoDuClub(clubPrinc, demo), sport: princ!.sport } : null}
            onClub={() => allerAuTapis(princ?.id)}
          />
          <View style={{ marginHorizontal: MARGE, marginTop: 16 }}>
            <CheminCarte start={s} current={current} target={t} progress={progress} fmt={fmtKg1} jeton={jeton} />
          </View>
        </View>
      )}
    >
      <Rubrique teinte="peche" titre={traduire('Ton objectif')}>
        <SegmentTeinte
          teinte="peche"
          options={[{ key: 'lose', label: traduire('Perdre') }, { key: 'maintain', label: traduire('Maintenir') }, { key: 'gain', label: traduire('Prendre') }]}
          value={goal}
          onChange={(v) => setGoal(v as Goal)}
        />
        <View style={{ marginTop: 6 }}>
          {/* courbe v2 : le jour ou commence ta perte, ta prise ou ton maintien ; le poids de depart suit ta pesee de ce jour */}
          <LigneRubrique first ligne={peche.ligne} sticker="calendrier" icon="calendar" label={traduire("Début de mon objectif")} sub={traduire("Ta ligne et ton torii partent de là")} value={debut ? jourCourt(debut) : traduire('à choisir')} onPress={() => setChoixDebut(true)} />
          <LigneRubrique ligne={peche.ligne} sticker="balance" icon="scale" label={traduire("Poids de départ")} unit="kg" input={{ value: startW, onChangeText: setStartW, placeholder: current ? fmt(current) : '85', keyboardType: 'decimal-pad', maxLength: 5 }} />
          <LigneRubrique ligne={peche.ligne} sticker="objectifs" icon="target" label={traduire("Poids visé")} unit="kg" input={{ value: targetW, onChangeText: setTargetW, placeholder: '75', keyboardType: 'decimal-pad', maxLength: 5 }} />
        </View>
      </Rubrique>

      <DatePickerSheet
        visible={choixDebut}
        value={debut || debutPropose(profile, [...pesees].sort((a, b) => (a.date < b.date ? -1 : 1)), isoLocalDay(new Date()))}
        title={traduire("Début de mon objectif")}
        onClose={() => setChoixDebut(false)}
        onPick={(iso) => {
          avantChangementDebut().catch(() => {});
          setDebut(iso);
          const n = nouveauDebut(iso, pesees, num(startW));
          if (n.start_weight) setStartW(fmt(n.start_weight));
        }}
      />

      <View onLayout={(e) => { posTapis.current = e.nativeEvent.layout.y; }}>
        <TapisPratiques etat={etat} clubs={clubs} ouverte={ouverte} onOuvrir={setOuverte} changer={changer} enregistrerClub={enregistrerClub} favoris={espace.sportsFavoris} />
      </View>

      <Rubrique teinte="lilas" titre={traduire("Tes préférences")}>
        <View style={{ marginTop: 4 }}>
          <LigneRubrique first ligne={lilas.ligne} sticker="poids" icon="dumbbell" label={traduire("Unité des charges")} value={weightUnit === 'kg' ? 'kg' : traduire('livres')} muted onPress={() => setPref('poids')} />
          <LigneRubrique ligne={lilas.ligne} sticker="metre_ruban" icon="ruler" label={traduire("Mensurations")} value={measurementUnit === 'cm' ? 'cm' : traduire('pouces')} muted onPress={() => setPref('mesures')} />
          <LigneRubrique ligne={lilas.ligne} sticker="corps" icon="user" label={traduire("Repères des calculs")} sub={traduire("Masse grasse, métabolisme, besoins")} value={nomGenre ?? traduire('À choisir')} muted onPress={() => setPref('reperes')} />
          <LigneRubrique ligne={lilas.ligne} sticker="langue" icon="globe" label={traduire('Langue')} value={langueEnCours()} muted onPress={() => setLangueOpen(true)} />
          <LigneRubrique ligne={lilas.ligne} sticker="coeur" icon="heart" label={traduire("Zones cardiaques")} sub={traduire("Tes seuils de fréquence cardiaque")} onPress={() => router.push('/heart-zones-settings' as never)} />
        </View>
      </Rubrique>

      <ChoiceSheet
        visible={pref === 'poids'}
        onClose={() => setPref(null)}
        title={traduire("Unité des charges")}
        options={[{ key: 'kg', label: traduire('Kilos'), sub: traduire('Exemple : 100 kg au squat') }, { key: 'lbs', label: traduire('Livres'), sub: traduire('Exemple : 220 lb au squat. Ton poids de corps reste en kilos') }]}
        value={weightUnit}
        onChange={(v) => setWeightUnit(v as 'kg' | 'lbs')}
      />
      <ChoiceSheet
        visible={pref === 'mesures'}
        onClose={() => setPref(null)}
        title={traduire("Mensurations")}
        options={[{ key: 'cm', label: traduire('Centimètres'), sub: traduire('Exemple : 84 cm') }, { key: 'in', label: traduire('Pouces'), sub: traduire('Exemple : 33 in') }]}
        value={measurementUnit}
        onChange={(v) => setMeasurementUnit(v as 'cm' | 'in')}
      />
      <ChoiceSheet
        visible={pref === 'reperes'}
        onClose={() => setPref(null)}
        title={traduire("Repères des calculs")}
        subtitle={reglagesLisibles ? traduire("Pour la masse grasse, le métabolisme et tes besoins. Ton personnage ne change pas.") : traduire('Tes réglages ne sont pas lisibles pour le moment. Réessaie dans un instant.')}
        options={[
          { key: 'male', label: traduire('Homme') },
          { key: 'female', label: traduire('Femme') },
          { key: 'neutral', label: traduire('Neutre'), sub: traduire('La moyenne des deux, un peu moins précis') },
        ]}
        value={(genre ?? '') as GenreFormule}
        onChange={(v) => { choisirGenre(v as GenreFormule).catch(() => {}); }}
      />

      <Sheet
        visible={saisie !== null}
        onClose={() => setSaisie(null)}
        title={saisie === 'taille' ? traduire('Ta taille') : traduire('Ta date de naissance')}
        subtitle={saisie === 'taille' ? traduire('En centimètres, entre 100 et 250.') : traduire('Pour ton âge. Seule ta tranche d’âge sert aux statistiques.')}
      >
        <View style={{ height: 56, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 }}>
          <Icon name={saisie === 'taille' ? 'ruler' : 'cake'} size={19} />
          <TextInput
            autoFocus
            value={brouillon}
            onChangeText={(v) => setBrouillon(saisie === 'taille' ? v.replace(/\D/g, '') : maskDate(v))}
            placeholder={saisie === 'taille' ? '175' : '15/06/1995'}
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            maxLength={saisie === 'taille' ? 3 : 10}
            accessibilityLabel={saisie === 'taille' ? traduire('Taille') : traduire('Date de naissance')}
            style={{ flex: 1, fontSize: 20, fontWeight: '800', color: c.ink }}
            onSubmitEditing={validerSaisie}
          />
          {saisie === 'taille' ? <Ink size={15} weight="bold" color={c.textMuted}>cm</Ink> : null}
        </View>
        <BoutonPrincipal label={traduire('Enregistrer')} onPress={validerSaisie} lignes={1} />
      </Sheet>

      <FeuilleLangue visible={langueOpen} onClose={() => setLangueOpen(false)} />
      <PopupComponent />
    </ProfilEcran>
  );
}
