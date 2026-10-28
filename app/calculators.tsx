/**
 * Calculateurs (refonte v2) : IMC, IMG, metabolisme de base, besoins caloriques,
 * poids de forme, macros, eau, charge maximale (1RM) et lien vers les zones cardio.
 * Chaque calculateur est une carte claire avec son resultat en gros chiffre ;
 * la formule et sa source s'ouvrent dans une feuille. 100 % hors ligne.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Enter, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { BigNumber, Badge, BottomSheet, Chip, GenderSwitch, H2, HRow, IconDot, KV, LinkCard, MacroBars, NIcon, Notice, NumField, P, SERIES, Segments, SourceRow } from '@/components/yoroi/v2/nutrition/ui';
import type { NIconName, Tone } from '@/components/yoroi/v2/nutrition/ui';
import { loadBodyData } from '@/lib/v2/nutrition/body';
import {
  ACTIVITY_MULTIPLIERS,
  EXERCISES,
  IMG_RANGES,
  MACROS_BY_GOAL,
  SOURCES,
  bmr,
  fmt,
  idealWeight,
  imc,
  imcCategory,
  img,
  imgCategory,
  macrosFor,
  num,
  oneRM,
  repRanges,
  strengthLevel,
  tdee,
  water,
} from '@/lib/v2/nutrition/formulas';
import type { ActivityLevel, CalcGoal, ExerciseType, Gender } from '@/lib/v2/nutrition/formulas';
import { traduire, LOCALE, DECIMAL } from '@/lib/i18n/tr';

type CalcId = 'imc' | 'img' | 'bmr' | 'tdee' | 'ideal' | 'macros' | 'water' | '1rm';

export default function CalculatorsScreen() {
  const router = useRouter();
  const [weightStr, setWeightStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [ageStr, setAgeStr] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<CalcGoal>('maintain');
  const [exerciseHours, setExerciseHours] = useState(0);
  const [liftStr, setLiftStr] = useState('');
  const [repsStr, setRepsStr] = useState('');
  const [exercise, setExercise] = useState<ExerciseType>('bench');
  const [detail, setDetail] = useState<CalcId | null>(null);
  const [fromProfile, setFromProfile] = useState(false);

  const fillFromProfile = async () => {
    const b = await loadBodyData();
    if (b.weight) setWeightStr(String(b.weight));
    if (b.height) setHeightStr(String(b.height));
    if (b.age) setAgeStr(String(b.age));
    setGender(b.gender);
    setFromProfile(!!(b.weight || b.height || b.age));
  };

  useEffect(() => {
    fillFromProfile();
  }, []);

  const w = num(weightStr);
  const h = num(heightStr);
  const a = num(ageStr);
  const hasWH = w > 0 && h > 0;
  const hasAll = hasWH && a > 0;

  const vImc = hasWH ? imc(w, h) : 0;
  const cImc = imcCategory(vImc);
  const vImg = hasAll ? img(w, h, a, gender) : 0;
  const cImg = imgCategory(vImg, gender);
  const vBmr = hasAll ? bmr(w, h, a, gender) : 0;
  const vTdee = hasAll ? tdee(vBmr, activity) : 0;
  const ideal = h > 0 ? idealWeight(h, gender) : null;
  const macros = hasAll ? macrosFor(vTdee, goal) : null;
  const vWater = w > 0 ? water(w, exerciseHours) : null;
  const lift = num(liftStr);
  const reps = parseInt(repsStr, 10) || 0;
  const vOne = lift > 0 && reps > 0 ? oneRM(lift, reps) : 0;
  const level = vOne > 0 && w > 0 ? strengthLevel(vOne, w, exercise) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen title={traduire("Calculateurs")} subtitle={traduire("Tes repères santé et force, sourcés")}>
        {/* MESURES */}
        <Enter i={0}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={17} weight="black">
                {traduire("Tes mesures")}</Ink>
              <Press onPress={fillFromProfile} accessibilityRole="button" accessibilityLabel={traduire("Remplir avec mon profil")}>
                <View style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.paper }}>
                  <NIcon name="user" size={16} color={P.accent} />
                  <Ink size={13} weight="extraBold" color={P.accent}>
                    {traduire("Mon profil")}</Ink>
                </View>
              </Press>
            </View>
            <GenderSwitch value={gender} onChange={setGender} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NumField label="Poids" value={weightStr} onChange={setWeightStr} unit="kg" maxLength={5} />
              <NumField label="Taille" value={heightStr} onChange={setHeightStr} unit="cm" integer maxLength={3} />
              <NumField label={traduire("Âge")} value={ageStr} onChange={setAgeStr} unit="ans" integer maxLength={3} />
            </View>
            <Ink size={12} weight="medium" color={P.ink2}>
              {fromProfile ? traduire('Repris de ton profil et de ta dernière pesée. Tu peux tout modifier.') : traduire('Remplis ces trois valeurs : tous les calculateurs se mettent à jour en direct.')}
            </Ink>
          </Card>
        </Enter>

        {/* CORPS */}
        <Enter i={1}>
          <H2>{traduire("Ton corps")}</H2>
        </Enter>
        <Enter i={2}>
          <CalcCard
            icon="scale"
            tone="indigo"
            title={traduire("IMC")}
            sub={traduire("Indice de masse corporelle")}
            value={hasWH ? fmt(vImc) : null}
            badge={hasWH ? { label: cImc.label, tone: cImc.tone } : undefined}
            empty={traduire("Entre ton poids et ta taille")}
            onDetail={() => setDetail('imc')}
          >
            {hasWH ? <ImcScale value={vImc} /> : null}
          </CalcCard>
        </Enter>
        <Enter i={3}>
          <CalcCard
            icon="percent"
            tone="gold"
            title="IMG"
            sub={traduire("Estimation de ta masse grasse")}
            value={hasAll ? fmt(vImg) : null}
            unit="%"
            badge={hasAll ? { label: cImg.label, tone: cImg.tone } : undefined}
            empty={traduire("Entre poids, taille et âge")}
            onDetail={() => setDetail('img')}
          />
        </Enter>
        <Enter i={4}>
          <CalcCard
            icon="target"
            tone="moss"
            title={traduire("Poids de forme")}
            sub={traduire("Fourchette pour un IMC entre 18,5 et 24,9")}
            value={ideal ? traduire("{0} à {1}", fmt(ideal.min), fmt(ideal.max)) : null}
            unit="kg"
            empty={traduire("Entre ta taille")}
            onDetail={() => setDetail('ideal')}
          >
            {ideal && w > 0 ? (
              <Ink size={13} weight="extraBold" color={w > ideal.max ? P.goldDark : w < ideal.min ? P.indigo : P.mossText}>
                {w > ideal.max ? traduire("{0} kg de plus que la fourchette", fmt(w - ideal.max)) : w < ideal.min ? traduire("{0} kg en dessous de la fourchette", fmt(ideal.min - w)) : traduire('Tu es dans la fourchette')}
              </Ink>
            ) : null}
          </CalcCard>
        </Enter>

        {/* ENERGIE */}
        <Enter i={5}>
          <H2>{traduire("Ton énergie")}</H2>
        </Enter>
        <Enter i={6}>
          <CalcCard icon="flame" tone="red" title={traduire("Métabolisme de base")} sub={traduire("Ce que ton corps brûle au repos")} value={hasAll ? Math.round(vBmr).toLocaleString(LOCALE) : null} unit={traduire("kcal par jour")} empty={traduire("Entre poids, taille et âge")} onDetail={() => setDetail('bmr')} />
        </Enter>
        <Enter i={7}>
          <CalcCard icon="pulse" tone="moss" title={traduire("Besoins caloriques")} sub={traduire(ACTIVITY_MULTIPLIERS[activity].label)} value={hasAll ? Math.round(vTdee).toLocaleString(LOCALE) : null} unit={traduire("kcal par jour")} empty={traduire("Entre poids, taille et âge")} onDetail={() => setDetail('tdee')}>
            <HRow>
              {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((k) => (
                <Chip key={k} label={traduire(ACTIVITY_MULTIPLIERS[k].label)} active={activity === k} onPress={() => setActivity(k)} />
              ))}
            </HRow>
            {hasAll ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <MiniTarget label={traduire("Pour perdre")} value={Math.round(vTdee - 500)} color={P.accent} />
                <MiniTarget label={traduire("Pour maintenir")} value={Math.round(vTdee)} color={P.ink} />
                <MiniTarget label={traduire("Pour prendre")} value={Math.round(vTdee + 300)} color={P.goldDark} />
              </View>
            ) : null}
          </CalcCard>
        </Enter>
        <Enter i={8}>
          <CalcCard icon="fork" tone="indigo" title={traduire("Macros")} sub={MACROS_BY_GOAL[goal].note} value={macros ? macros.calories.toLocaleString(LOCALE) : null} unit={traduire("kcal par jour")} empty={traduire("Entre poids, taille et âge")} onDetail={() => setDetail('macros')}>
            <Segments items={(Object.keys(MACROS_BY_GOAL) as CalcGoal[]).map((k) => ({ key: k, label: MACROS_BY_GOAL[k].label }))} value={goal} onChange={setGoal} />
            {macros ? (
              <MacroBars
                compact
                lines={[
                  { key: 'p', label: traduire('Protéines'), grams: macros.protein, percent: macros.percentages.protein, color: SERIES.moss },
                  { key: 'g', label: traduire('Glucides'), grams: macros.carbs, percent: macros.percentages.carbs, color: SERIES.blue },
                  { key: 'l', label: traduire('Lipides'), grams: macros.fat, percent: macros.percentages.fat, color: SERIES.gold },
                ]}
              />
            ) : null}
            {macros && w > 0 ? (
              <Ink size={13} weight="bold" color={P.ink2}>
                {traduire("Soit {0} g de protéines par kilo de poids. Repère conseillé pour un sportif : 1,4 à 2 g.", fmt(macros.protein / w))}
              </Ink>
            ) : null}
          </CalcCard>
        </Enter>
        <Enter i={9}>
          <CalcCard icon="drop" tone="indigo" title={traduire("Eau du jour")} sub={exerciseHours > 0 ? traduire("Avec {0} h d’exercice", fmt(exerciseHours)) : traduire('Au repos')} value={vWater ? fmt(exerciseHours > 0 ? vWater.withExercise : vWater.base) : null} unit="litres" empty={traduire("Entre ton poids")} onDetail={() => setDetail('water')}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {[0, 0.5, 1, 1.5, 2].map((x) => (
                <Chip key={x} label={x === 0 ? traduire('Repos') : `${fmt(x)} h`} active={exerciseHours === x} onPress={() => setExerciseHours(x)} accent={SERIES.blue} />
              ))}
            </View>
          </CalcCard>
        </Enter>

        {/* FORCE */}
        <Enter i={10}>
          <H2>{traduire("Ta force")}</H2>
        </Enter>
        <Enter i={11}>
          <CalcCard icon="dumbbell" tone="red" title={traduire("Charge maximale")} sub={traduire("{0}, estimée sur 1 répétition", EXERCISES[exercise].name)} value={vOne > 0 ? String(vOne) : null} unit="kg" badge={level ? { label: level.label, tone: level.tone === 'muted' ? 'muted' : level.tone } : undefined} empty={traduire("Entre une charge et tes répétitions")} onDetail={() => setDetail('1rm')}>
            <HRow>
              {(Object.keys(EXERCISES) as ExerciseType[]).map((k) => (
                <Chip key={k} label={traduire(EXERCISES[k].name)} active={exercise === k} onPress={() => setExercise(k)} />
              ))}
            </HRow>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <NumField label={traduire("Charge")} value={liftStr} onChange={setLiftStr} unit="kg" maxLength={5} />
              <Ink size={20} weight="black" color={P.ink2}>
                ×
              </Ink>
              <NumField label={traduire("Répétitions")} value={repsStr} onChange={setRepsStr} integer maxLength={2} />
            </View>
            {level && w > 0 ? (
              <Ink size={13} weight="bold" color={P.ink2}>
                {traduire("{0} fois ton poids de corps", fmt(level.ratio, 2))}
              </Ink>
            ) : null}
            {reps > 10 ? <Notice tone="gold" text={traduire("Après 10 répétitions, l’estimation devient moins fiable.")} /> : null}
          </CalcCard>
        </Enter>
        <Enter i={12}>
          <LinkCard icon="heart" tone="red" title={traduire("Zones cardiaques")} sub={traduire("Ta fréquence cardiaque par zone d’effort")} onPress={() => router.push('/heart-zones-settings?mode=repos' as any)} />
        </Enter>

        <Enter i={13}>
          <Ink size={12} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>
            {traduire("Ces calculs sont des estimations pour te repérer. Ils ne remplacent pas l’avis d’un professionnel de santé.")}</Ink>
        </Enter>
      </DetailScreen>

      {/* DETAILS : formules et sources */}
      <BottomSheet visible={detail !== null} onClose={() => setDetail(null)} title={detail ? DETAIL_TITLE[detail] : ''}>
        {detail === 'imc' ? (
          <>
            <Formula lines={[traduire('IMC = poids (kg) / taille (m) au carré')]} />
            <ImcScale value={hasWH ? vImc : null} />
            <Notice tone="indigo" text={traduire("L’IMC ne fait pas la différence entre muscle et graisse : chez un sportif musclé, il surestime souvent la corpulence.")} />
            <SourceRow source={SOURCES.imc} />
          </>
        ) : null}
        {detail === 'img' ? (
          <>
            <Formula lines={[traduire('Homme : 1,20 × IMC + 0,23 × âge − 10,8 − 5,4'), traduire('Femme : 1,20 × IMC + 0,23 × âge − 5,4')]} />
            <Card style={{ paddingVertical: 6 }}>
              <Ink size={13} weight="extraBold" color={P.ink2} style={{ paddingTop: 8 }}>
                {gender === 'male' ? traduire("Plages de référence, homme") : gender === 'neutral' ? traduire('Plages de référence neutres, moyenne homme et femme') : traduire("Plages de référence, femme")}
              </Ink>
              {IMG_RANGES[gender].map((r, i) => (
                <KV key={r.range} label={traduire(r.label)} value={r.range} last={i === IMG_RANGES[gender].length - 1} />
              ))}
            </Card>
            <Notice tone="gold" text={traduire("C’est une estimation à partir de l’IMC. Une mesure par impédancemétrie ou par plis cutanés sera plus précise.")} />
            <SourceRow source={SOURCES.deurenberg} />
          </>
        ) : null}
        {detail === 'bmr' ? (
          <>
            <Formula lines={[traduire('Homme : 10 × poids + 6,25 × taille − 5 × âge + 5'), traduire('Femme : 10 × poids + 6,25 × taille − 5 × âge − 161')]} />
            <SourceRow source={SOURCES.mifflin} />
          </>
        ) : null}
        {detail === 'tdee' ? (
          <>
            <Formula lines={[traduire('Besoins = métabolisme de base × coefficient d’activité')]} />
            <Card style={{ paddingVertical: 6 }}>
              {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((k, i, arr) => (
                <KV key={k} label={`${ACTIVITY_MULTIPLIERS[k].label}, ${ACTIVITY_MULTIPLIERS[k].desc.toLowerCase()}`} value={`× ${String(ACTIVITY_MULTIPLIERS[k].value).replace('.', DECIMAL)}`} strong={k === activity} last={i === arr.length - 1} />
              ))}
            </Card>
            <SourceRow source={SOURCES.mifflin} />
          </>
        ) : null}
        {detail === 'ideal' ? (
          <>
            <Formula lines={[traduire('Fourchette : IMC de 18,5 à 24,9 pour ta taille'), 'Lorentz homme : T − 100 − (T − 150) / 4', 'Lorentz femme : T − 100 − (T − 150) / 2,5', traduire('Devine : 50 (homme) ou 45,5 (femme) + 2,3 × (taille en pouces − 60)')]} />
            {ideal ? (
              <Card style={{ paddingVertical: 6 }}>
                <KV label={traduire("Fourchette santé")} value={traduire("{0} à {1} kg", fmt(ideal.min), fmt(ideal.max))} strong />
                <KV label={traduire("Selon Lorentz")} value={`${fmt(ideal.lorentz)} kg`} />
                <KV label={traduire("Selon Devine")} value={`${fmt(ideal.devine)} kg`} last />
              </Card>
            ) : null}
            <Notice tone="indigo" text={traduire("Pour un combattant, le bon poids dépend aussi de ta catégorie et de ta masse musculaire.")} />
            <SourceRow source={SOURCES.imc} />
            <SourceRow source={SOURCES.lorentz} />
            <SourceRow source={SOURCES.devine} />
          </>
        ) : null}
        {detail === 'macros' ? (
          <>
            <Formula lines={[traduire('Calories = besoins du jour + ajustement de l’objectif'), traduire('Protéines et glucides : 4 kcal par gramme'), traduire('Lipides : 9 kcal par gramme')]} />
            <Card style={{ paddingVertical: 6 }}>
              <Ink size={12} weight="bold" color={P.ink2} style={{ paddingTop: 8 }}>
                {traduire("P pour protéines, G pour glucides, L pour lipides")}</Ink>
              {(Object.keys(MACROS_BY_GOAL) as CalcGoal[]).map((k, i, arr) => (
                <KV key={k} label={traduire(MACROS_BY_GOAL[k].label)} value={`P ${MACROS_BY_GOAL[k].protein} %, G ${MACROS_BY_GOAL[k].carbs} %, L ${MACROS_BY_GOAL[k].fat} %`} strong={k === goal} last={i === arr.length - 1} />
              ))}
            </Card>
            <Notice tone="indigo" text={traduire("Ces pourcentages sont un repère courant, pas une recommandation officielle. Pour les protéines, vise plutôt 1,4 à 2 g par kilo et par jour, selon la source plus bas.")} />
            <SourceRow source={SOURCES.mifflin} />
            <SourceRow source={SOURCES.protein} />
          </>
        ) : null}
        {detail === 'water' ? (
          <>
            <Formula lines={[traduire('Eau = poids (kg) × 0,033 litre'), traduire('Plus 0,5 litre par heure d’exercice intense')]} />
            {vWater ? (
              <Card style={{ paddingVertical: 6 }}>
                <KV label={traduire("Minimum au repos")} value={`${fmt(vWater.base)} L`} />
                <KV label={traduire("Avec ton exercice")} value={`${fmt(vWater.withExercise)} L`} strong last />
              </Card>
            ) : null}
            <Notice tone="indigo" text={traduire("Repère simple et courant, pas une recommandation officielle. Adapte ce repère à ta transpiration et à la chaleur. Pendant l’effort, évite de perdre plus de 2 % de ton poids, selon la source plus bas.")} />
            <SourceRow source={SOURCES.hydration} />
          </>
        ) : null}
        {detail === '1rm' ? (
          <>
            <Formula lines={[traduire('Charge maximale = charge × (1 + répétitions ÷ 30)')]} />
            {vOne > 0 ? (
              <Card style={{ paddingVertical: 6 }}>
                <Ink size={13} weight="extraBold" color={P.ink2} style={{ paddingTop: 8 }}>
                  {traduire("Charges estimées par objectif")}</Ink>
                {repRanges(vOne).map((r, i, arr) => (
                  <KV key={r.reps} label={`${r.label}, ${r.percent} %`} value={`${r.weight} kg`} strong={r.reps === 1} last={i === arr.length - 1} />
                ))}
              </Card>
            ) : null}
            <Card style={{ gap: 10 }}>
              <Ink size={13} weight="extraBold" color={P.ink2}>
                {traduire("Repères indicatifs, {0} (fois ton poids de corps)", EXERCISES[exercise].name.toLowerCase())}
              </Ink>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StdBox label="Débutant" value={EXERCISES[exercise].standards.beginner} color={P.ink2} />
                <StdBox label="Intermédiaire" value={EXERCISES[exercise].standards.intermediate} color={P.indigo} />
                <StdBox label="Avancé" value={EXERCISES[exercise].standards.advanced} color={P.mossText} />
                <StdBox label={traduire("Élite")} value={EXERCISES[exercise].standards.elite} color={P.goldDark} />
              </View>
            </Card>
            <Notice tone="gold" text={traduire("Ne teste pas ta charge maximale seul : prends le temps de bien t’échauffer et garde un pareur.")} />
            <SourceRow source={SOURCES.epley} />
          </>
        ) : null}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const DETAIL_TITLE: Record<CalcId, string> = {
  imc: traduire('Indice de masse corporelle'),
  img: traduire('Indice de masse grasse'),
  bmr: traduire('Métabolisme de base'),
  tdee: traduire('Besoins caloriques'),
  ideal: traduire('Poids de forme'),
  macros: traduire('Répartition des macros'),
  water: traduire('Eau du jour'),
  '1rm': traduire('Charge maximale'),
};

function CalcCard({
  icon,
  tone,
  title,
  sub,
  value,
  unit,
  badge,
  empty,
  onDetail,
  children,
}: {
  icon: NIconName;
  tone: Tone;
  title: string;
  sub: string;
  value: string | null;
  unit?: string;
  badge?: { label: string; tone: Tone };
  empty: string;
  onDetail: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconDot name={icon} tone={tone} />
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={16} weight="black">
            {title}
          </Ink>
          <Ink size={12} weight="bold" color={P.ink2}>
            {sub}
          </Ink>
        </View>
        <Press onPress={onDetail} accessibilityRole="button" accessibilityLabel={traduire("Formule et source : {0}", title)} hitSlop={6}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
            <NIcon name="book" size={18} color={P.ink2} />
          </View>
        </Press>
      </View>
      {value ? (
        <View style={{ gap: 8 }}>
          <BigNumber value={value} unit={unit} size={value.length > 9 ? 40 : 54} />
          {badge ? <Badge label={traduire(badge.label)} tone={badge.tone} /> : null}
        </View>
      ) : (
        <View style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.dashed }}>
          <Ink size={13} weight="bold" color={P.ink2}>
            {empty}
          </Ink>
        </View>
      )}
      {children}
    </Card>
  );
}

function ImcScale({ value }: { value: number | null }) {
  const bands = [
    { from: 15, to: 18.5, color: SERIES.blue, label: traduire('Maigreur'), range: traduire('moins de 18,5') },
    { from: 18.5, to: 25, color: P.moss, label: 'Normal', range: traduire('18,5 à 24,9') },
    { from: 25, to: 30, color: SERIES.gold, label: 'Surpoids', range: traduire('25 à 29,9') },
    { from: 30, to: 40, color: P.danger, label: 'Obésité', range: traduire('30 et plus') },
  ];
  const min = 15;
  const max = 40;
  const pos = value ? Math.max(0, Math.min(1, (value - min) / (max - min))) : null;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: 14 }}>
        <View style={{ flexDirection: 'row', height: 10, marginTop: 2, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
          {bands.map((b) => (
            <View key={b.label} style={{ flex: b.to - b.from, backgroundColor: b.color }} />
          ))}
        </View>
        {pos !== null ? <View style={{ position: 'absolute', left: `${pos * 100}%`, marginLeft: -7, top: -1, width: 14, height: 16, borderRadius: 7, backgroundColor: P.white, borderWidth: 3, borderColor: P.ink }} /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>
        {bands.map((b) => (
          <View key={b.label} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: b.color }} />
            <Ink size={12} weight="extraBold" color={P.ink2} style={{ flexShrink: 1 }}>
              {traduire(b.label)}
              <Ink size={11} weight="medium" color={P.muted}>{`  ${b.range}`}</Ink>
            </Ink>
          </View>
        ))}
      </View>
    </View>
  );
}

function Formula({ lines }: { lines: string[] }) {
  return (
    <View style={{ padding: 14, borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, gap: 4 }}>
      <Ink size={12} weight="extraBold" color={P.ink2}>
        {traduire("Formule")}</Ink>
      {lines.map((l) => (
        <Ink key={l} size={14} weight="bold">
          {l}
        </Ink>
      ))}
    </View>
  );
}

function MiniTarget({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, padding: 10, borderRadius: 16, backgroundColor: P.paper, gap: 2 }}>
      <Ink size={11} weight="bold" color={P.ink2}>
        {label}
      </Ink>
      <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: color, marginBottom: 2 }} />
      <Ink size={17} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value.toLocaleString(LOCALE)}
      </Ink>
    </View>
  );
}

function StdBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', padding: 8, borderRadius: 14, backgroundColor: P.paper, gap: 2 }}>
      <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: color, marginBottom: 2 }} />
      <Ink size={17} weight="black">
        {`${String(value).replace('.', DECIMAL)}`}
      </Ink>
      <Ink size={10} weight="bold" color={P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Ink>
    </View>
  );
}
