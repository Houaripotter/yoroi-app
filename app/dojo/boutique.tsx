/**
 * Personnages et scenes : le Guerrier gratuit, les personnages du monde samourai (gagnes avec
 * le rang, tous ouverts avec Premium), le Sportif et la Sportive, les packs Vie reelle, sport et legendes, et les scenes.
 * Les packs ne sont pas encore en vente (produits non crees dans les stores) : aucun faux achat.
 * Equiper un personnage Classique ou « Sans personnage » met l'univers classique, le Guerrier ou un personnage
 * du monde samourai remet l'univers japon ; les packs Vie reelle, sport et legendes ne changent pas l'univers.
 * Les noms de rangs passent tous par rangNom(index, univers de l'espace).
 *
 * 16 octobre 2026, refonte de la presentation (Houari : « tu peux mieux presenter la page des personnages ») :
 *  - apercu compact colle en haut pendant le defilement : toucher une vignette l'essaie tout de suite,
 *    le bouton Equiper valide (ou Debloquer, qui ouvre Premium) ; Annuler revient a ce qui est equipe ;
 *  - onglets en pastilles qui passent a la ligne, avec leur compteur ;
 *  - vignettes de meme taille sur 3 colonnes, fond doux par categorie, sous-groupes titres ;
 *  - equipe : contour indigo et badge ; Premium : un cadenas sobre ;
 *  - un pack Vie reelle s'essaie dans sa scene assortie (« Avec sa scene », a decocher) ;
 *  - teinte de peau : rangee de visages a cote de Homme et Femme quand des variantes existent
 *    (lib/v2/dojo/packsTeintes.ts), la teinte est gardee dans la cle du personnage (cleAvecTeinte).
 * Ancienne version : _archive_ancien_design_2026-10-09/page_personnages/boutique.tsx.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BreathingFigure, GlassTag, ScenePlate } from '@/components/yoroi/v2/dojo/DojoHero';
import { BackHeader, CheckIcon, ChevronIcon, tap } from '@/components/yoroi/v2/dojo/parts';
import { GenreBascule, Grille, GroupeTitre, Onglets, Teintes, Vignette, VignetteScene, fondFamille, selection } from '@/components/yoroi/v2/dojo/personnages/Galerie';
import type { FamilleFond } from '@/components/yoroi/v2/dojo/personnages/Galerie';
import { usePremium } from '@/context/PremiumContext';
import { saveEspace } from '@/lib/v2/espace';
import type { Espace, SceneId } from '@/lib/v2/espace';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import { SANS_PERSONNAGE, rangNom } from '@/lib/v2/dojo/univers';
import { universDe } from '@/lib/v2/dojo/dojoAffichage';
import { estSceneClassique } from '@/lib/v2/espace/classique';
import { NATURE_SCENE_IDS } from '@/lib/v2/espace/nature';
import { VOYAGE_SCENE_IDS, animationDeScene } from '@/lib/v2/espace/voyages';
import { essaiEnCours, palierDeScene, sceneGagnee } from '@/lib/v2/dojo/recompensesScenes';
import { VIE_SCENE_IDS } from '@/lib/v2/espace/packsScenes';
import {
  MONDE_PERSONNAGES,
  VIE_PERSONNAGES,
  PACKS,
  THEMES,
  THEME_IMAGES,
  cleAvecTeinte,
  getOwnedPacks,
  isPackUnlocked,
  isThemeUnlocked,
  memePersonnage,
  packImage,
  packLevel,
  parsePersonnage,
  personnageImage,
  personnageKey,
  personnageName,
  separerTeinte,
  themeById,
  themeCondition,
  variantesDuPack,
} from '@/lib/v2/dojo/personnages';
import { imageTeinteLegende } from '@/lib/v2/dojo/legendesTeintes';
import type { Gender, PackDef } from '@/lib/v2/dojo/personnages';
import { imageTeinte, variantesDisponibles } from '@/lib/v2/dojo/packsTeintes';
import type { VarianteTeinte } from '@/lib/v2/dojo/packsTeintes';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P, blancA } from '@/components/yoroi/livePalette';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { CollectionBientot } from '@/components/yoroi/v2/dojo/CollectionBientot';
import { CATEGORIES_VIE, PACKS_VIE_PRETS } from '@/lib/v2/dojo/packsVie';
import type { CategorieVie } from '@/lib/v2/dojo/packsVie';
import { traduire } from '@/lib/i18n/tr';

type Tab = 'monde' | 'classique' | 'vie' | 'sport' | 'legende' | 'themes';
type Teinte = VarianteTeinte | 'origine';

const FOND_VIE: Record<CategorieVie, FamilleFond> = { metiers: 'indigo', sports: 'mousse', epoques: 'or' };

const PACKS_SPORT = PACKS.filter((p) => p.kind === 'sport');
const PACKS_LEGENDE = PACKS.filter((p) => p.kind === 'legende');
const SCENES_CLASSIQUES = THEMES.filter((t) => estSceneClassique(t.id));

/** Scene assortie d'un pack Vie reelle, si elle est dessinee */
function sceneDuPack(p: PackDef | null | undefined): SceneId | null {
  if (!p || p.kind !== 'vie') return null;
  const id = PACKS_VIE_PRETS.find((v) => v.id === p.id)?.scene ?? null;
  return id && THEMES.some((t) => t.id === id) ? (id as SceneId) : null;
}

/** Les scenes rangees par famille, la famille de ton univers en tete */
function groupesScenes(classiqueDabord: boolean) {
  const nature = NATURE_SCENE_IDS as readonly string[];
  const vie = VIE_SCENE_IDS as readonly string[];
  const voyages = VOYAGE_SCENE_IDS as readonly string[];
  const japon = { id: 'japon', titre: 'Japon', liste: THEMES.filter((t) => !estSceneClassique(t.id) && !nature.includes(t.id) && !vie.includes(t.id) && !voyages.includes(t.id)) };
  const classique = { id: 'classique', titre: 'Classique', liste: SCENES_CLASSIQUES };
  // 18 octobre 2026 : le pack Voyages, scenes animees (trois se gagnent avec la serie de jours), juste apres ta famille
  const voyage = { id: 'voyages', titre: traduire('Voyages'), liste: THEMES.filter((t) => voyages.includes(t.id)) };
  const reste = [
    { id: 'nature', titre: traduire('Nature et ville'), liste: THEMES.filter((t) => nature.includes(t.id)) },
    { id: 'vie', titre: traduire('Vie réelle'), liste: THEMES.filter((t) => vie.includes(t.id)) },
  ];
  return [...(classiqueDabord ? [classique, voyage, japon] : [japon, voyage, classique]), ...reste].filter((g) => g.liste.length > 0);
}

export default function Boutique() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { snap, espace } = useArmure();
  const { isPremium, isAnnualPremium, restore } = usePremium();
  const [tab, setTab] = useState<Tab | null>(null);
  const [owned, setOwned] = useState<string[]>([]);
  const [restoring, setRestoring] = useState(false);
  const equipKey = espace.personnage;
  const current = parsePersonnage(equipKey);
  const univers = universDe(espace);
  // l'onglet ouvert par defaut est celui du personnage equipe
  const activeTab: Tab = tab ?? (current.kind === 'classique' || current.kind === 'aucun' ? 'classique' : current.kind === 'pack' && current.pack.kind !== 'monde' ? current.pack.kind : 'monde');
  const [genre, setGenre] = useState<Gender>(current.gender);
  // ce que tu essaies dans l'apercu du haut (null : ce qui est equipe)
  const [candPerso, setCandPerso] = useState<string | null>(null);
  const [candScene, setCandScene] = useState<SceneId | null>(null);
  // 18 octobre 2026 : la teinte de peau choisie vaut pour TOUS les personnages de la galerie (Houari : « je
  // selectionne homme noir et ce n'est pas tous les personnages qui se mettent en noir »). Elle part de celle du
  // personnage equipe. Un personnage sans cette variante garde son dessin d'origine.
  const [teinteGlobale, setTeinteGlobale] = useState<VarianteTeinte | null>(() => separerTeinte(equipKey).teinte);

  useEffect(() => {
    void getOwnedPacks().then(setOwned);
  }, []);

  const rankIndex = snap?.state.rank.index ?? 0;
  const counts = snap?.state.sportCounts ?? {};

  // mise en page : 3 colonnes de personnages, 2 colonnes de scenes
  const cw = width - 44;
  const col3 = Math.floor((cw - 20) / 3);
  const col2 = Math.floor((cw - 12) / 2);
  const heroH = Math.round(Math.min(212, Math.max(176, width * 0.48)));
  const figH = heroH - 8;
  const figW = Math.round(figH * 0.75);

  /* ---------- ce qui est montre en haut ---------- */
  const shownKey = candPerso ?? equipKey;
  const shownScene: SceneId = candScene ?? espace.scene;
  const shown = parsePersonnage(shownKey);
  const persoChange = candPerso !== null && candPerso !== equipKey;
  const sceneChange = candScene !== null && candScene !== espace.scene;
  const previewing = persoChange || sceneChange;
  const sansFigure = shown.kind === 'aucun';
  const shownImage = personnageImage(shownKey, rankIndex, counts);
  const shownName = personnageName(shownKey);
  const shownPack = shown.kind === 'pack' ? shown.pack : null;

  /** La cle d'un personnage avec la teinte choisie dans la galerie, si ce personnage l'a dans ce genre */
  const avecTeinteGlobale = (base: string): string => {
    const p = parsePersonnage(base);
    if (!teinteGlobale || p.kind !== 'pack') return separerTeinte(base).base;
    return cleAvecTeinte(base, variantesDuPack(p.pack, p.gender).includes(teinteGlobale) ? teinteGlobale : null);
  };

  const persoLibre = (key: string) => {
    const p = parsePersonnage(key);
    return p.kind !== 'pack' || isPackUnlocked(p.pack, owned, rankIndex, isPremium);
  };
  const sceneLibre = (id: SceneId) => {
    const t = THEMES.find((x) => x.id === id);
    return !t || isThemeUnlocked(t, rankIndex, isPremium, isAnnualPremium);
  };
  const persoOk = !persoChange || persoLibre(candPerso as string);
  const sceneOk = !sceneChange || sceneLibre(candScene as SceneId);

  // la scene assortie du pack Vie reelle essaye, cochee par defaut
  const sceneAssortie = sceneDuPack(shownPack);
  const avecSceneAssortie = !!sceneAssortie && shownScene === sceneAssortie;
  const montrerSceneAssortie = !!sceneAssortie && sceneAssortie !== espace.scene && previewing;

  // teintes du pack Vie reelle regarde : le dessin d'origine et les variantes deja dessinees
  const teintes = useMemo(() => {
    const opts: { id: Teinte; source: ImageSourcePropType }[] = [];
    if (!shownPack || (shownPack.kind !== 'vie' && shownPack.kind !== 'legende')) return opts;
    const g = shown.gender;
    // 18 octobre 2026 : les Legendes aussi. Les visages viennent du niveau 1 (aux niveaux 2 et 3, masque, casque
    // ou massue cachent le visage dans la petite pastille)
    const lvl = 1;
    opts.push({ id: 'origine', source: packImage(shownPack, g, lvl) });
    for (const v of variantesDuPack(shownPack, g)) {
      const img = shownPack.kind === 'legende' ? imageTeinteLegende(shownPack.id, v, lvl) : imageTeinte(shownPack.id, v, g);
      if (img !== undefined) opts.push({ id: v, source: img });
    }
    return opts;
  }, [shownPack, shown.gender, rankIndex, counts]);
  const teinteVue: Teinte = shown.kind === 'pack' && shown.teinte ? shown.teinte : teinteGlobale ?? 'origine';

  const clear = () => {
    setCandPerso(null);
    setCandScene(null);
  };

  /** Essayer un personnage : il s'affiche tout de suite en haut */
  const essayer = (base: string, pack?: PackDef) => {
    selection();
    // la teinte choisie dans la galerie suit, si ce personnage l'a dans ce genre
    const key = avecTeinteGlobale(base);
    if (key === equipKey) {
      clear();
      return;
    }
    setCandPerso(key);
    const sc = sceneDuPack(pack);
    setCandScene(sc && sc !== espace.scene ? sc : null);
  };

  const essayerScene = (id: SceneId) => {
    selection();
    setCandScene(id === espace.scene ? null : id);
  };

  const changerGenre = (g: Gender) => {
    setGenre(g);
    // le personnage essaye suit le genre choisi
    if (!candPerso) return;
    let key: string | null = null;
    if (shown.kind === 'pack' && shown.pack.kind !== 'legende') {
      key = avecTeinteGlobale(personnageKey(shown.pack, g));
    } else if (shown.kind === 'guerrier' || shown.kind === 'classique') {
      key = `${shown.kind}_${g}`;
    }
    if (key) setCandPerso(key === equipKey ? null : key);
  };

  const changerTeinte = (v: Teinte) => {
    setTeinteGlobale(v === 'origine' ? null : v);
    const key = cleAvecTeinte(shownKey, v === 'origine' ? null : v);
    setCandPerso(key === equipKey ? null : key);
  };

  const basculerSceneAssortie = () => {
    if (!sceneAssortie) return;
    selection();
    setCandScene(avecSceneAssortie ? null : sceneAssortie);
  };

  const valider = () => {
    if (!persoOk || !sceneOk) {
      tap();
      ouvrirPaywall('dojo');
      return;
    }
    const patch: Partial<Espace> = {};
    if (persoChange && candPerso) {
      patch.personnage = candPerso;
      const k = parsePersonnage(candPerso);
      // Vague 45 : le Guerrier et le monde samourai remettent l'univers japon, Classique et « Sans personnage » l'univers classique
      if (k.kind === 'guerrier' || (k.kind === 'pack' && k.pack.kind === 'monde')) patch.univers = 'japon';
      else if (k.kind === 'classique' || k.kind === 'aucun') patch.univers = 'classique';
    }
    if (sceneChange && candScene) patch.scene = candScene;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    clear();
    void saveEspace(patch);
  };

  const onRestore = async () => {
    tap();
    setRestoring(true);
    try {
      const r = await restore();
      const packs = await getOwnedPacks();
      setOwned(packs);
      if (!r.success) appAlert(traduire('Restauration impossible'), r.error ?? traduire('Réessaie dans un moment.'));
      else if (r.restored || packs.length) appAlert(traduire('C’est fait'), traduire('Tes achats sont de retour sur ce téléphone.'));
      else appAlert(traduire('Rien à restaurer'), traduire('Aucun achat trouvé pour ce compte de la boutique.'));
    } finally {
      setRestoring(false);
    }
  };

  const ouvrirPack = (p: PackDef) => {
    tap();
    router.push({ pathname: '/dojo/pack', params: { id: p.id } } as any);
  };

  /* ---------- textes de l'apercu ---------- */
  const conditionPerso = (): string => {
    if (shown.kind !== 'pack') return '';
    if (shown.pack.kind === 'monde') return traduire("Au rang {0}, ou avec Premium", rangNom(shown.pack.unlockRank ?? 0, univers));
    return traduire('Avec Premium');
  };
  const tagLabel = !previewing ? traduire('Équipé') : !persoOk ? conditionPerso() : !sceneOk ? themeCondition(themeById(shownScene)) ?? traduire('Avec Premium') : traduire('Aperçu');
  const bouton = !persoOk || !sceneOk ? 'Débloquer' : persoChange ? traduire('Équiper') : traduire('Choisir la scène');

  /* ---------- une vignette de personnage ---------- */
  const vignettePerso = (base: string, fond: string, opts: { pack?: PackDef; note?: string | null; nomCourt?: string; vide?: ImageSourcePropType } = {}) => {
    const equipe = memePersonnage(equipKey, base);
    const regarde = !equipe && candPerso !== null && memePersonnage(candPerso, base);
    const verrou = !persoLibre(base);
    // la vignette montre la teinte essayee, sinon la teinte choisie dans la galerie
    const cle = memePersonnage(shownKey, base) ? shownKey : avecTeinteGlobale(base);
    const nom = opts.nomCourt ?? personnageName(base);
    const p = parsePersonnage(base);
    const note = opts.note ?? (verrou && p.kind === 'pack' && p.pack.kind === 'monde' ? traduire("Rang {0}", rangNom(p.pack.unlockRank ?? 0, univers)) : null);
    return (
      <Vignette
        key={base}
        width={col3}
        source={opts.vide ? undefined : personnageImage(cle, rankIndex, counts)}
        vide={opts.vide}
        nom={nom}
        fond={fond}
        etat={{ equipe, regarde, verrou, note }}
        onPress={() => essayer(base, opts.pack)}
        onLongPress={opts.pack ? () => ouvrirPack(opts.pack as PackDef) : undefined}
        label={`${nom}, ${equipe ? traduire('équipé') : verrou ? traduire("{0}, touche pour l’essayer", note ? note.toLowerCase() : 'avec Premium') : traduire('touche pour l’essayer')}`}
      />
    );
  };

  const vignetteScene = (t: (typeof THEMES)[number]) => {
    const equipe = espace.scene === t.id;
    const regarde = !equipe && candScene === t.id;
    const verrou = !isThemeUnlocked(t, rankIndex, isPremium, isAnnualPremium);
    const palier = palierDeScene(t.id);
    const note = verrou && t.annual
      ? traduire('Abonnement annuel')
      : verrou && t.unlockRank !== undefined
        ? traduire("Rang {0}", rangNom(t.unlockRank, univers))
        : verrou && palier !== null
          ? traduire("{0} jours d’affilée", palier)
          : !t.premium
            ? 'Offerte'
            : !isPremium && sceneGagnee(t.id)
              ? traduire('Gagnée')
              : !isPremium && essaiEnCours()?.id === t.id
                ? traduire('Essai 24 h')
                : null;
    return (
      <VignetteScene
        key={t.id}
        width={col2}
        source={THEME_IMAGES[t.id]}
        nom={t.name}
        etat={{ equipe, regarde, verrou, note }}
        onPress={() => essayerScene(t.id)}
        label={traduire("Scène {0}, {1}", t.name, equipe ? 'choisie' : verrou ? `${(themeCondition(t) ?? 'avec Premium').toLowerCase()}, touche pour l’essayer` : 'touche pour l’essayer')}
      />
    );
  };

  /* ---------- onglets et compteurs, d'apres le catalogue reel ---------- */
  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'monde', label: traduire('Samouraïs'), count: MONDE_PERSONNAGES.length + 1 },
    { id: 'classique', label: 'Classique', count: 2 },
    { id: 'vie', label: traduire('Vie réelle'), count: VIE_PERSONNAGES.length },
    { id: 'sport', label: traduire('Sports'), count: PACKS_SPORT.length },
    { id: 'legende', label: traduire('Légendes'), count: PACKS_LEGENDE.length },
    { id: 'themes', label: traduire('Scènes'), count: THEMES.length },
  ];

  const intro: Record<Tab, string> = {
    monde: isPremium ? traduire('Le Guerrier est gratuit, les figures du Japon féodal sont à toi avec Premium.') : traduire('Le Guerrier est gratuit. Ton rang débloque les autres une à une, Premium les ouvre toutes.'),
    classique: traduire('Des sportifs d’aujourd’hui, gratuits. La tenue suit ton rang.'),
    vie: isPremium ? traduire('Métiers, sports et héros d’hier, chacun avec sa scène. Tous à toi avec Premium.') : traduire('Métiers, sports et héros d’hier, chacun avec sa scène. Ils s’ouvrent avec Premium.'),
    sport: traduire('Ouverts avec Premium. Ils évoluent avec tes séances dans leur sport.'),
    legende: traduire("Ouvertes avec Premium. Elles évoluent avec ton rang : {0}, puis {1}.", rangNom(2, univers), rangNom(3, univers)),
    themes: traduire('La scène du Dojo et de ton accueil.'),
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <BackHeader title={traduire("Personnages et scènes")} subtitle={traduire("Un seul personnage équipé, dans le Dojo et à l’accueil")} />

        {/* Apercu colle en haut : ce qui est equipe, ou ce que tu essaies */}
        <View style={{ marginHorizontal: -22, paddingHorizontal: 22, paddingTop: 6, paddingBottom: 8, backgroundColor: c.background, gap: 8 }}>
          <ScenePlate scene={THEME_IMAGES[shownScene] ?? THEME_IMAGES.dojo} height={heroH} style={{ borderRadius: 24 }} animation={animationDeScene(shownScene)}>
            {sansFigure ? null : (
              <View style={{ position: 'absolute', right: 4, bottom: 0 }} pointerEvents="none">
                <BreathingFigure key={shownKey} source={shownImage} width={figW} height={figH} label={shownName} />
              </View>
            )}
            <View style={{ position: 'absolute', left: 10, top: 10, maxWidth: cw - figW, gap: 6, alignItems: 'flex-start' }}>
              <Pressable
                disabled={!shownPack}
                onPress={() => shownPack && ouvrirPack(shownPack)}
                accessibilityRole={shownPack ? 'button' : undefined}
                accessibilityLabel={shownPack ? traduire("{0}, voir le détail", shownName) : undefined}
                style={({ pressed }) => ({ maxWidth: '100%', transform: [{ scale: pressed ? 0.98 : 1 }] })}
              >
                <GlassTag style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16 }}>
                  <Ink size={11} weight="extraBold" color={previewing ? c.goldDeep : c.accent} numberOfLines={1}>{tagLabel}</Ink>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ink size={16} weight="black" numberOfLines={1} style={{ flexShrink: 1 }}>{shownName}</Ink>
                    {shownPack ? <ChevronIcon size={13} color={c.textMuted} /> : null}
                  </View>
                  <Ink size={12} color={c.textSecondary} numberOfLines={1}>{traduire(themeById(shownScene).name)}</Ink>
                </GlassTag>
              </Pressable>
              {montrerSceneAssortie && sceneAssortie ? (
                <Pressable
                  onPress={basculerSceneAssortie}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: avecSceneAssortie }}
                  accessibilityLabel={traduire("Avec sa scène, {0}", themeById(sceneAssortie).name)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 10, borderRadius: 999, backgroundColor: blancA(0.9), borderWidth: 1, borderColor: P.white, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <View style={{ width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: avecSceneAssortie ? c.accent : c.textMuted, backgroundColor: avecSceneAssortie ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {avecSceneAssortie ? <CheckIcon size={13} color={c.onAccent} /> : null}
                  </View>
                  <Ink size={12} weight="extraBold">{traduire("Avec sa scène")}</Ink>
                </Pressable>
              ) : null}
            </View>
            {previewing ? (
              <Animated.View entering={FadeIn.duration(180)} style={{ position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={valider}
                  accessibilityRole="button"
                  accessibilityLabel={bouton === 'Débloquer' ? traduire('Débloquer avec Premium') : bouton}
                  style={({ pressed }) => ({ minHeight: 42, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <Ink size={14} weight="extraBold" color={c.onAccent}>{bouton}</Ink>
                </Pressable>
                <Pressable
                  onPress={() => {
                    tap();
                    clear();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={traduire("Annuler, revenir à ce qui est équipé")}
                  style={({ pressed }) => ({ minHeight: 42, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: blancA(0.9), borderWidth: 1, borderColor: P.white, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <Ink size={14} weight="extraBold">{traduire("Annuler")}</Ink>
                </Pressable>
              </Animated.View>
            ) : null}
          </ScenePlate>

          {/* Homme ou femme, et la teinte de peau du pack regarde (des visages, sans etiquette) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 }}>
            <GenreBascule value={genre} onChange={changerGenre} />
            {teintes.length > 1 ? (
              <Teintes options={teintes} value={teinteVue} onChange={changerTeinte} fond={fondFamille('indigo')} />
            ) : !previewing ? (
              <Ink size={12} color={c.textMuted} numberOfLines={2} style={{ flex: 1 }}>{traduire("Touche un personnage ou une scène pour l’essayer ici.")}</Ink>
            ) : null}
          </View>
        </View>

        {/* Onglets en pastilles avec leur compteur : tout se lit, rien n'est coupe */}
        <Onglets items={TABS} value={activeTab} onChange={(id) => setTab(id)} largeur={Math.floor((cw - 16) / 3)} />
        <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 2, marginTop: -4 }}>{intro[activeTab]}</Ink>

        {activeTab === 'monde' ? (
          <View style={{ gap: 10 }}>
            <GroupeTitre titre={traduire("Gratuit")} />
            <Grille>{vignettePerso(`guerrier_${genre}`, fondFamille('or'), { note: traduire('Suit ton rang') })}</Grille>
            <GroupeTitre titre={traduire("Le monde samouraï")} count={MONDE_PERSONNAGES.length} />
            <Grille>{MONDE_PERSONNAGES.map((p) => vignettePerso(personnageKey(p, genre), fondFamille('indigo'), { pack: p }))}</Grille>
          </View>
        ) : activeTab === 'classique' ? (
          <View style={{ gap: 10 }}>
            <GroupeTitre titre={traduire("Personnages")} />
            <Grille>
              {vignettePerso(`classique_${genre}`, fondFamille('mousse'), { note: traduire('Gratuit') })}
              {vignettePerso(SANS_PERSONNAGE, fondFamille('mousse'), { nomCourt: traduire('Sans personnage'), note: traduire('Juste ta scène'), vide: THEME_IMAGES[espace.scene] ?? THEME_IMAGES.dojo })}
            </Grille>
            <GroupeTitre titre={traduire("Scènes classiques")} count={SCENES_CLASSIQUES.length} />
            <Grille gap={12}>{SCENES_CLASSIQUES.map(vignetteScene)}</Grille>
          </View>
        ) : activeTab === 'vie' ? (
          <View style={{ gap: 10 }}>
            {CATEGORIES_VIE.map((cat) => {
              const liste = VIE_PERSONNAGES.filter((p) => PACKS_VIE_PRETS.find((v) => v.id === p.id)?.categorie === cat.id);
              if (!liste.length) return null;
              return (
                <View key={cat.id} style={{ gap: 10 }}>
                  <GroupeTitre titre={cat.nom} count={liste.length} />
                  <Grille>{liste.map((p) => vignettePerso(personnageKey(p, genre), fondFamille(FOND_VIE[cat.id]), { pack: p }))}</Grille>
                </View>
              );
            })}
          </View>
        ) : activeTab === 'sport' ? (
          <Grille>{PACKS_SPORT.map((p) => vignettePerso(personnageKey(p, genre), fondFamille('mousse'), { pack: p, nomCourt: p.name }))}</Grille>
        ) : activeTab === 'legende' ? (
          <Grille>{PACKS_LEGENDE.map((p) => vignettePerso(personnageKey(p, genre), fondFamille('rouge'), { pack: p }))}</Grille>
        ) : (
          <View style={{ gap: 10 }}>
            {groupesScenes(univers === 'classique').map((g) => (
              <View key={g.id} style={{ gap: 10 }}>
                <GroupeTitre titre={g.titre} count={g.liste.length} />
                <Grille gap={12}>{g.liste.map(vignetteScene)}</Grille>
              </View>
            ))}
          </View>
        )}

        {/* Collection complete (16 octobre, SEANCES AVATAR) : les packs a venir en silhouettes. Aucun achat ni produit. */}
        <CollectionBientot gender={genre} />

        <Pressable
          onPress={onRestore}
          disabled={restoring}
          accessibilityRole="button"
          style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', opacity: pressed || restoring ? 0.6 : 1 })}
        >
          <Ink size={14} weight="bold" color={c.textSecondary}>{restoring ? 'Restauration en cours' : traduire('Restaurer mes achats')}</Ink>
        </Pressable>
      </ScrollView>
    </View>
  );
}
