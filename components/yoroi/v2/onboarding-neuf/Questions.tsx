/**
 * onboarding-neuf/Questions.tsx
 *
 * Les ecrans a questions, une question par ecran, copies d'INRO (components/onboarding-nuit/Questions.tsx) :
 * les choix uniques avancent tout seuls un quart de seconde apres le toucher (le bouton reste la), les cartes
 * arrivent l'une apres l'autre, le prenom ouvre le clavier une fois l'ecran pose.
 *
 * Les reponses gardent les identifiants qui existent deja dans YOROI (Draft, objectifs, sports, sources), pour ne
 * rien casser dans le coach, le plan et la mesure.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import { LogoMarque, type MarqueId } from '@/components/yoroi/v2/onboarding/LogosMarques';
import { libelleSource } from '@/components/yoroi/v2/onboarding/Source';
import { illustrationUnivers } from '@/components/yoroi/v2/onboarding/Univers';
import { SPORTS, getSportName } from '@/lib/sports';
import { categoriesOf, categorySportOf } from '@/lib/v2/onboarding/save';
import { toggleObjectif } from '@/lib/v2/onboarding/objectifs';
import { sourcesPour, type SourceConnu } from '@/lib/v2/onboarding/sourceConnu';
import { TRANCHES_AGE, type TrancheAge } from '@/lib/v2/onboarding/trancheAge';
import { UNIVERS_CHOIX } from '@/lib/v2/dojo/univers';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { traduire } from '@/lib/i18n/tr';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { Apparait, Bas, Choix, ChoixMultiple, Corps, Ecran, Haut, Pastille, Sticker, Titre, Txt, alpha, useK, vibre, type Nav } from './kit';
import { FONT, useNuit } from './theme';

/** Delai entre le toucher d'un choix unique et l'ecran suivant */
const AVANCE_MS = 250;

function useAvance(nav: Nav) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (t.current) clearTimeout(t.current);
  }, []);
  return useCallback(
    (choisir: () => void) => {
      choisir();
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => {
        t.current = null;
        nav.onNext();
      }, AVANCE_MS);
    },
    [nav],
  );
}

const SANS_CONTOUR = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

/** Le cadre commun : barre, titre, contenu, bas */
export function Question({ nav, titre, mot, sous, children, bouton, actif = true, oeil, lienBas, onLienBas, centre, onBouton, chargement }: {
  nav: Nav;
  onBouton?: () => void;
  titre: string;
  mot?: string;
  sous?: string;
  children: React.ReactNode;
  bouton?: string;
  actif?: boolean;
  oeil?: string;
  lienBas?: string;
  onLienBas?: () => void;
  centre?: boolean;
  chargement?: boolean;
}) {
  // pas de fleche retour sur la premiere question
  const premier = nav.etape === 1;
  return (
    <Ecran>
      <Haut etape={nav.etape} total={nav.total} progres={nav.progres} onBack={premier ? undefined : nav.onBack} onClose={nav.onClose} />
      <Titre sous={sous} mot={mot}>{titre}</Titre>
      <Corps centre={centre}>{children}</Corps>
      <Bas label={bouton ?? traduire('Continuer')} onPress={onBouton ?? nav.onNext} actif={actif} oeil={oeil} lienBas={lienBas} onLienBas={onLienBas} chargement={chargement} />
    </Ecran>
  );
}

/* ---------------------------------------------------------------- prenom */
export function Prenom({ nav, value, onChange, auto = true }: { nav: Nav; value: string; onChange: (v: string) => void; /** captures : pas de clavier */ auto?: boolean }) {
  const T = useNuit();
  const [focus, setFocus] = useState(false);
  const ok = value.trim().length >= 2;
  const champ = useRef<TextInput>(null);
  // le clavier s'ouvre une fois l'ecran pose, pas pendant l'animation d'entree
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => champ.current?.focus(), 380);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <Question nav={nav} titre={traduire('On t’appelle comment ?')} mot={traduire('comment')} actif={ok} oeil={traduire('Ton prénom reste sur ton téléphone')}>
      <View style={[st.champ, { borderColor: focus ? T.acc : T.line, borderWidth: focus ? 2 : 1.5, backgroundColor: T.card }]}>
        <TextInput
          ref={champ}
          value={value}
          onChangeText={(v) => onChange(v.slice(0, 24))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={traduire('Ton prénom')}
          placeholderTextColor={T.sub}
          selectionColor={T.acc}
          cursorColor={T.acc}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          onSubmitEditing={() => {
            if (ok) nav.onNext();
          }}
          maxLength={24}
          style={[st.input, { color: T.ink }, SANS_CONTOUR]}
          accessibilityLabel={traduire('Ton prénom')}
        />
      </View>
    </Question>
  );
}

/* ----------------------------------------------------------------- genre */
/** « Je préfère ne pas dire » : le genre « autre » avec le repere neutre qui existe deja (lib/genreCalcul.ts) */
export type ChoixGenre = 'homme' | 'femme' | 'autre' | 'non_dit';

/** Un choix en pilule, son numero dans un rond a gauche ; choisi, le rond devient une coche (INRO, ChoixNumero) */
function ChoixNumero({ numero, label, on, onPress }: { numero: number; label: string; on: boolean; onPress: () => void }) {
  const T = useNuit();
  return (
    <Pressable
      onPress={() => {
        vibre.choix();
        onPress();
      }}
      style={({ pressed }) => [st.pilule, { backgroundColor: on ? alpha(T.acc, 0.1) : T.card, borderColor: on ? T.acc : T.line }, pressed && { opacity: 0.85 }]}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
    >
      <View style={[st.numero, { backgroundColor: on ? T.acc : T.line }]}>
        {on ? <Ionicons name="checkmark" size={18} color={T.accInk} /> : <Txt style={[st.numeroTxt, { color: T.sub }]}>{numero}</Txt>}
      </View>
      <Txt style={[st.piluleTxt, { color: T.ink }]}>{label}</Txt>
    </Pressable>
  );
}

export function Genre({ nav, value, repere, onChange, onRepere }: {
  nav: Nav;
  value: ChoixGenre | null;
  repere: 'homme' | 'femme' | 'neutre' | null;
  onChange: (g: ChoixGenre) => void;
  onRepere: (r: 'homme' | 'femme') => void;
}) {
  const T = useNuit();
  const avance = useAvance(nav);
  const choix: { id: ChoixGenre; label: string }[] = [
    { id: 'homme', label: traduire('Un homme') },
    { id: 'femme', label: traduire('Une femme') },
    { id: 'autre', label: traduire('Autre') },
    { id: 'non_dit', label: traduire('Je préfère ne pas dire') },
  ];
  const autre = value === 'autre';
  const pret = !!value && (!autre || repere === 'homme' || repere === 'femme');
  return (
    <Question nav={nav} titre={traduire('Tu es…')} actif={pret} oeil={traduire('Pour adapter ton personnage et tes calculs')} centre>
      {choix.map((g, n) => (
        <Apparait key={g.id} rang={n}>
          <ChoixNumero
            numero={n + 1}
            label={g.label}
            on={value === g.id}
            onPress={() => (g.id === 'autre' ? onChange('autre') : avance(() => onChange(g.id)))}
          />
        </Apparait>
      ))}
      {autre ? (
        <Apparait>
          <Txt style={[st.aide, { color: T.sub }]}>{traduire('Pour tes repères de masse grasse, utiliser :')}</Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pastille label={traduire('Homme')} on={repere === 'homme'} onPress={() => onRepere('homme')} />
            <Pastille label={traduire('Femme')} on={repere === 'femme'} onPress={() => onRepere('femme')} />
          </View>
        </Apparait>
      ) : null}
    </Question>
  );
}

/* ------------------------------------------------------------------- age */
/** Les tranches qui existent deja (lib/v2/onboarding/trancheAge.ts), et « Je préfère ne pas dire » */
export function libelleTranche(t: TrancheAge): string {
  switch (t) {
    case 'moins_18':
      return traduire('Moins de 18 ans');
    case '18_24':
      return traduire('18 à 24 ans');
    case '25_34':
      return traduire('25 à 34 ans');
    case '35_44':
      return traduire('35 à 44 ans');
    case '45_54':
      return traduire('45 à 54 ans');
    default:
      return traduire('55 ans et plus');
  }
}
const STICKER_AGE: Record<TrancheAge | 'non_dit', NomSticker> = {
  moins_18: 'debuter',
  '18_24': 'energie',
  '25_34': 'force_eclair',
  '35_44': 'montagne_drapeau',
  '45_54': 'bonsai',
  '55_plus': 'saule',
  non_dit: 'cadenas',
};

export function Age({ nav, value, onChange }: { nav: Nav; value: TrancheAge | 'non_dit' | null; onChange: (a: TrancheAge | 'non_dit') => void }) {
  const avance = useAvance(nav);
  const liste: (TrancheAge | 'non_dit')[] = [...TRANCHES_AGE, 'non_dit'];
  return (
    <Question nav={nav} titre={traduire('Tu as quel âge ?')} mot={traduire('âge')} actif={!!value} oeil={traduire('Une tranche suffit, pas ta date de naissance')} centre>
      {liste.map((a, n) => (
        <Apparait key={a} rang={n}>
          <Choix
            label={a === 'non_dit' ? traduire('Je préfère ne pas dire') : libelleTranche(a)}
            on={value === a}
            onPress={() => avance(() => onChange(a))}
            gauche={<Sticker nom={STICKER_AGE[a]} taille={34} />}
          />
        </Apparait>
      ))}
    </Question>
  );
}

/* ---------------------------------------------------------------- source */
const MARQUES: Partial<Record<SourceConnu, MarqueId>> = {
  tiktok: 'tiktok', instagram: 'instagram', youtube: 'youtube', facebook: 'facebook', google: 'google',
  app_store: 'app_store', google_play: 'google_play', snapchat: 'snapchat', x: 'x',
};
const STICKER_SOURCE: Partial<Record<SourceConnu, NomSticker>> = { ia: 'cerveau', amis: 'groupe', club: 'gants', autre: 'etincelles' };

export function Source({ nav, value, onChange }: { nav: Nav; value: SourceConnu | null; onChange: (v: SourceConnu) => void }) {
  const avance = useAvance(nav);
  const liste = sourcesPour(Platform.OS);
  return (
    <Question nav={nav} titre={traduire('Tu as connu YOROI comment ?')} mot="YOROI" sous={traduire('Une seule réponse. Ça nous aide à faire connaître YOROI.')} actif={!!value}>
      {liste.map((x, n) => {
        const marque = MARQUES[x];
        return (
          <Apparait key={x} rang={n}>
            <Choix
              label={libelleSource(x)}
              on={value === x}
              onPress={() => avance(() => onChange(x))}
              gauche={marque ? <LogoMarque id={marque} taille={34} /> : <Sticker nom={STICKER_SOURCE[x] ?? 'etincelles'} taille={34} />}
            />
          </Apparait>
        );
      })}
    </Question>
  );
}

/* -------------------------------------------------------------- objectif */
export const OBJECTIFS_MAX = 2;
const OBJECTIFS: { id: Goal; label: string; sticker: NomSticker }[] = [
  { id: 'lose', label: traduire('Perdre du poids'), sticker: 'courbe_baisse' },
  { id: 'gain', label: traduire('Prendre du muscle'), sticker: 'muscle' },
  { id: 'combat', label: traduire('Performer en combat'), sticker: 'gants' },
  { id: 'maintain', label: traduire('Me maintenir'), sticker: 'balance' },
];

export function Objectif({ nav, value, onChange }: { nav: Nav; value: Goal[]; onChange: (v: Goal[]) => void }) {
  const T = useNuit();
  const [note, setNote] = useState<string | null>(null);
  const plein = value.length >= OBJECTIFS_MAX;
  return (
    <Question nav={nav} titre={traduire('Tu viens surtout pour…')} mot={traduire('surtout')} sous={traduire('Choisis-en 2 maximum.')} actif={value.length > 0}>
      <View style={st.ligneMax}>
        <Txt style={[st.max, { color: T.acc }]}>{traduire('2 MAXIMUM')}</Txt>
        <Txt style={[st.compte, { color: plein ? T.acc : T.sub }]}>{traduire('{0} sur {1}', value.length, OBJECTIFS_MAX)}</Txt>
      </View>
      {OBJECTIFS.map((x, n) => {
        const on = value.includes(x.id);
        return (
          <Apparait key={x.id} rang={n}>
            <ChoixMultiple
              label={x.label}
              on={on}
              // un choix incompatible remplace l'autre (Perdre et Me maintenir) : il n'est jamais bloque
              bloque={!on && plein && toggleObjectif(value, x.id).list.length > OBJECTIFS_MAX}
              onPress={() => {
                const r = toggleObjectif(value, x.id);
                setNote(r.note);
                onChange(r.list);
              }}
              gauche={<Sticker nom={x.sticker} taille={34} />}
            />
          </Apparait>
        );
      })}
      {note ? <Txt style={[st.aide, { color: T.sub, marginTop: 4 }]}>{note}</Txt> : null}
    </Question>
  );
}

/* ---------------------------------------------------------------- sports */
/** Les noms de marque ne sont pas proposes dans l'onboarding (ils restent dans l'app) */
const SPORTS_MARQUES = new Set(['crossfit', 'crossfit_games', 'hyrox', 'zumba', 'spinning', 'body_pump']);

export function Sports({ nav, value, onToggle, genre, combat, categorie, onCategorie }: {
  nav: Nav;
  value: string[];
  onToggle: (id: string) => void;
  genre: 'h' | 'f';
  /** objectif « Performer en combat » : la categorie de poids, facultative */
  combat: boolean;
  categorie: string | null;
  onCategorie: (id: string | null) => void;
}) {
  const T = useNuit();
  const K = useK();
  const [tous, setTous] = useState(false);
  const [q, setQ] = useState('');
  const illus = SPORT_ILLUS.map((s) => s.id);
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const autres = SPORTS.filter((s) => !illus.includes(s.id) && !SPORTS_MARQUES.has(s.id));
  const autresChoisis = autres.filter((s) => value.includes(s.id));
  const trouves = q ? autres.filter((s) => norm(getSportName(s.id) ?? s.name).includes(norm(q))) : autres;
  const catSport = categorySportOf(value);
  const cats = combat ? categoriesOf(catSport, genre === 'f' ? 'femme' : 'homme') : [];
  return (
    <Question nav={nav} titre={traduire('Tu pratiques quoi ?')} mot={traduire('quoi')} sous={traduire('Tout ce que tu fais, même un peu.')} actif={value.length > 0}>
      <View style={st.grille}>
        {SPORT_ILLUS.map((s, n) => {
          const on = value.includes(s.id);
          const label = traduire(s.nom);
          return (
            <Apparait key={s.id} rang={n} style={{ width: '48.5%' }}>
              <Pressable
                onPress={() => {
                  vibre.choix();
                  onToggle(s.id);
                }}
                style={({ pressed }) => [st.carte, { backgroundColor: T.card, borderColor: T.line }, on && { borderColor: T.acc, borderWidth: 1.5, backgroundColor: alpha(T.acc, 0.06) }, pressed && { opacity: 0.85 }]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
              >
                <Image source={genre === 'f' ? s.f : s.h} style={{ width: 38, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <Txt style={[st.carteTxt, { color: T.ink }, on && { fontFamily: FONT.texteSemi }]} numberOfLines={2}>{label}</Txt>
                <View style={[K.caseBox, { marginLeft: 0 }, on && K.caseOn]}>{on ? <Ionicons name="checkmark" size={15} color={T.accInk} /> : null}</View>
              </Pressable>
            </Apparait>
          );
        })}
      </View>
      {autresChoisis.length && !tous ? (
        <View style={[st.pastilles, { marginTop: 14 }]}>
          {autresChoisis.map((s) => <Pastille key={s.id} label={getSportName(s.id) ?? s.name} on onPress={() => onToggle(s.id)} />)}
        </View>
      ) : null}
      <Pressable onPress={() => setTous((v) => !v)} hitSlop={8} style={{ alignSelf: 'center', marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button">
        <Txt style={[st.lien, { color: T.acc }]}>{tous ? traduire('Masquer les autres sports') : traduire('Voir tous les sports')}</Txt>
        <Ionicons name={tous ? 'chevron-up' : 'chevron-down'} size={16} color={T.acc} />
      </Pressable>
      {tous ? (
        <View style={{ marginTop: 12, gap: 12 }}>
          <View style={[st.recherche, { backgroundColor: T.card, borderColor: T.line }]}>
            <Ionicons name="search" size={18} color={T.sub} />
            <TextInput value={q} onChangeText={setQ} placeholder={traduire('Chercher un sport')} placeholderTextColor={T.sub} selectionColor={T.acc} autoCorrect={false} style={[st.rechercheTxt, { color: T.ink }, SANS_CONTOUR]} />
          </View>
          <View style={st.pastilles}>
            {trouves.map((s) => <Pastille key={s.id} label={getSportName(s.id) ?? s.name} on={value.includes(s.id)} onPress={() => onToggle(s.id)} />)}
          </View>
        </View>
      ) : null}
      {combat ? (
        <View style={{ marginTop: 22, gap: 10 }}>
          <Txt style={K.famille}>{traduire('Ta catégorie de poids').toLocaleUpperCase()}</Txt>
          {catSport && cats.length ? (
            <>
              <Txt style={[st.aide, { color: T.sub, marginTop: 0 }]}>{traduire('En {0}. Facultatif, tu pourras la changer plus tard.', getSportName(catSport) ?? catSport)}</Txt>
              <View style={st.pastilles}>
                {cats.map((c) => <Pastille key={c.id} label={traduire(c.name)} on={categorie === c.id} onPress={() => onCategorie(categorie === c.id ? null : c.id)} />)}
              </View>
            </>
          ) : (
            <Txt style={[st.aide, { color: T.sub, marginTop: 0 }]}>{traduire('Choisis ton sport de combat pour voir ses catégories.')}</Txt>
          )}
        </View>
      ) : null}
    </Question>
  );
}

/* --------------------------------------------------------------- univers */
export function Univers({ nav, value, onChange, genre, genreConnu }: { nav: Nav; value: ChoixUnivers; onChange: (v: ChoixUnivers) => void; genre: 'h' | 'f'; genreConnu: boolean }) {
  const T = useNuit();
  const K = useK();
  const { height } = useWindowDimensions();
  const h = Math.max(96, Math.min(132, Math.round((height - 420) / 3)));
  return (
    <Question nav={nav} titre={traduire('Choisis ton univers')} mot={traduire('univers')} sous={traduire('Le décor et le personnage qui t’accompagnent. Tu pourras changer dans Réglages, Personnaliser.')}>
      {UNIVERS_CHOIX.map((u, n) => {
        const on = value === u.id;
        const { scene, perso } = illustrationUnivers(u.id, genre, 0, genreConnu);
        const nom = traduire(u.nom);
        return (
          <Apparait key={u.id} rang={n}>
            <Pressable
              onPress={() => {
                vibre.choix();
                onChange(u.id);
              }}
              style={({ pressed }) => [st.univers, { height: h, borderColor: on ? T.acc : T.line, borderWidth: on ? 2 : 1 }, pressed && { opacity: 0.9 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${nom}. ${u.phrase}`}
            >
              <Image source={scene} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
              {perso ? <Image source={perso} resizeMode="contain" style={{ position: 'absolute', right: 8, bottom: 0, width: Math.round(h * 0.78), height: h - 6 }} accessibilityIgnoresInvertColors /> : null}
              <View style={[st.universEtiquette, { backgroundColor: on ? T.acc : T.bg }]}>
                <Txt style={[st.universNom, { color: on ? T.accInk : T.ink }]}>{nom}</Txt>
              </View>
              <View style={[K.rond, { position: 'absolute', top: 10, right: 10, marginLeft: 0, backgroundColor: T.bg }, on && K.rondOn]}>{on ? <View style={K.rondPoint} /> : null}</View>
            </Pressable>
            <Txt style={[st.universPhrase, { color: on ? T.ink : T.sub }]}>{u.phrase}</Txt>
          </Apparait>
        );
      })}
    </Question>
  );
}

const st = StyleSheet.create({
  champ: { height: 56, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 16, marginTop: 44 },
  input: { fontFamily: FONT.texteMedium, fontSize: 17, paddingVertical: 0 },
  pilule: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, borderRadius: 32, borderWidth: 1.5, paddingHorizontal: 16, marginBottom: 12 },
  numero: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numeroTxt: { fontFamily: FONT.texteSemi, fontSize: 15 },
  piluleTxt: { flex: 1, fontFamily: FONT.texteSemi, fontSize: 17 },
  aide: { fontFamily: FONT.texte, fontSize: 13.5, lineHeight: 19, marginTop: 8, marginBottom: 10 },
  ligneMax: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 2 },
  max: { fontFamily: FONT.titreBold, fontSize: 10.5, letterSpacing: 1.2 },
  compte: { fontFamily: FONT.texteSemi, fontSize: 12.5 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  carte: { minHeight: 62, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingRight: 10, paddingVertical: 8 },
  carteTxt: { flex: 1, fontFamily: FONT.texteMedium, fontSize: 14, lineHeight: 18 },
  pastilles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lien: { fontFamily: FONT.texteSemi, fontSize: 14 },
  recherche: { height: 50, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  rechercheTxt: { flex: 1, fontFamily: FONT.texte, fontSize: 15, paddingVertical: 0 },
  univers: { borderRadius: 18, overflow: 'hidden' },
  universEtiquette: { position: 'absolute', left: 12, bottom: 12, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  universNom: { fontFamily: FONT.titreBold, fontSize: 15 },
  universPhrase: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, marginTop: 6, marginBottom: 12, paddingHorizontal: 4 },
});
