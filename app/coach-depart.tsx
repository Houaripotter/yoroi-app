/**
 * Le départ avec ton coach (26 octobre 2026). Houari : « Quand je clique sur Coach, il y a un onboarding du coach
 * pour poser les questions : qu'est-ce que je veux, quand je suis disponible. S'il choisit plus tard, il peut le
 * faire dans Coach. Et il faut pouvoir changer de programme quand on veut. »
 * Une question par écran, de grandes cartes, « Plus tard » toujours en haut à droite :
 *  1. Qu'est-ce que tu veux ? (plusieurs objectifs, « Je n'y connais rien », « Je sais déjà quel programme je veux ») ;
 *  2. Depuis quand tu fais de la muscu ? (sauté pour « Je n'y connais rien ») ;
 *  3. Quand es-tu disponible ? (tes vrais jours, 0 = lundi ; aucun : YOROI choisit) ;
 *  4. Combien de temps par séance ? ;  5. Tu pratiques aussi un sport ? ;  6. Où tu t'entraînes ? ;
 *  7. Ton programme : le programme de base, pourquoi, ses modules, tes jours, « C'est parti ».
 * Le calcul est dans lib/v2/programmes/depart.ts (conseilDepart, sur conseillerProgramme de choix.ts).
 * Chemin liste : le programme dans la liste par type (modules.ts, GROUPES_PROGRAMMES), puis le même résultat.
 * Pas de question sur les douleurs : l'infirmerie demande la zone, le côté et l'intensité (lib/infirmaryService.ts),
 * une réponse rapide ici ne pourrait pas l'écrire proprement. Tes douleurs déclarées s'appliquent déjà au programme.
 * Paramètres : depuis=onboarding (fin de l'onboarding : un premier écran « Ton coach te prépare ton programme ? »),
 * chemin=liste (ouvre directement la liste).
 * « Plus tard » note yoroi_coach_depart_v1 = 'plus_tard' (sauf si le départ a déjà été fait), « C'est parti » note 'fait'.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { Cercles, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { GrilleModules } from '@/components/yoroi/v2/programmes/GrilleModules';
import { BarresNiveau, CarteChoix, CarteProgramme, HerosProgramme, ICONE_OBJECTIF, ICONE_SPORT, PointsSemaine, PucesProgramme, RangeeJours, TuileChoix, TuilesTemps, TypesProgrammes } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { getProfile } from '@/lib/database';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { programmeParId, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { DEBUTANT, OBJECTIFS_CHOIX } from '@/lib/v2/programmes/choix';
import type { ObjectifChoix } from '@/lib/v2/programmes/choix';
import { conseilJours } from '@/lib/v2/programmes/coach';
import { AUTRES_SPORTS, TEMPS_SEANCE, conseilDepart, ecrireDepart, lireDepart } from '@/lib/v2/programmes/depart';
import type { AutreSport, TempsSeance } from '@/lib/v2/programmes/depart';
import { aDesJoursMarche, MINUTES_FIN } from '@/lib/v2/programmes/finSeance';
import { GROUPES_PROGRAMMES, modulesPossibles, moduleUtile, normaliserModules } from '@/lib/v2/programmes/modules';
import type { ModuleId } from '@/lib/v2/programmes/modules';
import { chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerMateriel, joursConseilles, materielDuLieu } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Materiel, Niveau } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

type Etape = 'intro' | 'objectifs' | 'niveau' | 'jours' | 'temps' | 'sport' | 'lieu' | 'liste' | 'resultat';

const NIVEAUX: { key: Niveau; label: string }[] = [
  { key: 'debutant', label: 'Moins de 6 mois' },
  { key: 'intermediaire', label: '6 mois à 2 ans' },
  { key: 'confirme', label: 'Plus de 2 ans' },
];
const LIEUX: { key: Materiel; label: string; icone: IconName }[] = [
  { key: 'salle', label: 'En salle', icone: 'dumbbell' },
  { key: 'halteres', label: 'À la maison, avec des haltères', icone: 'dumbbell' },
  { key: 'maison', label: 'À la maison, sans matériel', icone: 'body' },
];

export default function CoachDepart() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ depuis?: string; chemin?: string }>();
  const depuisOnboarding = params.depuis === 'onboarding';

  const [etape, setEtape] = useState<Etape>(depuisOnboarding ? 'intro' : params.chemin === 'liste' ? 'liste' : 'objectifs');
  const [historique, setHistorique] = useState<Etape[]>([]);
  const [chemin, setChemin] = useState<'quiz' | 'liste'>(params.chemin === 'liste' ? 'liste' : 'quiz');
  const [objectifs, setObjectifs] = useState<ObjectifChoix[]>([]);
  const [niveau, setNiveau] = useState<Niveau | undefined>(undefined);
  const [jours, setJours] = useState<number[]>([]);
  const [temps, setTemps] = useState<TempsSeance>(60);
  const [sport, setSport] = useState<AutreSport>('non');
  const [lieu, setLieu] = useState<Materiel>('salle');
  const [groupe, setGroupe] = useState(GROUPES_PROGRAMMES[0].id);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [joursRes, setJoursRes] = useState<number[]>([]);
  const [minutes, setMinutes] = useState<number>(30);
  const [sansMarche, setSansMarche] = useState(false);
  const [guide, setGuide] = useState(false);
  const [femme, setFemme] = useState(false);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);

  useEffect(() => {
    getProfile().then((pr) => setFemme(pr?.avatar_gender === 'femme')).catch(() => {});
    chargerProgrammeActif().then(setActif).catch(() => setActif(null));
  }, []);

  const debuter = objectifs.includes('debuter');
  const courseSeule = objectifs.length === 1 && objectifs[0] === 'course';
  const conseil = useMemo(
    () => (objectifs.length ? conseilDepart({ objectifs, niveau: debuter ? undefined : niveau, jours, temps, sport, lieu }) : null),
    [objectifs, niveau, debuter, jours, temps, sport, lieu],
  );
  const prog = choisi ? programmeParId(choisi) ?? null : null;
  const possibles = prog ? modulesPossibles(prog) : [];
  const img = sportImage(prog ? sportDuProgramme(prog) : 'musculation', femme, 1);

  // les étapes du questionnaire, pour la barre de progression
  const suiteQuiz: Etape[] = debuter ? ['objectifs', 'jours', 'temps', 'sport', 'lieu', 'resultat'] : ['objectifs', 'niveau', 'jours', 'temps', 'sport', 'lieu', 'resultat'];
  const suiteListe: Etape[] = ['liste', 'resultat'];
  const suiteVue = chemin === 'liste' ? suiteListe : suiteQuiz;
  const rang = Math.max(0, suiteVue.indexOf(etape));

  const aller = (e: Etape) => {
    setHistorique((h) => [...h, etape]);
    setEtape(e);
  };
  const suivante = (apres: Etape) => {
    const i = suiteQuiz.indexOf(apres);
    const e = suiteQuiz[i + 1];
    if (e === 'resultat') ouvrirResultat('quiz');
    else if (e) aller(e);
  };

  /** Le résultat : le programme du questionnaire ou celui de la liste, ses modules cochés, tes jours */
  const ouvrirResultat = (via: 'quiz' | 'liste', id?: string) => {
    const pid = via === 'quiz' ? conseil?.id : id;
    const p = pid ? programmeParId(pid) : null;
    if (!p) return;
    setChemin(via);
    setChoisi(p.id);
    setSansMarche(false);
    setMinutes(30);
    setModules(via === 'quiz' && conseil ? normaliserModules(conseil.modules) : []);
    setJoursRes(via === 'quiz' && conseil ? conseil.jours : jours.length ? jours : joursConseilles(p.joursParSemaine));
    aller('resultat');
  };

  /** « Te va aussi » : ce programme devient le résultat, avec les modules du conseil qui lui servent */
  const prendreAutre = (id: string) => {
    const p = programmeParId(id);
    if (!p) return;
    tap();
    setChoisi(id);
    setModules((l) => l.filter((m) => moduleUtile(p, m)));
    if (!jours.length) setJoursRes(joursConseilles(p.joursParSemaine));
  };

  const sortir = (vers: 'accueil' | 'coach') => {
    if (depuisOnboarding) router.replace(vers === 'coach' ? ('/coach' as any) : ('/(tabs)' as any));
    else if (router.canGoBack()) router.back();
    else router.replace('/coach' as any);
  };
  const plusTard = () => {
    tap();
    void lireDepart().then((e) => (e === 'fait' ? undefined : ecrireDepart('plus_tard'))).finally(() => sortir('accueil'));
  };
  const retour = () => {
    tap();
    const h = [...historique];
    const prec = h.pop();
    if (!prec) {
      plusTard();
      return;
    }
    setHistorique(h);
    if (prec !== 'resultat' && prec !== 'liste') setChemin('quiz');
    setEtape(prec);
  };

  const basculerObjectif = (k: ObjectifChoix) => {
    tap();
    setObjectifs((l) => (l.includes(k) ? l.filter((o) => o !== k) : [...l, k]));
  };
  const basculerJour = (d: number, liste: number[], fixer: (l: number[]) => void, garderUn: boolean) => {
    tap();
    const suite = liste.includes(d) ? liste.filter((x) => x !== d) : [...liste, d].sort((a, b) => a - b);
    if (garderUn && !suite.length) return;
    fixer(suite);
  };
  const basculerModule = (m: ModuleId) => {
    tap();
    setModules((l) => normaliserModules(l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  };

  const garderMateriel = async () => {
    if (chemin !== 'quiz') return;
    const m = await chargerMateriel().catch(() => null);
    if (m === null) await enregistrerMateriel(materielDuLieu(lieu));
  };

  const lancer = async () => {
    if (!prog) return;
    const go = async () => {
      await garderMateriel();
      const a = await demarrerProgramme(prog.id, joursRes, { choix: 'rien', minutes, ...(sansMarche ? { sansMarche: true } : {}) }, modules.filter((m) => possibles.some((x) => x.id === m)));
      if (!a) return;
      await ecrireDepart('fait');
      sortir('coach');
    };
    if (actif && actif.id !== prog.id) {
      const ancien = programmeParId(actif.id);
      appAlert(traduire('Changer de programme ?'), traduire('Tu suis « {0} ». Tes séances déjà faites restent dans ton historique.', traduire(ancien?.titre ?? '')), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Changer'), onPress: () => void go() },
      ]);
      return;
    }
    await go();
  };

  const voirProgramme = () => {
    if (!prog) return;
    tap();
    void garderMateriel().finally(() => {
      if (depuisOnboarding) router.replace({ pathname: '/programmes/[id]' as any, params: { id: prog.id } });
      else router.push({ pathname: '/programmes/[id]' as any, params: { id: prog.id } });
    });
  };

  /* ------------------------------------------------ rendu ------------------------------------------------ */
  const titreEcran = (titre: string, pourquoi?: string) => (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <Ink size={28} weight="black" tight color={pal.texte} accessibilityRole="header">{titre}</Ink>
      {pourquoi ? <Ink size={14} weight="bold" color={pal.texte2}>{pourquoi}</Ink> : null}
    </View>
  );
  const titreSection = (t: string) => <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header">{t}</Ink>;

  let corps: React.ReactNode = null;
  let bas: React.ReactNode = null;

  if (etape === 'intro') {
    corps = (
      <View style={{ gap: 22 }}>
        <Heros image={img} titre={traduire('Ton coach te prépare ton programme ?')} texte={traduire('Quelques questions, moins d’une minute')} />
      </View>
    );
    bas = (
      <View style={{ gap: 10 }}>
        <BoutonPlein label={traduire('Oui, c’est parti')} onPress={() => { tap(); aller('objectifs'); }} />
        <BoutonDoux label={traduire('Plus tard')} onPress={plusTard} />
      </View>
    );
  }

  if (etape === 'objectifs') {
    corps = (
      <View style={{ gap: 12 }}>
        <Heros image={img} titre={traduire('Ton objectif ?')} texte={traduire('Plusieurs choix possibles')} />
        <CarteChoix grand role="checkbox" icone="book" teinte={0} label={traduire('Je n’y connais rien')} sous={traduire('YOROI te guide pas à pas')} on={debuter} onPress={() => basculerObjectif('debuter')} />
        <CarteChoix icone="list" teinte={1} label={traduire('Je sais déjà quel programme je veux')} on={false} fleche onPress={() => { tap(); setChemin('liste'); aller('liste'); }} />
        <View style={{ marginTop: 8 }}>{titreSection(traduire('Tes objectifs'))}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OBJECTIFS_CHOIX.filter((o) => o.key !== 'debuter').map((o, k) => (
            <TuileChoix key={o.key} icone={ICONE_OBJECTIF[o.key] ?? 'target'} teinte={k} label={traduire(o.label)} on={objectifs.includes(o.key)} onPress={() => basculerObjectif(o.key)} />
          ))}
        </View>
      </View>
    );
    bas = objectifs.length ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('objectifs'); }} /> : null;
  }

  if (etape === 'niveau') {
    const choix = courseSeule
      ? [{ key: 'debutant' as Niveau, label: 'Non, pas encore' }, { key: 'intermediaire' as Niveau, label: 'Oui' }]
      : NIVEAUX;
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(courseSeule ? traduire('Tu cours déjà 30 minutes sans t’arrêter ?') : traduire('Depuis quand tu fais de la muscu ?'), traduire('Pour choisir un programme à ton niveau'))}
        {choix.map((n, k) => (
          <CarteChoix
            key={n.key}
            role="radio"
            grand
            teinte={courseSeule ? (k === 0 ? 1 : 2) : k}
            icone={courseSeule ? (k === 0 ? 'close' : 'check') : undefined}
            visuel={courseSeule ? undefined : (on, t) => <BarresNiveau n={k + 1} couleur={on ? '#FFFFFF' : t.encre} vide={on ? 'rgba(255,255,255,0.3)' : pal.carte} />}
            label={traduire(n.label)}
            on={niveau === n.key}
            onPress={() => { tap(); setNiveau(n.key); setTimeout(() => suivante('niveau'), 160); }}
          />
        ))}
      </View>
    );
  }

  if (etape === 'jours') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Tes jours disponibles'), traduire('Pour placer tes séances sur ta semaine'))}
        <View style={{ backgroundColor: pal.carte, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 18 }}>
          <RangeeJours jours={jours} onBasculer={(d) => basculerJour(d, jours, setJours, false)} />
        </View>
        {jours.length === 1 ? <Ink size={13} weight="bold" color={pal.texte2}>{traduire(DEBUTANT)}</Ink> : null}
        {jours.length === 7 ? <Ink size={13} weight="bold" color={pal.texte2}>{traduire('Sept jours : garde au moins un jour de repos, le repos fait aussi le muscle.')}</Ink> : null}
        <CarteChoix icone="calendar" teinte={2} label={traduire('Je ne sais pas, choisis pour moi')} on={false} fleche onPress={() => { tap(); setJours([]); suivante('jours'); }} />
      </View>
    );
    bas = jours.length ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('jours'); }} /> : null;
  }

  if (etape === 'temps') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Combien de temps par séance ?'), traduire('Pour des séances qui rentrent dans ton temps'))}
        <TuilesTemps options={TEMPS_SEANCE} valeur={temps} onChoisir={(t) => { tap(); setTemps(t); setTimeout(() => suivante('temps'), 160); }} />
      </View>
    );
    bas = <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('temps'); }} />;
  }

  if (etape === 'sport') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Tu pratiques aussi un sport ?'), traduire('Pour que ta muscu aide ton sport, sans te fatiguer'))}
        {AUTRES_SPORTS.map((s, k) => (
          <CarteChoix key={s.key} role="radio" icone={ICONE_SPORT[s.key] ?? 'medal'} teinte={k} label={traduire(s.label)} on={sport === s.key} onPress={() => { tap(); setSport(s.key); setTimeout(() => suivante('sport'), 160); }} />
        ))}
      </View>
    );
    bas = <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('sport'); }} />;
  }

  if (etape === 'lieu') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Où tu t’entraînes ?'), traduire('Pour des exercices que tu peux vraiment faire'))}
        {LIEUX.map((l, k) => (
          <CarteChoix key={l.key} role="radio" grand icone={l.icone} teinte={k} label={traduire(l.label)} on={lieu === l.key} onPress={() => { tap(); setLieu(l.key); }} />
        ))}
      </View>
    );
    bas = <BoutonPlein label={traduire('Voir mon programme')} onPress={() => { tap(); ouvrirResultat('quiz'); }} />;
  }

  if (etape === 'liste') {
    const ids = (GROUPES_PROGRAMMES.find((g) => g.id === groupe)?.ids ?? []).filter((id) => !!programmeParId(id));
    const premier = ids.length ? programmeParId(ids[0])! : null;
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Choisis ton programme'), traduire('Tu ajoutes tes modules juste après'))}
        <TypesProgrammes groupes={GROUPES_PROGRAMMES} groupe={groupe} onChoisir={(id) => { tap(); setGroupe(id); }} />
        {premier ? (
          <HerosProgramme p={premier} image={sportImage(sportDuProgramme(premier), femme, 1)} onPress={() => { tap(); ouvrirResultat('liste', premier.id); }} />
        ) : null}
        {ids.slice(1).map((id, k) => {
          const p = programmeParId(id)!;
          return <CarteProgramme key={id} p={p} k={k} onPress={() => { tap(); ouvrirResultat('liste', id); }} />;
        })}
      </View>
    );
  }

  if (etape === 'resultat' && prog) {
    const duConseil = chemin === 'quiz' && conseil && conseil.id === prog.id;
    const autres = chemin === 'quiz' && conseil?.autres.length ? [conseil.id, ...conseil.autres].filter((id) => id !== prog.id).slice(0, 2).map((id) => programmeParId(id)).filter((a): a is NonNullable<typeof a> => !!a) : [];
    corps = (
      <View style={{ gap: 18 }}>
        <View style={{ borderRadius: 28, backgroundColor: pal.indigo, overflow: 'hidden', padding: 20, gap: 10, minHeight: 230 }}>
          <Cercles />
          {img ? <Image source={img} style={{ position: 'absolute', right: -6, bottom: 0, width: 136, height: 184 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          <View style={{ maxWidth: img ? '64%' : '100%', gap: 8 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 }}>
              <Ink size={12} weight="extraBold" color={c.onDark}>{duConseil ? traduire('Conseillé pour toi') : traduire('Ton programme')}</Ink>
            </View>
            <Ink size={24} weight="black" tight color={c.onDark} numberOfLines={3} accessibilityRole="header">{traduire(prog.titre)}</Ink>
            <Ink size={13} weight="bold" color={c.onDarkSecondary} numberOfLines={4} style={{ lineHeight: 18 }}>{traduire(duConseil ? conseil!.pourquoi : prog.accroche)}</Ink>
            <View style={{ marginTop: 2 }}>
              <PointsSemaine jours={joursRes} plein="#FFFFFF" vide="rgba(255,255,255,0.2)" taille={20} />
            </View>
          </View>
          <View style={{ maxWidth: img ? '68%' : '100%' }} accessible accessibilityLabel={traduire('{0} j par semaine, {1} min', prog.joursParSemaine, prog.dureeMin)}>
            <PucesProgramme p={prog} />
          </View>
        </View>

        {duConseil && conseil!.dureeTropLongue ? (
          <Ink size={13} weight="bold" color={pal.texte2}>{traduire('Moins de temps un jour ? La page du programme propose une séance express.')}</Ink>
        ) : null}
        {duConseil && conseil!.principeSport ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: pal.carte }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: pal.orangeTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="target" size={22} color={pal.orange} />
            </View>
            <Ink size={13} weight="bold" color={pal.texte} style={{ flex: 1, lineHeight: 18 }}>{traduire(conseil!.principeSport!)}</Ink>
          </View>
        ) : null}

        <View style={{ gap: 12, backgroundColor: pal.carte, borderRadius: 24, padding: 16 }}>
          {titreSection(traduire('Tes jours'))}
          <RangeeJours jours={joursRes} onBasculer={(d) => basculerJour(d, joursRes, setJoursRes, true)} />
          <Ink size={12} weight="bold" color={pal.texte2}>{conseilJours(prog.joursParSemaine, joursRes.length)}</Ink>
        </View>

        {possibles.length ? (
          <View style={{ gap: 12 }}>
            {titreSection(traduire('Ajoute à ton programme'))}
            <GrilleModules possibles={possibles} modules={modules} onBasculer={basculerModule} />
          </View>
        ) : null}

        {modules.includes('cardio') ? (
          <View style={{ gap: 10 }}>
            {titreSection(traduire('Durée du cardio'))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MINUTES_FIN.map((m) => <Puce key={m} label={traduire('{0} min', m)} on={minutes === m} onPress={() => { tap(); setMinutes(m); }} />)}
            </View>
          </View>
        ) : null}

        {aDesJoursMarche(prog) ? (
          <View style={{ gap: 10 }}>
            {titreSection(traduire('Les séances de marche du programme'))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Puce label={traduire('Je les garde')} on={!sansMarche} onPress={() => { tap(); setSansMarche(false); }} />
              <Puce label={traduire('Je les retire')} on={sansMarche} onPress={() => { tap(); setSansMarche(true); }} />
            </View>
          </View>
        ) : null}

        {duConseil && conseil!.guideDebutant ? (
          <CarteChoix icone="scale" teinte={2} label={traduire('Trouver ton poids de départ')} on={false} fleche onPress={() => { tap(); setGuide(true); }} />
        ) : null}

        {autres.length ? (
          <View style={{ gap: 10 }}>
            {titreSection(traduire('Te va aussi'))}
            {autres.map((a, k) => (
              <CarteProgramme key={a.id} p={a} k={k + 1} onPress={() => prendreAutre(a.id)} />
            ))}
          </View>
        ) : null}
      </View>
    );
    bas = (
      <View style={{ gap: 10 }}>
        <BoutonPlein grand icone="play" label={traduire('C’est parti')} onPress={() => { tap(); void lancer(); }} />
        <BoutonDoux label={traduire('Voir le programme')} onPress={voirProgramme} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      {/* en-tête : retour, progression, Plus tard */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire('Retour')} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <Icon name="chevronLeft" size={20} color={pal.texte} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center' }} accessible accessibilityLabel={traduire('Étape {0} sur {1}', rang + 1, suiteVue.length)}>
          {etape === 'intro'
            ? null
            : suiteVue.map((e, k) => (
                <View key={e} style={{ height: 6, flex: 1, maxWidth: 34, borderRadius: 3, backgroundColor: k <= rang ? pal.indigo : pal.anneau }} />
              ))}
        </View>
        <Pressable onPress={plusTard} accessibilityRole="button" hitSlop={8} style={{ minHeight: 46, paddingHorizontal: 6, justifyContent: 'center' }}>
          <Ink size={14} weight="extraBold" color={pal.texte2}>{traduire('Plus tard')}</Ink>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {corps}
      </ScrollView>

      {bas ? <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 14, backgroundColor: pal.page }}>{bas}</View> : null}

      <FeuillePoidsDeDepart visible={guide} onClose={() => setGuide(false)} />
    </View>
  );
}

/* ------------------------------------------------ morceaux ------------------------------------------------ */

/** La carte indigo du premier écran, le personnage à droite */
function Heros({ image, titre, texte }: { image: ReturnType<typeof sportImage>; titre: string; texte?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={{ borderRadius: 28, backgroundColor: pal.indigo, overflow: 'hidden', padding: 20, minHeight: 170, justifyContent: 'center' }}>
      <Cercles />
      {image ? <Image source={image} style={{ position: 'absolute', right: 0, bottom: 0, width: 128, height: 170 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ maxWidth: image ? '62%' : '100%', gap: 6 }}>
        <Ink size={12} weight="extraBold" color={c.onDarkSecondary}>{traduire('Ton coach')}</Ink>
        <Ink size={24} weight="black" tight color={c.onDark} accessibilityRole="header">{titre}</Ink>
        {texte ? <Ink size={13} weight="bold" color={c.onDarkSecondary}>{texte}</Ink> : null}
      </View>
    </View>
  );
}

/** Puce de choix court (groupe de programmes, durée du cardio) */
function Puce({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pal.indigo : pressed ? pal.teinte : pal.carte })}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.onDark : pal.texte}>{label}</Ink>
    </Pressable>
  );
}

function BoutonPlein({ label, onPress, grand, icone }: { label: string; onPress: () => void; grand?: boolean; icone?: IconName }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: grand ? 62 : 56, borderRadius: 999, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pal.indigo, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], shadowColor: pal.indigo, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 })}
    >
      {icone ? <Icon name={icone} size={18} color={c.onDark} /> : null}
      <Ink size={grand ? 18 : 16} weight="black" color={c.onDark}>{label}</Ink>
    </Pressable>
  );
}

function BoutonDoux({ label, onPress }: { label: string; onPress: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.teinte : pal.carte })}>
      <Ink size={15} weight="extraBold" color={pal.indigo}>{label}</Ink>
    </Pressable>
  );
}
