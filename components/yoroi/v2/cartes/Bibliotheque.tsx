/**
 * Bibliotheque des cartes (31 octobre 2026, Houari : « il leur faut une bibliotheque de partage de cartes :
 * les dernieres seances, les derniers records, les objectifs, etc. »).
 * Le sommaire en pastilles, puis une rubrique par sujet : un sticker, un titre, et une rangee de vignettes
 * qui sont les vraies cartes dessinees avec tes chiffres. Un toucher ouvre l'atelier (carrousel des modeles)
 * sur cette carte. Rubrique vide : une phrase courte et un sticker, jamais une carte inventee.
 * Composant de presentation : les cartes arrivent toutes lues (app/mes-cartes.tsx), il se dessine aussi en web.
 */
import React, { useRef } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { sticker, type NomSticker } from '@/components/yoroi/v2/stickers';
import { CarteApercu, type VisuelsCarte } from './CarteRendu';
import { chiffresAffiches, chiffresParDefaut, duree, familleDe, nombre } from '@/lib/v2/cartes/chiffres';
import { getSportCategory } from '@/lib/sports';
import { directionEffective } from '@/lib/v2/cartes/directions';
import type { CarteData, CouleurId, DirectionId, Masque, OptionsCarte } from '@/lib/v2/cartes/types';
import type { Bibliotheque as BibliothequeDonnees } from '@/lib/v2/cartes/bibliotheque';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

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
};

/** La vignette : la carte en Story, assez grande pour lire le chiffre */
export const VIGNETTE_L = 124;

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

function Vignette({ d, options, visuels, onPress }: { d: CarteData; options: OptionsCarte; visuels: VisuelsCarte; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sous = d.moment === 'seance' ? d.sousTitre : resumeCarte(d, options.masque);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire('Carte {0}, {1}', nomVignette(d), sous)} style={({ pressed }) => ({ width: VIGNETTE_L, gap: 7, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View pointerEvents="none" style={{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}>
        <CarteApercu largeur={VIGNETTE_L} data={d} options={options} visuels={visuels} />
      </View>
      <View style={{ gap: 1, paddingHorizontal: 2 }}>
        <Ink size={13.5} weight="extraBold" numberOfLines={1}>{traduire(nomVignette(d))}</Ink>
        <Ink size={12} color={c.textSecondary} numberOfLines={2} style={{ lineHeight: 15 }}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

export function Bibliotheque({ rubriques, base, visuelsPour, onOuvrir, defiler, avant, apres }: {
  rubriques: RubriqueBiblio[];
  /** le style memorise (couleur, masquage) ; la vignette prend le modele de sa rubrique */
  base: OptionsCarte;
  visuelsPour: (d: CarteData) => VisuelsCarte;
  onOuvrir: (d: CarteData) => void;
  /** fait defiler l'ecran jusqu'a une rubrique (sommaire) ; absent, pas de sommaire */
  defiler?: (y: number) => void;
  avant?: React.ReactNode;
  apres?: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const positions = useRef<Record<string, number>>({});
  const debut = useRef(0);
  const pleines = rubriques.filter((r) => r.cartes.length);
  return (
    <View style={{ gap: 26 }} onLayout={(e) => (debut.current = e.nativeEvent.layout.y)}>
      {defiler && pleines.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
          {pleines.map((r) => (
            <Pressable key={r.id} onPress={() => defiler(debut.current + (positions.current[r.id] ?? 0) - 8)} accessibilityRole="button" accessibilityLabel={traduire('Aller à {0}', r.titre)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 6, paddingRight: 14, borderRadius: 22, backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border })}>
              <Image source={sticker(r.sticker)} style={{ width: 30, height: 30 }} resizeMode="contain" />
              <Ink size={14} weight="extraBold">{r.titre}</Ink>
              <Ink size={13} weight="bold" color={c.textMuted}>{String(r.cartes.length)}</Ink>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {avant}
      {rubriques.map((r) => (
        <View key={r.id} style={{ gap: 12 }} onLayout={(e) => (positions.current[r.id] = e.nativeEvent.layout.y)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image source={sticker(r.sticker)} style={{ width: 46, height: 46 }} resizeMode="contain" />
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={20} weight="black" tight accessibilityRole="header">{r.titre}</Ink>
              <Ink size={13} color={c.textSecondary} numberOfLines={2}>{r.sous}</Ink>
            </View>
          </View>
          {r.cartes.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 4, gap: 12 }}>
              {r.cartes.map((d) => {
                const o: OptionsCarte = {
                  ...base,
                  modele: r.modele ? directionEffective(d, r.modele) : directionEffective(d, base.modele),
                  couleur: r.couleur ?? base.couleur,
                  format: 'story',
                  fond: 'couleur',
                  sortie: 'story',
                  chiffres: d.moment === 'exploit' ? [] : chiffresParDefaut(d, base.masque, 4),
                };
                // un exploit sans famille (record de course...) prend celle de son sport : la bonne photo d'ambiance
                const dv = !d.famille && d.sport ? { ...d, famille: familleDe(getSportCategory(d.sport), d.sport) } : d;
                return <Vignette key={d.cle} d={dv} options={o} visuels={{ ...visuelsPour(d), ambiance: true }} onPress={() => onOuvrir(d)} />;
              })}
            </ScrollView>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <Image source={sticker(r.sticker)} style={{ width: 40, height: 40, opacity: 0.9 }} resizeMode="contain" />
              <Ink size={14} color={c.textSecondary} style={{ flex: 1 }}>{r.vide}</Ink>
            </View>
          )}
        </View>
      ))}
      {apres}
    </View>
  );
}

/** Les rubriques de la bibliotheque, dans l'ordre de l'ecran */
export function rubriquesDe(b: BibliothequeDonnees, avantApres: CarteData | null): RubriqueBiblio[] {
  return [
    { id: 'seances', titre: traduire('Dernières séances'), sous: traduire('Tes séances, tous sports'), sticker: 'chrono', cartes: b.seances, vide: traduire('Enregistre une séance, sa carte arrive ici.') },
    { id: 'records', titre: traduire('Records'), sous: traduire('Tes records battus et tes techniques apprises'), sticker: 'trophee', cartes: b.records, vide: traduire('Bats un record ou note une technique, sa carte arrive ici.'), modele: 'chrome', couleur: 'noir' },
    { id: 'objectifs', titre: traduire('Objectifs'), sous: traduire('Ta semaine, ton année, ton poids'), sticker: 'objectifs', cartes: b.objectifs, vide: traduire('Choisis ton rythme de séances ou ton poids visé : tes objectifs arrivent ici.'), modele: 'stickers', couleur: 'violet' },
    { id: 'semaine', titre: traduire('Ma semaine'), sous: traduire('Tes séances, ton temps, ta série'), sticker: 'calendrier', cartes: b.semaines, vide: traduire('Le bilan de chaque semaine avec au moins une séance arrive ici.'), modele: 'serie' },
    { id: 'mois', titre: traduire('Mon mois'), sous: traduire('Ton temps, tes séances, tes sports, ton objectif'), sticker: 'sablier', cartes: b.mois, vide: traduire('Ton premier mois avec une séance arrive ici.'), modele: 'stickers' },
    { id: 'annee', titre: traduire('Mon année'), sous: traduire('Combien de temps, combien de fois, ton objectif'), sticker: 'medaille_or', cartes: b.annees, vide: traduire('Ton année arrive ici dès ta première séance.'), modele: 'holo', couleur: 'bleu' },
    { id: 'compteurs', titre: traduire('Compteurs'), sous: traduire('Tes séances depuis le début, tes heures, tes kilomètres'), sticker: 'jauge', cartes: b.compteurs, vide: traduire('Tes compteurs arrivent ici dès ta première séance.'), modele: 'maillot' },
    { id: 'pesees', titre: traduire('Pesées et avant après'), sous: traduire('Tes progrès sur la balance et en photo'), sticker: 'balance', cartes: avantApres ? [avantApres, ...b.pesees] : b.pesees, vide: traduire('Quand une pesée te rapproche de ton objectif, sa carte arrive ici.'), modele: 'net', couleur: 'vert' },
  ];
}
