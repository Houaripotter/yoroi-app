/**
 * Grande scene illustree en haut de l'accueil (vague 15) : la scene choisie (chateau, nuit, dojo, sakura,
 * bambous...) en grand, recadree pour garder son chateau, son torii ou son temple bien visible.
 * En bas a gauche : ta photo de profil cerclee (la porte vers Reglages), la salutation, ton prenom, la date.
 * Le personnage se tient a droite, en decor. Vague 26 : la scene est plus basse (environ 230 points au lieu de 340)
 * et la vignette du poids en est sortie : la grande carte Poids (CartePoids.tsx) suit juste dessous.
 * Texte blanc sur les scenes sombres (nuit, bataille, port, dojo du soir), encre sur les scenes claires.
 * Vague 35 : la cloche et la lanterne (clair, sombre, auto) sont deux petits ronds translucides en haut a gauche,
 * loin du personnage ; en mode sombre le bas de la scene se fond dans le fond encre.
 * Vague 44 : la scene descend derriere la rangee des outils et s'efface en douceur sur 140 points (degrade a neuf
 * arrets, vers le papier en clair, vers le fond sombre en sombre) ; elle suit legerement le defilement (parallaxe,
 * parallaxe.ts) : la scene monte deux fois moins vite, le personnage a mi-chemin, un leger agrandissement quand tu tires.
 * 13 octobre : scene animee (SceneAnimee.tsx) : la video en boucle muette par dessus l'image fixe, dans le meme calque
 * (parallaxe et fondu de nuit inchanges), le son de la scene et son petit bouton en haut a droite.
 * 14 octobre : lisibilite. Le bas de chaque scene se fond dans la nuit, le texte encre devenait illisible sur les
 * scenes claires (Ruelle a l'aube, Sommet des nuages, Jardin zen). Le texte est maintenant toujours blanc avec une
 * ombre douce, sur un voile encre de nuit dose scene par scene (lib/v2/espace/lisibilite.ts, mesure sur l'image) :
 * contraste d'au moins 4,5 pour 1 partout, voile presque invisible sur les scenes deja sombres.
 * 14 octobre : le personnage pose les pieds sur le sol de chaque scene (lib/v2/espace/sol.ts, mesure image par image),
 * la marge transparente sous les pieds de chaque personnage est compensee. 15 octobre : plus d'ombre noire, un ancrage
 * tres discret seulement quand le personnage est pose au dessus des raccourcis (OmbrePieds).
 * L'image de la scene ne bouge pas. Sol trop bas (eau, nuages) : pieds juste au dessus de la bande des raccourcis.
 * 15 octobre (Houari : « une grande bande sombre entre la scene et les outils, on voit mal la scene ») : plus de bande
 * de nuit. La scene est un peu plus haute (226 a 274 points), elle descend derriere tes outils et se fond en un degrade
 * court et doux (FonduHorizon, 76 points) vers le fond de la page, clair ou sombre, qui commence juste au dessus des
 * pastilles : les outils sont poses sur la ligne d'horizon, leurs libelles sur le fond de la page. Le voile du salut
 * est local (plateau doux derriere ta photo et ton prenom), la droite de la scene et ton personnage restent lumineux.
 * Le plancher des pieds suit les pastilles (lib/v2/espace/sol.ts, PLANCHER_OUTILS).
 * 16 octobre (Personnaliser) : appui long sur la scene, Ta scene ; appui long sur ton personnage, Ton personnage
 * (un toucher sur le personnage ouvre toujours Ta scene, comme avant).
 * 16 octobre (miroir) : sur les scenes dont le seul sol est a gauche (Sommet des nuages, trois scenes Lanternes, Mer
 * la nuit), l'image retournee et le recadrage retourne mettent le sol a droite, sous ton personnage (lib/v2/espace/miroir.ts).
 * 19 octobre 2026 (Houari : « on ne voit pas la scene », le grand rond, le salut et la date la couvraient, tes outils
 * mangeaient son bas) : la scene devient une fenetre. Plus haute (260 a 330 points), coins du bas arrondis (28), elle
 * s'arrete au dessus de tes outils, rien ne la recouvre. Ta photo (58 points), « Bonne nuit, Athlète » sur une ligne et
 * la date forment un bandeau compact en bas a gauche, sur un degrade discret dose scene par scene (BandeauVoile). Le
 * haut et le centre de la scene sont libres ; la lanterne, la cloche et le son restent en haut, petits.
 * Les pieds du personnage restent 8 points au dessus du bord de la fenetre (lib/v2/espace/sol.ts, PLANCHER_FENETRE).
 * L'ancienne mise en page : _archive_ancien_design_2026-10-09/accueil_2026-10-19/ ; l'autre proposition (salut sous la
 * scene) : _propositions/accueil_2026-10-19/.
 * 27 octobre 2026 (refonte Pastel, maquette Pastel-Final-Accueil) : sur l'accueil, la scene devient une CARTE (prop
 * carte) : 16 points des bords, coins arrondis de 28 partout, ombre douce, environ 168 de haut. Plus de salut ni de
 * voile dessus (ta photo, la date et ton salut sont au dessus, sur le fond de la page : EnTeteAccueil.tsx), plus de
 * lanterne ni de cloche dedans (ils sont dans des ronds blancs a cote de ton salut). L'image est remontee juste ce
 * qu'il faut pour que son sol tombe dans la carte (lib/v2/saisons/geometrie.ts, remonteeScene), le personnage reste
 * pose dessus (lib/v2/espace/sol.ts). La video et le son restent, le petit bouton du son passe en bas a gauche.
 * L'apercu de Ta scene et la galerie du Studio gardent l'ancienne fenetre pleine largeur.
 */
import React from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { voileTexte } from '@/lib/v2/espace/lisibilite';
import { PLANCHER_FENETRE, placerPersonnage, solDeScene } from '@/lib/v2/espace/sol';
import { SCENE_CARTE, hauteurSceneCarte, remonteeScene } from '@/lib/v2/saisons/geometrie';
import { decalageScene, estEnMiroir, imageMiroir } from '@/lib/v2/espace/miroir';
import Animated, { FadeIn, FadeOut, type SharedValue } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { SceneId } from '@/lib/v2/espace';
import type { DayWeight } from '@/lib/v2/weightStats';
import { devNow } from '@/lib/v2/creator/devClock';
import { SCENE_FOCUS, SCENE_RATIO, personnageImage, sceneForNow, sceneIsDark } from './images';
import { SceneAnimee as SceneAnimeeCode } from '@/components/yoroi/v2/scenes/SceneAnimee';
import { animationDeScene } from '@/lib/v2/espace/voyages';
import { ENTREE, P, Press, shadow } from './kit';
import { NotifBell } from './NotifBell';
import { LanterneMode } from './Lanterne';
import { libelleMode, useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { paperA } from '@/components/yoroi/livePalette';
import type { YoroiMode } from '@/components/yoroi/tokens';
import { useRondProfil } from '@/components/yoroi/v2/espace/identite';
import { RondCadre } from '@/components/yoroi/v2/reglages/contour';
import { RondInitiales } from '@/components/yoroi/v2/espace/RondInitiales';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { useParallaxe } from './parallaxe';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { BoutonSon, SonDeScene, VideoScene, useEcranVisible, useVideoDeScene } from './SceneAnimee';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { traduire } from '@/lib/i18n/tr';

const DAYS = [traduire('Dimanche'), traduire('Lundi'), traduire('Mardi'), traduire('Mercredi'), traduire('Jeudi'), traduire('Vendredi'), traduire('Samedi')];
const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

export function greeting(): string {
  const h = devNow().getHours();
  if (h < 5) return traduire('Bonne nuit');
  if (h < 18) return traduire('Bonjour');
  return traduire('Bonsoir');
}

/** La date du jour, « Mardi 27 octobre » (l'en-tete de l'accueil) */
export function dateDuJour(now: Date = devNow()): string {
  return `${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

/**
 * Hauteur de la scene : entre 220 et 265 points selon l'encoche (24 octobre, Houari : plus petite, 250 sur un iPhone 15 Pro Max ; 19 octobre : 317).
 * Avant : 226 a 274, avec 64 points caches derriere tes outils.
 */
export function sceneHeight(top: number): number {
  return Math.max(220, Math.min(265, top + 191));
}

/** 19 octobre : le calque de la scene ne deborde plus sous tes outils (avant : 64 points) */
export const DEBORD_SCENE = 0;
/** Coins du bas de la fenetre de la scene */
export const RAYON_SCENE = 28;
/** Ecart entre le bas de la fenetre et tes outils (app/(tabs)/index.tsx) */
export const ECART_SOUS_SCENE = 8;
/** Le bandeau du bas : ta photo (58 points avec son contour), 14 points au dessus du bord, 18 du bord gauche */
export const BANDEAU = { photo: 58, bas: 14, gauche: 18, voile: 104 };
/** Le degrade de l'horizon commence FONDU_AU_DESSUS points au dessus du bas de la scene, sur FONDU_HORIZON points */
export const FONDU_AU_DESSUS = 8;
export const FONDU_HORIZON = 76;

/**
 * Degrade de l'horizon (15 octobre) : la scene se fond dans le fond de la page (papier en clair, encre en sombre),
 * courbe en S sur neuf arrets, aucune cassure. Pose dans le contenu juste derriere tes outils (il suit le defilement
 * avec eux, leurs libelles restent toujours sur le fond de la page) ; sous le degrade, le fond de la page cache le bas
 * du calque de la scene quand il suit la page plus lentement (parallaxe).
 * plein : hauteur du fond uni sous le degrade (0 dans l'apercu de Ta scene).
 */
export function FonduHorizon({ top, plein = 0 }: { top: number; plein?: number }) {
  useYoroiTheme();
  const n = 9;
  const colors: string[] = [];
  const locations: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    colors.push(paperA(Math.round(lisse(t) * 1000) / 1000));
    locations.push(Math.round(t * 1000) / 1000);
  }
  return (
    <>
      <LinearGradient pointerEvents="none" colors={colors as [string, string, ...string[]]} locations={locations as [number, number, ...number[]]} style={{ position: 'absolute', left: 0, right: 0, top, height: FONDU_HORIZON }} />
      {plein > 0 ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: top + FONDU_HORIZON - 1, height: plein + 1, backgroundColor: P.paper }} /> : null}
    </>
  );
}

type Props = {
  top: number;
  scene: SceneId;
  name: string | null;
  personnage: string;
  /** sert seulement a choisir l'illustration du personnage (decor, aucun rang ecrit) */
  rankIndex: number;
  photo: string | null;
  /** garde pour la compatibilite : le poids n'est plus affiche dans la scene (vague 26) */
  series?: DayWeight[];
  targetWeight?: number | null;
  /** vague 44 : position de defilement de la page (parallaxe), absente : la scene reste fixe */
  scrollY?: SharedValue<number>;
  /** vague 44 : apercu (page Ta scene) : pas de boutons, pas de rond cliquable */
  apercu?: boolean;
  /** largeur imposee (apercu dans une carte), sinon la largeur de l'ecran */
  largeur?: number;
  /** 15 octobre : image fixe seulement (bandeau compact de Ta scene, une seule video a la fois) */
  sansVideo?: boolean;
  /** 27 octobre 2026 (refonte Pastel) : la scene en carte arrondie de l'accueil, largeur = largeur de la carte */
  carte?: boolean;
  /** dans la carte : le decor de saison, pose par dessus la scene et coupe par ses coins */
  decor?: React.ReactNode;
};

export function SceneHero(props: Props) {
  if (props.carte) return <SceneCarte {...props} />;
  return <SceneFenetre {...props} />;
}

function SceneFenetre({ top, scene, name, personnage, rankIndex, photo, scrollY, apercu = false, largeur, sansVideo = false }: Props) {
  const { width: ecran } = useWindowDimensions();
  const router = useRouter();
  const width = largeur ?? ecran;
  const now = devNow();
  const dark = sceneIsDark(scene, now);
  const { isDark: appSombre } = useYoroiTheme();
  // 14 octobre : le bas de la scene se fond toujours dans la nuit, le texte est donc toujours blanc, sur un voile dose par scene
  const voile = voileTexte(scene, now);
  const H = sceneHeight(top);
  const [toast, setToast] = React.useState<YoroiMode | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);
  const montrerMode = (m: YoroiMode) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };

  // 19 octobre : le calque s'arrete au bas de la fenetre (DEBORD_SCENE vaut 0), tes outils sont dessous
  const HT = H + DEBORD_SCENE;
  const { scene: styleScene, perso: stylePerso } = useParallaxe(scrollY, HT);
  // recadrage : l'image couvre la hauteur, on la decale pour garder son centre d'interet a 42 % de l'ecran
  const imgH = Math.max(HT, width / SCENE_RATIO);
  const imgW = imgH * SCENE_RATIO;
  const focus = SCENE_FOCUS[scene] ?? 0.5;
  // 16 octobre : scene en miroir (le sol passe a droite, sous ton personnage) : image et recadrage retournes
  const miroir = estEnMiroir(scene);
  const shift = decalageScene({ imgW, largeur: width, focus, miroir });
  // scene animee : la video, si la scene en a une et que l'animation est permise ; pause hors de l'ecran
  const videoScene = useVideoDeScene(scene);
  const video = sansVideo ? null : videoScene;
  const { visible } = useEcranVisible();
  const animCode = sansVideo ? null : animationDeScene(scene);

  // personnage : a droite, les pieds sur le sol de la scene (14 octobre), plus petit quand le sol est lointain
  const place = placerPersonnage({ H, imgH, top, scene, personnage, date: now, plancher: PLANCHER_FENETRE });
  const { charH, charW } = place;
  const charRight = -charW * 0.12;
  // bord gauche visible du personnage (le dessin occupe 21 % a 83 % de l'image)
  const charLeft = width - charRight - charW + charW * 0.21;
  // 19 octobre : le bandeau s'arrete avant le personnage
  const blockW = Math.max(200, Math.min(320, charLeft - 8 - BANDEAU.gauche));

  const ink = P.pureWhite;
  const ink2 = 'rgba(255,255,255,0.92)';
  const textShadow = { textShadowColor: 'rgba(10,12,20,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 };

  return (
    <View style={{ height: H, zIndex: 0 }}>
      {/* le calque de la scene : la fenetre aux coins du bas arrondis, elle suit legerement le defilement */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: HT, overflow: 'hidden', borderBottomLeftRadius: RAYON_SCENE, borderBottomRightRadius: RAYON_SCENE, backgroundColor: dark ? '#1E2336' : P.paper }, styleScene]}>
        {animCode != null ? (
          // 18 octobre : scene du pack Voyages, animee en code (pluie, neige, etoiles, lueurs), sans video
          <SceneAnimeeCode key={scene} source={sceneForNow(scene, now)} scene={animCode} width={imgW} height={imgH} actif={visible} style={{ position: 'absolute', top: 0, left: -shift }} />
        ) : (
          <Image
            source={imageMiroir(scene) ?? sceneForNow(scene, now)}
            style={{ position: 'absolute', top: 0, left: -shift, width: imgW, height: imgH }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        )}
        {video != null ? <VideoScene key={scene} source={video} joue={visible} style={{ position: 'absolute', top: 0, left: -shift, width: imgW, height: imgH, ...(miroir ? { transform: [{ scaleX: -1 }] } : null) }} /> : null}
        {/* voile tres leger sous la barre d'etat : le decor reste bien visible */}
        <LinearGradient
          pointerEvents="none"
          colors={dark || appSombre ? ['rgba(16,19,27,0.5)', 'rgba(16,19,27,0)'] : [paperA(0.55), paperA(0)]}
          locations={[0, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top + 40 }}
        />
      </Animated.View>
      {/* 19 octobre : le degrade discret du bandeau, pose avec ton salut (il defile avec lui), dose pour chaque scene */}
      <BandeauVoile H={H} alpha={voile} />

      {/* vague 49 : un toucher sur la scene (hors lanterne, cloche, rond de profil) ouvre Reglages, Ta scene */}
      {apercu ? null : (
        <Pressable
          onPress={() => router.push(ROUTES_PERSONNALISER.scene as any)}
          onLongPress={() => {
            impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
            router.push(ROUTES_PERSONNALISER.scene as any);
          }}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel={traduire("Changer ta scène")}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      )}

      {/* Vague 45 : « Sans personnage », la scene reste seule (aucune figure, aucun libelle) */}
      {aUnPersonnage(personnage) ? (
        <Animated.View entering={ENTREE} pointerEvents="none" style={[{ position: 'absolute', right: charRight, bottom: place.bas - OMBRE_MARGE, width: charW, height: charH + OMBRE_MARGE }, stylePerso]}>
          {/* 15 octobre : plus d'ombre noire ; seulement un leger ancrage quand les pieds sont poses au dessus des raccourcis */}
          {place.compromis ? <OmbrePieds largeur={charW} y={charH - (H - place.pieds - place.bas)} sombre={dark} /> : null}
          <Image source={personnageImage(personnage, rankIndex)} style={{ position: 'absolute', left: 0, top: 0, width: charW, height: charH }} resizeMode="contain" accessibilityLabel={traduire("Ton personnage")} />
        </Animated.View>
      ) : null}
      {/* 16 octobre : la zone du dessin du personnage (21 % a 83 % de l'image) : appui long, Ton personnage */}
      {aUnPersonnage(personnage) && !apercu ? (
        <Pressable
          onPress={() => router.push(ROUTES_PERSONNALISER.scene as any)}
          onLongPress={() => {
            impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
            router.push(ROUTES_PERSONNALISER.personnage as any);
          }}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel={traduire("Ton personnage. Appui long pour le changer")}
          accessibilityActions={[{ name: 'longpress', label: traduire('Changer ton personnage') }]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'longpress') router.push(ROUTES_PERSONNALISER.personnage as any);
          }}
          style={{ position: 'absolute', right: charRight + charW * 0.17, bottom: place.bas, width: charW * 0.62, height: charH * 0.92 }}
        />
      ) : null}

      {/* tout en haut a gauche, juste sous la barre d'etat : la lanterne (clair, sombre, auto), puis la toute petite cloche */}
      {apercu ? null : (
        <View style={{ position: 'absolute', top: top + 2, left: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TourAnchor id="accueil.lanterne">
            <LanterneMode sceneSombre={dark} onChange={montrerMode} />
          </TourAnchor>
          <NotifBell sceneSombre={dark} />
        </View>
      )}
      {/* scene animee : le son (coupe par defaut) et son petit bouton, en haut a droite, loin de la lanterne et de la cloche */}
      {apercu ? null : <SonDeScene scene={scene} />}
      {apercu ? null : (
        <View style={{ position: 'absolute', top: top + 2, right: 16 }}>
          <BoutonSon scene={scene} sceneSombre={dark} />
        </View>
      )}
      {toast ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(220)} pointerEvents="none" style={{ position: 'absolute', top: top + 4, left: 100, paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: 'rgba(14,17,26,0.72)' }}>
          <Ink size={12} weight="bold" color={P.pureWhite} numberOfLines={1}>
            {libelleMode(toast)}
          </Ink>
        </Animated.View>
      ) : null}

      {/* 19 octobre : le bandeau compact en bas a gauche, ta photo, ton salut sur une ligne, la date */}
      <View style={{ position: 'absolute', left: BANDEAU.gauche, bottom: BANDEAU.bas, width: blockW }}>
        <Animated.View entering={ENTREE} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TourAnchor id={apercu ? 'apercu.profil' : 'accueil.profil'}>
            <RondProfil photo={photo} personnage={personnage} rankIndex={rankIndex} apercu={apercu} nom={name} />
          </TourAnchor>
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={21} weight="black" tight color={ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} accessibilityRole="header" style={textShadow}>
              {`${greeting()}, ${name ?? traduire('Athlète')}`}
            </Ink>
            <Ink size={13} weight="bold" color={ink2} numberOfLines={1} style={textShadow}>
              {`${DAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`}
            </Ink>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * 27 octobre 2026 (refonte Pastel) : la scene de l'accueil en carte arrondie. Meme image, meme video, meme son, meme
 * personnage pose sur le sol, memes touchers (Ta scene, appui long sur ton personnage) ; ni salut, ni lanterne, ni cloche.
 */
function SceneCarte({ scene, personnage, rankIndex, largeur, decor }: Props) {
  const router = useRouter();
  const { width: ecran } = useWindowDimensions();
  const width = largeur ?? ecran - 32;
  const now = devNow();
  const dark = sceneIsDark(scene, now);
  const H = hauteurSceneCarte(width);
  const imgH = Math.max(H, width / SCENE_RATIO);
  const imgW = imgH * SCENE_RATIO;
  const focus = SCENE_FOCUS[scene] ?? 0.5;
  const miroir = estEnMiroir(scene);
  const shift = decalageScene({ imgW, largeur: width, focus, miroir });
  // l'image remonte juste assez pour que son sol tombe dans la carte
  const dy = remonteeScene({ H, imgH, sol: solDeScene(scene, now).sol });
  const videoScene = useVideoDeScene(scene);
  const { visible } = useEcranVisible();
  const animCode = animationDeScene(scene);
  // dans le repere de l'image : la carte va de dy a dy + H ; la tete reste 12 points sous le haut de la carte
  const place = placerPersonnage({ H: H + dy, imgH, top: dy - 28, scene, personnage, date: now, plancher: PLANCHER_FENETRE });
  const { charH, charW } = place;
  const charRight = -charW * 0.12;
  return (
    <View style={{ height: H, borderRadius: SCENE_CARTE.rayon, backgroundColor: dark ? '#1E2336' : P.white, shadowColor: '#1D2033', shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 5 }}>
      <View style={{ flex: 1, borderRadius: SCENE_CARTE.rayon, overflow: 'hidden' }}>
        {animCode != null ? (
          <SceneAnimeeCode key={scene} source={sceneForNow(scene, now)} scene={animCode} width={imgW} height={imgH} actif={visible} style={{ position: 'absolute', top: -dy, left: -shift }} />
        ) : (
          <Image source={imageMiroir(scene) ?? sceneForNow(scene, now)} style={{ position: 'absolute', top: -dy, left: -shift, width: imgW, height: imgH }} resizeMode="cover" accessibilityIgnoresInvertColors />
        )}
        {videoScene != null ? <VideoScene key={scene} source={videoScene} joue={visible} style={{ position: 'absolute', top: -dy, left: -shift, width: imgW, height: imgH, ...(miroir ? { transform: [{ scaleX: -1 }] } : null) }} /> : null}
        <Pressable
          onPress={() => router.push(ROUTES_PERSONNALISER.scene as any)}
          onLongPress={() => {
            impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
            router.push(ROUTES_PERSONNALISER.scene as any);
          }}
          delayLongPress={450}
          accessibilityRole="button"
          accessibilityLabel={traduire("Changer ta scène")}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
        {decor ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width, height: H }}>{decor}</View> : null}
        {aUnPersonnage(personnage) ? (
          <Animated.View entering={ENTREE} pointerEvents="none" style={{ position: 'absolute', right: charRight, bottom: place.bas - OMBRE_MARGE, width: charW, height: charH + OMBRE_MARGE }}>
            {place.compromis ? <OmbrePieds largeur={charW} y={charH - (H + dy - place.pieds - place.bas)} sombre={dark} /> : null}
            <Image source={personnageImage(personnage, rankIndex)} style={{ position: 'absolute', left: 0, top: 0, width: charW, height: charH }} resizeMode="contain" accessibilityLabel={traduire("Ton personnage")} />
          </Animated.View>
        ) : null}
        {aUnPersonnage(personnage) ? (
          <Pressable
            onPress={() => router.push(ROUTES_PERSONNALISER.scene as any)}
            onLongPress={() => {
              impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
              router.push(ROUTES_PERSONNALISER.personnage as any);
            }}
            delayLongPress={450}
            accessibilityRole="button"
            accessibilityLabel={traduire("Ton personnage. Appui long pour le changer")}
            accessibilityActions={[{ name: 'longpress', label: traduire('Changer ton personnage') }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'longpress') router.push(ROUTES_PERSONNALISER.personnage as any);
            }}
            style={{ position: 'absolute', right: charRight + charW * 0.17, bottom: place.bas, width: charW * 0.62, height: charH * 0.92 }}
          />
        ) : null}
        {/* le son de la scene (coupe par defaut) et son petit bouton, en bas a gauche de la carte */}
        <SonDeScene scene={scene} />
        <View style={{ position: 'absolute', left: 12, bottom: 12 }}>
          <BoutonSon scene={scene} sceneSombre={dark} />
        </View>
      </View>
    </View>
  );
}

/** Place laissee sous l'image du personnage pour son ombre */
const OMBRE_MARGE = 12;

/**
 * Ombre sous les pieds du personnage (14 octobre, adoucie le 15 octobre). Houari l'a vue comme « un truc noir en
 * dessous » : elle n'apparait plus que sur les scenes ou le sol est hors du cadre (eau, nuages, ponton), quand
 * les pieds sont poses juste au dessus des raccourcis. Ellipse large et plate, tres floue (fondu en sept paliers),
 * opacite faible, teinte de la scene : encre de nuit sur les scenes sombres, gris bleute sur les scenes claires.
 * y : hauteur des pieds dans le calque du personnage.
 */
function OmbrePieds({ largeur, y, sombre }: { largeur: number; y: number; sombre: boolean }) {
  const gid = `ombrePieds${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const rx = largeur * 0.36;
  const ry = largeur * 0.045;
  const teinte = sombre ? `rgb(${NUIT_RGB})` : 'rgb(46,52,70)';
  const a = sombre ? 0.26 : 0.2;
  const paliers = [0, 0.18, 0.36, 0.54, 0.72, 0.86, 1].map((d) => {
    const k = 1 - d;
    return { offset: d, opacity: Math.round(a * k * k * (3 - 2 * k) * 1000) / 1000 };
  });
  return (
    <Svg pointerEvents="none" width={largeur} height={ry * 2 + 2} style={{ position: 'absolute', left: 0, top: y - ry * 1.3 - 1 }}>
      <Defs>
        <RadialGradient id={gid} cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%">
          {paliers.map((p) => (
            <Stop key={p.offset} offset={p.offset} stopColor={teinte} stopOpacity={p.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Ellipse cx={largeur * 0.5} cy={ry + 1} rx={rx} ry={ry} fill={`url(#${gid})`} />
    </Svg>
  );
}

/** Encre de nuit du voile (meme teinte que la bande des outils) */
const NUIT_RGB = '20,22,31';
const lisse = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Degrade du bandeau (19 octobre 2026) : de transparent a l'encre de nuit sur les BANDEAU.voile points du bas de la
 * fenetre, courbe en S sur neuf arrets, coins du bas arrondis comme la scene. Son intensite suit la mesure de chaque
 * scene (lib/v2/espace/lisibilite.ts) : a peine visible sur les scenes deja sombres, plus present sur les claires,
 * pour garder le texte blanc lisible. Le haut et le centre de la scene ne sont jamais voiles.
 * (Le voile en plateau du 15 octobre, VoileTexte, est archive : _archive_ancien_design_2026-10-09/accueil_2026-10-19/.)
 */
export function alphaBandeau(voile: number): number {
  return Math.round(Math.max(0.42, Math.min(0.74, 0.4 + voile * 0.5)) * 1000) / 1000;
}

function BandeauVoile({ H, alpha }: { H: number; alpha: number }) {
  const v = React.useMemo(() => {
    const fin = alphaBandeau(alpha);
    const n = 9;
    const colors: string[] = [];
    const locations: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      colors.push(`rgba(${NUIT_RGB},${Math.round(fin * lisse(t) * 1000) / 1000})`);
      locations.push(Math.round(t * 1000) / 1000);
    }
    return { colors: colors as [string, string, ...string[]], locations: locations as [number, number, ...number[]] };
  }, [alpha]);
  const h = Math.min(BANDEAU.voile, H);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: H - h, height: h, overflow: 'hidden', borderBottomLeftRadius: RAYON_SCENE, borderBottomRightRadius: RAYON_SCENE }}>
      <LinearGradient pointerEvents="none" colors={v.colors} locations={v.locations} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
    </View>
  );
}

/**
 * Rond de profil, seule porte vers Reglages : grand, pres du prenom. Vague 41 : son contour se choisit
 * dans Reglages (Aucun, Fin par defaut, Or, Indigo), sans aucun lien avec le rang.
 * Il relit le profil et le choix photo ou personnage a chaque retour sur l'accueil et des qu'ils changent.
 * Sans photo choisie, le personnage choisi (jamais une icone vide).
 * Vague 45 : « Sans personnage » et pas de photo, les initiales du prenom (ou une icone de personne sobre).
 */
export function RondProfil({ photo: initialPhoto, personnage: initialPerso, rankIndex, apercu = false, nom, taille }: { photo: string | null; personnage: string; rankIndex: number; apercu?: boolean; nom?: string | null; taille?: number }) {
  const router = useRouter();
  const { photo, personnage, contour } = useRondProfil({ photo: initialPhoto, personnage: initialPerso });
  const [broken, setBroken] = React.useState(false);
  React.useEffect(() => setBroken(false), [photo]);
  const shown = photo && !broken ? photo : null;
  // 19 octobre : 50 points (58 avec le contour), au lieu de 64 (72) : un bandeau compact
  // 27 octobre 2026 (refonte Pastel) : taille donnee (48 dans l'en-tete de l'accueil), fond bleu pastel, ombre douce
  const S = taille ? taille - 8 : 50;
  const ombre = taille ? { shadowColor: '#1D2033', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 } : shadow;
  return (
    <Press disabled={apercu} onPress={() => router.push('/settings' as any)} accessibilityRole={apercu ? undefined : 'button'} accessibilityLabel={apercu ? traduire('Ton rond de profil') : traduire('Ton profil et tes réglages')} hitSlop={6}>
      <View style={[{ width: S + 8, height: S + 8, borderRadius: (S + 8) / 2 }, ombre]}>
        <RondCadre size={S + 8} contour={contour} fond="scene" fill={taille ? P.tuileIndigo : P.paper}>
          {shown ? (
            <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setBroken(true)} accessibilityIgnoresInvertColors />
          ) : !aUnPersonnage(personnage || initialPerso) ? (
            <RondInitiales size={S} nom={nom} />
          ) : (
            <BusteRond source={personnageImage(personnage || initialPerso, rankIndex)} />
          )}
        </RondCadre>
      </View>
    </Press>
  );
}
