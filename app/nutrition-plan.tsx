/**
 * Plan nutritionnel (refonte v2) : objectif calorique en gros chiffre, barres de macros
 * dans la palette validee, niveau d'activite, objectif, profil de macros, detail du calcul,
 * journee type et sources. Pre-rempli avec ton profil et ta derniere pesee.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { Card, Enter, Glass } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { BigNumber, Badge, ChoiceTile, GenderSwitch, H2, HRow, KV, MacroBars, Notice, NumField, P, SERIES, SourcesCard } from '@/components/yoroi/v2/nutrition/ui';
import { loadBodyData } from '@/lib/v2/nutrition/body';
import { num } from '@/lib/v2/nutrition/formulas';
import { ACTIVITY_LEVELS, GOALS, MACRO_PROFILES, SCIENTIFIC_SOURCES, calculateNutritionPlan, getMealCalories } from '@/lib/nutrition';

const weekly = (s: string) => s.replace('.', ',').replace('kg/sem', 'kg par semaine').replace(/^-/, '−');
/** Textes de la bibliotheque rendus lisibles : « 1 à 3 jours par semaine », sans barre oblique */
const pretty = (s: string) =>
  s
    .replace(/(\d)\s*-\s*(\d)/g, '$1 à $2')
    .replace(/\/\s*semaine/g, ' par semaine')
    .replace(/\/\s*jour/g, ' par jour')
    .replace(/\s*\/\s*/g, ' ou ')
    .replace(/\s\+\s/g, ' et ')
    .replace(/\((-|\+)(\d+) kcal\)/g, (_m, sign: string, n: string) => `, ${sign === '-' ? 'moins' : 'plus'} ${n} kcal`);

export default function NutritionPlanScreen() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [activity, setActivity] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [macroProfile, setMacroProfile] = useState('high_protein');

  useEffect(() => {
    loadBodyData().then((b) => {
      if (b.weight) setWeight(String(b.weight).replace('.', ','));
      if (b.height) setHeight(String(b.height));
      if (b.age) setAge(String(b.age));
      setGender(b.gender);
    });
  }, []);

  const w = num(weight) > 0 ? num(weight) : 80;
  const h = num(height) > 0 ? num(height) : 175;
  const a = num(age) > 0 ? Math.round(num(age)) : 30;
  const usingDefaults = !(num(weight) > 0 && num(height) > 0 && num(age) > 0);

  const plan = useMemo(() => calculateNutritionPlan(w, h, a, gender, activity, goal, macroProfile), [w, h, a, gender, activity, goal, macroProfile]);
  const g = GOALS.find((x) => x.id === goal);
  const act = ACTIVITY_LEVELS.find((x) => x.id === activity);
  const mp = MACRO_PROFILES.find((x) => x.id === macroProfile);
  const meals = getMealCalories(plan.goalCalories);
  const maxMeal = Math.max(...meals.map((m) => m.calories), 1);

  const deltaLabel = plan.deficit > 0 ? `Déficit de ${plan.deficit} kcal` : plan.deficit < 0 ? `Surplus de ${Math.abs(plan.deficit)} kcal` : 'Maintien';

  return (
    <PremiumGate source="plan_nutrition" featureTitle="Plan nutritionnel" perks={['Tes calories du jour calculées pour toi', 'Protéines, glucides et lipides répartis', 'Un objectif de perte, de maintien ou de prise']}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <DetailScreen title="Plan nutritionnel" subtitle="Tes besoins du jour, calculés pour toi">
          {/* OBJECTIF CALORIQUE */}
          <Enter i={0}>
            <Glass style={{ gap: 12, paddingVertical: 22 }}>
              <Ink size={14} weight="extraBold" color={P.ink2}>
                Ton objectif par jour
              </Ink>
              <BigNumber value={plan.goalCalories.toLocaleString('fr-FR')} unit="kcal" size={72} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Badge label={deltaLabel} tone={plan.deficit > 0 ? 'red' : plan.deficit < 0 ? 'moss' : 'indigo'} />
                {g ? <Badge label={weekly(g.weeklyChange)} tone="ink" /> : null}
              </View>
              <View style={{ height: 1, backgroundColor: P.line2, marginVertical: 4 }} />
              <MacroBars
                lines={[
                  { key: 'p', label: 'Protéines', grams: plan.macros.protein.grams, percent: plan.macros.protein.percentage, color: SERIES.moss },
                  { key: 'g', label: 'Glucides', grams: plan.macros.carbs.grams, percent: plan.macros.carbs.percentage, color: SERIES.blue },
                  { key: 'l', label: 'Lipides', grams: plan.macros.fat.grams, percent: plan.macros.fat.percentage, color: SERIES.gold },
                ]}
              />
            </Glass>
          </Enter>

          {g?.warning ? (
            <Enter i={1}>
              <Notice tone="danger" title="À ne pas tenir longtemps" text={`${pretty(g.warning)}. Une perte trop rapide coûte du muscle, de la force et de la performance. Parles-en à un professionnel de santé.`} />
            </Enter>
          ) : null}

          {/* TES MESURES */}
          <Enter i={2}>
            <H2 sub={usingDefaults ? 'Complète ce qui manque pour un calcul juste' : 'Repris de ton profil et de ta dernière pesée'}>Tes mesures</H2>
            <View style={{ gap: 10, marginTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <NumField label="Poids" value={weight} onChange={setWeight} unit="kg" placeholder="80" />
                <NumField label="Taille" value={height} onChange={setHeight} unit="cm" placeholder="175" integer />
                <NumField label="Âge" value={age} onChange={setAge} unit="ans" placeholder="30" integer maxLength={3} />
              </View>
              <GenderSwitch value={gender} onChange={setGender} />
            </View>
          </Enter>

          {/* OBJECTIF */}
          <Enter i={3}>
            <H2 sub="Une perte de 0,25 à 0,5 kg par semaine se tient sur la durée">Ton objectif</H2>
            <View style={{ marginTop: 10 }}>
              <HRow>
                {GOALS.map((x) => (
                  <ChoiceTile key={x.id} title={x.name} sub={weekly(x.weeklyChange)} active={goal === x.id} warn={!!x.warning} onPress={() => setGoal(x.id)} style={{ width: 150 }} />
                ))}
              </HRow>
            </View>
          </Enter>

          {/* ACTIVITE */}
          <Enter i={4}>
            <H2>Ton niveau d’activité</H2>
            <View style={{ gap: 8, marginTop: 10 }}>
              {ACTIVITY_LEVELS.map((l) => (
                <ChoiceTile key={l.id} title={l.name} sub={pretty(l.description)} extra={pretty(l.examples)} active={activity === l.id} onPress={() => setActivity(l.id)} />
              ))}
            </View>
          </Enter>

          {/* PROFIL MACROS */}
          <Enter i={5}>
            <H2>Répartition des macros</H2>
            <View style={{ marginTop: 10 }}>
              <HRow>
                {MACRO_PROFILES.map((m) => (
                  <ChoiceTile
                    key={m.id}
                    title={m.name}
                    sub={`Protéines ${Math.round(m.protein * 100)} %, glucides ${Math.round(m.carbs * 100)} %, lipides ${Math.round(m.fat * 100)} %`}
                    extra={pretty(m.description)}
                    warn={!!m.warning}
                    active={macroProfile === m.id}
                    onPress={() => setMacroProfile(m.id)}
                    style={{ width: 176 }}
                  />
                ))}
              </HRow>
            </View>
            {mp?.warning ? <Notice tone="gold" text={pretty(mp.warning)} style={{ marginTop: 10 }} /> : null}
            {mp?.source ? (
              <Ink size={12} weight="medium" color={P.ink2} style={{ marginTop: 8, paddingHorizontal: 4 }}>
                {`Repère : ${mp.source.replace(/\s+-\s+/g, ', ')}`}
              </Ink>
            ) : null}
          </Enter>

          {/* PROTEINES */}
          <Enter i={6}>
            <Card style={{ gap: 6 }}>
              <Ink size={14} weight="extraBold" color={P.ink2}>
                Protéines recommandées
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: SERIES.moss }} />
                <BigNumber value={`${plan.proteinRec.min} à ${plan.proteinRec.max}`} unit="g par jour" size={36} />
              </View>
              <Ink size={13} weight="bold" color={P.ink2}>
                {`Idéal : ${plan.proteinRec.optimal} g, soit ${(plan.proteinRec.optimal / w).toFixed(1).replace('.', ',')} g par kg`}
              </Ink>
              <Ink size={12} weight="medium" color={P.ink2}>
                Source : position officielle de la Société internationale de nutrition sportive sur les protéines, 2017, en anglais
              </Ink>
            </Card>
          </Enter>

          {/* DETAIL DU CALCUL */}
          <Enter i={7}>
            <H2 sub="Formule Mifflin-St Jeor (1990)">Le détail du calcul</H2>
            <Card style={{ marginTop: 10, paddingVertical: 6 }}>
              <KV label="Métabolisme de base" value={`${plan.bmr} kcal`} />
              <KV label={`Activité : ${act?.name ?? ''}`} value={`× ${String(act?.multiplier ?? '').replace('.', ',')}`} />
              <KV label="Dépense du jour" value={`${plan.tdee} kcal`} />
              <KV
                label={`${plan.deficit > 0 ? 'Déficit' : plan.deficit < 0 ? 'Surplus' : 'Ajustement'} (${g?.name ?? ''})`}
                value={`${plan.deficit > 0 ? 'moins ' : plan.deficit < 0 ? 'plus ' : ''}${Math.abs(plan.deficit)} kcal`}
                              />
              <KV label="Objectif final" value={`${plan.goalCalories} kcal`} strong last />
            </Card>
          </Enter>

          {/* JOURNEE TYPE */}
          <Enter i={8}>
            <H2>Une journée type</H2>
            <Card style={{ marginTop: 10, gap: 14 }}>
              {meals.map((m, i) => (
                <View key={m.name} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 50, alignItems: 'center' }}>
                    <Ink size={13} weight="black">
                      {m.time}
                    </Ink>
                    {i < meals.length - 1 ? <View style={{ flex: 1, width: 3, borderRadius: 2, backgroundColor: P.line, marginTop: 6 }} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: 4, paddingBottom: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Ink size={15} weight="extraBold">
                        {m.name}
                      </Ink>
                      <Ink size={15} weight="black" tight>
                        {`${m.calories} kcal`}
                      </Ink>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: P.line, overflow: 'hidden' }}>
                      <View style={{ width: `${(m.calories / maxMeal) * 100}%`, height: '100%', backgroundColor: P.ink, borderRadius: 3 }} />
                    </View>
                    <Ink size={12} weight="medium" color={P.ink2}>
                      {m.example}
                    </Ink>
                  </View>
                </View>
              ))}
            </Card>
          </Enter>

          {/* SOURCES */}
          <Enter i={9}>
            <H2>Sources scientifiques</H2>
            <View style={{ marginTop: 10 }}>
              <SourcesCard
                sources={Object.values(SCIENTIFIC_SOURCES).map((s) => ({ label: s.name === 'ISSN Position Stand on Protein' ? 'Position officielle de l’ISSN sur les protéines' : s.name === 'ANSES Apports Nutritionnels' ? 'ANSES, apports nutritionnels' : s.name, ref: s.source, url: s.url }))}
                note="Ces chiffres sont des estimations. Ajuste après deux à trois semaines selon ta balance et ton énergie."
              />
            </View>
          </Enter>
        </DetailScreen>
      </KeyboardAvoidingView>
    </PremiumGate>
  );
}
