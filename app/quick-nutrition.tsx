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

type PhaseId = 'pre_training' | 'post_training' | 'fight_day' | 'recovery';
type Meal = { timing: string; title: string; foods: string[]; macros: { protein: number; carbs: number; fat: number }; tips: string[] };
type Phase = { id: PhaseId; name: string; icon: NIconName; tone: Tone; description: string; meals: Meal[] };

const PHASES: Phase[] = [
  {
    id: 'pre_training',
    name: 'Avant l’entraînement',
    icon: 'bolt',
    tone: 'gold',
    description: 'Optimise ton énergie avant la séance',
    meals: [
      { timing: '3 à 4 h avant', title: 'Repas complet', foods: ['Riz ou pâtes', 'Poulet ou poisson', 'Légumes', 'Huile d’olive'], macros: { protein: 30, carbs: 80, fat: 15 }, tips: ['Évite les fibres lourdes', 'Hydrate-toi bien'] },
      { timing: '1 à 2 h avant', title: 'Collation légère', foods: ['Banane', 'Barre de céréales', 'Pain et miel'], macros: { protein: 5, carbs: 40, fat: 5 }, tips: ['Glucides rapides', 'Facile à digérer'] },
      { timing: '30 min avant', title: 'Coup de pouce', foods: ['Datte', 'Gel énergétique', 'Boisson isotonique'], macros: { protein: 0, carbs: 25, fat: 0 }, tips: ['Optionnel si tu as mangé récemment', 'Pour les séances intenses'] },
    ],
  },
  {
    id: 'post_training',
    name: 'Après l’entraînement',
    icon: 'dumbbell',
    tone: 'moss',
    description: 'Récupère mieux',
    meals: [
      { timing: '0 à 30 min après', title: 'Premier apport', foods: ['Protéine en poudre', 'Banane', 'Lait'], macros: { protein: 30, carbs: 40, fat: 5 }, tips: ['Protéines rapides', 'Glucides pour recharger'] },
      { timing: '1 à 2 h après', title: 'Repas de récupération', foods: ['Poulet ou saumon', 'Riz ou patate douce', 'Légumes verts', 'Avocat'], macros: { protein: 40, carbs: 60, fat: 20 }, tips: ['Protéines de qualité', 'Glucides complexes', 'Graisses saines'] },
    ],
  },
  {
    id: 'fight_day',
    name: 'Jour de combat',
    icon: 'swords',
    tone: 'red',
    description: 'Ton protocole du jour J',
    meals: [
      { timing: 'Après la pesée', title: 'Réhydratation', foods: ['Eau et électrolytes', 'Boisson isotonique', 'Jus de raisin dilué'], macros: { protein: 0, carbs: 30, fat: 0 }, tips: ['Petites gorgées', 'Ne bois pas trop vite'] },
      { timing: '4 à 5 h avant le combat', title: 'Repas principal', foods: ['Pâtes ou riz blanc', 'Poulet grillé', 'Peu de légumes', 'Miel'], macros: { protein: 25, carbs: 100, fat: 10 }, tips: ['Glucides simples', 'Évite fibres et gras', 'Un repas que tu connais'] },
      { timing: '2 h avant le combat', title: 'Collation légère', foods: ['Pain blanc et confiture', 'Banane', 'Barre énergétique'], macros: { protein: 5, carbs: 50, fat: 5 }, tips: ['Digestion rapide', 'Ce que tu connais'] },
      { timing: '30 min avant', title: 'Dernier coup de pouce', foods: ['Gel ou datte', 'Café (optionnel)', 'Quelques gorgées d’eau'], macros: { protein: 0, carbs: 25, fat: 0 }, tips: ['Énergie immédiate', 'Aucune nouveauté'] },
    ],
  },
  {
    id: 'recovery',
    name: 'Jour de repos',
    icon: 'moon',
    tone: 'indigo',
    description: 'Laisse ton corps se réparer',
    meals: [
      { timing: 'Petit-déjeuner', title: 'Riche en protéines', foods: ['Œufs', 'Avocat', 'Pain complet', 'Fruits'], macros: { protein: 30, carbs: 40, fat: 25 }, tips: ['Protéines pour réparer', 'Bonnes graisses'] },
      { timing: 'Déjeuner', title: 'Repas équilibré', foods: ['Saumon ou poulet', 'Quinoa ou riz complet', 'Légumes', 'Huile d’olive'], macros: { protein: 40, carbs: 50, fat: 20 }, tips: ['Oméga-3', 'Glucides complexes'] },
      { timing: 'Dîner', title: 'Repas léger', foods: ['Poisson blanc', 'Légumes vapeur', 'Riz', 'Yaourt grec'], macros: { protein: 35, carbs: 40, fat: 10 }, tips: ['Digestion facile', 'Caséine pour la nuit'] },
    ],
  },
];

const TIPS = ['Hydrate-toi : environ 35 ml par kg de poids', 'Mange ce que tu connais avant un combat', 'Évite les aliments nouveaux le jour J', 'Des protéines à chaque repas pour récupérer'];

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
      <DetailScreen title="Repas du jour" subtitle="Quoi manger, et quand">
        {/* MOMENT */}
        <Enter i={0}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PHASES.map((p) => {
              const on = p.id === phaseId;
              const c = toneColor(p.tone);
              return (
                <View key={p.id} style={{ width: '48.4%' }}>
                  <Press onPress={() => setPhaseId(p.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={p.name}>
                    <View style={{ minHeight: 92, borderRadius: 22, padding: 14, gap: 10, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.fg : c.soft }}>
                        <NIcon name={p.icon} size={18} color={on ? P.white : c.fg} />
                      </View>
                      <Ink size={15} weight="extraBold" color={on ? P.white : P.ink}>
                        {p.name}
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
          <H2 sub={phase.description}>{phase.name}</H2>
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
                    {m.title}
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
                    <MacroPill label="Protéines" value={m.macros.protein} color={SERIES.moss} />
                    <MacroPill label="Glucides" value={m.macros.carbs} color={SERIES.blue} />
                    <MacroPill label="Lipides" value={m.macros.fat} color={SERIES.gold} />
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
            <Notice tone="danger" title="Après une coupe de poids" text="Réhydrate-toi progressivement. Si tu as des vertiges, des crampes ou une confusion, préviens le staff médical." />
          </Enter>
        ) : null}

        {/* TES BESOINS */}
        <Enter i={3}>
          <H2 sub="Repris de ta dernière pesée, modifiable">Tes besoins du jour</H2>
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
            <NeedCard icon="leaf" tone="red" title="Protéines" value={`${needs.protein.min} à ${needs.protein.max}`} unit="g" sub="1,6 à 2,2 g par kg" />
            <NeedCard icon="bolt" tone="indigo" title="Glucides" value={`${needs.carbs.min} à ${needs.carbs.max}`} unit="g" sub={`${needs.carbs.perKg} g par kg, ${QUICK_ACTIVITY[activity].phrase}`} />
            <NeedCard icon="drop" tone="indigo" title="Eau" value={`${String(needs.water.min).replace('.', ',')} à ${String(needs.water.max).replace('.', ',')}`} unit="L" sub="30 à 35 ml par kg" />
            <NeedCard icon="flame" tone="gold" title="Calories" value={needs.tdee.toLocaleString('fr-FR')} unit="kcal" sub={`Métabolisme de base ${needs.bmr} kcal`} />
          </View>
          <Ink size={12} weight="medium" color={P.ink2} style={{ marginTop: 8, paddingHorizontal: 4 }}>
            {age ? 'Calories estimées avec la formule Mifflin-St Jeor, version homme, et ton âge. ' : 'Calories estimées avec la formule Mifflin-St Jeor, version homme, pour un âge de 30 ans. '}
            Pour un calcul complet, ouvre le plan nutritionnel.
          </Ink>
        </Enter>

        {/* CONSEILS */}
        <Enter i={5}>
          <Card style={{ gap: 10, backgroundColor: P.goldSoft, borderColor: P.goldSoft }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <NIcon name="star" size={18} color={P.goldDark} />
              <Ink size={16} weight="black" color={P.goldDark}>
                Conseils du guerrier
              </Ink>
            </View>
            {TIPS.map((t) => (
              <Bullet key={t} color={P.goldDark}>
                {t}
              </Bullet>
            ))}
          </Card>
        </Enter>

        <Enter i={6}>
          <H2>Sources</H2>
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
