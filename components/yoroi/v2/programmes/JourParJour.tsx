/**
 * La page « Ton programme », jour par jour (1er novembre 2026). Houari : « La présentation n'est pas terrible. Si moi,
 * le créateur, j'ai du mal à comprendre... J'aimerais me projeter : je clique sur mardi, je vois tout ce que j'ai à
 * faire mardi ; je clique sur jeudi, pareil. Des fonctionnalités sont cachées en bas, il faut les mettre en avant. »
 *
 * Les morceaux de la page (app/programmes/[id].tsx), du haut vers le bas :
 *  - BandeJours : les 7 jours de la semaine, chaque jour avec sa séance (« Push » et sa lettre A ou B), sa couleur,
 *    le tampon validé quand elle est faite, aujourd'hui en évidence ; flèches pour la semaine suivante ou précédente ;
 *  - JourChoisi : le jour touché, en grand. Une séance : nom, date, durée, muscles en mini carte rouge, exercices
 *    avec vignette, séries, repos et charge proposée, abdos et cardio prévus, et les actions (Commencer, Séance
 *    express, Échanger avec un autre jour, Changer un exercice). Une séance faite : ce qui a vraiment été fait, avec
 *    son détail. Un repos : la prochaine séance et « La faire aujourd'hui » ;
 *  - ProgresProgramme : séances faites cette semaine et depuis le début, régularité, charges, poids, tour de taille ;
 *  - LigneReglageProgramme et FeuilleReglage : les réglages en lignes avec sticker et valeur à droite ;
 *  - TitrePartie : le titre de chaque partie.
 * Stickers seulement, couleurs franches (kitA), aucun caractère japonais. Les données arrivent toutes prêtes.
 */
import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { PisteInterrupteur } from '@/components/yoroi/Interrupteur';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { MusclesSemaine } from '@/components/yoroi/v2/seances/MusclesSemaine';
import { TamponValide } from '@/components/yoroi/v2/seances/TamponValide';
import { CarreSticker, Pastille, useCarteA, useTeinte } from '@/components/yoroi/v2/seances/kitA';
import type { TeinteA } from '@/components/yoroi/v2/seances/kitA';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { BadgeLettre, LigneExo } from '@/components/yoroi/v2/programmes/ProchainesSeances';
import type { ExoVu, VueJour } from '@/components/yoroi/v2/programmes/ProchainesSeances';
import { useFeuilleCentree } from '@/lib/v2/nav/useGrandEcran';
import type { Training } from '@/lib/database';
import { DATE_FNS_LOCALE } from '@/lib/i18n/dateLocale';
import { libelleRepos } from '@/lib/v2/programmes/catalogue';
import { DUREES_EXPRESS, dureeEstimee } from '@/lib/v2/programmes/express';
import { estExoCardio } from '@/lib/v2/programmes/briques';
import { musclesDesExercices } from '@/lib/v2/seances/musclesExercices';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { exercisesOf, workSetsOf } from '@/lib/v2/trainingWeek';
import { chargeTexte } from '@/lib/v2/unitePoids';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const le = (iso: string) => new Date(`${iso}T12:00:00`);
const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const ORDRE_TEINTES: TeinteA[] = ['bleu', 'peche', 'lilas', 'menthe', 'creme'];
/** « Pull B » sans sa lettre, quand le badge la montre à côté */
const sansLettre = (nom: string, lettre: 'A' | 'B' | null) => (lettre ? nom.replace(new RegExp(`\\s${lettre}(?=$|\\s*[:,])`), '') : nom);

/** Les cinq teintes franches, dans un ordre fixe (une par séance du programme) */
function useTeintes(): Record<TeinteA, { fond: string; texte: string }> {
  const bleu = useTeinte('bleu');
  const peche = useTeinte('peche');
  const lilas = useTeinte('lilas');
  const menthe = useTeinte('menthe');
  const creme = useTeinte('creme');
  return { bleu, peche, lilas, menthe, creme };
}

/** La teinte d'une séance : son rang parmi les séances du programme (sa version B garde celle de sa séance A) */
export function teinteDeSeance(rang: number): TeinteA {
  return ORDRE_TEINTES[((rang % ORDRE_TEINTES.length) + ORDRE_TEINTES.length) % ORDRE_TEINTES.length];
}

/** « Cette semaine », « Semaine prochaine », « Il y a 2 semaines » */
export function titreDecalage(k: number): string {
  if (k === 0) return traduire('Cette semaine');
  if (k === 1) return traduire('Semaine prochaine');
  if (k === -1) return traduire('Semaine dernière');
  return k > 0 ? traduire('Dans {0} semaines', k) : traduire('Il y a {0} semaines', -k);
}

/** Le titre d'une partie de la page, avec son sticker */
export function TitrePartie({ titre, sticker, teinte = 'bleu' }: { titre: string; sticker: NomSticker; teinte?: TeinteA }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <CarreSticker nom={sticker} teinte={teinte} taille={36} />
      <Ink size={20} weight="black" tight accessibilityRole="header" style={{ flex: 1 }}>{titre}</Ink>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * La bande des 7 jours
 * ---------------------------------------------------------------------------------------------- */
export function BandeJours({ vues, rangs, choisi, onChoisir, decalage, lettre, aujourdhui, peutAvant, peutApres, onAvant, onApres }: {
  vues: VueJour[];
  /** le rang de la séance de chaque jour (sa couleur), -1 : repos */
  rangs: number[];
  choisi: number;
  onChoisir: (k: number) => void;
  decalage: number;
  lettre: 'A' | 'B' | null;
  aujourdhui: string;
  peutAvant: boolean;
  peutApres: boolean;
  onAvant: () => void;
  onApres: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const illus = useIllustrations();
  const teintes = useTeintes();
  const menthe = useTeinte('menthe');
  const seances = vues.filter((v) => !!v.jp.jour);
  const faites = seances.filter((v) => v.jp.statut === 'faite').length;
  const debut = vues[0] ? format(le(vues[0].jp.date), 'd MMM', { locale: DATE_FNS_LOCALE }) : '';
  const fin = vues[6] ? format(le(vues[6].jp.date), 'd MMM', { locale: DATE_FNS_LOCALE }) : '';
  const fleche = (sens: 'avant' | 'apres', actif: boolean, onPress: () => void) => (
    <Pressable
      onPress={actif ? () => { tap(); onPress(); } : undefined}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityState={{ disabled: !actif }}
      accessibilityLabel={sens === 'avant' ? traduire('Semaine précédente') : traduire('Semaine suivante')}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: actif ? (pressed ? c.fillSubtle : c.fillSoft) : 'transparent', opacity: actif ? 1 : 0.3 })}
    >
      <Ink size={24} weight="black" color={c.ink} style={{ lineHeight: 26, marginTop: -2 }}>{sens === 'avant' ? '‹' : '›'}</Ink>
    </Pressable>
  );
  return (
    <View style={[carte, { padding: 12, gap: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {fleche('avant', peutAvant, onAvant)}
        <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ink size={17} weight="black" tight accessibilityRole="header">{titreDecalage(decalage)}</Ink>
            {lettre ? (
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: lettre === 'B' ? teintes.peche.fond : teintes.bleu.fond }}>
                <Ink size={12} weight="black" color={lettre === 'B' ? teintes.peche.texte : teintes.bleu.texte}>{traduire('Semaine {0}', lettre)}</Ink>
              </View>
            ) : null}
          </View>
          <Ink size={12} weight="bold" color={faites && faites === seances.length ? menthe.texte : c.textSecondary}>
            {`${traduire('{0} au {1}', debut, fin)} · ${traduire('{0} sur {1} faites', faites, seances.length)}`}
          </Ink>
        </View>
        {fleche('apres', peutApres, onApres)}
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {vues.map((v, k) => {
          const j = v.jp.jour;
          const on = k === choisi;
          const ici = v.jp.date === aujourdhui;
          const fait = v.jp.statut === 'faite';
          const rate = v.jp.statut === 'ratee';
          const t = j ? teintes[teinteDeSeance(rangs[k] ?? 0)] : null;
          const nomJour = traduire(NOMS[v.jp.d] ?? '');
          const court = j ? v.nom.split(/\s?:\s|,\s/)[0].replace(/\s[AB]$/, '').trim() : traduire('Repos');
          return (
            <Pressable
              key={v.jp.date}
              onPress={() => { tap(); onChoisir(k); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={[nomJour, format(le(v.jp.date), 'd MMMM', { locale: DATE_FNS_LOCALE }), j ? sansTiret(v.nom) : traduire('Repos'), fait ? traduire('Validé') : '', ici ? traduire('Aujourd’hui') : ''].filter(Boolean).join(', ')}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: 'center', gap: 5, opacity: pressed ? 0.85 : 1 })}
            >
              <View style={{ minWidth: 30, height: 30, paddingHorizontal: 4, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: ici ? c.ink : 'transparent' }}>
                <Ink size={10.5} weight="extraBold" color={ici ? c.background : c.textSecondary} style={{ lineHeight: 12 }}>{nomJour.charAt(0).toLocaleUpperCase()}</Ink>
                <Ink size={13} weight="black" color={ici ? c.background : c.ink} style={{ lineHeight: 15 }}>{format(le(v.jp.date), 'd')}</Ink>
              </View>
              <View
                style={{
                  alignSelf: 'stretch',
                  minHeight: 74,
                  borderRadius: 16,
                  paddingHorizontal: 2,
                  paddingVertical: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  backgroundColor: t ? t.fond : c.fillSoft,
                  borderWidth: on ? 3 : 0,
                  borderColor: c.ink,
                  opacity: rate && !on ? 0.55 : 1,
                  transform: [{ translateY: on ? -2 : 0 }],
                }}
              >
                {j ? (
                  <>
                    <Ink size={10.5} weight="black" color={t!.texte} numberOfLines={3} style={{ textAlign: 'center', lineHeight: 12.5 }}>{court}</Ink>
                    {v.lettre ? <BadgeLettre lettre={v.lettre} taille={20} /> : null}
                  </>
                ) : (
                  <>
                    <Image source={illus.img('sommeil')} style={{ width: 22, height: 22, opacity: 0.85 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                    <Ink size={9.5} weight="bold" color={c.textMuted} numberOfLines={1}>{court}</Ink>
                  </>
                )}
                {fait ? <TamponValide taille={24} delai={k * 50} style={{ position: 'absolute', top: -8, right: -6 }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Le jour choisi
 * ---------------------------------------------------------------------------------------------- */
type ActionsJour = {
  onCommencer?: () => void;
  onExpress?: (minutes: number) => void;
  /** les autres séances à venir de cette semaine, pour « Échanger avec un autre jour » */
  autres?: VueJour[];
  onEchanger?: (avec: VueJour) => void;
  onChanger?: (e: ExoVu) => void;
};

/** Une séance enregistrée, ce qui a vraiment été fait : chaque exercice, ses séries, sa meilleure série */
function CeQuiAEteFait({ t, unite }: { t: Training; unite: UnitePoids }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const menthe = useTeinte('menthe');
  const exos = exercisesOf(t)
    .map((e) => {
      const series = workSetsOf(e);
      const top = series.reduce<{ weight: number; reps: number } | null>((m, s) => (!m || s.weight > m.weight || (s.weight === m.weight && s.reps > m.reps) ? s : m), null);
      return { nom: String(e.name ?? ''), n: series.length, top };
    })
    .filter((x) => x.nom && x.n > 0);
  if (!exos.length) {
    return <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('{0} min de {1}', t.duration_minutes ?? t.duration ?? 0, traduire(t.sport))}</Ink>;
  }
  return (
    <View style={{ gap: 2 }}>
      {exos.map((x, k) => (
        <View key={`${x.nom}${k}`} style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: k ? 1 : 0, borderColor: c.divider }}>
          <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{sansTiret(traduire(nomFr(x.nom)))}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduirePluriel(x.n, x.n > 1, '{0} série', '{0} séries', x.n)}</Ink>
          {x.top && (x.top.weight > 0 || x.top.reps > 0) ? (
            <Ink size={13} weight="black" color={menthe.texte} style={{ minWidth: 76, textAlign: 'right' }}>
              {x.top.weight > 0 ? `${chargeTexte(x.top.weight, unite)} × ${x.top.reps}` : traduire('{0} répétitions', x.top.reps)}
            </Ink>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function JourChoisi({ v, unite, largeur, colonnes = 1, perso, training, prochaine, onDetail, onFaireProchaine, actions }: {
  v: VueJour;
  unite: UnitePoids;
  largeur: number;
  /** 2 : les exercices sur deux colonnes (grand écran) */
  colonnes?: 1 | 2;
  perso?: readonly MachinePerso[];
  /** la séance enregistrée d'un jour fait */
  training?: Training | null;
  /** un jour de repos : la prochaine séance */
  prochaine?: VueJour | null;
  onDetail?: (trainingId: number) => void;
  onFaireProchaine?: () => void;
  actions: ActionsJour;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const illus = useIllustrations();
  const teintes = useTeintes();
  const [changer, setChanger] = useState(false);
  const [echange, setEchange] = useState(false);
  const { jp } = v;
  const j = jp.jour;
  const quand = format(le(jp.date), 'EEEE d MMMM', { locale: DATE_FNS_LOCALE });
  const Quand = (
    <Ink size={12.5} weight="extraBold" color={c.textSecondary} style={{ letterSpacing: 0.6 }}>{quand.charAt(0).toLocaleUpperCase() + quand.slice(1)}</Ink>
  );
  const muscles = useMemo(() => {
    const ex = v.exos.filter((e) => !estExoCardio(e));
    if (!ex.length) return null;
    return musclesDesExercices(ex.map((e) => ({ name: e.nom, muscle_group: e.muscle, sets: e.series, reps: e.repsMin })), perso);
  }, [v.exos, perso]);

  // un jour de repos
  if (!j) {
    return (
      <View style={[carte, { padding: 18, gap: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <CarreSticker nom="sommeil" teinte="lilas" taille={64} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            {Quand}
            <Ink size={26} weight="black" tight accessibilityRole="header">{traduire('Repos')}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Tes muscles se reconstruisent aujourd’hui.')}</Ink>
          </View>
        </View>
        {prochaine && prochaine.jp.jour ? (
          <View style={{ borderRadius: 18, backgroundColor: c.fillSoft, padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Ink size={11.5} weight="extraBold" color={c.textSecondary}>{traduire('Prochaine séance, {0}', prochaine.quand)}</Ink>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={17} weight="black" numberOfLines={1} style={{ flexShrink: 1 }}>{sansTiret(sansLettre(prochaine.nom, prochaine.lettre))}</Ink>
                  {prochaine.lettre ? <BadgeLettre lettre={prochaine.lettre} taille={22} /> : null}
                </View>
                {prochaine.minutes > 0 ? <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('environ {0} min', prochaine.minutes)}</Ink> : null}
              </View>
            </View>
            {onFaireProchaine ? (
              <BoutonPrincipal label={traduire('La faire aujourd’hui')} compact hauteur={46} onPress={onFaireProchaine} icone={() => <Image source={illus.img('play')} style={{ width: 20, height: 20 }} />} />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  const fait = jp.statut === 'faite';
  const rate = jp.statut === 'ratee';
  const auj = jp.statut === 'aujourdhui';
  const t = fait ? teintes.menthe : v.lettre === 'B' ? teintes.peche : teintes.bleu;
  const exosMuscu = v.exos.filter((e) => !estExoCardio(e) && !(e as { fin?: true }).fin);
  const exosFin = v.exos.filter((e) => !estExoCardio(e) && !!(e as { fin?: true }).fin);
  const duree = dureeEstimee(v.exos.filter((e) => !estExoCardio(e)));
  const express = !fait && actions.onExpress && v.muscu ? DUREES_EXPRESS.filter((m) => m < duree) : [];
  // la carte : 18 points de marge et 3 points de bord de chaque côté
  const largeurColonne = colonnes === 2 ? Math.floor((largeur - 42 - 12) / 2) : largeur - 42;
  const ligne = (e: ExoVu, k: number) => (
    <View key={`${e.nom}${k}`} style={colonnes === 2 ? { width: largeurColonne } : undefined}>
      <LigneExo e={e} unite={unite} repos={e.reposSec ? libelleRepos(e.reposSec) : undefined} onChanger={changer && actions.onChanger && e.index !== undefined && !e.minutes ? () => actions.onChanger!(e) : undefined} />
    </View>
  );

  return (
    <View style={[carte, { padding: 18, gap: 14, borderWidth: auj ? 3 : 0, borderColor: teintes.bleu.texte }]}>
      {/* le nom, la date, la durée, et la mini carte des muscles */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          {Quand}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Ink size={26} weight="black" tight accessibilityRole="header" numberOfLines={2} style={{ flexShrink: 1 }}>{sansTiret(sansLettre(v.nom, v.lettre))}</Ink>
            {v.lettre ? <BadgeLettre lettre={v.lettre} taille={28} /> : null}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            {fait ? <Pastille texte={traduire('Validé')} fond={t.fond} couleur={t.texte} icone={<Image source={illus.img('objectif_semaine')} style={{ width: 15, height: 15 }} />} /> : null}
            {auj ? <Pastille texte={traduire('Aujourd’hui')} fond={teintes.bleu.fond} couleur={teintes.bleu.texte} /> : null}
            {rate ? <Pastille texte={traduire('Pas faite')} fond={c.fillSoft} couleur={c.textSecondary} /> : null}
            {v.minutes > 0 ? <Pastille texte={traduire('environ {0} min', v.minutes)} fond={c.fillSoft} couleur={c.ink} icone={<Image source={illus.img('chrono')} style={{ width: 15, height: 15 }} />} /> : null}
            {v.muscu ? <Pastille texte={traduirePluriel(exosMuscu.length, exosMuscu.length > 1, '{0} exercice', '{0} exercices', exosMuscu.length)} fond={c.fillSoft} couleur={c.ink} /> : null}
            {v.resume ? <Pastille texte={v.resume} fond={c.fillSoft} couleur={c.ink} /> : null}
          </View>
        </View>
        {muscles && !fait ? (
          <View style={{ width: 148 }} accessible accessibilityLabel={traduire('Muscles travaillés : {0}', muscles.loads.filter((m) => m.level > 0).map((m) => traduire(m.name)).join(', '))}>
            {/* deux silhouettes de 72 points (MusclesSemaine sans liste : 30 % de la largeur donnée chacune) */}
            <MusclesSemaine loads={muscles.loads} zones={muscles.zones} largeur={240} liste={false} />
          </View>
        ) : null}
        {fait ? <TamponValide taille={58} /> : null}
      </View>

      {/* un jour fait : ce qui a vraiment été fait */}
      {fait ? (
        <View style={{ gap: 10 }}>
          {jp.le ? <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire('Faite le {0}', format(le(jp.le), 'EEEE d MMMM', { locale: DATE_FNS_LOCALE }))}</Ink> : null}
          {training ? <CeQuiAEteFait t={training} unite={unite} /> : (
            <View style={{ gap: 4, opacity: 0.8 }}>{v.exos.map((e, k) => <LigneExo key={`${e.nom}${k}`} e={e} unite={unite} compact />)}</View>
          )}
          {training?.id !== undefined && onDetail ? (
            <Pressable onPress={() => { tap(); onDetail(training.id!); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, backgroundColor: t.fond, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}>
              <Image source={illus.img('carnet')} style={{ width: 22, height: 22 }} resizeMode="contain" />
              <Ink size={14.5} weight="black" color={t.texte}>{traduire('Voir le détail de la séance')}</Ink>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          {/* les exercices, dans l'ordre */}
          {v.exos.length ? (
            <View style={{ flexDirection: colonnes === 2 ? 'row' : 'column', flexWrap: 'wrap', gap: colonnes === 2 ? 12 : 6 }}>
              {exosMuscu.map(ligne)}
            </View>
          ) : null}

          {/* les abdos et le cardio réellement prévus ce jour-là */}
          {exosFin.length || v.cardio ? (
            <View style={{ borderRadius: 18, backgroundColor: teintes.creme.fond, padding: 12, gap: 8 }}>
              <Ink size={11} weight="extraBold" color={teintes.creme.texte} style={{ letterSpacing: 1.2 }}>{traduire('Puis, en fin de séance').toLocaleUpperCase()}</Ink>
              {exosFin.length ? (
                <View style={{ flexDirection: colonnes === 2 ? 'row' : 'column', flexWrap: 'wrap', gap: colonnes === 2 ? 12 : 6 }}>{exosFin.map(ligne)}</View>
              ) : null}
              {v.cardio ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <Image source={illus.img('cardio_zone2')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  <Ink size={14.5} weight="black" color={teintes.creme.texte} style={{ flex: 1 }}>{v.cardio}</Ink>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* les actions, bien visibles */}
          {actions.onCommencer ? (
            <BoutonPrincipal
              label={auj ? traduire('Commencer') : traduire('La faire aujourd’hui')}
              onPress={actions.onCommencer}
              accessibilityLabel={`${auj ? traduire('Commencer') : traduire('La faire aujourd’hui')}, ${sansTiret(v.nom)}`}
              icone={() => <Image source={illus.img('play')} style={{ width: 22, height: 22 }} />}
            />
          ) : null}
          {express.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Image source={illus.img('seance_rapide')} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Ink size={13.5} weight="extraBold" style={{ marginRight: 2 }}>{traduire('Séance express')}</Ink>
              {express.map((m) => (
                <Pressable key={m} onPress={() => { tap(); actions.onExpress!(m); }} accessibilityRole="button" accessibilityLabel={traduire('Séance express, {0} min', m)} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? teintes.peche.texte : teintes.peche.fond })}>
                  <Ink size={13.5} weight="black" color={teintes.peche.texte}>{traduire('{0} min', m)}</Ink>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: largeur >= 520 ? 'row' : 'column', gap: 8 }}>
            {actions.onEchanger && actions.autres?.length ? (
              <Pressable onPress={() => { tap(); setEchange((x) => !x); }} accessibilityRole="button" accessibilityState={{ expanded: echange }} style={({ pressed }) => ({ flex: largeur >= 520 ? 1 : undefined, minHeight: 52, borderRadius: 16, backgroundColor: echange ? teintes.lilas.fond : c.fillSoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 })}>
                <Image source={illus.img('fleches_haut_bas')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <Ink size={13.5} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{traduire('Échanger avec un autre jour')}</Ink>
              </Pressable>
            ) : null}
            {actions.onChanger && v.muscu ? (
              <Pressable onPress={() => { tap(); setChanger((x) => !x); }} accessibilityRole="button" accessibilityState={{ expanded: changer }} style={({ pressed }) => ({ flex: largeur >= 520 ? 1 : undefined, minHeight: 52, borderRadius: 16, backgroundColor: changer ? teintes.lilas.fond : c.fillSoft, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 })}>
                <Image source={illus.img('reglage_machine')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <Ink size={13.5} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{changer ? traduire('Touche « Changer » sur un exercice') : traduire('Changer un exercice')}</Ink>
              </Pressable>
            ) : null}
          </View>
          {echange && actions.autres?.length ? (
            <View style={{ gap: 6 }}>
              <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Pour cette semaine seulement. Ta semaine habituelle ne change pas.')}</Ink>
              {actions.autres.map((o) => (
                <Pressable key={o.jp.date} onPress={() => { tap(); setEchange(false); actions.onEchanger!(o); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, borderWidth: 2, borderColor: c.divider, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.8 : 1 })}>
                  <Ink size={12.5} weight="extraBold" color={c.textSecondary} style={{ width: 96 }}>{o.quand}</Ink>
                  <Ink size={14} weight="black" style={{ flex: 1 }} numberOfLines={1}>{sansTiret(sansLettre(o.nom, o.lettre))}</Ink>
                  {o.lettre ? <BadgeLettre lettre={o.lettre} taille={22} /> : null}
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Tes progrès du programme
 * ---------------------------------------------------------------------------------------------- */
export type LigneProgres = { cle: string; titre: string; detail: string; valeur: string; bon?: boolean };

export function ProgresProgramme({ faites, prevues, depuisDebut, regularite, lignes, mesurer, onMesurer }: {
  faites: number;
  prevues: number;
  depuisDebut: number;
  /** % des semaines terminées, null : pas encore de semaine terminée */
  regularite: number | null;
  /** charges, poids, tour de taille : déjà mis en texte */
  lignes: LigneProgres[];
  /** pas encore de tour de taille : le rappel */
  mesurer: boolean;
  onMesurer: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const teintes = useTeintes();
  const [tout, setTout] = useState(false);
  const tuile = (cle: string, valeur: string, sur: string | null, label: string, teinte: TeinteA) => (
    <View key={cle} style={{ flex: 1, minWidth: 0, borderRadius: 18, backgroundColor: teintes[teinte].fond, paddingVertical: 12, paddingHorizontal: 10, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Ink size={26} weight="black" color={teintes[teinte].texte} tight>{valeur}</Ink>
        {sur ? <Ink size={14} weight="black" color={teintes[teinte].texte}>{`/${sur}`}</Ink> : null}
      </View>
      <Ink size={11.5} weight="extraBold" color={teintes[teinte].texte} numberOfLines={2}>{label}</Ink>
    </View>
  );
  const visibles = tout ? lignes : lignes.slice(0, 3);
  return (
    <View style={[carte, { padding: 16, gap: 12 }]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tuile('semaine', String(faites), String(prevues), traduire('cette semaine'), faites >= prevues && prevues > 0 ? 'menthe' : 'bleu')}
        {tuile('debut', String(depuisDebut), null, traduire('depuis le début'), 'lilas')}
        {regularite !== null ? tuile('regularite', `${regularite} %`, null, traduire('Régularité'), 'peche') : null}
      </View>
      {visibles.map((x, k) => (
        <View key={x.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: k ? 10 : 2, borderTopWidth: k ? 1 : 0, borderColor: c.divider }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Ink size={14} weight="extraBold" numberOfLines={1}>{x.titre}</Ink>
            <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{x.detail}</Ink>
          </View>
          <Ink size={16} weight="black" color={x.bon ? teintes.menthe.texte : c.textSecondary}>{x.valeur}</Ink>
        </View>
      ))}
      {lignes.length > 3 ? (
        <Pressable onPress={() => { tap(); setTout((x) => !x); }} accessibilityRole="button" accessibilityState={{ expanded: tout }} style={{ minHeight: 40, justifyContent: 'center' }}>
          <Ink size={13} weight="extraBold" color={c.accentText}>{tout ? traduire('Voir moins') : traduire('Voir tout ({0})', lignes.length)}</Ink>
        </Pressable>
      ) : null}
      {!lignes.length ? <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire('Tes charges apparaîtront ici après deux séances sur un même exercice.')}</Ink> : null}
      {mesurer ? (
        <Pressable onPress={() => { tap(); onMesurer(); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, backgroundColor: teintes.creme.fond, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, opacity: pressed ? 0.85 : 1 })}>
          <CarreSticker nom="metre_ruban" teinte="creme" taille={34} />
          <Ink size={13} weight="extraBold" color={teintes.creme.texte} style={{ flex: 1 }}>{traduire('Mesure ton tour de taille chaque semaine : c’est là que le résultat se voit en premier.')}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Les réglages du programme : une ligne, un sticker, la valeur à droite
 * ---------------------------------------------------------------------------------------------- */
export type ReglageLigne = {
  cle: string;
  sticker: NomSticker;
  teinte: TeinteA;
  titre: string;
  /** la valeur à droite (« 8 semaines ») */
  valeur?: string;
  /** une valeur longue, sous le titre (« Abdos à chaque séance. 30 min de marche inclinée ») */
  sous?: string;
  /** un interrupteur à droite à la place de la valeur */
  interrupteur?: boolean;
  occupe?: boolean;
  onPress: () => void;
};

export function ReglagesProgramme({ lignes, children }: { lignes: ReglageLigne[]; children?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  return (
    <View style={[carte, { paddingVertical: 4, paddingHorizontal: 12 }]}>
      {lignes.map((l, k) => (
        <Pressable
          key={l.cle}
          onPress={() => { tap(); l.onPress(); }}
          disabled={l.occupe}
          accessibilityRole={l.interrupteur !== undefined ? 'switch' : 'button'}
          accessibilityState={l.interrupteur !== undefined ? { checked: l.interrupteur, disabled: !!l.occupe } : { disabled: !!l.occupe }}
          accessibilityLabel={[l.titre, l.valeur, l.sous].filter(Boolean).join(', ')}
          style={({ pressed }) => ({ minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderColor: c.divider, opacity: pressed || l.occupe ? 0.7 : 1 })}
        >
          <CarreSticker nom={l.sticker} teinte={l.teinte} taille={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Ink size={15} weight="extraBold" numberOfLines={2}>{l.titre}</Ink>
            {l.sous ? <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={3}>{l.sous}</Ink> : null}
          </View>
          {l.interrupteur !== undefined ? (
            <PisteInterrupteur on={l.interrupteur} largeur={50} hauteur={30} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '46%' }}>
              {l.valeur ? <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ textAlign: 'right', flexShrink: 1 }}>{l.valeur}</Ink> : null}
              <Ink size={20} weight="black" color={c.textMuted}>›</Ink>
            </View>
          )}
        </Pressable>
      ))}
      {children}
    </View>
  );
}

/** Une feuille qui monte du bas (fenêtre centrée en grand écran) pour un réglage */
export function FeuilleReglage({ visible, titre, onClose, children }: { visible: boolean; titre: string; onClose: () => void; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const centree = useFeuilleCentree(640);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType={centree ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[{ flex: 1, backgroundColor: 'rgba(16,18,30,0.45)', justifyContent: 'flex-end' }, centree?.fond]}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} />
        <View style={[{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '92%', paddingBottom: insets.bottom + 12 }, centree?.carte]}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.divider }} />
            <Ink size={20} weight="black" tight accessibilityRole="header">{titre}</Ink>
            {children}
            <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Fermer')}</Ink>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Le lien vers « Tes prochaines séances » */
export function LienDeuxSemaines({ onPress }: { onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.6 : 1 })}>
      <Image source={illus.img('calendrier')} style={{ width: 22, height: 22 }} resizeMode="contain" />
      <Ink size={13.5} weight="extraBold" color={c.accentText}>{traduire('Voir les 2 prochaines semaines')}</Ink>
    </Pressable>
  );
}
