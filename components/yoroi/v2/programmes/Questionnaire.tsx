/**
 * Trouver mon programme, version modules (26 octobre 2026). Une feuille, deux chemins en haut :
 *  1. « Trouve mon programme » : plusieurs objectifs, le niveau (ou « Je n'y connais rien »), les jours, le lieu.
 *     YOROI donne le programme de base et coche les modules qui vont avec (lib/v2/programmes/choix.ts).
 *  2. « Je sais déjà ce que je veux » : tu choisis le programme dans une liste par type (PPL, Upper Lower...),
 *     puis tu ajoutes tes modules.
 * Puis « Commencer » lance le programme avec ses modules (suivi.ts, demarrerProgramme) et ouvre la premiere seance,
 * ou « Voir le programme » ouvre sa page. La fin de seance (abdos, cardio, duree, seances de marche) est choisie ici,
 * en modules : pas besoin d'ouvrir FeuilleFinDeSeance au depart.
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
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { GrilleModules } from '@/components/yoroi/v2/programmes/GrilleModules';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { OBJECTIFS_CHOIX, conseillerProgramme } from '@/lib/v2/programmes/choix';
import type { ConseilMulti, ObjectifChoix, Reponses } from '@/lib/v2/programmes/choix';
import { aDesJoursMarche, MINUTES_FIN } from '@/lib/v2/programmes/finSeance';
import { GROUPES_PROGRAMMES, modulesPossibles, normaliserModules } from '@/lib/v2/programmes/modules';
import type { ModuleId } from '@/lib/v2/programmes/modules';
import { routeDuJour } from '@/lib/v2/programmes/lancer';
import { chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerMateriel, materielDuLieu } from '@/lib/v2/programmes/suivi';
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

  useEffect(() => {
    if (!visible) return;
    setEtape(depart);
    chargerProgrammeActif().then(setActif).catch(() => setActif(null));
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

  const retour = etape === 'accueil' ? null : etape === 'resultat' ? chemin : 'accueil';
  const titre = etape === 'liste' ? traduire('Choisis ton programme') : etape === 'resultat' ? undefined : traduire('Trouver mon programme');

  return (
    <Sheet visible={visible} onClose={onClose} title={titre}>
      {retour ? (
        <Pressable onPress={() => { tap(); setEtape(retour as EtapeQuestionnaire); }} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="chevronLeft" size={18} color={c.accent} />
          <Ink size={14} weight="extraBold" color={c.accent}>{traduire('Retour')}</Ink>
        </Pressable>
      ) : null}

      {etape === 'accueil' ? (
        <View style={{ gap: 12, paddingHorizontal: 4, paddingBottom: 8 }}>
          <GrandeCarte icone="target" titre={traduire('Trouve mon programme')} sous={traduire('Quelques questions, YOROI choisit')} onPress={() => { tap(); setEtape('quiz'); }} />
          <GrandeCarte icone="list" titre={traduire('Je sais déjà ce que je veux')} sous={traduire('PPL, Upper Lower, Full body')} onPress={() => { tap(); setEtape('liste'); }} />
        </View>
      ) : null}

      {etape === 'quiz' ? (
        <View style={{ gap: 22, paddingHorizontal: 4 }}>
          <Choix
            grand
            on={debuter}
            icone="book"
            label={traduire('Je n’y connais rien')}
            sous={traduire('YOROI te guide pas à pas')}
            onPress={() => basculerObjectif('debuter')}
          />
          <Bloc titre={traduire('Tes objectifs')} sous={traduire('Plusieurs choix possibles')}>
            {OBJECTIFS_CHOIX.filter((o) => o.key !== 'debuter').map((o) => (
              <Puce key={o.key} label={traduire(o.label)} on={q.objectifs.includes(o.key)} onPress={() => basculerObjectif(o.key)} />
            ))}
          </Bloc>
          {debuter ? null : (
            <Bloc titre={course ? traduire('Tu cours déjà 30 minutes sans t’arrêter ?') : traduire('Depuis quand tu t’entraînes')}>
              {course ? (
                <>
                  <Puce label={traduire('Non, pas encore')} on={q.niveau === 'debutant'} onPress={() => { tap(); setQ((x) => ({ ...x, niveau: 'debutant' })); }} />
                  <Puce label={traduire('Oui')} on={q.niveau === 'intermediaire'} onPress={() => { tap(); setQ((x) => ({ ...x, niveau: 'intermediaire' })); }} />
                </>
              ) : (
                NIVEAUX.map((n) => <Puce key={n.key} label={traduire(n.label)} on={q.niveau === n.key} onPress={() => { tap(); setQ((x) => ({ ...x, niveau: n.key })); }} />)
              )}
            </Bloc>
          )}
          <Bloc titre={traduire('Jours par semaine pour t’entraîner')}>
            {JOURS.map((j) => (
              <Puce key={j} rond label={j === 5 ? traduire('5 ou plus') : String(j)} on={q.jours === j} onPress={() => { tap(); setQ((x) => ({ ...x, jours: j })); }} />
            ))}
          </Bloc>
          <View style={{ gap: 10 }}>
            <Ink size={16} weight="black" tight>{traduire('Où tu t’entraînes')}</Ink>
            {LIEUX.map((l) => (
              <Choix key={l.key} icone={l.icone} label={traduire(l.label)} on={q.lieu === l.key} onPress={() => { tap(); setQ((x) => ({ ...x, lieu: l.key })); }} />
            ))}
          </View>
          {quizComplet ? (
            <BigButton label={traduire('Voir mon programme')} icon="check" onPress={() => voirResultat('quiz')} />
          ) : (
            <Ink size={13} color={c.textMuted} style={{ textAlign: 'center' }}>{traduire('Réponds aux questions pour voir ton programme.')}</Ink>
          )}
        </View>
      ) : null}

      {etape === 'liste' ? (
        <View style={{ gap: 14, paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {GROUPES_PROGRAMMES.map((g) => <Puce key={g.id} label={traduire(g.label)} on={groupe === g.id} onPress={() => { tap(); setGroupe(g.id); }} />)}
          </View>
          <View style={{ gap: 10 }}>
            {(GROUPES_PROGRAMMES.find((g) => g.id === groupe)?.ids ?? []).map((id) => {
              const p = programmeParId(id);
              if (!p) return null;
              return (
                <Choix
                  key={id}
                  label={traduire(p.titre)}
                  sous={traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin)}
                  on={choisi === id}
                  fleche
                  onPress={() => voirResultat('liste', id)}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {etape === 'resultat' && prog ? (
        <View style={{ gap: 18, paddingHorizontal: 4 }}>
          <View style={{ gap: 6, padding: 18, borderRadius: 24, backgroundColor: c.accentTint }}>
            <Ink size={12} weight="extraBold" color={c.accent}>{traduire('TON PROGRAMME')}</Ink>
            <Ink size={22} weight="black" tight>{traduire(prog.titre)}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('{0} j par semaine, {1} min', prog.joursParSemaine, prog.dureeMin)}</Ink>
            {chemin === 'quiz' && conseil ? <Ink size={13} color={c.textSecondary} numberOfLines={3}>{traduire(conseil.pourquoi)}</Ink> : null}
            {remplaces && remplaces(prog) > 0 ? (
              <Ink size={12} weight="extraBold" color={c.accent}>
                {traduirePluriel(remplaces(prog), remplaces(prog) > 1, 'Adapté à ta salle : {0} exercice remplacé', 'Adapté à ta salle : {0} exercices remplacés', remplaces(prog))}
              </Ink>
            ) : null}
          </View>

          {possibles.length ? (
            <View style={{ gap: 10 }}>
              <Ink size={16} weight="black" tight>{traduire('Ajoute à ton programme')}</Ink>
              <GrilleModules possibles={possibles} modules={modules} onBasculer={basculerModule} />
            </View>
          ) : null}

          {modules.includes('cardio') ? (
            <Bloc titre={traduire('Durée du cardio')}>
              {MINUTES_FIN.map((m) => <Puce key={m} label={traduire('{0} min', m)} on={minutes === m} onPress={() => { tap(); setMinutes(m); }} />)}
            </Bloc>
          ) : null}

          {aDesJoursMarche(prog) ? (
            <Bloc titre={traduire('Les séances de marche du programme')}>
              <Puce label={traduire('Je les garde')} on={!sansMarche} onPress={() => { tap(); setSansMarche(false); }} />
              <Puce label={traduire('Je les retire')} on={sansMarche} onPress={() => { tap(); setSansMarche(true); }} />
            </Bloc>
          ) : null}

          {chemin === 'quiz' && conseil?.guideDebutant ? (
            <Choix icone="scale" label={traduire('Trouver ton poids de départ')} fleche on={false} onPress={() => { tap(); setGuide(true); }} />
          ) : null}

          <View style={{ gap: 10 }}>
            <BigButton label={traduire('Commencer')} icon="play" onPress={() => void lancer()} />
            <BigButton label={traduire('Voir le programme')} tone="soft" onPress={() => onVoir(prog.id, lieu)} />
          </View>

          {chemin === 'quiz' && conseil?.autres.length ? (
            <View style={{ gap: 2 }}>
              {conseil.autres.slice(0, 2).map((id) => {
                const a = programmeParId(id);
                return a ? (
                  <Pressable key={id} onPress={() => { tap(); onVoir(id, lieu); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Ink size={14} weight="extraBold" color={c.accent} numberOfLines={1}>{traduire('Te va aussi : {0}', traduire(a.titre))}</Ink>
                  </Pressable>
                ) : null;
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      <FeuillePoidsDeDepart visible={guide} onClose={() => setGuide(false)} />
    </Sheet>
  );
}

/** Les deux chemins de l'accueil : grandes cartes claires, bord indigo */
function GrandeCarte({ icone, titre, sous, onPress }: { icone: IconName; titre: string; sous: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titre}
      style={({ pressed }) => ({ minHeight: 132, borderRadius: 26, padding: 20, gap: 10, justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.accentTint, borderWidth: 1.5, borderColor: c.accent })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent }}>
        <Icon name={icone} size={24} color="#FFFFFF" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={20} weight="black" tight>{titre}</Ink>
          <Ink size={13} color={c.textSecondary} numberOfLines={1}>{sous}</Ink>
        </View>
        <Icon name="chevron" size={20} color={c.accent} />
      </View>
    </Pressable>
  );
}

/** Une question : un titre court, des puces aerees */
function Bloc({ titre, sous, children }: { titre: string; sous?: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Ink size={16} weight="black" tight>{titre}</Ink>
        {sous ? <Ink size={12} color={c.textMuted}>{sous}</Ink> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

/** Puce : indigo pleine quand elle est choisie, claire sinon */
function Puce({ label, on, onPress, rond }: { label: string; on: boolean; onPress: () => void; rond?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({
        minHeight: 46,
        minWidth: rond ? 54 : undefined,
        paddingHorizontal: 16,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.surface,
        borderWidth: 1.5,
        borderColor: on ? c.accent : c.divider,
      })}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? '#FFFFFF' : c.ink}>{label}</Ink>
    </Pressable>
  );
}

/** Ligne de choix pleine largeur (lieu, programme de la liste) */
function Choix({ label, sous, on, onPress, icone, grand, fleche }: { label: string; sous?: string; on: boolean; onPress: () => void; icone?: IconName; grand?: boolean; fleche?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const fg = on ? '#FFFFFF' : c.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: grand ? 76 : 60,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: on ? c.accent : pressed ? c.fillSubtle : grand ? c.accentTint : c.surface,
        borderWidth: 1.5,
        borderColor: on || grand ? c.accent : c.divider,
      })}
    >
      {icone ? <Icon name={icone} size={grand ? 24 : 20} color={on ? '#FFFFFF' : c.accent} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={grand ? 17 : 15} weight="black" tight color={fg} numberOfLines={2}>{label}</Ink>
        {sous ? <Ink size={12} color={on ? 'rgba(255,255,255,0.85)' : c.textSecondary} numberOfLines={1}>{sous}</Ink> : null}
      </View>
      {on ? <Icon name="check" size={18} color="#FFFFFF" strokeWidth={2.6} /> : fleche ? <Icon name="chevron" size={18} color={c.accent} /> : null}
    </Pressable>
  );
}
