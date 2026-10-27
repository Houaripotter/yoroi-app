/**
 * « Ton coach » (26 octobre 2026), refait d'après la maquette validée (Coach.dc.html). Houari : l'ancien écran
 * n'était « pas intuitif, pas compréhensible ». Un seul écran, ouvert depuis la pastille « Coach » de l'accueil :
 *  1. Première ouverture, sans programme et sans départ fait : le départ avec ton coach s'ouvre (app/coach-depart.tsx).
 *  2. Avec un programme : la grande carte indigo de la séance du jour (routeDuJour, coach.ts) qui dit quel programme,
 *     pourquoi cette séance et la suite (heroJour.ts), « Voir mon programme » et « Changer de programme ».
 *     Sans programme : « Commençons », qui ouvre le départ.
 *  3. « Changer de programme » (ou « Ou choisis » sans programme) : je sais ce que je veux (la liste), trouve-moi
 *     un programme (les questions), juste une séance (app/programmes/zones.tsx). Le remplacement est confirmé
 *     dans le départ, comme dans le questionnaire.
 *  4. « Une question ? » : quatre tuiles, poids de départ, séries et répétitions, quand monter la charge, quand
 *     j'atteins mon but (app/objectif.tsx). Les textes viennent de charge.ts et du catalogue.
 * Les réglages (fin de séance, jours, modules) restent sur la page du programme.
 * 27 octobre 2026, refonte (maquette Coach-Accueil, « aperçus vivants ») : grand titre sur la page claire, « Trouve mon
 * programme » en carte bleu pastel avec sa petite semaine, « Je sais ce que je veux » en lilas avec les étiquettes,
 * « Juste une séance » en crème avec ses barres, les questions en cartes blanches avec un petit visuel chacune.
 * Aucune navigation ni donnée ne change. Ancien rendu : _archive_ancien_design_2026-10-09/coach_2026-10-27/.
 */
import React, { useCallback, useRef, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View } from 'react-native';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { Capitales, EnTeteRond, nomCourt, ombrePastel, salutation, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { PuceConseil } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { TesJoursEnCours } from '@/components/yoroi/v2/programmes/TesJours';
import { getProfile } from '@/lib/database';
import { PROGRESSION } from '@/lib/v2/programmes/catalogue';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { COMMENT_CHOISIR, POIDS_DE_DEPART, SOURCES_COMMENT_CHOISIR } from '@/lib/v2/programmes/charge';
import { lireDepart } from '@/lib/v2/programmes/depart';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, prochainJour } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { traduire } from '@/lib/i18n/tr';

export default function CoachScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // 27 octobre 2026 : les couleurs pastel des maquettes Coach (Habillage.tsx, usePastel)
  const pa = usePastel();
  // 27 octobre 2026 : stickers a la place des pictos (ou l'ancien rendu, reglage Illustrations)
  const illus = useIllustrations();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [, setCharge] = useState(false);
  // 27 octobre 2026 : le personnage n'est plus affiché ici (maquette Coach-Accueil), le profil est toujours lu
  const [, setFemme] = useState(false);
  const [nom, setNom] = useState<string | null>(null);
  const [poidsOuvert, setPoidsOuvert] = useState(false);
  const [seriesOuvert, setSeriesOuvert] = useState(false);
  const [monterOuvert, setMonterOuvert] = useState(false);
  // le départ s'ouvre tout seul une fois par visite, jamais en boucle
  const departOuvert = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      const charger = () => {
        chargerProgrammeActif()
          .then((a) => { if (vivant) { setActif(a); setCharge(true); } })
          .catch(() => { if (vivant) { setActif(null); setCharge(true); } });
      };
      charger();
      getProfile().then((pr) => { if (vivant) { setFemme(pr?.avatar_gender === 'femme'); setNom(pr?.name ?? null); } }).catch(() => {});
      // première ouverture : ni programme ni départ, le coach pose ses questions
      if (!departOuvert.current) {
        departOuvert.current = true;
        Promise.all([lireDepart(), chargerProgrammeActif().catch(() => null)])
          .then(([etat, a]) => {
            if (vivant && !etat && !a) router.push('/coach-depart' as any);
          })
          .catch(() => {});
      }
      const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
      return () => {
        vivant = false;
        sub.remove();
      };
    }, [router]),
  );

  const suite = actif ? prochainJour(actif) : null;
  const p = suite?.programme ?? null;
  const jour = suite?.jour ?? null;

  const depart = (chemin?: 'liste') => {
    tap();
    router.push({ pathname: '/coach-depart' as any, params: chemin ? { chemin } : {} });
  };

  // 27 octobre 2026 (maquette Coach-Accueil, « aperçus vivants ») : chaque question montre un petit visuel
  const tuiles: { cle: 'poids' | 'series' | 'monter' | 'but'; titre: string; action: () => void }[] = [
    { cle: 'poids', titre: traduire('Quel poids je prends'), action: () => { tap(); setPoidsOuvert(true); } },
    { cle: 'series', titre: traduire('Séries et répétitions'), action: () => { tap(); setSeriesOuvert(true); } },
    { cle: 'monter', titre: traduire('Quand monter la charge'), action: () => { tap(); setMonterOuvert(true); } },
    { cle: 'but', titre: traduire('Quand j’atteins mon but'), action: () => { tap(); router.push('/objectif' as any); } },
  ];
  // la petite semaine de la carte « Trouve mon programme » : un exemple dessiné, deux séances en alternance
  const lettres = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((j) => traduire(j).charAt(0).toLocaleUpperCase());
  const exemple: ('a' | 'b' | null)[] = ['a', 'b', null, 'a', null, 'b', null];

  return (
    <View style={{ flex: 1, backgroundColor: pa.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 10 }} showsVerticalScrollIndicator={false}>
        <EnTeteRond salut={traduire('Ton coach')} titre={salutation(nom)} repli="/(tabs)" />

        {/* 27 octobre 2026 : le grand titre sur la page claire, plus de grande carte indigo (« le bleu plein est trop fort ») */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={28} weight="black" tight color={pa.texte} accessibilityRole="header" style={{ lineHeight: 32 }}>{traduire('On fait quoi aujourd’hui ?')}</Ink>
            <Ink size={15} weight="bold" color={pa.texte2}>{traduire('Choisis, je m’occupe du reste.')}</Ink>
          </View>
          {illus.stickers ? <Image source={illus.img('coach')} style={{ width: 48, height: 48 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
        </View>

        {p && jour ? (
          <Pressable
            onPress={() => { tap(); router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } }); }}
            accessibilityRole="button"
            accessibilityLabel={`${traduire('Continuer')}, ${traduire(p.titre)}`}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, backgroundColor: pressed ? pa.boutonAppui : pa.bouton }, ombrePastel(pa.ombre)]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={12} weight="bold" color={pa.surBouton} numberOfLines={1}>{traduire('Continuer')}</Ink>
              <Ink size={16} weight="black" color={pa.surBouton} numberOfLines={1}>{nomCourt(traduire(p.titre))}</Ink>
            </View>
            <Icon name="chevron" size={16} color={pa.surBouton} />
          </Pressable>
        ) : null}

        {/* 27 octobre 2026 : tes jours, séance par séance, modifiables d'ici aussi (TesJours.tsx) */}
        {p ? <TesJoursEnCours programme={p} /> : null}

        {/* TROUVE MON PROGRAMME : la carte bleu pastel, conseillée, avec sa petite semaine */}
        <Pressable
          onPress={() => depart()}
          accessibilityRole="button"
          accessibilityLabel={`${traduire('Trouve mon programme')}, ${traduire('Quelques questions')}`}
          style={({ pressed }) => ({ marginTop: 6, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, gap: 4, backgroundColor: pa.bleu.fond, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Capitales texte={traduire('Trouve mon programme')} couleur={pa.bleu.titre} />
            <PuceConseil texte={traduire('Conseillé')} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ink size={17} weight="black" tight color={pa.texte} style={{ flex: 1 }}>{traduire('Quelques questions')}</Ink>
            {illus.stickers ? <Image source={illus.img('recherche')} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {exemple.map((x, k) => (
              <View key={k} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <View style={{ alignSelf: 'stretch', height: 30, borderRadius: 9, backgroundColor: x === 'a' ? pa.bleu.barre2 : x === 'b' ? pa.menthe.barre2 : pa.carte }} />
                <Ink size={10} weight="bold" color={pa.texte2}>{lettres[k]}</Ink>
              </View>
            ))}
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* JE SAIS CE QUE JE VEUX : lilas, les étiquettes des programmes */}
          <Pressable
            onPress={() => depart('liste')}
            accessibilityRole="button"
            accessibilityLabel={`${traduire('Je sais ce que je veux')}, ${traduire('PPL, Upper Lower, Push Pull...')}`}
            style={({ pressed }) => ({ flex: 1, minHeight: 120, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, gap: 8, backgroundColor: pa.lilas.fond, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <View style={{ flex: 1 }}><Capitales texte={traduire('Je sais ce que je veux')} couleur={pa.lilas.titre} taille={10.5} /></View>
              {illus.stickers ? <Image source={illus.img('seance_rapide')} style={{ width: 36, height: 36, marginTop: -4, marginRight: -4 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              {['PPL', 'Upper Lower', 'Full body'].map((e) => (
                <View key={e} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, backgroundColor: pa.carte }}>
                  <Ink size={11.5} weight="extraBold" color={pa.texte}>{e}</Ink>
                </View>
              ))}
            </View>
          </Pressable>

          {/* JUSTE UNE SÉANCE : crème, quatre barres qui se remplissent */}
          <Pressable
            onPress={() => { tap(); router.push('/programmes/zones' as any); }}
            accessibilityRole="button"
            accessibilityLabel={`${traduire('Juste une séance')}, ${traduire('Tout de suite')}`}
            style={({ pressed }) => ({ flex: 1, minHeight: 120, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, gap: 8, justifyContent: 'space-between', backgroundColor: pa.creme.fond, transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              <View style={{ flex: 1 }}><Capitales texte={traduire('Juste une séance')} couleur={pa.creme.titre} taille={10.5} /></View>
              {illus.stickers ? <Image source={illus.img('force_eclair')} style={{ width: 36, height: 36, marginTop: -4, marginRight: -4 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            </View>
            <Ink size={15} weight="black" color={pa.texte}>{traduire('Tout de suite')}</Ink>
            <View style={{ flexDirection: 'row', gap: 4, height: 22 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              {[pa.creme.barre, pa.creme.barre, pa.creme.barre2, pa.carte].map((b, k) => (
                <View key={k} style={{ flex: 1, borderRadius: 5, backgroundColor: b }} />
              ))}
            </View>
          </Pressable>
        </View>

        {/* 3. UNE QUESTION ? */}
        <Ink size={16} weight="black" tight color={pa.texte} accessibilityRole="header" style={{ marginTop: 10, marginHorizontal: 2 }}>{traduire('Une question ?')}</Ink>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tuiles.map((t) => (
            <Pressable
              key={t.cle}
              onPress={t.action}
              accessibilityRole="button"
              accessibilityLabel={t.titre}
              style={({ pressed }) => [{ width: '47%', flexGrow: 1, minHeight: 92, borderRadius: 20, padding: 12, gap: 8, backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}
            >
              <ApercuQuestion cle={t.cle} />
              <Ink size={13} weight="extraBold" color={pa.texte} style={{ lineHeight: 17 }}>{t.titre}</Ink>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <FeuillePoidsDeDepart visible={poidsOuvert} onClose={() => setPoidsOuvert(false)} />

      {/* séries et répétitions : le même texte et les mêmes études que « Comment choisir ta charge » */}
      <Sheet visible={seriesOuvert} onClose={() => setSeriesOuvert(false)} title={traduire('Combien de séries et de répétitions ?')}>
        <View style={{ gap: 14, paddingHorizontal: 4 }}>
          <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire('Ton programme te donne les séries et la fourchette de répétitions de chaque exercice. Voici comment choisir ta charge.')}</Ink>
          {COMMENT_CHOISIR.map((x) => (
            <View key={x.titre} style={{ gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          ))}
          <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <Ink size={12} weight="extraBold" color={c.textMuted}>{traduire('LES ÉTUDES')}</Ink>
            {SOURCES_COMMENT_CHOISIR.map((id) => {
              const s = sourceParId(id);
              if (!s) return null;
              return (
                <Pressable key={id} onPress={() => { tap(); void safeOpenURL(s.lien); }} accessibilityRole="link" style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Ink size={12} weight="extraBold" color={c.accent}>{`${s.auteurs}, ${s.annee}`}</Ink>
                  <Ink size={12} color={c.textSecondary}>{traduire(s.apport)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>

      {/* quand monter la charge : la règle de progression des programmes (catalogue.ts) */}
      <Sheet visible={monterOuvert} onClose={() => setMonterOuvert(false)} title={traduire('Quand monter la charge')}>
        <View style={{ gap: 14, paddingHorizontal: 4, paddingBottom: 8 }}>
          <Ink size={15} weight="bold" style={{ lineHeight: 21 }}>{traduire(PROGRESSION)}</Ink>
          {POIDS_DE_DEPART.slice(2).map((x) => (
            <View key={x.titre} style={{ gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

/** Le petit visuel de chaque question (maquette Coach-Accueil) : la barre chargée, 3 × 10, la courbe qui monte, l'anneau rempli */
function ApercuQuestion({ cle }: { cle: 'poids' | 'series' | 'monter' | 'but' }) {
  const pa = usePastel();
  const illus = useIllustrations();
  if (cle === 'series') {
    return (
      <View style={{ height: 30, flexDirection: 'row', alignItems: 'center', gap: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Ink size={22} weight="black" color={pa.menthe.titre}>3</Ink>
        <Ink size={14} weight="black" color={pa.texte2}>×</Ink>
        <Ink size={22} weight="black" color={pa.menthe.titre}>10</Ink>
      </View>
    );
  }
  if (cle === 'but' && illus.stickers) {
    return <Image source={illus.img('calendrier')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={{ height: 30 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {cle === 'poids' ? (
        <Svg width="100%" height={30} viewBox="0 0 140 30" preserveAspectRatio="none">
          <Rect x={0} y={13} width={140} height={4} rx={2} fill={pa.bleu.fond} />
          <Rect x={18} y={4} width={10} height={22} rx={3} fill={pa.bleu.barre} />
          <Rect x={30} y={7} width={8} height={16} rx={3} fill={pa.bleu.barre2} />
          <Rect x={112} y={4} width={10} height={22} rx={3} fill={pa.bleu.barre} />
          <Rect x={102} y={7} width={8} height={16} rx={3} fill={pa.bleu.barre2} />
        </Svg>
      ) : cle === 'monter' ? (
        <Svg width="100%" height={30} viewBox="0 0 140 30" preserveAspectRatio="none">
          <Path d="M4 26 C30 24, 40 18, 60 18 S 100 10, 132 4" fill="none" stroke={pa.creme.titre} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={132} cy={4} r={3.5} fill={pa.carte} stroke={pa.creme.titre} strokeWidth={2.5} />
        </Svg>
      ) : (
        <Svg width={30} height={30} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={14} fill="none" stroke={pa.lilas.fond} strokeWidth={5} />
          <Circle cx={18} cy={18} r={14} fill="none" stroke={pa.lilas.barre} strokeWidth={5} />
          <Path d="M12 18l4 4 8-8" fill="none" stroke={pa.lilas.titre} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}
