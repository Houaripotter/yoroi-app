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
      <DetailScreen title="Calculateurs" subtitle="Tes repères santé et force, sourcés">
        {/* MESURES */}
        <Enter i={0}>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={17} weight="black">
                Tes mesures
              </Ink>
              <Press onPress={fillFromProfile} accessibilityRole="button" accessibilityLabel="Remplir avec mon profil">
                <View style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: P.paper }}>
                  <NIcon name="user" size={16} color={P.accent} />
                  <Ink size={13} weight="extraBold" color={P.accent}>
                    Mon profil
                  </Ink>
                </View>
              </Press>
            </View>
            <GenderSwitch value={gender} onChange={setGender} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <NumField label="Poids" value={weightStr} onChange={setWeightStr} unit="kg" maxLength={5} />
              <NumField label="Taille" value={heightStr} onChange={setHeightStr} unit="cm" integer maxLength={3} />
              <NumField label="Âge" value={ageStr} onChange={setAgeStr} unit="ans" integer maxLength={3} />
            </View>
            <Ink size={12} weight="medium" color={P.ink2}>
              {fromProfile ? 'Repris de ton profil et de ta dernière pesée. Tu peux tout modifier.' : 'Remplis ces trois valeurs : tous les calculateurs se mettent à jour en direct.'}
            </Ink>
          </Card>
        </Enter>

        {/* CORPS */}
        <Enter i={1}>
          <H2>Ton corps</H2>
        </Enter>
        <Enter i={2}>
          <CalcCard
            icon="scale"
            tone="indigo"
            title="IMC"
            sub="Indice de masse corporelle"
            value={hasWH ? fmt(vImc) : null}
            badge={hasWH ? { label: cImc.label, tone: cImc.tone } : undefined}
            empty="Entre ton poids et ta taille"
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
            sub="Estimation de ta masse grasse"
            value={hasAll ? fmt(vImg) : null}
            unit="%"
            badge={hasAll ? { label: cImg.label, tone: cImg.tone } : undefined}
            empty="Entre poids, taille et âge"
            onDetail={() => setDetail('img')}
          />
        </Enter>
        <Enter i={4}>
          <CalcCard
            icon="target"
            tone="moss"
            title="Poids de forme"
            sub="Fourchette pour un IMC entre 18,5 et 24,9"
            value={ideal ? `${fmt(ideal.min)} à ${fmt(ideal.max)}` : null}
            unit="kg"
            empty="Entre ta taille"
            onDetail={() => setDetail('ideal')}
          >
            {ideal && w > 0 ? (
              <Ink size={13} weight="extraBold" color={w > ideal.max ? P.goldDark : w < ideal.min ? P.indigo : P.mossText}>
                {w > ideal.max ? `${fmt(w - ideal.max)} kg au-dessus de la fourchette` : w < ideal.min ? `${fmt(ideal.min - w)} kg en dessous de la fourchette` : 'Tu es dans la fourchette'}
              </Ink>
            ) : null}
          </CalcCard>
        </Enter>

        {/* ENERGIE */}
        <Enter i={5}>
          <H2>Ton énergie</H2>
        </Enter>
        <Enter i={6}>
          <CalcCard icon="flame" tone="red" title="Métabolisme de base" sub="Ce que ton corps brûle au repos" value={hasAll ? Math.round(vBmr).toLocaleString('fr-FR') : null} unit="kcal par jour" empty="Entre poids, taille et âge" onDetail={() => setDetail('bmr')} />
        </Enter>
        <Enter i={7}>
          <CalcCard icon="pulse" tone="moss" title="Besoins caloriques" sub={ACTIVITY_MULTIPLIERS[activity].label} value={hasAll ? Math.round(vTdee).toLocaleString('fr-FR') : null} unit="kcal par jour" empty="Entre poids, taille et âge" onDetail={() => setDetail('tdee')}>
            <HRow>
              {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((k) => (
                <Chip key={k} label={ACTIVITY_MULTIPLIERS[k].label} active={activity === k} onPress={() => setActivity(k)} />
              ))}
            </HRow>
            {hasAll ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <MiniTarget label="Pour perdre" value={Math.round(vTdee - 500)} color={P.accent} />
                <MiniTarget label="Pour maintenir" value={Math.round(vTdee)} color={P.ink} />
                <MiniTarget label="Pour prendre" value={Math.round(vTdee + 300)} color={P.goldDark} />
              </View>
            ) : null}
          </CalcCard>
        </Enter>
        <Enter i={8}>
          <CalcCard icon="fork" tone="indigo" title="Macros" sub={MACROS_BY_GOAL[goal].note} value={macros ? macros.calories.toLocaleString('fr-FR') : null} unit="kcal par jour" empty="Entre poids, taille et âge" onDetail={() => setDetail('macros')}>
            <Segments items={(Object.keys(MACROS_BY_GOAL) as CalcGoal[]).map((k) => ({ key: k, label: MACROS_BY_GOAL[k].label }))} value={goal} onChange={setGoal} />
            {macros ? (
              <MacroBars
                compact
                lines={[
                  { key: 'p', label: 'Protéines', grams: macros.protein, percent: macros.percentages.protein, color: SERIES.moss },
                  { key: 'g', label: 'Glucides', grams: macros.carbs, percent: macros.percentages.carbs, color: SERIES.blue },
                  { key: 'l', label: 'Lipides', grams: macros.fat, percent: macros.percentages.fat, color: SERIES.gold },
                ]}
              />
            ) : null}
          </CalcCard>
        </Enter>
        <Enter i={9}>
          <CalcCard icon="drop" tone="indigo" title="Eau du jour" sub={exerciseHours > 0 ? `Avec ${fmt(exerciseHours)} h d’exercice` : 'Au repos'} value={vWater ? fmt(exerciseHours > 0 ? vWater.withExercise : vWater.base) : null} unit="litres" empty="Entre ton poids" onDetail={() => setDetail('water')}>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {[0, 0.5, 1, 1.5, 2].map((x) => (
                <Chip key={x} label={x === 0 ? 'Repos' : `${fmt(x)} h`} active={exerciseHours === x} onPress={() => setExerciseHours(x)} accent={SERIES.blue} />
              ))}
            </View>
          </CalcCard>
        </Enter>

        {/* FORCE */}
        <Enter i={10}>
          <H2>Ta force</H2>
        </Enter>
        <Enter i={11}>
          <CalcCard icon="dumbbell" tone="red" title="Charge maximale" sub={`${EXERCISES[exercise].name}, estimée sur 1 répétition`} value={vOne > 0 ? String(vOne) : null} unit="kg" badge={level ? { label: level.label, tone: level.tone === 'muted' ? 'muted' : level.tone } : undefined} empty="Entre une charge et tes répétitions" onDetail={() => setDetail('1rm')}>
            <HRow>
              {(Object.keys(EXERCISES) as ExerciseType[]).map((k) => (
                <Chip key={k} label={EXERCISES[k].name} active={exercise === k} onPress={() => setExercise(k)} />
              ))}
            </HRow>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <NumField label="Charge" value={liftStr} onChange={setLiftStr} unit="kg" maxLength={5} />
              <Ink size={20} weight="black" color={P.ink2}>
                ×
              </Ink>
              <NumField label="Répétitions" value={repsStr} onChange={setRepsStr} integer maxLength={2} />
            </View>
            {level && w > 0 ? (
              <Ink size={13} weight="bold" color={P.ink2}>
                {`${fmt(level.ratio, 2)} fois ton poids de corps`}
              </Ink>
            ) : null}
            {reps > 12 ? <Notice tone="gold" text="Au-delà de 10 à 12 répétitions, l’estimation devient moins fiable." /> : null}
          </CalcCard>
        </Enter>
        <Enter i={12}>
          <LinkCard icon="heart" tone="red" title="Zones cardiaques" sub="Ta fréquence cardiaque par zone d’effort" onPress={() => router.push('/heart-zones-settings?mode=repos' as any)} />
        </Enter>

        <Enter i={13}>
          <Ink size={12} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>
            Ces calculs sont des estimations pour te repérer. Ils ne remplacent pas l’avis d’un professionnel de santé.
          </Ink>
        </Enter>
      </DetailScreen>

      {/* DETAILS : formules et sources */}
      <BottomSheet visible={detail !== null} onClose={() => setDetail(null)} title={detail ? DETAIL_TITLE[detail] : ''}>
        {detail === 'imc' ? (
          <>
            <Formula lines={['IMC = poids (kg) / taille (m) au carré']} />
            <ImcScale value={hasWH ? vImc : null} />
            <Notice tone="indigo" text="L’IMC ne fait pas la différence entre muscle et graisse : chez un sportif musclé, il surestime souvent la corpulence." />
            <SourceRow source={SOURCES.imc} />
          </>
        ) : null}
        {detail === 'img' ? (
          <>
            <Formula lines={['Homme : 1,20 × IMC + 0,23 × âge − 10,8 − 5,4', 'Femme : 1,20 × IMC + 0,23 × âge − 5,4']} />
            <Card style={{ paddingVertical: 6 }}>
              <Ink size={13} weight="extraBold" color={P.ink2} style={{ paddingTop: 8 }}>
                {`Plages de référence, ${gender === 'male' ? 'homme' : 'femme'}`}
              </Ink>
              {IMG_RANGES[gender].map((r, i) => (
                <KV key={r.range} label={r.label} value={r.range} last={i === IMG_RANGES[gender].length - 1} />
              ))}
            </Card>
            <Notice tone="gold" text="C’est une estimation à partir de l’IMC. Une mesure par impédancemétrie ou par plis cutanés sera plus précise." />
            <SourceRow source={SOURCES.deurenberg} />
          </>
        ) : null}
        {detail === 'bmr' ? (
          <>
            <Formula lines={['Homme : 10 × poids + 6,25 × taille − 5 × âge + 5', 'Femme : 10 × poids + 6,25 × taille − 5 × âge − 161']} />
            <SourceRow source={SOURCES.mifflin} />
          </>
        ) : null}
        {detail === 'tdee' ? (
          <>
            <Formula lines={['Besoins = métabolisme de base × coefficient d’activité']} />
            <Card style={{ paddingVertical: 6 }}>
              {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((k, i, arr) => (
                <KV key={k} label={`${ACTIVITY_MULTIPLIERS[k].label}, ${ACTIVITY_MULTIPLIERS[k].desc.toLowerCase()}`} value={`× ${String(ACTIVITY_MULTIPLIERS[k].value).replace('.', ',')}`} strong={k === activity} last={i === arr.length - 1} />
              ))}
            </Card>
            <SourceRow source={SOURCES.mifflin} />
          </>
        ) : null}
        {detail === 'ideal' ? (
          <>
            <Formula lines={['Fourchette : IMC de 18,5 à 24,9 pour ta taille', 'Lorentz homme : T − 100 − (T − 150) / 4', 'Lorentz femme : T − 100 − (T − 150) / 2,5', 'Devine : 50 (homme) ou 45,5 (femme) + 2,3 × (taille en pouces − 60)']} />
            {ideal ? (
              <Card style={{ paddingVertical: 6 }}>
                <KV label="Fourchette santé" value={`${fmt(ideal.min)} à ${fmt(ideal.max)} kg`} strong />
                <KV label="Selon Lorentz" value={`${fmt(ideal.lorentz)} kg`} />
                <KV label="Selon Devine" value={`${fmt(ideal.devine)} kg`} last />
              </Card>
            ) : null}
            <Notice tone="indigo" text="Pour un combattant, le bon poids dépend aussi de ta catégorie et de ta masse musculaire." />
            <SourceRow source={SOURCES.imc} />
            <SourceRow source={SOURCES.lorentz} />
            <SourceRow source={SOURCES.devine} />
          </>
        ) : null}
        {detail === 'macros' ? (
          <>
            <Formula lines={['Calories = besoins du jour + ajustement de l’objectif', 'Protéines et glucides : 4 kcal par gramme', 'Lipides : 9 kcal par gramme']} />
            <Card style={{ paddingVertical: 6 }}>
              <Ink size={12} weight="bold" color={P.ink2} style={{ paddingTop: 8 }}>
                P pour protéines, G pour glucides, L pour lipides
              </Ink>
              {(Object.keys(MACROS_BY_GOAL) as CalcGoal[]).map((k, i, arr) => (
                <KV key={k} label={MACROS_BY_GOAL[k].label} value={`P ${MACROS_BY_GOAL[k].protein} %, G ${MACROS_BY_GOAL[k].carbs} %, L ${MACROS_BY_GOAL[k].fat} %`} strong={k === goal} last={i === arr.length - 1} />
              ))}
            </Card>
            <SourceRow source={SOURCES.mifflin} />
            <SourceRow source={SOURCES.protein} />
          </>
        ) : null}
        {detail === 'water' ? (
          <>
            <Formula lines={['Eau = poids (kg) × 0,033 litre', 'Plus 0,5 litre par heure d’exercice intense']} />
            {vWater ? (
              <Card style={{ paddingVertical: 6 }}>
                <KV label="Minimum au repos" value={`${fmt(vWater.base)} L`} />
                <KV label="Avec ton exercice" value={`${fmt(vWater.withExercise)} L`} strong last />
              </Card>
            ) : null}
            <Notice tone="indigo" text="Repère usuel. Bois davantage s’il fait chaud ou si tu transpires beaucoup." />
            <SourceRow source={SOURCES.hydration} />
          </>
        ) : null}
        {detail === '1rm' ? (
          <>
            <Formula lines={['Charge maximale = charge × (1 + répétitions ÷ 30)']} />
            {vOne > 0 ? (
              <Card style={{ paddingVertical: 6 }}>
                <Ink size={13} weight="extraBold" color={P.ink2} style={{ paddingTop: 8 }}>
                  Charges estimées par objectif
                </Ink>
                {repRanges(vOne).map((r, i, arr) => (
                  <KV key={r.reps} label={`${r.label}, ${r.percent} %`} value={`${r.weight} kg`} strong={r.reps === 1} last={i === arr.length - 1} />
                ))}
              </Card>
            ) : null}
            <Card style={{ gap: 10 }}>
              <Ink size={13} weight="extraBold" color={P.ink2}>
                {`Repères indicatifs, ${EXERCISES[exercise].name.toLowerCase()} (fois ton poids de corps)`}
              </Ink>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StdBox label="Débutant" value={EXERCISES[exercise].standards.beginner} color={P.ink2} />
                <StdBox label="Intermédiaire" value={EXERCISES[exercise].standards.intermediate} color={P.indigo} />
                <StdBox label="Avancé" value={EXERCISES[exercise].standards.advanced} color={P.mossText} />
                <StdBox label="Élite" value={EXERCISES[exercise].standards.elite} color={P.goldDark} />
              </View>
            </Card>
            <Notice tone="gold" text="Ne teste pas ta charge maximale seul : échauffe-toi bien et garde un pareur." />
            <SourceRow source={SOURCES.epley} />
          </>
        ) : null}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const DETAIL_TITLE: Record<CalcId, string> = {
  imc: 'Indice de masse corporelle',
  img: 'Indice de masse grasse',
  bmr: 'Métabolisme de base',
  tdee: 'Besoins caloriques',
  ideal: 'Poids de forme',
  macros: 'Répartition des macros',
  water: 'Eau du jour',
  '1rm': 'Charge maximale',
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
        <Press onPress={onDetail} accessibilityRole="button" accessibilityLabel={`Formule et source : ${title}`} hitSlop={6}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
            <NIcon name="book" size={18} color={P.ink2} />
          </View>
        </Press>
      </View>
      {value ? (
        <View style={{ gap: 8 }}>
          <BigNumber value={value} unit={unit} size={value.length > 9 ? 40 : 54} />
          {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
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
    { from: 15, to: 18.5, color: SERIES.blue, label: 'Maigreur', range: 'moins de 18,5' },
    { from: 18.5, to: 25, color: P.moss, label: 'Normal', range: '18,5 à 24,9' },
    { from: 25, to: 30, color: SERIES.gold, label: 'Surpoids', range: '25 à 29,9' },
    { from: 30, to: 40, color: P.danger, label: 'Obésité', range: '30 et plus' },
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
              {b.label}
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
        Formule
      </Ink>
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
        {value.toLocaleString('fr-FR')}
      </Ink>
    </View>
  );
}

function StdBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', padding: 8, borderRadius: 14, backgroundColor: P.paper, gap: 2 }}>
      <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: color, marginBottom: 2 }} />
      <Ink size={17} weight="black">
        {`${String(value).replace('.', ',')}`}
      </Ink>
      <Ink size={10} weight="bold" color={P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Ink>
    </View>
  );
}
