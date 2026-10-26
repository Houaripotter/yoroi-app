/**
 * Detail d'un programme (24 octobre 2026) : pour qui, comment le suivre, chaque jour avec ses exercices,
 * et les etudes sur lesquelles il repose. Commencer, changer de programme ou l'arreter se fait ici.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, Chip, Glass, SectionTitle, Stat, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { getActiveInjuries, getMeasurements, getProfile, getTrainings, getWeights } from '@/lib/database';
import type { Measurement, Training, Weight } from '@/lib/database';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { saisieDepuisKg } from '@/lib/v2/unitePoids';
import { fmtNum } from '@/lib/v2/seance/format';
import { corpsDepuis, gainMoyen, progresDesCharges, regularite } from '@/lib/v2/programmes/progres';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { libelleMateriel, libelleNiveau, libelleRepos, programmeParId, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { PRECISION_EXO, musclesDeExo } from '@/lib/v2/programmes/musclesExos';
import { cardioDeLaSemaine, resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { raisonRemplacement } from '@/lib/v2/programmes/materiel';
import { LIBELLE_REGION, regionsDesBlessures } from '@/lib/v2/programmes/blessures';
import { jourPourToi } from '@/lib/v2/programmes/perso';
import type { ExoPerso } from '@/lib/v2/programmes/perso';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { MaSalle } from '@/components/yoroi/v2/programmes/MaSalle';
import { BoutonRond, CarteConseil, EnTeteRond, HeroJour, LigneEtudes, Pastille, SemaineRonds, TitreSection, TuilesStats, musclesDuJour, nomCourt, rondsDeLaSemaine, salutation, teinteExo, tuileCharge, usePaletteProgramme, type Tuile } from '@/components/yoroi/v2/programmes/Habillage';
import { buildExerciseHistory } from '@/lib/v2/seance/history';
import type { ExoProtege, Region } from '@/lib/v2/programmes/blessures';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { FicheTechnique } from '@/components/yoroi/v2/programmes/FicheTechnique';
import { ficheDe } from '@/lib/v2/programmes/fiches';
import { DUREES_EXPRESS, dureeEstimee, seanceExpress } from '@/lib/v2/programmes/express';
import { demoDe } from '@/lib/v2/programmes/demos';
import { PROGRAMME_CHANGED_EVENT, arreterProgramme, basculerFavori, chargerFavoris, chargerMachines, chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerFin, faitsCetteSemaine, prochainJour, remplacerExercice, enregistrerJours, joursConseilles, joursDuProgramme, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { infosHero } from '@/lib/v2/programmes/heroJour';
import { ChoixJours } from '@/components/yoroi/v2/programmes/ChoixJours';
import { RappelSeance } from '@/components/yoroi/v2/programmes/RappelSeance';
import { ChoisirCharge } from '@/components/yoroi/v2/programmes/ChoisirCharge';
import { CartePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { CarteFinDeSeance, FeuilleFinDeSeance } from '@/components/yoroi/v2/programmes/FinDeSeance';
import { aDesJoursMarche, aDesJoursMuscu, joursRetires } from '@/lib/v2/programmes/finSeance';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import type { ExoModule } from '@/lib/v2/programmes/modules';
import { guideCharge } from '@/lib/v2/programmes/charge';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function ProgrammeDetail() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const p = programmeParId(typeof id === 'string' ? id : undefined);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);
  const [nom, setNom] = useState('');
  // 26 octobre 2026, maquette D aux couleurs de E (Habillage.tsx)
  const pal = usePaletteProgramme();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [materiel, setMateriel] = useState<Equipement[] | null>(null);
  // 26 octobre 2026 : Ma salle (machines precises) et « Changer » un exercice du programme en cours
  const [machines, setMachines] = useState<string[] | null>(null);
  const [salleOpen, setSalleOpen] = useState(false);
  const [aChanger, setAChanger] = useState<{ jourId: string; index: number; muscle: string; original: string } | null>(null);
  const historique = useMemo(() => buildExerciseHistory(trainings), [trainings]);
  const [pesees, setPesees] = useState<Weight[]>([]);
  // douleurs declarees dans l'infirmerie : les exercices qui chargent la zone sont remplaces ou signales
  const [regions, setRegions] = useState<Region[]>([]);
  const [mesures, setMesures] = useState<Measurement[]>([]);
  const unite = useUnitePoids();
  const [favoris, setFavoris] = useState<string[]>([]);
  // 26 octobre 2026 : fin de seance (abdos, cardio). « depart » : demandee une fois au demarrage du programme
  const [finOuverte, setFinOuverte] = useState<'page' | 'depart' | null>(null);
  // 26 octobre 2026 : toucher « Jour 2 » ouvre le jour 2 et le garde en vue.
  // Avant, le jour ouvert plus haut se repliait, la page raccourcissait sous tes doigts et tu te retrouvais
  // bien plus bas, jusqu'aux sources. On note la position de chaque carte et on y revient apres le depli.
  const defilement = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const aMontrer = useRef<string | null>(null);
  // la tuile « Charge » descend jusqu'à « Tes progrès »
  const progresY = useRef<number | null>(null);
  const montrer = (jourId: string) => {
    const y = positions.current[jourId];
    if (y === undefined) return;
    aMontrer.current = null;
    defilement.current?.scrollTo({ y: Math.max(0, y - insets.top - 8), animated: true });
  };
  const ouvrirJour = (jourId: string, deplie: boolean) => {
    tap();
    if (deplie) {
      setOuvert('');
      return;
    }
    aMontrer.current = jourId;
    setOuvert(jourId);
    // filet : si la carte ne bouge pas (aucun onLayout), on defile quand meme apres le rendu
    setTimeout(() => {
      if (aMontrer.current === jourId) montrer(jourId);
    }, 250);
  };
  // 25 octobre 2026 : tes jours d'entraînement (0 = lundi), choisis avant de commencer, modifiables ensuite
  const [jours, setJours] = useState<number[]>(() => joursConseilles(p?.joursParSemaine ?? 3));
  useEffect(() => {
    if (p && actif?.id === p.id) setJours(joursDuProgramme(actif, p));
  }, [p, actif]);

  useEffect(() => {
    const charger = () =>
      chargerProgrammeActif()
        .then(setActif)
        .catch(() => setActif(null))
        .finally(() => setCharge(true));
    charger();
    const lireMateriel = () => {
      chargerMateriel().then(setMateriel).catch(() => setMateriel(null));
      chargerMachines().then(setMachines).catch(() => setMachines(null));
    };
    lireMateriel();
    const subMateriel = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lireMateriel);
    getProfile().then((pr) => { setFemme(pr?.avatar_gender === 'femme'); setNom(pr?.name ?? ''); }).catch(() => {});
    const lireSeances = () => {
      getTrainings().then((t) => setTrainings(t ?? [])).catch(() => {});
      // ton corps depuis le debut du programme : poids moyen et tour de taille
      getWeights(400).then((w) => setPesees(w ?? [])).catch(() => {});
      getMeasurements(400).then((m) => setMesures(m ?? [])).catch(() => {});
      getActiveInjuries().then((b) => setRegions(regionsDesBlessures(b ?? []))).catch(() => setRegions([]));
    };
    lireSeances();
    const lireFavoris = () => chargerFavoris().then(setFavoris).catch(() => setFavoris([]));
    lireFavoris();
    const subFavoris = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lireFavoris);
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
    const subSeances = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, lireSeances);
    return () => {
      sub.remove();
      subSeances.remove();
      subMateriel.remove();
      subFavoris.remove();
    };
  }, []);

  // 26 octobre 2026 : la prochaine séance est déjà affichée dans « Au programme », la liste des jours reste repliée
  useEffect(() => {
    if (p && charge && ouvert === null) setOuvert('');
  }, [p, ouvert, charge]);

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingHorizontal: 22 }}>
        <EnTete titre={traduire('Programme introuvable')} repli="/programmes" style={{ marginHorizontal: -22, marginTop: -8 }} />
      </View>
    );
  }

  const enCours = actif?.id === p.id;
  const favori = favoris.includes(p.id);
  // l'étoile ronde : pleine et indigo quand le programme est dans tes favoris
  const etoile = (
    <BoutonRond
      icone="star"
      actif={favori}
      onPress={() => { tap(); setFavoris((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [p.id, ...l])); void basculerFavori(p.id); }}
      label={traduire(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')}
    />
  );
  // semaine du plan (course) : celle du programme en cours, sinon la premiere
  const semaine = enCours && actif ? semaineDuProgramme(actif) : 1;
  // fin de seance du programme en cours : abdo et cardio ajoutes, seances de marche retirees
  const ctxFin = enCours && actif ? { fin: actif.fin, materiel: p.materiel } : null;
  const retires = enCours && actif ? joursRetires(p, actif.fin) : [];
  const finPossible = aDesJoursMuscu(p) || aDesJoursMarche(p);
  const img = sportImage(sportDuProgramme(p), femme, 1);
  // la prochaine séance (tes jours, ton matériel, tes douleurs et tes modules appliqués), ou le jour 1 avant de commencer
  const iProchain = enCours && actif ? prochainJour(actif)?.index ?? 0 : 0;
  const jBrutProchain = p.jours[iProchain];
  const jProchain = jourPourToi(jBrutProchain, materiel, regions, machines, enCours ? actif?.remplacements : null, ctxFin);
  const titreProchain = traduire(jProchain.titre);
  const message = enCours && actif ? messageCoach({ programme: p, actif, jours, prochaineSeance: titreProchain, femme }) : null;
  // 26 octobre 2026 : la carte dit quel programme, pourquoi cette séance et la suite (lib/v2/programmes/heroJour.ts)
  const hero = enCours && actif && message ? infosHero({ programme: p, actif, jour: jProchain, jours, message, semaine }) : null;
  const infosDuJour = (j: typeof jProchain) =>
    j.exos.length && !j.rounds && !j.cardio
      ? `${traduirePluriel(j.exos.length, j.exos.length > 1, '{0} exercice', '{0} exercices', j.exos.length)} · ${traduire('{0} min', p.dureeMin)}`
      : resumeDuJour(j, semaine);
  const pastilleCoach = !message
    ? ''
    : message.etat === 'rattrape'
      ? traduire('On rattrape aujourd’hui')
      : message.etat === 'repos'
        ? traduire('Jour de repos')
        : message.etat === 'fait'
          ? traduire('Séance faite')
          : traduire('Aujourd’hui');
  // les trois tuiles : en cours, tes chiffres ; avant de commencer, ceux du programme
  const tuiles: Tuile[] = enCours && actif
    ? [
        { label: traduire('Semaine'), valeur: String(semaineDuProgramme(actif)), sur: String(p.semaines) },
        { label: traduire('Séances'), valeur: String(faitsCetteSemaine(actif)), sur: String(jours.length), accessibilityLabel: traduire('{0} séances sur {1} cette semaine', faitsCetteSemaine(actif), jours.length) },
        tuileCharge(gainMoyen(progresDesCharges(p, trainings, actif.debut)), pal, () => {
          if (progresY.current !== null) defilement.current?.scrollTo({ y: Math.max(0, progresY.current - insets.top - 8), animated: true });
        }),
      ]
    : [
        { label: traduire('Semaines'), valeur: String(p.semaines) },
        { label: traduire('Par semaine'), valeur: String(p.joursParSemaine), unite: traduire('j') },
        { label: traduire('Séance'), valeur: String(p.dureeMin), unite: traduire('min') },
      ];

  const lancerJour = (jourId: string, express?: number) => {
    const j = p.jours.find((x) => x.id === jourId);
    if (!j) return;
    tap();
    const r = routeDuJour(p, j, semaine);
    router.push({ pathname: r.pathname as any, params: express ? { ...r.params, express: String(express) } : r.params });
  };

  // pas le temps : la seance raccourcie, avec ce qui est garde et ce qui est reporte, avant de commencer
  const proposerExpress = (index: number, minutes: number) => {
    const j = p.jours[index];
    // le meme calcul que la seance lancee (app/seance/muscu.tsx) : ton materiel et tes douleurs d'abord, puis l'express
    const protege = jourPourToi(j, materiel, regions, machines, enCours ? actif?.remplacements : null, ctxFin);
    const x = seanceExpress(protege.exos, minutes);
    const garde = x.exos.map((e) => traduire('{0} : {1} séries', traduire(nomFr(e.nom)), e.series)).join('\n');
    const reporte = x.reportes.length ? `\n\n${traduire('À faire une autre fois : {0}.', x.reportes.map((n) => traduire(nomFr(n))).join(', '))}` : '';
    appAlert(traduire('Séance express, {0} min', minutes), `${garde}${reporte}\n\n${traduire('Moins de séries reste utile : c’est mieux que de sauter la séance.')}`, [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Commencer'), onPress: () => lancerJour(j.id, minutes) },
    ]);
  };

  const demarrer = async (fin?: FinSeance) => {
    const a = await demarrerProgramme(p.id, jours, fin);
    lancerJour(p.jours[a?.prochain ?? 0].id);
  };

  const commencerProgramme = async () => {
    // la fin de seance est demandee une fois, avant la premiere seance
    const go = async () => {
      if (finPossible) setFinOuverte('depart');
      else await demarrer();
    };
    if (actif && actif.id !== p.id) {
      const ancien = programmeParId(actif.id);
      appAlert(traduire('Changer de programme ?'), traduire('Tu suis « {0} ». Tes séances déjà faites restent dans ton historique.', traduire(ancien?.titre ?? '')), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Changer'), onPress: () => void go() },
      ]);
      return;
    }
    await go();
  };

  const arreter = () => {
    appAlert(traduire('Arrêter ce programme ?'), traduire('Tes séances déjà faites restent dans ton historique.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Arrêter'), style: 'destructive', onPress: () => void arreterProgramme() },
    ]);
  };

  // la seance choisie s'ouvre ; le programme n'avance que si tu l'enregistres
  const faireCeJour = (index: number) => lancerJour(p.jours[index].id);

  return (
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      <ScrollView ref={defilement} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: insets.bottom + 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* 26 octobre 2026 : maquette D aux couleurs de E (Houari : « je préfère D mais avec les couleurs de E ») */}
        <EnTeteRond salut={salutation(nom)} titre={enCours ? traduire('Ton programme') : traduire('Programme')} droite={etoile} repli="/programmes" />

        {/* 1. LA SÉANCE DU JOUR EN GRAND : le nom, les muscles, « Commencer » ; avant de commencer, le programme */}
        {enCours && message ? (
          <HeroJour
            pastille={pastilleCoach}
            nom={nomCourt(titreProchain)}
            muscles={musclesDuJour(titreProchain, jProchain.exos)}
            infos={infosDuJour(jProchain)}
            {...(hero ? { ligne: hero.ligne, pourquoi: hero.pourquoi, ensuite: hero.ensuite, ajouts: hero.ajouts } : {})}
            image={img}
            bouton={
              message.seanceDuJour
                ? { label: traduire('Commencer'), onPress: () => faireCeJour(iProchain), accessibilityLabel: `${traduire('Commencer')}, ${titreProchain}` }
                : { label: traduire('Faire maintenant'), discret: true, onPress: () => faireCeJour(iProchain), accessibilityLabel: traduire('Faire la prochaine séance maintenant') }
            }
          />
        ) : (
          <HeroJour
            pastille={traduire(libelleNiveau(p.niveau))}
            nom={traduire(p.titre)}
            petitNom
            muscles={traduire(p.accroche)}
            infos={`${traduire(libelleMateriel(p.materiel))} · ${traduirePluriel(p.semaines, p.semaines > 1, '{0} semaine', '{0} semaines', p.semaines)}`}
            image={img}
            bouton={{ label: traduire('Commencer'), onPress: () => void commencerProgramme(), accessibilityLabel: traduire('Commencer ce programme') }}
          />
        )}

        {/* 2. TES CHIFFRES : semaine, séances de la semaine, charge (moyenne réelle de tes gains) */}
        <TuilesStats tuiles={tuiles} />

        {/* 3. TA SEMAINE : fait, prochaine séance, repos */}
        <SemaineRonds ronds={rondsDeLaSemaine(p, enCours ? actif : null, jours)} />

        {/* 4. AU PROGRAMME : les exercices de la prochaine séance, détails d'un toucher */}
        <TitreSection titre={traduire('Au programme')} action={traduire('Tout voir')} onAction={() => { if (ouvert !== jProchain.id) ouvrirJour(jProchain.id, false); else montrer(jProchain.id); }} />
        {jProchain.exos.length ? (
          <View style={{ gap: 10 }}>
            {jProchain.exos.map((e, k) => (
              <LigneExo
                key={`prochain${e.nom}${k}`}
                carte
                k={k}
                e={e}
                premier={k === 0}
                raison={e.remplace && materiel && !e.zone ? raisonRemplacement(e.remplace, materiel) : ''}
                onChanger={enCours && k < jBrutProchain.exos.length ? () => { tap(); setAChanger({ jourId: jProchain.id, index: k, muscle: jBrutProchain.exos[k]?.muscle ?? e.muscle, original: jBrutProchain.exos[k]?.nom ?? e.nom }); } : undefined}
                onRevenir={enCours && e.perso ? () => { tap(); void remplacerExercice(jProchain.id, k, null); } : undefined}
              />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pal.carte, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14 }}>
            <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: teinteExo(pal, 0).fond, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={jProchain.rounds ? 'glove' : 'steps'} size={24} color={teinteExo(pal, 0).encre} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="extraBold" color={pal.texte}>{titreProchain}</Ink>
              <Ink size={12} weight="bold" color={pal.texte2}>{resumeDuJour(jProchain, semaine)}</Ink>
            </View>
          </View>
        )}

        {/* 5. LE CONSEIL DU COACH : la règle de progression, « Comment le suivre » en entier d'un toucher */}
        <CarteConseil principes={p.principes} />

        <ChoixJours
          jours={jours}
          prevus={p.joursParSemaine}
          onChange={(d) => {
            setJours(d);
            if (enCours) void enregistrerJours(d);
          }}
        />

        {enCours && actif && finPossible ? <CarteFinDeSeance fin={actif.fin} femme={femme} onPress={() => setFinOuverte('page')} /> : null}

        {enCours && actif ? <RappelSeance programme={p} actif={actif} jours={jours} /> : null}

        {enCours && actif ? (() => {
          const sem = semaineDuProgramme(actif);
          const reg = regularite(p, actif, sem);
          const charges = progresDesCharges(p, trainings, actif.debut).slice(0, 6);
          const corps = corpsDepuis(actif.debut, pesees, mesures);
          const kg = (v: number) => (unite === 'lb' ? traduire('{0} lb', fmtNum(saisieDepuisKg(v, unite))) : traduire('{0} kg', fmtNum(v)));
          return (
            <>
              <View onLayout={(ev) => { progresY.current = ev.nativeEvent.layout.y; }}>
                <SectionTitle title={traduire('Tes progrès')} sub={traduire('depuis le début du programme, semaine {0}', sem)} />
              </View>
              <Glass style={{ gap: 12, backgroundColor: pal.carte, borderColor: 'transparent' }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Stat value={String(actif.faits.filter((f) => f.date >= actif.debut).length)} label={traduire('Séances faites')} />
                  {reg ? <Stat value={`${Math.round((reg.faites / reg.prevues) * 100)}`} unit="%" label={traduire('Régularité')} /> : null}
                </View>
                {reg ? <Ink size={12} color={c.textMuted}>{traduire('{0} séances sur {1} prévues pendant les semaines terminées.', reg.faites, reg.prevues)}</Ink> : null}
                {corps.poidsDebut !== null && corps.poidsActuel !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={14} weight="extraBold">{traduire('Poids, moyenne de la semaine')}</Ink>
                      <Ink size={12} color={c.textSecondary}>{`${kg(corps.poidsDebut)} → ${kg(corps.poidsActuel)}`}</Ink>
                    </View>
                    <Ink size={16} weight="black" color={c.textSecondary}>{`${corps.poidsActuel - corps.poidsDebut > 0 ? '+' : ''}${fmtNum(Math.round((saisieDepuisKg(corps.poidsActuel, unite) - saisieDepuisKg(corps.poidsDebut, unite)) * 10) / 10)}`}</Ink>
                  </View>
                ) : null}
                {corps.tailleDebut !== null && corps.tailleActuelle !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={14} weight="extraBold">{traduire('Tour de taille')}</Ink>
                      <Ink size={12} color={c.textSecondary}>{traduire('{0} cm → {1} cm', fmtNum(corps.tailleDebut), fmtNum(corps.tailleActuelle))}</Ink>
                    </View>
                    <Ink size={16} weight="black" color={corps.tailleActuelle < corps.tailleDebut ? c.accent : c.textSecondary}>{`${corps.tailleActuelle - corps.tailleDebut > 0 ? '+' : ''}${fmtNum(Math.round((corps.tailleActuelle - corps.tailleDebut) * 10) / 10)} cm`}</Ink>
                  </View>
                ) : (
                  <Pressable onPress={() => { tap(); router.push('/measurements' as any); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Ink size={13} weight="extraBold" color={c.accent}>{traduire('Mesure ton tour de taille chaque semaine : c’est là que le résultat se voit en premier.')}</Ink>
                  </Pressable>
                )}
                {charges.length > 0 ? (
                  charges.map((x, k) => (
                    <View key={x.nom} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: k === 0 ? 0 : 1, borderColor: c.divider }}>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Ink size={14} weight="extraBold" numberOfLines={1}>{traduire(nomFr(x.nom))}</Ink>
                        <Ink size={12} color={c.textSecondary}>{`${kg(x.debutKg)} → ${kg(x.actuelKg)}`}</Ink>
                      </View>
                      <Ink size={16} weight="black" color={x.gainPct > 0 ? pal.vert : c.textSecondary}>{x.gainPct > 0 ? `+${x.gainPct} %` : `${x.gainPct} %`}</Ink>
                    </View>
                  ))
                ) : (
                  <Ink size={13} color={c.textSecondary}>{traduire('Tes charges apparaîtront ici après deux séances sur un même exercice.')}</Ink>
                )}
              </Glass>
            </>
          );
        })() : null}

        <SectionTitle title={traduire('Les séances')} sub={traduire('Touche une séance pour voir ses exercices')} action={traduire('Ma salle')} onAction={() => setSalleOpen(true)} />
        {enCours && p.jours.some((x) => x.exos.length) ? <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: -6 }}>{traduire('Un exercice ne te va pas ? Touche « Changer » pour en choisir un autre.')}</Ink> : null}
        {p.jours.some((x) => x.exos.length) ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ChoisirCharge tuile />
            <CartePoidsDeDepart tuile />
          </View>
        ) : null}
        {p.jours.map((jBrut, index) => {
          const j = jourPourToi(jBrut, materiel, regions, machines, enCours ? actif?.remplacements : null, ctxFin);
          const estProchain = enCours && actif!.prochain === index;
          const deplie = ouvert === j.id;
          if (retires.includes(j.id)) {
            // seance de marche retiree par ta fin de seance : visible, mais sautee
            return (
              <Glass key={j.id} onPress={() => setFinOuverte('page')} label={traduire(j.titre)} style={{ gap: 2, opacity: 0.6, backgroundColor: pal.carte, borderColor: 'transparent' }}>
                <Ink size={17} weight="black" tight>{traduire('Jour {0}, {1}', index + 1, traduire(j.titre))}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire('Retirée de ton programme. Touche pour la remettre.')}</Ink>
              </Glass>
            );
          }
          return (
            <View
              key={j.id}
              onLayout={(ev) => {
                positions.current[j.id] = ev.nativeEvent.layout.y;
                if (aMontrer.current === j.id) montrer(j.id);
              }}
            >
            <Glass style={{ gap: 12, backgroundColor: pal.carte, borderRadius: 22, borderColor: estProchain ? pal.indigo : 'transparent', borderWidth: estProchain ? 1.5 : 1 }}>
              <Pressable
                onPress={() => ouvrirJour(j.id, deplie)}
                accessibilityRole="button"
                accessibilityState={{ expanded: deplie }}
                accessibilityLabel={`${traduire('Jour {0}, {1}', index + 1, traduire(j.titre))}. ${resumeDuJour(j, semaine)}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: estProchain ? pal.indigo : pal.teinte, alignItems: 'center', justifyContent: 'center' }}>
                  <Ink size={17} weight="black" color={estProchain ? c.onDark : pal.accent}>{String(index + 1)}</Ink>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  {estProchain ? <Ink size={11} weight="extraBold" color={c.accent} style={{ letterSpacing: 0.4 }}>{traduire('PROCHAINE SÉANCE')}</Ink> : null}
                  <Ink size={17} weight="black" tight>{traduire(j.titre)}</Ink>
                  <Ink size={13} color={c.textSecondary}>{resumeDuJour(j, semaine)}</Ink>
                </View>
                <View style={{ transform: [{ rotate: deplie ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={18} color={c.textMuted} /></View>
              </Pressable>
              {deplie ? (
                <>
                  {j.exos.map((e, k) => (
                    <LigneExo
                      key={`${e.nom}${k}`}
                      e={e}
                      premier={k === 0}
                      raison={e.remplace && materiel && !e.zone ? raisonRemplacement(e.remplace, materiel) : ''}
                      onChanger={enCours && k < jBrut.exos.length ? () => { tap(); setAChanger({ jourId: j.id, index: k, muscle: jBrut.exos[k]?.muscle ?? e.muscle, original: jBrut.exos[k]?.nom ?? e.nom }); } : undefined}
                      onRevenir={enCours && e.perso ? () => { tap(); void remplacerExercice(j.id, k, null); } : undefined}
                    />
                  ))}
                  {j.finCardio ? (
                    <View style={{ paddingTop: 10, borderTopWidth: j.exos.length ? 1 : 0, borderColor: c.divider, gap: 3 }}>
                      <Ink size={12} weight="extraBold" color={c.accent}>{traduire('PUIS, EN FIN DE SÉANCE')}</Ink>
                      <Ink size={15} weight="extraBold">{traduire('{0} min de marche inclinée', j.finCardio.minutes)}</Ink>
                      <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(j.finCardio.consigne)}</Ink>
                    </View>
                  ) : null}
                  {j.rounds
                    ? j.rounds.consignes.map((txt, k) => (
                        <View key={k} style={{ paddingTop: 10, borderTopWidth: k === 0 ? 0 : 1, borderColor: c.divider, flexDirection: 'row', gap: 10 }}>
                          <Ink size={13} weight="black" color={c.accent} style={{ width: 62 }}>{traduire('Round {0}', k + 1)}</Ink>
                          <Ink size={14} style={{ flex: 1 }}>{traduire(txt)}</Ink>
                        </View>
                      ))
                    : null}
                  {j.rounds ? <Ink size={12} color={c.textMuted}>{traduire('Repos de {0} entre les rounds.', libelleRepos(j.rounds.reposSec))}</Ink> : null}
                  {j.cardio ? (
                    <View style={{ gap: 4 }}>
                      {j.cardio.semaines?.length ? <Ink size={12} weight="extraBold" color={c.accent}>{traduire('SEMAINE {0}', Math.min(semaine, j.cardio.semaines.length))}</Ink> : null}
                      <Ink size={14} style={{ lineHeight: 20 }}>{traduire(cardioDeLaSemaine(j.cardio, semaine).consigne)}</Ink>
                      {j.cardio.semaines?.length && !enCours ? <Ink size={12} color={c.textMuted}>{traduire('La sortie change chaque semaine : YOROI te donne celle de ta semaine.')}</Ink> : null}
                    </View>
                  ) : null}
                  {enCours ? (
                    <BigButton label={estProchain ? traduire('Commencer cette séance') : traduire('Faire cette séance maintenant')} icon="play" tone={estProchain ? 'accent' : 'soft'} onPress={() => faireCeJour(index)} />
                  ) : null}
                  {enCours && j.exos.length && dureeEstimee(j.exos) > DUREES_EXPRESS[0] ? (
                    <View style={{ gap: 6 }}>
                      <Ink size={12} weight="extraBold" color={c.textSecondary}>{traduire('Pas le temps ? Séance express :')}</Ink>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {DUREES_EXPRESS.filter((m) => m < dureeEstimee(j.exos)).map((m) => (
                          <Chip key={m} label={traduire('{0} min', m)} on={false} onPress={() => proposerExpress(index, m)} />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
            </Glass>
            </View>
          );
        })}

        {/* « Prouvé par N études » : en bas, replié (Houari : « mets ça en bas, ça marche ») */}
        {!enCours ? <BigButton label={traduire('Commencer ce programme')} icon="play" onPress={() => void commencerProgramme()} /> : null}

        {/* « Prouvé par N études » : une ligne discrète tout en bas, « Voir » ouvre le détail */}
        <LigneEtudes sources={p.sources} />

        <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
          {traduire('Si tu as un problème de santé, une douleur ou une blessure, demande l’avis d’un médecin avant de commencer. Le questionnaire PAR-Q+ t’aide à savoir si c’est nécessaire.')}
        </Ink>
        {enCours ? (
          <Pressable onPress={arreter} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={14} weight="extraBold" color={c.danger}>{traduire('Arrêter ce programme')}</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      <ExercisePicker
        visible={!!aChanger}
        onClose={() => setAChanger(null)}
        onPick={(nom) => {
          const x = aChanger;
          setAChanger(null);
          if (x) void remplacerExercice(x.jourId, x.index, nom, x.original);
        }}
        history={historique.map}
        recent={historique.recent}
        already={[]}
        muscleDepart={aChanger?.muscle}
        titre={traduire('Changer l’exercice')}
      />
      <MaSalle visible={salleOpen} onClose={() => setSalleOpen(false)} />
      <FeuilleFinDeSeance
        visible={finOuverte !== null}
        programme={p}
        valeur={finOuverte === 'page' && enCours ? actif?.fin : null}
        bouton={finOuverte === 'depart' ? traduire('Commencer le programme') : traduire('Valider')}
        onClose={() => setFinOuverte(null)}
        onValider={(f) => {
          const mode = finOuverte;
          setFinOuverte(null);
          if (mode === 'depart') void demarrer(f);
          else void enregistrerFin(f);
        }}
      />
    </View>
  );
}

/**
 * Un exercice, une ligne (26 octobre 2026, Houari : « trop de texte, ça rend fou ») :
 * le nom, « 3 × 8 à 12 », le repos et les muscles en petites puces. La réserve, la consigne,
 * le remplacement, « Changer » et la technique s'ouvrent d'un toucher sur la ligne.
 */
function LigneExo({ e, premier, raison, onChanger, onRevenir, carte, k = 0 }: { e: ExoProtege & ExoPerso & ExoModule; premier: boolean; raison: string; onChanger?: () => void; onRevenir?: () => void; carte?: boolean; k?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const [deplie, setDeplie] = useState(false);
  const [technique, setTechnique] = useState(false);
  const aFiche = !!ficheDe(e.nom);
  const reps = e.repsMin === e.repsMax ? `${e.repsMin}` : traduire('{0} à {1}', e.repsMin, e.repsMax);
  const volume = e.secondes ? `${e.series} × ${reps} s` : `${e.series} × ${reps}`;
  // la phrase complète reste pour le lecteur d'écran
  const phrase = e.secondes
    ? traduire('{0} séries de {1} secondes, repos {2}', e.series, reps, libelleRepos(e.reposSec))
    : traduire('{0} séries de {1} répétitions, repos {2}', e.series, reps, libelleRepos(e.reposSec));
  const g = guideCharge(e);
  const mu = musclesDeExo(e.nom);
  const precision = PRECISION_EXO[e.nom];
  const liste = (l: string[]) => l.map((x) => traduire(x)).join(', ');
  // un signe discret sur la ligne quand l'exercice a été changé, ajouté, ou ne se fait pas
  const signe = e.impossible
    ? <Pastille texte={traduire('À passer')} danger />
    : e.perso
      ? <Pastille texte={traduire('Remplacé par toi')} accent />
      : e.module
        ? <Pastille texte={traduire('Ajouté')} accent />
        : e.fin
        ? <Pastille texte={traduire('Ajouté en fin de séance')} accent />
        : e.remplace
          ? <Pastille texte={traduire('Adapté')} accent />
          : null;
  const details = deplie ? (
    <View style={{ gap: 8, padding: 14, borderRadius: 16, backgroundColor: carte ? pal.page : c.fillSoft }}>
      {carte && demoDe(e.nom) ? <ExoDemo nom={e.nom} taille={88} arrondi={16} /> : null}
      {g.niveau === 'tenu' ? null : (
        <Ink size={13} weight="bold" style={{ lineHeight: 19 }}>
          {g.libelle ? traduire('Charge : {0}. Garde {1} répétitions en réserve.', g.libelle, traduire(g.reserve)) : traduire('Garde {0} répétitions en réserve.', traduire(g.reserve))}
        </Ink>
      )}
      {mu && (mu.principaux.length > 2 || mu.aussi.length) ? (
        <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>
          {traduire('Travaille : {0}', liste(mu.principaux))}
          {mu.aussi.length ? `. ${traduire('Aussi : {0}', liste(mu.aussi))}` : ''}
        </Ink>
      ) : null}
      {precision ? <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(precision)}</Ink> : null}
      {e.conseil && !e.remplace ? <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(e.conseil)}</Ink> : null}
      <NoteMateriel e={e} raison={raison} />
      {onChanger || (onRevenir && e.perso) || aFiche ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
          {aFiche ? <ActionExo label={traduire(technique ? 'Masquer la technique' : 'Voir la technique')} onPress={() => { tap(); setTechnique((o) => !o); }} etat={technique} /> : null}
          {onChanger ? <ActionExo label={traduire('Changer')} onPress={onChanger} accessibilityLabel={traduire('Changer {0}', traduire(nomFr(e.nom)))} /> : null}
          {onRevenir && e.perso ? <ActionExo label={traduire('Revenir à {0}', traduire(nomFr(e.perso)))} onPress={onRevenir} /> : null}
        </View>
      ) : null}
      {technique && aFiche ? <FicheTechnique nom={e.nom} /> : null}
    </View>
  ) : null;

  // 26 octobre 2026, maquette D : « Au programme », une carte par exercice, carré d'icône coloré, séries en grand
  if (carte) {
    const t = teinteExo(pal, k);
    const muscle = mu?.principaux[0] ? traduire(mu.principaux[0]) : traduire(e.muscle.charAt(0) + e.muscle.slice(1).toLocaleLowerCase());
    return (
      <View style={{ backgroundColor: pal.carte, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, gap: 10, shadowColor: pal.indigo, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1 }}>
        <Pressable
          onPress={() => { tap(); setDeplie((o) => !o); }}
          accessibilityRole="button"
          accessibilityState={{ expanded: deplie }}
          accessibilityLabel={`${traduire(nomFr(e.nom))}. ${phrase}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.75 : 1 })}
        >
          <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={e.secondes ? 'timer' : 'dumbbell'} size={24} color={t.encre} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Ink size={15} weight="extraBold" color={pal.texte} numberOfLines={2}>{traduire(nomFr(e.nom))}</Ink>
            <Ink size={12} weight="bold" color={pal.texte2} numberOfLines={1}>{`${muscle} · ${traduire('{0} de repos', libelleRepos(e.reposSec))}`}</Ink>
            {signe ? <View style={{ flexDirection: 'row', marginTop: 2 }}>{signe}</View> : null}
          </View>
          <Ink size={17} weight="black" color={pal.accent} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: '34%' }}>{volume}</Ink>
        </Pressable>
        {details}
      </View>
    );
  }

  return (
    <View style={{ paddingTop: premier ? 0 : 12, borderTopWidth: premier ? 0 : 1, borderColor: c.divider, gap: 10 }}>
      <Pressable
        onPress={() => { tap(); setDeplie((o) => !o); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: deplie }}
        accessibilityLabel={`${traduire(nomFr(e.nom))}. ${phrase}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, opacity: pressed ? 0.75 : 1 })}
      >
        {demoDe(e.nom) ? <ExoDemo nom={e.nom} taille={56} arrondi={14} /> : null}
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <Ink size={15} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{traduire(nomFr(e.nom))}</Ink>
            <Ink size={15} weight="black" color={c.accent}>{volume}</Ink>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Pastille icone="timer" texte={libelleRepos(e.reposSec)} />
            {mu ? mu.principaux.slice(0, 2).map((m) => <Pastille key={m} texte={traduire(m)} />) : null}
            {signe}
          </View>
        </View>
        <View style={{ transform: [{ rotate: deplie ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={15} color={c.textMuted} /></View>
      </Pressable>
      {details}
    </View>
  );
}

/** Petit bouton d'action sous un exercice déplié */
function ActionExo({ label, onPress, etat, accessibilityLabel }: { label: string; onPress: () => void; etat?: boolean; accessibilityLabel?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={etat === undefined ? undefined : { expanded: etat }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.accentTint : c.surface, borderWidth: 1, borderColor: c.accent })}
    >
      <Ink size={13} weight="extraBold" color={c.accent}>{label}</Ink>
    </Pressable>
  );
}

/** « Remplace Développé couché (barre), sans barre et disques » ; « Matériel manquant » si rien ne remplace */
function NoteMateriel({ e, raison }: { e: ExoProtege; raison: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (e.zone && e.impossible) return <Ink size={12} weight="bold" color={c.danger}>{traduire('Tu as signalé une douleur : {0}. Passe cet exercice, et demande l’avis d’un professionnel si elle dure.', traduire(LIBELLE_REGION[e.zone]))}</Ink>;
  if (e.zone && e.remplace) return <Ink size={12} weight="bold" color={c.accent}>{traduire('Remplace {0} pour ménager {1}', traduire(nomFr(e.remplace)), traduire(LIBELLE_REGION[e.zone]))}</Ink>;
  if (e.remplace) {
    return <Ink size={12} weight="bold" color={c.accent}>{raison ? `${traduire('Remplace {0}', traduire(nomFr(e.remplace)))} · ${traduire(raison)}` : traduire('Remplace {0}', traduire(nomFr(e.remplace)))}</Ink>;
  }
  if (e.impossible) return <Ink size={12} weight="bold" color={c.danger}>{traduire('Ton matériel ne permet pas cet exercice : passe le, ou change Mon matériel.')}</Ink>;
  return null;
}
