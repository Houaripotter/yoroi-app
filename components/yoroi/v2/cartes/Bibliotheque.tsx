/**
 * Bibliotheque des cartes (31 octobre 2026, Houari : « il leur faut une bibliotheque de partage de cartes :
 * les dernieres seances, les derniers records, les objectifs, etc. »).
 * Le sommaire en pastilles, puis une rubrique par sujet : un sticker, un titre, et une rangee de vignettes
 * qui sont les vraies cartes dessinees avec tes chiffres. Un toucher ouvre l'atelier (carrousel des modeles)
 * sur cette carte. Rubrique vide : une phrase courte et un sticker, jamais une carte inventee.
 * Composant de presentation : les cartes arrivent toutes lues (app/mes-cartes.tsx), il se dessine aussi en web.
 * 3 novembre 2026 (photos d'exemple) : sans ta photo, les cartes qui ont la composition Ta photo se montrent avec une
 * photo d'EXEMPLE choisie par famille et par sport (lib/v2/cartes/exemples.ts), avec la pastille « Exemple ».
 * Tes chiffres restent les tiens. Une vignette n'est jamais capturee : l'exemple ne part dans aucun export.
 * 3 novembre 2026 (refonte, Houari : « c'est moche, ca ne ressemble pas au reste de l'app ») : le langage des onglets
 * Seances et Progres. Chaque rubrique est une carte blanche douce avec son carre pastel et son sticker, ses petites
 * capitales colorees ; l'avant apres passe en tete, en grand, sur un fond menthe. Ordre : avant apres et pesees,
 * records, compteurs, course, dernieres seances, objectifs, annee, puis semaine et mois (ce qu'on partage le plus
 * d'abord). Une rubrique vide montre des cartes d'EXEMPLE marquees « Exemple » (lib/v2/cartes/exemplesRubriques.ts),
 * jamais tes chiffres inventes, et leur toucher n'ouvre jamais le studio sur l'exemple.
 */
import React, { useRef } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { CarreSticker, Petites, useCarteA, useTeinte, type TeinteA } from '@/components/yoroi/v2/seances/kitA';
import { CarteApercu, type VisuelsCarte } from './CarteRendu';
import { chiffresAffiches, chiffresParDefaut, duree, familleDe, nombre } from '@/lib/v2/cartes/chiffres';
import { getSportCategory } from '@/lib/sports';
import { directionEffective } from '@/lib/v2/cartes/directions';
import type { CarteData, CouleurId, DirectionId, Masque, OptionsCarte } from '@/lib/v2/cartes/types';
import type { Bibliotheque as BibliothequeDonnees } from '@/lib/v2/cartes/bibliotheque';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { estCarteExemple, exemplePourCarte } from '@/lib/v2/cartes/exemples';
import type { ExempleId } from '@/lib/v2/cartes/exemples';
import { visuelsExemple } from './exemples';
import { cartesOuExemples, estCarteCourse, type RubriqueExemple } from '@/lib/v2/cartes/exemplesRubriques';

export type RubriqueBiblio = {
  id: string;
  titre: string;
  sous: string;
  sticker: NomSticker;
  cartes: CarteData[];
  /** la phrase de la rubrique vide */
  vide: string;
  /** le modele des vignettes de la rubrique (retombe sur un modele propose si celui-ci ne l'est pas) */
  modele?: DirectionId;
  couleur?: CouleurId;
  /** 3 novembre 2026 : la teinte pastel de la rubrique (carre du sticker, petites capitales, sommaire) */
  teinte?: TeinteA;
  /** la rubrique en tete, en grand (l'avant apres) */
  grand?: boolean;
  /** la premiere vignette en grand (la rubrique en tete, la course et son parcours) */
  premiereGrande?: boolean;
  /** vrai quand la rubrique ne montre que des cartes d'exemple (aucune des tiennes) */
  exemples?: boolean;
};

/** La vignette : la carte en Story, assez grande pour lire le chiffre */
export const VIGNETTE_L = 124;
/** 3 novembre 2026 : la premiere vignette de la rubrique en tete (l'avant apres), bien plus grande */
export const VIGNETTE_GRANDE_L = 178;

/** La ligne sous la vignette : les vrais chiffres, rien d'autre */
export function resumeCarte(d: CarteData, masque: Masque = 'aucun'): string {
  if (d.moment === 'exploit' && d.exploit) {
    const e = d.exploit;
    if (e.liste?.length) return e.liste.join(', ');
    const u = e.hero.unit ? `${e.hero.unit === 'e' || e.hero.unit === 're' ? '' : ' '}${e.hero.unit}` : '';
    return masque !== 'aucun' && e.masque ? e.accroche : `${e.hero.value}${u}, ${e.accroche}`;
  }
  if ((d.moment === 'mois' || d.moment === 'annee') && d.periode) {
    const p = d.periode;
    const t = duree(p.minutes);
    return [traduirePluriel(p.seances, p.seances > 1, '{0} séance', '{0} séances', nombre(p.seances, 0)), p.minutes > 0 ? `${t.value}${t.unit ? ` ${t.unit}` : ''}` : null, p.sports.length > 1 ? traduire('{0} sports', p.sports.length) : p.sports[0]?.nom ?? null].filter(Boolean).join(', ');
  }
  if (d.moment === 'avant_apres') return d.sousTitre;
  return chiffresAffiches(d, chiffresParDefaut(d, masque), masque)
    .slice(0, 3)
    .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ['rounds', 'series', 'seances', 'techniques', 'soumissions'].includes(s.key) ? ` ${s.label.split(',')[0]}` : ''}`)
    .join(', ');
}

/** Le nom sous la vignette : le sport, le mois, l'exploit */
export function nomVignette(d: CarteData): string {
  if (d.moment === 'mois' || d.moment === 'annee' || d.moment === 'semaine') return d.sousTitre;
  return d.titre;
}

/**
 * 3 novembre 2026 (photos d'exemple) : la pastille « Exemple », en haut a droite de la vignette, discrete mais lisible
 */
export function PastilleExemple() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View testID="pastille-exemple" pointerEvents="none" style={{ position: 'absolute', top: 7, right: 7, paddingHorizontal: 7, height: 19, borderRadius: 10, justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, opacity: 0.96 }}>
      <Ink size={10.5} weight="black" color={c.ink} style={{ lineHeight: 13 }}>{traduire('Exemple')}</Ink>
    </View>
  );
}

/** 1er novembre 2026 : exportee pour l'accueil en grand ecran (Tes cartes a partager), largeur au choix */
export function Vignette({ d, options, visuels, onPress, largeur = VIGNETTE_L, exemple, legende }: { d: CarteData; options: OptionsCarte; visuels: VisuelsCarte; onPress: () => void; largeur?: number; exemple?: boolean; legende?: { titre: string; sous: string } }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // une carte d'exemple : ses chiffres restent dans la vignette marquee « Exemple », jamais dans la legende
  const sous = legende ? legende.sous : d.moment === 'seance' ? d.sousTitre : resumeCarte(d, options.masque);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={legende ? traduire('Carte d’exemple {0}, {1}', legende.titre, sous) : exemple ? traduire('Carte {0}, {1}, photo d’exemple', nomVignette(d), sous) : traduire('Carte {0}, {1}', nomVignette(d), sous)} style={({ pressed }) => ({ width: largeur, gap: 7, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View pointerEvents="none" style={{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
        {/* 2 novembre 2026 (studio unique) : la vignette montre le dessin de la carte (jamais un autocollant transparent) ;
            3 novembre 2026 : ou Ta photo avec une photo d'exemple, et sa pastille */}
        <CarteApercu largeur={largeur} data={d} options={exemple ? options : { ...options, compo: 'B' }} visuels={visuels} />
        {exemple ? <PastilleExemple /> : null}
      </View>
      <View style={{ gap: 1, paddingHorizontal: 2 }}>
        <Ink size={13.5} weight="extraBold" numberOfLines={1}>{legende ? legende.titre : traduire(nomVignette(d))}</Ink>
        <Ink size={12} color={c.textSecondary} numberOfLines={2} style={{ lineHeight: 15 }}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

/** 3 novembre 2026 : une pastille du sommaire, teintee comme sa rubrique */
function PastilleSommaire({ r, onPress }: { r: RubriqueBiblio; onPress: () => void }) {
  const t = useTeinte(r.teinte ?? 'bleu');
  const illus = useIllustrations();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire('Aller à {0}', r.titre)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 22, backgroundColor: t.fond, opacity: pressed ? 0.8 : 1 })}>
      <Image source={illus.img(r.sticker)} style={{ width: 30, height: 30 }} resizeMode="contain" />
      <Ink size={14} weight="extraBold" color={t.texte}>{r.titre}</Ink>
      {r.exemples ? null : <Ink size={13} weight="black" color={t.texte} style={{ opacity: 0.7 }}>{String(r.cartes.length)}</Ink>}
    </Pressable>
  );
}

/** 3 novembre 2026 : une rubrique, carte blanche douce (ou menthe en tete), carre pastel et son sticker */
function Rubrique({ r, base, visuelsPour, onOuvrir, onLayout }: { r: RubriqueBiblio; base: OptionsCarte; visuelsPour: (d: CarteData) => VisuelsCarte; onOuvrir: (d: CarteData, ex?: ExempleId | null) => void; onLayout: (y: number) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const teinte = r.teinte ?? 'bleu';
  const t = useTeinte(teinte);
  const fond = r.grand ? { backgroundColor: t.fond, shadowOpacity: 0, borderWidth: 0 } : null;
  const nb = r.cartes.length;
  const capitales = r.exemples ? traduire('En attendant les tiennes') : r.grand ? traduire('Ta transformation') : traduirePluriel(nb, nb > 1, '{0} carte à partager', '{0} cartes à partager', nb);
  return (
    <View testID={`rubrique-${r.id}`} style={[carte, { padding: 0, paddingTop: 16, paddingBottom: 16, gap: 14, overflow: 'hidden' }, fond]} onLayout={(e) => onLayout(e.nativeEvent.layout.y)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
        <CarreSticker nom={r.sticker} teinte={teinte} taille={r.grand ? 58 : 50} />
        <View style={{ flex: 1, gap: 2 }}>
          <Petites texte={capitales} teinte={teinte} style={{ paddingHorizontal: 0 }} />
          <Ink size={r.grand ? 23 : 20} weight="black" tight accessibilityRole="header">{r.titre}</Ink>
          <Ink size={13} color={c.textSecondary} numberOfLines={2}>{r.sous}</Ink>
        </View>
      </View>
      {nb ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6, gap: 12, alignItems: 'flex-start' }}>
          {exemplesDeRubrique(r.cartes, visuelsPour).map(({ d, ex }, i) => {
            const o: OptionsCarte = {
              ...base,
              modele: r.modele ? directionEffective(d, r.modele) : directionEffective(d, base.modele),
              couleur: r.couleur ?? base.couleur,
              format: 'story',
              fond: 'couleur',
              sortie: 'story',
              chiffres: d.moment === 'exploit' ? [] : chiffresParDefaut(d, base.masque, 4),
            };
            const dv = avecFamille(d);
            const v = { ...visuelsPour(d), ambiance: true };
            const largeur = (r.grand || r.premiereGrande) && i === 0 ? VIGNETTE_GRANDE_L : VIGNETTE_L;
            // une carte d'exemple : sa legende ne montre jamais de chiffre, seulement ce qu'il faut faire
            const legende = estCarteExemple(d) ? { titre: d.moment === 'avant_apres' ? traduire('Ton avant après') : traduire(d.titre), sous: r.vide } : undefined;
            // 3 novembre 2026 : sans ta photo, Ta photo avec la photo d'exemple ; l'avant apres d'exemple ; les autres exemples en dessin
            if (ex) return <Vignette key={d.cle} d={dv} largeur={largeur} options={{ ...o, compo: 'A', fond: 'photo', sansPersonne: false, epure: false }} visuels={visuelsExemple(v, ex)} onPress={() => onOuvrir(d, ex)} exemple legende={legende} />;
            if (d.moment === 'avant_apres' && estCarteExemple(d)) return <Vignette key={d.cle} d={dv} largeur={largeur} options={{ ...o, compo: 'A', masque: 'aucun' }} visuels={{ ...v, exemple: true }} onPress={() => onOuvrir(d)} exemple legende={legende} />;
            if (estCarteExemple(d)) return <Vignette key={d.cle} d={dv} largeur={largeur} options={{ ...o, compo: 'B' }} visuels={v} onPress={() => onOuvrir(d)} exemple legende={legende} />;
            return <Vignette key={d.cle} d={dv} largeur={largeur} options={o} visuels={v} onPress={() => onOuvrir(d)} />;
          })}
        </ScrollView>
      ) : (
        <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: t.fond }}>
          <CarreSticker nom={r.sticker} teinte={teinte} taille={40} />
          <Ink size={14} weight="bold" color={t.texte} style={{ flex: 1 }}>{r.vide}</Ink>
        </View>
      )}
    </View>
  );
}

export function Bibliotheque({ rubriques, base, visuelsPour, onOuvrir, defiler, avant, apres }: {
  rubriques: RubriqueBiblio[];
  /** le style memorise (couleur, masquage) ; la vignette prend le modele de sa rubrique */
  base: OptionsCarte;
  visuelsPour: (d: CarteData) => VisuelsCarte;
  /** ex : la photo d'exemple de la vignette touchee, pour que le studio montre la meme */
  onOuvrir: (d: CarteData, ex?: ExempleId | null) => void;
  /** fait defiler l'ecran jusqu'a une rubrique (sommaire) ; absent, pas de sommaire */
  defiler?: (y: number) => void;
  avant?: React.ReactNode;
  apres?: React.ReactNode;
}) {
  const positions = useRef<Record<string, number>>({});
  const debut = useRef(0);
  const pleines = rubriques.filter((r) => r.cartes.length);
  return (
    <View style={{ gap: 16 }} onLayout={(e) => (debut.current = e.nativeEvent.layout.y)}>
      {defiler && pleines.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {pleines.map((r) => <PastilleSommaire key={r.id} r={r} onPress={() => defiler(debut.current + (positions.current[r.id] ?? 0) - 8)} />)}
        </ScrollView>
      ) : null}
      {avant}
      {rubriques.map((r) => (
        <Rubrique key={r.id} r={r} base={base} visuelsPour={visuelsPour} onOuvrir={onOuvrir} onLayout={(y) => (positions.current[r.id] = y)} />
      ))}
      {apres}
    </View>
  );
}

/** Un exploit sans famille (record de course...) prend celle de son sport : la bonne photo */
function avecFamille(d: CarteData): CarteData {
  return !d.famille && d.sport ? { ...d, famille: familleDe(getSportCategory(d.sport), d.sport) } : d;
}

/**
 * 3 novembre 2026 (photos d'exemple) : la photo d'exemple de chaque carte d'une rubrique, ou null (ta photo est la,
 * ou aucun exemple ne lui va). Musculation : homme et femme en alternance dans la rubrique.
 */
export function exemplesDeRubrique(cartes: CarteData[], visuelsPour: (d: CarteData) => VisuelsCarte): { d: CarteData; ex: ExempleId | null }[] {
  let rang = 0;
  return cartes.map((d) => {
    // une carte d'exemple garde son dessin quand il est le sujet : l'avant apres (ses deux photos), le parcours de course
    const dessinVoulu = estCarteExemple(d) && (d.moment === 'avant_apres' || d.famille === 'course');
    const ex = dessinVoulu ? null : exemplePourCarte(avecFamille(d), rang, !!visuelsPour(d).photo);
    if (ex === 'muscu_homme' || ex === 'muscu_femme') rang++;
    return { d, ex };
  });
}

/**
 * Les rubriques de la bibliotheque, dans l'ordre de l'ecran.
 * 3 novembre 2026 (refonte) : ce qu'on a le plus envie de partager d'abord. L'avant apres et tes pesees en tete et en
 * grand, puis records, compteurs, course (ton parcours), dernieres seances, objectifs, ton annee ; ta semaine et ton
 * mois en bas. Une rubrique sans aucune de tes cartes montre des cartes d'exemple (exemples: true).
 */
export function rubriquesDe(b: BibliothequeDonnees, avantApres: CarteData | null): RubriqueBiblio[] {
  const courses = b.seances.filter(estCarteCourse);
  const autres = b.seances.filter((d) => !estCarteCourse(d));
  const avec = (id: RubriqueExemple, tiennes: CarteData[]) => cartesOuExemples(id, tiennes);
  const r = (x: Omit<RubriqueBiblio, 'cartes' | 'exemples'>, id: RubriqueExemple, tiennes: CarteData[]): RubriqueBiblio => {
    const { cartes, exemples } = avec(id, tiennes);
    return { ...x, cartes, exemples };
  };
  const pesees = avantApres ? [avantApres, ...b.pesees] : b.pesees;
  return [
    { id: 'pesees', titre: traduire('Ton avant après'), sous: traduire('Tes progrès sur la balance et en photo'), sticker: 'balance', cartes: pesees, exemples: pesees.length > 0 && pesees.every(estCarteExemple), vide: traduire('Ajoute deux photos de corps : ton avant après arrive ici.'), modele: 'net', couleur: 'vert', teinte: 'menthe', grand: true },
    r({ id: 'records', titre: traduire('Records'), sous: traduire('Tes records battus et tes techniques apprises'), sticker: 'trophee', vide: traduire('Bats un record ou note une technique, sa carte arrive ici.'), modele: 'chrome', couleur: 'noir', teinte: 'creme' }, 'records', b.records),
    r({ id: 'compteurs', titre: traduire('Compteurs'), sous: traduire('Tes séances depuis le début, tes heures, tes kilomètres'), sticker: 'jauge', vide: traduire('Tes compteurs arrivent ici dès ta première séance.'), modele: 'maillot', teinte: 'peche' }, 'compteurs', b.compteurs),
    r({ id: 'course', titre: traduire('Course'), sous: traduire('Ton parcours, ta distance, ton allure'), sticker: 'chaussure', vide: traduire('Ta course et son parcours arrivent ici.'), teinte: 'bleu', premiereGrande: true }, 'course', courses),
    r({ id: 'seances', titre: traduire('Dernières séances'), sous: traduire('Tes séances, tous sports'), sticker: 'chrono', vide: traduire('Enregistre une séance, sa carte arrive ici.'), teinte: 'lilas' }, 'seances', autres),
    r({ id: 'objectifs', titre: traduire('Objectifs'), sous: traduire('Ta semaine, ton année, ton poids'), sticker: 'objectifs', vide: traduire('Choisis ton rythme de séances ou ton poids visé : tes objectifs arrivent ici.'), modele: 'stickers', couleur: 'violet', teinte: 'menthe' }, 'objectifs', b.objectifs),
    r({ id: 'annee', titre: traduire('Mon année'), sous: traduire('Combien de temps, combien de fois, ton objectif'), sticker: 'medaille_or', vide: traduire('Ton année arrive ici dès ta première séance.'), modele: 'holo', couleur: 'bleu', teinte: 'creme' }, 'annee', b.annees),
    r({ id: 'semaine', titre: traduire('Ma semaine'), sous: traduire('Tes séances, ton temps, ta série'), sticker: 'calendrier', vide: traduire('Le bilan de chaque semaine avec au moins une séance arrive ici.'), modele: 'serie', teinte: 'bleu' }, 'semaine', b.semaines),
    r({ id: 'mois', titre: traduire('Mon mois'), sous: traduire('Ton temps, tes séances, tes sports, ton objectif'), sticker: 'sablier', vide: traduire('Ton premier mois avec une séance arrive ici.'), modele: 'stickers', teinte: 'lilas' }, 'mois', b.mois),
  ];
}
