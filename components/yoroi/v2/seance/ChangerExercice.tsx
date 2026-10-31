/**
 * « Changer d'exercice » et « Enchaîner un exercice » (31 octobre 2026, Houari : « quand j'appuie sur Changer,
 * propose moi de remplacer par une autre machine, avec une recherche par nom » ; « crunch puis roue abdominale,
 * je veux pouvoir l'ajouter »).
 *
 * Une grande feuille : l'exercice de depart en tete, la portee (« Juste aujourd'hui », « Toujours dans ce
 * programme »), une recherche par nom dans toute la base, puis les equivalents du meme muscle ranges en trois
 * familles (autre machine, poids libres, poids du corps), chacun avec son image si elle existe, sinon un sticker,
 * et l'etiquette de son muscle. Pas trouve : « Ajouter ma machine », un nom libre et le muscle, gardee pour la suite.
 * Toutes les donnees viennent de lib/v2/seances/changerExo.ts (rien d'invente).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { Icon } from './Icon';
import { ExoDemo } from './ExoDemo';
import { OMBRE_CARTE, ton } from './pastel';
import type { TonSeance } from './pastel';
import { fondAjouter, PlusPastille } from '@/components/yoroi/v2/accueil/kit';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { demoDe } from '@/lib/v2/programmes/demos';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { niceGroup } from '@/lib/v2/seance/format';
import { MUSCLE_ORDER, normName } from '@/lib/v2/seance/history';
import type { ExerciseHistory } from '@/lib/v2/seance/history';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sansPrise } from '@/lib/v2/seance/prise';
import { chargerEcartes } from '@/lib/v2/seances/exercicesEcartes';
import { ajouterMachinePerso, chargerMachinesPerso, LONGUEUR_NOM_MACHINE, machinesEnMemoire, nomMachinePropre } from '@/lib/v2/seances/machinesPerso';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { chercherPourChanger, equivalents, groupesMuscu, musclePour, ORDRE_FAMILLES, TITRE_FAMILLE } from '@/lib/v2/seances/changerExo';
import type { Equivalent, FamilleChange } from '@/lib/v2/seances/changerExo';

export type PorteeChangement = 'jour' | 'toujours';

/** Sticker d'un groupe de la bibliotheque */
const STICKER_MUSCLE: Record<string, NomSticker> = {
  ABDOS: 'abdos', PECTORAUX: 'pecs', FESSIERS: 'fessiers', BICEPS: 'bras', TRICEPS: 'bras', 'AVANT-BRAS': 'grip',
  DOS: 'zones_corps', 'ÉPAULES': 'muscle', JAMBES: 'force', ISCHIOS: 'force', MOLLETS: 'chaussure', COU: 'cou',
};
const STICKER_FAMILLE: Record<FamilleChange, NomSticker> = { machine: 'reglage_machine', libre: 'barre', corps: 'muscle' };
const TON_FAMILLE: Record<FamilleChange, TonSeance> = { machine: 'ciel', libre: 'peche', corps: 'menthe' };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** changer : remplacer l'exercice ; enchainer : en ajouter un apres lui, en superset */
  mode: 'changer' | 'enchainer';
  /** l'exercice de depart */
  nom: string;
  muscle?: string | null;
  /** exercices deja dans la seance, pas proposes */
  deja?: string[];
  history?: Map<string, ExerciseHistory>;
  /** montre « Juste aujourd'hui » et « Toujours » ; sans, le choix vaut pour le programme */
  portees?: boolean;
  /** une seance de programme : « Toujours dans ce programme » */
  dansProgramme?: boolean;
  onChoisir: (nom: string, muscle: string, portee: PorteeChangement) => void;
};

export function ChangerExercice({ visible, onClose, mode, nom, muscle, deja, history, portees = true, dansProgramme = false, onChoisir }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [focus, setFocus] = useState(false);
  const [portee, setPortee] = useState<PorteeChangement>('jour');
  const [ecartes, setEcartes] = useState<string[]>([]);
  const [perso, setPerso] = useState<MachinePerso[]>(machinesEnMemoire());
  const [ajout, setAjout] = useState<{ nom: string; muscle: string | null } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setAjout(null);
    setPortee('jour');
    chargerEcartes().then((l) => setEcartes(l.map((e) => e.nom)), () => {});
    chargerMachinesPerso().then(setPerso, () => {});
  }, [visible, nom]);

  const base = sansPrise(nom ?? '').base;
  const muscleDepart = useMemo(() => musclePour(base, { muscle, perso }), [base, muscle, perso]);
  const compte = useMemo(() => (n: string) => history?.get(normName(n))?.count ?? history?.get(normName(nomFr(n)))?.count ?? 0, [history]);
  const liste = useMemo(() => equivalents(base, { muscle, perso, ecartes, deja, compte }), [base, muscle, perso, ecartes, deja, compte]);
  const trouves = useMemo(() => (query.trim() ? chercherPourChanger(query, { perso, compte }).filter((e) => normName(e.nom) !== normName(base)) : []), [query, perso, compte, base]);

  type Ligne = { kind: 'titre'; key: string; famille: FamilleChange } | { kind: 'exo'; key: string; e: Equivalent; affiche: string };
  const lignes = useMemo<Ligne[]>(() => {
    if (query.trim()) return trouves.map((e) => ({ kind: 'exo', key: `q-${e.nom}`, e, affiche: e.affiche }));
    const out: Ligne[] = [];
    for (const f of ORDRE_FAMILLES) {
      const l = liste.filter((e) => e.famille === f);
      if (!l.length) continue;
      out.push({ kind: 'titre', key: `t-${f}`, famille: f });
      l.forEach((e) => out.push({ kind: 'exo', key: `e-${e.nom}`, e, affiche: e.perso ? e.nom : nomFr(e.nom) }));
    }
    return out;
  }, [query, trouves, liste]);

  const choisir = (n: string, m: string) => {
    onChoisir(n, m, portees ? portee : 'toujours');
    setQuery('');
  };

  const ouvrirAjout = () => setAjout({ nom: nomMachinePropre(query), muscle: muscleDepart });
  const validerAjout = async () => {
    if (!ajout || !ajout.muscle || !nomMachinePropre(ajout.nom)) return;
    const n = nomMachinePropre(ajout.nom);
    const l = await ajouterMachinePerso(n, ajout.muscle).catch(() => null);
    if (l) setPerso(l);
    choisir(n, ajout.muscle);
  };

  const titre = mode === 'enchainer' ? traduire('Enchaîner un exercice') : traduire('Changer l’exercice');
  const nomDepart = sansTiret(traduire(nomFr(base)));
  const etiquette = (m: string, fond: string, encre: string) => (
    <View style={{ alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, backgroundColor: fond }}>
      <Ink size={11.5} weight="extraBold" color={encre}>{traduire(niceGroup(m))}</Ink>
    </View>
  );

  const vignette = (e: Equivalent, taille: number) => {
    if (!e.perso && demoDe(e.nom)) return <ExoDemo nom={e.nom} taille={taille} arrondi={16} />;
    const t = ton(TON_FAMILLE[e.famille]);
    // la famille se voit a l'image (machine, haltere, poids du corps), le muscle est dans l'etiquette
    const sticker = STICKER_FAMILLE[e.famille];
    return (
      <View style={{ width: taille, height: taille, borderRadius: 16, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
        {illus.stickers ? <Image source={illus.img(sticker)} style={{ width: taille * 0.74, height: taille * 0.74 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Ink size={20} weight="black" color={t.encre}>{traduire(niceGroup(e.muscle)).charAt(0)}</Ink>}
      </View>
    );
  };

  // ------------------------------------------------ ajouter ma machine
  if (ajout) {
    const groupes = [...MUSCLE_ORDER.filter((g) => groupesMuscu().includes(g)), ...groupesMuscu().filter((g) => !MUSCLE_ORDER.includes(g))];
    const pret = !!ajout.muscle && !!nomMachinePropre(ajout.nom);
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAjout(null)}>
        <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22 }}>
            <Pressable onPress={() => setAjout(null)} accessibilityRole="button" accessibilityLabel={traduire('Retour')} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={18} strokeWidth={2.6} />
            </Pressable>
            <Ink size={24} weight="black" tight style={{ flex: 1 }}>{traduire('Ajouter ma machine')}</Ink>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: insets.bottom + 30, gap: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: ton('ciel').fond }}>
              {illus.stickers ? <Image source={illus.img('reglage_machine')} style={{ width: 64, height: 64 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
              <Ink size={14} weight="bold" color={ton('ciel').encre} style={{ flex: 1, lineHeight: 20 }}>
                {traduire('Elle n’est pas dans la liste ? Donne lui le nom de ta salle et le muscle qu’elle travaille. Elle sera gardée avec tes exercices, son historique et ses records.')}
              </Ink>
            </View>
            <View style={{ gap: 8 }}>
              <Ink size={14} weight="black" color={c.textSecondary}>{traduire('Son nom')}</Ink>
              <TextInput
                value={ajout.nom}
                onChangeText={(t) => setAjout((a) => (a ? { ...a, nom: t.slice(0, LONGUEUR_NOM_MACHINE) } : a))}
                placeholder={traduire('Par exemple : mollets debout à charger')}
                placeholderTextColor={c.textMuted}
                autoFocus={!ajout.nom}
                accessibilityLabel={traduire('Nom de ta machine')}
                style={[fontStyle('bold'), { height: 58, borderRadius: 18, paddingHorizontal: 16, fontSize: 17, color: c.ink, backgroundColor: c.surface, ...OMBRE_CARTE }]}
              />
            </View>
            <View style={{ gap: 10 }}>
              <Ink size={14} weight="black" color={c.textSecondary}>{traduire('Le muscle qu’elle travaille')}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {groupes.map((g) => {
                  const on = ajout.muscle === g;
                  return (
                    <Pressable key={g} onPress={() => setAjout((a) => (a ? { ...a, muscle: g } : a))} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ flexBasis: '30%', flexGrow: 1, minHeight: 84, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface, borderWidth: 2, borderColor: on ? c.accentText : 'transparent', ...OMBRE_CARTE })}>
                      {illus.stickers ? <Image source={illus.img(STICKER_MUSCLE[g] ?? 'musculation')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                      <Ink size={13} weight="extraBold" color={on ? c.onPrimary : c.ink}>{traduire(niceGroup(g))}</Ink>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <BoutonPrincipal onPress={() => void validerAjout()} disabled={!pret} label={mode === 'enchainer' ? traduire('Ajouter et enchaîner') : traduire('Ajouter et la prendre')} rayon={20} tailleTexte={16} />
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ------------------------------------------------ la feuille
  const enTete = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      {/* l'exercice de depart */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, backgroundColor: c.surface, ...OMBRE_CARTE }}>
        {demoDe(base) ? <ExoDemo nom={base} taille={56} arrondi={16} /> : (
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
            {illus.stickers ? <Image source={illus.img((muscleDepart && STICKER_MUSCLE[muscleDepart]) || 'musculation')} style={{ width: 42, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          </View>
        )}
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={12} weight="extraBold" color={c.textMuted}>{mode === 'enchainer' ? traduire('Après') : traduire('À la place de')}</Ink>
          <Ink size={17} weight="black" tight numberOfLines={2}>{nomDepart}</Ink>
          {muscleDepart ? etiquette(muscleDepart, c.fillSoft, c.textSecondary) : null}
        </View>
        {mode === 'enchainer' ? (
          <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: ton('lilas').fond }}>
            <Ink size={12} weight="black" color={ton('lilas').encre}>{traduire('Superset')}</Ink>
          </View>
        ) : null}
      </View>
      {mode === 'enchainer' ? (
        <Ink size={13} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4, lineHeight: 19 }}>{traduire('Tu enchaînes les deux sans repos. Le repos vient après le dernier.')}</Ink>
      ) : null}

      {/* pour aujourd'hui ou pour toujours */}
      {portees ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['jour', 'toujours'] as const).map((p) => {
            const on = portee === p;
            const libelle = p === 'jour' ? traduire('Juste aujourd’hui') : dansProgramme ? traduire('Toujours dans ce programme') : traduire('Toujours');
            const sous = p === 'jour' ? traduire('Ta séance seulement') : mode === 'enchainer' ? traduire('Gardé pour les prochaines fois') : traduire('L’autre ne te sera plus proposé');
            return (
              <Pressable key={p} onPress={() => setPortee(p)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ flex: 1, minHeight: 62, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, justifyContent: 'center', gap: 2, backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface, borderWidth: 2, borderColor: on ? c.accentText : 'transparent', ...OMBRE_CARTE })}>
                <Ink size={14} weight="black" color={on ? c.onPrimary : c.ink} numberOfLines={2}>{libelle}</Ink>
                <Ink size={11.5} weight="bold" color={on ? c.onPrimary : c.textMuted} numberOfLines={2}>{sous}</Ink>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* recherche par nom dans toute la base */}
      <View style={{ height: 58, borderRadius: 20, backgroundColor: c.surface, borderWidth: focus ? 2 : 0, borderColor: c.primary, ...OMBRE_CARTE, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 8, gap: 10 }}>
        {illus.stickers ? <Image source={illus.img('recherche')} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon name="search" size={22} color={c.textMuted} strokeWidth={2.4} />}
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={traduire('Cherche par nom, en français ou en anglais')}
          placeholderTextColor={c.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          accessibilityLabel={traduire('Chercher un exercice par son nom')}
          style={[fontStyle('bold'), { flex: 1, fontSize: 17, color: c.ink, paddingVertical: 0 }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={traduire('Effacer la recherche')} hitSlop={6} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={14} color={c.textSecondary} strokeWidth={2.8} />
            </View>
          </Pressable>
        ) : null}
      </View>
      {query.trim() ? (
        <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
          {trouves.length ? traduire('{0} exercices trouvés', trouves.length) : traduire('Rien trouvé pour « {0} »', query.trim())}
        </Ink>
      ) : liste.length ? (
        <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire('Ils travaillent le même muscle')}</Ink>
      ) : null}
    </View>
  );

  const boutonAjout = (
    <Pressable onPress={ouvrirAjout} accessibilityRole="button" accessibilityLabel={traduire('Ajouter ma machine')} style={({ pressed }) => ({ minHeight: 64, borderRadius: 20, paddingHorizontal: 14, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: fondAjouter(pressed) })}>
      {illus.stickers ? <Image source={illus.img('reglage_machine')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <PlusPastille />}
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="black" color={c.accentText}>{query.trim() ? traduire('Ajouter « {0} » comme ma machine', nomMachinePropre(query)) : traduire('Ajouter ma machine')}</Ink>
        <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Pas dans la liste ? Un nom et son muscle, gardée pour la suite')}</Ink>
      </View>
      <PlusPastille />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 12 }}>
          <Ink size={26} weight="black" tight>{titre}</Ink>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} strokeWidth={2.6} />
          </Pressable>
        </View>
        <FlatList
          data={lignes}
          keyExtractor={(l) => l.key}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 30, gap: 8 }}
          ListHeaderComponent={enTete}
          ListEmptyComponent={
            query.trim() ? null : (
              <Ink size={14} color={c.textSecondary} style={{ paddingVertical: 10, paddingHorizontal: 4 }}>{traduire('Pas d’autre exercice du même muscle dans la base. Cherche par nom, ou ajoute ta machine.')}</Ink>
            )
          }
          ListFooterComponent={boutonAjout}
          renderItem={({ item: l }) => {
            if (l.kind === 'titre') {
              const t = ton(TON_FAMILLE[l.famille]);
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12, paddingHorizontal: 2 }} accessibilityRole="header">
                  {illus.stickers ? <Image source={illus.img(STICKER_FAMILLE[l.famille])} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                  <Ink size={15} weight="black" color={t.encre}>{traduire(mode === 'enchainer' && l.famille === 'machine' ? 'Sur une machine' : TITRE_FAMILLE[l.famille])}</Ink>
                </View>
              );
            }
            const e = l.e;
            const fait = compte(e.nom);
            const t = ton(TON_FAMILLE[e.famille]);
            return (
              <Pressable
                onPress={() => choisir(e.nom, e.muscle)}
                accessibilityRole="button"
                accessibilityLabel={mode === 'enchainer' ? traduire('Enchaîner {0}', sansTiret(traduire(l.affiche))) : traduire('Prendre {0}', sansTiret(traduire(l.affiche)))}
                style={({ pressed }) => ({ minHeight: 76, borderRadius: 20, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.surface, ...OMBRE_CARTE })}
              >
                {vignette(e, 56)}
                <View style={{ flex: 1, gap: 5 }}>
                  <Ink size={15.5} weight="black" tight numberOfLines={2}>{sansTiret(traduire(l.affiche))}</Ink>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {etiquette(e.muscle, t.fond, t.encre)}
                    {e.perso ? (
                      <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, backgroundColor: ton('creme').fond }}>
                        <Ink size={11.5} weight="extraBold" color={ton('creme').encre}>{traduire('Ta machine')}</Ink>
                      </View>
                    ) : null}
                    {fait > 0 ? <Ink size={11.5} weight="bold" color={c.textMuted} style={{ alignSelf: 'center' }}>{fait === 1 ? traduire('fait 1 fois') : traduire('fait {0} fois', fait)}</Ink> : null}
                  </View>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={mode === 'enchainer' ? 'plus' : 'chevron'} size={16} color={c.onPrimary} strokeWidth={2.8} />
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}
