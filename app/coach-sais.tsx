/**
 * « J'ai un programme » (27 octobre 2026), maquettes choisies par Houari : Coach2-B-Sais (les familles) puis
 * Coach2-A-Sais (les programmes d'une famille). Ouvert depuis l'accueil du coach (app/coach.tsx).
 *  - Une recherche par nom (le titre et l'accroche des 30 programmes, dans ta langue).
 *  - Les 8 familles de GROUPES_PROGRAMMES (modules.ts) en cartes teintées, avec leur vrai nombre de programmes et
 *    leurs jours. Toucher une famille : ses programmes en cartes (niveau, jours, durée, favori). Toucher un programme :
 *    sa page (app/programmes/[id].tsx), qui le commence avec tes jours.
 *  - Tes favoris, ton programme en cours, « Pas sûr ? Réponds à quelques questions » (le Guide), et la liste complète
 *    avec Ma salle et les conseils (app/programmes/index.tsx).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { BackHandler, DeviceEventEmitter, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { Capitales, nomCourt, ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import type { FamillePastel, PastelCoach } from '@/components/yoroi/v2/programmes/Habillage';
import { MiniSemaine } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { PROGRAMMES, libelleNiveau, programmeParId } from '@/lib/v2/programmes/catalogue';
import { GROUPES_PROGRAMMES } from '@/lib/v2/programmes/modules';
import { PROGRAMME_CHANGED_EVENT, basculerFavori, chargerFavoris, chargerProgrammeActif, joursConseilles, joursDuProgramme, prochainJour, semaineDuProgramme, semainesDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import type { Niveau, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Teinte = 'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche';
/** La teinte et la petite ligne de chaque famille (maquette Coach2-B-Sais) ; sans ligne : ses jours */
const FAMILLES: Record<string, { teinte: Teinte; sous?: string }> = {
  ppl: { teinte: 'peche' },
  'upper-lower': { teinte: 'bleu' },
  'push-pull': { teinte: 'lilas' },
  'full-body': { teinte: 'menthe' },
  split: { teinte: 'creme', sous: 'Un muscle par jour' },
  objectif: { teinte: 'peche', sous: 'Masse, sèche, fessiers' },
  combat: { teinte: 'lilas', sous: 'Force, grip, sac de frappe' },
  sports: { teinte: 'menthe', sous: '5 km, 10 km, foot, padel' },
};

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** « 4 jours », « 3 ou 4 jours », « 3, 5 ou 6 jours » */
function joursDeFamille(ids: readonly string[]): string {
  const n = Array.from(new Set(ids.map((id) => programmeParId(id)?.joursParSemaine).filter((x): x is number => !!x))).sort((a, b) => a - b);
  if (!n.length) return '';
  if (n.length === 1) return traduirePluriel(n[0], n[0] > 1, '{0} jour', '{0} jours', n[0]);
  return traduire('{0} ou {1} jours', n.slice(0, -1).join(', '), n[n.length - 1]);
}

export default function CoachSais() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pa = usePastel();
  const [recherche, setRecherche] = useState('');
  const [famille, setFamille] = useState<string | null>(null);
  const [favoris, setFavoris] = useState<string[]>([]);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      const lire = () => {
        chargerFavoris().then((f) => { if (vivant) setFavoris(f); }).catch(() => {});
        chargerProgrammeActif().then((a) => { if (vivant) setActif(a); }).catch(() => {});
      };
      lire();
      const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lire);
      // Android : le retour du téléphone ferme d'abord la famille ouverte
      const retourTel = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!famille) return false;
        setFamille(null);
        return true;
      });
      return () => { vivant = false; sub.remove(); retourTel.remove(); };
    }, [famille]),
  );

  const resultats = useMemo(() => {
    const q = normal(recherche);
    if (!q) return [];
    const mots = q.split(' ');
    return PROGRAMMES.filter((p) => {
      const groupe = GROUPES_PROGRAMMES.find((g) => g.ids.includes(p.id))?.label ?? '';
      const texte = normal(`${p.titre} ${traduire(p.titre)} ${traduire(p.accroche)} ${groupe}`);
      return mots.every((m) => texte.includes(m));
    });
  }, [recherche]);

  const ouvrir = (p: Programme) => { tap(); router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } }); };
  const etoile = (id: string) => {
    tap();
    setFavoris((l) => (l.includes(id) ? l.filter((x) => x !== id) : [id, ...l]));
    void basculerFavori(id);
  };
  const retour = () => {
    tap();
    if (famille) { setFamille(null); return; }
    if (router.canGoBack()) router.back();
    else router.replace('/coach' as any);
  };

  const g = famille ? GROUPES_PROGRAMMES.find((x) => x.id === famille) ?? null : null;
  const progsFamille = g ? g.ids.map((id) => programmeParId(id)).filter((p): p is Programme => !!p) : [];
  const suite = actif ? prochainJour(actif) : null;
  const pEnCours = suite && !estProgrammePerso(suite.programme.id) ? suite.programme : null;

  const titre = g ? traduire(g.label) : traduire('Je sais ce que je veux');
  const sous = g ? traduirePluriel(progsFamille.length, progsFamille.length > 1, '{0} programme', '{0} programmes', progsFamille.length) : traduire('{0} programmes, rangés par type', PROGRAMMES.length);

  return (
    <View style={{ flex: 1, backgroundColor: pa.page }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire('Retour')} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, ombrePastel(pa.ombre)]}>
            <Icon name="chevronLeft" size={18} color={pa.texte} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Ink size={24} weight="black" color={pa.texte} accessibilityRole="header" style={{ lineHeight: 29 }}>{titre}</Ink>
            <Ink size={13} weight="bold" color={pa.texte2}>{sous}</Ink>
          </View>
        </View>

        {!g ? (
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, marginTop: 16, paddingHorizontal: 16, borderRadius: 22, backgroundColor: pa.carte }, ombrePastel(pa.ombre)]}>
            <Icon name="search" size={18} color={pa.texte2} />
            <TextInput
              value={recherche}
              onChangeText={setRecherche}
              placeholder={traduire('Tape le nom : PPL, Upper Lower...')}
              placeholderTextColor={pa.texte3}
              accessibilityLabel={traduire('Chercher un programme')}
              returnKeyType="search"
              autoCorrect={false}
              style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: '600', color: pa.texte }}
            />
            {recherche ? (
              <Pressable onPress={() => setRecherche('')} accessibilityRole="button" accessibilityLabel={traduire('Effacer')} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={16} color={pa.texte2} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* la recherche */}
        {!g && recherche.trim() ? (
          <View style={{ gap: 10, marginTop: 14 }}>
            {resultats.length ? (
              resultats.map((p) => <CarteListe key={p.id} p={p} f={pa[FAMILLES[GROUPES_PROGRAMMES.find((x) => x.ids.includes(p.id))?.id ?? '']?.teinte ?? 'bleu']} favori={favoris.includes(p.id)} onPress={() => ouvrir(p)} onEtoile={() => etoile(p.id)} />)
            ) : (
              <Ink size={14} weight="bold" color={pa.texte2} style={{ marginHorizontal: 2 }}>{traduire('Aucun programme à ce nom. Essaie PPL, fessiers ou sac de frappe.')}</Ink>
            )}
          </View>
        ) : null}

        {/* une famille ouverte : ses programmes (maquette Coach2-A-Sais) */}
        {g ? (
          <View style={{ gap: 10, marginTop: 16 }}>
            {progsFamille.map((p, k) => (
              <Animated.View key={p.id} entering={FadeInDown.duration(300).delay(40 * k)}>
              <CarteListe p={p} f={pa[FAMILLES[g.id]?.teinte ?? 'bleu']} favori={favoris.includes(p.id)} enCours={actif?.id === p.id} onPress={() => ouvrir(p)} onEtoile={() => etoile(p.id)} />
              </Animated.View>
            ))}
          </View>
        ) : null}

        {/* les familles */}
        {!g && !recherche.trim() ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {GROUPES_PROGRAMMES.map((x, k) => (
                <Animated.View key={x.id} entering={FadeInDown.duration(320).delay(30 * k)} style={{ width: '47%', flexGrow: 1 }}>
                  <CarteFamille pa={pa} id={x.id} label={traduire(x.label)} ids={x.ids} onPress={() => { tap(); setFamille(x.id); }} />
                </Animated.View>
              ))}
            </View>

            {favoris.length ? (
              <>
                <View style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}><Capitales texte={traduire('Tes favoris')} couleur={pa.creme.titre} /></View>
                <View style={{ gap: 10 }}>
                  {favoris.map((id) => programmeParId(id)).filter((p): p is Programme => !!p).map((p) => (
                    <CarteListe key={p.id} p={p} f={pa[FAMILLES[GROUPES_PROGRAMMES.find((x) => x.ids.includes(p.id))?.id ?? '']?.teinte ?? 'bleu']} favori onPress={() => ouvrir(p)} onEtoile={() => etoile(p.id)} />
                  ))}
                </View>
              </>
            ) : null}

            {pEnCours && suite && actif ? (
              <>
                <View style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}><Capitales texte={traduire('Ton programme en cours')} couleur={pa.bleu.encre} /></View>
                <Pressable
                  onPress={() => ouvrir(pEnCours)}
                  accessibilityRole="button"
                  style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}
                >
                  <View style={{ width: 64 }}><MiniSemaine jours={joursDuProgramme(actif, pEnCours)} couleur={pa.bleu.barre} vide={pa.ligne} hauteur={34} gap={2} /></View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={16} weight="black" color={pa.texte} numberOfLines={2}>{traduire(pEnCours.titre)}</Ink>
                    <Ink size={13} weight="bold" color={pa.texte2}>{semainesDuProgramme(actif, pEnCours) ? traduire('Semaine {0} sur {1}, prochaine : {2}', Math.min(semaineDuProgramme(actif), semainesDuProgramme(actif, pEnCours)!), semainesDuProgramme(actif, pEnCours)!, nomCourt(traduire(suite.jour.titre))) : traduire('Semaine {0}, prochaine : {1}', semaineDuProgramme(actif), nomCourt(traduire(suite.jour.titre)))}</Ink>
                  </View>
                  <Icon name="chevron" size={16} color={pa.texte3} />
                </Pressable>
              </>
            ) : null}

            <Pressable onPress={() => { tap(); router.push('/coach-depart' as any); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, marginTop: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Ink size={15} weight="extraBold" color={pa.surBouton} style={{ textAlign: 'center' }}>{traduire('Pas sûr ? Réponds à quelques questions')}</Ink>
            </Pressable>
            <Pressable onPress={() => { tap(); router.push('/programmes' as any); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Ink size={13} weight="bold" color={pa.texte2} style={{ textAlign: 'center' }}>{traduire('Tous les programmes, Ma salle et les conseils')}</Ink>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Une famille (maquette Coach2-B-Sais) : carte teintée, « N PROGRAMMES », le motif de sa semaine, le nom, ses jours */
function CarteFamille({ pa, id, label, ids, onPress }: { pa: PastelCoach; id: string; label: string; ids: readonly string[]; onPress: () => void }) {
  const info = FAMILLES[id] ?? { teinte: 'bleu' as Teinte };
  const f = pa[info.teinte];
  const n = ids.filter((x) => !!programmeParId(x)).length;
  const premier = programmeParId(ids[0]);
  const sous = info.sous ? traduire(info.sous) : joursDeFamille(ids);
  const nombre = traduirePluriel(n, n > 1, '{0} programme', '{0} programmes', n);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${nombre}, ${sous}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 104, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 14, gap: 6, justifyContent: 'space-between', backgroundColor: f.fond, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      {/* le nombre en petites capitales sur toute la largeur, le motif de la semaine à côté du nom */}
      <Capitales texte={nombre} couleur={f.titre} taille={10.5} />
      <View style={{ gap: 2 }}>
        <Ink size={18} weight="black" color={pa.texte}>{label}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Ink size={12.5} weight="bold" color={pa.texte2} style={{ flex: 1 }}>{sous}</Ink>
          <View style={{ width: 34, marginBottom: 2 }}><MiniSemaine jours={joursConseilles(premier?.joursParSemaine ?? 3)} couleur={f.barre} vide={pa.carte} hauteur={18} gap={2} /></View>
        </View>
      </View>
    </Pressable>
  );
}

function couleursNiveau(pa: PastelCoach, n: Niveau): { fond: string; encre: string } {
  if (n === 'debutant') return { fond: pa.menthe.fond, encre: pa.menthe.titre };
  if (n === 'confirme') return { fond: pa.lilas.fond, encre: pa.lilas.titre };
  return { fond: pa.bleu.fond, encre: pa.bleu.titre };
}

/** Un programme (maquette Coach2-A-Sais) : sa semaine en barres, le nom, le niveau, jours et durée, l'étoile */
function CarteListe({ p, f, favori, enCours, onPress, onEtoile }: { p: Programme; f: FamillePastel; favori: boolean; enCours?: boolean; onPress: () => void; onEtoile: () => void }) {
  const pa = usePastel();
  // « 3 jours » ne se coupe jamais en deux lignes
  const titre = traduire(p.titre).replace(/(\d) /g, '$1\u00A0');
  const niv = couleursNiveau(pa, p.niveau);
  const infos = traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: 22, backgroundColor: pa.carte }, ombrePastel(pa.ombre)]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={[titre, traduire(libelleNiveau(p.niveau)), infos, enCours ? traduire('En cours') : ''].filter(Boolean).join(', ')}
        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80, paddingVertical: 14, paddingLeft: 14, borderTopLeftRadius: 22, borderBottomLeftRadius: 22, opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{ width: 52 }}><MiniSemaine jours={joursConseilles(p.joursParSemaine)} couleur={f.barre} vide={pa.ligne} hauteur={34} gap={2} /></View>
        <View style={{ flex: 1, gap: 6 }}>
          <Ink size={15.5} weight="black" color={pa.texte}>{titre}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: enCours ? pa.bouton : niv.fond }}>
              <Ink size={12} weight="extraBold" color={enCours ? pa.surBouton : niv.encre}>{enCours ? traduire('En cours') : traduire(libelleNiveau(p.niveau))}</Ink>
            </View>
            <Ink size={12.5} weight="bold" color={pa.texte2}>{infos}</Ink>
          </View>
        </View>
      </Pressable>
      <Pressable onPress={onEtoile} accessibilityRole="button" accessibilityState={{ selected: favori }} accessibilityLabel={traduire(favori ? 'Retirer des favoris' : 'Ajouter aux favoris')} style={({ pressed }) => ({ width: 52, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
        <Icon name="star" size={22} color={favori ? pa.creme.barre : pa.texte3} fill={favori ? pa.creme.barre : undefined} />
      </Pressable>
    </View>
  );
}
