/**
 * Programmes (24 octobre 2026) : des seances de musculation pretes a suivre, basees sur des etudes.
 * 1. ton programme en cours : la semaine, la prochaine seance, un bouton pour la commencer ;
 * 2. « Trouver mon programme » : quatre questions, un conseil, sans calcul cache (lib/v2/programmes/choix.ts) ;
 * 3. tous les programmes, avec niveau, jours par semaine et duree.
 * La seance s'ouvre dans la saisie muscu habituelle, exercices et charges deja remplis (lib/v2/programmes/progression.ts).
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, Chip, Glass, SectionTitle, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { getProfile } from '@/lib/database';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { etudesCourtes } from '@/lib/v2/programmes/sources';
import { PROGRAMMES, programmeParId, libelleNiveau, libelleMateriel, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { OBJECTIFS_CHOIX, conseillerProgramme } from '@/lib/v2/programmes/choix';
import { GUIDES } from '@/lib/v2/programmes/conseils';
import { routeDuJour } from '@/lib/v2/programmes/lancer';
import type { Conseil, Reponses } from '@/lib/v2/programmes/choix';
import { EQUIPEMENTS, TOUT_LE_MATERIEL } from '@/lib/v2/programmes/materiel';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { MessageDuJour } from '@/components/yoroi/v2/programmes/MessageDuJour';
import { CorpsZones } from '@/components/yoroi/v2/programmes/CorpsZones';
import { PlanningProgramme } from '@/components/yoroi/v2/programmes/PlanningProgramme';
import { PROGRAMME_CHANGED_EVENT, basculerFavori, chargerFavoris, chargerMateriel, enregistrerMateriel, materielDuLieu, activerSemaineLegere, arreterSemaineLegere, chargerProgrammeActif, estSemaineLegere, faitsCetteSemaine, prochainJour, proposerSemaineLegere, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Niveau, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function ProgrammesScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [femme, setFemme] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [materiel, setMateriel] = useState<Equipement[] | null>(null);
  const [materielOpen, setMaterielOpen] = useState(false);
  // 26 octobre 2026 : tes programmes favoris (étoile), en tête de page
  const [favoris, setFavoris] = useState<string[]>([]);

  useEffect(() => {
    const charger = () => {
      chargerProgrammeActif().then(setActif).catch(() => setActif(null));
      chargerMateriel().then(setMateriel).catch(() => setMateriel(null));
      chargerFavoris().then(setFavoris).catch(() => setFavoris([]));
    };
    charger();
    getProfile().then((p) => setFemme(p?.avatar_gender === 'femme')).catch(() => {});
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
    return () => sub.remove();
  }, []);

  const suite = actif ? prochainJour(actif) : null;
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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire('Programmes')} sousTitre={traduire('des séances prêtes à suivre, basées sur des études')} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

        {programmesFavoris.length ? (
          <>
            <SectionTitle title={traduire('Tes favoris')} />
            {programmesFavoris.map((p) => (
              <CarteProgramme key={`fav-${p.id}`} p={p} femme={femme} enCours={actif?.id === p.id} favori onFavori={() => etoile(p.id)} onPress={() => ouvrirProgramme(p.id)} />
            ))}
          </>
        ) : null}

        {/* 24 octobre 2026 : perdu a la salle ? tu touches tes zones, YOROI fait ta seance (app/programmes/zones.tsx) */}
        <Pressable onPress={() => { tap(); router.push('/programmes/zones' as any); }} accessibilityRole="button" style={({ pressed }) => ({ borderRadius: 24, padding: 18, gap: 6, backgroundColor: pressed ? c.fillSubtle : c.accentTint, borderWidth: 1.5, borderColor: c.accent, flexDirection: 'row', alignItems: 'center' })}>
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={12} weight="extraBold" color={c.accent}>{traduire('PERDU À LA SALLE ?')}</Ink>
            <Ink size={20} weight="black" tight>{traduire('Je choisis mes zones')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Touche les fessiers, les abdos, les bras sur le corps : YOROI te dit quoi faire, combien, et quand tu verras des résultats.')}</Ink>
          </View>
          <CorpsMini />
        </Pressable>

        {actif && suite ? (
          <View style={{ borderRadius: 24, backgroundColor: c.darkCard, overflow: 'hidden', padding: 18, gap: 12 }}>
            {sportImage(sportDuProgramme(suite.programme), femme, 1) ? (
              <Image source={sportImage(sportDuProgramme(suite.programme), femme, 1)!} style={{ position: 'absolute', right: -8, bottom: -60, width: 130, height: 180, opacity: 0.95 }} resizeMode="contain" />
            ) : null}
            <View style={{ gap: 3, maxWidth: '66%' }}>
              <Ink size={13} weight="bold" color={c.onDarkSecondary}>{traduire('Ton programme, semaine {0}', semaineDuProgramme(actif))}</Ink>
              <Ink size={22} weight="black" tight color={c.onDark}>{traduire(suite.programme.titre)}</Ink>
              <Ink size={13} color={c.onDarkSecondary}>
                {traduirePluriel(faitsCetteSemaine(actif), faitsCetteSemaine(actif) > 1, '{0} séance sur {1} cette semaine', '{0} séances sur {1} cette semaine', faitsCetteSemaine(actif), suite.programme.joursParSemaine)}
              </Ink>
            </View>
            <View style={{ gap: 2, maxWidth: '66%' }}>
              <Ink size={12} weight="bold" color={c.onDarkSecondary}>{traduire('Prochaine séance')}</Ink>
              <Ink size={17} weight="extraBold" color={c.onDark} numberOfLines={2}>{traduire('Jour {0}, {1}', suite.index + 1, traduire(suite.jour.titre))}</Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <Pressable onPress={commencer} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 18, borderRadius: 16, backgroundColor: pressed ? c.accentTint : '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8 })}>
                <Icon name="play" size={16} color={c.accent} />
                <Ink size={15} weight="extraBold" color={c.accent}>{traduire('Commencer')}</Ink>
              </Pressable>
              <Pressable onPress={() => { tap(); router.push({ pathname: '/programmes/[id]' as any, params: { id: suite.programme.id } }); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 16, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.16)' })}>
                <Ink size={15} weight="extraBold" color={c.onDark}>{traduire('Voir le programme')}</Ink>
              </Pressable>
            </View>
          </View>
        ) : null}

        {actif && suite ? <MessageDuJour programme={suite.programme} /> : null}
        {actif && suite ? <PlanningProgramme programme={suite.programme} /> : null}

        {actif && suite && estSemaineLegere(actif) ? (
          <Glass style={{ gap: 8, borderColor: c.accent }}>
            <Ink size={16} weight="black" tight>{traduire('Semaine légère en cours')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Jusqu’au {0} : moitié moins de séries, même charge. Tes séances sont déjà ajustées.', dateCourte(actif.legereJusquau!))}</Ink>
            <Pressable onPress={() => { tap(); void arreterSemaineLegere(); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accent}>{traduire('Revenir aux séances normales')}</Ink>
            </Pressable>
          </Glass>
        ) : actif && suite && proposerSemaineLegere(actif) ? (
          <Glass style={{ gap: 8 }}>
            <Ink size={16} weight="black" tight>{traduire('C’est le moment d’une semaine légère')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Toutes les 4 à 8 semaines, une semaine plus légère aide à récupérer : moitié moins de séries, même charge. Si tu te sens fatigué, tu peux la faire plus tôt.')}</Ink>
            <BigButton label={traduire('Faire une semaine légère')} tone="soft" onPress={() => void activerSemaineLegere()} />
          </Glass>
        ) : null}

        {!actif || !suite ? (
          <Glass style={{ gap: 10 }}>
            <Ink size={18} weight="black" tight>{traduire('Tu ne sais pas lequel choisir ?')}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire('Quatre questions et YOROI te conseille le programme qui colle à ton objectif, ton niveau et ton temps.')}</Ink>
            <BigButton label={traduire('Trouver mon programme')} icon="target" onPress={() => setQuizOpen(true)} />
          </Glass>
        ) : null}

        <Glass onPress={() => setMaterielOpen(true)} label={traduire('Mon matériel')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="dumbbell" size={22} color={c.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={16} weight="black" tight>{traduire('Mon matériel')}</Ink>
            <Ink size={12} color={c.textSecondary} numberOfLines={2}>
              {materiel === null
                ? traduire('Dis ce que tu as : les exercices impossibles seront remplacés tout seuls.')
                : materiel.length === 0
                  ? traduire('Sans matériel : tout se fait au poids du corps.')
                  : materiel.length === TOUT_LE_MATERIEL.length
                    ? traduire('Salle complète : les programmes tels quels.')
                    : materiel.map((m) => traduire(EQUIPEMENTS.find((e) => e.id === m)?.label ?? m)).join(', ')}
            </Ink>
          </View>
          <Icon name="chevron" size={18} color={c.textMuted} />
        </Glass>

        <SectionTitle title={traduire('Conseils')} sub={traduire('l’essentiel, appuyé sur des études')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 10 }}>
          {GUIDES.map((g) => (
            <Glass key={g.id} onPress={() => router.push({ pathname: '/programmes/conseil/[id]' as any, params: { id: g.id } })} label={traduire(g.titre)} style={{ width: 210, minHeight: 120, gap: 6, justifyContent: 'space-between' }}>
              <View style={{ gap: 4 }}>
                <Ink size={16} weight="black" tight numberOfLines={2}>{traduire(g.titre)}</Ink>
                <Ink size={12} color={c.textSecondary} numberOfLines={2}>{traduire(g.accroche)}</Ink>
              </View>
              <Ink size={12} weight="extraBold" color={c.accent}>{traduire('Lire')}</Ink>
            </Glass>
          ))}
        </ScrollView>

        <SectionTitle title={traduire('Tous les programmes')} action={actif ? traduire('Trouver le mien') : undefined} onAction={() => setQuizOpen(true)} />
        {PROGRAMMES.map((p) => (
          <CarteProgramme key={p.id} p={p} femme={femme} enCours={actif?.id === p.id} favori={favoris.includes(p.id)} onFavori={() => etoile(p.id)} onPress={() => ouvrirProgramme(p.id)} />
        ))}

        <View style={{ paddingHorizontal: 4, gap: 6, marginTop: 4 }}>
          <Ink size={12} color={c.textMuted}>{traduire('Chaque programme indique ses sources scientifiques, ouvre-le pour les voir.')}</Ink>
          <Ink size={12} color={c.textMuted}>{traduire('Si tu as un problème de santé, une douleur ou une blessure, demande l’avis d’un médecin avant de commencer.')}</Ink>
        </View>
      </ScrollView>

      <Questionnaire
        visible={quizOpen}
        onClose={() => setQuizOpen(false)}
        onVoir={(id, lieu) => {
          setQuizOpen(false);
          // premier passage : le lieu du questionnaire devient ton matériel (modifiable dans Mon matériel)
          if (materiel === null) void enregistrerMateriel(materielDuLieu(lieu));
          setTimeout(() => router.push({ pathname: '/programmes/[id]' as any, params: { id } }), 300);
        }}
      />
      <ChoixMateriel visible={materielOpen} actuel={materiel} onClose={() => setMaterielOpen(false)} onValider={(liste) => { setMaterielOpen(false); void enregistrerMateriel(liste); }} />
    </View>
  );
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function dateCourte(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} ${traduire(MOIS[d.getMonth()])}`;
}

function CarteProgramme({ p, femme, enCours, favori, onFavori, onPress }: { p: Programme; femme: boolean; enCours: boolean; favori: boolean; onFavori: () => void; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const img = sportImage(sportDuProgramme(p), femme, 0);
  return (
    <Glass onPress={onPress} label={traduire(p.titre)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', overflow: 'hidden', borderColor: enCours ? c.accent : c.divider }}>
      <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.fillSubtle, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
        {img ? <Image source={img} style={{ width: 64, height: 86, marginBottom: -24 }} resizeMode="contain" /> : <Icon name="dumbbell" size={26} color={c.ink} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        {enCours ? <Ink size={11} weight="extraBold" color={c.accent}>{traduire('EN COURS')}</Ink> : null}
        <Ink size={16} weight="black" tight numberOfLines={2}>{traduire(p.titre)}</Ink>
        <Ink size={12} color={c.textSecondary} numberOfLines={2}>{traduire(p.accroche)}</Ink>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
          <Pastille texte={traduire(libelleNiveau(p.niveau))} />
          <Pastille texte={traduire('{0} j par semaine', p.joursParSemaine)} />
          <Pastille texte={traduire('{0} min', p.dureeMin)} />
          {p.sources.length ? <Pastille texte={traduirePluriel(p.sources.length, p.sources.length > 1, '{0} étude', '{0} études', p.sources.length)} accent /> : null}
          {p.materiel !== 'salle' ? <Pastille texte={traduire(libelleMateriel(p.materiel))} /> : null}
        </View>
      </View>
      <Pressable
        onPress={() => { tap(); onFavori(); }}
        accessibilityRole="button"
        accessibilityState={{ selected: favori }}
        accessibilityLabel={traduire(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')}
        hitSlop={6}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -6 }}
      >
        <Icon name="star" size={22} color={favori ? c.accent : c.textMuted} fill={favori ? c.accent : undefined} />
      </Pressable>
    </Glass>
  );
}

function Pastille({ texte, accent }: { texte: string; accent?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.fillSubtle }}>
      <Ink size={11} weight={accent ? 'extraBold' : 'bold'} color={accent ? c.accent : c.textSecondary}>{texte}</Ink>
    </View>
  );
}

const NIVEAUX: { key: Niveau; label: string }[] = [
  { key: 'debutant', label: 'Moins de 6 mois' },
  { key: 'intermediaire', label: '6 mois à 2 ans' },
  { key: 'confirme', label: 'Plus de 2 ans' },
];
const JOURS: Reponses['jours'][] = [2, 3, 4, 5, 6];

function Questionnaire({ visible, onClose, onVoir }: { visible: boolean; onClose: () => void; onVoir: (id: string, lieu: Reponses['lieu']) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [r, setR] = useState<Partial<Reponses>>({});
  const complet = !!(r.objectif && r.niveau && r.jours && r.lieu);
  const conseil: Conseil | null = complet ? conseillerProgramme(r as Reponses) : null;
  const prog = conseil ? programmeParId(conseil.id) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Trouver mon programme')}>
      <Question titre={traduire('Ton objectif')}>
        {OBJECTIFS_CHOIX.map((o) => <Chip key={o.key} label={traduire(o.label)} on={r.objectif === o.key} onPress={() => setR((x) => ({ ...x, objectif: o.key }))} />)}
      </Question>
      <Question titre={r.objectif === 'course' ? traduire('Tu cours déjà 30 minutes sans t’arrêter ?') : traduire('Depuis quand tu t’entraînes')}>
        {r.objectif === 'course' ? (
          <>
            <Chip label={traduire('Non, pas encore')} on={r.niveau === 'debutant'} onPress={() => setR((x) => ({ ...x, niveau: 'debutant' }))} />
            <Chip label={traduire('Oui')} on={r.niveau === 'intermediaire'} onPress={() => setR((x) => ({ ...x, niveau: 'intermediaire' }))} />
          </>
        ) : (
          NIVEAUX.map((o) => <Chip key={o.key} label={traduire(o.label)} on={r.niveau === o.key} onPress={() => setR((x) => ({ ...x, niveau: o.key }))} />)
        )}
      </Question>
      <Question titre={traduire('Jours par semaine pour t’entraîner')}>
        {JOURS.map((j) => <Chip key={j} label={j === 5 ? traduire('5 ou plus') : String(j)} on={r.jours === j} onPress={() => setR((x) => ({ ...x, jours: j }))} />)}
      </Question>
      <Question titre={traduire('Où tu t’entraînes')}>
        <Chip label={traduire('En salle')} on={r.lieu === 'salle'} onPress={() => setR((x) => ({ ...x, lieu: 'salle' }))} />
        <Chip label={traduire('À la maison, avec des haltères')} on={r.lieu === 'halteres'} onPress={() => setR((x) => ({ ...x, lieu: 'halteres' }))} />
        <Chip label={traduire('À la maison, sans matériel')} on={r.lieu === 'maison'} onPress={() => setR((x) => ({ ...x, lieu: 'maison' }))} />
      </Question>

      {conseil && prog ? (
        <View style={{ gap: 10, marginTop: 4, padding: 16, borderRadius: 20, backgroundColor: c.accentTint, borderWidth: 1, borderColor: c.accent + '33' }}>
          <Ink size={12} weight="extraBold" color={c.accent}>{traduire('TON PROGRAMME')}</Ink>
          <Ink size={19} weight="black" tight>{traduire(prog.titre)}</Ink>
          <Ink size={14} color={c.textSecondary}>{traduire(conseil.pourquoi)}</Ink>
          <BigButton label={traduire('Voir ce programme')} onPress={() => onVoir(prog.id, r.lieu!)} />
          {conseil.autres.map((id) => {
            const a = programmeParId(id);
            return a ? (
              <Pressable key={id} onPress={() => { tap(); onVoir(id, r.lieu!); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                <Ink size={14} weight="extraBold" color={c.accent}>{traduire('Te va aussi : {0}', traduire(a.titre))}</Ink>
              </Pressable>
            ) : null;
          })}
        </View>
      ) : (
        <Ink size={13} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire('Réponds aux quatre questions pour voir ton conseil.')}</Ink>
      )}
    </Sheet>
  );
}

function Question({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Ink size={15} weight="extraBold" style={{ paddingHorizontal: 4 }}>{titre}</Ink>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4 }}>{children}</View>
    </View>
  );
}

/** Mon matériel : tu coches ce que tu as. Valider sans rien cocher = sans matériel. */
function ChoixMateriel({ visible, actuel, onClose, onValider }: { visible: boolean; actuel: Equipement[] | null; onClose: () => void; onValider: (liste: Equipement[]) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [liste, setListe] = useState<Equipement[]>(actuel ?? TOUT_LE_MATERIEL);
  useEffect(() => {
    if (visible) setListe(actuel ?? TOUT_LE_MATERIEL);
  }, [visible, actuel]);
  const basculer = (id: Equipement) => setListe((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Mon matériel')}>
      <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
        {traduire('Coche ce que tu as, chez toi ou à ta salle. Chaque exercice que tu ne peux pas faire est remplacé par le plus proche, pour le même muscle.')}
      </Ink>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 4 }}>
        <Chip label={traduire('Salle complète')} on={liste.length === TOUT_LE_MATERIEL.length} onPress={() => setListe([...TOUT_LE_MATERIEL])} />
        <Chip label={traduire('Rien du tout')} on={liste.length === 0} onPress={() => setListe([])} />
      </View>
      <View style={{ gap: 6 }}>
        {EQUIPEMENTS.map((e) => {
          const on = liste.includes(e.id);
          return (
            <Pressable
              key={e.id}
              onPress={() => { tap(); basculer(e.id); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={traduire(e.label)}
              style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: pressed ? c.fillSubtle : on ? c.accentTint : 'transparent', borderWidth: 1, borderColor: on ? c.accent : c.divider })}
            >
              <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: on ? c.accent : c.textMuted, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={14} color={c.onAccent} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">{traduire(e.label)}</Ink>
                <Ink size={12} color={c.textSecondary}>{traduire(e.detail)}</Ink>
              </View>
            </Pressable>
          );
        })}
      </View>
      <BigButton label={traduire('Enregistrer')} onPress={() => onValider(liste)} />
    </Sheet>
  );
}

/** Petit corps de la carte « Je choisis mes zones » : vu de face, abdos, bras et cuisses colores, pour donner l'idee */
function CorpsMini() {
  return (
    <View pointerEvents="none" style={{ marginLeft: 8 }}>
      <CorpsZones cote="devant" choisies={['abdos', 'bras', 'quadriceps']} onToggle={() => {}} hauteur={120} interactif={false} />
    </View>
  );
}
