/**
 * Profil competiteur (refonte v2) : genre, poids actuel, categorie IBJJF, ceinture de jiu-jitsu.
 * Chaque choix est enregistre tout de suite (meme stockage que l'ancien ecran).
 */
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, Icon, P, Press, SectionTitle, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { Chip, ChipScroll, Field } from '@/components/yoroi/v2/competition/ui';
import { BeltSwatch } from '@/components/yoroi/v2/dojo/parts';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { formatKg } from '@/lib/v2/weightStats';
import { ibjjfAdvised, ibjjfCategories, ibjjfWeightLabel, normalizeIbjjfId } from '@/lib/v2/competition/ibjjf';
import type { IbjjfCategory } from '@/lib/v2/competition/ibjjf';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';

const COMPETITOR_PROFILE_KEY = '@yoroi_competitor_profile';

type Cat = { id: string; name: string; weight: string; maxWeight: number };
/** Liste commune de l'app (noms officiels portugais), voir lib/v2/competition/ibjjf.ts */
const toCat = (c: IbjjfCategory): Cat => ({ id: c.id, name: c.name, weight: ibjjfWeightLabel(c), maxWeight: c.maxWeight });
const BJJ_BELTS = [
  { id: 'white', name: 'Blanche', color: '#FFFFFF', edge: '#CFCAC0' },
  { id: 'blue', name: 'Bleue', color: '#2C4A84', edge: '#2C4A84' },
  { id: 'purple', name: 'Violette', color: '#5B3F86', edge: '#5B3F86' },
  { id: 'brown', name: 'Marron', color: '#6B4226', edge: '#6B4226' },
  { id: 'black', name: 'Noire', color: '#1D2029', edge: '#1D2029' },
];

type CompetitorProfile = { gender: 'male' | 'female' | null; category: string | null; belt: string | null; currentWeight: number | null };

export default function CompetitorProfileScreen() {
  const router = useRouter();
  const { lastWeight, gender: athleteGender, loaded: athleteLoaded } = useAthlete();
  const [storedLoaded, setStoredLoaded] = useState(false);
  const [genderFromProfile, setGenderFromProfile] = useState(false);
  const [profile, setProfile] = useState<CompetitorProfile>({ gender: null, category: null, belt: null, currentWeight: null });
  const [weightInput, setWeightInput] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(COMPETITOR_PROFILE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            // Migration douce : les anciens identifiants anglais (rooster...) deviennent portugais (galo...)
            const migrated = parsed.category ? normalizeIbjjfId(parsed.category) : null;
            if (parsed.category && migrated && migrated !== parsed.category) {
              parsed.category = migrated;
              AsyncStorage.setItem(COMPETITOR_PROFILE_KEY, JSON.stringify(parsed)).catch(() => {});
            }
            setProfile(parsed);
            if (parsed.currentWeight) setWeightInput(String(parsed.currentWeight).replace('.', ','));
          }
        }
      } catch (error) {
        logger.error('Erreur chargement profil compétiteur:', error);
      }
      setStoredLoaded(true);
    })();
  }, []);

  // Genre pre-rempli depuis ton profil quand la fiche n'en a pas encore
  useEffect(() => {
    if (!storedLoaded || !athleteLoaded || profile.gender) return;
    setGenderFromProfile(true);
    setProfile((p) => (p.gender ? p : { ...p, gender: athleteGender === 'femme' ? 'female' : 'male' }));
  }, [storedLoaded, athleteLoaded, athleteGender, profile.gender]);

  const save = async (p: CompetitorProfile) => {
    setProfile(p);
    try {
      await AsyncStorage.setItem(COMPETITOR_PROFILE_KEY, JSON.stringify(p));
    } catch (error) {
      logger.error('Erreur sauvegarde profil compétiteur:', error);
    }
  };

  const cats = ibjjfCategories(profile.gender).map(toCat);
  const advisedCat = profile.currentWeight && profile.gender ? ibjjfAdvised(profile.gender, profile.currentWeight) : undefined;
  const recommended = advisedCat ? toCat(advisedCat) : undefined;
  const belt = BJJ_BELTS.find((b) => b.id === profile.belt);
  const category = cats.find((c) => c.id === (normalizeIbjjfId(profile.category) ?? profile.category));
  const complete = !!(profile.gender && profile.category && profile.belt);

  const saveWeight = (raw = weightInput) => {
    const w = parseFloat(raw.replace(',', '.'));
    if (isNaN(w) || w <= 0 || w > 400) {
      appAlert('Poids invalide', 'Entre un poids en kilos, par exemple 75,5.');
      return;
    }
    save({ ...profile, currentWeight: w });
    tap('success');
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <DetailScreen title="Profil compétiteur" subtitle="Ta fiche pour les compétitions">
      <Enter i={0} style={{ gap: 10 }}>
        <SectionTitle>Genre</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['male', 'female'] as const).map((g) => {
            const on = profile.gender === g;
            return (
              <Press key={g} style={{ flex: 1 }} onPress={() => { setGenderFromProfile(false); save({ ...profile, gender: g, category: g === profile.gender ? profile.category : null }); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={g === 'male' ? 'Homme' : 'Femme'}>
                <View style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: on ? P.ink : P.white, borderWidth: on ? 0 : 1, borderColor: P.line2 }}>
                  <View style={{ minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Ink size={18} weight="black" tight color={on ? P.white : P.ink}>
                      {g === 'male' ? 'Homme' : 'Femme'}
                    </Ink>
                    {on ? <Icon name="check" size={22} color={P.goldLight} width={3} /> : null}
                  </View>
                  <View style={{ height: 112, marginHorizontal: 8, marginBottom: 8, borderRadius: 18, backgroundColor: on ? 'rgba(242,241,236,0.12)' : '#E9E4D8', overflow: 'hidden', alignItems: 'center' }}>
                    <Image source={sportArt('jjb', g === 'male' ? 'homme' : 'femme', 2)} style={{ position: 'absolute', top: 4, width: 110, height: 148 }} resizeMode="contain" />
                  </View>
                </View>
              </Press>
            );
          })}
        </View>
        {genderFromProfile ? <Ink size={12} weight="bold" color={P.muted} style={{ paddingHorizontal: 4 }}>Repris de ton profil, touche l’autre carte pour changer.</Ink> : null}
      </Enter>

      {profile.gender ? (
        <>
          <Enter i={1} style={{ gap: 10 }}>
            <SectionTitle>Poids actuel</SectionTitle>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field value={weightInput} onChangeText={setWeightInput} placeholder="Ex : 75,5" keyboardType="decimal-pad" suffix="kg" icon="scale" onSubmit={() => saveWeight()} />
              </View>
              <Press onPress={() => saveWeight()} accessibilityRole="button" accessibilityLabel="Enregistrer le poids">
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: savedFlash ? P.moss : P.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={24} color={P.white} width={3} />
                </View>
              </Press>
            </View>
            {lastWeight && String(profile.currentWeight) !== String(lastWeight.weight) ? (
              <Press
                onPress={() => {
                  const v = formatKg(lastWeight.weight);
                  setWeightInput(v);
                  saveWeight(v);
                }}
                accessibilityRole="button"
                accessibilityLabel="Utiliser ma dernière pesée"
              >
                <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                  <Icon name="refresh" size={16} color={P.indigo} />
                  <Ink size={13} weight="extraBold" color={P.indigo}>
                    {`Utiliser ma dernière pesée, ${formatKg(lastWeight.weight)} kg`}
                  </Ink>
                </View>
              </Press>
            ) : null}
            {recommended ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: P.mossSoft, borderColor: '#D3DEC0' }}>
                <Icon name="star" size={20} color={P.mossText} />
                <Ink size={14} weight="extraBold" color={P.mossText} style={{ flex: 1 }}>
                  {`Catégorie conseillée : ${recommended.name} (${recommended.weight})`}
                </Ink>
              </Card>
            ) : null}
          </Enter>

          <Enter i={2} style={{ gap: 10 }}>
            <SectionTitle>Catégorie IBJJF</SectionTitle>
            <Ink size={13} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4, marginTop: -4 }}>
              Ta catégorie de poids officielle, avec le kimono.
            </Ink>
            <ChipScroll>
              {cats.map((c) => (
                <Chip key={c.id} label={c.name} sub={c.weight} accent={P.accent} active={profile.category === c.id} onPress={() => save({ ...profile, category: c.id })} />
              ))}
            </ChipScroll>
          </Enter>

          <Enter i={3} style={{ gap: 10 }}>
            <SectionTitle>Ceinture de jiu-jitsu</SectionTitle>
            <Card style={{ padding: 8, gap: 0 }}>
              {BJJ_BELTS.map((b, i) => {
                const on = profile.belt === b.id;
                return (
                  <Press key={b.id} onPress={() => save({ ...profile, belt: b.id })} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Ceinture ${b.name}`}>
                    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2, backgroundColor: on ? P.paper : 'transparent', borderRadius: 14 }}>
                      <BeltSwatch color={b.color} edge={b.edge} width={58} height={14} />
                      <Ink size={16} weight="extraBold" style={{ flex: 1 }}>
                        {b.name}
                      </Ink>
                      {on ? <Icon name="check" size={22} color={P.accent} width={3} /> : null}
                    </View>
                  </Press>
                );
              })}
            </Card>
          </Enter>
        </>
      ) : (
        <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
          <Ink size={15} weight="extraBold">
            Commence par ton genre
          </Ink>
          <Ink size={13} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>
            Les catégories de poids en dépendent.
          </Ink>
        </Card>
      )}

      {complete ? (
        <Enter i={4}>
          <Glass style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Ink size={12} weight="bold" color={P.muted}>
                  Ta fiche de combattant
                </Ink>
                <Ink size={22} weight="black" tight>
                  {category?.name ?? ''}
                </Ink>
              </View>
              <Hanko size={48} />
            </View>
            {[
              ['Genre', profile.gender === 'male' ? 'Homme' : 'Femme'],
              ['Poids actuel', profile.currentWeight ? `${formatKg(profile.currentWeight)} kg` : 'Non renseigné'],
              ['Catégorie', category ? `${category.name}, ${category.weight}` : ''],
              ['Ceinture', belt?.name ?? ''],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Ink size={14} weight="bold" color={P.ink2}>
                  {k}
                </Ink>
                <Ink size={14} weight="extraBold">
                  {v}
                </Ink>
              </View>
            ))}
            <BigButton label="Voir mes compétitions" onPress={() => router.push('/competitions' as any)} />
          </Glass>
        </Enter>
      ) : null}
    </DetailScreen>
  );
}
