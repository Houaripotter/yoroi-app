/**
 * Ecran 16 : ton plan (vague 27). D'abord la courbe projetee jusqu'a la fourchette d'arrivee (vague 28 :
 * lib/v2/pesee/estimation.ts, affinee par tes seances), puis ta semaine type avec tes jours, un apercu de ta carte Poids telle qu'elle sera a l'accueil (ta vraie pesee du jour),
 * et en petit seulement ton personnage et ton rang. Uniquement tes reponses et ce que l'app calcule.
 * Vague 45 : le personnage suit l'univers choisi (Guerrier, Sportif, ou aucune figure) ; le nom du rang
 * arrive deja calcule par rangNom dans l'univers choisi.
 * 26 octobre 2026 (revue de l'onboarding) : sous ton chemin, « Sport, alimentation, ou les deux ? » (PlanSport.tsx,
 * seulement les etudes de sources.ts) quand ton poids doit baisser ; ta semaine en couleurs avec tes sports
 * (SemaineCouleurs.tsx) ; « Ton accueil, des maintenant » devient un apercu qui donne envie (ApercuProgres.tsx :
 * le chemin qui se remplit, ta premiere semaine en XP, le prochain rang) ; enfin, ton coach qui suit avec tes reponses.
 * La carte Poids complete reste a l'ecran Demonstration (pas de doublon).
 * 26 octobre 2026 (soir) : tout passe dans un carrousel de cartes (CarrouselPlan.tsx) : ton chemin, ta semaine, sport ou
 * alimentation, ce que ton sport t'apporte, ton accueil, ton Dojo. Continuer reste toujours visible en bas.
 * 27 octobre 2026 (Houari : « Il faut montrer ce que YOROI va lui apporter pour qu'il paye ; si on ne lui apporte rien,
 * ça ne sert à rien ») : juste apres ton chemin, la carte « Ce que YOROI va faire pour toi » : 3 ou 4 choses concretes
 * tirees de tes reponses et des vraies fonctions de l'app (lib/v2/premium/pourToi.ts, ceQueYoroiFait) ; la seule
 * Premium est marquee comme telle, et la premiere carte du paywall la prolonge.
 */
import React from 'react';
import { Image, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon as IconEspace } from '@/components/yoroi/v2/espace/ui';
import { ceQueYoroiFait, type IdPourToi } from '@/lib/v2/premium/pourToi';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { sticker, useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { guerrierImage } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES } from '@/lib/v2/dojo/personnages';
import { rangNom } from '@/lib/v2/dojo/univers';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { sensDe } from '@/lib/v2/onboarding/objectifs';
import { PAS_UNE_PROMESSE, estimerArrivee, fourchetteDates, seancesTexte } from '@/lib/v2/pesee/estimation';
import { PiedArrivee } from '@/components/yoroi/v2/premium/TonPlan';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { arriveeVue, gapText } from './Cap';
import { PlanCurve } from './PlanCurve';
import { SemaineCouleurs } from './SemaineCouleurs';
import { PlanSport } from './PlanSport';
import { ApercuProgres, apercuCheminVisible } from './ApercuProgres';
import { ApercuAccueil } from './ApercuAccueil';
import { sceneParDefaut } from './ChoixScene';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { SCENES_CLASSIQUE } from '@/lib/v2/espace/classique';
import { CarrouselPlan } from './CarrouselPlan';
import type { PageCarrousel } from './CarrouselPlan';
import { MainButton, Riche, Shell, kg, marquer, useColors } from './ui';
import type { Nav } from './types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function Resultat({ nav, name, genre, univers = 'japon', rankName, rankIndex = 0, start, target, goal, goals, sessions, days = [], height = null, sports, pesees = 0, scene = null, onNext }: {
  nav: Nav;
  /** 27 octobre 2026 : la scene choisie a l'ecran Ta scene (null : celle de l'univers) */
  scene?: string | null;
  name: string;
  genre: 'h' | 'f';
  /** vague 45 : univers choisi a l'ecran 4 */
  univers?: ChoixUnivers;
  /** nom du rang, deja dans l'univers choisi (rangNom) */
  rankName: string;
  /** 26 octobre 2026 : index du rang (0 a 4), pour l'apercu du Dojo */
  rankIndex?: number;
  start: number | null;
  target: number | null;
  goal: Goal | null;
  /** vague 29 : tous les objectifs choisis */
  goals?: Goal[];
  sessions: number | null;
  /** jours d'entrainement choisis, 0 = lundi */
  days?: number[];
  height?: number | null;
  sports: string[];
  /** pesees prevues par semaine (ecran Pesee) */
  pesees?: number;
  onNext: () => void;
}) {
  const c = useColors();
  const pal = usePaletteProgramme();
  const illus = useIllustrations();
  const title = name.trim() ? traduire("{0}, voici **ton plan**", name.trim()) : traduire('Voici **ton plan**');
  const liste = goals && goals.length ? goals : goal ? [goal] : [];
  const sens = sensDe(liste);
  const maintain = sens === 'stable' || target == null;
  const recompo = sens === 'recompo';
  const e = start != null && !maintain ? estimerArrivee({ start, target: target as number, sessions, heightCm: height, recompo: recompo && (target as number) < start }) : null;
  const v = e && start != null ? arriveeVue(e, start, target as number) : null;
  const ok = e?.kind === 'ok';
  const baisse = start != null && target != null && !maintain && (target as number) < start;
  const g = genre === 'f' ? 'f' : 'h';
  const ri = Math.max(0, Math.min(4, rankIndex));
  const persoDe = (i: number) => (univers === 'japon' ? guerrierImage(genre, i) : univers === 'classique' ? CLASSIQUE_IMAGES[g][i] : null);
  const nextName = ri < 4 ? rangNom(ri + 1, univers === 'japon' ? 'japon' : 'classique') : null;

  const cheminApercu = apercuCheminVisible(start, maintain ? null : target) || start != null;
  const idScene = scene ?? sceneParDefaut(univers);
  const imageScene = SCENES_CLASSIQUE.find((s) => s.id === idScene)?.image ?? sceneMeta(idScene).image;
  const carte = { borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 8 } as const;
  const apercuProps = {
    start,
    target: maintain ? null : target,
    sessions,
    recompo,
    pesees,
    rankIndex: ri,
    rankName,
    nextName,
    image: persoDe(ri),
    imageSuivante: ri < 4 ? persoDe(ri + 1) : null,
  };

  // 27 octobre 2026 : ce que YOROI va faire pour toi, avec tes chiffres (le poids vise et les seances viennent de tes reponses)
  const choses = ceQueYoroiFait({
    objectifs: liste,
    depuis: start != null ? kg(start) : null,
    cible: !maintain && target != null ? kg(target as number) : null,
    seances: sessions,
    sports,
  });
  // 27 octobre 2026 (refonte Pastel) : un sticker par chose, plus de carre colore autour d'une icone
  const STICKER_CHOSE: Record<IdPourToi, NomSticker> = { coach: 'coach', pesee: 'balance', semaine: 'calendrier', combat: 'gants', premium: 'bilan' };
  const pagePourToi: PageCarrousel = {
    cle: 'pour_toi',
    contenu: () => (
      <Animated.View entering={FadeInDown.duration(380)} style={{ ...carte, gap: 14, backgroundColor: '#E8ECFF', borderWidth: 0 }}>
        <View style={{ gap: 2 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire('Pour toi')}</Ink>
          <Riche size={20} weight="black" color={c.ink} lineHeight={25} style={{ letterSpacing: -0.4 }} text={traduire('Ce que **YOROI** va faire pour toi')} />
        </View>
        {choses.map((k) => (
          <View key={k.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }} accessible accessibilityLabel={k.premium ? traduire('{0}, avec Premium. {1}', k.titre, k.texte) : `${k.titre}. ${k.texte}`}>
            <Image source={illus.img(STICKER_CHOSE[k.id], k.id === 'coach' ? sticker('coach') : null)} style={{ width: 42, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <View style={{ flex: 1, gap: 3 }}>
              {k.premium ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#F6EEDD', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <IconEspace name="crown" size={11} color="#A57A1C" />
                  <Ink size={10.5} weight="black" color="#A57A1C" style={{ letterSpacing: 0.6 }}>{traduire('PREMIUM')}</Ink>
                </View>
              ) : null}
              <Ink size={14.5} weight="black" color={c.ink} style={{ lineHeight: 19 }}>{k.titre}</Ink>
              <Ink size={13} weight="medium" color={c.textSecondary} style={{ lineHeight: 18 }}>{k.texte}</Ink>
            </View>
          </View>
        ))}
      </Animated.View>
    ),
  };

  // 26 octobre 2026 (Houari : « Ton plan est long, ils ne descendront pas jusqu'en bas ») : un carrousel de cartes
  const pagesBase: PageCarrousel[] = [
    ...(start != null
      ? [{
          cle: 'chemin',
          contenu: (largeur: number) => (
            <Animated.View entering={FadeInDown.duration(380)} style={carte}>
              <Image source={illus.img('torii')} style={{ position: 'absolute', right: 12, top: 10, width: 54, height: 54 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Ink size={11} weight="black" color="#3557D9" style={{ letterSpacing: 1.3 }}>{traduire('TON CHEMIN')}</Ink>
              {/* vague 30 : le poids vise en indigo, la date estimee dans l'or profond, en gras */}
              <Riche
                size={22}
                weight="black"
                color={c.ink}
                lineHeight={27}
                style={{ letterSpacing: -0.6 }}
                text={maintain ? traduire('Garder **{0} kg**', kg(start)) : v ? (ok ? traduire("Cap sur **{0} kg**", kg(target as number)) : v.titre) : traduire('Tu es déjà sur ton cap')}
              />
              {/* vague 50 : l'arrivee prevue comme sur Ton plan : le vrai torii et les vraies dates, en indigo fonce */}
              {ok && e?.kind === 'ok' ? <PiedArrivee arrivee={fourchetteDates(e.earliest, e.latest)} style={{ borderRadius: 16, borderWidth: 1, borderColor: '#EFE4C8', marginVertical: 2 }} /> : null}
              <PlanCurve start={start} target={maintain ? null : v ? v.courbeVers : target} width={Math.max(120, largeur - 32)} height={140} endLabel={v ? v.fin : null} />
              {/* 27 octobre 2026 : les paliers de ton chemin, avec tes kilos (25, 50, 75 % entre ton poids du jour et ton cap) */}
              {!maintain && target != null && Math.abs((target as number) - start) >= 1 ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[0.25, 0.5, 0.75].map((p, k) => (
                    <View key={p} style={{ flex: 1, borderRadius: 14, backgroundColor: ['#E8ECFF', '#EFE6F3', '#F6EEDD'][k], paddingVertical: 8, alignItems: 'center', gap: 1 }}>
                      <Ink size={10} weight="black" color={['#3557D9', '#8A3F78', '#A57A1C'][k]} style={{ letterSpacing: 0.8 }}>{traduire('PALIER {0}', k + 1)}</Ink>
                      <Ink size={15} weight="black" color={c.ink}>{`${kg(start + ((target as number) - start) * p)} kg`}</Ink>
                    </View>
                  ))}
                </View>
              ) : null}
              <Riche
                size={14}
                lineHeight={20}
                text={
                  maintain
                    ? liste.includes('gain')
                      ? traduire('Ton poids reste **stable** pendant que le muscle se construit : tes charges et tes mensurations montrent le progrès.')
                      : traduire('Ta courbe lissée te montre si tu restes **dans ta zone**, sans t’inquiéter d’une pesée isolée.')
                    : v && v.texte
                      ? marquer(`${v.texte}${ok ? ` ${seancesTexte(sessions)}` : ''} ${PAS_UNE_PROMESSE}`, [start != null && target != null ? gapText(start, target) : null, sessions ? `${sessions} ${sessions > 1 ? traduire('séances') : traduire('séance')}` : null, traduire('ton alimentation'), traduire('Une estimation')])
                      : traduire('Ta courbe lissée te montre ta tendance jour après jour.')
                }
              />
            </Animated.View>
          ),
        }]
      : []),
    {
      cle: 'semaine',
      contenu: (largeur: number) => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ ...carte, gap: 12, backgroundColor: '#E6ECF8', borderWidth: 0 }}>
          <View style={{ gap: 2 }}>
            <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ta semaine type")}</Ink>
            <Riche size={18} weight="black" color={c.ink} lineHeight={23} text={sessions ? traduirePluriel(sessions, sessions > 1, "**{0} séance** par semaine", "**{0} séances** par semaine", sessions) : traduire('À ton rythme')} />
            {days.length ? <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2}>{joursTexte(days).replace(/^./, (x) => x.toUpperCase())}</Ink> : null}
          </View>
          {/* 27 octobre 2026 : les ronds suivent la largeur de la carte (SE comme grands telephones) ; la repartition tourne */}
          <SemaineCouleurs days={days} sports={sports} size={Math.max(30, Math.min(42, Math.floor((largeur - 34) / 7) - 5))} />
        </Animated.View>
      ),
    },
    ...(baisse
      ? [
          { cle: 'comparaison', contenu: () => <Animated.View entering={FadeInDown.duration(380)}><PlanSport sessions={sessions} sports={sports} partie="barres" /></Animated.View> },
          { cle: 'conseils', contenu: () => <Animated.View entering={FadeInDown.duration(380)}><PlanSport sessions={sessions} sports={sports} partie="conseils" /></Animated.View> },
        ]
      : []),
    ...(cheminApercu
      ? [{
          cle: 'apercu',
          // 27 octobre 2026 : ton vrai nouvel accueil dans 4 semaines (ta scene, Ton poids, Ta semaine), avec tes chiffres
          contenu: () => (
            <Animated.View entering={FadeInDown.duration(380)} style={{ gap: 8 }}>
              <Ink size={11} weight="black" color="#8A3F78" style={{ letterSpacing: 1.3 }}>{traduire('TON ACCUEIL DANS 4 SEMAINES')}</Ink>
              <ApercuAccueil name={name} scene={imageScene} perso={univers === 'japon' ? guerrierImage(genre, 3) : persoDe(ri)} start={start} target={maintain ? null : target} sessions={sessions} days={days} sports={sports} pastille={traduire('Projection')} />
            </Animated.View>
          ),
        }]
      : []),
    {
      cle: 'dojo',
      contenu: () => (
        <Animated.View entering={FadeInDown.duration(380)} style={{ gap: 12 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ton Dojo, dès maintenant")}</Ink>
          <ApercuProgres {...apercuProps} partie="dojo" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, backgroundColor: pal.teinte, padding: 14 }}>
            <Image source={illus.img('coach', sticker('coach'))} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Riche size={13} lineHeight={18} color={c.ink} style={{ flex: 1 }} text={traduire('Après la visite de l’app, **ton coach** pourra te proposer un programme sur ces jours, avec tes réponses.')} />
          </View>
        </Animated.View>
      ),
    },
  ];

  // la carte « Pour toi » juste apres ton chemin (en premier sans chemin)
  const pages: PageCarrousel[] = pagesBase[0]?.cle === 'chemin' ? [pagesBase[0], pagePourToi, ...pagesBase.slice(1)] : [pagePourToi, ...pagesBase];

  return (
    <Shell {...nav} title={title} gap={14} scroll={false} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
      <CarrouselPlan pages={pages} />
    </Shell>
  );
}

export default Resultat;
