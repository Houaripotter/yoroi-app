/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : le studio d'une carte (app/carte.tsx l'ouvre quand l'interrupteur
 * du Studio createur est sur « nouveau »).
 * iPhone, a une main : l'apercu en haut, une rangee de choix a la fois en bas (carte, composition, style, format, photo),
 * Partager en story, Enregistrer et Partager toujours visibles. iPad et Mac : l'apercu a gauche, les reglages a droite.
 * Ta photo se recadre au doigt : pincer pour zoomer, glisser pour deplacer. Pendant le geste, tout se passe sur le fil
 * d'animation (Reanimated) sans recalcul de la carte ; le moteur recalcule une fois, au lacher. Double appui ou
 * « Recadrer automatiquement » : retour au cadrage automatique. A+ n'est jamais propose.
 * Autocollant (2 novembre 2026) : l'apercu le pose sur un damier, ou sur ta photo si tu en as choisi une (apercu seulement) ;
 * « Copier l'autocollant » et « Enregistrer » prennent l'autocollant seul, recadre, en PNG transparent.
 * Pas de partage direct « instagram-stories » : il demande un identifiant d'app Facebook.
 */
import React from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { traduire } from '@/lib/i18n/tr';
import { compositionEffective, compositionsPour, famillesPour } from '@/lib/v2/cartes/moteur/familles';
import { GRILLE, hauteurPhoto } from '@/lib/v2/cartes/moteur/grille';
import type { Recadrage } from '@/lib/v2/cartes/moteur/protection';
import type { CarteData, CompositionId, FamilleMoteur, StyleCarte } from '@/lib/v2/cartes/types';
import { CarteApercu, CARTE_W, Damier, HAUTEURS, optionsDessinees } from '../CarteRendu';
import type { useCarte } from '../useCarte';

type Couleurs = ReturnType<typeof useYoroiTheme>['theme']['colors'];

const NOMS_FAMILLES: Record<FamilleMoteur, string> = {
  muscu: 'Séance', record: 'Record', course: 'Course', jjb: 'Combat', marche: 'Marche', transfo: 'Avant et après',
  muscles: 'Muscles', semaine: 'Semaine', serie: 'Série', annee: 'Année',
};
const NOMS_COMPOS: Record<CompositionId, { nom: string; sous: string }> = {
  A: { nom: 'Ta photo', sous: 'Plein cadre, ton visage protégé' },
  Aplus: { nom: 'Derrière toi', sous: '' },
  B: { nom: 'Dessin', sous: 'Le dessin de ton sport' },
  C: { nom: 'Données', sous: 'Tes kilos série par série' },
  autocollant: { nom: 'Autocollant', sous: 'Tes chiffres sur fond transparent, à coller sur ta photo ou ta vidéo' },
};
const NOMS_STYLES: { id: StyleCarte; nom: string }[] = [
  { id: 'color', nom: 'Color' },
  { id: 'light', nom: 'Light' },
  { id: 'dark', nom: 'Dark' },
];

function Choix({ c, on, label, onPress, icon }: { c: Couleurs; on: boolean; label: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 15, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.border, flexDirection: 'row', alignItems: 'center', gap: 7 })}
    >
      {on ? <Icon name="check" size={15} color={c.onPrimary} stroke={2.6} /> : icon ? <Icon name={icon} size={16} color={c.ink} /> : null}
      <Ink size={14} weight="extraBold" color={on ? c.onPrimary : c.ink}>{label}</Ink>
    </Pressable>
  );
}

function Rangee({ c, titre, children }: { c: Couleurs; titre: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Ink size={13} weight="extraBold" color={c.textSecondary}>{titre}</Ink>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>{children}</ScrollView>
    </View>
  );
}

export function StudioMoteur({ data, k, onRetour }: { data: CarteData; k: ReturnType<typeof useCarte>; onRetour: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const large = width >= 768;
  const o = k.options;
  const familles = famillesPour(data);
  const famille = o.familleMoteur && familles.includes(o.familleMoteur) ? o.familleMoteur : familles[0];
  const compos = compositionsPour(data, famille).filter((x) => x !== 'Aplus');
  const photo = optionsDessinees(o, k.visuels).photo;
  const compo = compositionEffective(data, famille, o.compo ?? (photo ? 'A' : null), !!photo);
  const recadrable = compo === 'A' && !!photo && famille !== 'transfo';
  const estAuto = compo === 'autocollant';
  const H = HAUTEURS[o.format];

  // la taille de l'apercu : la place libre, sans jamais deborder
  const barre = 56 + 10 + 52 + 12 + 14 + insets.bottom;
  const dispoH = large ? height - insets.top - 52 - 40 : Math.max(260, (height - insets.top - 52 - barre) * 0.6);
  const dispoW = large ? width * 0.55 - 40 : width - 48;
  const largeur = Math.floor(Math.min(dispoW, (dispoH * CARTE_W) / H));
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

  const apercu = (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <GestureDetector gesture={geste}>
        <View style={{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }} accessibilityHint={recadrable ? traduire('Pince pour zoomer, glisse pour recadrer ta photo, touche deux fois pour revenir au cadrage automatique') : undefined}>
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
      {recadrable ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {k.recadrage ? <Choix c={c} on={false} icon="back" label={traduire('Recadrer automatiquement')} onPress={auto} /> : <Ink size={13} color={c.textSecondary}>{traduire('Pince et glisse pour recadrer ta photo.')}</Ink>}
        </View>
      ) : null}
    </View>
  );

  const reglages = (
    <View style={{ gap: 16 }}>
      {familles.length > 1 ? (
        <Rangee c={c} titre={traduire('Carte')}>
          {familles.map((f) => <Choix key={f} c={c} on={f === famille} label={traduire(NOMS_FAMILLES[f])} onPress={() => k.setStyle({ familleMoteur: f })} />)}
        </Rangee>
      ) : null}
      <Rangee c={c} titre={traduire('Composition')}>
        {compos.map((x) => (
          <Choix
            key={x}
            c={c}
            on={x === compo}
            label={traduire(NOMS_COMPOS[x].nom)}
            onPress={() => {
              if (x === 'A' && famille !== 'transfo' && !k.photo) void k.choisirPhoto('gallery');
              k.setStyle(x === 'A' && k.photo ? { compo: x, fond: 'photo', sansPersonne: false, epure: false } : { compo: x });
            }}
          />
        ))}
      </Rangee>
      <Ink size={13} color={c.textSecondary}>{traduire(NOMS_COMPOS[compo].sous)}</Ink>
      {compo === 'A' && famille === 'muscu' && photo ? (
        <Rangee c={c} titre={traduire('Style')}>
          {NOMS_STYLES.map((s) => <Choix key={s.id} c={c} on={(o.styleCarte ?? 'color') === s.id} label={s.nom} onPress={() => k.setStyle({ styleCarte: s.id })} />)}
        </Rangee>
      ) : null}
      {!estAuto ? (
        <Rangee c={c} titre={traduire('Format')}>
          <Choix c={c} on={o.format === 'story'} label={traduire('Story')} onPress={() => k.setStyle({ format: 'story' })} />
          <Choix c={c} on={o.format !== 'story'} label={traduire('Publication 4:5')} onPress={() => k.setStyle({ format: 'post' })} />
        </Rangee>
      ) : null}
      {famille !== 'transfo' && compos.includes('A') ? (
        <Rangee c={c} titre={traduire('Ta photo')}>
          <Choix c={c} on={false} icon="image" label={k.photoEnCours ? traduire('Photo en préparation') : k.photo ? traduire('Changer de photo') : traduire('Galerie')} onPress={() => { if (!k.photoEnCours) void k.choisirPhoto('gallery'); }} />
          <Choix c={c} on={false} icon="camera" label={traduire('Prendre une photo')} onPress={() => void k.choisirPhoto('camera')} />
          {k.photo ? <Choix c={c} on={false} icon="close" label={traduire('Enlever ma photo')} onPress={k.enleverPhoto} /> : null}
        </Rangee>
      ) : null}
    </View>
  );

  // l'autocollant : Copier (a coller dans ta story Instagram) et Enregistrer (pour TikTok, ou si Coller manque sur Android)
  const boutonsAuto = (
    <View style={{ gap: 10 }}>
      <BoutonPrincipal onPress={() => void k.copierAutocollantSeul()} haptique="none" disabled={!!k.busy} accessibilityLabel={traduire('Copier l’autocollant')} accessibilityHint={traduire('Dans ta story Instagram, appuie longtemps puis Coller')} label={k.busy === 'copie' ? traduire('Un instant') : k.copie ? traduire('Autocollant copié') : traduire('Copier l’autocollant')} tailleTexte={16} lignes={1} hauteur={56} icone={(col) => <Icon name={k.copie ? 'check' : 'doc'} size={19} color={col} />} />
      <Pressable onPress={() => void k.enregistrerAutocollantSeul()} disabled={!!k.busy} accessibilityRole="button" accessibilityLabel={traduire('Enregistrer l’autocollant dans la pellicule')} style={({ pressed }) => ({ height: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
        <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
        <Ink size={15} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? traduire('Un instant') : k.saved ? traduire('Enregistré') : traduire('Enregistrer')}</Ink>
      </Pressable>
      <Ink size={12} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire('Instagram : appuie longtemps dans ta story, puis Coller. TikTok : enregistre-le, puis ajoute-le depuis ta pellicule.')}</Ink>
    </View>
  );

  const boutons = estAuto ? boutonsAuto : (
    <View style={{ gap: 10 }}>
      <BoutonPrincipal onPress={() => void k.partagerEnStory()} haptique="none" disabled={!!k.busy} accessibilityLabel={traduire('Partager en story')} accessibilityHint={traduire('Ouvre le partage de ton téléphone : choisis Instagram, puis Story')} label={k.busy === 'story' ? traduire('Un instant') : traduire('Partager en story')} tailleTexte={16} lignes={1} hauteur={56} icone={(col) => <Icon name="share" size={19} color={col} />} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => void k.enregistrer()} disabled={!!k.busy} accessibilityRole="button" accessibilityLabel={traduire('Enregistrer dans la pellicule')} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
          <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
          <Ink size={15} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? traduire('Un instant') : k.saved ? traduire('Enregistrée') : traduire('Enregistrer')}</Ink>
        </Pressable>
        <Pressable onPress={() => void k.partager()} disabled={!!k.busy} accessibilityRole="button" accessibilityLabel={traduire('Partager la carte')} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}>
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
            <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 12 }}>{reglages}</ScrollView>
            {boutons}
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {entete}
      <View style={{ paddingTop: 8, paddingBottom: 8 }}>{apercu}</View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16, gap: 16 }}>{reglages}</ScrollView>
      <View style={{ paddingTop: 12, paddingBottom: insets.bottom + 14, paddingHorizontal: 22, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.background }}>{boutons}</View>
    </View>
  );
}

export default StudioMoteur;
