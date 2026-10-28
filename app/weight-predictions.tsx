/**
 * Prédictions de poids (courbe-pred, remplace l'ecran Previsions de la vague 26, archive dans
 * _archive_ancien_design_2026-10-09/courbe_pred/) : ou tu en seras, a partir de tes vraies pesees.
 *  - deux scenarios : « À ton rythme actuel » (regression robuste sur tes 4 dernieres semaines, avec une fourchette
 *    qui s'elargit avec le temps) et « En suivant ta ligne » (ta ligne directrice, celle de la courbe du poids) ;
 *  - dans 1 et 2 semaines, 1, 2 et 3 mois, et au torii ; la date ou tu touches ton cap a ton rythme, comparee au torii ;
 *  - un petit graphique qui prolonge ta courbe en pointilles avec la fourchette, et ta ligne jusqu'au torii ;
 *  - pas assez de pesees (5 sur 14 jours) : ce qu'il te manque.
 * Calculs : lib/v2/pesee/predictions.ts. Ligne et torii : lib/v2/pesee/usePlanPoids.ts (les memes que la courbe).
 * Ouverte depuis la courbe du poids (poids-detail), la carte Poids de l'accueil (« Où tu en seras ») et Progres.
 */
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailHeader, EmptyInvite, GUTTER, LegendMark } from '@/components/yoroi/v2/progres/ui';
import { CourbePrevision } from '@/components/yoroi/v2/progres/CourbePrevision';
import { POIDS } from '@/components/yoroi/v2/charts/CourbePoids';
import { ToriiImage } from '@/components/yoroi/v2/charts/ToriiImage';
import { P } from '@/components/yoroi/livePalette';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useWeightData } from '@/lib/v2/useWeightData';
import { usePlanPoids } from '@/lib/v2/pesee/usePlanPoids';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { localISO } from '@/lib/v2/accueil/hydration';
import { jourCourt } from '@/lib/v2/pesee/ligneDirectrice';
import type { Prevision, Unite } from '@/lib/v2/pesee/predictions';
import { FENETRE_JOURS, MIN_JOURS, MIN_PESEES, phrasePrevision, phraseTorii, poidsTexte, prevoir, texteManque } from '@/lib/v2/pesee/predictions';
import { traduire } from '@/lib/i18n/tr';

export default function WeightPredictionsScreen() {
  return (
    <PremiumGate source="prevision_poids" featureTitle={traduire("Prédictions de poids")} perks={[traduire('Où tu en seras dans 1 semaine, 1 mois, 3 mois'), traduire('La date où tu passes ton cap, à ton rythme'), traduire('Ton rythme réel comparé à ta ligne')]}>
      <Predictions />
    </PremiumGate>
  );
}

/** le contenu sans la porte Premium (exporte pour les rendus de verification) */
export function Predictions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = localISO();
  const { series: seriesIn, goal, loading } = useWeightData();
  const series = useMemo(() => seriesIn.filter((p) => p.date <= today), [seriesIn, today]);
  const prefs = usePrefsCourbes();
  const plan = usePlanPoids(series, goal ?? null, { enabled: true, check: false, today });
  // 18 octobre 2026 : le poids du corps se saisit en kilos (pesee), il s'affiche donc en kilos partout, ici aussi.
  // Le reglage kg ou livres ne change que les charges soulevees (Force, Records, Seances, cartes).
  const u: Unite = 'kg';
  const capOn = prefs.cap && goal != null;
  const r = useMemo(
    () => prevoir({ series, today, cap: goal ?? null, ligne: capOn ? plan.ligne : null, torii: capOn ? plan.torii : null, atteint: plan.atteint }),
    [series, today, goal, capOn, plan.ligne, plan.torii, plan.atteint],
  );

  if (loading) return <View style={{ flex: 1, backgroundColor: P.paper }} />;

  if (!r.ok) {
    const t = texteManque(r);
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <DetailHeader title={traduire("Prédictions")} sub={traduire("Où tu en seras, à partir de tes pesées.")} />
        <EmptyInvite style={{ margin: GUTTER, marginTop: 18 }} title={traduire(t.titre)} text={traduire(t.texte)} cta={traduire("Nouvelle pesée")} onPress={() => router.push('/pesee' as any)} />
        <View style={{ marginHorizontal: GUTTER, gap: 12 }}>
          <Jauge label={traduire("Pesées")} val={Math.min(r.pesees, MIN_PESEES)} max={MIN_PESEES} txt={traduire("{0} sur {1}", Math.min(r.pesees, MIN_PESEES), MIN_PESEES)} />
          <Jauge label={traduire("Jours couverts")} val={Math.min(r.jours, MIN_JOURS)} max={MIN_JOURS} txt={traduire("{0} sur {1}", Math.min(r.jours, MIN_JOURS), MIN_JOURS)} />
          <Ink size={12.5} color={P.muted} style={{ marginTop: 2 }}>
            {traduire("Monte sur la balance le matin, à jeun. On regarde tes {0} dernières semaines.", FENETRE_JOURS / 7)}
          </Ink>
        </View>
      </View>
    );
  }

  const passe = series.filter((p) => p.date >= r.ajustement.debut);
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <DetailHeader title={traduire("Prédictions")} sub={traduire("Où tu en seras, à partir de tes pesées.")} />

        {/* la phrase simple, puis ton arrivee comparee au torii */}
        <View style={{ paddingHorizontal: GUTTER, marginTop: 14, gap: 8 }}>
          <Ink size={21} weight="black" tight accessibilityRole="header">
            {phrasePrevision(r, u)}
          </Ink>
          <RythmeLigne r={r} u={u} />
        </View>

        <View style={{ paddingHorizontal: 14, marginTop: 14 }}>
          <CourbePrevision passe={passe} prev={r} unite={u} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, paddingHorizontal: GUTTER, marginTop: 6 }}>
          <LegendMark kind="line" color={POIDS.c2} label={traduire("ton poids lissé")} />
          <LegendMark kind="dash" color={POIDS.c3} label={traduire("à ton rythme, avec sa fourchette")} />
          {r.torii ? <LegendMark kind="dash" color={POIDS.cap} label={traduire("ta ligne, jusqu’au torii")} /> : null}
        </View>

        {/* les dates : deux scenarios cote a cote */}
        <Tableau r={r} u={u} />

        <Ink size={12} color={P.muted} style={{ paddingHorizontal: GUTTER, marginTop: 14, lineHeight: 17 }}>
          {traduire("Estimation à partir de tes {0} pesées des {1} dernières semaines, pas une promesse. La fourchette s’élargit avec le temps : plus on regarde loin, moins c’est sûr.", r.ajustement.n, Math.max(2, Math.round(r.ajustement.jours / 7)))}
        </Ink>

        <View style={{ marginHorizontal: GUTTER, marginTop: 22, padding: 16, borderRadius: 22, backgroundColor: P.washi, borderWidth: 1, borderColor: P.washiBord, gap: 6 }}>
          <Ink size={15} weight="black">
            {traduire("Comment on calcule")}</Ink>
          <Ink size={13.5} color={P.ink2} style={{ lineHeight: 19 }}>
            {traduire('À ton rythme actuel : la pente de tes pesées des 4 dernières semaines, mesurée pour qu’une pesée bizarre (sel, eau, balance) ne la tire pas. Vers ton cap, la perte ralentit dans le dernier tiers, comme dans la réalité, puis on suppose que tu tiens ton cap.')}
          </Ink>
          <Ink size={13.5} color={P.ink2} style={{ lineHeight: 19 }}>
            {r.torii ? traduire('En suivant ta ligne : ta ligne verte de la courbe du poids, qui arrive à ton cap le jour du torii.') : traduire('En suivant ta ligne : fixe ton cap pour voir ta ligne verte et ton torii.')}
          </Ink>
        </View>
      </ScrollView>
    </View>
  );
}

/** « Ton rythme : 0,4 kg en moins par semaine » et ton arrivee comparee au torii */
function RythmeLigne({ r, u }: { r: Prevision; u: Unite }) {
  const v = r.ajustement.kgSemaine;
  const rythme = r.sens === 'stable' ? traduire('Ton rythme : stable') : v < 0 ? traduire("Ton rythme : {0} en moins par semaine", poidsTexte(Math.abs(v), u)) : traduire("Ton rythme : {0} en plus par semaine", poidsTexte(Math.abs(v), u));
  const t = phraseTorii(r);
  return (
    <View style={{ gap: 6 }}>
      <Ink size={14} weight="bold" color={P.ink2}>
        {rythme}
      </Ink>
      {r.arrivee && r.arrivee.tot && r.arrivee.tard ? (
        <Ink size={13.5} color={P.ink2}>
          {traduire("Ton cap à ton rythme : vers le {0}, entre le {1} et le {2}", jourCourt(r.arrivee.date), jourCourt(r.arrivee.tot), jourCourt(r.arrivee.tard))}
        </Ink>
      ) : null}
      {t ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: P.goldSoft }}>
          <ToriiImage width={18} />
          <Ink size={13} weight="extraBold" color={POIDS.or}>
            {t}
          </Ink>
        </View>
      ) : null}
    </View>
  );
}

function Tableau({ r, u }: { r: Prevision; u: Unite }) {
  const avecLigne = r.dates.some((d) => d.ligne != null);
  const cell = { width: avecLigne ? 86 : 124, alignItems: 'flex-end' as const };
  return (
    <View style={{ marginHorizontal: GUTTER, marginTop: 20, borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: P.line, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderColor: P.line2 }}>
        <View style={{ flex: 1 }} />
        <View style={cell}>
          <Ink size={11.5} weight="extraBold" color={POIDS.softText} style={{ textAlign: 'right' }}>
            {traduire("À ton rythme actuel")}</Ink>
        </View>
        {avecLigne ? (
          <View style={cell}>
            <Ink size={11.5} weight="extraBold" color={POIDS.capText} style={{ textAlign: 'right' }}>
              {traduire("En suivant ta ligne")}</Ink>
          </View>
        ) : null}
      </View>
      {r.dates.map((d, i) => {
        const torii = d.id === 'torii';
        return (
          <View
            key={d.id}
            accessible
            accessibilityLabel={traduire("{0}, le {1} : à ton rythme {2}, entre {3} et {4}{5}", torii ? traduire('Au torii') : d.label, jourCourt(d.date), poidsTexte(d.valeur, u), poidsTexte(d.bas, u), poidsTexte(d.haut, u), d.ligne != null ? traduire(". En suivant ta ligne : {0}", poidsTexte(d.ligne, u)) : '')}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: P.line2, backgroundColor: torii ? P.goldSoft : 'transparent' }}
          >
            <View style={{ flex: 1, gap: 1, paddingRight: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                {torii ? <ToriiImage width={15} /> : null}
                <Ink size={13.5} weight="extraBold" color={torii ? POIDS.or : P.ink} numberOfLines={2} style={{ flexShrink: 1 }}>
                  {torii ? traduire('Au torii') : d.label}
                </Ink>
              </View>
              <Ink size={11.5} color={P.muted}>
                {traduire("le {0}", jourCourt(d.date))}
              </Ink>
            </View>
            <View style={cell}>
              <Ink size={16} weight="black" style={{ fontVariant: ['tabular-nums'] }}>
                {poidsTexte(d.valeur, u)}
              </Ink>
              <Ink size={11} color={P.muted} style={{ fontVariant: ['tabular-nums'] }} numberOfLines={1}>
                {traduire("{0} à {1}", poidsTexte(d.bas, u, false), poidsTexte(d.haut, u, false))}
              </Ink>
            </View>
            {avecLigne ? (
              <View style={cell}>
                <Ink size={16} weight="black" color={POIDS.capText} style={{ fontVariant: ['tabular-nums'] }}>
                  {d.ligne != null ? poidsTexte(d.ligne, u) : ''}
                </Ink>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Jauge({ label, val, max, txt }: { label: string; val: number; max: number; txt: string }) {
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Ink size={13} weight="bold" color={P.ink2}>
          {label}
        </Ink>
        <Ink size={13} weight="extraBold">
          {txt}
        </Ink>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: P.line2, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round((val / max) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: POIDS.c2 }} />
      </View>
    </View>
  );
}
