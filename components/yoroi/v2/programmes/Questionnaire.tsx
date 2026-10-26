/**
 * Trouver mon programme, version modules (26 octobre 2026). Une feuille, deux chemins en haut :
 *  1. « Trouve mon programme » : plusieurs objectifs, le niveau (ou « Je n'y connais rien »), les jours, le lieu.
 *     YOROI donne le programme de base et coche les modules qui vont avec (lib/v2/programmes/choix.ts).
 *  2. « Je sais déjà ce que je veux » : tu choisis le programme dans une liste par type (PPL, Upper Lower...),
 *     puis tu ajoutes tes modules.
 * Puis « Commencer » lance le programme avec ses modules (suivi.ts, demarrerProgramme) et ouvre la premiere seance,
 * ou « Voir le programme » ouvre sa page. La fin de seance (abdos, cardio, duree, seances de marche) est choisie ici,
 * en modules : pas besoin d'ouvrir FeuilleFinDeSeance au depart.
 * Habillage (26 octobre 2026) : les morceaux de ChoixVisuels.tsx, comme app/coach-depart.tsx (maquette Choix).
 *
 * Props (compatibles avec l'ancien Questionnaire de app/programmes/index.tsx) :
 *  - visible, onClose            : la feuille ;
 *  - onVoir(id, lieu)            : « Voir le programme ». `lieu` : celui du questionnaire, ou le materiel du programme
 *                                  choisi dans la liste. Le parent ferme la feuille et ouvre la page (comme avant) ;
 *  - remplaces?(p)               : nombre d'exercices remplaces par ta salle, affiche sur le resultat ;
 *  - depart?                     : 'accueil' (par defaut), 'quiz' ou 'liste' pour ouvrir directement un chemin ;
 *  - onCommence?(a, route)       : apres le demarrage. Absent, la feuille se ferme et la premiere seance s'ouvre
 *                                  (routeDuJour), comme « Commencer ce programme » sur la page du programme.
 * Le changement de programme en cours est confirme ici. Au premier passage, le lieu du questionnaire devient
 * ton materiel (comme onVoir dans app/programmes/index.tsx).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { GrilleModules } from '@/components/yoroi/v2/programmes/GrilleModules';
import { Cercles, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { BarresNiveau, BoutonIndigo, CarteChoix, CarteProgramme, HerosProgramme, ICONE_OBJECTIF, PointsSemaine, PucesProgramme, RondsNombre, TuileChoix, TypesProgrammes } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { getProfile } from '@/lib/database';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { programmeParId, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { OBJECTIFS_CHOIX, conseillerProgramme } from '@/lib/v2/programmes/choix';
import type { ConseilMulti, ObjectifChoix, Reponses } from '@/lib/v2/programmes/choix';
import { aDesJoursMarche, MINUTES_FIN } from '@/lib/v2/programmes/finSeance';
import { GROUPES_PROGRAMMES, modulesPossibles, normaliserModules } from '@/lib/v2/programmes/modules';
import type { ModuleId } from '@/lib/v2/programmes/modules';
import { routeDuJour } from '@/lib/v2/programmes/lancer';
import { chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerMateriel, joursConseilles, materielDuLieu } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Materiel, Niveau, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type EtapeQuestionnaire = 'accueil' | 'quiz' | 'liste' | 'resultat';

export type QuestionnaireProps = {
  visible: boolean;
  onClose: () => void;
  onVoir: (id: string, lieu: Materiel) => void;
  remplaces?: (p: Programme) => number;
  depart?: 'accueil' | 'quiz' | 'liste';
  onCommence?: (a: ProgrammeActif, route: { pathname: string; params: Record<string, string> }) => void;
};

const NIVEAUX: { key: Niveau; label: string }[] = [
  { key: 'debutant', label: 'Moins de 6 mois' },
  { key: 'intermediaire', label: '6 mois à 2 ans' },
  { key: 'confirme', label: 'Plus de 2 ans' },
];
const JOURS: Reponses['jours'][] = [2, 3, 4, 5, 6];
const LIEUX: { key: Materiel; label: string; icone: IconName }[] = [
  { key: 'salle', label: 'En salle', icone: 'dumbbell' },
  { key: 'halteres', label: 'À la maison, avec des haltères', icone: 'dumbbell' },
  { key: 'maison', label: 'À la maison, sans matériel', icone: 'body' },
];

type Quiz = { objectifs: ObjectifChoix[]; niveau?: Niveau; jours?: Reponses['jours']; lieu?: Materiel };

export function Questionnaire({ visible, onClose, onVoir, remplaces, depart = 'accueil', onCommence }: QuestionnaireProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const router = useRouter();
  const [etape, setEtape] = useState<EtapeQuestionnaire>(depart);
  const [chemin, setChemin] = useState<'quiz' | 'liste'>('quiz');
  const [q, setQ] = useState<Quiz>({ objectifs: [] });
  const [groupe, setGroupe] = useState(GROUPES_PROGRAMMES[0].id);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [minutes, setMinutes] = useState<number>(30);
  const [sansMarche, setSansMarche] = useState(false);
  const [guide, setGuide] = useState(false);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setEtape(depart);
    chargerProgrammeActif().then(setActif).catch(() => setActif(null));
    getProfile().then((pr) => setFemme(pr?.avatar_gender === 'femme')).catch(() => {});
  }, [visible, depart]);

  const debuter = q.objectifs.includes('debuter');
  const course = q.objectifs.includes('course') && q.objectifs.length === 1;
  const quizComplet = q.objectifs.length > 0 && !!(debuter || q.niveau) && !!q.jours && !!q.lieu;
  const conseil: ConseilMulti | null = useMemo(
    () => (quizComplet ? conseillerProgramme({ objectifs: q.objectifs, niveau: debuter ? 'debutant' : q.niveau!, jours: q.jours!, lieu: q.lieu! }) : null),
    [quizComplet, q, debuter],
  );

  const idResultat = chemin === 'quiz' ? conseil?.id ?? null : choisi;
  const prog = idResultat ? programmeParId(idResultat) ?? null : null;
  const possibles = prog ? modulesPossibles(prog) : [];
  const lieu: Materiel = chemin === 'quiz' && q.lieu ? q.lieu : prog?.materiel ?? 'salle';

  const basculerObjectif = (k: ObjectifChoix) => {
    tap();
    setQ((x) => ({ ...x, objectifs: x.objectifs.includes(k) ? x.objectifs.filter((o) => o !== k) : [...x.objectifs, k] }));
  };
  const basculerModule = (m: ModuleId) => {
    tap();
    setModules((l) => normaliserModules(l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  };

  const voirResultat = (via: 'quiz' | 'liste', id?: string) => {
    tap();
    setChemin(via);
    setSansMarche(false);
    setMinutes(30);
    if (via === 'quiz' && conseil) setModules(normaliserModules(conseil.modules));
    if (via === 'liste' && id) {
      setChoisi(id);
      setModules([]);
    }
    setEtape('resultat');
  };

  const lancer = async () => {
    if (!prog) return;
    const go = async () => {
      if (chemin === 'quiz' && q.lieu) {
        const m = await chargerMateriel().catch(() => null);
        if (m === null) await enregistrerMateriel(materielDuLieu(q.lieu));
      }
      const a = await demarrerProgramme(prog.id, undefined, { choix: 'rien', minutes, ...(sansMarche ? { sansMarche: true } : {}) }, modules.filter((m) => possibles.some((x) => x.id === m)));
      if (!a) return;
      const r = routeDuJour(prog, prog.jours[a.prochain ?? 0], 1);
      if (onCommence) onCommence(a, r);
      else {
        onClose();
        setTimeout(() => router.push({ pathname: r.pathname as any, params: r.params }), 300);
      }
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

  // l'habillage (26 octobre 2026) : le personnage, la liste du type choisi, « Conseillé pour toi » sur le conseil du questionnaire
  const imgResultat = prog ? sportImage(sportDuProgramme(prog), femme, 1) : null;
  const idsListe = (GROUPES_PROGRAMMES.find((g) => g.id === groupe)?.ids ?? []).filter((id) => !!programmeParId(id));
  const badgeDe = (id: string) => (quizComplet && conseil?.id === id ? traduire('Conseillé pour toi') : undefined);

  const retour = etape === 'accueil' ? null : etape === 'resultat' ? chemin : 'accueil';
  const titre = etape === 'liste' ? traduire('Choisis ton programme') : etape === 'resultat' ? undefined : traduire('Trouver mon programme');

  return (
    <Sheet visible={visible} onClose={onClose} title={titre}>
      {retour ? (
        <Pressable onPress={() => { tap(); setEtape(retour as EtapeQuestionnaire); }} accessibilityRole="button" accessibilityLabel={traduire('Retour')} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 44, paddingRight: 14, paddingLeft: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevronLeft" size={18} color={pal.texte} />
          </View>
          <Ink size={14} weight="extraBold" color={pal.texte2}>{traduire('Retour')}</Ink>
        </Pressable>
      ) : null}

      {etape === 'accueil' ? (
        <View style={{ gap: 12, paddingHorizontal: 4, paddingBottom: 8 }}>
          <CarteChoix grand icone="search" teinte={1} label={traduire('Trouve mon programme')} sous={traduire('Quelques questions, YOROI choisit')} on={false} fleche onPress={() => { tap(); setEtape('quiz'); }} />
          <CarteChoix grand icone="list" teinte={0} label={traduire('Je sais déjà ce que je veux')} sous={traduire('PPL, Upper Lower, Full body')} on={false} fleche onPress={() => { tap(); setEtape('liste'); }} />
        </View>
      ) : null}

      {etape === 'quiz' ? (
        <View style={{ gap: 24, paddingHorizontal: 4 }}>
          <CarteChoix
            grand
            role="checkbox"
            on={debuter}
            icone="book"
            teinte={0}
            label={traduire('Je n’y connais rien')}
            sous={traduire('YOROI te guide pas à pas')}
            onPress={() => basculerObjectif('debuter')}
          />
          <Bloc titre={traduire('Tes objectifs')} sous={traduire('Plusieurs choix possibles')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {OBJECTIFS_CHOIX.filter((o) => o.key !== 'debuter').map((o, k) => (
                <TuileChoix key={o.key} icone={ICONE_OBJECTIF[o.key] ?? 'target'} teinte={k} label={traduire(o.label)} on={q.objectifs.includes(o.key)} onPress={() => basculerObjectif(o.key)} />
              ))}
            </View>
          </Bloc>
          {debuter ? null : (
            <Bloc titre={course ? traduire('Tu cours déjà 30 minutes sans t’arrêter ?') : traduire('Depuis quand tu t’entraînes')}>
              {course ? (
                <>
                  <CarteChoix role="radio" icone="close" teinte={1} label={traduire('Non, pas encore')} on={q.niveau === 'debutant'} onPress={() => { tap(); setQ((x) => ({ ...x, niveau: 'debutant' })); }} />
                  <CarteChoix role="radio" icone="check" teinte={2} label={traduire('Oui')} on={q.niveau === 'intermediaire'} onPress={() => { tap(); setQ((x) => ({ ...x, niveau: 'intermediaire' })); }} />
                </>
              ) : (
                NIVEAUX.map((n, k) => (
                  <CarteChoix
                    key={n.key}
                    role="radio"
                    teinte={k}
                    visuel={(on, t) => <BarresNiveau n={k + 1} couleur={on ? '#FFFFFF' : t.encre} vide={on ? 'rgba(255,255,255,0.3)' : pal.carte} />}
                    label={traduire(n.label)}
                    on={q.niveau === n.key}
                    onPress={() => { tap(); setQ((x) => ({ ...x, niveau: n.key })); }}
                  />
                ))
              )}
            </Bloc>
          )}
          <Bloc titre={traduire('Jours par semaine pour t’entraîner')}>
            <View style={{ backgroundColor: pal.carte, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 16 }}>
              <RondsNombre
                options={JOURS}
                valeur={q.jours}
                libelle={(j) => ({ court: j === 5 ? '5+' : String(j), long: j === 5 ? traduire('5 ou plus') : String(j) })}
                onChoisir={(j) => { tap(); setQ((x) => ({ ...x, jours: j })); }}
              />
            </View>
          </Bloc>
          <Bloc titre={traduire('Où tu t’entraînes')}>
            {LIEUX.map((l, k) => (
              <CarteChoix key={l.key} role="radio" icone={l.icone} teinte={k} label={traduire(l.label)} on={q.lieu === l.key} onPress={() => { tap(); setQ((x) => ({ ...x, lieu: l.key })); }} />
            ))}
          </Bloc>
          {quizComplet ? (
            <BoutonIndigo label={traduire('Voir mon programme')} icone="check" onPress={() => voirResultat('quiz')} />
          ) : (
            <Ink size={13} weight="bold" color={pal.texte2} style={{ textAlign: 'center' }}>{traduire('Réponds aux questions pour voir ton programme.')}</Ink>
          )}
        </View>
      ) : null}

      {etape === 'liste' ? (
        <View style={{ gap: 14, paddingHorizontal: 4 }}>
          <Ink size={14} weight="bold" color={pal.texte2}>{traduire('Tu ajoutes tes modules juste après')}</Ink>
          <TypesProgrammes groupes={GROUPES_PROGRAMMES} groupe={groupe} onChoisir={(id) => { tap(); setGroupe(id); }} />
          {idsListe.length ? (
            <HerosProgramme p={programmeParId(idsListe[0])!} image={sportImage(sportDuProgramme(programmeParId(idsListe[0])!), femme, 1)} badge={badgeDe(idsListe[0])} onPress={() => voirResultat('liste', idsListe[0])} />
          ) : null}
          {idsListe.slice(1).map((id, k) => (
            <CarteProgramme key={id} p={programmeParId(id)!} k={k} badge={badgeDe(id)} onPress={() => voirResultat('liste', id)} />
          ))}
        </View>
      ) : null}

      {etape === 'resultat' && prog ? (
        <View style={{ gap: 18, paddingHorizontal: 4 }}>
          <View style={{ borderRadius: 28, backgroundColor: pal.indigo, overflow: 'hidden', padding: 20, gap: 10, minHeight: 220 }}>
            <Cercles />
            {imgResultat ? <Image source={imgResultat} style={{ position: 'absolute', right: -6, bottom: 0, width: 130, height: 176 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            <View style={{ maxWidth: imgResultat ? '64%' : '100%', gap: 8 }}>
              <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 }}>
                <Ink size={12} weight="extraBold" color={c.onDark}>{chemin === 'quiz' && conseil ? traduire('Conseillé pour toi') : traduire('Ton programme')}</Ink>
              </View>
              <Ink size={24} weight="black" tight color={c.onDark} numberOfLines={3} accessibilityRole="header">{traduire(prog.titre)}</Ink>
              <Ink size={13} weight="bold" color={c.onDarkSecondary} numberOfLines={4} style={{ lineHeight: 18 }}>{chemin === 'quiz' && conseil ? traduire(conseil.pourquoi) : traduire(prog.accroche)}</Ink>
              {remplaces && remplaces(prog) > 0 ? (
                <Ink size={12} weight="extraBold" color={c.onDark}>
                  {traduirePluriel(remplaces(prog), remplaces(prog) > 1, 'Adapté à ta salle : {0} exercice remplacé', 'Adapté à ta salle : {0} exercices remplacés', remplaces(prog))}
                </Ink>
              ) : null}
              <View style={{ marginTop: 2 }}>
                <PointsSemaine jours={joursConseilles(prog.joursParSemaine)} plein="#FFFFFF" vide="rgba(255,255,255,0.2)" taille={20} />
              </View>
            </View>
            <View style={{ maxWidth: imgResultat ? '68%' : '100%' }} accessible accessibilityLabel={traduire('{0} j par semaine, {1} min', prog.joursParSemaine, prog.dureeMin)}>
              <PucesProgramme p={prog} />
            </View>
          </View>

          {possibles.length ? (
            <View style={{ gap: 12 }}>
              <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header">{traduire('Ajoute à ton programme')}</Ink>
              <GrilleModules possibles={possibles} modules={modules} onBasculer={basculerModule} />
            </View>
          ) : null}

          {modules.includes('cardio') ? (
            <Bloc titre={traduire('Durée du cardio')} ligne>
              {MINUTES_FIN.map((m) => <Puce key={m} label={traduire('{0} min', m)} on={minutes === m} onPress={() => { tap(); setMinutes(m); }} />)}
            </Bloc>
          ) : null}

          {aDesJoursMarche(prog) ? (
            <Bloc titre={traduire('Les séances de marche du programme')} ligne>
              <Puce label={traduire('Je les garde')} on={!sansMarche} onPress={() => { tap(); setSansMarche(false); }} />
              <Puce label={traduire('Je les retire')} on={sansMarche} onPress={() => { tap(); setSansMarche(true); }} />
            </Bloc>
          ) : null}

          {chemin === 'quiz' && conseil?.guideDebutant ? (
            <CarteChoix icone="scale" teinte={2} label={traduire('Trouver ton poids de départ')} fleche on={false} onPress={() => { tap(); setGuide(true); }} />
          ) : null}

          <View style={{ gap: 10 }}>
            <BoutonIndigo label={traduire('Commencer')} icone="play" onPress={() => void lancer()} />
            <BigButton label={traduire('Voir le programme')} tone="soft" onPress={() => onVoir(prog.id, lieu)} />
          </View>

          {chemin === 'quiz' && conseil?.autres.length ? (
            <View style={{ gap: 10 }}>
              <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header">{traduire('Te va aussi')}</Ink>
              {conseil.autres.slice(0, 2).map((id, k) => {
                const a = programmeParId(id);
                return a ? <CarteProgramme key={id} p={a} k={k + 1} onPress={() => { tap(); onVoir(id, lieu); }} /> : null;
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <FeuillePoidsDeDepart visible={guide} onClose={() => setGuide(false)} />
    </Sheet>
  );
}

/** Une question : un titre court, ses réponses dessous (en colonne, ou en ligne pour les puces) */
function Bloc({ titre, sous, ligne, children }: { titre: string; sous?: string; ligne?: boolean; children: React.ReactNode }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header">{titre}</Ink>
        {sous ? <Ink size={13} weight="bold" color={pal.texte2}>{sous}</Ink> : null}
      </View>
      <View style={ligne ? { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } : { gap: 10 }}>{children}</View>
    </View>
  );
}

/** Puce des choix courts (durée du cardio, séances de marche) : indigo pleine quand elle est choisie, blanche sinon */
function Puce({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ minHeight: 46, paddingHorizontal: 18, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pal.indigo : pressed ? pal.teinte : pal.carte })}
    >
      <Ink size={14} weight="extraBold" color={on ? c.onDark : pal.texte}>{label}</Ink>
    </Pressable>
  );
}
