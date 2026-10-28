/**
 * Nutrition rapide (refonte v2) : besoins du jour (proteines, glucides, eau, calories)
 * et repas conseilles selon le moment (avant, apres l'entrainement, jour de combat, repos).
 * Calculs sources, pre-remplis avec ta derniere pesee et ta taille.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Enter, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { BigNumber, Bullet, H2, IconDot, NIcon, Notice, NumField, P, SERIES, Segments, SourcesCard, toneColor } from '@/components/yoroi/v2/nutrition/ui';
import type { NIconName, Tone } from '@/components/yoroi/v2/nutrition/ui';
import { loadBodyData } from '@/lib/v2/nutrition/body';
import { QUICK_ACTIVITY, SOURCES, num, quickNeeds } from '@/lib/v2/nutrition/formulas';
import type { QuickActivity } from '@/lib/v2/nutrition/formulas';
import { getAllMeasurements, getUserSettings } from '@/lib/storage';
import { logger } from '@/lib/security/logger';
import { traduire, DECIMAL, LOCALE } from '@/lib/i18n/tr';

type PhaseId = 'pre_training' | 'post_training' | 'fight_day' | 'recovery';
type Meal = { timing: string; title: string; foods: string[]; macros: { protein: number; carbs: number; fat: number }; tips: string[] };
type Phase = { id: PhaseId; name: string; icon: NIconName; tone: Tone; description: string; meals: Meal[] };

const PHASES: Phase[] = [
  {
    id: 'pre_training',
    name: 'Avant l’entraînement',
    icon: 'bolt',
    tone: 'gold',
    description: traduire('Optimise ton énergie avant la séance'),
    meals: [
      { timing: traduire('3 à 4 h avant'), title: traduire('Repas complet'), foods: [traduire('Riz ou pâtes'), traduire('Poulet ou poisson'), traduire('Légumes'), 'Huile d’olive'], macros: { protein: 30, carbs: 80, fat: 15 }, tips: [traduire('Évite les fibres lourdes'), traduire('Bois bien')] },
      { timing: traduire('1 à 2 h avant'), title: traduire('Collation légère'), foods: ['Banane', traduire('Barre de céréales'), traduire('Pain et miel')], macros: { protein: 5, carbs: 40, fat: 5 }, tips: [traduire('Glucides rapides'), traduire('Facile à digérer')] },
      { timing: traduire('30 min avant'), title: traduire('Coup de pouce'), foods: ['Datte', traduire('Gel énergétique'), 'Boisson isotonique'], macros: { protein: 0, carbs: 25, fat: 0 }, tips: [traduire('Optionnel si tu as mangé récemment'), traduire('Pour les séances intenses')] },
    ],
  },
  {
    id: 'post_training',
    name: 'Après l’entraînement',
    icon: 'dumbbell',
    tone: 'moss',
    description: traduire('Récupère mieux'),
    meals: [
      { timing: traduire('0 à 30 min après'), title: traduire('Premier apport'), foods: [traduire('Protéine en poudre'), 'Banane', 'Lait'], macros: { protein: 30, carbs: 40, fat: 5 }, tips: [traduire('Protéines rapides'), traduire('Glucides pour recharger')] },
      { timing: traduire('1 à 2 h après'), title: traduire('Repas de récupération'), foods: [traduire('Poulet ou saumon'), traduire('Riz ou patate douce'), traduire('Légumes verts'), 'Avocat'], macros: { protein: 40, carbs: 60, fat: 20 }, tips: [traduire('Protéines de qualité'), traduire('Glucides complexes'), 'Graisses saines'] },
    ],
  },
  {
    id: 'fight_day',
    name: 'Jour de combat',
    icon: 'swords',
    tone: 'red',
    description: traduire('Ton protocole du jour J'),
    meals: [
      { timing: traduire('Après la pesée'), title: traduire('Réhydratation'), foods: [traduire('Eau et électrolytes'), 'Boisson isotonique', traduire('Jus de raisin dilué')], macros: { protein: 0, carbs: 30, fat: 0 }, tips: [traduire('Petites gorgées'), traduire('Ne bois pas trop vite')] },
      { timing: traduire('4 à 5 h avant le combat'), title: traduire('Repas principal'), foods: [traduire('Pâtes ou riz blanc'), traduire('Poulet grillé'), traduire('Peu de légumes'), 'Miel'], macros: { protein: 25, carbs: 100, fat: 10 }, tips: [traduire('Glucides simples'), traduire('Évite fibres et gras'), traduire('Un repas que tu connais')] },
      { timing: traduire('2 h avant le combat'), title: traduire('Collation légère'), foods: [traduire('Pain blanc et confiture'), 'Banane', traduire('Barre énergétique')], macros: { protein: 5, carbs: 50, fat: 5 }, tips: ['Digestion rapide', traduire('Ce que tu connais')] },
      { timing: traduire('30 min avant'), title: traduire('Dernier coup de pouce'), foods: [traduire('Gel ou datte'), traduire('Café (optionnel)'), traduire('Quelques gorgées d’eau')], macros: { protein: 0, carbs: 25, fat: 0 }, tips: [traduire('Énergie immédiate'), traduire('Aucune nouveauté')] },
    ],
  },
  {
    id: 'recovery',
    name: traduire('Jour de repos'),
    icon: 'moon',
    tone: 'indigo',
    description: traduire('Laisse ton corps se réparer'),
    meals: [
      { timing: traduire('Petit déjeuner'), title: traduire('Riche en protéines'), foods: [traduire('Œufs'), 'Avocat', 'Pain complet', 'Fruits'], macros: { protein: 30, carbs: 40, fat: 25 }, tips: [traduire('Protéines pour réparer'), traduire('Bonnes graisses')] },
      { timing: traduire('Déjeuner'), title: traduire('Repas équilibré'), foods: [traduire('Saumon ou poulet'), traduire('Quinoa ou riz complet'), traduire('Légumes'), 'Huile d’olive'], macros: { protein: 40, carbs: 50, fat: 20 }, tips: [traduire('Oméga 3'), traduire('Glucides complexes')] },
      { timing: traduire('Dîner'), title: traduire('Repas léger'), foods: ['Poisson blanc', traduire('Légumes vapeur'), 'Riz', 'Yaourt grec'], macros: { protein: 35, carbs: 40, fat: 10 }, tips: ['Digestion facile', traduire('Caséine pour la nuit')] },
    ],
  },
];

const TIPS = [traduire('Bois environ 35 ml par kg de poids'), traduire('Mange ce que tu connais avant un combat'), traduire('Évite les aliments nouveaux le jour J'), traduire('Des protéines à chaque repas pour récupérer')];

export default function QuickNutritionScreen() {
  const [phaseId, setPhaseId] = useState<PhaseId>('pre_training');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [activity, setActivity] = useState<QuickActivity>('moderate');

  useEffect(() => {
    (async () => {
      try {
        const b = await loadBodyData();
        let w = b.weight;
        let h = b.height;
        if (!w || !h) {
          const [settings, measures] = await Promise.all([getUserSettings(), getAllMeasurements()]);
          if (!h && settings?.height) h = Number(settings.height);
          if (!w && measures.length > 0 && measures[0].weight) w = measures[0].weight;
        }
        if (w) setWeight(String(w));
        if (h) setHeight(String(h));
        if (b.age) setAge(b.age);
      } catch (err) {
        logger.error('Nutrition rapide : lecture des données impossible', err);
      }
    })();
  }, []);

  const needs = useMemo(() => quickNeeds(num(weight), num(height), activity, age ?? 30), [weight, height, activity, age]);
  const phase = PHASES.find((p) => p.id === phaseId) ?? PHASES[0];
  const pc = toneColor(phase.tone);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen title={traduire("Repas du jour")} subtitle={traduire("Quoi manger, et quand")}>
        {/* MOMENT */}
        <Enter i={0}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PHASES.map((p) => {
              const on = p.id === phaseId;
              const c = toneColor(p.tone);
              return (
                <View key={p.id} style={{ width: '48.4%' }}>
                  <Press onPress={() => setPhaseId(p.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={traduire(p.name)}>
                    <View style={{ minHeight: 92, borderRadius: 22, padding: 14, gap: 10, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.fg : c.soft }}>
                        <NIcon name={p.icon} size={18} color={on ? P.white : c.fg} />
                      </View>
                      <Ink size={15} weight="extraBold" color={on ? P.white : P.ink}>
                        {traduire(p.name)}
                      </Ink>
                    </View>
                  </Press>
                </View>
              );
            })}
          </View>
        </Enter>

        {/* REPAS DU MOMENT */}
        <Enter i={1}>
          <H2 sub={traduire(phase.description)}>{traduire(phase.name)}</H2>
          <View style={{ gap: 10, marginTop: 10 }}>
            {phase.meals.map((m) => {
              const kcal = m.macros.protein * 4 + m.macros.carbs * 4 + m.macros.fat * 9;
              return (
                <Card key={m.timing} style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: pc.soft, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <NIcon name="clock" size={14} color={pc.fg} />
                      <Ink size={12} weight="extraBold" color={pc.fg}>
                        {m.timing}
                      </Ink>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Ink size={20} weight="black" tight>
                      {kcal}
                      <Ink size={12} weight="bold" color={P.ink2}>
                        {' kcal'}
                      </Ink>
                    </Ink>
                  </View>
                  <Ink size={18} weight="black" tight>
                    {traduire(m.title)}
                  </Ink>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {m.foods.map((f) => (
                      <View key={f} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: P.paper }}>
                        <Ink size={13} weight="bold">
                          {f}
                        </Ink>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <MacroPill label={traduire("Protéines")} value={m.macros.protein} color={SERIES.moss} />
                    <MacroPill label={traduire("Glucides")} value={m.macros.carbs} color={SERIES.blue} />
                    <MacroPill label={traduire("Lipides")} value={m.macros.fat} color={SERIES.gold} />
                  </View>
                  <View style={{ gap: 4 }}>
                    {m.tips.map((t) => (
                      <Bullet key={t} color={pc.fg}>
                        {t}
                      </Bullet>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        </Enter>

        {phaseId === 'fight_day' ? (
          <Enter i={2}>
            <Notice tone="danger" title={traduire("Après une coupe de poids")} text={traduire("Bois de nouveau, petit à petit. Si tu as des vertiges, des crampes ou une confusion, préviens le staff médical.")} />
          </Enter>
        ) : null}

        {/* TES BESOINS */}
        <Enter i={3}>
          <H2 sub={traduire("Repris de ta dernière pesée, modifiable")}>{traduire("Tes besoins du jour")}</H2>
          <View style={{ gap: 10, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <NumField label="Poids" value={weight} onChange={setWeight} unit="kg" placeholder="75" maxLength={5} />
              <NumField label="Taille" value={height} onChange={setHeight} unit="cm" placeholder="175" integer maxLength={3} />
            </View>
            <Segments items={(Object.keys(QUICK_ACTIVITY) as QuickActivity[]).map((k) => ({ key: k, label: QUICK_ACTIVITY[k].label }))} value={activity} onChange={setActivity} />
          </View>
        </Enter>

        <Enter i={4}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <NeedCard icon="leaf" tone="red" title={traduire("Protéines")} value={traduire("{0} à {1}", needs.protein.min, needs.protein.max)} unit="g" sub={traduire("1,6 à 2,2 g par kg")} />
            <NeedCard icon="bolt" tone="indigo" title={traduire("Glucides")} value={traduire("{0} à {1}", needs.carbs.min, needs.carbs.max)} unit="g" sub={traduire("{0} g par kg, {1}", needs.carbs.perKg, QUICK_ACTIVITY[activity].phrase)} />
            <NeedCard icon="drop" tone="indigo" title={traduire("Eau")} value={traduire("{0} à {1}", String(needs.water.min).replace('.', DECIMAL), String(needs.water.max).replace('.', DECIMAL))} unit="L" sub={traduire("30 à 35 ml par kg")} />
            <NeedCard icon="flame" tone="gold" title={traduire("Calories")} value={needs.tdee.toLocaleString(LOCALE)} unit="kcal" sub={traduire("Métabolisme de base {0} kcal", needs.bmr)} />
          </View>
          <Ink size={12} weight="medium" color={P.ink2} style={{ marginTop: 8, paddingHorizontal: 4 }}>
            {age
              ? traduire("Calories estimées avec la formule Mifflin St Jeor, version homme, et ton âge. Pour un calcul complet, ouvre le plan nutritionnel.")
              : traduire("Calories estimées avec la formule Mifflin St Jeor, version homme, pour un âge de 30 ans. Pour un calcul complet, ouvre le plan nutritionnel.")}</Ink>
        </Enter>

        {/* CONSEILS */}
        <Enter i={5}>
          <Card style={{ gap: 10, backgroundColor: P.goldSoft, borderColor: P.goldSoft }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <NIcon name="star" size={18} color={P.goldDark} />
              <Ink size={16} weight="black" color={P.goldDark}>
                {traduire("Conseils du guerrier")}</Ink>
            </View>
            {TIPS.map((t) => (
              <Bullet key={t} color={P.goldDark}>
                {t}
              </Bullet>
            ))}
          </Card>
        </Enter>

        <Enter i={6}>
          <H2>{traduire("Sources")}</H2>
          <View style={{ marginTop: 10 }}>
            <SourcesCard sources={[SOURCES.protein, SOURCES.carbs, SOURCES.hydration, SOURCES.timing]} />
          </View>
        </Enter>
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, paddingVertical: 8, borderRadius: 14, backgroundColor: P.paper, alignItems: 'center', gap: 2 }}>
      <Ink size={17} weight="black" tight>
        {`${value} g`}
      </Ink>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} />
        <Ink size={11} weight="bold" color={P.ink2}>
          {label}
        </Ink>
      </View>
    </View>
  );
}

function NeedCard({ icon, tone, title, value, unit, sub }: { icon: NIconName; tone: Tone; title: string; value: string; unit: string; sub: string }) {
  return (
    <Card style={{ width: '48.4%', padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <IconDot name={icon} tone={tone} size={32} />
        <Ink size={14} weight="extraBold">
          {title}
        </Ink>
      </View>
      <BigNumber value={value} unit={unit} size={26} />
      <Ink size={12} weight="medium" color={P.ink2}>
        {sub}
      </Ink>
    </Card>
  );
}
