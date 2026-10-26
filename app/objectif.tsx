/**
 * « Quand j’y arriverai ? » (26 octobre 2026). Tu choisis un exercice, tu dis ce que tu vises
 * (une charge pour un nombre de repetitions, ou un nombre de repetitions au poids du corps), YOROI estime quand
 * d'apres tes propres seances. Calcul pur et teste : lib/v2/objectifs/estimation.ts.
 * Parametre optionnel : exo (nom ou cle de l'exercice), ouvert depuis le detail de la force.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailHeader, EmptyInvite, GlassCard, GUTTER, Pills, PrimaryButton, SectionHead, tapLight } from '@/components/yoroi/v2/progres/ui';
import { CourbeObjectif } from '@/components/yoroi/v2/objectifs/CourbeObjectif';
import { couleurTraitDomaine } from '@/components/yoroi/v2/charts/couleurDomaine';
import { useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { depuisUnitePoids, versUnitePoids } from '@/lib/v2/unitePoids';
import { monthLong, num, todayIso } from '@/lib/v2/progres/format';
import { arrondiObjectif, delaiArrondi, estimer, exercicesPossibles, plier, REPS_MAX_EPLEY, serieDeLExo, versUniteObjectif } from '@/lib/v2/objectifs/estimation';
import type { Estimation, TrainingObjectif } from '@/lib/v2/objectifs/estimation';
import { chargerProgrammeActif } from '@/lib/v2/programmes/suivi';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const INDIGO = '#2C4A84';
const INDIGO_SOMBRE = '#3A5BA0';

function lireNombre(s: string): number {
  const v = Number(s.replace(',', '.').replace(/[^0-9.]/g, ''));
  return isFinite(v) ? v : 0;
}

function moisAnnee(iso: string): string {
  return `${monthLong(iso)} ${iso.slice(0, 4)}`;
}

function delaiTexte(semaines: number): string {
  const d = delaiArrondi(semaines);
  return d.unite === 'semaine'
    ? traduirePluriel(d.n, d.n > 1, 'dans environ {0} semaine', 'dans environ {0} semaines', d.n)
    : traduire('dans environ {0} mois', d.n);
}

export default function ObjectifScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ exo?: string }>();
  const { trainings, loading } = useTrainingsData();
  const unite = useUnitePoids();
  const mot = unite === 'lb' ? 'lb' : 'kg';
  const aujourdhui = todayIso();

  const liste = useMemo(() => exercicesPossibles(trainings as unknown as TrainingObjectif[]), [trainings]);
  const [cle, setCle] = useState<string | null>(params.exo ? plier(params.exo) : null);
  useEffect(() => {
    if (liste.length && (!cle || !liste.some((l) => l.cle === cle))) setCle(liste[0].cle);
  }, [liste, cle]);
  const exo = liste.find((l) => l.cle === cle) ?? liste[0];
  const serie = useMemo(() => (exo ? serieDeLExo(trainings as unknown as TrainingObjectif[], exo.cle, exo.mesure) : null), [trainings, exo]);
  const charge = exo?.mesure === 'charge';

  const [cibleTexte, setCibleTexte] = useState('');
  const [repsTexte, setRepsTexte] = useState('');
  // a chaque exercice : tes repetitions habituelles, et rien d'ecrit en objectif
  useEffect(() => {
    setCibleTexte('');
    setRepsTexte(serie ? String(Math.min(REPS_MAX_EPLEY, Math.max(1, serie.repsHabituelles))) : '');
  }, [serie?.cle]); // eslint-disable-line react-hooks/exhaustive-deps

  const repsCible = Math.min(REPS_MAX_EPLEY, Math.max(1, Math.round(lireNombre(repsTexte)) || 1));
  const cibleSaisie = lireNombre(cibleTexte);
  const cible = charge ? depuisUnitePoids(cibleSaisie, unite) : Math.round(cibleSaisie);

  // ton niveau actuel, dans l'unite de l'objectif : le meilleur de tes 3 dernieres seances
  const actuel = useMemo(() => {
    if (!serie || !serie.points.length) return null;
    const v = Math.max(...serie.points.slice(-3).map((p) => p.valeur));
    return versUniteObjectif(serie.mesure, v, repsCible);
  }, [serie, repsCible]);

  const est: Estimation | null = useMemo(() => (serie && cible > 0 ? estimer(serie, { cible, repsCible }, aujourdhui) : null), [serie, cible, repsCible, aujourdhui]);

  const affiche = (v: number) => (charge ? `${num(versUnitePoids(arrondiObjectif('charge', v), unite), 1)} ${mot}` : traduirePluriel(Math.floor(v), Math.floor(v) > 1, '{0} répétition', '{0} répétitions', Math.floor(v)));
  const afficheCourt = (v: number) => (charge ? num(versUnitePoids(v, unite), 0) : String(Math.round(v)));

  const [programme, setProgramme] = useState<{ id: string; titre: string } | null>(null);
  useEffect(() => {
    chargerProgrammeActif().then((a) => {
      const p = a ? programmeParId(a.id) : undefined;
      setProgramme(p ? { id: p.id, titre: p.titre } : null);
    });
  }, []);

  const trait = couleurTraitDomaine('seances');
  const indigo = theme.isDark ? INDIGO_SOMBRE : INDIGO;
  const passe = useMemo(() => (serie ? serie.points.slice(-30).map((p) => ({ date: p.date, valeur: versUniteObjectif(serie.mesure, p.valeur, repsCible) })) : []), [serie, repsCible]);
  const projection = est && 'projection' in est ? est.projection : [];

  const champ = [fontStyle('black'), { fontSize: 34, color: c.ink, paddingVertical: 0, minWidth: 70, borderBottomWidth: 2, borderColor: c.accent }];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <DetailHeader title={traduire('Quand j’y arriverai ?')} sub={traduire('Une estimation à partir de tes séances')} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        {!loading && !liste.length ? (
          <EmptyInvite
            title={traduire('Pas encore de séance notée')}
            text={traduire('Note tes séries avec la charge et les répétitions. Après 4 séances sur 3 semaines, YOROI estime quand tu atteindras ton objectif.')}
            plusHint={traduire('Note ta séance avec le bouton + de la barre d’onglets')}
            style={{ marginHorizontal: GUTTER, marginTop: 20 }}
          />
        ) : null}

        {liste.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12 }}>
            <Pills scroll items={liste.slice(0, 20).map((l) => ({ value: l.cle, label: traduire(l.nom) }))} value={exo?.cle ?? ''} onChange={(k) => setCle(k)} />
          </ScrollView>
        ) : null}

        {exo && serie ? (
          <View style={{ paddingHorizontal: GUTTER, marginTop: 18, gap: 16 }}>
            <GlassCard style={{ gap: 12 }}>
              <Ink size={14} weight="bold" color={c.textSecondary}>
                {traduire('Aujourd’hui')}
              </Ink>
              <Ink size={22} weight="black" tight>
                {actuel != null ? (charge ? traduire('{0} pour {1}', affiche(actuel), traduirePluriel(repsCible, repsCible > 1, '{0} répétition', '{0} répétitions', repsCible)) : affiche(actuel)) : traduire('Pas encore de série exploitable')}
              </Ink>
              {charge ? (
                <Ink size={12} color={c.textSecondary}>
                  {traduire('Estimé d’après ta meilleure série des 3 dernières séances.')}
                </Ink>
              ) : null}
              <View style={{ height: 1, backgroundColor: c.divider }} />
              <Ink size={14} weight="bold" color={c.textSecondary}>
                {traduire('Ton objectif')}
              </Ink>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
                <TextInput
                  value={cibleTexte}
                  onChangeText={setCibleTexte}
                  keyboardType={charge ? 'decimal-pad' : 'number-pad'}
                  placeholder="0"
                  placeholderTextColor={c.textMuted}
                  accessibilityLabel={charge ? traduire('Charge visée en {0}', mot) : traduire('Répétitions visées')}
                  style={champ}
                />
                <Ink size={17} weight="bold" color={c.textSecondary} style={{ paddingBottom: 6 }}>
                  {charge ? traduire('{0} pour', mot) : traduire('répétitions')}
                </Ink>
                {charge ? (
                  <>
                    <TextInput
                      value={repsTexte}
                      onChangeText={setRepsTexte}
                      keyboardType="number-pad"
                      placeholder="1"
                      placeholderTextColor={c.textMuted}
                      accessibilityLabel={traduire('Répétitions visées avec cette charge')}
                      style={[...champ, { minWidth: 44 }]}
                    />
                    <Ink size={17} weight="bold" color={c.textSecondary} style={{ paddingBottom: 6 }}>
                      {traduire('répétitions')}
                    </Ink>
                  </>
                ) : null}
              </View>
              {charge ? (
                <Ink size={12} color={c.textSecondary}>
                  {traduire('Haltères : la charge d’une main. 10 répétitions au plus, au delà l’estimation perd en précision.')}
                </Ink>
              ) : null}
            </GlassCard>

            {est ? <Resultat est={est} indigo={indigo} affiche={affiche} /> : null}

            {est && est.etat !== 'manque' && est.etat !== 'atteint' && passe.length > 1 ? (
              <GlassCard style={{ gap: 6 }}>
                <Ink size={14} weight="bold" color={c.textSecondary}>
                  {traduire('Ta courbe et sa suite probable')}
                </Ink>
                <CourbeObjectif passe={passe} projection={projection} cible={cible} couleur={trait} format={afficheCourt} />
                <Ink size={12} color={c.textSecondary}>
                  {traduire('Points : tes séances. Pointillés : la suite si tu gardes ce rythme. Trait doré : ton objectif.')}
                </Ink>
              </GlassCard>
            ) : null}

            {est && est.etat !== 'manque' ? (
              <GlassCard style={{ gap: 10 }}>
                <Ink size={15} weight="extraBold">
                  {traduire('Comment c’est calculé')}
                </Ink>
                <Ink size={13} color={c.textSecondary}>
                  {traduire('La force monte vite au début puis ralentit : pour un même gain, chaque palier demande plus de temps que le précédent. Étude sur 14 690 personnes, Steele 2022.')}
                </Ink>
                <Ink size={13} color={c.textSecondary}>
                  {traduire('Plus tu es fort, plus tu progresses lentement. Étude sur 1 897 powerlifters, Latella 2020.')}
                </Ink>
                <Ink size={13} color={c.textSecondary}>
                  {charge
                    ? traduire('YOROI suit cette courbe sur tes séances, avec la formule d’Epley jusqu’à 10 répétitions, Reynolds 2006. C’est une estimation, pas une promesse.')
                    : traduire('YOROI suit cette courbe sur ton maximum de répétitions dans une série, séance après séance. C’est une estimation, pas une promesse.')}
                </Ink>
              </GlassCard>
            ) : null}

            <View style={{ gap: 10 }}>
              <SectionHead title={traduire('Comment y arriver')} />
              <Ink size={14} color={c.textSecondary}>
                {charge
                  ? traduire('Quand tu fais le haut de ta fourchette sur toutes tes séries deux séances de suite, la charge monte d’environ 5 %. Règle de ton programme, d’après l’ACSM 2009.')
                  : traduire('Une répétition de plus quand tu peux, jusqu’au haut de ta fourchette. Ensuite, une variante plus dure. Règle de ton programme.')}
              </Ink>
              <PrimaryButton
                label={programme ? traduire('Voir ton programme') : traduire('Choisir un programme')}
                onPress={() => {
                  tapLight();
                  if (programme) router.push({ pathname: '/programmes/[id]' as any, params: { id: programme.id } });
                  else router.push('/programmes' as any);
                }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Resultat({ est, indigo, affiche }: { est: Estimation; indigo: string; affiche: (v: number) => string }) {
  const blanc = '#FFFFFF';
  const doux = 'rgba(255,255,255,0.78)';
  let titre = '';
  let lignes: string[] = [];
  if (est.etat === 'manque') {
    titre = traduire('Pas assez de données');
    lignes = [
      traduire('Il faut au moins {0} séances sur {1} jours pour cet exercice.', est.seancesMin, est.joursMin),
      traduirePluriel(est.seances, est.seances > 1, 'Tu en as {0} sur {1} jours.', 'Tu en as {0} sur {1} jours.', est.seances, est.jours),
    ];
  } else if (est.etat === 'atteint') {
    titre = traduire('Objectif déjà atteint');
    lignes = [traduire('Tu y es : {0}. Vise plus haut.', affiche(est.actuel))];
  } else if (est.etat === 'plateau') {
    titre = traduire('Pas de date pour l’instant');
    lignes = [traduire('Ta courbe ne monte plus sur cet exercice.'), traduire('Suis la règle de progression ci dessous quelques semaines, puis reviens voir.')];
  } else if (est.etat === 'loin') {
    titre = traduire('Plus de 3 ans à ce rythme');
    lignes = est.paliers.length
      ? [traduire('Voici un palier intermédiaire :'), ...est.paliers.map((p) => traduire('dans {0} mois : {1}', p.mois, affiche(p.valeur)))]
      : [traduire('Ta courbe monte trop peu pour donner un palier. Suis la règle de progression ci dessous.')];
  } else {
    titre = traduire('Vers {0}', moisAnnee(est.date));
    const tot = moisAnnee(est.dateTot);
    lignes = [
      delaiTexte(est.semaines),
      est.dateTard
        ? tot === moisAnnee(est.dateTard)
          ? traduire('Fourchette probable : {0}', tot)
          : traduire('Fourchette probable : entre {0} et {1}', tot, moisAnnee(est.dateTard))
        : traduire('Au plus tôt {0}, au plus tard plus de 3 ans', tot),
    ];
  }
  return (
    <View style={{ borderRadius: 22, backgroundColor: indigo, padding: 18, gap: 6 }} accessibilityLiveRegion="polite">
      <Ink size={30} weight="black" tight color={blanc}>
        {titre}
      </Ink>
      {lignes.map((l, i) => (
        <Ink key={i} size={15} weight={i === 0 ? 'bold' : 'medium'} color={i === 0 ? blanc : doux}>
          {l}
        </Ink>
      ))}
    </View>
  );
}
