/**
 * Raccourcis sous l'en-tete de l'accueil (vague 36, refaits en vague 37).
 * Houari : « mets chrono, objectifs, carnet, videos, records, enfin tous tes outils ». La rangee montre donc
 * TES OUTILS en gros ronds illustres de la meme famille que les ornements de l'app, libelle dessous, en rangee
 * qui defile si besoin. La pesee a deja le bouton + ; l'eau s'ajoute et se retire depuis sa tuile de « Ta forme du jour ».
 * 15 octobre 2026 : « Partager » arrive en deuxieme position (visible sans faire defiler, meme a 375 points) :
 * il ouvre la feuille de tes cartes du moment (FeuillePartage.tsx), avec une pastille quand une carte vient d'etre
 * debloquee (record, palier, objectif). Il remplace « Videos », doublon du Carnet (meme ecran, onglet Videos).
 * 15 octobre 2026 (plus de bande de nuit) : les pastilles sont posees sur l'horizon de la scene, leur haut a 4 points
 * sous le bas de la scene (le plancher des pieds du personnage en depend : lib/v2/espace/sol.ts, PLANCHER_OUTILS).
 * Bord clair et ombre douce pour se detacher de la scene ; libelles en encre du theme sur le fond de la page.
 * 27 octobre 2026 (refonte Ciel, consigne de Houari : « des aperçus vivants qui donnent envie, pas des icônes ») :
 * la rangee devient des cartes apercu pastel de 150 sur 170 (rayon 24), comme celles de l'onboarding et du paywall :
 * l'illustration de l'outil, son nom en petites capitales de couleur, et un vrai chiffre quand il existe (techniques
 * du carnet, objectifs atteints, dernier record), sinon un apercu neutre sans chiffre invente.
 * La premiere carte commence a 32 points du bord : le decor de saison du debut de la rangee reste libre.
 * Le haut des cartes reste a 4 points sous la scene (plancher des pieds du personnage, lib/v2/espace/sol.ts).
 * Anciennes versions (ronds illustres, ronds a icone) : _archive_ancien_design_2026-10-09/refonte_ciel_2026-10-27.
 * 27 octobre 2026 soir (maquette Pastel-Final-Accueil) : cartes de 150 sur 132 (rayon 22, marge 12), sous Ton poids,
 * a 16 points du bord comme les autres cartes : le petit titre en capitales en HAUT, l'illustration a droite, la ligne
 * en bas ; Records sur une carte blanche avec son chiffre en grand et sa petite courbe, Carnet avec son nombre de
 * techniques en grand, Objectifs avec son anneau a cote du texte. Version d'avant : _archive_ancien_design_2026-10-09/refonte_phase2_2026-10-27.
 */
import React, { useCallback, useRef, useState } from 'react';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { Image, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ORNEMENTS } from '@/components/yoroi/v2/ornements/images';
import { getSkills } from '@/lib/carnetService';
import { useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { Ink } from '@/components/yoroi/v2/Ink';
import { chargerDuMoment, lireVusRaccourci, marquerVusRaccourci, nouveautes, ordonnerDuMoment } from '@/lib/v2/cartes/duMoment';
import { DEMO_EXPLOITS, DEMO_SEANCE_MUSCU, DEMO_SEMAINE } from '@/lib/v2/cartes/demo';
import { isoJour } from '@/lib/v2/cartes/moments';
import type { CarteData } from '@/lib/v2/cartes/types';
import { devNow } from '@/lib/v2/creator/devClock';
import { FeuillePartage } from './FeuillePartage';
import { ombreCarte, P, Press } from './kit';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { ECHELLE_MIN_LIBELLE, lierFinDeLigne, lignesLibelleOutil } from '@/lib/v2/accueil/libelleOutil';
import { PastilleBeta } from './PastilleBeta';

const CARTE_A: ImageSourcePropType = require('@/assets/avatars/app/carnet/partage_nuit.webp');
const CARTE_B: ImageSourcePropType = require('@/assets/avatars/app/carnet/partage_sakura.webp');
const RECORDS: ImageSourcePropType = require('@/assets/avatars/app/carnet/records.webp');
const JJB: ImageSourcePropType = require('@/assets/avatars/app/carnet/jjb.webp');
// 24 octobre 2026 : illustration du corps (abdos, bras et cuisses en rouge), meme famille que les ornements
const CORPS_ZONES: ImageSourcePropType = require('@/assets/avatars/app/ornements/zones_corps.webp');

/** Fonds pastel fixes des cartes (creme, bleu, lilas, menthe) et la couleur de leur petit titre */
const TEINTES = {
  creme: { fond: '#F6EEDD', titre: '#A57A1C' },
  bleu: { fond: '#E6ECF8', titre: '#3557D9' },
  lilas: { fond: '#EFE6F3', titre: '#8A3F78' },
  menthe: { fond: '#E3F2EA', titre: '#1C6B45' },
} as const;
type Teinte = keyof typeof TEINTES;
/** fond pastel fixe : encre fixe, lisible en clair comme en sombre (meme regle que l'onboarding) */
const ENCRE = '#1D2033';
const ENCRE_DOUCE = 'rgba(29,32,51,0.62)';

type Outil = { key: string; title: string; a11y: string; href: string | { pathname: string; params: Record<string, string> } | null; teinte: Teinte; img: ImageSourcePropType | null; sticker: NomSticker; beta?: boolean };

/** Tes outils, dans l'ordre demande par Houari, avec Partager en deuxieme */
export function outilsAccueil(): Outil[] {
  return [
    // 24 octobre 2026 : « je veux faire une seance mais je ne sais pas quoi faire ».
    // 26 octobre 2026 (Houari : « il est où le coach ? ») : la pastille ouvre le Coach (app/coach.tsx), qui rassemble
    // ton programme, ta seance du jour, les seances toutes faites (app/programmes/zones.tsx) et tes questions
    { key: 'zones', title: traduire('Coach'), a11y: traduire('Ton coach : ton programme, ta séance du jour, tes réponses'), href: '/coach', teinte: 'bleu', img: CORPS_ZONES, sticker: 'coach', beta: true },
    { key: 'chrono', title: traduire('Chrono'), a11y: traduire('Chrono : repos, rounds, Tabata'), href: '/timer', teinte: 'creme', img: ORNEMENTS.chrono, sticker: 'chrono' },
    { key: 'partager', title: traduire('Partager'), a11y: traduire('Partager une carte : ta séance, ton record, ta semaine'), href: null, teinte: 'lilas', img: null, sticker: 'partager' },
    { key: 'objectifs', title: traduire('Objectifs'), a11y: traduire('Objectifs à cocher, par sport'), href: '/training-goals', teinte: 'menthe', img: ORNEMENTS.cible, sticker: 'objectifs' },
    { key: 'carnet', title: traduire('Carnet'), a11y: traduire('Carnet : techniques, records et vidéos'), href: '/training-journal', teinte: 'creme', img: JJB, sticker: 'carnet' },
    { key: 'records', title: traduire('Records'), a11y: traduire('Tes records'), href: '/records', teinte: 'bleu', img: RECORDS, sticker: 'records' },
    { key: 'combat', title: traduire('Combat et compétition'), a11y: traduire('Combat et compétition : compétitions, analyse'), href: '/combat-hub', teinte: 'menthe', img: ORNEMENTS.combat, sticker: 'combat' },
  ];
}

/**
 * 27 octobre 2026, soir (Houari : « toutes au même gabarit, parfaitement alignées ») : un seul gabarit pour toutes
 * les cartes. Le petit titre en capitales en haut a gauche, le sticker en haut a droite (meme taille, meme place
 * partout, il ne touche jamais le texte), la ligne principale en bas a gauche, meme marge et meme ligne de base
 * sur toutes les cartes. Le Beta du Coach : une petite pastille a droite de son titre (PastilleBeta.tsx, 27 octobre).
 * 28 octobre 2026 (Houari : « les cartes outils sont trop grandes ») : 148 sur 112 au lieu de 172 sur 140, sticker de 52,
 * ligne principale en 15 ; la pastille Beta quitte la ligne du titre et se pose a cheval sur le bord haut de la carte
 * (PastilleBeta.tsx) : la carte ne coupe plus rien (le clip est sur une boite interieure), la rangee garde 16 points
 * en haut pour la pastille et son ombre. Version d'avant : _archive_ancien_design_2026-10-09/accueil_compact_2026-10-28.
 * 28 octobre 2026, soir (Houari : « resserre les cartes outils ») : 148 sur 96, meme sticker de 52 et meme texte ; le
 * sticker remonte a 6 du haut, la rangee garde 8 points sous elle au lieu de 12 (la place de l ombre douce de la carte Records). La ligne au dessus de la principale
 * (le nom du record) s'arrete avant le sticker. Version d'avant : _archive_ancien_design_2026-10-09/carte_poids_v3_2026-10-28.
 */
const CARTE_L = 148;
const CARTE_H = 96;
const MARGE = 12;
const STICKER = 52;
const STICKER_HAUT = 6;
const STICKER_DROITE = 6;
/** la place laissee en haut de la rangee pour ce qui depasse de la pastille Beta (12) et son ombre ; les cartes commencent 6 points sous le haut de la rangee d'avant, la pastille reste a 6 points de Ton poids */
const HAUT_RANGEE = 16;
/** la colonne du titre s'arrete avant le sticker, avec 6 points d'air */
const TITRE_L = CARTE_L - MARGE - STICKER_DROITE - STICKER - 6;
/** la ligne au dessus de la principale (le nom du record) est a la hauteur du bas du sticker : elle s'arrete avant lui */
const SOUS_L = CARTE_L - MARGE - STICKER_DROITE - STICKER - 4;

/** Deux cartes a partager en eventail : l'apercu de Partager */
function ApercuPartage() {
  // 28 octobre 2026 : a l'echelle des cartes de 148 sur 112
  const w = 38;
  const h = 58;
  const carte = (src: ImageSourcePropType, rot: string, dx: number) => (
    <View style={{ position: 'absolute', right: 14 - dx, top: 10, width: w, height: h, borderRadius: 8, borderWidth: 2, borderColor: '#FFFFFF', overflow: 'hidden', backgroundColor: '#1E2336', transform: [{ rotate: rot }], shadowColor: '#1B2A44', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
      <Image source={src} style={{ width: h * 1.1, height: h, marginLeft: -h * 0.3 }} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
  return (
    <>
      {carte(CARTE_B, '-12deg', 25)}
      {carte(CARTE_A, '8deg', 0)}
    </>
  );
}

/** Cartes de demonstration (copie web, ?demo=1) */
function demoDuMoment(): CarteData[] {
  const t = (x: string) => DEMO_EXPLOITS.find((c) => c.exploit?.type === x);
  return ordonnerDuMoment({ seance: DEMO_SEANCE_MUSCU, semaine: DEMO_SEMAINE, exploits: [t('record_charge'), t('palier_total'), t('annee_progression'), t('serie_semaines')].filter((c): c is CarteData => !!c) });
}

export function RaccourcisDuJour({ record = null }: { water?: number; waterGoal?: number; record?: { titre: string; valeur: string } | null } = {}) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const demo = useGlobalSearchParams<{ demo?: string }>().demo === '1';
  const outils = outilsAccueil();
  // 27 octobre 2026 : les stickers (ou l'encre d'avant, au choix dans Personnaliser, Illustrations)
  const illus = useIllustrations();
  const [cartes, setCartes] = useState<CarteData[] | null>(null);
  const [nouvelles, setNouvelles] = useState<string[]>([]);
  const [ouverte, setOuverte] = useState(false);
  const lu = useRef(0);
  // 27 octobre 2026 : les vrais chiffres des apercus (lecture seule) : techniques du carnet, objectifs atteints
  const [nbTechniques, setNbTechniques] = useState<number | null>(null);
  const [objectifs, setObjectifs] = useState<{ faits: number; total: number } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getSkills()
        .then((l) => {
          if (alive) setNbTechniques(Array.isArray(l) ? l.length : null);
        })
        .catch(() => {});
      AsyncStorage.getItem('@yoroi_user_goals')
        .then((v) => {
          if (!alive) return;
          const l = v ? JSON.parse(v) : [];
          setObjectifs(Array.isArray(l) && l.length ? { faits: l.filter((g: { completed?: boolean }) => g?.completed).length, total: l.length } : null);
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  // tes cartes du moment, relues a chaque retour sur l'accueil (au plus une fois toutes les 30 secondes)
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lu.current < 30000) return;
      let alive = true;
      // 15 octobre 2026 (affichage immediat) : la lecture n'est marquee faite qu'une fois arrivee. Avant, une
      // lecture interrompue (Accueil quitte pendant le chargement, parametre demo qui change) bloquait la
      // feuille Partager sur la roue de chargement pendant 30 secondes
      (async () => {
        const l = demo ? demoDuMoment() : await chargerDuMoment(devNow());
        const vus = await lireVusRaccourci();
        if (!alive) return;
        lu.current = Date.now();
        setCartes(l);
        setNouvelles(nouveautes(l, vus, isoJour(devNow())));
      })().catch(() => {
        if (!alive) return;
        lu.current = Date.now();
        setCartes((prev) => prev ?? []);
      });
      return () => {
        alive = false;
      };
    }, [demo]),
  );

  const ouvrirPartage = () => {
    setOuverte(true);
    // la pastille s'efface des que tu ouvres la feuille ; le badge Nouveau reste visible cette fois-ci
    if (nouvelles.length) marquerVusRaccourci(nouvelles).catch(() => {});
  };
  const fermer = () => {
    setOuverte(false);
    if (nouvelles.length) setNouvelles([]);
  };
  const pastille = nouvelles.length > 0 && !ouverte;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16, marginTop: 6 - HAUT_RANGEE }}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingTop: HAUT_RANGEE, paddingBottom: 8, gap: 10 }}
        accessibilityLabel={traduire("Tes outils")}
      >
        {outils.map((o) => {
          const t = TEINTES[o.teinte];
          // la ligne principale : un vrai chiffre quand il existe, sinon une phrase neutre
          const ligne =
            o.key === 'chrono' ? traduire('Rounds et Tabata')
            : o.key === 'partager' ? traduire('Tes cartes')
            : o.key === 'zones' ? traduire('Ta séance du jour')
            : o.key === 'carnet' ? (nbTechniques ? traduirePluriel(nbTechniques, nbTechniques > 1, '{0} technique', '{0} techniques', nbTechniques) : traduire('Tes techniques'))
            : o.key === 'objectifs' ? (objectifs ? traduire('{0} sur {1} atteints', objectifs.faits, objectifs.total) : traduire('À cocher, par sport'))
            : o.key === 'records' ? (record ? record.valeur : traduire('Tes records'))
            : traduire('Tes compétitions');
          const sous = o.key === 'records' && record ? record.titre : null;
          return (
            <Press
              key={o.key}
              onPress={() => (o.href ? router.push(o.href as any) : ouvrirPartage())}
              accessibilityRole="button"
              accessibilityLabel={o.key === 'partager' && pastille ? traduire("{0}. Une nouvelle carte t’attend", o.a11y) : o.beta ? traduire('{0}. En bêta', o.a11y) : o.a11y}
            >
              {/* 27 octobre 2026 : le Coach est montre par la visite guidee */}
              <TourAnchor id={o.key === 'zones' ? 'accueil.coach' : 'accueil.outil'} rayon={20}>
              {(() => {
                // Records : carte blanche (maquette) ; les autres sur leur pastel
                const blanche = o.key === 'records';
                const fond = blanche ? P.white : t.fond;
                const encre = blanche ? P.ink : ENCRE;
                const douce = blanche ? P.ink2 : ENCRE_DOUCE;
                const image = illus.stickers ? illus.img(o.sticker) : o.img ?? illus.img(o.sticker);
                return (
                  <View style={[{ width: CARTE_L, height: CARTE_H, borderRadius: 20, backgroundColor: fond }, blanche ? ombreCarte : null]}>
                  {/* le clip des apercus est sur cette boite interieure : la pastille Beta peut deborder de la carte */}
                  <View style={{ flex: 1, borderRadius: 20, overflow: 'hidden', paddingHorizontal: MARGE, paddingTop: MARGE, paddingBottom: MARGE }}>
                    {/* le sticker, meme taille et meme place sur toutes les cartes */}
                    {o.key === 'partager' && !illus.stickers ? (
                      <ApercuPartage />
                    ) : (
                      <Image source={image} resizeMode="contain" style={{ position: 'absolute', right: STICKER_DROITE, top: STICKER_HAUT, width: STICKER, height: STICKER }} accessibilityIgnoresInvertColors />
                    )}
                    {/* le petit titre en capitales, en haut a gauche, jamais sous le sticker */}
                    <View style={{ width: TITRE_L, minHeight: 14, flexDirection: 'row', alignItems: 'center' }}>
                      <Ink
                        size={10}
                        weight="black"
                        color={blanche ? (paletteSombre() ? P.accentText : t.titre) : t.titre}
                        numberOfLines={lignesLibelleOutil(o.title)}
                        adjustsFontSizeToFit
                        minimumFontScale={ECHELLE_MIN_LIBELLE}
                        style={{ letterSpacing: 1, lineHeight: 14, flexShrink: 1 }}
                      >
                        {o.title.toUpperCase()}
                      </Ink>
                    </View>
                    {/* la ligne principale, en bas a gauche : meme marge et meme ligne de base partout */}
                    <View style={{ marginTop: 'auto' }}>
                      {sous ? (
                        <Ink size={11.5} weight="bold" color={douce} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ lineHeight: 15, marginBottom: 1, maxWidth: SOUS_L }}>
                          {sous}
                        </Ink>
                      ) : null}
                      <Ink
                        size={15}
                        weight="black"
                        color={encre}
                        numberOfLines={sous ? 1 : 2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        textBreakStrategy="simple"
                        android_hyphenationFrequency="none"
                        style={{ lineHeight: 18, letterSpacing: -0.2 }}
                      >
                        {lierFinDeLigne(ligne)}
                      </Ink>
                    </View>
                    {o.key === 'partager' && pastille ? (
                      <View pointerEvents="none" style={{ position: 'absolute', top: 8, right: 8, width: 14, height: 14, borderRadius: 7, backgroundColor: theme.colors.record, borderWidth: 2.5, borderColor: '#FFFFFF' }} />
                    ) : null}
                  </View>
                  {/* 28 octobre 2026 : la pastille Beta a cheval sur le bord haut, hors du clip */}
                  {o.beta ? <PastilleBeta /> : null}
                  </View>
                );
              })()}
              </TourAnchor>
            </Press>
          );
        })}
      </ScrollView>
      <FeuillePartage visible={ouverte} onClose={fermer} cartes={cartes} nouvelles={nouvelles} demo={demo} />
    </>
  );
}
