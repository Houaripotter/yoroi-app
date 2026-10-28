/**
 * Atelier d'une carte a partager : apercu en haut, puis modele, format, fond, style, personnage,
 * chiffres affiches (2 a 4) et masquage du poids. Enregistrer et Partager en bas.
 * 16 octobre 2026 : plus de choix du texte du bas (toujours YOROI : Musculation, MMA, Boxe), formats expliques
 * par usage (Story, Publication, Carre avec les apps), apercu plus grand, fonds en grille, sections avec icones.
 * 17 octobre 2026 : l'apercu reste en haut, toujours visible ; il se reduit quand tu fais defiler les options,
 * rangees en onglets (Format, Modele, Fond, Chiffres, Plus).
 * 17 octobre 2026 (cartes v4) : plus de battement ni de liseré ; un fondu enchaine de 180 ms entre l'ancien et le nouvel
 * apercu (rien si le mouvement est reduit). Interrupteur « Mon personnage sur la carte » (ou « Ma photo ») des le
 * premier onglet. Modeles en vignettes reelles avec un nom et une ligne d'explication.
 * 17 octobre 2026 (cartes v5) : onglet Fond en premier et ouvert a l'arrivee (Fond, Format, Modele, Chiffres, Plus),
 * avec « Ta photo » en tete de la grille puis Ma scene ; l'interrupteur personnage / photo passe en tete de l'onglet Fond.
 * Parametres : moment=seance&id=, moment=pesee&date= (ou id=), moment=semaine&debut=.
 * Exploit : moment=exploit&src=seance|pesee|mois|annee&ref=...&cle=... (record, palier, compteur, bilan...).
 * ?demo=1 : donnees de demonstration (copie web), avec &sport=combat|course pour une seance, &type= pour un exploit.
 * 17 octobre 2026 : carte Avant apres, moment=avant_apres&avant=<id>&apres=<id> (&flou=0 pour ne pas flouter) ;
 * onglets Format, Photos (avant, apres, flou) et Plus ; une phrase de prudence avant le premier partage.
 * En demo : &photo=<url>&photo2=<url>... pour les photos de test.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import Animated, { Easing, Extrapolation, interpolate, runOnJS, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton, type IconName } from '@/components/yoroi/v2/espace/ui';
import { Interrupteur } from '@/components/yoroi/v2/reglages/kit';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { CarteApercu, CARTE_W, explicationModele, HAUTEURS, modeleEffectif, modelesPour } from '@/components/yoroi/v2/cartes/CarteRendu';
import { FONDS } from '@/components/yoroi/v2/cartes/fonds';
import { sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { devNow } from '@/lib/v2/creator/devClock';
import { ficheScene } from '@/lib/v2/espace/presentation';
import { fondDeScene } from '@/lib/v2/cartes/scenesFond';
import { useCarte } from '@/components/yoroi/v2/cartes/useCarte';
import { chargerExploit, chargerPesee, chargerSeance, chargerSemaine } from '@/lib/v2/cartes/charger';
import { exploitAvecPoids } from '@/lib/v2/cartes/exploits';
import { basculerChiffre, chiffresDisponibles, MAX_CHIFFRES, MIN_CHIFFRES, NOMS_CHIFFRES } from '@/lib/v2/cartes/chiffres';
import { demoExploit, demoPhotosAvantApres, demoPour } from '@/lib/v2/cartes/demo';
import { carteAvantApres, lignesPoids } from '@/lib/v2/cartes/avantApres';
import { chargerPhotosCarte } from '@/lib/v2/cartes/chargerAvantApres';
import { FLOU } from '@/components/yoroi/v2/cartes/AvantApresVue';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { dateCourte } from '@/lib/v2/photos/outils';
import type { CarteData, FondId, FormatId, Masque, OptionsCarte, PhotoCarte } from '@/lib/v2/cartes/types';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

/** Formats expliques par usage : le ratio reste en petit, les apps aident a choisir */
const FORMATS: { id: FormatId; nom: string; apps: string; ratio: string; forme: { w: number; h: number } }[] = [
  { id: 'story', nom: 'Story', apps: 'Instagram, TikTok, Snapchat, WhatsApp statut', ratio: '9:16', forme: { w: 12, h: 21 } },
  { id: 'post', nom: 'Publication', apps: 'Instagram, Facebook', ratio: '4:5', forme: { w: 16, h: 20 } },
  { id: 'carre', nom: traduire('Carré'), apps: 'Facebook, X, messages', ratio: '1:1', forme: { w: 19, h: 19 } },
];

const MASQUES: { id: Masque; nom: string }[] = [
  { id: 'aucun', nom: 'Afficher' },
  { id: 'ecart', nom: traduire('Écart seulement') },
  { id: 'pourcentage', nom: 'En %' },
];

/** Colonnes de la grille des fonds : tout tient a l'ecran, rien n'est coupe a droite */
const COLS_FONDS = 5;
const ENTETE = 52;
/** La phrase de prudence de la carte Avant apres n'est montree qu'une fois */
const PRUDENCE_KEY = '@yoroi_cartes_avant_apres_prudence_vue';

type Couleurs = ReturnType<typeof useYoroiTheme>['theme']['colors'];

function Titre({ c, icon, children, sous }: { c: Couleurs; icon: IconName; children: string; sous?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={17} weight="black" tight color={c.ink} accessibilityRole="header">{children}</Ink>
        {sous ? <Ink size={13} color={c.textSecondary}>{sous}</Ink> : null}
      </View>
    </View>
  );
}

function Pastille({ c, on, label, onPress, sous, icon }: { c: Couleurs; on: boolean; label: string; onPress: () => void; sous?: string; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 15, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', gap: 7 })}
    >
      {on && !sous ? <Icon name="check" size={15} color={c.onPrimary} stroke={2.6} /> : icon ? <Icon name={icon} size={16} color={c.ink} /> : null}
      <Ink size={14} weight="extraBold" color={on ? c.onPrimary : c.ink}>{label}</Ink>
      {sous ? (
        <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: c.onAccent, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={12} weight="black" color={c.accent}>{sous}</Ink>
        </View>
      ) : null}
    </Pressable>
  );
}

function LigneInterrupteur({ c, icon, titre, sous, on, onPress }: { c: Couleurs; icon: IconName; titre: string; sous?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={titre} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderRadius: 18, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border, paddingHorizontal: 14, paddingVertical: 10 })}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold">{titre}</Ink>
        {sous ? <Ink size={13} color={c.textSecondary}>{sous}</Ink> : null}
      </View>
      <Interrupteur on={on} />
    </Pressable>
  );
}

/** Carte Avant apres : une rangee de tes photos, la choisie entouree ; floutees si le flou est mis */
function RangeePhotos({ c, titre, liste, choisie, flou, onChoisir }: { c: Couleurs; titre: string; liste: PhotoCarte[]; choisie: string; flou: boolean; onChoisir: (id: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Ink size={15} weight="extraBold">{titre}</Ink>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {liste.map((ph) => {
          const on = ph.id === choisie;
          return (
            <Pressable key={ph.id} onPress={() => onChoisir(ph.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={traduire("{0}, photo du {1}", titre, dateCourte(ph.date))} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 66, height: 88, borderRadius: 13, padding: on ? 2 : 0, borderWidth: on ? 2.5 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.surface }}>
                <View style={{ flex: 1, borderRadius: on ? 9 : 12, overflow: 'hidden', backgroundColor: c.fillSubtle }}>
                  {ph.uri ? <Image source={{ uri: ph.uri }} blurRadius={flou ? FLOU : 0} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                </View>
              </View>
              <Ink size={11} weight={on ? 'extraBold' : 'bold'} color={on ? c.accent : c.textSecondary} numberOfLines={1}>{dateCourte(ph.date)}</Ink>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type Onglet = 'format' | 'modele' | 'fond' | 'chiffres' | 'photos' | 'plus';
const HAUT_ONGLETS = 52;
const BARRE_BAS = 56 + 12 + 14;

/** Les onglets des options, sous l'apercu : un seul groupe d'options a la fois, la carte reste a l'ecran */
function Onglets({ c, liste, actif, onChange }: { c: Couleurs; liste: { id: Onglet; nom: string }[]; actif: Onglet; onChange: (o: Onglet) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      {liste.map((x) => {
        const on = x.id === actif;
        return (
          <Pressable
            key={x.id}
            onPress={() => onChange(x.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={traduire(x.nom)}
            style={({ pressed }) => ({ flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : 'transparent' })}
          >
            <Ink size={13.5} weight="extraBold" color={on ? c.onPrimary : c.ink} numberOfLines={1}>{traduire(x.nom)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CarteEditeur() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const p = useLocalSearchParams<{ moment?: string; id?: string; date?: string; debut?: string; demo?: string; sport?: string; type?: string; src?: string; ref?: string; cle?: string; onglet?: string; avant?: string; apres?: string; flou?: string; photo?: string; photo2?: string; photo3?: string; photo4?: string }>();
  const [data, setData] = useState<CarteData | null>(null);
  const [vide, setVide] = useState(false);
  const aa = p.moment === 'avant_apres';
  const [onglet, setOnglet] = useState<Onglet>((['format', 'modele', 'fond', 'chiffres', 'photos', 'plus'].includes(p.onglet ?? '') ? p.onglet : aa ? 'photos' : 'fond') as Onglet);
  // Avant apres : toutes tes photos pour choisir la paire, et le flou (mis par defaut, comme dans ton coffre)
  const [photosAA, setPhotosAA] = useState<PhotoCarte[]>([]);
  const [flou, setFlou] = useState(p.flou !== '0');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let d: CarteData | null = null;
        if (aa) {
          const liste = p.demo === '1' ? demoPhotosAvantApres([p.photo, p.photo2, p.photo3, p.photo4]) : await chargerPhotosCarte();
          if (alive) setPhotosAA(liste);
          d = carteAvantApres(liste, p.avant, p.apres);
        } else if (p.demo === '1') d = p.moment === 'exploit' ? demoExploit(p.type) : demoPour(p.moment, p.sport);
        else if (p.moment === 'exploit' && p.src && p.ref) d = await chargerExploit(p.src, p.ref, p.cle ?? '');
        else if (p.moment === 'pesee') d = await chargerPesee({ id: p.id ? Number(p.id) : undefined, date: p.date });
        else if (p.moment === 'semaine' && p.debut) d = await chargerSemaine(p.debut);
        else if (p.id) d = await chargerSeance(Number(p.id));
        if (!alive) return;
        setData(d);
        setVide(!d);
      } catch (e) {
        logger.warn('[cartes] editeur', e);
        if (alive) setVide(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [p.moment, p.id, p.date, p.debut, p.demo, p.sport, p.type, p.src, p.ref, p.cle, p.avant, p.apres, p.photo, p.photo2, p.photo3, p.photo4, aa]);

  const k = useCarte(data);
  // Avant apres : ni personnage, ni decor, ni « Que mes données » ; le flou de l'onglet Photos
  const o: OptionsCarte = aa ? { ...k.options, fond: 'uni', personnage: false, sansPersonne: true, epure: false, flou } : k.options;
  const choisirAA = (cote: 'avant' | 'apres', id: string) => {
    const x = data?.avantApres;
    if (!x) return;
    const d = carteAvantApres(photosAA, cote === 'avant' ? id : x.avant.id, cote === 'apres' ? id : x.apres.id);
    if (d) setData(d);
  };
  const partager = async () => {
    if (!aa) return void k.partager();
    let vue = false;
    try {
      vue = (await AsyncStorage.getItem(PRUDENCE_KEY)) === '1';
    } catch {
      vue = false;
    }
    if (vue) return void k.partager();
    appAlert(traduire('Avant de partager'), traduire('Tes photos restent sur ton téléphone tant que tu ne partages pas la carte.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Partager'),
        style: 'primary',
        onPress: () => {
          AsyncStorage.setItem(PRUDENCE_KEY, '1').catch(() => {});
          void k.partager();
        },
      },
    ]);
  };
  const H = HAUTEURS[o.format];

  // L'apercu en grand en haut ; en faisant defiler les options il se reduit jusqu'a petitH, jamais moins
  const haut = insets.top + ENTETE;
  const libre = height - haut - insets.bottom - BARRE_BAS - HAUT_ONGLETS;
  const zoneMax = Math.max(260, Math.min(600, Math.round(libre * 0.72)));
  const largeur = Math.min(width - 48, Math.round(((zoneMax - 24) * CARTE_W) / H));
  const carteH = Math.round((largeur * H) / CARTE_W);
  const grandH = carteH + 24;
  const petitH = Math.min(grandH, Math.max(190, Math.round(libre * 0.4)));
  const course = grandH - petitH;
  const echelleMin = (petitH - 24) / carteH;

  const reduit = useReducedMotion();
  const y = useSharedValue(0);
  const voile = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const zoneStyle = useAnimatedStyle(() => ({ height: course > 0 ? interpolate(y.value, [0, course], [grandH, petitH], Extrapolation.CLAMP) : grandH }));
  const carteStyle = useAnimatedStyle(() => {
    const s = course > 0 ? interpolate(y.value, [0, course], [1, echelleMin], Extrapolation.CLAMP) : 1;
    return { transform: [{ translateY: (-(1 - s) * carteH) / 2 }, { scale: s }] };
  });
  const voileStyle = useAnimatedStyle(() => ({ opacity: voile.value }));

  // 17 octobre (v4) : un fondu enchaine tres doux (180 ms) ; l'ancien apercu, pose au-dessus, s'efface sur le nouveau
  const signe = JSON.stringify([o.modele, o.format, o.fond, o.sombre, o.personnage, o.masque, o.epure, o.sansPersonne, o.flou, k.chiffres, k.photo]);
  const avant = useRef<{ signe: string; depuis: number; o: OptionsCarte; largeur: number } | null>(null);
  const [ancien, setAncien] = useState<{ o: OptionsCarte; largeur: number; n: number } | null>(null);
  useLayoutEffect(() => {
    if (!data) return;
    const a = avant.current;
    avant.current = { signe, depuis: a?.depuis ?? Date.now(), o, largeur };
    // les premieres valeurs (style memorise, chiffres par defaut) arrivent seules : pas de fondu
    if (!a || a.signe === signe || Date.now() - a.depuis < 900 || reduit) return;
    setAncien({ o: a.o, largeur: a.largeur, n: Date.now() });
    voile.value = 1;
    voile.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }, (fini) => {
      if (fini) runOnJS(setAncien)(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signe, data]);

  const tuile = Math.floor((width - 44 - (COLS_FONDS - 1) * 8) / COLS_FONDS);
  // vignettes des modeles : deux par ligne, la carte miniature dans le format choisi
  const caseModele = Math.floor((width - 44 - 10) / 2);
  const boiteH = 150;
  const miniL = Math.min(caseModele - 24, Math.round(((boiteH - 16) * CARTE_W) / H));
  const modeles = data ? modelesPour(data) : [];
  const modeleActif = data ? modeleEffectif(data, o.modele) : o.modele;
  const dispo = data ? chiffresDisponibles(data, o.masque) : [];
  const exploit = data?.moment === 'exploit';
  const poidsAA = data?.moment === 'avant_apres' ? lignesPoids(data, 'aucun') : null;
  const montrePoids = !!poidsAA?.ecart || data?.moment === 'pesee' || (data?.moment === 'semaine' && !!data.semaine?.poidsFin) || (!!data?.exploit && exploitAvecPoids(data.exploit));
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/mes-cartes' as never));

  const onglets: { id: Onglet; nom: string }[] = aa ? [
    { id: 'format', nom: 'Format' },
    { id: 'photos', nom: 'Photos' },
    { id: 'plus', nom: 'Plus' },
  ] : [
    ...(o.epure ? [] : [{ id: 'fond' as Onglet, nom: 'Fond' }]),
    { id: 'format', nom: 'Format' },
    ...(exploit ? [] : [{ id: 'modele' as Onglet, nom: traduire('Modèle') }]),
    ...(exploit ? [] : [{ id: 'chiffres' as Onglet, nom: 'Chiffres' }]),
    { id: 'plus', nom: 'Plus' },
  ];
  const actif: Onglet = onglets.some((x) => x.id === onglet) ? onglet : onglets[0].id;
  // L'interrupteur personnage / photo, en tete du premier onglet (Fond, ou Format si le fond n'est pas propose)
  const interrupteur = k.personne.possible && !aa && actif === onglets[0].id ? (
    <View style={{ marginBottom: 6 }}>
      <LigneInterrupteur c={c} icon={k.personne.icone} titre={k.personne.libelle} sous={k.personne.visible ? traduire('Touche pour l’enlever de la carte') : traduire('Seulement tes chiffres et la signature')} on={k.personne.visible} onPress={k.basculerPersonne} />
    </View>
  ) : null;
  // Fonds : ta photo d'abord (le plus demande), puis ta scene, puis les autres
  const fondsOrdre = [...FONDS.filter((f) => f.id === 'photo'), ...FONDS.filter((f) => f.id === 'scene'), ...FONDS.filter((f) => f.id !== 'photo' && f.id !== 'scene')];

  if (vide) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 12, paddingHorizontal: 22, gap: 14 }}>
        <RoundButton icon="back" label={traduire("Retour")} onPress={() => router.back()} />
        <Ink size={26} weight="black" tight>{traduire("Pas de carte ici")}</Ink>
        <Ink size={15} color={c.textSecondary}>{aa ? traduire('Il te faut au moins 2 photos de corps pour faire ta carte Avant après. Tu peux les ajouter dans tes photos de forme.') : traduire('Ce moment n’a pas encore de chiffres à montrer. Retrouve tes séances, tes pesées et tes semaines dans Mes cartes.')}</Ink>
        <Pressable onPress={() => router.replace('/mes-cartes' as never)} accessibilityRole="button" style={{ height: 54, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={16} weight="extraBold" color={c.onPrimary}>{traduire("Mes cartes")}</Ink>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: haut + grandH + HAUT_ONGLETS + 8, paddingBottom: insets.bottom + BARRE_BAS + 28, paddingHorizontal: 22, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {actif === 'format' ? (
          <>
            {interrupteur}
            <Ink size={14} color={c.textSecondary}>{traduire("Choisis selon l’endroit où tu la publies.")}</Ink>
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {FORMATS.map((f) => {
                const on = o.format === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => k.setStyle({ format: f.id })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={traduire("{0}, pour {1}", f.nom, f.apps)}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: on ? c.accentTint : pressed ? c.fillSubtle : c.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border })}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: on ? c.primary : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ width: f.forme.w, height: f.forme.h, borderRadius: 3, borderWidth: 2, borderColor: on ? c.onAccent : c.textSecondary }} />
                    </View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
                        <Ink size={15} weight="extraBold" color={on ? c.accent : c.ink}>{traduire(f.nom)}</Ink>
                        <Ink size={11} weight="bold" color={c.textMuted}>{f.ratio}</Ink>
                      </View>
                      <Ink size={13} color={c.textSecondary}>{f.apps}</Ink>
                    </View>
                    {on ? (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={13} color={c.onPrimary} stroke={3} />
                      </View>
                    ) : (
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.border }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {actif === 'modele' ? (
          <>
            <Ink size={14} color={c.textSecondary}>{traduire("Chaque vignette montre ta vraie carte.")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 12 }} accessibilityRole="radiogroup">
              {data
                ? modeles.map((m) => {
                    const on = modeleActif === m.id;
                    const exp = explicationModele(m, data);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => k.setStyle({ modele: m.id })}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${m.nom}. ${exp}`}
                        style={({ pressed }) => ({ width: caseModele, borderRadius: 18, padding: 6, paddingBottom: 10, gap: 7, backgroundColor: on ? c.accentTint : pressed ? c.fillSubtle : c.surface, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border })}
                      >
                        <View style={{ height: boiteH, borderRadius: 13, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }} pointerEvents="none">
                          <CarteApercu largeur={miniL} data={data} options={{ ...o, modele: m.id }} visuels={k.visuels} />
                        </View>
                        <View style={{ paddingHorizontal: 6, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ink size={15} weight="extraBold" color={on ? c.accent : c.ink} style={{ flex: 1 }} numberOfLines={1}>{traduire(m.nom)}</Ink>
                            {on ? (
                              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="check" size={12} color={c.onPrimary} stroke={3} />
                              </View>
                            ) : null}
                          </View>
                          <Ink size={12.5} color={c.textSecondary} style={{ lineHeight: 16 }}>{exp}</Ink>
                        </View>
                      </Pressable>
                    );
                  })
                : null}
            </View>
          </>
        ) : null}

        {actif === 'fond' ? (
          <>
            {interrupteur}
            <Ink size={14} color={c.textSecondary}>{traduire("Ta photo, ta scène d’accueil, un décor ou un fond uni.")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 12 }}>
              {fondsOrdre.map((f) => {
                const on = o.fond === f.id || (f.id === 'photo' && k.style.fond === 'photo' && !!k.photo);
                const img = f.id === 'scene' ? k.visuels.scene : f.id === 'photo' ? (k.photo ? { uri: k.photo } : null) : f.image;
                return (
                  <Pressable
                    key={f.id}
                    // 24 octobre 2026 : « Ta photo » deja choisie, un toucher rouvre la galerie pour en mettre une autre
                    onPress={() => (f.id === 'photo' && (!k.photo || on) ? void k.choisirPhoto('gallery') : k.setStyle(f.id === 'photo' ? { fond: 'photo', sansPersonne: false } : { fond: f.id as FondId }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={f.id === 'photo' ? traduire('Fond Ta photo') : `Fond ${f.nom}`}
                    accessibilityHint={f.id === 'photo' && on ? traduire('Touche pour choisir une autre photo') : undefined}
                    style={{ alignItems: 'center', gap: 5, width: tuile }}
                  >
                    <View style={{ width: tuile, height: tuile, borderRadius: 14, padding: on ? 3 : 0, borderWidth: on ? 2.5 : f.id === 'photo' ? 1.5 : 1, borderColor: on || f.id === 'photo' ? c.accent : c.border, backgroundColor: c.surface }}>
                      <View style={{ flex: 1, borderRadius: on ? 9 : 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: f.id === 'photo' && !k.photo ? c.accentTint : c.surface }}>
                        {img ? <Image source={img} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" /> : f.degrade ? <LinearGradient colors={f.degrade} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : f.id === 'uni' ? <LinearGradient colors={o.sombre ? ['#2A2E39', '#121318'] : ['#F6F5F0', '#E4E7F1']} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} /> : null}
                        {f.id === 'photo' && !k.photo ? <Icon name="camera" size={26} color={c.accent} /> : null}
                      </View>
                      {on ? (
                        <View style={{ position: 'absolute', right: -6, top: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, borderWidth: 2, borderColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="check" size={11} color={c.onPrimary} stroke={3.2} />
                        </View>
                      ) : null}
                      {/* 24 octobre 2026 : la petite croix rouge enleve ta photo, la carte revient sur ta scene */}
                      {f.id === 'photo' && k.photo ? (
                        <Pressable
                          onPress={k.enleverPhoto}
                          hitSlop={10}
                          accessibilityRole="button"
                          accessibilityLabel={traduire('Enlever ma photo')}
                          style={{ position: 'absolute', left: -6, top: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: c.danger, borderWidth: 2, borderColor: c.background, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Icon name="close" size={11} color="#FFFFFF" stroke={3.2} />
                        </Pressable>
                      ) : null}
                    </View>
                    <Ink size={11} weight={on || f.id === 'photo' ? 'extraBold' : 'bold'} color={on || f.id === 'photo' ? c.accent : c.textSecondary} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 13 }}>{f.id === 'photo' ? traduire('Ta photo') : f.nom}</Ink>
                  </Pressable>
                );
              })}
            </View>
            {/* 24 octobre 2026 : visibles des qu'une photo est chargee, meme si un autre fond est choisi */}
            {k.photo || k.photoEnCours || o.fond === 'photo' || k.style.fond === 'photo' ? (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Pastille c={c} on={false} icon="image" label={k.photoEnCours ? traduire('Photo en préparation') : k.photo ? traduire('Changer de photo') : traduire('Galerie')} onPress={() => { if (!k.photoEnCours) void k.choisirPhoto('gallery'); }} />
                <Pastille c={c} on={false} icon="camera" label={traduire("Prendre une photo")} onPress={() => void k.choisirPhoto('camera')} />
                {k.photo ? <Pastille c={c} on={false} icon="close" label={traduire('Enlever ma photo')} onPress={k.enleverPhoto} /> : null}
              </View>
            ) : null}
            {/* 24 octobre 2026 : toutes tes scenes, par univers, en image fixe sur la carte */}
            {k.tesScenes.length > 0 ? (
              <View style={{ gap: 10, marginTop: 6 }}>
                <View style={{ gap: 2 }}>
                  <Ink size={16} weight="black" tight accessibilityRole="header">{traduire('Tes scènes')}</Ink>
                  <Ink size={13} color={c.textSecondary}>{traduire('Toutes les scènes que tu as débloquées.')}</Ink>
                </View>
                {k.tesScenes.map((g) => (
                  <View key={g.key} style={{ gap: 6 }}>
                    <Ink size={12.5} weight="extraBold" color={c.textSecondary}>{g.titre}</Ink>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingTop: 6 }} style={{ marginHorizontal: -22 }}>
                      {g.scenes.map((sid) => {
                        const fid = fondDeScene(sid);
                        const on = o.fond === fid;
                        const nom = traduire(ficheScene(sid).nom);
                        return (
                          <Pressable key={sid} onPress={() => k.setStyle({ fond: fid })} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={traduire('Fond {0}', nom)} style={{ alignItems: 'center', gap: 5, width: tuile }}>
                            <View style={{ width: tuile, height: Math.round(tuile * 1.25), borderRadius: 14, padding: on ? 3 : 0, borderWidth: on ? 2.5 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.surface }}>
                              <View style={{ flex: 1, borderRadius: on ? 9 : 13, overflow: 'hidden' }}>
                                <ExpoImage source={sceneForNow(sid, devNow()) as never} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={0} cachePolicy="memory-disk" recyclingKey={sid} />
                              </View>
                              {on ? (
                                <View style={{ position: 'absolute', right: -6, top: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, borderWidth: 2, borderColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
                                  <Icon name="check" size={11} color={c.onPrimary} stroke={3.2} />
                                </View>
                              ) : null}
                            </View>
                            <Ink size={11} weight={on ? 'extraBold' : 'bold'} color={on ? c.accent : c.textSecondary} numberOfLines={1} style={{ textAlign: 'center', lineHeight: 13 }}>{nom}</Ink>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {actif === 'chiffres' ? (
          <>
            <Ink size={14} color={c.textSecondary}>{traduire("De {0} à {1}. Le premier touché s’affiche en grand.", MIN_CHIFFRES, MAX_CHIFFRES)}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {dispo.map((s) => {
                const i = k.chiffres.indexOf(s.key);
                return <Pastille key={s.key} c={c} on={i >= 0} label={NOMS_CHIFFRES[s.key]} sous={i >= 0 ? String(i + 1) : undefined} onPress={() => k.setChiffres((x) => basculerChiffre(x, s.key))} />;
              })}
            </View>
          </>
        ) : null}

        {actif === 'photos' && data?.avantApres ? (
          <>
            <LigneInterrupteur c={c} icon="eye" titre={traduire("Flouter les photos")} sous={flou ? traduire('Comme dans ton coffre, rien ne se reconnaît') : traduire('Tes photos sont nettes sur la carte')} on={flou} onPress={() => setFlou((v) => !v)} />
            <View style={{ gap: 14, marginTop: 6 }}>
              <RangeePhotos c={c} titre={traduire("Avant")} liste={photosAA} choisie={data.avantApres.avant.id} flou={flou} onChoisir={(id) => choisirAA('avant', id)} />
              <RangeePhotos c={c} titre={traduire("Après")} liste={photosAA} choisie={data.avantApres.apres.id} flou={flou} onChoisir={(id) => choisirAA('apres', id)} />
            </View>
            <Ink size={13} color={c.textSecondary}>{poidsAA?.ecart ? traduire('Le poids vient de ta pesée la plus proche de chaque photo, à 3 jours près.') : traduire('Pas de pesée à 3 jours près de ces deux photos : aucun poids sur la carte.')}</Ink>
          </>
        ) : null}

        {actif === 'plus' ? (
          <>
            {aa ? null : <LigneInterrupteur c={c} icon="eye" titre={traduire("Que mes données")} sous={traduire("Fond uni, sans personnage ni décor")} on={!!o.epure} onPress={() => k.setStyle({ epure: !o.epure })} />}
            <Titre c={c} icon={o.sombre ? 'moon' : 'sun'}>{traduire("Style")}</Titre>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pastille c={c} on={o.sombre} icon="moon" label={traduire("Sombre")} onPress={() => k.setStyle({ sombre: true })} />
              <Pastille c={c} on={!o.sombre} icon="sun" label={traduire("Clair")} onPress={() => k.setStyle({ sombre: false })} />
            </View>
            {montrePoids ? (
              <>
                <Titre c={c} icon="scale" sous={traduire("Pour ta vie privée : seulement l’écart ou le pourcentage")}>{traduire("Ton poids")}</Titre>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {MASQUES.map((m) => <Pastille key={m.id} c={c} on={o.masque === m.id} label={traduire(m.nom)} onPress={() => k.setStyle({ masque: m.id })} />)}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </Animated.ScrollView>

      {/* l'apercu et les onglets, poses au-dessus des options : toujours a l'ecran */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: haut, backgroundColor: c.background, paddingHorizontal: 16 }}>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'flex-start', borderRadius: 26, backgroundColor: c.accentTint, paddingTop: 12, overflow: 'hidden' }, zoneStyle]}>
          {data ? (
            <Animated.View style={[{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, carteStyle]}>
              <CarteApercu ref={k.ref} largeur={largeur} data={data} options={o} visuels={k.visuels} />
              {ancien ? (
                <Animated.View key={ancien.n} pointerEvents="none" style={[{ position: 'absolute', top: 0, left: Math.round((largeur - ancien.largeur) / 2) }, voileStyle]}>
                  <CarteApercu largeur={ancien.largeur} data={data} options={ancien.o} visuels={k.visuels} />
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ChargementPetit />
            </View>
          )}
        </Animated.View>
        <View style={{ paddingTop: 8, paddingBottom: 4, paddingHorizontal: 6 }}>
          <Onglets c={c} liste={onglets} actif={actif} onChange={setOnglet} />
        </View>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, paddingTop: insets.top, height: insets.top + ENTETE, backgroundColor: c.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <RoundButton icon="back" label={traduire("Retour")} onPress={retour} />
        <Ink size={17} weight="extraBold" accessibilityRole="header">{traduire("Ta carte")}</Ink>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingBottom: insets.bottom + 14, paddingHorizontal: 22, backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => void k.enregistrer()} disabled={!data || !!k.busy} accessibilityRole="button" accessibilityLabel={traduire("Enregistrer dans la pellicule")} style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
          <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
          <Ink size={16} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? traduire('Un instant') : k.saved ? traduire('Enregistrée') : traduire('Enregistrer')}</Ink>
        </Pressable>
        <Pressable onPress={() => void partager()} disabled={!data || !!k.busy} accessibilityRole="button" accessibilityLabel={traduire("Partager la carte")} style={({ pressed }) => ({ flex: 1.2, height: 56, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}>
          <Icon name="share" size={19} color={c.onPrimary} />
          <Ink size={16} weight="extraBold" color={c.onPrimary}>{k.busy === 'share' ? traduire('Un instant') : traduire('Partager')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}
