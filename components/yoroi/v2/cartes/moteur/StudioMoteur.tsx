/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : le studio d'une carte, le seul studio de l'app (app/carte.tsx l'ouvre
 * pour toutes les cartes, sauf Avant apres qui garde son ecran de choix des photos).
 *
 * 2 novembre 2026 (studio unique), Houari : « l'ordre et la configuration sont bizarres ». Nouvelle mise en page, dans
 * l'ordre logique, en sections claires (cartes arrondies, pastilles, Archivo) :
 *  a. l'apercu en haut, net : la carte est dessinee en vectoriel a sa taille, rien n'est agrandi ;
 *  b. Composition, la plus importante : Ta photo, Dessin, Donnees, Autocollant (et, quand la carte en propose deux,
 *     ce qu'elle montre : ta seance ou tes muscles, ta semaine ou ta serie) ;
 *  c. Ta photo : Galerie et Prendre une photo ; avec une photo, Changer, Prendre une autre, Enlever, toujours la,
 *     quelle que soit la composition ;
 *  d. Style (Light, Color, Dark), avec ta photo ;
 *  e. Format (Story, Publication 4:5) ;
 *  f. Chiffres a afficher (et le masquage du poids, quand la carte en montre un).
 * Partager en story, Enregistrer et Partager restent en bas, sous la zone qui defile : ils ne recouvrent jamais rien.
 * iPad et Mac : l'apercu a gauche, les reglages a droite.
 * Ta photo se recadre au doigt : pincer pour zoomer, glisser pour deplacer, sur le fil d'animation (Reanimated) ; le
 * moteur recalcule une fois, au lacher. Double appui ou « Recadrer automatiquement » : retour au cadrage automatique.
 * A+ n'est jamais propose. Autocollant : l'apercu le pose sur un damier, ou sur ta photo (apercu seulement) ;
 * « Copier l'autocollant » et « Enregistrer » prennent l'autocollant seul, recadre, en PNG transparent.
 * Pas de partage direct « instagram-stories » : il demande un identifiant d'app Facebook.
 */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { traduire } from '@/lib/i18n/tr';
import { exploitAvecPoids } from '@/lib/v2/cartes/exploits';
import { compositionEffective, compositionsPour, contenuDe, famillesPour } from '@/lib/v2/cartes/moteur/familles';
import { GRILLE, hauteurPhoto } from '@/lib/v2/cartes/moteur/grille';
import type { Recadrage } from '@/lib/v2/cartes/moteur/protection';
import type { CarteData, CompositionId, FamilleMoteur, Masque, OptionsCarte, StyleCarte } from '@/lib/v2/cartes/types';
import { CarteApercu, CARTE_W, Damier, HAUTEURS, optionsDessinees } from '../CarteRendu';
import type { useCarte } from '../useCarte';

type Couleurs = ReturnType<typeof useYoroiTheme>['theme']['colors'];

/** Ce que montre la carte, quand elle propose deux familles (seance ou muscles, semaine ou serie) */
export const NOMS_FAMILLES: Record<FamilleMoteur, string> = {
  muscu: 'Ta séance', record: 'Ton record', course: 'Ta course', jjb: 'Ton combat', marche: 'Ta marche', transfo: 'Avant et après',
  muscles: 'Tes muscles travaillés', semaine: 'Ta semaine', serie: 'Ta série', annee: 'Ton année',
  pesee: 'Ta pesée', mois: 'Ton mois', objectif: 'Ton objectif', exploit: 'Ton exploit', sport: 'Ta séance',
};
export const NOMS_COMPOS: Record<CompositionId, { nom: string; sous: string; court: string; icone: IconName }> = {
  A: { nom: 'Ta photo', sous: 'Ta photo en plein cadre, ton visage protégé', court: 'Plein cadre, visage protégé', icone: 'image' },
  Aplus: { nom: 'Derrière toi', sous: '', court: '', icone: 'image' },
  B: { nom: 'Dessin', sous: 'Le dessin de ton sport, sans photo', court: 'Le dessin de ton sport', icone: 'pencil' },
  C: { nom: 'Données', sous: 'Tes kilos série par série', court: 'Tes kilos série par série', icone: 'table' },
  autocollant: { nom: 'Autocollant', sous: 'Tes chiffres sur fond transparent, à coller sur ta photo ou ta vidéo', court: 'Fond transparent, à coller', icone: 'spark' },
};
const NOMS_STYLES: { id: StyleCarte; nom: string }[] = [
  { id: 'light', nom: 'Light' },
  { id: 'color', nom: 'Color' },
  { id: 'dark', nom: 'Dark' },
];
const MASQUES: { id: Masque; nom: string }[] = [
  { id: 'aucun', nom: 'Mon poids' },
  { id: 'ecart', nom: 'L’écart seulement' },
  { id: 'pourcentage', nom: 'En pourcentage' },
];

/** Une pastille de choix : cochee quand elle est choisie */
function Choix({ c, on, label, onPress, icon, testID, desactive }: { c: Couleurs; on: boolean; label: string; onPress: () => void; icon?: IconName; testID?: string; desactive?: boolean }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: !!desactive }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.background, borderWidth: 1, borderColor: on ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', gap: 7, opacity: desactive ? 0.5 : 1 })}
    >
      {on ? <Icon name="check" size={15} color={c.onPrimary} stroke={2.6} /> : icon ? <Icon name={icon} size={16} color={c.ink} /> : null}
      <Ink size={14} weight="extraBold" color={on ? c.onPrimary : c.ink} numberOfLines={1}>{label}</Ink>
    </Pressable>
  );
}

/** Une tuile : l'icone au-dessus du libelle, sur une ou deux lignes ; cochee quand elle est choisie (composition, photo) */
function Tuile({ c, on, label, onPress, icon, testID, desactive, indice }: { c: Couleurs; on: boolean; label: string; onPress: () => void; icon: IconName; testID?: string; desactive?: boolean; indice?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={desactive}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: !!desactive }}
      accessibilityLabel={label}
      accessibilityHint={indice}
      style={({ pressed }) => ({ flex: 1, minHeight: 56, paddingHorizontal: 3, paddingVertical: 6, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.background, borderWidth: 1, borderColor: on ? c.primary : c.border, opacity: desactive ? 0.5 : 1 })}
    >
      <Icon name={on ? 'check' : icon} size={18} color={on ? c.onPrimary : c.ink} stroke={on ? 2.6 : 2.2} />
      <Ink size={11.5} weight="extraBold" color={on ? c.onPrimary : c.ink} numberOfLines={2} style={{ textAlign: 'center', lineHeight: 14 }}>{label}</Ink>
    </Pressable>
  );
}

/** Une section des reglages : carte arrondie, son titre, ses pastilles en lignes qui passent a la ligne */
function Section({ c, titre, sous, children, testID }: { c: Couleurs; titre: string; sous?: string; children: React.ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={{ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', paddingHorizontal: 2 }}>
        <Ink size={15} weight="black" accessibilityRole="header">{titre}</Ink>
        {sous ? <Ink size={12.5} color={c.textSecondary} style={{ flexShrink: 1 }}>{sous}</Ink> : null}
      </View>
      {children}
    </View>
  );
}

function Pastilles({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

/** Vrai si la carte montre un poids (pour proposer de le masquer) */
export function cartePeutMasquerPoids(d: CarteData): boolean {
  return d.moment === 'pesee' || (d.moment === 'semaine' && !!d.semaine?.poidsFin) || (!!d.exploit && exploitAvecPoids(d.exploit));
}

/**
 * Les sections du studio, dans l'ordre, pour une carte et son etat (pur, teste dans studioUnique.test.ts).
 * photo : la section Ta photo est la quand la composition l'utilise (Ta photo, Autocollant) ou des qu'une photo est mise.
 */
export function sectionsDuStudio(o: { compos: CompositionId[]; compo: CompositionId; famille: FamilleMoteur; aPhoto: boolean; nbChiffres: number; poids: boolean; gold: boolean }): string[] {
  const out = ['apercu', 'composition'];
  const photoPossible = o.famille !== 'transfo' && o.compos.includes('A');
  if (photoPossible && (o.compo === 'A' || o.compo === 'autocollant' || o.aPhoto)) out.push('photo');
  if (o.compo === 'A' && o.aPhoto && !o.gold && o.famille !== 'transfo') out.push('style');
  if (o.compo !== 'autocollant') out.push('format');
  if (o.nbChiffres > 1 || o.poids) out.push('chiffres');
  out.push('boutons');
  return out;
}

export type PropsStudio = {
  data: CarteData;
  k: ReturnType<typeof useCarte>;
  onRetour: () => void;
  /** Avant apres : le choix de tes deux photos et le flou (app/carte.tsx), a la place de la section Ta photo */
  sectionPhotos?: React.ReactNode;
  /** reglages de l'ecran qui s'ajoutent (Avant apres : le flou, sans personnage) */
  optionsEnPlus?: Partial<OptionsCarte>;
  /** garde avant un partage (Avant apres : la phrase de prudence la premiere fois) */
  avantPartage?: (partir: () => void) => void;
};

export function StudioMoteur({ data, k, onRetour, sectionPhotos, optionsEnPlus, avantPartage }: PropsStudio) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const u = useUnitePoids();
  const large = width >= 768;
  // les chiffres caches, le temps de cette edition seulement
  const [cache, setCache] = useState<string[]>([]);
  const o: OptionsCarte = { ...k.options, ...optionsEnPlus, cacheMoteur: cache };
  const garde = (f: () => void) => (avantPartage ? avantPartage(f) : f());
  const familles = famillesPour(data);
  const famille = o.familleMoteur && familles.includes(o.familleMoteur) ? o.familleMoteur : familles[0];
  const compos = compositionsPour(data, famille).filter((x) => x !== 'Aplus');
  const photo = optionsDessinees(o, k.visuels).photo;
  const compo = compositionEffective(data, famille, o.compo ?? (photo ? 'A' : null), !!photo);
  const recadrable = compo === 'A' && !!photo && famille !== 'transfo';
  const estAuto = compo === 'autocollant';
  const H = HAUTEURS[o.format];
  const contenu = useMemo(() => contenuDe(data, famille, u, o.masque), [data, famille, u, o.masque]);
  // l'autocollant montre ses lignes ; les autres compositions, le panneau des chiffres (le record montre son duel, fixe)
  const tousChiffres = !contenu ? [] : estAuto ? contenu.lignesAuto ?? [] : contenu.duel ? [] : contenu.stats;
  const poids = cartePeutMasquerPoids(data);
  const sections0 = sectionsDuStudio({ compos, compo, famille, aPhoto: !!k.photo, nbChiffres: tousChiffres.length, poids, gold: !!contenu?.pal.gold });
  // Avant apres : le choix des deux photos vient juste apres la composition
  const sections = sectionPhotos ? [...sections0.slice(0, 2), 'photos', ...sections0.slice(2)] : sections0;

  // la taille de l'apercu : la place libre, en gardant au moins 240 points pour les reglages
  const barre = 12 + 56 + 10 + 52 + 14 + insets.bottom;
  const libre = height - insets.top - 52 - barre;
  const dispoH = large ? height - insets.top - 52 - 40 : Math.max(230, Math.min(libre * 0.5, libre - 290));
  const dispoW = large ? width * 0.55 - 40 : width - 48;
  const largeur = Math.floor(Math.min(dispoW, ((dispoH - 16) * CARTE_W) / H));
  const ech = largeur / CARTE_W;
  // pixels de la carte (1080) par point de l'apercu
  const versCarte = GRILLE.story.W / largeur;

  // --- le geste du recadrage : sur le fil d'animation, recalcul au lacher ---
  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const avant = k.recadrage ?? { zoom: 1, dx: 0, dy: 0 };
  const poser = (z: number, dx: number, dy: number) => {
    const r: Recadrage = { zoom: Math.max(1, Math.min(4, avant.zoom * z)), dx: avant.dx + dx * versCarte, dy: avant.dy + dy * versCarte };
    zoom.value = 1;
    tx.value = 0;
    ty.value = 0;
    k.setRecadrage(r);
  };
  const auto = () => {
    zoom.value = 1;
    tx.value = 0;
    ty.value = 0;
    k.recadrerAuto();
  };
  const pincer = Gesture.Pinch()
    .enabled(recadrable)
    .onUpdate((e) => {
      zoom.value = e.scale;
    })
    .onEnd(() => {
      runOnJS(poser)(zoom.value, tx.value, ty.value);
    });
  const glisser = Gesture.Pan()
    .enabled(recadrable)
    .minDistance(4)
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd(() => {
      runOnJS(poser)(zoom.value, tx.value, ty.value);
    });
  const double = Gesture.Tap()
    .enabled(recadrable)
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(auto)();
    });
  const geste = Gesture.Exclusive(double, Gesture.Simultaneous(pincer, glisser));
  const stylePhoto = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value / ech }, { translateY: ty.value / ech }, { scale: zoom.value }] }));
  const RHpts = (hauteurPhoto(o.format === 'story' ? 'story' : 'post') * CARTE_W) / GRILLE.story.W;
  const enveloppePhoto = (n: React.ReactNode) => (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: CARTE_W, height: RHpts }, stylePhoto]}>{n}</Animated.View>
  );
  const visuels = { ...k.visuels, enveloppePhoto };

  // --- la photo : ajouter, changer, prendre, enlever ; une photo ajoutee depuis Dessin ou Donnees passe en Ta photo ---
  const ajouterPhoto = async (src: 'gallery' | 'camera') => {
    if (k.photoEnCours) return;
    const ok = await k.choisirPhoto(src);
    if (ok && compo !== 'A' && compo !== 'autocollant' && compos.includes('A')) k.setStyle({ compo: 'A', fond: 'photo', sansPersonne: false, epure: false });
  };
  const choisirCompo = (x: CompositionId) => {
    if (x === 'A' && famille !== 'transfo' && !k.photo) {
      k.setStyle({ compo: x });
      void ajouterPhoto('gallery');
      return;
    }
    k.setStyle(x === 'A' && k.photo ? { compo: x, fond: 'photo', sansPersonne: false, epure: false } : { compo: x });
  };
  const basculerChiffre = (l: string) => {
    setCache((x) => {
      if (x.includes(l)) return x.filter((y) => y !== l);
      // il reste toujours au moins un chiffre
      const restants = tousChiffres.filter((s) => !x.includes(s.l) && s.l !== l);
      return restants.length ? [...x, l] : x;
    });
  };

  const apercu = (
    <View style={{ alignItems: 'center' }}>
      <GestureDetector gesture={geste}>
        <View testID="studio-apercu" style={{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }} accessibilityHint={recadrable ? traduire('Pince pour zoomer, glisse pour recadrer ta photo, touche deux fois pour revenir au cadrage automatique') : undefined}>
          <CarteApercu
            ref={k.ref}
            largeur={largeur}
            data={data}
            options={o}
            visuels={visuels}
            dessous={estAuto ? (k.photo ? <Image source={{ uri: k.photo }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <Damier w={largeur} h={(largeur * H) / CARTE_W} />) : undefined}
          />
        </View>
      </GestureDetector>
    </View>
  );

  const sectionComposition = (
    <Section key="composition" testID="studio-composition" c={c} titre={traduire('Composition')} sous={traduire(NOMS_COMPOS[compo].court)}>
      {familles.length > 1 ? (
        <View accessibilityLabel={traduire('Ce que montre ta carte')} style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: c.background, borderWidth: 1, borderColor: c.border }}>
          {familles.map((f) => {
            const on = f === famille;
            return (
              <Pressable key={f} testID={`famille-${f}`} onPress={() => k.setStyle({ familleMoteur: f })} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={traduire(NOMS_FAMILLES[f])} style={({ pressed }) => ({ flex: 1, minHeight: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : 'transparent' })}>
                <Ink size={13.5} weight="extraBold" color={on ? c.onPrimary : c.ink} numberOfLines={1}>{traduire(NOMS_FAMILLES[f])}</Ink>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {compos.map((x) => <Tuile key={x} testID={`compo-${x}`} c={c} on={x === compo} icon={NOMS_COMPOS[x].icone} label={traduire(NOMS_COMPOS[x].nom)} indice={traduire(NOMS_COMPOS[x].sous)} onPress={() => choisirCompo(x)} />)}
      </View>
    </Section>
  );

  const sectionPhoto = (
    <Section key="photo" testID="studio-photo" c={c} titre={traduire('Ta photo')} sous={k.photoEnCours ? traduire('Photo en préparation') : recadrable ? traduire('Pince et glisse sur l’aperçu.') : estAuto ? traduire('Sous l’autocollant, dans l’aperçu seulement.') : !k.photo ? traduire('Elle n’est jamais gardée quand tu quittes la carte.') : undefined}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {k.photo ? (
          <>
            <Tuile testID="photo-changer" c={c} on={false} icon="image" label={traduire('Changer de photo')} onPress={() => void ajouterPhoto('gallery')} desactive={k.photoEnCours} />
            <Tuile testID="photo-prendre" c={c} on={false} icon="camera" label={traduire('Prendre une photo')} onPress={() => void ajouterPhoto('camera')} desactive={k.photoEnCours} />
            <Tuile testID="photo-enlever" c={c} on={false} icon="trash" label={traduire('Enlever ma photo')} onPress={k.enleverPhoto} desactive={k.photoEnCours} />
          </>
        ) : (
          <>
            <Tuile testID="photo-galerie" c={c} on={false} icon="image" label={traduire('Galerie')} onPress={() => void ajouterPhoto('gallery')} desactive={k.photoEnCours} />
            <Tuile testID="photo-prendre" c={c} on={false} icon="camera" label={traduire('Prendre une photo')} onPress={() => void ajouterPhoto('camera')} desactive={k.photoEnCours} />
          </>
        )}
      </View>
      {recadrable && k.recadrage ? <Choix testID="photo-auto" c={c} on={false} icon="restore" label={traduire('Recadrer automatiquement')} onPress={auto} /> : null}
    </Section>
  );

  const sectionStyle = (
    <Section key="style" testID="studio-style" c={c} titre={traduire('Style')}>
      <Pastilles>
        {NOMS_STYLES.map((s) => <Choix key={s.id} testID={`style-${s.id}`} c={c} on={(o.styleCarte ?? 'color') === s.id} label={s.nom} onPress={() => k.setStyle({ styleCarte: s.id })} />)}
      </Pastilles>
    </Section>
  );

  const sectionFormat = (
    <Section key="format" testID="studio-format" c={c} titre={traduire('Format')}>
      <Pastilles>
        <Choix testID="format-story" c={c} on={o.format === 'story'} label={traduire('Story')} onPress={() => k.setStyle({ format: 'story' })} />
        <Choix testID="format-post" c={c} on={o.format !== 'story'} label={traduire('Publication 4:5')} onPress={() => k.setStyle({ format: 'post' })} />
      </Pastilles>
    </Section>
  );

  const sectionChiffres = (
    <Section key="chiffres" testID="studio-chiffres" c={c} titre={traduire('Chiffres à afficher')} sous={tousChiffres.length > 1 ? traduire('Touche un chiffre pour le cacher ou le remettre.') : undefined}>
      {tousChiffres.length > 1 ? (
        <Pastilles>
          {tousChiffres.map((s) => <Choix key={s.l} testID={`chiffre-${s.l}`} c={c} on={!cache.includes(s.l)} label={s.l} onPress={() => basculerChiffre(s.l)} />)}
        </Pastilles>
      ) : null}
      {poids ? (
        <View style={{ gap: 8 }}>
          <Ink size={12.5} weight="extraBold" color={c.textSecondary}>{traduire('Ton poids sur la carte')}</Ink>
          <Pastilles>
            {MASQUES.map((m) => <Choix key={m.id} testID={`masque-${m.id}`} c={c} on={o.masque === m.id} label={traduire(m.nom)} onPress={() => k.setStyle({ masque: m.id })} />)}
          </Pastilles>
        </View>
      ) : null}
    </Section>
  );

  const photosAA = sectionPhotos ? (
    <Section key="photos" testID="studio-photos-aa" c={c} titre={traduire('Tes photos')}>{sectionPhotos}</Section>
  ) : null;
  const parSection: Record<string, React.ReactNode> = { composition: sectionComposition, photo: sectionPhoto, photos: photosAA, style: sectionStyle, format: sectionFormat, chiffres: sectionChiffres };
  const reglages = <View style={{ gap: 12 }}>{sections.filter((x) => parSection[x]).map((x) => parSection[x])}</View>;

  // l'autocollant : Copier (a coller dans ta story Instagram) et Enregistrer (pour TikTok, ou si Coller manque sur Android)
  const boutonsAuto = (
    <View style={{ gap: 10 }}>
      <BoutonPrincipal onPress={() => void k.copierAutocollantSeul()} haptique="none" disabled={!!k.busy} accessibilityLabel={traduire('Copier l’autocollant')} accessibilityHint={traduire('Dans ta story Instagram, appuie longtemps puis Coller')} label={k.busy === 'copie' ? traduire('Un instant') : k.copie ? traduire('Autocollant copié') : traduire('Copier l’autocollant')} tailleTexte={16} lignes={1} hauteur={56} icone={(col) => <Icon name={k.copie ? 'check' : 'doc'} size={19} color={col} />} />
      <Pressable onPress={() => void k.enregistrerAutocollantSeul()} disabled={!!k.busy} accessibilityRole="button" accessibilityLabel={traduire('Enregistrer l’autocollant dans la pellicule')} style={({ pressed }) => ({ height: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
        <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
        <Ink size={15} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? traduire('Un instant') : k.saved ? traduire('Enregistré') : traduire('Enregistrer')}</Ink>
      </Pressable>
    </View>
  );

  const boutons = estAuto ? boutonsAuto : (
    <View style={{ gap: 10 }}>
      <BoutonPrincipal onPress={() => garde(() => void k.partagerEnStory())} haptique="none" disabled={!!k.busy} accessibilityLabel={traduire('Partager en story')} accessibilityHint={traduire('Ouvre le partage de ton téléphone : choisis Instagram, puis Story')} label={k.busy === 'story' ? traduire('Un instant') : traduire('Partager en story')} tailleTexte={16} lignes={1} hauteur={56} icone={(col) => <Icon name="share" size={19} color={col} />} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => garde(() => void k.enregistrer())} disabled={!!k.busy} accessibilityRole="button" accessibilityLabel={traduire('Enregistrer dans la pellicule')} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
          <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
          <Ink size={15} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? traduire('Un instant') : k.saved ? traduire('Enregistrée') : traduire('Enregistrer')}</Ink>
        </Pressable>
        <Pressable onPress={() => garde(() => void k.partager())} disabled={!!k.busy} accessibilityRole="button" accessibilityLabel={traduire('Partager la carte')} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
          <Icon name="share" size={19} color={c.ink} />
          <Ink size={15} weight="extraBold" color={c.ink}>{k.busy === 'share' ? traduire('Un instant') : traduire('Partager')}</Ink>
        </Pressable>
      </View>
    </View>
  );

  const entete = (
    <View style={{ paddingTop: insets.top, height: insets.top + 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: c.background }}>
      <RoundButton icon="back" label={traduire('Retour')} onPress={onRetour} />
      <Ink size={17} weight="extraBold" accessibilityRole="header">{traduire('Ta carte')}</Ink>
      <View style={{ width: 44 }} />
    </View>
  );

  if (large) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        {entete}
        <View style={{ flex: 1, flexDirection: 'row', gap: 24, paddingHorizontal: 24, paddingBottom: insets.bottom + 16 }}>
          <View style={{ flex: 55, alignItems: 'center', justifyContent: 'center' }}>{apercu}</View>
          <View style={{ flex: 45, gap: 16 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingVertical: 12, paddingBottom: 32 }}>{reglages}</ScrollView>
            {boutons}
          </View>
        </View>
      </View>
    );
  }
  return (
    <View testID="studio-moteur" style={{ flex: 1, backgroundColor: c.background }}>
      {entete}
      <View style={{ paddingTop: 6, paddingBottom: 10 }}>{apercu}</View>
      {/* les reglages defilent entre l'apercu et les boutons : la marge du bas laisse voir la derniere section en entier */}
      <ScrollView testID="studio-reglages" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 32, gap: 12 }} showsVerticalScrollIndicator={false}>
        {reglages}
      </ScrollView>
      <View style={{ paddingTop: 12, paddingBottom: insets.bottom + 14, paddingHorizontal: 22, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background }}>{boutons}</View>
    </View>
  );
}

export default StudioMoteur;
