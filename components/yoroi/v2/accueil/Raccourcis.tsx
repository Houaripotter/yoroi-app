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
 */
import React, { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useFocusEffect, useGlobalSearchParams, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { ORNEMENTS } from '@/components/yoroi/v2/ornements/images';
import { chargerDuMoment, lireVusRaccourci, marquerVusRaccourci, nouveautes, ordonnerDuMoment } from '@/lib/v2/cartes/duMoment';
import { DEMO_EXPLOITS, DEMO_SEANCE_MUSCU, DEMO_SEMAINE } from '@/lib/v2/cartes/demo';
import { isoJour } from '@/lib/v2/cartes/moments';
import type { CarteData } from '@/lib/v2/cartes/types';
import { devNow } from '@/lib/v2/creator/devClock';
import { FeuillePartage } from './FeuillePartage';
import { P, Press } from './kit';
import { traduire } from '@/lib/i18n/tr';

const RECORDS: ImageSourcePropType = require('@/assets/avatars/app/carnet/records.webp');
const CARTE_A: ImageSourcePropType = require('@/assets/avatars/app/carnet/partage_nuit.webp');
const CARTE_B: ImageSourcePropType = require('@/assets/avatars/app/carnet/partage_sakura.webp');

type Outil = { key: string; title: string; a11y: string; href: string | { pathname: string; params: Record<string, string> } | null; img: ImageSourcePropType | null; tint: string };

/** Tes outils, dans l'ordre demande par Houari, avec Partager en deuxieme */
export function outilsAccueil(): Outil[] {
  return [
    { key: 'chrono', title: traduire('Chrono'), a11y: traduire('Chrono : repos, rounds, Tabata'), href: '/timer', img: ORNEMENTS.chrono, tint: P.tuileOr },
    { key: 'partager', title: traduire('Partager'), a11y: traduire('Partager une carte : ta séance, ton record, ta semaine'), href: null, img: null, tint: P.tuileIndigo },
    { key: 'objectifs', title: traduire('Objectifs'), a11y: traduire('Objectifs à cocher, par sport'), href: '/training-goals', img: ORNEMENTS.cible, tint: P.tuileMousse },
    { key: 'carnet', title: traduire('Carnet'), a11y: traduire('Carnet : techniques, records et vidéos'), href: '/training-journal', img: ORNEMENTS.carnet, tint: P.tuileIndigo },
    { key: 'records', title: traduire('Records'), a11y: traduire('Tes records'), href: '/records', img: RECORDS, tint: P.tuileRouge },
    { key: 'combat', title: traduire('Combat et compétition'), a11y: traduire('Combat et compétition : compétitions, analyse'), href: '/combat-hub', img: ORNEMENTS.combat, tint: P.tuileMousse },
  ];
}

const D = 62;

/** Deux petites cartes en eventail et la fleche de partage : l'icone du raccourci Partager */
function IconePartager() {
  const w = 21;
  const h = 32;
  const carte = (src: ImageSourcePropType, rot: string, dx: number) => (
    <View style={{ position: 'absolute', left: (D - w) / 2 + dx, top: (D - h) / 2 - 3, width: w, height: h, borderRadius: 4, borderWidth: 1.5, borderColor: '#FFFFFF', overflow: 'hidden', backgroundColor: '#1E2336', transform: [{ rotate: rot }], shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}>
      <Image source={src} style={{ width: h * 1.1, height: h, marginLeft: -h * 0.3 }} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
  return (
    <View style={{ width: D, height: D }}>
      {carte(CARTE_B, '-13deg', -6)}
      {carte(CARTE_A, '9deg', 6)}
      <View style={{ position: 'absolute', right: 9, bottom: 8, width: 21, height: 21, borderRadius: 11, backgroundColor: '#C9A35A', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' }}>
        <Icon name="share" size={11} color="#1D2029" stroke={2.8} />
      </View>
    </View>
  );
}

/** Cartes de demonstration (copie web, ?demo=1) */
function demoDuMoment(): CarteData[] {
  const t = (x: string) => DEMO_EXPLOITS.find((c) => c.exploit?.type === x);
  return ordonnerDuMoment({ seance: DEMO_SEANCE_MUSCU, semaine: DEMO_SEMAINE, exploits: [t('record_charge'), t('palier_total'), t('annee_progression'), t('serie_semaines')].filter((c): c is CarteData => !!c) });
}

export function RaccourcisDuJour(_props: { water?: number; waterGoal?: number } = {}) {
  const router = useRouter();
  const { theme, isDark } = useYoroiTheme();
  const demo = useGlobalSearchParams<{ demo?: string }>().demo === '1';
  const outils = outilsAccueil();
  const [cartes, setCartes] = useState<CarteData[] | null>(null);
  const [nouvelles, setNouvelles] = useState<string[]>([]);
  const [ouverte, setOuverte] = useState(false);
  const lu = useRef(0);

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
        style={{ marginHorizontal: -22 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2, gap: 2 }}
        accessibilityLabel={traduire("Tes outils")}
      >
        {outils.map((o) => (
          <Press
            key={o.key}
            onPress={() => (o.href ? router.push(o.href as any) : ouvrirPartage())}
            accessibilityRole="button"
            accessibilityLabel={o.key === 'partager' && pastille ? traduire("{0}. Une nouvelle carte t’attend", o.a11y) : o.a11y}
          >
            <View style={{ width: 80, alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: D,
                  height: D,
                  borderRadius: D / 2,
                  backgroundColor: o.tint,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.92)',
                  shadowColor: '#0E111A',
                  shadowOpacity: isDark ? 0.5 : 0.2,
                  shadowRadius: 9,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 4,
                }}
              >
                {o.img ? <Image source={o.img} style={{ width: D * 0.7, height: D * 0.7 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <IconePartager />}
              </View>
              {o.key === 'partager' && pastille ? (
                <View pointerEvents="none" style={{ position: 'absolute', top: 1, right: 10, width: 15, height: 15, borderRadius: 8, backgroundColor: theme.colors.record, borderWidth: 2.5, borderColor: P.paper }} />
              ) : null}
              <Ink size={12.5} weight="extraBold" color={theme.colors.ink} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 15 }}>
                {traduire(o.title)}
              </Ink>
            </View>
          </Press>
        ))}
      </ScrollView>
      <FeuillePartage visible={ouverte} onClose={fermer} cartes={cartes} nouvelles={nouvelles} demo={demo} />
    </>
  );
}
