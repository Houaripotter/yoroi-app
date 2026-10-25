/**
 * Detail d'un programme (24 octobre 2026) : pour qui, comment le suivre, chaque jour avec ses exercices,
 * et les etudes sur lesquelles il repose. Commencer, changer de programme ou l'arreter se fait ici.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, Chip, Glass, SectionTitle, Stat, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { getActiveInjuries, getMeasurements, getProfile, getTrainings, getWeights } from '@/lib/database';
import type { Measurement, Training, Weight } from '@/lib/database';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { saisieDepuisKg } from '@/lib/v2/unitePoids';
import { fmtNum } from '@/lib/v2/seance/format';
import { corpsDepuis, progresDesCharges, regularite } from '@/lib/v2/programmes/progres';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { safeOpenURL } from '@/lib/security/validators';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { libelleMateriel, libelleNiveau, libelleRepos, programmeParId, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { cardioDeLaSemaine, resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { raisonRemplacement } from '@/lib/v2/programmes/materiel';
import { LIBELLE_REGION, protegerJour, regionsDesBlessures } from '@/lib/v2/programmes/blessures';
import type { ExoProtege, Region } from '@/lib/v2/programmes/blessures';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { FicheTechnique } from '@/components/yoroi/v2/programmes/FicheTechnique';
import { ficheDe } from '@/lib/v2/programmes/fiches';
import { DUREES_EXPRESS, dureeEstimee, seanceExpress } from '@/lib/v2/programmes/express';
import { demoDe } from '@/lib/v2/programmes/demos';
import { PROGRAMME_CHANGED_EVENT, arreterProgramme, chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerJours, joursConseilles, joursDuProgramme, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { ChoixJours } from '@/components/yoroi/v2/programmes/ChoixJours';
import { CoachProgramme } from '@/components/yoroi/v2/programmes/CoachProgramme';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { traduire } from '@/lib/i18n/tr';

export default function ProgrammeDetail() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const p = programmeParId(typeof id === 'string' ? id : undefined);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [materiel, setMateriel] = useState<Equipement[] | null>(null);
  const [pesees, setPesees] = useState<Weight[]>([]);
  // douleurs declarees dans l'infirmerie : les exercices qui chargent la zone sont remplaces ou signales
  const [regions, setRegions] = useState<Region[]>([]);
  const [mesures, setMesures] = useState<Measurement[]>([]);
  const unite = useUnitePoids();
  // 25 octobre 2026 : tes jours d'entraînement (0 = lundi), choisis avant de commencer, modifiables ensuite
  const [jours, setJours] = useState<number[]>(() => joursConseilles(p?.joursParSemaine ?? 3));
  useEffect(() => {
    if (p && actif?.id === p.id) setJours(joursDuProgramme(actif, p));
  }, [p, actif]);

  useEffect(() => {
    const charger = () =>
      chargerProgrammeActif()
        .then(setActif)
        .catch(() => setActif(null))
        .finally(() => setCharge(true));
    charger();
    const lireMateriel = () => chargerMateriel().then(setMateriel).catch(() => setMateriel(null));
    lireMateriel();
    const subMateriel = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lireMateriel);
    getProfile().then((pr) => setFemme(pr?.avatar_gender === 'femme')).catch(() => {});
    const lireSeances = () => {
      getTrainings().then((t) => setTrainings(t ?? [])).catch(() => {});
      // ton corps depuis le debut du programme : poids moyen et tour de taille
      getWeights(400).then((w) => setPesees(w ?? [])).catch(() => {});
      getMeasurements(400).then((m) => setMesures(m ?? [])).catch(() => {});
      getActiveInjuries().then((b) => setRegions(regionsDesBlessures(b ?? []))).catch(() => setRegions([]));
    };
    lireSeances();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
    const subSeances = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, lireSeances);
    return () => {
      sub.remove();
      subSeances.remove();
      subMateriel.remove();
    };
  }, []);

  useEffect(() => {
    if (p && charge && ouvert === null) setOuvert(p.jours[actif?.id === p.id ? actif.prochain : 0]?.id ?? null);
  }, [p, actif, ouvert, charge]);

  if (!p) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingHorizontal: 22 }}>
        <EnTete titre={traduire('Programme introuvable')} repli="/programmes" style={{ marginHorizontal: -22, marginTop: -8 }} />
      </View>
    );
  }

  const enCours = actif?.id === p.id;
  // semaine du plan (course) : celle du programme en cours, sinon la premiere
  const semaine = enCours && actif ? semaineDuProgramme(actif) : 1;
  const img = sportImage(sportDuProgramme(p), femme, 1);

  const lancerJour = (jourId: string, express?: number) => {
    const j = p.jours.find((x) => x.id === jourId);
    if (!j) return;
    tap();
    const r = routeDuJour(p, j, semaine);
    router.push({ pathname: r.pathname as any, params: express ? { ...r.params, express: String(express) } : r.params });
  };

  // pas le temps : la seance raccourcie, avec ce qui est garde et ce qui est reporte, avant de commencer
  const proposerExpress = (index: number, minutes: number) => {
    const j = p.jours[index];
    // le meme calcul que la seance lancee (app/seance/muscu.tsx) : ton materiel et tes douleurs d'abord, puis l'express
    const protege = protegerJour(j, materiel, regions);
    const x = seanceExpress(protege.exos, minutes);
    const garde = x.exos.map((e) => traduire('{0} : {1} séries', traduire(nomFr(e.nom)), e.series)).join('\n');
    const reporte = x.reportes.length ? `\n\n${traduire('À faire une autre fois : {0}.', x.reportes.map((n) => traduire(nomFr(n))).join(', '))}` : '';
    appAlert(traduire('Séance express, {0} min', minutes), `${garde}${reporte}\n\n${traduire('Moins de séries reste utile : c’est mieux que de sauter la séance.')}`, [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Commencer'), onPress: () => lancerJour(j.id, minutes) },
    ]);
  };

  const commencerProgramme = async () => {
    const go = async () => {
      await demarrerProgramme(p.id, jours);
      lancerJour(p.jours[0].id);
    };
    if (actif && actif.id !== p.id) {
      const ancien = programmeParId(actif.id);
      appAlert(traduire('Changer de programme ?'), traduire('Tu suis « {0} ». Tes séances déjà faites restent dans ton historique.', traduire(ancien?.titre ?? '')), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Changer'), onPress: () => void go() },
      ]);
      return;
    }
    await go();
  };

  const arreter = () => {
    appAlert(traduire('Arrêter ce programme ?'), traduire('Tes séances déjà faites restent dans ton historique.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Arrêter'), style: 'destructive', onPress: () => void arreterProgramme() },
    ]);
  };

  // la seance choisie s'ouvre ; le programme n'avance que si tu l'enregistres
  const faireCeJour = (index: number) => lancerJour(p.jours[index].id);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire(p.titre)} sousTitre={`${traduire(libelleNiveau(p.niveau))}, ${traduire(libelleMateriel(p.materiel)).toLowerCase()}`} repli="/programmes" style={{ marginHorizontal: -22, marginTop: -8 }} />

        <View style={{ borderRadius: 24, backgroundColor: c.darkCard, overflow: 'hidden', padding: 18, minHeight: 130, justifyContent: 'center' }}>
          {img ? <Image source={img} style={{ position: 'absolute', right: -6, bottom: -58, width: 130, height: 180 }} resizeMode="contain" /> : null}
          <Ink size={16} weight="bold" color={c.onDark} style={{ maxWidth: '64%', lineHeight: 22 }}>{traduire(p.accroche)}</Ink>
        </View>

        {enCours && actif ? (
          <CoachProgramme
            message={messageCoach({ programme: p, actif, jours, prochaineSeance: traduire(p.jours[actif.prochain]?.titre ?? ''), femme })}
            onCommencer={() => faireCeJour(actif.prochain)}
          />
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stat value={String(p.joursParSemaine)} label={traduire('Jours par semaine')} />
          <Stat value={String(p.dureeMin)} unit="min" label={traduire('Par séance')} />
          <Stat value={String(p.semaines)} label={traduire('Semaines')} />
        </View>

        <ChoixJours
          jours={jours}
          prevus={p.joursParSemaine}
          onChange={(d) => {
            setJours(d);
            if (enCours) void enregistrerJours(d);
          }}
        />

        {enCours && actif ? (() => {
          const sem = semaineDuProgramme(actif);
          const reg = regularite(p, actif, sem);
          const charges = progresDesCharges(p, trainings, actif.debut).slice(0, 6);
          const corps = corpsDepuis(actif.debut, pesees, mesures);
          const kg = (v: number) => (unite === 'lb' ? traduire('{0} lb', fmtNum(saisieDepuisKg(v, unite))) : traduire('{0} kg', fmtNum(v)));
          return (
            <>
              <SectionTitle title={traduire('Tes progrès')} sub={traduire('depuis le début du programme, semaine {0}', sem)} />
              <Glass style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Stat value={String(actif.faits.filter((f) => f.date >= actif.debut).length)} label={traduire('Séances faites')} />
                  {reg ? <Stat value={`${Math.round((reg.faites / reg.prevues) * 100)}`} unit="%" label={traduire('Régularité')} /> : null}
                </View>
                {reg ? <Ink size={12} color={c.textMuted}>{traduire('{0} séances sur {1} prévues pendant les semaines terminées.', reg.faites, reg.prevues)}</Ink> : null}
                {corps.poidsDebut !== null && corps.poidsActuel !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={14} weight="extraBold">{traduire('Poids, moyenne de la semaine')}</Ink>
                      <Ink size={12} color={c.textSecondary}>{`${kg(corps.poidsDebut)} → ${kg(corps.poidsActuel)}`}</Ink>
                    </View>
                    <Ink size={16} weight="black" color={c.textSecondary}>{`${corps.poidsActuel - corps.poidsDebut > 0 ? '+' : ''}${fmtNum(Math.round((saisieDepuisKg(corps.poidsActuel, unite) - saisieDepuisKg(corps.poidsDebut, unite)) * 10) / 10)}`}</Ink>
                  </View>
                ) : null}
                {corps.tailleDebut !== null && corps.tailleActuelle !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={14} weight="extraBold">{traduire('Tour de taille')}</Ink>
                      <Ink size={12} color={c.textSecondary}>{traduire('{0} cm → {1} cm', fmtNum(corps.tailleDebut), fmtNum(corps.tailleActuelle))}</Ink>
                    </View>
                    <Ink size={16} weight="black" color={corps.tailleActuelle < corps.tailleDebut ? c.accent : c.textSecondary}>{`${corps.tailleActuelle - corps.tailleDebut > 0 ? '+' : ''}${fmtNum(Math.round((corps.tailleActuelle - corps.tailleDebut) * 10) / 10)} cm`}</Ink>
                  </View>
                ) : (
                  <Pressable onPress={() => { tap(); router.push('/measurements' as any); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Ink size={13} weight="extraBold" color={c.accent}>{traduire('Mesure ton tour de taille chaque semaine : c’est là que le résultat se voit en premier.')}</Ink>
                  </Pressable>
                )}
                {charges.length > 0 ? (
                  charges.map((x, k) => (
                    <View key={x.nom} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: k === 0 ? 0 : 1, borderColor: c.divider }}>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Ink size={14} weight="extraBold" numberOfLines={1}>{traduire(nomFr(x.nom))}</Ink>
                        <Ink size={12} color={c.textSecondary}>{`${kg(x.debutKg)} → ${kg(x.actuelKg)}`}</Ink>
                      </View>
                      <Ink size={16} weight="black" color={x.gainPct > 0 ? c.accent : c.textSecondary}>{x.gainPct > 0 ? `+${x.gainPct} %` : `${x.gainPct} %`}</Ink>
                    </View>
                  ))
                ) : (
                  <Ink size={13} color={c.textSecondary}>{traduire('Tes charges apparaîtront ici après deux séances sur un même exercice.')}</Ink>
                )}
              </Glass>
            </>
          );
        })() : null}

        <SectionTitle title={traduire('Comment le suivre')} />
        <Glass style={{ gap: 12 }}>
          {p.principes.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Ink size={11} weight="black" color={c.accent}>{String(i + 1)}</Ink>
              </View>
              <Ink size={14} style={{ flex: 1, lineHeight: 20 }}>{traduire(t)}</Ink>
            </View>
          ))}
        </Glass>

        <SectionTitle title={traduire('Les séances')} sub={traduire('Touche une séance pour voir ses exercices')} />
        {p.jours.map((jBrut, index) => {
          const j = protegerJour(jBrut, materiel, regions);
          const estProchain = enCours && actif!.prochain === index;
          const deplie = ouvert === j.id;
          return (
            <Glass key={j.id} style={{ gap: 10, borderColor: estProchain ? c.accent : c.divider }}>
              <Pressable onPress={() => { tap(); setOuvert(deplie ? '' : j.id); }} accessibilityRole="button" accessibilityState={{ expanded: deplie }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  {estProchain ? <Ink size={11} weight="extraBold" color={c.accent}>{traduire('PROCHAINE SÉANCE')}</Ink> : null}
                  <Ink size={17} weight="black" tight>{traduire('Jour {0}, {1}', index + 1, traduire(j.titre))}</Ink>
                  <Ink size={12} color={c.textSecondary}>{resumeDuJour(j, semaine)}</Ink>
                </View>
                <View style={{ transform: [{ rotate: deplie ? '-90deg' : '90deg' }] }}><Icon name="chevron" size={18} color={c.textMuted} /></View>
              </Pressable>
              {deplie ? (
                <>
                  {j.exos.map((e, k) => <LigneExo key={`${e.nom}${k}`} e={e} premier={k === 0} raison={e.remplace && materiel && !e.zone ? raisonRemplacement(e.remplace, materiel) : ''} />)}
                  {j.rounds
                    ? j.rounds.consignes.map((txt, k) => (
                        <View key={k} style={{ paddingTop: 10, borderTopWidth: k === 0 ? 0 : 1, borderColor: c.divider, flexDirection: 'row', gap: 10 }}>
                          <Ink size={13} weight="black" color={c.accent} style={{ width: 62 }}>{traduire('Round {0}', k + 1)}</Ink>
                          <Ink size={14} style={{ flex: 1 }}>{traduire(txt)}</Ink>
                        </View>
                      ))
                    : null}
                  {j.rounds ? <Ink size={12} color={c.textMuted}>{traduire('Repos de {0} entre les rounds.', libelleRepos(j.rounds.reposSec))}</Ink> : null}
                  {j.cardio ? (
                    <View style={{ gap: 4 }}>
                      {j.cardio.semaines?.length ? <Ink size={12} weight="extraBold" color={c.accent}>{traduire('SEMAINE {0}', Math.min(semaine, j.cardio.semaines.length))}</Ink> : null}
                      <Ink size={14} style={{ lineHeight: 20 }}>{traduire(cardioDeLaSemaine(j.cardio, semaine).consigne)}</Ink>
                      {j.cardio.semaines?.length && !enCours ? <Ink size={12} color={c.textMuted}>{traduire('La sortie change chaque semaine : YOROI te donne celle de ta semaine.')}</Ink> : null}
                    </View>
                  ) : null}
                  {enCours ? (
                    <BigButton label={estProchain ? traduire('Commencer cette séance') : traduire('Faire cette séance maintenant')} icon="play" tone={estProchain ? 'accent' : 'soft'} onPress={() => faireCeJour(index)} />
                  ) : null}
                  {enCours && j.exos.length && dureeEstimee(j.exos) > DUREES_EXPRESS[0] ? (
                    <View style={{ gap: 6 }}>
                      <Ink size={12} weight="extraBold" color={c.textSecondary}>{traduire('Pas le temps ? Séance express :')}</Ink>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {DUREES_EXPRESS.filter((m) => m < dureeEstimee(j.exos)).map((m) => (
                          <Chip key={m} label={traduire('{0} min', m)} on={false} onPress={() => proposerExpress(index, m)} />
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
            </Glass>
          );
        })}

        <SectionTitle title={traduire('Les sources')} sub={traduire('Les études sur lesquelles repose ce programme')} />
        <View style={{ gap: 8 }}>
          {p.sources.map((sid) => {
            const s = sourceParId(sid);
            if (!s) return null;
            return (
              <Glass key={sid} onPress={() => void safeOpenURL(s.lien)} label={s.titre} style={{ gap: 4, padding: 14 }}>
                <Ink size={13} weight="extraBold">{`${s.auteurs}, ${s.annee}`}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire(s.apport)}</Ink>
                <Ink size={11} color={c.textMuted} numberOfLines={2}>{`${s.titre}. ${s.revue}.`}</Ink>
              </Glass>
            );
          })}
        </View>

        <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
          {traduire('Si tu as un problème de santé, une douleur ou une blessure, demande l’avis d’un médecin avant de commencer. Le questionnaire PAR-Q+ t’aide à savoir si c’est nécessaire.')}
        </Ink>
        {enCours ? (
          <Pressable onPress={arreter} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={14} weight="extraBold" color={c.danger}>{traduire('Arrêter ce programme')}</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      {!enCours ? (
        <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 16 }}>
          <BigButton label={traduire('Commencer ce programme')} icon="play" onPress={() => void commencerProgramme()} />
        </View>
      ) : null}
    </View>
  );
}

function LigneExo({ e, premier, raison }: { e: ExoProtege; premier: boolean; raison: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  const aFiche = !!ficheDe(e.nom);
  const reps = e.repsMin === e.repsMax ? `${e.repsMin}` : traduire('{0} à {1}', e.repsMin, e.repsMax);
  // fiche technique : un tap sur « Voir la technique » deplie consignes, erreurs et securite
  const technique = aFiche ? (
    <>
      <Pressable
        onPress={() => { tap(); setOuvert((o) => !o); }}
        accessibilityRole="button"
        accessibilityState={{ expanded: ouvert }}
        hitSlop={8}
        style={{ minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' }}
      >
        <Ink size={12} weight="extraBold" color={c.accent}>{traduire(ouvert ? 'Masquer la technique' : 'Voir la technique')}</Ink>
      </Pressable>
      {ouvert ? <FicheTechnique nom={e.nom} /> : null}
    </>
  ) : null;
  const detail = e.secondes
    ? traduire('{0} séries de {1} secondes, repos {2}', e.series, reps, libelleRepos(e.reposSec))
    : traduire('{0} séries de {1} répétitions, repos {2}', e.series, reps, libelleRepos(e.reposSec));
  if (demoDe(e.nom)) {
    // avec animation : l'exercice qui bouge a gauche, le texte a droite
    return (
      <View style={{ paddingTop: 10, borderTopWidth: premier ? 0 : 1, borderColor: c.divider, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <ExoDemo nom={e.nom} taille={72} arrondi={14} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold">{traduire(nomFr(e.nom))}</Ink>
          <Ink size={13} color={c.textSecondary}>{detail}</Ink>
          {e.conseil && !e.remplace ? <Ink size={12} color={c.textMuted}>{traduire(e.conseil)}</Ink> : null}
          <NoteMateriel e={e} raison={raison} />
          {technique}
        </View>
      </View>
    );
  }
  return (
    <View style={{ paddingTop: 10, borderTopWidth: premier ? 0 : 1, borderColor: c.divider, gap: 2 }}>
      <Ink size={15} weight="extraBold">{traduire(nomFr(e.nom))}</Ink>
      <Ink size={13} color={c.textSecondary}>{detail}</Ink>
      {e.conseil && !e.remplace ? <Ink size={12} color={c.textMuted}>{traduire(e.conseil)}</Ink> : null}
      <NoteMateriel e={e} raison={raison} />
      {technique}
    </View>
  );
}

/** « Remplace Développé couché (barre), sans barre et disques » ; « Matériel manquant » si rien ne remplace */
function NoteMateriel({ e, raison }: { e: ExoProtege; raison: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (e.zone && e.impossible) return <Ink size={12} weight="bold" color={c.danger}>{traduire('Tu as signalé une douleur : {0}. Passe cet exercice, et demande l’avis d’un professionnel si elle dure.', traduire(LIBELLE_REGION[e.zone]))}</Ink>;
  if (e.zone && e.remplace) return <Ink size={12} weight="bold" color={c.accent}>{traduire('Remplace {0} pour ménager {1}', traduire(nomFr(e.remplace)), traduire(LIBELLE_REGION[e.zone]))}</Ink>;
  if (e.remplace) {
    return <Ink size={12} weight="bold" color={c.accent}>{raison ? `${traduire('Remplace {0}', traduire(nomFr(e.remplace)))} · ${traduire(raison)}` : traduire('Remplace {0}', traduire(nomFr(e.remplace)))}</Ink>;
  }
  if (e.impossible) return <Ink size={12} weight="bold" color={c.danger}>{traduire('Ton matériel ne permet pas cet exercice : passe le, ou change Mon matériel.')}</Ink>;
  return null;
}
