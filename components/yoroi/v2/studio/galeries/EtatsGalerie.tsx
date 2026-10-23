/**
 * Studio, galerie des etats : les etats vides principaux (accueil sans pesee ni seance, progres vide,
 * carnet vide, competitions vide, Dojo debutant), les trois chargements, et un ecran d'erreur simule
 * dans son propre cadre (l'app ne plante pas). Les vrais morceaux d'ecran sont montres avec des donnees
 * fictives vides : rien n'est lu pour etre modifie, rien n'est ecrit. Les apercus sont figes : un toucher n'ouvre rien.
 */
import React, { useMemo, useRef, useState } from 'react';
import { CHART_COLORS } from '@/components/yoroi/v2/charts/core';
import { Image, ImageBackground, Modal, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EcranChargement, ChargementBloc, ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { SceneHero } from '@/components/yoroi/v2/accueil/Scene';
import { ActivityCard, Section, SessionToday, WeekCard } from '@/components/yoroi/v2/accueil/Sections';
import { ConseilDuJour } from '@/components/yoroi/v2/accueil/Conseil';
import { BlocCompetition, BlocRecords } from '@/components/yoroi/v2/accueil/Blocs';
import { nextTarget } from '@/components/yoroi/v2/accueil/Today';
import { ExamplePreview } from '@/components/yoroi/v2/progres/ExamplePreview';
import { WeightTrendChart } from '@/components/yoroi/v2/progres/WeightTrendChart';
import { LegendMark } from '@/components/yoroi/v2/progres/ui';
import { SAMPLE_GOAL, sampleWeightSeries } from '@/lib/v2/progres/samples';
import { formatKg, weeklyRate } from '@/lib/v2/weightStats';
import { CarnetEmpty } from '@/components/yoroi/v2/carnet/nav';
import { BigButton } from '@/components/yoroi/v2/seances/ui';
import { RankFrame, CheckBox, LockIcon, formatXp } from '@/components/yoroi/v2/dojo/parts';
import { BreathingFigure, GlassTag, ScenePlate } from '@/components/yoroi/v2/dojo/DojoHero';
import { Kozane } from '@/components/yoroi/v2/dojo/Kozane';
import { RANKS, XP_VALUES } from '@/lib/v2/armure';
import { THEME_IMAGES, guerrierImage } from '@/lib/v2/dojo/personnages';
import { NOM } from './fictif';
import { Bloc, Bouton, G, GalerieScreen, Pastille, PastilleRow } from './kit';
import { P, blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type EtatId = 'accueil' | 'progres' | 'carnet' | 'competitions' | 'dojo' | 'chargements' | 'erreur';

const ETATS: { id: EtatId; label: string }[] = [
  { id: 'accueil', label: traduire('Accueil vide') },
  { id: 'progres', label: traduire('Progrès vide') },
  { id: 'carnet', label: 'Carnet vide' },
  { id: 'competitions', label: traduire('Compétitions vide') },
  { id: 'dojo', label: traduire('Dojo débutant') },
  { id: 'chargements', label: 'Chargements' },
  { id: 'erreur', label: traduire('Erreur') },
];

const NB = ' ';
const SCENE_COMPETITIONS = require('@/assets/avatars/app/monde/scenes/bataille.webp');

/** Apercu fige : on regarde, on ne touche pas */
function Fige({ children, bleed }: { children: React.ReactNode; bleed?: boolean }) {
  return (
    <View pointerEvents="none" style={bleed ? { marginHorizontal: -G } : undefined}>
      {children}
    </View>
  );
}

function Legende({ text }: { text: string }) {
  const { theme } = useYoroiTheme();
  return (
    <Ink size={12} weight="bold" color={theme.colors.textMuted} style={{ paddingHorizontal: 4 }}>
      {text}
    </Ink>
  );
}

function AccueilVide() {
  const target = useMemo(() => nextTarget(null, [], 'musculation'), []);
  return (
    <View style={{ gap: 12 }}>
      <Legende text={traduire("Premier jour : aucune pesée, aucune séance, pas de montre reliée, pas d’objectif choisi.")} />
      <Fige bleed>
        <SceneHero top={0} scene="chateau" name={NOM} personnage="guerrier_f" rankIndex={0} photo={null} series={[]} targetWeight={null} />
      </Fige>
      <Fige>
        <View style={{ gap: 12 }}>
          <Section title={traduire("Aujourd’hui")} />
          <SessionToday trainings={[]} target={target} femme />
          <ActivityCard a={{ connected: false, steps: null, move: null, exercise: null, moveGoal: 500, exerciseGoal: 30 }} />
          <Section title={traduire("Ta semaine")} />
          <WeekCard trainings={[]} goal={0} />
          <Section title={traduire("Ton suivi")} />
          <ConseilDuJour trainings={[]} lastWeighIso={null} goal={0} />
          <BlocRecords record={null} />
          <BlocCompetition competition={null} />
        </View>
      </Fige>
    </View>
  );
}

function rateText(rate: number | null): string {
  if (rate === null) return traduire('Bientôt');
  const grams = Math.round((Math.abs(rate) * 1000) / 10) * 10;
  return grams >= 1000 ? `${formatKg(grams / 1000)} kg` : `${grams} g`;
}

function Chiffre({ value, label, border }: { value: string; label: string; border?: boolean }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flex: 1, gap: 4, paddingLeft: border ? 10 : 0, paddingRight: 6, borderLeftWidth: border ? 1.5 : 0, borderColor: theme.colors.border }}>
      <Ink size={20} weight="black" tight numberOfLines={1}>{value}</Ink>
      <Ink size={12} color={theme.colors.textSecondary}>{label}</Ink>
    </View>
  );
}

function ProgresVide() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sample = useMemo(() => sampleWeightSeries(), []);
  const rate = weeklyRate(sample);
  const last = sample[sample.length - 1];
  return (
    <View style={{ gap: 12 }}>
      <Legende text={traduire("Onglet Progrès sans aucune pesée : la courbe d’exemple en filigrane.")} />
      <Fige bleed>
        <ExamplePreview
          bleed
          dim={0.4}
          title={traduire("Ta courbe se dessine dès la troisième pesée")}
          text={traduire("Pèse-toi le matin, à jeun, quelques fois par semaine. YOROI lisse les variations et te montre la vraie tendance.")}
          plusHint={traduire("Touche + pour ta première pesée")}
        >
          <WeightTrendChart points={sample} goal={SAMPLE_GOAL} height={230} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, marginTop: 8, flexWrap: 'wrap' }}>
            <LegendMark kind="line" color={CHART_COLORS.blue} label="tendance" />
            <LegendMark kind="dot" color={c.textMuted} label={traduire("pesées")} />
            <LegendMark kind="dash" color={c.successText} label="objectif" />
          </View>
          <View style={{ flexDirection: 'row', marginHorizontal: 22, marginTop: 14, paddingVertical: 12, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: c.border }}>
            <Chiffre value={formatKg(last.value)} label={traduire("dernière pesée")} />
            <Chiffre value={formatKg(last.trend)} label={traduire("tendance lissée")} border />
            <Chiffre value={rateText(rate)} label={traduire("en moins par semaine")} border />
          </View>
        </ExamplePreview>
      </Fige>
    </View>
  );
}

function CarnetVide() {
  return (
    <View style={{ gap: 12 }}>
      <Legende text={traduire("Carnet, onglet Records, sans aucune perf notée.")} />
      <Fige>
        <CarnetEmpty
          illus="records"
          title={traduire("Ton premier record t’attend")}
          text={traduire("Squat, 10 km, tractions : note une perf. YOROI garde ton meilleur et pose un tampon rouge chaque fois que tu le bats.")}
          action={traduire("Noter mon premier record")}
          onAction={() => undefined}
        />
      </Fige>
      <Legende text={traduire("Carnet, onglet Techniques, sans aucune technique.")} />
      <Fige>
        <CarnetEmpty
          illus="techniques"
          title={traduire("Note ce que tu apprends")}
          text={traduire("Une garde, un passage, un enchaînement : ajoute-la, compte tes répétitions, et marque-la maîtrisée le jour où elle sort toute seule.")}
          action={traduire("Ajouter ma première technique")}
          onAction={() => undefined}
        />
      </Fige>
    </View>
  );
}

function CompetitionsVide() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 12 }}>
      <Legende text={traduire("Compétitions sans aucune échéance prévue.")} />
      <Fige bleed>
        <ImageBackground source={SCENE_COMPETITIONS} resizeMode="cover" style={{ height: 228, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 16, bottom: 14, maxWidth: '60%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: blancA(0.86), borderWidth: 1, borderColor: P.white }}>
            <Ink size={28} weight="black" tight numberOfLines={1}>{traduire("Compétitions")}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Tes rendez-vous sur le tapis")}</Ink>
          </View>
        </ImageBackground>
      </Fige>
      <Fige>
        <View style={{ gap: 12 }}>
          <View style={{ borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: c.divider, padding: 18, gap: 6 }}>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Aucune compétition prévue")}</Ink>
            <Ink size={22} weight="black" tight>{traduire("Prépare ta prochaine échéance")}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire("Ajoute-la en quelques secondes : compte à rebours, rappels et suivi de ta catégorie de poids.")}</Ink>
          </View>
          <BigButton label={traduire("Ajouter une compétition")} icon="plus" onPress={() => undefined} />
        </View>
      </Fige>
    </View>
  );
}

function DojoDebutant() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - G * 2;
  const heroH = Math.round(Math.min(450, Math.max(380, W * 1.2)));
  const figH = heroH - 112;
  const figW = Math.round((figH * 3) / 4);
  const rank = RANKS[0];
  const next = RANKS[1];
  return (
    <View style={{ gap: 12 }}>
      <Legende text={traduire("Dojo au premier jour : rang {0}, 0 XP, aucune plaque.", rank.name)} />
      <Fige>
        <View style={{ gap: 12 }}>
          <RankFrame rankIndex={0} dan={0}>
            <ScenePlate scene={THEME_IMAGES.dojo} height={heroH}>
              <View style={{ position: 'absolute', left: 14, right: 14, top: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <GlassTag style={{ flexShrink: 1, maxWidth: '86%' }}>
                  <Ink size={12} weight="extraBold" color={c.goldDeep}>{traduire("Rang 1 sur {0}", RANKS.length)}</Ink>
                  <Ink size={30} weight="black" tight numberOfLines={1}>{rank.name}</Ink>
                  <Ink size={12} color={c.textSecondary} numberOfLines={2}>{rank.piece ?? ''}</Ink>
                </GlassTag>
              </View>
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
                <BreathingFigure source={guerrierImage('f', 0)} width={figW} height={figH} />
              </View>
            </ScenePlate>
          </RankFrame>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Ink size={12} weight="extraBold" color={c.textMuted}>{traduire("Tes plaques d’armure")}</Ink>
                <Ink size={19} weight="black" tight numberOfLines={2}>{`Vers ${next.name}`}</Ink>
                <Ink size={13} color={c.textSecondary} numberOfLines={3}>
                  {traduire("Une plaque à chaque tiers du chemin. Au bout : {0}{1}", next.piece?.charAt(0).toLowerCase(), next.piece?.slice(1) ?? '')}
                </Ink>
              </View>
              <View style={{ width: 58, height: 74, borderRadius: 14, backgroundColor: c.fillSoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Image source={guerrierImage('f', 1)} style={{ width: 58, height: 72, opacity: 0.4 }} resizeMode="contain" />
                <View style={{ position: 'absolute', top: 6, right: 6 }}>
                  <LockIcon size={14} color={c.textSecondary} />
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Kozane nombre={3} rempli={0} taille={58} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Ink size={15} weight="black" style={{ flex: 1 }} numberOfLines={1}>{`${formatXp(0)} / ${formatXp(next.minXp)}${NB}XP`}</Ink>
              <Ink size={13} weight="extraBold" color={c.accent} numberOfLines={1}>{traduire("encore {0}{1}XP", formatXp(next.minXp), NB)}</Ink>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
            <CheckBox checked={false} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="extraBold">{traduire("Ton geste du jour")}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire("Une séance, une pesée ou de l’eau notée aujourd’hui.")}</Ink>
            </View>
            <Ink size={14} weight="black" color={c.accent}>{`+${XP_VALUES.geste}${NB}XP`}</Ink>
          </View>
        </View>
      </Fige>
    </View>
  );
}

function Chargements() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [plein, setPlein] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Bloc>
        <Ink size={16} weight="black">{traduire("Écran de chargement")}</Ink>
        <Ink size={13} color={c.textSecondary}>{traduire("EcranChargement, plein écran, au lancement de l’app. L’intro ne se rejoue qu’au premier affichage.")}</Ink>
        <Bouton label={traduire("Afficher en plein écran")} icon="eye" onPress={() => setPlein(true)} />
      </Bloc>
      <Bloc style={{ alignItems: 'center' }}>
        <Ink size={16} weight="black" style={{ alignSelf: 'stretch' }}>Petit indicateur</Ink>
        <Ink size={13} color={c.textSecondary} style={{ alignSelf: 'stretch' }}>{traduire("ChargementPetit, à la place de la roue du système.")}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 10 }}>
          <ChargementPetit size={20} />
          <ChargementPetit />
          <ChargementPetit size={44} />
          <View style={{ padding: 10, borderRadius: 14, backgroundColor: c.accent }}>
            <ChargementPetit size={24} color="#FFFFFF" />
          </View>
        </View>
      </Bloc>
      <Bloc>
        <Ink size={16} weight="black">Zone d’attente</Ink>
        <Ink size={13} color={c.textSecondary}>{traduire("ChargementBloc, au milieu d’une page qui se remplit.")}</Ink>
        <ChargementBloc message={traduire("Lecture de tes séances")} />
      </Bloc>
      <Modal visible={plein} animationType="fade" onRequestClose={() => setPlein(false)} statusBarTranslucent>
        <View style={{ flex: 1 }}>
          <EcranChargement message={traduire("Préparation de ton espace")} />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
            <RoundButton icon="close" label={traduire("Fermer l’écran de chargement")} onPress={() => setPlein(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Un morceau d'ecran qui plante au premier rendu, puis se repare : l'erreur reste dans son cadre */
function Bombe({ arme, onFerme }: { arme: React.MutableRefObject<boolean>; onFerme: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (arme.current) {
    arme.current = false;
    throw new Error('Erreur simulée par le Studio (aucune donnée touchée)');
  }
  return (
    <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.successTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={34} color={c.successText} />
      </View>
      <Ink size={22} weight="black" style={{ textAlign: 'center' }}>{traduire("L’écran est revenu")}</Ink>
      <Ink size={14} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire("Réessayer a bien remonté l’écran. L’app n’a pas planté.")}</Ink>
      <View style={{ alignSelf: 'stretch' }}>
        <Bouton label={traduire("Fermer")} onPress={onFerme} />
      </View>
    </View>
  );
}

function Erreur() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  const [cle, setCle] = useState(0);
  const arme = useRef(false);
  return (
    <View style={{ gap: 12 }}>
      <Bloc>
        <Ink size={16} weight="black">{traduire("Écran d’erreur")}</Ink>
        <Ink size={13} color={c.textSecondary}>
          {traduire("Un morceau d’écran plante volontairement dans son propre cadre. Tu vois l’écran d’erreur de l’app, puis Réessayer le remonte. Le bouton Retour à l’accueil ramène vraiment à l’accueil.")}</Ink>
        <Bouton
          label={traduire("Simuler une erreur")}
          icon="info"
          onPress={() => {
            arme.current = true;
            setCle((k) => k + 1);
            setOuvert(true);
          }}
        />
      </Bloc>
      <Modal visible={ouvert} animationType="fade" onRequestClose={() => setOuvert(false)} statusBarTranslucent>
        <ErrorBoundary key={cle}>
          <Bombe arme={arme} onFerme={() => setOuvert(false)} />
        </ErrorBoundary>
      </Modal>
    </View>
  );
}

export function EtatsGalerie() {
  const [etat, setEtat] = useState<EtatId>('accueil');
  return (
    <GalerieScreen title={traduire("États")} sub={traduire("Les écrans vides, les chargements et l’erreur, avec des données fictives. Rien n’est écrit, les aperçus sont figés.")}>
      <PastilleRow>
        {ETATS.map((e) => (
          <Pastille key={e.id} label={e.label} on={etat === e.id} onPress={() => setEtat(e.id)} />
        ))}
      </PastilleRow>
      <View key={etat}>
        {etat === 'accueil' ? <AccueilVide /> : null}
        {etat === 'progres' ? <ProgresVide /> : null}
        {etat === 'carnet' ? <CarnetVide /> : null}
        {etat === 'competitions' ? <CompetitionsVide /> : null}
        {etat === 'dojo' ? <DojoDebutant /> : null}
        {etat === 'chargements' ? <Chargements /> : null}
        {etat === 'erreur' ? <Erreur /> : null}
      </View>
    </GalerieScreen>
  );
}

export default EtatsGalerie;
