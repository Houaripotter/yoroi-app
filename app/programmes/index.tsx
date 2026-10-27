/**
 * Programmes (24 octobre 2026) : des seances de musculation pretes a suivre, basees sur des etudes.
 * 1. ton programme en cours : la semaine, la prochaine seance, un bouton pour la commencer ;
 * 2. « Trouver mon programme » : quatre questions, un conseil, sans calcul cache (lib/v2/programmes/choix.ts) ;
 * 3. tous les programmes, avec niveau, jours par semaine et duree.
 * La seance s'ouvre dans la saisie muscu habituelle, exercices et charges deja remplis (lib/v2/programmes/progression.ts).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, Glass, SectionTitle, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { BlocReglages, HeroJour, LigneReglage, Pastille, TuilesStats, famillePastel, musclesDuJour, nomCourt, tuileCharge, usePaletteProgramme, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { stickerDuGuide } from '@/components/yoroi/v2/programmes/stickersGuides';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { P, blancA } from '@/components/yoroi/livePalette';
import { getProfile, getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { gainMoyen, progresDesCharges } from '@/lib/v2/programmes/progres';
import { jourPourToi } from '@/lib/v2/programmes/perso';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { PROGRAMMES, programmeParId, libelleNiveau, libelleMateriel, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { GUIDES } from '@/lib/v2/programmes/conseils';
import { resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { EQUIPEMENTS, TOUT_LE_MATERIEL, remplacesParLaSalle } from '@/lib/v2/programmes/materiel';
import { MaSalle } from '@/components/yoroi/v2/programmes/MaSalle';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { MessageDuJour } from '@/components/yoroi/v2/programmes/MessageDuJour';
import { CarteMuscles } from '@/components/yoroi/v2/programmes/CarteMuscles';
import { PlanningProgramme } from '@/components/yoroi/v2/programmes/PlanningProgramme';
import { PROGRAMME_CHANGED_EVENT, basculerFavori, chargerFavoris, chargerMachines, chargerMateriel, enregistrerMateriel, materielDuLieu, activerSemaineLegere, arreterSemaineLegere, chargerProgrammeActif, estSemaineLegere, faitsCetteSemaine, joursDuProgramme, prochainJour, proposerSemaineLegere, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { Questionnaire } from '@/components/yoroi/v2/programmes/Questionnaire';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function ProgrammesScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  // 26 octobre 2026 : ouvert depuis le Coach (app/coach.tsx) avec ?quiz=1, le questionnaire s'ouvre tout de suite
  const { quiz } = useLocalSearchParams<{ quiz?: string }>();
  useEffect(() => {
    if (quiz === '1') setQuizOpen(true);
  }, [quiz]);
  const [materiel, setMateriel] = useState<Equipement[] | null>(null);
  const [materielOpen, setMaterielOpen] = useState(false);
  // 26 octobre 2026 : Ma salle, les machines precises cochees (null : pas de detail)
  const [machines, setMachines] = useState<string[] | null>(null);
  // 26 octobre 2026 : tes programmes favoris (étoile), en tête de page
  const [favoris, setFavoris] = useState<string[]>([]);
  // 26 octobre 2026, maquette D aux couleurs de E : tes séances, pour la tuile « Charge »
  const [trainings, setTrainings] = useState<Training[]>([]);
  const pal = usePaletteProgramme();
  const pa = usePastel();
  const illus = useIllustrations();

  useEffect(() => {
    const charger = () => {
      chargerProgrammeActif().then(setActif).catch(() => setActif(null));
      chargerMateriel().then(setMateriel).catch(() => setMateriel(null));
      chargerMachines().then(setMachines).catch(() => setMachines(null));
      chargerFavoris().then(setFavoris).catch(() => setFavoris([]));
    };
    charger();
    getProfile().then((p) => setFemme(p?.avatar_gender === 'femme')).catch(() => {});
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
    const lireSeances = () => getTrainings().then((t) => setTrainings(t ?? [])).catch(() => {});
    lireSeances();
    const subSeances = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, lireSeances);
    return () => {
      sub.remove();
      subSeances.remove();
    };
  }, []);

  const suite = actif ? prochainJour(actif) : null;
  // combien d'exercices de ce programme ta salle remplace (0 : rien de renseigne ou tout est faisable)
  const remplaces = (p: Programme) => remplacesParLaSalle(p.jours, materiel, machines);
  const programmesFavoris = favoris.map((id) => programmeParId(id)).filter((x): x is Programme => !!x);
  const etoile = (id: string) => {
    setFavoris((l) => (l.includes(id) ? l.filter((x) => x !== id) : [id, ...l]));
    void basculerFavori(id);
  };
  const ouvrirProgramme = (id: string) => router.push({ pathname: '/programmes/[id]' as any, params: { id } });

  const commencer = () => {
    if (!suite) return;
    tap();
    const r = routeDuJour(suite.programme, suite.jour, actif ? semaineDuProgramme(actif) : 1);
    router.push({ pathname: r.pathname as any, params: r.params });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire('Programmes')} sousTitre={traduire('des séances prêtes à suivre, basées sur des études')} repli="/(tabs)/seances" fond={c.background} style={{ marginHorizontal: -16, marginTop: -8 }} />

        {programmesFavoris.length ? (
          <>
            <SectionTitle title={traduire('Tes favoris')} />
            {programmesFavoris.map((p) => (
              <CarteProgramme key={`fav-${p.id}`} p={p} femme={femme} enCours={actif?.id === p.id} favori onFavori={() => etoile(p.id)} remplaces={remplaces(p)} onPress={() => ouvrirProgramme(p.id)} />
            ))}
          </>
        ) : null}

        {/* 24 octobre 2026 : perdu a la salle ? tu touches tes zones, YOROI fait ta seance (app/programmes/zones.tsx) */}
        <Pressable onPress={() => { tap(); router.push('/programmes/zones' as any); }} accessibilityRole="button" style={({ pressed }) => ({ borderRadius: 24, paddingVertical: 16, paddingLeft: 18, paddingRight: 12, gap: 6, backgroundColor: pa.menthe.fond, opacity: pressed ? 0.88 : 1, flexDirection: 'row', alignItems: 'center' })}>
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={12} weight="black" color={pa.menthe.titre} style={{ letterSpacing: 0.6 }}>{traduire('PERDU À LA SALLE ?')}</Ink>
            <Ink size={20} weight="black" tight>{traduire('Je choisis mes zones')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Touche les fessiers, les abdos, les bras sur le corps : YOROI te dit quoi faire, combien, et quand tu verras des résultats.')}</Ink>
          </View>
          <CorpsMini />
        </Pressable>

        {/* 26 octobre 2026 : ton programme en cours, maquette D aux couleurs de E (Habillage.tsx) */}
        {actif && suite ? (() => {
          const p = suite.programme;
          const j = jourPourToi(suite.jour, materiel, [], machines, actif.remplacements);
          const titre = traduire(j.titre);
          const jours = joursDuProgramme(actif, p);
          const faits = faitsCetteSemaine(actif);
          return (
            <>
              <HeroJour
                pastille={traduire('Ton programme, semaine {0}', semaineDuProgramme(actif))}
                nom={nomCourt(titre)}
                muscles={musclesDuJour(titre, j.exos)}
                infos={
                  j.exos.length && !j.rounds && !j.cardio
                    ? `${traduirePluriel(j.exos.length, j.exos.length > 1, '{0} exercice', '{0} exercices', j.exos.length)} · ${traduire('{0} min', p.dureeMin)}`
                    : resumeDuJour(j, semaineDuProgramme(actif))
                }
                texte={remplaces(p) > 0 ? texteSalle(remplaces(p)) : undefined}
                image={sportImage(sportDuProgramme(p), femme, 1)}
                bouton={{ label: traduire('Commencer'), onPress: commencer, accessibilityLabel: `${traduire('Commencer')}, ${titre}` }}
              >
                <Pressable
                  onPress={() => { tap(); ouvrirProgramme(p.id); }}
                  accessibilityRole="link"
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
                >
                  <Ink size={14} weight="extraBold" color={P.etiquettePrune}>{traduire('Voir le programme')}</Ink>
                  <Icon name="chevron" size={15} color={P.etiquettePrune} />
                </Pressable>
              </HeroJour>
              <TuilesStats
                tuiles={[
                  { label: traduire('Semaine'), valeur: String(semaineDuProgramme(actif)), sur: String(p.semaines) },
                  { label: traduire('Séances'), valeur: String(faits), sur: String(jours.length), accessibilityLabel: traduire('{0} séances sur {1} cette semaine', faits, jours.length) },
                  tuileCharge(gainMoyen(progresDesCharges(p, trainings, actif.debut)), pal, () => ouvrirProgramme(p.id)),
                ]}
              />
            </>
          );
        })() : null}

        {actif && suite && estSemaineLegere(actif) ? (
          <Glass style={{ gap: 8, backgroundColor: pa.creme.fond, borderWidth: 0 }}>
            <Ink size={16} weight="black" tight>{traduire('Semaine légère en cours')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Jusqu’au {0} : moitié moins de séries, même charge. Tes séances sont déjà ajustées.', dateCourte(actif.legereJusquau!))}</Ink>
            <Pressable onPress={() => { tap(); void arreterSemaineLegere(); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accent}>{traduire('Revenir aux séances normales')}</Ink>
            </Pressable>
          </Glass>
        ) : actif && suite && proposerSemaineLegere(actif) ? (
          <Glass style={{ gap: 8, backgroundColor: pa.creme.fond, borderWidth: 0 }}>
            <Ink size={16} weight="black" tight>{traduire('C’est le moment d’une semaine légère')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Toutes les 4 à 8 semaines, une semaine plus légère aide à récupérer : moitié moins de séries, même charge. Si tu te sens fatigué, tu peux la faire plus tôt.')}</Ink>
            <BigButton label={traduire('Faire une semaine légère')} tone="soft" onPress={() => void activerSemaineLegere()} />
          </Glass>
        ) : null}

        {!actif || !suite ? (
          // 27 octobre 2026 (refonte Pastel) : la carte ciel douce, plus de grand fond bleu nuit
          <View style={{ borderRadius: 26, backgroundColor: c.carteDouce, overflow: 'hidden', padding: 20, gap: 14, minHeight: 170 }}>
            {sportImage('musculation', femme, 1) ? <Image source={sportImage('musculation', femme, 1)!} style={{ position: 'absolute', right: -8, bottom: -54, width: 138, height: 190 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            <View style={{ maxWidth: '64%', gap: 6 }}>
              <Ink size={22} weight="black" tight>{traduire('Tu ne sais pas lequel choisir ?')}</Ink>
              <Ink size={14} weight="bold" color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire('Quatre questions et YOROI te conseille le programme qui colle à ton objectif, ton niveau et ton temps.')}</Ink>
            </View>
            <Pressable
              onPress={() => { tap(); setQuizOpen(true); }}
              accessibilityRole="button"
              style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 50, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? blancA(0.75) : c.surface })}
            >
              <Icon name="target" size={18} color={c.onPrimary} />
              <Ink size={15} weight="black" color={c.onPrimary}>{traduire('Trouver mon programme')}</Ink>
            </Pressable>
          </View>
        ) : null}

        {/* 26 octobre 2026 : message du jour, planning et Ma salle rangés dans une seule carte */}
        <BlocReglages>
          {actif && suite ? <MessageDuJour programme={suite.programme} nu /> : null}
          {actif && suite ? <PlanningProgramme programme={suite.programme} nu /> : null}
          <LigneReglage
            titre={traduire('Ma salle')}
            icone="dumbbell"
            onPress={() => { tap(); setMaterielOpen(true); }}
            sous={
              materiel === null
                ? traduire('Dis ce que tu as : les exercices impossibles seront remplacés tout seuls.')
                : materiel.length === 0
                  ? traduire('Sans matériel : tout se fait au poids du corps.')
                  : machines?.length
                    ? traduirePluriel(machines.length, machines.length > 1, '{0} machine cochée, les programmes s’adaptent à ta salle.', '{0} machines cochées, les programmes s’adaptent à ta salle.', machines.length)
                  : materiel.length === TOUT_LE_MATERIEL.length
                    ? traduire('Salle complète : les programmes tels quels.')
                    : materiel.map((m) => traduire(EQUIPEMENTS.find((e) => e.id === m)?.label ?? m)).join(', ')
            }
          />
        </BlocReglages>

        <SectionTitle title={traduire('Conseils')} sub={traduire('l’essentiel, appuyé sur des études')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {GUIDES.map((g, i) => {
            const f = famillePastel(pa, i);
            return (
            <Pressable
              key={g.id}
              onPress={() => { tap(); router.push({ pathname: '/programmes/conseil/[id]' as any, params: { id: g.id } }); }}
              accessibilityRole="button"
              accessibilityLabel={`${traduire(g.titre)}. ${traduire(g.accroche)}`}
              style={({ pressed }) => ({ width: 220, minHeight: 176, borderRadius: 24, padding: 16, gap: 10, justifyContent: 'space-between', backgroundColor: f.fond, opacity: pressed ? 0.85 : 1 })}
            >
              <Image source={illus.img(stickerDuGuide(g.id))} style={{ width: 52, height: 52 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <View style={{ gap: 4 }}>
                <Ink size={16} weight="black" tight numberOfLines={2}>{traduire(g.titre)}</Ink>
                <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={2}>{traduire(g.accroche)}</Ink>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ink size={13} weight="black" color={f.titre}>{traduire('Lire')}</Ink>
                <Icon name="chevron" size={14} color={f.titre} />
              </View>
            </Pressable>
            );
          })}
        </ScrollView>

        <SectionTitle title={traduire('Tous les programmes')} action={actif ? traduire('Trouver le mien') : undefined} onAction={() => setQuizOpen(true)} />
        {PROGRAMMES.map((p) => (
          <CarteProgramme key={p.id} p={p} femme={femme} enCours={actif?.id === p.id} favori={favoris.includes(p.id)} onFavori={() => etoile(p.id)} remplaces={remplaces(p)} onPress={() => ouvrirProgramme(p.id)} />
        ))}

        <View style={{ paddingHorizontal: 4, gap: 6, marginTop: 4 }}>
          <Ink size={12} color={c.textMuted}>{traduire('Chaque programme indique ses sources scientifiques, ouvre-le pour les voir.')}</Ink>
          <Ink size={12} color={c.textMuted}>{traduire('Si tu as un problème de santé, une douleur ou une blessure, demande l’avis d’un médecin avant de commencer.')}</Ink>
        </View>
      </ScrollView>

      <Questionnaire
        visible={quizOpen}
        depart={quiz === '1' ? 'quiz' : 'accueil'}
        onClose={() => setQuizOpen(false)}
        remplaces={remplaces}
        onVoir={(id, lieu) => {
          setQuizOpen(false);
          // premier passage : le lieu du questionnaire devient ton matériel (modifiable dans Mon matériel)
          if (materiel === null) void enregistrerMateriel(materielDuLieu(lieu));
          setTimeout(() => router.push({ pathname: '/programmes/[id]' as any, params: { id } }), 300);
        }}
      />
      <MaSalle visible={materielOpen} onClose={() => setMaterielOpen(false)} />
    </View>
  );
}

/** « Adapté à ta salle : 3 exercices remplacés » */
function texteSalle(n: number): string {
  return traduirePluriel(n, n > 1, 'Adapté à ta salle : {0} exercice remplacé', 'Adapté à ta salle : {0} exercices remplacés', n);
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateCourte(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${traduire(MOIS[d.getMonth()])}`;
}

/** Une carte de programme : le personnage, le nom, une ligne, des puces, l'étoile */
function CarteProgramme({ p, femme, enCours, favori, onFavori, onPress, remplaces = 0 }: { p: Programme; femme: boolean; enCours: boolean; favori: boolean; onFavori: () => void; onPress: () => void; remplaces?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const img = sportImage(sportDuProgramme(p), femme, 0);
  return (
    <Glass onPress={onPress} label={traduire(p.titre)} style={[carteBlanche(c.surface, c.divider), { gap: 12, padding: 16 }, enCours ? { borderWidth: 2, borderColor: c.primary } : null]}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.accentTint, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
          {img ? <Image source={img} style={{ width: 72, height: 96, marginBottom: -26 }} resizeMode="contain" /> : <Icon name="dumbbell" size={28} color={c.accent} />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {enCours ? <Ink size={11} weight="black" color={c.accentText} style={{ letterSpacing: 0.6 }}>{traduire('EN COURS')}</Ink> : null}
          <Ink size={17} weight="black" tight numberOfLines={2}>{traduire(p.titre)}</Ink>
          <Ink size={13} color={c.textSecondary} numberOfLines={2} style={{ lineHeight: 18 }}>{traduire(p.accroche)}</Ink>
        </View>
        <Pressable
          onPress={() => { tap(); onFavori(); }}
          accessibilityRole="button"
          accessibilityState={{ selected: favori }}
          accessibilityLabel={traduire(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')}
          hitSlop={6}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6, alignSelf: 'flex-start' }}
        >
          <Icon name="star" size={22} color={favori ? c.accent : c.textMuted} fill={favori ? c.accent : undefined} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Pastille icone="gauge" texte={traduire(libelleNiveau(p.niveau))} />
        <Pastille icone="calendar" texte={traduire('{0} j par semaine', p.joursParSemaine)} />
        <Pastille icone="clock" texte={traduire('{0} min', p.dureeMin)} />
        {p.sources.length ? <Pastille icone="book" texte={traduirePluriel(p.sources.length, p.sources.length > 1, '{0} étude', '{0} études', p.sources.length)} accent /> : null}
        {p.materiel !== 'salle' ? <Pastille texte={traduire(libelleMateriel(p.materiel))} /> : null}
        {remplaces > 0 ? <Pastille texte={traduirePluriel(remplaces, remplaces > 1, '{0} adapté à ta salle', '{0} adaptés à ta salle', remplaces)} /> : null}
      </View>
    </Glass>
  );
}

function CorpsMini() {
  return (
    <View pointerEvents="none" style={{ marginLeft: 8 }}>
      <CarteMuscles vue="face" largeur={55} choisies={['abdos', 'bras', 'quadriceps']} />
    </View>
  );
}
