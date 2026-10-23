/**
 * Vitrines des nouveautes (17 octobre 2026, revue de l'onboarding). Houari : « je veux vraiment que tu ameliores,
 * avec toutes les nouveautes qu'on a mises en place ». Court et visuel : chaque vitrine dessine la nouveaute avec
 * les VRAIS composants de l'app (tuiles de l'accueil, citation du jour, cartes de partage, phrases du bilan,
 * illustrations des machines, personnages et leurs teintes), jamais une capture figee : elles suivent le clair et
 * le sombre et restent a jour quand l'app change.
 * Les chiffres sont des exemples, marques « Exemple » sur chaque vitrine qui en montre. Rien n'est enregistre,
 * rien ne se touche (pointerEvents none) : on regarde, puis on continue.
 * Utilisees par l'accroche (Accroche.tsx), la demonstration (Demo.tsx) et la mini page « Nouveautes 3.0 »
 * (app/nouveautes.tsx, CarrouselVitrines).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { GrilleAccueil, TuileRecord, TuileSanteJour, TuileSerie } from '@/components/yoroi/v2/accueil/Grille';
import { CitationDuJour } from '@/components/yoroi/v2/accueil/Citation';
import { teinte } from '@/components/yoroi/v2/accueil/domaines';
import type { Domaine } from '@/components/yoroi/v2/accueil/domaines';
import { PhraseVue } from '@/components/yoroi/v2/bilan/BilanVue';
import { CarteApercu, HAUTEURS } from '@/components/yoroi/v2/cartes/CarteRendu';
import { TropheeRecord } from '@/components/yoroi/v2/charts/core';
import { STYLES_CITATION } from '@/lib/v2/accueil/styleCitation';
import { CITATIONS } from '@/lib/v2/accueil/citations';
import type { StyleCitation } from '@/lib/v2/accueil/styleCitation';
import type { MesureSanteJour } from '@/lib/v2/accueil/enPlus';
import type { PhraseRiche } from '@/lib/v2/bilan/texte';
import type { CarteData, FormatId, ModeleId, OptionsCarte } from '@/lib/v2/cartes/types';
import { MACHINE_BY_ID } from '@/lib/v2/seance/machines';
import { machineArt } from '@/lib/v2/seance/machinesArt';
import { VIE_PERSONNAGES } from '@/lib/v2/dojo/personnages';
import { VARIANTES_TEINTE, imageTeinte } from '@/lib/v2/dojo/packsTeintes';
import { styleBuste } from '@/lib/v2/espace/cadrageBuste';
import { useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

// ===== Briques =====

/** « Exemple », en haut a droite des vitrines qui montrent des chiffres */
export function PastilleExemple({ label = 'Exemple' }: { label?: string }) {
  const c = useColors();
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Ink size={11} weight="black" color={c.accent}>{label}</Ink>
    </View>
  );
}

function Carte({ children, gap = 10, pad = 14 }: { children: React.ReactNode; gap?: number; pad?: number }) {
  const c = useColors();
  return <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: pad, gap }}>{children}</View>;
}

/** Ligne de tete d'une vitrine : icone dans la couleur du domaine, titre, pastille Exemple a droite */
function Tete({ domaine, icone, titre, exemple = true }: { domaine: Domaine; icone: IconName; titre: string; exemple?: boolean }) {
  const t = teinte(domaine);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icone} size={15} color={t.texte} stroke={2.4} />
      </View>
      <Ink size={14} weight="black" color={t.texte} numberOfLines={1} style={{ flex: 1 }}>{titre}</Ink>
      {exemple ? <PastilleExemple /> : null}
    </View>
  );
}

const isoJour = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ===== 1. L'accueil en grille de tuiles colorees, avec « Ta santé aujourd'hui » =====

/** Exemple de mesures Sante du jour (les vraies viennent d'Apple Sante ou de Health Connect) */
const SANTE_EXEMPLE: MesureSanteJour[] = [
  { cle: 'pas', valeur: 8420, hier: false },
  { cle: 'energie-active', valeur: 512, hier: false },
  { cle: 'sommeil', valeur: 432, hier: false },
  { cle: 'fc-repos', valeur: 56, hier: false },
  { cle: 'exercice', valeur: 48, hier: false },
  { cle: 'distance', valeur: 6.1, hier: false },
];

export function VitrineAccueil() {
  const aujourdhui = isoJour(new Date());
  return (
    <View pointerEvents="none" style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <PastilleExemple />
      </View>
      <GrilleAccueil
        tuiles={[
          { cle: 'sante', taille: 'pleine', contenu: <TuileSanteJour mesures={SANTE_EXEMPLE} /> },
          { cle: 'serie', taille: 'demi', groupe: 'g', contenu: <TuileSerie semaines={6} goal={3} /> },
          { cle: 'record', taille: 'demi', groupe: 'g', contenu: <TuileRecord record={{ titre: traduire('Développé couché'), valeur: '100 kg', date: aujourdhui }} /> },
        ]}
      />
    </View>
  );
}

// ===== 2. La citation du jour, trois styles =====

/** Trois vraies citations de l'app (lib/v2/accueil/citations.ts), une par style */
const PHRASE_STYLES: Record<StyleCitation, string> = {
  pinceau: CITATIONS[0],
  takeda: CITATIONS[3],
  sceau: CITATIONS[10],
};

export function VitrineCitations() {
  const c = useColors();
  return (
    <View pointerEvents="none" style={{ gap: 8 }}>
      {STYLES_CITATION.map((s) => (
        <Carte key={s.id} gap={6} pad={12}>
          <Ink size={12} weight="extraBold" color={c.textMuted}>{s.nom}</Ink>
          <CitationDuJour texte={PHRASE_STYLES[s.id]} style={s.id} />
        </Carte>
      ))}
    </View>
  );
}

// ===== 3. Des personnages de toutes origines, avec le choix du visage =====

const PACK_VISAGES = 'pompier';
const DEFILE_ORIGINES: { id: string; teinte: (typeof VARIANTES_TEINTE)[number] | null }[] = [
  { id: 'basket', teinte: 'peau_foncee' },
  { id: 'soignant', teinte: 'asie' },
  { id: 'escalade', teinte: 'peau_mate' },
  { id: 'foot', teinte: null },
];

function imageVie(id: string, g: 'h' | 'f', t: (typeof VARIANTES_TEINTE)[number] | null) {
  const p = VIE_PERSONNAGES.find((x) => x.id === id);
  if (!p) return undefined;
  return t ? imageTeinte(id, t, g) : p.images[g][0];
}

export function VitrinePersonnages({ genre }: { genre: 'h' | 'f' }) {
  const c = useColors();
  const visages = [null, ...VARIANTES_TEINTE].map((t) => imageVie(PACK_VISAGES, genre, t)).filter((x) => x !== undefined);
  const autre: 'h' | 'f' = genre === 'h' ? 'f' : 'h';
  const corps = DEFILE_ORIGINES.map((d, k) => imageVie(d.id, k % 2 ? autre : genre, d.teinte)).filter((x) => x !== undefined);
  const choisi = Math.min(1, visages.length - 1);
  return (
    <View pointerEvents="none" style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
        {corps.map((src, k) => (
          <View key={k} style={{ flex: 1, height: 150, borderRadius: 18, backgroundColor: c.fillSoft, overflow: 'hidden' }}>
            <Image source={src} resizeMode="contain" style={{ position: 'absolute', left: 0, right: 0, top: 4, width: '100%', height: 144 }} accessibilityIgnoresInvertColors />
          </View>
        ))}
      </View>
      {visages.length > 1 ? (
        <Carte gap={8} pad={12}>
          <Ink size={13} weight="extraBold" color={c.ink}>{traduire("Choisis ton visage")}</Ink>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {visages.map((src, k) => {
              const on = k === choisi;
              return (
                <View key={k} style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: c.fillSoft, borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border }}>
                  <Image source={src} resizeMode="cover" style={styleBuste(src)} accessibilityIgnoresInvertColors />
                </View>
              );
            })}
          </View>
        </Carte>
      ) : null}
    </View>
  );
}

// ===== 4. Les cartes a partager : trois formats, de nouveaux modeles =====

const LUNDI = (() => {
  const d = new Date();
  const k = (d.getDay() + 6) % 7;
  return isoJour(new Date(d.getFullYear(), d.getMonth(), d.getDate() - k - 7, 12));
})();

/** Exemple de seance avec record (modele Record) */
const CARTE_RECORD: CarteData = {
  moment: 'seance',
  titre: 'Musculation',
  sousTitre: 'Exemple',
  sport: 'musculation',
  famille: 'muscu',
  seance: { dureeMin: 64, rounds: 0, series: 16, tonnage: 9800, distanceKm: 0, fcMoy: 0, fcMax: 0, calories: 0, zones: null, records: [{ nom: traduire('Développé couché'), texte: traduire('100 kg pour 5 répétitions'), poids: 100, reps: 5, avant: 96 }] },
  cle: 'onboarding:record',
};

/** Exemple de semaine (modele Semaine) */
const CARTE_SEMAINE: CarteData = {
  moment: 'semaine',
  titre: traduire('Ma semaine'),
  sousTitre: 'Exemple',
  semaine: {
    debut: LUNDI,
    jours: [true, false, true, false, true, true, false],
    seances: 4,
    minutes: 290,
    sports: [{ nom: 'Jiu-jitsu brésilien', n: 2 }, { nom: 'Musculation', n: 1 }, { nom: traduire('Course à pied'), n: 1 }],
    poidsFin: null,
    poidsEcart: null,
    objectif: 4,
    parJour: [{ sports: ['Jiu-jitsu brésilien'] }, { sports: [] }, { sports: ['Musculation'] }, { sports: [] }, { sports: ['Jiu-jitsu brésilien'] }, { sports: [traduire('Course à pied')] }, { sports: [] }],
  },
  cle: 'onboarding:semaine',
};

/** Exemple de course (modele Minimal) */
const CARTE_MINIMAL: CarteData = {
  moment: 'seance',
  titre: traduire('Course à pied'),
  sousTitre: 'Exemple',
  sport: 'running',
  famille: 'course',
  seance: { dureeMin: 52, rounds: 0, series: 0, tonnage: 0, distanceKm: 10, fcMoy: 0, fcMax: 0, calories: 0, zones: null, records: [] },
  cle: 'onboarding:minimal',
};

const BASE_CARTE: OptionsCarte = { modele: 'affiche', format: 'story', fond: 'uni', sombre: false, personnage: false, masque: 'aucun', chiffres: [], slogan: 0, epure: true };

const FORMATS: { format: FormatId; nom: string; usage: string; data: CarteData; modele: ModeleId; sombre: boolean }[] = [
  { format: 'story', nom: 'Story', usage: traduire('plein écran'), data: CARTE_RECORD, modele: 'record', sombre: true },
  { format: 'post', nom: 'Publication', usage: traduire('dans le fil'), data: CARTE_SEMAINE, modele: 'semaine', sombre: false },
  { format: 'carre', nom: traduire('Carré'), usage: 'partout', data: CARTE_MINIMAL, modele: 'minimal', sombre: false },
];

export const MODELES_NOUVEAUX = [traduire('Record'), traduire('Semaine'), 'Minimal', traduire('Avant après')];

export function VitrinePartage({ largeur }: { largeur: number }) {
  const c = useColors();
  const gap = 8;
  // les trois cartes cote a cote, alignees en bas, a la meme echelle : la difference de format se voit
  const col = Math.floor((largeur - gap * 2) / 3);
  return (
    <View pointerEvents="none" style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <PastilleExemple />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
        {FORMATS.map((f) => (
          <View key={f.format} style={{ width: col, gap: 5 }}>
            <View style={{ height: Math.round((HAUTEURS.story * col) / 360), justifyContent: 'flex-end' }}>
              <CarteApercu largeur={col} data={f.data} options={{ ...BASE_CARTE, format: f.format, modele: f.modele, sombre: f.sombre }} visuels={{}} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Ink size={13} weight="black" color={c.ink} numberOfLines={1}>{f.nom}</Ink>
              <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={1}>{f.usage}</Ink>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {MODELES_NOUVEAUX.map((m) => (
          <View key={m} style={{ borderRadius: 999, backgroundColor: c.fillSoft, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Ink size={12} weight="extraBold" color={c.ink}>{m}</Ink>
          </View>
        ))}
      </View>
    </View>
  );
}

// ===== 5. Le bilan colore apres chaque seance =====

const BILAN_EXEMPLE: PhraseRiche[] = [
  { phare: true, segments: [{ texte: traduire('Tu en es à ta ') }, { texte: traduire('3e séance'), role: 'seance' }, { texte: traduire(' de la semaine.') }] },
  { icone: 'objectif', segments: [{ texte: traduire('Encore ') }, { texte: traduire('1 séance'), role: 'seance' }, { texte: traduire(' pour ton objectif de la semaine.') }] },
  { icone: 'comparaison', segments: [{ texte: traduire('Par rapport à ta dernière séance : ') }, { texte: '2 rounds', role: 'seance' }, { texte: traduire(' de plus.') }] },
  { icone: 'record', segments: [{ texte: traduire('Et un record tombe : ') }, { texte: traduire('record de rounds'), role: 'record' }, { texte: '.' }] },
];

export function VitrineBilan() {
  const c = useColors();
  return (
    <View pointerEvents="none">
      <Carte gap={12}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Ink size={13} weight="black" color={c.textMuted}>{traduire("Ton bilan")}</Ink>
          <PastilleExemple />
        </View>
        {BILAN_EXEMPLE.map((p, i) => <PhraseVue key={i} p={p} />)}
      </Carte>
    </View>
  );
}

// ===== 6. Les exercices en francais, Trouve ta machine, le lieu simplifie =====

const MACHINES_VITRINE = ['banc_developpe', 'smith_machine'];

export function VitrineSeance() {
  const c = useColors();
  const t = teinte('seances');
  const machines = MACHINES_VITRINE.map((id) => ({ m: MACHINE_BY_ID.get(id), art: machineArt(id) })).filter((x) => x.m && x.art);
  return (
    <View pointerEvents="none" style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12 }}>
        <Icon name="search" size={16} color={c.textMuted} />
        <Ink size={14} weight="bold" color={c.ink} style={{ flex: 1 }} numberOfLines={1}>{traduire("soulevé de terre")}</Ink>
      </View>
      <Carte gap={8} pad={12}>
        <Tete domaine="seances" icone="camera" titre={traduire("Trouve ta machine")} exemple={false} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {machines.map((x) => (
            <View key={x.m!.id} style={{ flex: 1, gap: 4 }}>
              <View style={{ height: 96, borderRadius: 14, backgroundColor: '#FBFAF6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Image source={x.art!} resizeMode="contain" style={{ width: '92%', height: 90 }} accessibilityIgnoresInvertColors />
              </View>
              <Ink size={12} weight="extraBold" color={c.ink} numberOfLines={2}>{x.m!.nom}</Ink>
            </View>
          ))}
        </View>
      </Carte>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          { icone: 'dumbbell' as IconName, titre: 'Kilos', sous: traduire('pas de 2, et 0,5') },
          { icone: 'home' as IconName, titre: 'Lieu', sous: traduire('ton club ou dehors') },
        ]).map((x) => (
          <View key={x.titre} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, backgroundColor: t.fond, borderWidth: 1, borderColor: t.bord, padding: 10 }}>
            <Icon name={x.icone} size={18} color={t.texte} stroke={2.4} />
            <View style={{ flex: 1 }}>
              <Ink size={13} weight="black" color={t.texte} numberOfLines={1}>{x.titre}</Ink>
              <Ink size={11.5} weight="bold" color={c.textSecondary} numberOfLines={1}>{x.sous}</Ink>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ===== 7. Le trophee des records =====

export function TropheeLigne({ size = 22 }: { size?: number }) {
  return <TropheeRecord size={size} />;
}

// ===== Le carrousel des nouveautes (mini page « Nouveautes 3.0 ») =====

export type Vitrine = { id: string; titre: string; sous: string; rendu: (largeur: number) => React.ReactNode };

/** Les vitrines dans l'ordre de la mini page des nouveautes */
export function vitrinesNouveautes(genre: 'h' | 'f'): Vitrine[] {
  return [
    { id: 'accueil', titre: traduire('Ton accueil **en couleurs**'), sous: traduire('Une tuile par sujet, et ta santé du jour en un coup d’œil.'), rendu: () => <VitrineAccueil /> },
    { id: 'citation', titre: traduire('Ta **citation** du jour'), sous: traduire('Trois styles au choix, dans Réglages, Personnaliser.'), rendu: () => <VitrineCitations /> },
    { id: 'personnages', titre: traduire('Des personnages **qui te ressemblent**'), sous: traduire('De toutes origines. Choisis ton visage.'), rendu: () => <VitrinePersonnages genre={genre} /> },
    { id: 'partage', titre: traduire('Tes **cartes** à partager'), sous: traduire('Story, Publication ou Carré. Nouveaux modèles.'), rendu: (l) => <VitrinePartage largeur={l} /> },
    { id: 'bilan', titre: traduire('Ton **bilan** après chaque séance'), sous: traduire('Les mots importants en couleur, tes records en rouge.'), rendu: () => <VitrineBilan /> },
    { id: 'seance', titre: traduire('Tes séances, **plus simples**'), sous: traduire('Exercices en français, ta machine en image, ton lieu en un geste.'), rendu: () => <VitrineSeance /> },
  ];
}

/** Point de pagination cliquable, le point actif s'allonge */
function Point({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  const c = useColors();
  const style = useAnimatedStyle(() => ({ width: withTiming(on ? 22 : 8, { duration: 200 }), backgroundColor: on ? c.accent : c.border }), [on, c.accent, c.border]);
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ minWidth: 26, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />
    </Pressable>
  );
}

const AUTO_MS = 4500;

/**
 * Carrousel des vitrines : glisse au doigt, points cliquables, defilement automatique doux (4,5 s) qui s'arrete
 * des que tu touches. « Reduire les animations » : pas de defilement automatique.
 */
export function CarrouselVitrines({ vitrines, titreRendu }: { vitrines: Vitrine[]; titreRendu: (titre: string) => React.ReactNode }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(!reduce);
  const ref = useRef<ScrollView | null>(null);
  const n = vitrines.length;
  const aller = (k: number) => {
    const x = ((k % n) + n) % n;
    setI(x);
    if (w > 0) ref.current?.scrollTo({ x: x * w, animated: true });
  };
  useEffect(() => {
    if (!auto || w <= 0) return;
    const t = setTimeout(() => aller(i + 1), AUTO_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, i, w]);
  const fin = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (w <= 0) return;
    const k = Math.max(0, Math.min(n - 1, Math.round(e.nativeEvent.contentOffset.x / w)));
    if (k !== i) {
      tap();
      setI(k);
    }
  };
  return (
    <View style={{ gap: 4 }}>
      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} onTouchStart={() => setAuto(false)}>
        {w > 0 ? (
          <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScrollBeginDrag={() => setAuto(false)} onMomentumScrollEnd={fin} onScrollEndDrag={fin} scrollEventThrottle={16} decelerationRate="fast">
            {vitrines.map((v) => (
              <View key={v.id} style={{ width: w, gap: 10 }} accessible accessibilityLabel={`${v.titre.replace(/\*\*/g, '')}. ${v.sous}`}>
                <View style={{ gap: 3 }}>
                  {titreRendu(v.titre)}
                  <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{v.sous}</Ink>
                </View>
                {Math.abs(vitrines.indexOf(v) - i) <= 1 ? v.rendu(w) : null}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: 360 }} />
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        {vitrines.map((v, k) => (
          <Point key={v.id} on={k === i} label={traduire("Nouveauté {0} sur {1}", k + 1, n)} onPress={() => { setAuto(false); aller(k); }} />
        ))}
      </View>
    </View>
  );
}
