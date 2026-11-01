/**
 * « Tes prochaines séances » (1er novembre 2026) : les morceaux de l'écran app/programmes/prochaines.tsx.
 *  - ReglageSeances : « Tes séances », alterner A et B ou toujours la même, et la phrase qui dit la logique ;
 *  - ApercuAB : une séance en version A et en version B, côte à côte ;
 *  - CarteJour : une date, sa séance (nom, version, durée, abdos, cardio), ses exercices avec séries, répétitions
 *    et la charge proposée ; le tampon validé quand elle est faite ;
 *  - FeuilleSeance : le détail d'une séance en aperçu : la commencer aujourd'hui, l'échanger, changer un exercice ;
 *  - MusclesPrevus : la carte rouge des muscles de la semaine prévue, « 2 fois sur 2 » par groupe, et les
 *    suggestions (« Ajoute un exercice d'épaules à Upper B ») avec 3 exercices réels. Rien n'est forcé.
 * Stickers seulement, couleurs franches, aucun caractère japonais. Les données arrivent toutes prêtes de l'écran.
 */
import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { VignetteExo } from '@/components/yoroi/v2/programmes/VignetteExo';
import { FicheExercice } from '@/components/yoroi/v2/programmes/FicheExercice';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { MusclesSemaine } from '@/components/yoroi/v2/seances/MusclesSemaine';
import { TamponValide } from '@/components/yoroi/v2/seances/TamponValide';
import { CarreSticker, Pastille, useCarteA, useTeinte } from '@/components/yoroi/v2/seances/kitA';
import type { TeinteA } from '@/components/yoroi/v2/seances/kitA';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { FeuillePourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import { useFeuilleCentree } from '@/lib/v2/nav/useGrandEcran';
import { POURQUOI_DEUX_FOIS } from '@/lib/v2/frequence/pourquoiDeuxFois';
import { DE_MUSCLE, libellePrevu } from '@/lib/v2/programmes/prochainesSeances';
import type { CouvertureMuscle, JourPrevu, Suggestion } from '@/lib/v2/programmes/prochainesSeances';
import type { Alternance } from '@/lib/v2/programmes/alternance';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import type { MuscleLoad } from '@/lib/v2/seances/musclesExercices';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { chargeTexte } from '@/lib/v2/unitePoids';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/* ------------------------------------------------------------------------------------------------
 * Les données d'une date, prêtes à montrer
 * ---------------------------------------------------------------------------------------------- */
export type ExoVu = ExoProgramme & {
  /** ajouté par la fin de séance (abdos) : pas de « Changer » */
  fin?: true;
  /** sa case dans la séance du programme (pour « Changer »), absent pour un ajout */
  index?: number;
  /** la charge proposée (kg), null : à choisir, poids du corps ou tenu */
  kg: number | null;
  /** répétitions (ou secondes) visées par la règle de progression */
  vise: number;
  /** changé à la main pour cette séance ou pour toujours */
  change?: boolean;
};

export type VueJour = {
  jp: JourPrevu;
  /** nom affiché, traduit, avec sa version (« Haut du corps B ») */
  nom: string;
  lettre: 'A' | 'B' | null;
  exos: ExoVu[];
  minutes: number;
  /** « 30 min de marche inclinée » : le cardio réellement prévu (type et durée choisis) */
  cardio: string | null;
  abdos: number;
  muscu: boolean;
  /** séance sans exercices (rounds, cardio) : son résumé */
  resume?: string;
  /** libellé de la date : « lun. 2 nov. » */
  quand: string;
};

const TEINTE_LETTRE: Record<'A' | 'B', TeinteA> = { A: 'bleu', B: 'peche' };

function BadgeLettre({ lettre, taille = 26 }: { lettre: 'A' | 'B'; taille?: number }) {
  const t = useTeinte(TEINTE_LETTRE[lettre]);
  const { theme } = useYoroiTheme();
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille / 2.6, backgroundColor: theme.isDark ? t.fond : t.texte, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={traduire('Version {0}', lettre)}>
      <Ink size={taille * 0.56} weight="black" color={theme.isDark ? t.texte : '#FFFFFF'}>{lettre}</Ink>
    </View>
  );
}

/** « 4 × 6 à 10 », « 3 × 30 à 45 s », « 30 min » */
export function seriesTexte(e: Pick<ExoProgramme, 'series' | 'repsMin' | 'repsMax' | 'secondes' | 'minutes'>): string {
  if (typeof e.minutes === 'number' && e.minutes > 0) return traduire('{0} min', e.minutes);
  const reps = e.repsMin === e.repsMax ? String(e.repsMin) : traduire('{0} à {1}', e.repsMin, e.repsMax);
  return e.secondes ? traduire('{0} × {1} s', e.series, reps) : `${e.series} × ${reps}`;
}

function chargeVue(e: ExoVu, unite: UnitePoids): string | null {
  if (typeof e.minutes === 'number' && e.minutes > 0) return null;
  if (e.kg && e.kg > 0) return chargeTexte(e.kg, unite, unite === 'kg' ? 2 : 1);
  if (e.poidsDuCorps) return traduire('poids du corps');
  if (e.secondes) return null;
  return traduire('à choisir');
}

/**
 * Une ligne d'exercice : vignette (machine ou sticker du muscle), nom, séries et charge proposée.
 * 1er novembre 2026 : un toucher sur la ligne ouvre la fiche de l'exercice (FicheExercice) ; `fiche` false : non.
 */
export function LigneExo({ e, unite, compact = false, onChanger, accent, fiche = true }: { e: ExoVu; unite: UnitePoids; compact?: boolean; onChanger?: () => void; accent?: boolean; fiche?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const menthe = useTeinte('menthe');
  const peche = useTeinte('peche');
  const [ouverte, setOuverte] = useState(false);
  const taille = compact ? 40 : 52;
  const charge = chargeVue(e, unite);
  const nom = sansTiret(traduire(nomFr(e.nom)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: taille + 6 }}>
      <Pressable
        onPress={fiche ? () => { tap(); setOuverte(true); } : undefined}
        disabled={!fiche}
        accessibilityRole={fiche ? 'button' : undefined}
        accessibilityLabel={`${nom}, ${seriesTexte(e)}${charge ? `, ${charge}` : ''}`}
        accessibilityHint={fiche ? traduire('Ouvrir la fiche de {0}', nom) : undefined}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: Math.max(44, taille + 6), opacity: pressed ? 0.7 : 1 })}
      >
      <VignetteExo nom={e.nom} muscle={e.muscle} cardio={!!e.minutes} taille={taille} arrondi={compact ? 12 : 15} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={compact ? 13 : 14} weight={accent ? 'black' : 'extraBold'} color={accent ? peche.texte : c.ink} numberOfLines={3}>{sansTiret(traduire(nomFr(e.nom)))}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8 }}>
          <Ink size={12.5} weight="bold" color={c.textSecondary}>{seriesTexte(e)}</Ink>
          {charge ? <Ink size={12.5} weight="extraBold" color={e.kg ? menthe.texte : c.textSecondary}>{charge}</Ink> : null}
          {e.change ? <Ink size={11.5} weight="extraBold" color={peche.texte}>{traduire('changé')}</Ink> : null}
        </View>
      </View>
      </Pressable>
      {fiche ? <FicheExercice exo={ouverte ? e : null} charge={charge} onClose={() => setOuverte(false)} onChanger={onChanger} /> : null}
      {onChanger ? (
        <Pressable onPress={() => { tap(); onChanger(); }} accessibilityRole="button" accessibilityLabel={traduire('Changer {0}', traduire(nomFr(e.nom)))} hitSlop={6} style={({ pressed }) => ({ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <Image source={illus.img('reglage_machine')} style={{ width: 26, height: 26 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Ink size={10.5} weight="extraBold" color={c.accentText}>{traduire('Changer')}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Tes séances : alterner A et B, ou toujours la même
 * ---------------------------------------------------------------------------------------------- */
export function ReglageSeances({ choix, phrase, catalogue, occupe, onChoisir }: { choix: Alternance; phrase: string; catalogue: boolean; occupe?: boolean; onChoisir: (c: Alternance) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const bleu = useTeinte('bleu');
  const peche = useTeinte('peche');
  const options: { id: Alternance; titre: string; sous: string; sticker: NomSticker; t: { fond: string; texte: string } }[] = [
    { id: 'ab', titre: traduire('Alterner A et B'), sous: traduire('Des exercices qui changent'), sticker: 'repeter', t: bleu },
    { id: 'meme', titre: traduire('Toujours la même'), sous: traduire('Tu refais la même séance'), sticker: 'dupliquer', t: peche },
  ];
  const illus = useIllustrations();
  return (
    <View style={[carte, { padding: 16, gap: 12 }]}>
      <View style={{ gap: 2 }}>
        <Ink size={11} weight="extraBold" color={bleu.texte} style={{ letterSpacing: 1.4 }}>{traduire('Tes séances').toLocaleUpperCase()}</Ink>
        <Ink size={19} weight="black" tight>{traduire('A et B, ou toujours la même ?')}</Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {options.map((o) => {
          const on = o.id === choix;
          return (
            <Pressable
              key={o.id}
              disabled={occupe}
              onPress={() => { if (!on) { tap(); onChoisir(o.id); } }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !!occupe }}
              accessibilityLabel={`${o.titre}, ${o.sous}`}
              style={({ pressed }) => ({ flex: 1, minHeight: 128, borderRadius: 20, padding: 12, gap: 6, backgroundColor: on ? o.t.fond : c.fillSoft, borderWidth: 3, borderColor: on ? o.t.texte : 'transparent', opacity: pressed ? 0.85 : 1 })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Image source={illus.img(o.sticker)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: on ? o.t.texte : c.textMuted, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: o.t.texte }} /> : null}
                </View>
              </View>
              <Ink size={15.5} weight="black" color={on ? o.t.texte : c.ink} numberOfLines={2}>{o.titre}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{o.sous}</Ink>
            </Pressable>
          );
        })}
      </View>
      <View style={{ borderRadius: 16, backgroundColor: choix === 'ab' ? bleu.fond : peche.fond, paddingVertical: 10, paddingHorizontal: 12 }}>
        <Ink size={13.5} weight="extraBold" color={choix === 'ab' ? bleu.texte : peche.texte}>{sansTiret(phrase)}</Ink>
      </View>
      {catalogue ? (
        <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Ton choix fait de ce programme le tien : tes séances faites et tes charges suivent.')}</Ink>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Aperçu A et B côte à côte
 * ---------------------------------------------------------------------------------------------- */
export type PaireAB = { cle: string; titre: string; a: ExoVu[]; b: ExoVu[]; quandA?: string; quandB?: string };

export function ApercuAB({ paires, unite, largeur }: { paires: PaireAB[]; unite: UnitePoids; largeur: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const lilas = useTeinte('lilas');
  const bleu = useTeinte('bleu');
  const peche = useTeinte('peche');
  const [i, setI] = useState(0);
  const p = paires[Math.min(i, paires.length - 1)];
  if (!p) return null;
  const nomsA = new Set(p.a.map((e) => e.nom));
  const etroit = largeur < 360;
  const colonne = (lettre: 'A' | 'B', exos: ExoVu[], quand?: string) => {
    const t = lettre === 'A' ? bleu : peche;
    return (
      <View style={{ flex: 1, minWidth: 0, borderRadius: 18, backgroundColor: t.fond, padding: 10, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <BadgeLettre lettre={lettre} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Ink size={13} weight="black" color={t.texte} numberOfLines={1}>{traduire('Version {0}', lettre)}</Ink>
            {quand ? <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={1}>{quand}</Ink> : null}
          </View>
        </View>
        {exos.map((e, k) => (
          <LigneExo key={`${e.nom}${k}`} e={e} unite={unite} compact={!etroit} accent={lettre === 'B' && !nomsA.has(e.nom)} />
        ))}
      </View>
    );
  };
  return (
    <View style={[carte, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CarreSticker nom="repeter" teinte="lilas" taille={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Ink size={11} weight="extraBold" color={lilas.texte} style={{ letterSpacing: 1.4 }}>{traduire('Aperçu A et B').toLocaleUpperCase()}</Ink>
          <Ink size={18} weight="black" tight numberOfLines={2}>{sansTiret(p.titre)}</Ink>
        </View>
      </View>
      {paires.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {paires.map((x, k) => {
            const on = k === i;
            return (
              <Pressable key={x.cle} onPress={() => { tap(); setI(k); }} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ minHeight: 34, borderRadius: 17, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: on ? lilas.texte : c.fillSoft }}>
                <Ink size={12.5} weight="extraBold" color={on ? '#FFFFFF' : c.ink} numberOfLines={1}>{sansTiret(x.titre)}</Ink>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: etroit ? 'column' : 'row', gap: 10 }}>
        {colonne('A', p.a, p.quandA)}
        {colonne('B', p.b, p.quandB)}
      </View>
      <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Mêmes muscles, mêmes séries : seuls les exercices en couleur changent.')}</Ink>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Une date et sa séance
 * ---------------------------------------------------------------------------------------------- */
export function CarteJour({ v, unite, onPress, delai = 0 }: { v: VueJour; unite: UnitePoids; onPress?: () => void; delai?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const illus = useIllustrations();
  const bleu = useTeinte('bleu');
  const menthe = useTeinte('menthe');
  const lilas = useTeinte('lilas');
  const creme = useTeinte('creme');
  const peche = useTeinte('peche');
  const { jp } = v;
  const [jourCourt, ...reste] = v.quand.split(' ');
  if (!jp.jour) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 6 }}>
        <View style={{ width: 56, alignItems: 'center' }}>
          <Ink size={11.5} weight="extraBold" color={c.textMuted}>{jourCourt}</Ink>
          <Ink size={13} weight="black" color={c.textMuted}>{reste.join(' ')}</Ink>
        </View>
        <Image source={illus.img('sommeil')} style={{ width: 22, height: 22, opacity: 0.8 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Ink size={13} weight="bold" color={c.textMuted}>{traduire('Repos')}</Ink>
      </View>
    );
  }
  const fait = jp.statut === 'faite';
  const rate = jp.statut === 'ratee';
  const auj = jp.statut === 'aujourdhui';
  const t = fait ? menthe : auj ? bleu : v.lettre === 'B' ? peche : v.lettre === 'A' ? bleu : lilas;
  const visibles = v.exos;
  return (
    <Pressable
      onPress={onPress ? () => { tap(); onPress(); } : undefined}
      accessibilityRole="button"
      accessibilityLabel={`${v.quand}, ${v.nom}${fait ? `, ${traduire('Validé')}` : ''}`}
      accessibilityHint={traduire('Ouvre la séance en aperçu')}
      style={({ pressed }) => [carte, { padding: 14, gap: 10, opacity: pressed ? 0.92 : rate ? 0.7 : 1, borderWidth: auj ? 2.5 : 0, borderColor: bleu.texte }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 56, height: 64, borderRadius: 16, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={11} weight="extraBold" color={t.texte}>{jourCourt}</Ink>
          <Ink size={19} weight="black" color={t.texte} numberOfLines={1} style={{ lineHeight: 21 }}>{reste[0]}</Ink>
          <Ink size={11} weight="extraBold" color={t.texte} numberOfLines={1}>{reste.slice(1).join(' ')}</Ink>
          {fait ? <TamponValide taille={26} delai={delai} /> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {auj ? <Ink size={11} weight="extraBold" color={bleu.texte} style={{ letterSpacing: 1.2 }}>{traduire('Aujourd’hui').toLocaleUpperCase()}</Ink> : null}
          {fait ? <Ink size={11} weight="extraBold" color={menthe.texte} style={{ letterSpacing: 1.2 }}>{traduire('Validé').toLocaleUpperCase()}</Ink> : null}
          {rate ? <Ink size={11} weight="extraBold" color={c.textMuted} style={{ letterSpacing: 1.2 }}>{traduire('Pas faite').toLocaleUpperCase()}</Ink> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ink size={17} weight="black" tight numberOfLines={2} style={{ flexShrink: 1 }}>{sansTiret(v.nom)}</Ink>
            {v.lettre ? <BadgeLettre lettre={v.lettre} taille={24} /> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {v.minutes > 0 ? <Pastille texte={traduire('environ {0} min', v.minutes)} fond={c.fillSoft} couleur={c.ink} icone={<Image source={illus.img('chrono')} style={{ width: 15, height: 15 }} />} /> : null}
        {v.muscu ? <Pastille texte={traduirePluriel(v.exos.length, v.exos.length > 1, '{0} exercice', '{0} exercices', v.exos.length)} fond={c.fillSoft} couleur={c.ink} /> : null}
        {v.abdos > 0 ? <Pastille texte={traduirePluriel(v.abdos, v.abdos > 1, '{0} abdo', '{0} abdos', v.abdos)} fond={creme.fond} couleur={creme.texte} icone={<Image source={illus.img('abdos')} style={{ width: 15, height: 15 }} />} /> : null}
        {v.cardio ? <Pastille texte={v.cardio} fond={peche.fond} couleur={peche.texte} icone={<Image source={illus.img('cardio_zone2')} style={{ width: 15, height: 15 }} />} /> : null}
        {v.resume ? <Pastille texte={v.resume} fond={c.fillSoft} couleur={c.ink} /> : null}
      </View>
      {v.muscu && !fait ? (
        <View style={{ gap: 4 }}>
          {visibles.map((e, k) => <LigneExo key={`${e.nom}${k}`} e={e} unite={unite} compact />)}
        </View>
      ) : null}
    </Pressable>
  );
}

/** Le titre d'une semaine et ses pastilles (une par séance, pleine quand elle est faite) */
export function TitreSemaine({ titre, jours }: { titre: string; jours: VueJour[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bleu = useTeinte('bleu');
  const menthe = useTeinte('menthe');
  const seances = jours.filter((v) => !!v.jp.jour);
  const faites = seances.filter((v) => v.jp.statut === 'faite').length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2, marginTop: 8 }}>
      <Ink size={12} weight="extraBold" color={bleu.texte} style={{ letterSpacing: 1.4, flexShrink: 1 }} accessibilityRole="header">{titre.toLocaleUpperCase()}</Ink>
      <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: c.divider }} />
      <Ink size={12} weight="extraBold" color={faites && faites === seances.length ? menthe.texte : c.textSecondary}>
        {faites ? traduire('{0} sur {1} faites', faites, seances.length) : traduirePluriel(seances.length, seances.length > 1, '{0} séance', '{0} séances', seances.length)}
      </Ink>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Le détail d'une séance, en aperçu
 * ---------------------------------------------------------------------------------------------- */
export function FeuilleSeance({ v, autres, unite, onClose, onCommencer, onEchanger, onChanger }: {
  v: VueJour | null;
  /** les autres séances à venir de la même semaine (pour « Échanger ») */
  autres: VueJour[];
  unite: UnitePoids;
  onClose: () => void;
  onCommencer?: () => void;
  onEchanger?: (avec: VueJour) => void;
  onChanger?: (e: ExoVu) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const centree = useFeuilleCentree(600);
  const illus = useIllustrations();
  const peche = useTeinte('peche');
  const [echange, setEchange] = useState(false);
  if (!v) return null;
  const fait = v.jp.statut === 'faite';
  return (
    <Modal visible transparent animationType={centree ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[{ flex: 1, backgroundColor: 'rgba(16,18,30,0.45)', justifyContent: 'flex-end' }, centree?.fond]}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} />
        <View style={[{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%', paddingBottom: insets.bottom + 12 }, centree?.carte]}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.divider }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <CarreSticker nom={fait ? 'objectif_semaine' : 'calendrier'} teinte={fait ? 'menthe' : v.lettre === 'B' ? 'peche' : 'bleu'} taille={52} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Ink size={12} weight="extraBold" color={c.textSecondary}>{v.quand}</Ink>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={22} weight="black" tight numberOfLines={2} style={{ flexShrink: 1 }} accessibilityRole="header">{sansTiret(v.nom)}</Ink>
                  {v.lettre ? <BadgeLettre lettre={v.lettre} /> : null}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {v.minutes > 0 ? <Pastille texte={traduire('environ {0} min', v.minutes)} fond={c.fillSoft} couleur={c.ink} /> : null}
              {v.cardio ? <Pastille texte={v.cardio} fond={peche.fond} couleur={peche.texte} /> : null}
              {v.resume ? <Pastille texte={v.resume} fond={c.fillSoft} couleur={c.ink} /> : null}
            </View>
            <View style={{ gap: 6 }}>
              {v.exos.map((e, k) => (
                <LigneExo key={`${e.nom}${k}`} e={e} unite={unite} onChanger={!fait && onChanger && e.index !== undefined && !e.minutes ? () => onChanger(e) : undefined} />
              ))}
            </View>
            {!fait && onCommencer ? (
              <BoutonPrincipal label={v.jp.statut === 'aujourdhui' ? traduire('Commencer la séance') : traduire('La faire aujourd’hui')} onPress={onCommencer} icone={() => <Image source={illus.img('play')} style={{ width: 22, height: 22 }} />} />
            ) : null}
            {!fait && onEchanger && autres.length ? (
              <View style={{ gap: 8 }}>
                <Pressable onPress={() => { tap(); setEchange((x) => !x); }} accessibilityRole="button" accessibilityState={{ expanded: echange }} style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, backgroundColor: c.fillSoft, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, opacity: pressed ? 0.8 : 1 })}>
                  <Image source={illus.img('fleches_haut_bas')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                  <Ink size={14.5} weight="extraBold" style={{ flex: 1 }}>{traduire('Échanger avec une autre séance')}</Ink>
                </Pressable>
                {echange ? (
                  <View style={{ gap: 6 }}>
                    <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Pour cette semaine seulement. Ta semaine habituelle ne change pas.')}</Ink>
                    {autres.map((o) => (
                      <Pressable key={o.jp.date} onPress={() => { tap(); onEchanger(o); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, borderWidth: 2, borderColor: c.divider, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.8 : 1 })}>
                        <Ink size={12.5} weight="extraBold" color={c.textSecondary} style={{ width: 92 }}>{o.quand}</Ink>
                        <Ink size={14} weight="black" style={{ flex: 1 }} numberOfLines={1}>{sansTiret(o.nom)}</Ink>
                        {o.lettre ? <BadgeLettre lettre={o.lettre} taille={22} /> : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
            <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Fermer')}</Ink>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Chaque muscle 2 fois : la semaine prévue
 * ---------------------------------------------------------------------------------------------- */
function Points({ n, plein, vide }: { n: number; plein: string; vide: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1].map((k) => (
        <View key={k} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: k < n ? plein : 'transparent', borderWidth: 2, borderColor: k < n ? plein : vide }} />
      ))}
    </View>
  );
}

export function MusclesPrevus({ couverture, loads, zones, largeur, suggestions, semaines, semaine, onSemaine, onAjouter, ajoutes }: {
  couverture: CouvertureMuscle[];
  loads: MuscleLoad[];
  zones: ZoneId[];
  largeur: number;
  suggestions: Suggestion[];
  /** les semaines au choix (« Cette semaine », « Semaine prochaine ») */
  semaines: string[];
  semaine: number;
  onSemaine: (k: number) => void;
  onAjouter: (s: Suggestion, nom: string, muscle: string) => void;
  /** les exercices déjà ajoutés depuis l'ouverture (« Ajouté ») */
  ajoutes: string[];
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const rouge = theme.isDark ? '#F08C6E' : '#E9694A';
  const vide = theme.isDark ? '#3A4156' : '#D3D9EA';
  const peche = useTeinte('peche');
  const menthe = useTeinte('menthe');
  const creme = useTeinte('creme');
  const illus = useIllustrations();
  const [pourquoi, setPourquoi] = useState(false);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const atteints = couverture.filter((x) => x.jours >= 2).length;
  return (
    <View style={[carte, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CarreSticker nom="muscle" teinte="peche" taille={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Ink size={11} weight="extraBold" color={peche.texte} style={{ letterSpacing: 1.4 }}>{traduire('Chaque muscle 2 fois').toLocaleUpperCase()}</Ink>
          <Ink size={18} weight="black" tight>{traduire('Les muscles de ta semaine prévue')}</Ink>
        </View>
      </View>
      {semaines.length > 1 ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {semaines.map((s, k) => {
            const on = k === semaine;
            return (
              <Pressable key={s} onPress={() => { tap(); onSemaine(k); }} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? peche.texte : c.fillSoft }}>
                <Ink size={12.5} weight="extraBold" color={on ? '#FFFFFF' : c.ink} numberOfLines={1}>{s}</Ink>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <View style={{ flexDirection: largeur >= 330 ? 'row' : 'column', alignItems: largeur >= 330 ? 'flex-start' : 'stretch', gap: 12 }}>
        <View style={{ alignItems: 'center' }}>
          <MusclesSemaine loads={loads} largeur={Math.min(largeur, 340)} zones={zones} liste={false} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          {couverture.map((m) => {
            const l = libellePrevu(m);
            const ok = m.jours >= 2;
            return (
              <View key={m.muscle} style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8 }} accessible accessibilityLabel={`${traduire(m.muscle)}, ${traduire(l.gabarit, l.valeur)}`}>
                <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{sansTiret(traduire(m.muscle))}</Ink>
                <Points n={Math.min(2, m.jours)} plein={rouge} vide={vide} />
                <Ink size={12.5} weight={ok ? 'black' : 'bold'} color={ok ? menthe.texte : c.textSecondary} style={{ width: 84, textAlign: 'right' }} numberOfLines={1}>{traduire(l.gabarit, l.valeur)}</Ink>
              </View>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Ink size={13.5} weight="extraBold" style={{ flexShrink: 1 }}>
          {traduirePluriel(atteints, atteints > 1, '{0} muscle sur {1} prévu 2 fois', '{0} muscles sur {1} prévus 2 fois', atteints, couverture.length)}
        </Ink>
        <Pressable onPress={() => { tap(); setPourquoi(true); }} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, opacity: pressed ? 0.6 : 1 })}>
          <Image source={illus.img('aide')} style={{ width: 18, height: 18 }} resizeMode="contain" />
          <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Pourquoi 2 fois ?')}</Ink>
        </Pressable>
      </View>
      {suggestions.map((s) => {
        const cle = `${s.muscle}|${s.cible.date}`;
        const ouvert = ouverte === cle;
        const fait = s.exos.some((e) => ajoutes.includes(`${s.cible.jourId}|${e.nom}`));
        const titreCible = sansTiret(s.cible.variante ? `${traduire(s.cible.titre)} ${s.cible.variante}` : traduire(s.cible.titre));
        return (
          <View key={cle} style={{ borderRadius: 18, backgroundColor: fait ? menthe.fond : creme.fond, padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={illus.img(fait ? 'objectif_semaine' : 'etincelles')} style={{ width: 32, height: 32 }} resizeMode="contain" />
              <Ink size={14} weight="extraBold" color={fait ? menthe.texte : creme.texte} style={{ flex: 1 }}>
                {fait
                  ? traduire('Ajouté à {0}', titreCible)
                  : traduire('Ajoute un exercice {0} à {1}', traduire(DE_MUSCLE[s.muscle]), titreCible)}
              </Ink>
            </View>
            {!fait ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <BoutonPrincipal label={traduire('Ajouter')} compact hauteur={44} style={{ flex: 1 }} onPress={() => onAjouter(s, s.exos[0].nom, s.exos[0].muscle)} accessibilityHint={traduire('Ajoute {0}', traduire(nomFr(s.exos[0].nom)))} />
                <Pressable onPress={() => { tap(); setOuverte(ouvert ? null : cle); }} accessibilityRole="button" accessibilityState={{ expanded: ouvert }} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 14, borderWidth: 2, borderColor: creme.texte, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                  <Ink size={13.5} weight="extraBold" color={creme.texte}>{traduire('Voir 3 exercices')}</Ink>
                </Pressable>
              </View>
            ) : null}
            {ouvert && !fait ? (
              <View style={{ gap: 6 }}>
                {s.exos.map((e) => (
                  <Pressable key={e.nom} onPress={() => { tap(); onAjouter(s, e.nom, e.muscle); }} accessibilityRole="button" accessibilityLabel={traduire('Ajouter {0}', traduire(nomFr(e.nom)))} style={({ pressed }) => ({ minHeight: 52, borderRadius: 14, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, opacity: pressed ? 0.8 : 1 })}>
                    <VignetteExo nom={e.nom} muscle={e.muscle} taille={40} arrondi={10} />
                    <Ink size={13.5} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{sansTiret(traduire(nomFr(e.nom)))}</Ink>
                    <Ink size={20} weight="black" color={c.accentText}>+</Ink>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      {!suggestions.length && atteints < couverture.length ? (
        <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Rien n’est forcé : les abdos et les muscles sans séance à venir cette semaine restent tels quels.')}</Ink>
      ) : null}
      <FeuillePourquoi explication={pourquoi ? POURQUOI_DEUX_FOIS : null} onClose={() => setPourquoi(false)} />
    </View>
  );
}

/** L'entrée vers « Tes prochaines séances » (page du programme) : une grande ligne avec son sticker */
export function EntreeProchaines({ onPress }: { onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const bleu = useTeinte('bleu');
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={traduire('Tes prochaines séances')}
      accessibilityHint={traduire('Tes 2 prochaines semaines, exercice par exercice')}
      style={({ pressed }) => [carte, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.9 : 1 }]}
    >
      <CarreSticker nom="calendrier" teinte="bleu" taille={52} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ink size={17} weight="black" tight>{traduire('Tes prochaines séances')}</Ink>
        <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire('Tes 2 prochaines semaines, exercice par exercice')}</Ink>
      </View>
      <Ink size={13.5} weight="extraBold" color={bleu.texte}>{traduire('Voir')}</Ink>
    </Pressable>
  );
}
