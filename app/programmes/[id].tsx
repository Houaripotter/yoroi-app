/**
 * Detail d'un programme (24 octobre 2026) : pour qui, comment le suivre, chaque jour avec ses exercices,
 * et les etudes sur lesquelles il repose. Commencer, changer de programme ou l'arreter se fait ici.
 * 26 octobre 2026 (Houari : « on se perd, il y a deux façons d'afficher les séances ») : une seule façon de parcourir
 * les séances, des pastilles Upper A, Lower A... au dessus des mêmes cartes d'exercices ; la prochaine séance est
 * choisie au départ. Les guides (charge, poids de départ) sont regroupés sous le conseil du coach.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { illustration } from '@/components/yoroi/v2/stickers';
import { OMBRE_CARTE, carteBlanche, tonDuRang } from '@/components/yoroi/v2/seance/pastel';
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
import { LIBELLE_REGION, regionsDesBlessures, unirRegions } from '@/lib/v2/programmes/blessures';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import { chargerProgrammesPerso } from '@/lib/v2/programmes/monProgramme';
import { QuestionsCoach } from '@/components/yoroi/v2/programmes/QuestionsCoach';
import { jourPourToi } from '@/lib/v2/programmes/perso';
import type { ExoPerso } from '@/lib/v2/programmes/perso';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { MaSalle } from '@/components/yoroi/v2/programmes/MaSalle';
import { BoutonRond, CarteConseil, EnTeteRond, HeroJour, LigneEtudes, Pastille, SemaineRonds, TitreSection, TuilesStats, musclesDuJour, nomCourt, rondsDeLaSemaine, salutation, tuileCharge, usePaletteProgramme, type Tuile } from '@/components/yoroi/v2/programmes/Habillage';
import { buildExerciseHistory } from '@/lib/v2/seance/history';
import type { ExoProtege, Region } from '@/lib/v2/programmes/blessures';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { FicheTechnique } from '@/components/yoroi/v2/programmes/FicheTechnique';
import { ficheDe } from '@/lib/v2/programmes/fiches';
import { DUREES_EXPRESS, dureeEstimee, seanceExpress } from '@/lib/v2/programmes/express';
import { demoDe } from '@/lib/v2/programmes/demos';
import { PROGRAMME_CHANGED_EVENT, arreterProgramme, basculerFavori, chargerFavoris, chargerMachines, chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerFin, faitsCetteSemaine, prochainJour, remplacerExercice, joursConseilles, joursDuProgramme, planEffectif, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { joursDuPlan, planParDefaut } from '@/lib/v2/programmes/planJours';
import { lireProfilCoach } from '@/lib/v2/programmes/profilCoach';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { infosHero } from '@/lib/v2/programmes/heroJour';
import { TesJours, TesJoursEnCours } from '@/components/yoroi/v2/programmes/TesJours';
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
  // 27 octobre 2026 : ton programme construit (« Je construis le mien ») est lu du téléphone, puis trouvé comme les autres
  const [persoLu, setPersoLu] = useState(0);
  const perso = estProgrammePerso(typeof id === 'string' ? id : undefined);
  useEffect(() => {
    if (!perso) return;
    let vivant = true;
    const relire = () => { void chargerProgrammesPerso().then(() => { if (vivant) setPersoLu((n) => n + 1); }); };
    relire();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, relire);
    return () => { vivant = false; sub.remove(); };
  }, [perso]);
  const p = useMemo(() => programmeParId(typeof id === 'string' ? id : undefined), [id, persoLu]); // eslint-disable-line react-hooks/exhaustive-deps
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);
  const [nom, setNom] = useState('');
  // 26 octobre 2026, maquette D aux couleurs de E (Habillage.tsx)
  const pal = usePaletteProgramme();
  // la séance affichée sous les pastilles ; null : la prochaine
  const [jourVu, setJourVu] = useState<string | null>(null);
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
  const defilement = useRef<ScrollView>(null);
  // la tuile « Charge » descend jusqu'à « Tes progrès »
  const progresY = useRef<number | null>(null);
  // 25 octobre 2026 : tes jours d'entraînement (0 = lundi), choisis avant de commencer, modifiables ensuite
  const [jours, setJours] = useState<number[]>(() => joursConseilles(p?.joursParSemaine ?? 3));
  useEffect(() => {
    if (p && actif?.id === p.id) setJours(joursDuProgramme(actif, p));
  }, [p, actif]);
  // 27 octobre 2026 : avant de commencer, le jour de chaque séance (Tes jours, planJours.ts) ; tes jours de l'onboarding
  // s'ils sont aussi nombreux que les séances, sinon les jours conseillés
  const [planAvant, setPlanAvant] = useState<number[] | null>(() => (p ? planParDefaut(p, null, joursConseilles) : null));
  useEffect(() => {
    if (!p) return;
    let vivant = true;
    lireProfilCoach()
      .then((pc) => {
        const pl = planParDefaut(p, pc.jours, joursConseilles);
        if (!vivant || !pl || pc.jours.length === 0) return;
        if (joursDuPlan(pl).join(',') !== [...pc.jours].sort((a, b) => a - b).join(',')) return;
        setPlanAvant(pl);
        setJours(joursDuPlan(pl));
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [p]);

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

  if (!p) {
    // ton programme construit pas encore lu : page vide un instant, pas « introuvable »
    if (perso && persoLu === 0) return <View style={{ flex: 1, backgroundColor: c.background }} />;
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingHorizontal: 22 }}>
        <EnTete titre={traduire('Programme introuvable')} repli="/programmes" style={{ marginHorizontal: -22, marginTop: -8 }} />
      </View>
    );
  }

  const enCours = actif?.id === p.id;
  // tes douleurs de l'infirmerie, et celles dites au Guide pour ce programme (27 octobre 2026)
  const regionsVues = unirRegions(regions, enCours ? actif?.douleurs : null);
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
  const jProchain = jourPourToi(jBrutProchain, materiel, regionsVues, machines, enCours ? actif?.remplacements : null, ctxFin);
  const titreProchain = traduire(jProchain.titre);
  // la séance des pastilles : celle que tu as touchée, sinon la prochaine
  const iVuBrut = jourVu ? p.jours.findIndex((x) => x.id === jourVu) : -1;
  const iVu = iVuBrut >= 0 ? iVuBrut : iProchain;
  const jBrutVu = p.jours[iVu];
  const jVu = iVu === iProchain ? jProchain : jourPourToi(jBrutVu, materiel, regionsVues, machines, enCours ? actif?.remplacements : null, ctxFin);
  const message = enCours && actif ? messageCoach({ programme: p, actif, jours, prochaineSeance: titreProchain, femme, fixe: !!planEffectif(actif, p) }) : null;
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
    const protege = jourPourToi(j, materiel, regionsVues, machines, enCours ? actif?.remplacements : null, ctxFin);
    const x = seanceExpress(protege.exos, minutes);
    const garde = x.exos.map((e) => traduire('{0} : {1} séries', traduire(nomFr(e.nom)), e.series)).join('\n');
    const reporte = x.reportes.length ? `\n\n${traduire('À faire une autre fois : {0}.', x.reportes.map((n) => traduire(nomFr(n))).join(', '))}` : '';
    appAlert(traduire('Séance express, {0} min', minutes), `${garde}${reporte}\n\n${traduire('Moins de séries reste utile : c’est mieux que de sauter la séance.')}`, [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Commencer'), onPress: () => lancerJour(j.id, minutes) },
    ]);
  };

  const demarrer = async (fin?: FinSeance) => {
    const a = await demarrerProgramme(p.id, planAvant ? joursDuPlan(planAvant) : jours, fin, undefined, planAvant);
    lancerJour((a ? prochainJour(a)?.jour.id : undefined) ?? p.jours[a?.prochain ?? 0].id);
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
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView ref={defilement} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        {/* 26 octobre 2026 : maquette D aux couleurs de E (Houari : « je préfère D mais avec les couleurs de E ») */}
        <EnTeteRond salut={salutation(nom)} titre={enCours ? traduire('Ton programme') : traduire('Programme')} droite={perso ? undefined : etoile} repli="/programmes" />

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
        <SemaineRonds ronds={rondsDeLaSemaine(p, enCours ? actif : null, planAvant && !enCours ? joursDuPlan(planAvant) : jours, undefined, enCours ? undefined : planAvant)} />

        {/* 27 octobre 2026 : Tes jours, la séance de chaque jour (Push lundi, Pull mardi...), modifiable à tout moment */}
        {/* ton programme construit : ses jours se changent dans « Je construis le mien » */}
        {perso ? (
          <Pressable
            onPress={() => { tap(); router.push({ pathname: '/coach-construire' as any, params: { id: p.id } }); }}
            accessibilityRole="button"
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? pal.teinte : pal.carte }, OMBRE_CARTE]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="black" color={pal.texte}>{traduire('Modifier mon programme')}</Ink>
              <Ink size={12} weight="bold" color={pal.texte2}>{traduire('Tes jours, tes exercices, ton rappel')}</Ink>
            </View>
            <Icon name="chevron" size={16} color={pal.texte3} />
          </Pressable>
        ) : enCours ? (
          <TesJoursEnCours programme={p} />
        ) : (
          <TesJours programme={p} plan={planAvant} jours={jours} onPlan={setPlanAvant} onJours={setJours} />
        )}

        {/* 4. LES SÉANCES : une pastille par séance, les mêmes cartes d'exercices ; la prochaine au départ */}
        <TitreSection titre={traduire('Les séances')} action={traduire('Ma salle')} onAction={() => setSalleOpen(true)} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: -8 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {p.jours.map((jx, index) => {
            const on = jx.id === jVu.id;
            const prochaine = jx.id === jBrutProchain.id;
            const retire = retires.includes(jx.id);
            return (
              <Pressable
                key={jx.id}
                onPress={() => { tap(); setJourVu(jx.id); }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${traduire('Jour {0}, {1}', index + 1, traduire(jx.titre))}${prochaine && enCours ? `, ${traduire('Prochaine séance')}` : ''}`}
                style={({ pressed }) => ({ minHeight: 46, paddingHorizontal: 16, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: on ? c.primary : pressed ? c.fillSubtle : pal.carte, opacity: retire ? 0.55 : 1, ...(on ? {} : OMBRE_CARTE) })}
              >
                {prochaine && enCours ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? '#FFFFFF' : pal.orange }} /> : null}
                <Ink size={14} weight={on ? 'black' : 'extraBold'} color={on ? c.onPrimary : pal.texte} numberOfLines={1}>{nomCourt(traduire(jx.titre))}</Ink>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -6, paddingHorizontal: 4 }}>
          {jVu.id === jBrutProchain.id && enCours ? <Pastille texte={traduire('Prochaine séance')} accent /> : null}
          <Ink size={13} weight="bold" color={pal.texte2} style={{ flex: 1 }} numberOfLines={2}>{`${traduire(jVu.titre)} · ${resumeDuJour(jVu, semaine)}`}</Ink>
        </View>
        {retires.includes(jVu.id) ? (
          <Pressable onPress={() => { tap(); setFinOuverte('page'); }} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? pal.teinte : pal.carte, borderRadius: 22, padding: 14 })}>
            <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: pal.orangeTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="steps" size={24} color={pal.orange} />
            </View>
            <Ink size={14} weight="bold" color={pal.texte} style={{ flex: 1 }}>{traduire('Retirée de ton programme. Touche pour la remettre.')}</Ink>
          </Pressable>
        ) : (
          <View style={{ gap: 10 }}>
            {enCours && jVu.exos.length ? <Ink size={12} weight="bold" color={pal.texte3} style={{ paddingHorizontal: 4 }}>{traduire('Un exercice ne te va pas ? Touche « Changer » pour en choisir un autre.')}</Ink> : null}
            {jVu.exos.map((e, k) => (
              <LigneExo
                key={`${jVu.id}${e.nom}${k}`}
                carte
                k={k}
                e={e}
                premier={k === 0}
                raison={e.remplace && materiel && !e.zone ? raisonRemplacement(e.remplace, materiel) : ''}
                onChanger={enCours && k < jBrutVu.exos.length ? () => { tap(); setAChanger({ jourId: jVu.id, index: k, muscle: jBrutVu.exos[k]?.muscle ?? e.muscle, original: jBrutVu.exos[k]?.nom ?? e.nom }); } : undefined}
                onRevenir={enCours && e.perso ? () => { tap(); void remplacerExercice(jVu.id, k, null); } : undefined}
              />
            ))}
            {jVu.finCardio ? (
              <CarteEnPlus icone="steps" k={1} surtitre={traduire('Puis, en fin de séance')} titre={traduire('{0} min de marche inclinée', jVu.finCardio.minutes)} texte={traduire(jVu.finCardio.consigne)} />
            ) : null}
            {jVu.rounds ? (
              <CarteEnPlus icone="glove" k={0} surtitre={traduire('Repos de {0} entre les rounds.', libelleRepos(jVu.rounds.reposSec))} titre={resumeDuJour(jVu, semaine)}>
                {jVu.rounds.consignes.map((txt, k) => (
                  <View key={k} style={{ flexDirection: 'row', gap: 10, paddingTop: 8, borderTopWidth: k === 0 ? 0 : 1, borderColor: pal.anneau }}>
                    <Ink size={13} weight="black" color={pal.accent} style={{ width: 62 }}>{traduire('Round {0}', k + 1)}</Ink>
                    <Ink size={13} weight="bold" color={pal.texte} style={{ flex: 1 }}>{traduire(txt)}</Ink>
                  </View>
                ))}
              </CarteEnPlus>
            ) : null}
            {jVu.cardio ? (
              <CarteEnPlus
                icone="steps"
                k={2}
                surtitre={jVu.cardio.semaines?.length ? traduire('SEMAINE {0}', Math.min(semaine, jVu.cardio.semaines.length)) : undefined}
                titre={resumeDuJour(jVu, semaine)}
                texte={traduire(cardioDeLaSemaine(jVu.cardio, semaine).consigne)}
                note={jVu.cardio.semaines?.length && !enCours ? traduire('La sortie change chaque semaine : YOROI te donne celle de ta semaine.') : undefined}
              />
            ) : null}
            {enCours ? (
              <BigButton label={iVu === iProchain ? traduire('Commencer cette séance') : traduire('Faire cette séance maintenant')} icon="play" tone={iVu === iProchain ? 'accent' : 'soft'} onPress={() => faireCeJour(iVu)} />
            ) : null}
            {enCours && jVu.exos.length && dureeEstimee(jVu.exos) > DUREES_EXPRESS[0] ? (
              <View style={{ gap: 6 }}>
                <Ink size={12} weight="extraBold" color={pal.texte2}>{traduire('Pas le temps ? Séance express :')}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {DUREES_EXPRESS.filter((m) => m < dureeEstimee(jVu.exos)).map((m) => (
                    <Chip key={m} label={traduire('{0} min', m)} on={false} onPress={() => proposerExpress(iVu, m)} />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* 5. LE CONSEIL DU COACH : la règle de progression, « Comment le suivre » en entier d'un toucher */}
        <CarteConseil principes={p.principes} />

        {/* les guides, regroupés : choisir ta charge, ton poids de départ */}
        {p.jours.some((x) => x.exos.length) ? (
          <View style={{ gap: 10 }}>
            <TitreSection titre={traduire('Guides')} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <ChoisirCharge tuile />
              <CartePoidsDeDepart tuile />
            </View>
          </View>
        ) : null}

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

        {/* « Prouvé par N études » : en bas, replié (Houari : « mets ça en bas, ça marche ») */}
        {!enCours ? <BigButton label={traduire('Commencer ce programme')} icon="play" onPress={() => void commencerProgramme()} /> : null}

        {/* « Prouvé par N études » : une ligne discrète tout en bas, « Voir » ouvre le détail */}
        <LigneEtudes sources={p.sources} />

        {/* 27 octobre 2026 : « Une question ? », venues de l'accueil du coach (poids de départ, séries, charge, ton but) */}
        {p.jours.some((x) => x.exos.length) ? <QuestionsCoach /> : null}

        <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
          {traduire('Si tu as un problème de santé, une douleur ou une blessure, demande l’avis d’un médecin avant de commencer. Le questionnaire PAR Q+ t’aide à savoir si c’est nécessaire.')}
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
    const t = tonDuRang(k);
    const muscle = mu?.principaux[0] ? traduire(mu.principaux[0]) : traduire(e.muscle.charAt(0) + e.muscle.slice(1).toLocaleLowerCase());
    return (
      <View style={[carteBlanche(pal.carte, c.divider), { paddingVertical: 12, paddingHorizontal: 12, gap: 10 }]}>
        <Pressable
          onPress={() => { tap(); setDeplie((o) => !o); }}
          accessibilityRole="button"
          accessibilityState={{ expanded: deplie }}
          accessibilityLabel={`${traduire(nomFr(e.nom))}. ${phrase}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.75 : 1 })}
        >
          {/* 27 octobre 2026 (refonte Pastel) : le numero de l'exercice sur sa pastille pastel */}
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={17} weight="black" color={t.encre}>{String(k + 1)}</Ink>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Ink size={15} weight="extraBold" color={pal.texte} numberOfLines={2}>{traduire(nomFr(e.nom))}</Ink>
            <Ink size={12} weight="bold" color={pal.texte2} numberOfLines={1}>{`${muscle} · ${traduire('{0} de repos', libelleRepos(e.reposSec))}`}</Ink>
            {signe ? <View style={{ flexDirection: 'row', marginTop: 2 }}>{signe}</View> : null}
          </View>
          <Ink size={17} weight="black" color={c.accentText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: '34%' }}>{volume}</Ink>
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

/** Ce qui n'est pas un exercice (fin de séance cardio, rounds, sortie), dans le même style de carte */
function CarteEnPlus({ icone, k, surtitre, titre, texte, note, children }: { icone: 'steps' | 'glove'; k: number; surtitre?: string; titre: string; texte?: string; note?: string; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const pal = usePaletteProgramme();
  const t = tonDuRang(k);
  return (
    <View style={[carteBlanche(pal.carte, theme.colors.divider), { paddingVertical: 12, paddingHorizontal: 14, gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={illustration(icone === 'glove' ? 'gants' : 'sport_marche')} style={{ width: 50, height: 50 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 2 }}>
          {surtitre ? <Ink size={11} weight="extraBold" color={t.encre}>{surtitre}</Ink> : null}
          <Ink size={15} weight="extraBold" color={pal.texte}>{titre}</Ink>
        </View>
      </View>
      {texte ? <Ink size={13} weight="bold" color={pal.texte2} style={{ lineHeight: 19 }}>{texte}</Ink> : null}
      {children}
      {note ? <Ink size={12} color={pal.texte3}>{note}</Ink> : null}
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
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.primary : c.accentTint })}
    >
      <Ink size={13} weight="extraBold" color={c.accentText}>{label}</Ink>
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
