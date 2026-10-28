/**
 * Accueil v2 (vague 36 : simple et concret, environ deux ecrans).
 * De haut en bas : la scene (salutation, rond de profil, lanterne et cloche), les raccourcis du jour
 * (Me peser, Ma seance, Chrono, Eau en un toucher), Ton poids (inchange), puis les blocs reglables dans
 * « Personnaliser l'accueil » : Ta semaine (avec la prochaine et la derniere seance), Ta forme du jour
 * (grille 2 x 2), Ton prochain rendez-vous (seulement s'il y a une competition), Le conseil du jour,
 * Vague 37 : sous l'en-tete, TES OUTILS en gros ronds (Chrono, Objectifs, Carnet, Videos, Records, Combat et
 * competition) a la place de Me peser, Ma seance, Chrono, Eau (la pesee a le bouton +, l'eau se regle depuis sa
 * tuile) ; l'ancien bloc « Tes outils » disparait (doublon) ; en bas, « Ton mois », le calendrier de tes seances.
 * Aucune gamification ici (ni XP ni rang) : elle vit dans le Dojo. Aucun faux exemple grise.
 * Ta photo de profil cerclee, pres de ton prenom dans la scene (SceneHero), est la porte vers Reglages.
 * 15 octobre : plus de bande de nuit sous la scene. La scene descend derriere tes outils et se fond en un degrade
 * court (FonduHorizon) vers le fond de la page ; les pastilles sont posees sur cet horizon, la carte Ton poids suit.
 * 16 octobre soir (Houari : « un truc beau, carré, facile à comprendre ») : sous Ton poids, les blocs deviennent une
 * grille de tuiles regulieres en 2 colonnes, une couleur par domaine (components/yoroi/v2/accueil/Grille.tsx) :
 * ta prochaine seance en grand (avec les suivantes, plus de doublon « À venir »), ta semaine en anneau, ta derniere
 * seance, ta forme du jour, ta competition, le conseil du jour, ton mois en bande de 7 jours. Memes donnees, memes
 * blocs reglables : un bloc cache ou vide et la grille se recompose sans trou.
 * 16 octobre soir : le conseil du jour monte en une ligne entre tes outils et Ton poids ; ton mois redevient un
 * calendrier complet ; la tuile competition dit d'ou elle vient.
 * 16 octobre nuit : sans competition a venir, rien ; le conseil devient une ligne de texte legere (12 points de
 * decalage pour Ton poids, au lieu de 60) ; quatre blocs en plus (Personnaliser l'accueil).
 * 17 octobre : la citation du jour prend un vrai traitement (filets, losange de Takeda en or, police de titre) ;
 * Activite, Coeur au repos, Records et regularite, Ta prochaine pesee et Avant apres sont affiches par defaut,
 * avec un etat vide utile sans donnee (lib/v2/accueil/disposition.ts : migration une seule fois).
 * 17 octobre midi : la citation choisit son style (pinceau par defaut, Personnaliser) et se place au milieu entre tes
 * outils et Ton poids ; Activite et Coeur au repos deviennent un seul rectangle pleine largeur, « Ta santé
 * aujourd'hui » (pas, calories, distance, exercice, FC, FC au repos, SpO2, respiration, sommeil, debout).
 * 19 octobre 2026 (Houari : « on ne voit pas la scene ») : la scene est une fenetre aux coins arrondis, libre en haut
 * et au centre, ton salut en bandeau compact en bas ; tes outils commencent 8 points sous elle (ECART_SOUS_SCENE),
 * sur le fond de la page, et ne la recouvrent plus. Rien ne bouge entre tes outils, la citation et Ton poids : les
 * decorations de saison (lib/v2/saisons/geometrie.ts) restent a leur place, seuls leurs seuils de defilement suivent.
 * 27 octobre 2026 (refonte Pastel, maquette Pastel-Final-Accueil choisie par Houari) : de haut en bas, sur le fond de la
 * page, ta photo, la date et ton salut, la lanterne et la cloche dans des ronds blancs (EnTeteAccueil) ; la scene dans
 * une carte arrondie (SceneHero carte, son decor de saison dedans) ; Ton poids ; tes outils ; Ta semaine (CarteSemaine,
 * elle remplace la demi tuile Ta semaine de la grille) ; puis le reste, comme avant. Tout a 16 points des bords.
 * Avant : _archive_ancien_design_2026-10-09/refonte_phase2_2026-10-27/app/(tabs)/index.tsx.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { INK_TAB_BAR_SPACE } from '@/components/yoroi/v2/InkTabBar';
import { useWeightData } from '@/lib/v2/useWeightData';
import { useJoursPrevus } from '@/lib/v2/seances/joursPrevus';
import { objectifVise } from '@/lib/v2/espace';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { useSante } from '@/lib/v2/sante/useSante';
import { DEFAULT_GOALS } from '@/lib/v2/sante/data';
import { activiteAvecSeances } from '@/lib/v2/accueil/enPlus';
import { useAccueil } from '@/lib/v2/accueil/useAccueil';
import { localISO } from '@/lib/v2/accueil/hydration';
import { Enter, P } from '@/components/yoroi/v2/accueil/kit';
import { paperA } from '@/components/yoroi/livePalette';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { SceneHero } from '@/components/yoroi/v2/accueil/Scene';
import { EnTeteAccueil } from '@/components/yoroi/v2/accueil/EnTeteAccueil';
import { CarteSemaine } from '@/components/yoroi/v2/accueil/CarteSemaine';
import { ENTETE_PASTEL, HAUT_VOL_CARTE, hauteurSceneCarte, hautSceneCarte, SCENE_CARTE } from '@/lib/v2/saisons/geometrie';
import { CartePoids } from '@/components/yoroi/v2/accueil/CartePoids';
import { RaccourcisDuJour } from '@/components/yoroi/v2/accueil/Raccourcis';
import {
  GrilleAccueil,
  TuileAvantApres,
  TuileCompetition,
  TuileDerniere,
  TuileSanteJour,
  TuileSanteJourVide,
  TuileAvantApresVide,
  TuilePeseeVide,
  TuileRecordVide,
  TuileSerieVide,
  TuilePesee,
  TuileRecord,
  TuileSerie,
  dernierRecord,
  santeDuJour,
  semainesRecentes,
  semainesTenues,
  usePeseePrevue,
  usePhotosAccueil,
  TuileEau,
  TuileMensurations,
  TuileMensurationsDefile,
  TuileMois,
  TuileProchaine,
  TuileRecup,
  TuileSommeil,
  derniereSeance,
} from '@/components/yoroi/v2/accueil/Grille';
import type { TuileGrille } from '@/lib/v2/accueil/grille';
import { PersonnaliserAccueil } from '@/components/yoroi/v2/accueil/Personnaliser';
import { useDisposition } from '@/lib/v2/accueil/disposition';
import { TITRES_SECTIONS, sectionDuBloc, useProposition } from '@/lib/v2/accueil/proposition';
import { Carrousel, TableauDuJour, TitreSection } from '@/components/yoroi/v2/accueil/Propositions';
import { FeuilleEau } from '@/components/yoroi/v2/accueil/EauFeuille';
import type { BlocAccueil } from '@/lib/v2/accueil/disposition';
import { BackupNotice } from '@/components/yoroi/v2/accueil/BackupNotice';
import { PropositionCoach } from '@/components/yoroi/v2/onboarding/PropositionCoach';
import { CarteSante } from '@/components/yoroi/v2/accueil/CarteSante';
import { CarteImportSante, useCarteImportSante } from '@/components/yoroi/v2/accueil/CarteImportSante';
import { BlocMange } from '@/components/yoroi/v2/accueil/Mange';
import { useMange } from '@/lib/v2/nutrition/useMange';
import { TourAnchor, registerTourScroller } from '@/components/yoroi/v2/tour/TourAnchor';
import { DecorCarte, DecorScene } from '@/components/yoroi/v2/saisons/DecorSaison';
import { useSaison } from '@/lib/v2/saisons/useSaison';
import { traduire } from '@/lib/i18n/tr';

export default function Accueil() {
  const insets = useSafeAreaInsets();
  // 18 octobre 2026 : decorations de saison (Halloween, Noel) posees sur la scene, reglage dans Personnaliser
  const saison = useSaison();
  const { width: largeurEcran } = useWindowDimensions();
  // vague 35 : l'accueil se redessine quand tu passes en clair, sombre ou auto
  useYoroiTheme();
  const { series } = useWeightData();
  const { data } = useAccueil();
  const sante = useSante();
  const { disposition } = useDisposition();
  // 16 octobre : « Mangé aujourd'hui », null sans repas du jour (rien ne s'affiche alors)
  const mange = useMange(sante.series);
  // 18 octobre : « Importe tes données » (aucune pesee ni seance, ou Sante jamais reliee ; jamais en demo)
  const importSante = useCarteImportSante(sante);
  // vague 44 : la scene suit legerement le defilement, sur le fil d'animation (aucun re-rendu)
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollOffset(scrollRef);
  // visite guidee : elle fait defiler l'accueil jusqu'a l'element qu'elle montre, puis remonte
  useEffect(
    () =>
      registerTourScroller('accueil', {
        scrollBy: (dy) => (scrollRef.current as any)?.scrollTo?.({ y: Math.max(0, scrollY.value + dy), animated: true }),
        scrollToTop: () => (scrollRef.current as any)?.scrollTo?.({ y: 0, animated: true }),
      }),
    [scrollRef, scrollY],
  );

  // les donnees de la montre se rechargent a chaque retour sur l'accueil
  const reloadSante = sante.reload;
  useFocusEffect(
    useCallback(() => {
      reloadSante();
    }, [reloadSante]),
  );

  const { espace, armure } = data;
  // 27 octobre 2026 : la scene en carte, a 16 points des bords
  const largeurCarte = largeurEcran - 32;
  const hauteurScene = hauteurSceneCarte(largeurCarte);
  const rankIndex = Math.max(0, Math.min(4, armure?.rank.index ?? 0));
  // 0 tant que l'utilisateur n'a pas choisi son objectif : on montre alors le nombre de seances seul
  const goal = objectifVise(espace);
  // 18 octobre 2026 : le dernier record dans l'unite du reglage (kg ou lb)
  const unitePoids = useUnitePoids();
  // vague 28 : jours prevus de la semaine (planning d'abord, sinon les jours choisis a l'onboarding ou dans les Reglages)
  const plannedDays = useJoursPrevus(espace);

  const blocs = disposition.ordre.filter((b) => !disposition.caches.includes(b));
  const semaineVisible = blocs.includes('semaine');
  const derniere = derniereSeance(data.trainings);

  // 16 octobre nuit : blocs en plus. 17 octobre (Houari : « afficher d'autres choses comme les pas, quoi qu'il arrive ») :
  // tous affiches par defaut ; sans donnee, la tuile reste avec un etat vide utile, jamais un chiffre invente.
  // Tu les decoches en bas de l'accueil (Personnalise ton accueil, Tes blocs)
  const jour = localISO();
  // 17 octobre : un seul bloc Sante (id 'activite'), « Ta santé aujourd'hui »
  const activiteVisible = blocs.includes('activite');
  // Sante reliee (la tuile vide dit alors « rien aujourd'hui ») ; sinon « Connecte Santé pour voir tes pas »
  const santeRelie = sante.source?.mode === 'live';
  // tant que Sante charge, rien (pas d'etat vide qui clignote) ; au plus 4 secondes, puis l'etat vide s'affiche
  const [attenteFinie, setAttenteFinie] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAttenteFinie(true), 4000);
    return () => clearTimeout(t);
  }, []);
  const santeAttend = sante.loading && !attenteFinie;
  // 17 octobre nuit : l'anneau Exercice compte aussi tes seances du jour dans l'app (et les calories si Sante n'en a pas)
  const santeJour = useMemo(() => (activiteVisible ? activiteAvecSeances(santeDuJour(sante.series, jour), data.trainings, jour) : []), [activiteVisible, sante.series, jour, data.trainings]);
  // anneaux : tes objectifs de l'ecran Sante (sante.goals) et ton objectif de sommeil ; jamais un chiffre invente
  // tant que Sante n'a pas repondu : les valeurs par defaut de l'ecran Sante (500 kcal, 30 min, 12 h), affichees sous chaque anneau
  const objectifsSante = useMemo(() => {
    const g = sante.goals ?? DEFAULT_GOALS;
    return { kcal: g.move, exercice: g.exercise, debout: g.stand, sommeilMin: data.sleep.goal };
  }, [sante.goals, data.sleep.goal]);
  const progresVisible = blocs.includes('progres');
  const record = useMemo(() => (progresVisible ? dernierRecord(data.trainings, jour, unitePoids) : null), [progresVisible, data.trainings, jour, unitePoids]);
  const serie = useMemo(() => (progresVisible ? semainesTenues(data.trainings, goal, jour) : null), [progresVisible, data.trainings, goal, jour]);
  // 17 octobre nuit : tes 8 dernieres semaines pour la rangee de la tuile Regularite
  const recentes = useMemo(() => (progresVisible ? semainesRecentes(data.trainings, goal, jour, 8) : []), [progresVisible, data.trainings, goal, jour]);
  const peseePrevue = usePeseePrevue(series.length ? series[series.length - 1].date : null);
  const photos = usePhotosAccueil(blocs.includes('photos'));

  // chaque bloc donne ses tuiles (pleine largeur ou demi) ; la grille les range deux par deux, sans trou
  const tuilesDuBloc = (b: BlocAccueil): TuileGrille<React.ReactNode>[] => tuilesBrutes(b).map((t) => ({ ...t, groupe: b }));
  const tuilesBrutes = (b: BlocAccueil): TuileGrille<React.ReactNode>[] => {
    switch (b) {
      case 'semaine':
        return [
          { cle: 'prochaine', taille: 'pleine', contenu: <TuileProchaine next={data.next} trainings={data.trainings} /> },
          // 27 octobre 2026 : Ta semaine a sa propre carte sous tes outils (CarteSemaine) ; la grille garde la suite
          ...(derniere ? [{ cle: 'derniere', taille: 'demi' as const, contenu: <TuileDerniere last={derniere} /> }] : []),
        ];
      case 'forme':
        return [
          { cle: 'recup', taille: 'demi', contenu: <TuileRecup forme={data.forme} /> },
          { cle: 'sommeil', taille: 'demi', contenu: <TuileSommeil sleep={data.sleep.entries} sleepGoal={data.sleep.goal} /> },
          { cle: 'eau', taille: 'demi', contenu: <TuileEau water={data.hydration.amount} waterGoal={data.hydration.goal} /> },
          // 17 octobre nuit : en proposition C, la carte « Tes mensurations » qui defile (tour de nombril compris)
          { cle: 'mensurations', taille: 'demi', contenu: proposition === 'C' ? <TuileMensurationsDefile /> : <TuileMensurations /> },
        ];
      case 'mange':
        return mange?.aujourdhui ? [{ cle: 'mange', taille: 'pleine', contenu: <BlocMange resume={mange} /> }] : [];
      case 'rendezvous':
        // 16 octobre nuit (Houari : « si y a rien, tu ne l'affiches pas ») : seulement avec une competition a venir
        return data.competition ? [{ cle: 'competition', taille: 'pleine', contenu: <TuileCompetition c={data.competition} /> }] : [];
      case 'conseil':
        // 16 octobre soir : le conseil vit en une ligne sous tes outils (LigneConseil), plus dans la grille
        return [];
      case 'activite':
        // Ta sante aujourd'hui : toutes les mesures du jour dans un rectangle, rien d'invente
        if (santeJour.length) return [{ cle: 'sante-jour', taille: 'pleine', contenu: <TuileSanteJour mesures={santeJour} objectifs={objectifsSante} /> }];
        return santeAttend ? [] : [{ cle: 'sante-jour', taille: 'pleine', contenu: <TuileSanteJourVide relie={santeRelie} /> }];
      case 'progres':
        return [
          { cle: 'record', taille: 'demi', contenu: record ? <TuileRecord record={record} /> : <TuileRecordVide /> },
          { cle: 'serie', taille: 'demi', contenu: serie ? <TuileSerie semaines={serie} goal={goal} recentes={recentes} /> : <TuileSerieVide goal={goal} /> },
        ];
      case 'pesee':
        if (peseePrevue === undefined) return [];
        return [{ cle: 'pesee', taille: 'pleine', contenu: peseePrevue ? <TuilePesee prevue={peseePrevue} /> : <TuilePeseeVide /> }];
      case 'photos':
        if (!photos.charge) return [];
        return [{ cle: 'photos', taille: 'pleine', contenu: photos.paire ? <TuileAvantApres paire={photos.paire} /> : <TuileAvantApresVide nb={photos.nb} /> }];
      case 'mois':
        return [{ cle: 'mois', taille: 'pleine', contenu: <TuileMois trainings={data.trainings} plannedDays={plannedDays} competitionDate={data.competition?.date ?? null} /> }];
      default:
        return [];
    }
  };

  // 17 octobre nuit : proposition A (grille), B (sections) ou C (tableau du jour), lib/v2/accueil/proposition.ts
  const proposition = useProposition();
  const [eauOuverte, setEauOuverte] = useState(false);
  // 27 octobre 2026 : la page du carrousel de la carte poids (le decor de saison ne va que sur la page 1)
  const [pagePoids, setPagePoids] = useState(0);
  const rendreProposition = () => {
    if (proposition === 'B') {
      const ordre: ('jour' | 'entrainement' | 'corps' | 'mois')[] = [];
      blocs.forEach((b) => {
        const k = sectionDuBloc(b);
        if (!ordre.includes(k)) ordre.push(k);
      });
      return (
        <View style={{ gap: 12 }}>
          {ordre.map((k) => {
            const tuiles = blocs.filter((b) => sectionDuBloc(b) === k).flatMap(tuilesDuBloc);
            if (!tuiles.length) return null;
            return (
              <View key={k} style={{ gap: 10 }}>
                {k !== 'mois' ? <TitreSection titre={TITRES_SECTIONS[k]} /> : null}
                <GrilleAccueil tuiles={tuiles} />
              </View>
            );
          })}
        </View>
      );
    }
    if (proposition === 'C') {
      const toutes = blocs.flatMap(tuilesDuBloc);
      const dansTableau = ['recup', 'sommeil', 'eau', 'sante-jour'];
      const entrainement = ['semaine', 'derniere', 'record', 'serie'];
      const corps = ['mensurations'];
      const reste = toutes.filter((t) => ![...dansTableau, ...entrainement, ...corps].includes(t.cle));
      const prochaine = reste.filter((t) => t.cle === 'prochaine');
      const autres = reste.filter((t) => t.cle !== 'prochaine');
      const montrerTableau = blocs.includes('activite') || blocs.includes('forme');
      return (
        <View style={{ gap: 12 }}>
          {montrerTableau ? (
            // 18 octobre 2026 : ancre de la visite guidee (« Ta journee » : anneaux, sommeil, eau)
            <TourAnchor id="accueil.jour">
            <TableauDuJour
              mesures={blocs.includes('activite') ? santeJour : []}
              objectifs={objectifsSante}
              forme={blocs.includes('forme') ? data.forme : null}
              sleep={blocs.includes('forme') ? data.sleep.entries : []}
              sleepGoal={data.sleep.goal}
              water={data.hydration.amount}
              waterGoal={data.hydration.goal}
              onEau={() => setEauOuverte(true)}
              series={blocs.includes('activite') ? sante.series : null}
              trainings={data.trainings}
              eauHistorique={data.hydration.history}
            />
            </TourAnchor>
          ) : null}
          <GrilleAccueil tuiles={prochaine} />
          <Carrousel titre={traduire("Ton entraînement")} items={toutes.filter((t) => entrainement.includes(t.cle))} />
          <Carrousel titre={traduire("Ton corps")} items={toutes.filter((t) => corps.includes(t.cle))} />
          <GrilleAccueil tuiles={autres} />
        </View>
      );
    }
    return <GrilleAccueil tuiles={blocs.flatMap(tuilesDuBloc)} />;
  };

  const bottomSpace = insets.bottom + INK_TAB_BAR_SPACE;

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <Animated.ScrollView ref={scrollRef} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: insets.top + ENTETE_PASTEL.haut, paddingBottom: bottomSpace + 4 }} showsVerticalScrollIndicator={false}>
        {/* 27 octobre 2026 : ta photo, la date, ton salut, la lanterne et la cloche, sur le fond de la page */}
        <View style={{ paddingHorizontal: 16, zIndex: 2 }}>
          <EnTeteAccueil name={data.name} photo={espace.identite === 'photo' ? data.photo : null} personnage={espace.personnage} rankIndex={rankIndex} />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12, marginTop: ENTETE_PASTEL.ecart }}>
          {/* la scene dans une carte arrondie ; les vols de saison restent dans la carte */}
          {/* 28 octobre 2026 : chaque ancre de la visite dit la forme de son element (rayon de la carte) */}
          <TourAnchor id="accueil.scene" rayon={SCENE_CARTE.rayon}>
            <SceneHero
              carte
              largeur={largeurCarte}
              top={insets.top}
              scene={espace.scene}
              name={data.name}
              personnage={espace.personnage}
              rankIndex={rankIndex}
              photo={espace.identite === 'photo' ? data.photo : null}
              decor={saison ? <DecorScene saison={saison} largeur={largeurCarte} hauteur={hauteurScene} haut={HAUT_VOL_CARTE} scrollY={scrollY} dansCarte /> : null}
            />
          </TourAnchor>

          {/* Ton poids */}
          <Enter i={0}>
            <TourAnchor id="accueil.poids" rayon={28}>
              <CartePoids series={series} targetWeight={data.targetWeight} startWeight={data.startWeight} rankIndex={rankIndex} onPage={setPagePoids} />
              {/* 18 octobre 2026 v4 : decor de saison pose par dessus la carte (position absolue, aucun calcul touche) : citrouilles ou sapins entre le chiffre et l'anneau, toiles et araignees ou guirlande */}
              {saison && series.length && pagePoids === 0 ? <DecorCarte saison={saison} largeur={largeurCarte} scrollY={scrollY} seuil={hautSceneCarte(insets.top) + hauteurScene + 480} /> : null}
            </TourAnchor>
          </Enter>

          {/* vague 37 : tes outils, en un toucher. 27 octobre 2026 : sous Ton poids, comme la maquette */}
          <Enter i={0}>
            {/* la rangee defile jusqu'au bord de l'ecran : le cadre va jusqu'au bord, sans les marges de la rangee */}
            <TourAnchor id="accueil.outils" rayon={22} retrait={{ haut: 2, bas: 12, droite: -16 }}>
              <RaccourcisDuJour record={record} />
            </TourAnchor>
          </Enter>

          {/* 27 octobre 2026 : Ta semaine, les 7 jours en double anneau (exercice et pas) */}
          {semaineVisible ? (
            <Enter i={1}>
              <TourAnchor id="accueil.semaine" rayon={22}>
                <CarteSemaine trainings={data.trainings} goal={goal} series={sante.series} objectifs={objectifsSante} jour={jour} />
              </TourAnchor>
            </Enter>
          ) : null}

          <BackupNotice />

          {/* 26 octobre 2026 : apres la visite guidee, une seule fois, le coach propose ton programme (Oui ou Plus tard) */}
          <PropositionCoach />

          {/* 14 octobre 2026 : relier Apple Sante ou Health Connect, au plus 3 relances (lib/v2/sante/demande.ts) */}
          {/* 18 octobre 2026 : sans donnees, la carte « Importe tes données » passe devant (une seule carte Sante a la fois) */}
          {importSante.visible ? <CarteImportSante controle={importSante} onImporte={sante.reload} /> : <CarteSante sante={sante} />}

          {/* les blocs reglables, dans ton ordre (16 octobre) ; 17 octobre nuit : trois mises en page au choix (A, B, C) */}
          <Enter i={1}>{rendreProposition()}</Enter>
          <FeuilleEau visible={eauOuverte} onClose={() => setEauOuverte(false)} water={data.hydration.amount} waterGoal={data.hydration.goal} />

          <Enter i={2}>
            <PersonnaliserAccueil />
          </Enter>
        </View>
      </Animated.ScrollView>

      {/* 18 octobre 2026 v3 : les chauves souris, le fantome ou la neige ; 27 octobre 2026 : dans la carte de la scene (plus haut) */}

      {/* 27 octobre 2026 : sous la barre d'etat, le fond de la page (le contenu qui defile ne passe pas sous l'heure) */}
      <LinearGradient pointerEvents="none" colors={[P.paper, paperA(0.94), paperA(0)]} locations={[0, 0.7, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 10 }} />

      {/* fondu sous la barre d'onglets : rien de coupe ne depasse */}
      <LinearGradient
        pointerEvents="none"
        colors={[paperA(0), paperA(0.92), P.paper]}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottomSpace + 10 }}
      />
    </View>
  );
}
