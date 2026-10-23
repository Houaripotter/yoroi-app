/**
 * Ton profil (sous-page de Reglages) : prenom, photo, naissance, taille,
 * poids de depart et objectif, ceinture et club pour les sports de combat.
 * En bas, tes preferences : unites, langue, zones cardiaques.
 * Une photo ajoutee passe le rond de profil de l'accueil sur la photo, tout de suite.
 * Tout s'edite sur place, le bouton Enregistrer apparait des qu'un champ change.
 * Vague 18 : ta scene en bandeau derriere ta photo, ton chemin vers un torii, ta ceinture dessinee,
 * ton sport illustre et des ornements discrets entre les sections. Barre du haut fixe sous l'heure.
 */
import { track } from '@/utils/telemetry';
import { bmiOf } from '@/lib/v2/progres/biomarkers';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Keyboard, Linking, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Icon, Row, SectionTitle, Segmented } from '@/components/yoroi/v2/espace/ui';
import { ProfilEcran, ProfilHero } from '@/components/yoroi/v2/profil/ProfilEcran';
import { CheminPoids } from '@/components/yoroi/v2/profil/CheminPoids';
import { TapisCard } from '@/components/yoroi/v2/profil/Tapis';
import { Ornement } from '@/components/yoroi/v2/profil/Ornement';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';
import { ChoiceSheet } from '@/components/yoroi/v2/espace/reglages/parts';
import { DatePickerSheet, isoLocalDay } from '@/components/yoroi/v2/DateChips';
import { avantChangementDebut, debutPropose, nouveauDebut } from '@/lib/v2/pesee/debutObjectif';
import { jourCourt } from '@/lib/v2/pesee/ligneDirectrice';
import { useUnits } from '@/components/yoroi/v2/espace/reglages/prefs';
import { onPhotoChanged } from '@/components/yoroi/v2/espace/identite';
import { SUPPORTED_LANGUAGES, useI18n } from '@/lib/I18nContext';
import { useCustomPopup } from '@/components/CustomPopup';
import { addClub, getClubs, getProfile, getWeightProgress, getWeights, saveProfile, updateClub } from '@/lib/database';
import { departDuChemin, goalProgress } from '@/lib/v2/accueil/projection';
import type { Club, Profile } from '@/lib/database';
import { getUserBelt, setUserBelt } from '@/lib/fighterModeService';
import { getSportCategory, getSportName } from '@/lib/sports';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { logger } from '@/lib/security/logger';
import { traduire, DECIMAL, LANG } from '@/lib/i18n/tr';

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
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();
  const { espace } = useEspace();
  const { armure } = useIdentite();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  // pesees : depart par defaut (regle unique departDuChemin, lib/v2/accueil/projection.ts)
  const [pesees, setPesees] = useState<{ date: string; value: number }[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [savedBelt, setSavedBelt] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [birth, setBirth] = useState('');
  const [height, setHeight] = useState('');
  const [startW, setStartW] = useState('');
  // courbe v2 : « Début de mon objectif » (start_date), au calendrier
  const [debut, setDebut] = useState('');
  const [choixDebut, setChoixDebut] = useState(false);
  const [targetW, setTargetW] = useState('');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [belt, setBelt] = useState<string | null>(null);
  const [club, setClub] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pref, setPref] = useState<null | 'poids' | 'mesures' | 'langue'>(null);
  const { weightUnit, measurementUnit, setWeightUnit, setMeasurementUnit } = useUnits();
  const { language, setLanguage } = useI18n();
  // La langue suit le réglage du téléphone (ou le réglage de langue de l'app dans les réglages iOS et Android)
  const langLabel = ({ fr: 'Français', en: 'English', de: 'Deutsch', nl: 'Nederlands' } as const)[LANG];

  const load = useCallback(async () => {
    try {
      const [p, wp, cl, b] = await Promise.all([getProfile(), getWeightProgress(), getClubs().catch(() => [] as Club[]), getUserBelt().catch(() => null)]);
      setProfile(p);
      setCurrent(wp.current);
      getWeights()
        .then((ws) => setPesees((ws ?? []).filter((w) => w && w.weight > 0 && w.date).map((w) => ({ date: w.date.slice(0, 10), value: w.weight }))))
        .catch(() => setPesees([]));
      setClubs(cl);
      setSavedBelt(b);
      setName(p?.name ?? '');
      setPhoto(p?.profile_photo ?? null);
      setBirth(isoToFr(p?.birth_date));
      setHeight(p?.height_cm ? String(p.height_cm) : '');
      setStartW(fmt(p?.start_weight));
      setDebut(p?.start_date && /^\d{4}-\d{2}-\d{2}/.test(p.start_date) ? p.start_date.slice(0, 10) : '');
      setTargetW(fmt(p?.target_weight));
      setGoal((p?.weight_goal as Goal) || 'maintain');
      setBelt(b);
      setClub(cl[0]?.name ?? '');
    } catch (err) {
      logger.error('[Profil] chargement', err);
    }
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
      birth !== isoToFr(profile?.birth_date) ||
      height !== (profile?.height_cm ? String(profile.height_cm) : '') ||
      startW !== fmt(profile?.start_weight) ||
      debut !== (profile?.start_date?.slice(0, 10) ?? '') ||
      targetW !== fmt(profile?.target_weight) ||
      goal !== ((profile?.weight_goal as Goal) || 'maintain') ||
      belt !== savedBelt ||
      club.trim() !== (clubs[0]?.name ?? '')
    );
  }, [profile, name, birth, height, startW, targetW, goal, belt, savedBelt, club, clubs, debut]);

  const birthIso = normalizeBirth(birth);
  const age = birthIso ? ageOf(new Date(birthIso + 'T12:00:00')) : null;
  const isCombat = espace.sportsFavoris.some((id) => getSportCategory(id).startsWith('combat'));
  const combatSport = espace.sportsFavoris.find((id) => getSportCategory(id).startsWith('combat'));
  const showCombat = isCombat || !!savedBelt || clubs.length > 0;
  const rankIndex = armure?.rank.index ?? 0;
  const genre: 'h' | 'f' = espace.personnage === 'guerrier_f' ? 'f' : espace.personnage === 'guerrier_h' ? 'h' : profile?.avatar_gender === 'femme' ? 'f' : 'h';

  // Progression vers l'objectif
  // Meme regle que l'accueil (lib/v2/accueil/projection.ts) : depart du profil, sinon ta premiere pesee du plan
  const s = num(startW) ?? departDuChemin(profile, pesees) ?? undefined;
  const t = num(targetW);
  const progress = s && t && current && Math.abs(s - t) >= 0.05 ? goalProgress(s, t, current).pct : null;

  const handleSave = async () => {
    Keyboard.dismiss();
    if (saving) return;
    if (!name.trim()) {
      showPopup(traduire('Ton prénom'), traduire('Indique ton prénom pour enregistrer ton profil.'));
      return;
    }
    if (birth.trim() && !birthIso) {
      showPopup(traduire('Date de naissance'), traduire('Écris-la comme ceci : 15/06/1995.'));
      return;
    }
    const h = height ? parseInt(height, 10) : undefined;
    if (h !== undefined && (h < 100 || h > 250)) {
      showPopup('Taille', traduire('Indique ta taille en centimètres, entre 100 et 250.'));
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
      await saveProfile({
        name: name.trim(),
        height_cm: h,
        target_weight: tw,
        start_weight: sw,
        start_date: debut || profile?.start_date || `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`,
        avatar_gender: genre === 'f' ? 'femme' : 'homme',
        profile_photo: photo,
        birth_date: birthIso ?? undefined,
        weight_goal: goal,
        age: age ?? undefined,
      });
      if (tw && fmt(tw) !== fmt(profile?.target_weight)) track('objectif_defini', { type: 'poids' });
      if (belt !== savedBelt && belt) await setUserBelt(belt);
      const clubName = club.trim();
      if (clubName !== (clubs[0]?.name ?? '')) {
        if (clubs[0]?.id && clubName) await updateClub(clubs[0].id, { name: clubName });
        else if (clubName) await addClub({ name: clubName, sport: combatSport ?? 'jjb' });
      }
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
      avatar_gender: base?.avatar_gender || (genre === 'f' ? 'femme' : 'homme'),
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
    showPopup(traduire('Ta photo'), traduire('Comment veux-tu l’ajouter ?'), [
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

  return (
    <ProfilEcran
      footer={dirty ? <Button tone="accent" label={traduire("Enregistrer")} loading={saving} onPress={handleSave} /> : undefined}
      hero={(top) => (
        <ProfilHero
          top={top}
          scene={espace.scene}
          photo={photo}
          personnage={personnageImage(espace.personnage, rankIndex, genre)}
          onPhoto={changePhoto}
          name={name}
          onName={setName}
          since={since}
        />
      )}
    >
      {/* Ton chemin vers l'objectif */}
      <CheminPoids start={s} current={current} target={t} progress={progress} fmt={fmtKg1} />

      <Ornement id="sakura" />
      <SectionTitle title={traduire("Toi")} />
      <Card>
        <Field first inputMin={124} icon="cake" label={traduire("Date de naissance")} hint={age ? traduire("{0} ans", age) : 'facultatif'} value={birth} onChangeText={(v) => setBirth(maskDate(v))} placeholder="15/06/1995" keyboardType="number-pad" maxLength={10} />
        <Field icon="ruler" label="Taille" unit="cm" value={height} onChangeText={(v) => setHeight(v.replace(/\D/g, ''))} placeholder="175" keyboardType="number-pad" maxLength={3} />
        {bmi ? <Row icon="info" label={traduire("Indice de masse corporelle")} value={bmi.toFixed(1).replace('.', DECIMAL)} /> : null}
      </Card>

      <Ornement id="eventail" />
      <SectionTitle title={traduire("Ton objectif")} />
      <Card style={{ padding: 14, gap: 4 }}>
        <Segmented
          options={[{ key: 'lose', label: traduire('Perdre') }, { key: 'maintain', label: traduire('Maintenir') }, { key: 'gain', label: traduire('Prendre') }]}
          value={goal}
          onChange={(v) => setGoal(v as Goal)}
        />
      </Card>
      <Card>
        {/* courbe v2 : le jour ou commence ta perte, ta prise ou ton maintien ; le poids de depart suit ta pesee de ce jour */}
        <Row
          first
          icon="calendar"
          label={traduire("Début de mon objectif")}
          sub={traduire("Ta ligne et ton torii partent de ce jour")}
          value={debut ? jourCourt(debut) : traduire('à choisir')}
          onPress={() => setChoixDebut(true)}
        />
        <Field icon="scale" label={traduire("Poids de départ")} unit="kg" value={startW} onChangeText={setStartW} placeholder={current ? fmt(current) : '85'} keyboardType="decimal-pad" maxLength={5} />
        <Field icon="target" label={traduire("Poids visé")} unit="kg" value={targetW} onChangeText={setTargetW} placeholder="75" keyboardType="decimal-pad" maxLength={5} />
      </Card>

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
      <Ornement id="katanas" />
      {showCombat ? (
        <>
          <SectionTitle title={traduire("Sur le tapis")} sub={combatSport ? getSportName(combatSport) : traduire('Sport de combat')} />
          <TapisCard sport={combatSport} femme={genre === 'f'} belt={belt} onBelt={setBelt} />
          <Card>
            <Field first icon="home" label={traduire("Ton club")} value={club} onChangeText={setClub} placeholder={traduire("Nom du club")} maxLength={40} wide />
          </Card>
        </>
      ) : (
        <Card>
          <Row first icon="swords" label={traduire("Tu fais un sport de combat ?")} sub={traduire("Ajoute-le à tes sports pour noter ta ceinture et ton club")} onPress={() => router.push('/espace/sports' as any)} />
        </Card>
      )}

      <Ornement id="lanterne" />
      <SectionTitle title={traduire("Tes préférences")} />
      <Card>
        <Row first icon="scale" label={traduire("Unité des charges")} value={weightUnit === 'kg' ? 'kg' : 'livres'} onPress={() => setPref('poids')} />
        <Row icon="ruler" label={traduire("Mensurations")} value={measurementUnit === 'cm' ? 'cm' : 'pouces'} onPress={() => setPref('mesures')} />
        <Row icon="globe" label={traduire('Langue')} value={langLabel} onPress={() => Linking.openSettings()} />
        <Row icon="heart" label={traduire("Zones cardiaques")} sub={traduire("Tes seuils de fréquence cardiaque")} onPress={() => router.push('/heart-zones-settings' as any)} />
      </Card>

      <ChoiceSheet
        visible={pref === 'poids'}
        onClose={() => setPref(null)}
        title={traduire("Unité des charges")}
        options={[{ key: 'kg', label: traduire('Kilos'), sub: traduire('Exemple : 100 kg au squat') }, { key: 'lbs', label: traduire('Livres'), sub: traduire('Exemple : 220 lb au squat. Ton poids de corps reste en kilos') }]}
        value={weightUnit}
        onChange={(v) => setWeightUnit(v as 'kg' | 'lbs')}
      />
      <ChoiceSheet
        visible={pref === 'mesures'}
        onClose={() => setPref(null)}
        title={traduire("Mensurations")}
        options={[{ key: 'cm', label: traduire('Centimètres'), sub: traduire('Exemple : 84 cm') }, { key: 'in', label: traduire('Pouces'), sub: traduire('Exemple : 33 in') }]}
        value={measurementUnit}
        onChange={(v) => setMeasurementUnit(v as 'cm' | 'in')}
      />
      <ChoiceSheet
        visible={pref === 'langue'}
        onClose={() => setPref(null)}
        title={traduire("Langue")}
        options={SUPPORTED_LANGUAGES.map((l) => ({ key: l.code as string, label: l.nativeName }))}
        value={language as string}
        onChange={(v) => { setLanguage(v as any).catch(() => {}); }}
      />

      <PopupComponent />
    </ProfilEcran>
  );
}

function Field({ icon, label, unit, hint, first, wide, inputMin = 80, ...input }: TextInputProps & { icon: Parameters<typeof Icon>[0]['name']; label: string; unit?: string; hint?: string; first?: boolean; wide?: boolean; inputMin?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ minHeight: 60, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: first ? 0 : 1, borderColor: c.divider }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} />
      </View>
      <View style={{ flex: wide ? 0 : 1, gap: 1 }}>
        <Ink size={15} weight="bold">{label}</Ink>
        {hint ? <Ink size={12} color={c.textMuted}>{hint}</Ink> : null}
      </View>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor={c.textMuted}
        style={{ flex: wide ? 1 : 0, minWidth: inputMin, height: 48, textAlign: 'right', fontSize: 17, fontWeight: '800', color: c.ink }}
      />
      {unit ? <Ink size={14} weight="bold" color={c.textMuted}>{unit}</Ink> : null}
    </View>
  );
}
