/**
 * Mini onboarding « Nouveautes de la 3.0 » (14 octobre 2026), pour qui met a jour depuis une ancienne version.
 * Rien de ce qu'on sait deja n'est redemande (prenom, genre, poids, sports, objectifs restent tels quels) :
 * seulement les etapes nouvelles, et seulement si elles ont un sens (lib/v2/onboarding/parcours.ts) :
 *   Bienvenue, Ton univers (si jamais choisi), Apple Sante ou Health Connect (si pas encore relie), Tes rappels (14 octobre 2026), Ta scene,
 *   puis la visite guidee sur les vrais ecrans.
 * 17 octobre 2026 (revue de l'onboarding) : la Bienvenue montre les nouveautes en images, avec les vrais composants
 * (components/yoroi/v2/onboarding/Vitrines.tsx) : accueil en tuiles colorees et « Ta santé aujourd'hui », citation du
 * jour en trois styles, personnages de toutes origines et choix du visage, cartes a partager (Story, Publication,
 * Carre, modeles Record, Semaine, Minimal, Avant apres), bilan colore apres chaque seance, exercices en francais,
 * Trouve ta machine et lieu simplifie. Une ligne dit ensuite ce qui reste a regler.
 * Ouvert par app/index.tsx a la premiere ouverture apres la mise a jour, et depuis Reglages,
 * « Revoir la presentation » (/nouveautes?revoir=1 : tout est remontre, puis la visite).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInLeft, FadeInRight, FadeOutLeft, FadeOutRight } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { personnageImage, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { MainButton, Shell, useColors } from '@/components/yoroi/v2/onboarding/ui';
import { Univers } from '@/components/yoroi/v2/onboarding/Univers';
import { Sante } from '@/components/yoroi/v2/onboarding/Sante';
import { isVisiteDone } from '@/components/yoroi/v2/tour/keys';
import { lancerVisite } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { getProfile } from '@/lib/database';
import { getEspace, type Espace } from '@/lib/v2/espace';
import { choisirUnivers, choixUniversDe, type ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { getSanteSource } from '@/lib/v2/sante/data';
import { demanderAccesSante, passerAccesSante } from '@/lib/v2/sante/demandeActions';
import { NOUVEAUTES_30_KEY, etapesNouveautes, type EtapeNouveautes } from '@/lib/v2/onboarding/parcours';
import { BlocDiscipline, MessageDiscipline } from '@/components/yoroi/v2/onboarding/Discipline';
import { CarrouselVitrines, vitrinesNouveautes } from '@/components/yoroi/v2/onboarding/Vitrines';
import { decouper } from '@/components/yoroi/v2/onboarding/ui';
import { CHOIX_RAPPELS_VIDE, type ChoixRappels } from '@/lib/v2/notifications/discipline';
import { appliquerChoixRappels, lireChoixRappels } from '@/lib/v2/notifications/rappels';

/** 14 octobre 2026 : « Tes rappels » (discipline) avant la scene, toujours propose */
type Etape = EtapeNouveautes | 'rappels';
const avecRappels = (l: EtapeNouveautes[]): Etape[] => {
  const i = l.indexOf('scene');
  return i < 0 ? [...l, 'rappels'] : [...l.slice(0, i), 'rappels', ...l.slice(i)];
};
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

/** Au dela, une lecture qui ne repond pas est ignoree : la page ne reste jamais blanche */
const LECTURE_MAX_MS = 2500;

/** Titre d'une nouveaute : le mot cle (entre ** **) en indigo */
function TitreVitrine({ texte }: { texte: string }) {
  const c = useColors();
  return (
    <Ink size={20} weight="black" tight>
      {decouper(texte).map((m, k) => (m.cle ? <Ink key={k} size={20} weight="black" tight color={c.accent}>{m.txt}</Ink> : m.txt))}
    </Ink>
  );
}

export default function Nouveautes() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const nav0 = useRouter();
  const params = useLocalSearchParams<{ revoir?: string }>();
  const revoir = params.revoir === '1' || params.revoir === 'true';

  const [etapes, setEtapes] = useState<Etape[] | null>(null);
  const [rappels, setRappels] = useState<ChoixRappels>(CHOIX_RAPPELS_VIDE);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [genre, setGenre] = useState<'h' | 'f'>('h');
  const [univers, setUnivers] = useState<ChoixUnivers>('japon');
  const [espace, setEspace] = useState<Espace | null>(null);
  const [busy, setBusy] = useState(false);
  const fini = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // jamais bloquant : une lecture impossible, absente ou qui ne repond pas (base pas encore ouverte, web sans
      // donnees) donne null au bout de 2,5 s, et la page s'affiche quand meme (17 octobre 2026 : page blanche sinon)
      const sur = async <T,>(f: () => Promise<T>): Promise<T | null> => {
        let t: ReturnType<typeof setTimeout> | undefined;
        try {
          return await Promise.race([
            f(),
            new Promise<null>((res) => {
              t = setTimeout(() => res(null), LECTURE_MAX_MS);
            }),
          ]);
        } catch {
          return null;
        } finally {
          if (t) clearTimeout(t);
        }
      };
      const [e, p, src] = await Promise.all([sur(getEspace), sur(getProfile), sur(getSanteSource)]);
      if (!alive) return;
      const g: 'h' | 'f' = p?.avatar_gender === 'femme' ? 'f' : 'h';
      setGenre(g);
      setEspace(e);
      setUnivers(choixUniversDe(e));
      lireChoixRappels()
        .then((r) => alive && setRappels(r))
        .catch(() => undefined);
      setEtapes(
        avecRappels(etapesNouveautes({
          universChoisi: !!e?.univers,
          santeDisponible: src?.mode === 'off' || src?.mode === 'live',
          santeConnectee: src?.mode === 'live',
          revoir,
        })),
      );
    })();
    return () => {
      alive = false;
    };
  }, [revoir]);

  // retour de la page des scenes : la scene choisie s'affiche
  useFocusEffect(
    useCallback(() => {
      getEspace()
        .then((e) => setEspace(e))
        .catch(() => undefined);
    }, []),
  );

  // depuis l'ouverture (seul ecran) ou depuis les Reglages (pile ouverte) : toujours un seul accueil
  const versAccueil = useCallback(() => {
    try {
      if (nav0.canDismiss()) nav0.dismissAll();
    } catch {
      // rien a fermer
    }
    if (revoir) nav0.navigate('/(tabs)' as never);
    else router.replace('/(tabs)');
  }, [nav0, revoir]);

  const finir = useCallback(async () => {
    if (fini.current) return;
    fini.current = true;
    await AsyncStorage.setItem(NOUVEAUTES_30_KEY, 'true').catch(() => undefined);
    // la visite part d'elle-meme si elle n'a jamais ete faite ; sinon (revoir) on la lance
    const deja = await isVisiteDone();
    if (deja) lancerVisite(nav0);
    else versAccueil();
  }, [nav0, versAccueil]);

  const plusTard = useCallback(async () => {
    if (fini.current) return;
    fini.current = true;
    await AsyncStorage.setItem(NOUVEAUTES_30_KEY, 'true').catch(() => undefined);
    versAccueil();
  }, [versAccueil]);

  const n = etapes?.length ?? 1;
  const suivant = useCallback(() => {
    if (!etapes) return;
    if (i >= etapes.length - 1) {
      void finir();
      return;
    }
    setDir(1);
    setI(i + 1);
  }, [etapes, i, finir]);
  const retour = useCallback(() => {
    if (i <= 0) return;
    setDir(-1);
    setI(i - 1);
  }, [i]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (i > 0) {
        retour();
        return true;
      }
      return true;
    });
    return () => sub.remove();
  }, [i, retour]);

  if (!etapes) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  const etape = etapes[i];
  const nav = { progress: (i + 1) / n, onBack: i > 0 ? retour : undefined };

  const validerUnivers = async () => {
    setBusy(true);
    try {
      await choisirUnivers(univers, genre);
      setEspace(await getEspace());
    } catch (e) {
      logger.warn('[Nouveautes] univers non enregistre', e);
    } finally {
      setBusy(false);
    }
    suivant();
  };

  const connecter = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await demanderAccesSante();
    } finally {
      setBusy(false);
    }
    suivant();
  };

  const render = () => {
    switch (etape) {
      case 'bienvenue':
        return (
          <Shell
            {...nav}
            title={revoir ? traduire('La **présentation** de YOROI') : traduire('Bienvenue dans **YOROI 3.0**')}
            sub={revoir ? traduire('Les nouveautés, les réglages, puis la visite de l’app.') : traduire('Tes données sont là, rien n’a bougé. Voici ce qui est nouveau.')}
            gap={10}
            footer={
              <>
                <MainButton label={traduire("C’est parti")} onPress={suivant} />
                {revoir ? null : (
                  <Pressable onPress={plusTard} accessibilityRole="button" accessibilityLabel={traduire("Plus tard")} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={15} weight="bold" color={c.textSecondary}>{traduire("Plus tard")}</Ink>
                  </Pressable>
                )}
              </>
            }
          >
            <CarrouselVitrines vitrines={vitrinesNouveautes(genre)} titreRendu={(t) => <TitreVitrine texte={t} />} />
            <Ink size={13} weight="bold" color={c.textSecondary} style={{ lineHeight: 19 }}>
              {traduire("Ensuite, en une minute : {0}, puis la visite guidée.", [etapes.includes('univers') ? traduire('ton univers') : null, etapes.includes('sante') ? (Platform.OS === 'android' ? 'Health Connect' : traduire('Apple Santé')) : null, traduire('tes rappels'), traduire('ta scène')].filter(Boolean).join(', '))}
            </Ink>
          </Shell>
        );
      case 'rappels':
        return (
          <Shell {...nav} title={traduire("Ta **discipline**")} sub={traduire("Des rappels pour tenir ton rythme, seulement ceux que tu allumes.")} gap={12} footer={<MainButton label={traduire("Continuer")} onPress={suivant} />}>
            <MessageDiscipline />
            <BlocDiscipline
              sansMessage
              value={rappels}
              ecran="nouveautes"
              onChange={(r) => {
                setRappels(r);
                void appliquerChoixRappels(r);
              }}
            />
          </Shell>
        );
      case 'univers':
        return <Univers nav={nav} genre={genre} value={univers} onPick={setUnivers} onNext={() => void validerUnivers()} />;
      case 'sante':
        return (
          <Sante
            nav={nav}
            busy={busy}
            onConnect={() => void connecter()}
            onLater={() => {
              void passerAccesSante();
              suivant();
            }}
          />
        );
      default: {
        const id = espace?.sceneFixe ?? espace?.scene;
        const meta = sceneMeta(id);
        const perso = espace && aUnPersonnage(espace.personnage) ? personnageImage(espace.personnage, 0, genre) : null;
        const w = width - 44;
        const h = Math.round(w * 0.62);
        return (
          <Shell
            {...nav}
            title={traduire("Ta **scène** d’accueil")}
            sub={traduire("Le décor en haut de ton accueil. Tu peux la changer quand tu veux dans Réglages, Personnaliser.")}
            footer={
              <>
                <MainButton label={traduire("Choisir ma scène")} tone="light" onPress={() => router.push('/settings/scene' as never)} />
                <MainButton label={i >= n - 1 ? traduire('Voir la visite guidée') : traduire('Continuer')} onPress={suivant} />
              </>
            }
          >
            <View style={{ width: w, height: h, borderRadius: 22, overflow: 'hidden', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <Image source={meta.image} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
              {perso ? <Image source={perso} resizeMode="contain" style={{ position: 'absolute', right: 8, bottom: 0, width: Math.round(h * 0.75), height: h - 10 }} accessibilityIgnoresInvertColors /> : null}
            </View>
            <Ink size={15} weight="extraBold">{traduire(meta.nom)}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire(meta.phrase)}</Ink>
          </Shell>
        );
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.View key={etape} entering={(dir > 0 ? FadeInRight : FadeInLeft).duration(300)} exiting={(dir > 0 ? FadeOutLeft : FadeOutRight).duration(180)} style={StyleSheet.absoluteFill}>
        {render()}
      </Animated.View>
    </View>
  );
}
