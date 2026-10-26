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
 */
import React, { useCallback, useRef, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { CarteIllustree, EnTeteRond, nomCourt, salutation, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { getProfile } from '@/lib/database';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
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
  const pal = usePaletteProgramme();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [, setCharge] = useState(false);
  const [femme, setFemme] = useState(false);
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
      getProfile().then((pr) => { if (vivant) setFemme(pr?.avatar_gender === 'femme'); setNom(pr?.name ?? null); }).catch(() => {});
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
  const BLANC = c.onDark;

  const depart = (chemin?: 'liste') => {
    tap();
    router.push({ pathname: '/coach-depart' as any, params: chemin ? { chemin } : {} });
  };

  const tuiles: { cle: string; chiffre?: string; icone?: IconName; couleur: string; titre: string; action: () => void }[] = [
    { cle: 'poids', chiffre: 'kg ?', couleur: pal.indigo, titre: traduire('Quel poids je prends'), action: () => { tap(); setPoidsOuvert(true); } },
    { cle: 'series', chiffre: '3 × 10', couleur: pal.indigo, titre: traduire('Séries et répétitions'), action: () => { tap(); setSeriesOuvert(true); } },
    { cle: 'monter', chiffre: '+5 %', couleur: pal.vert, titre: traduire('Quand monter la charge'), action: () => { tap(); setMonterOuvert(true); } },
    { cle: 'but', icone: 'calendar', couleur: pal.orange, titre: traduire('Quand j’atteins mon but'), action: () => { tap(); router.push('/objectif' as any); } },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: insets.bottom + 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <EnTeteRond salut={traduire('Ton coach')} titre={salutation(nom)} repli="/(tabs)" />

        {/* 26 octobre 2026 (Houari : « la présentation, tu devrais mieux faire ») : la carte indigo illustrée en tête,
            puis les trois choix en tuiles colorées, le programme en cours dans la carte */}
        <CarteIllustree
          surtitre={traduire('Ton coach')}
          titre={traduire('On fait quoi aujourd’hui ?')}
          texte={traduire('Choisis, je m’occupe du reste.')}
          image={sportImage('musculation', femme, 1)}
          style={{ minHeight: 200 }}
        >
          {p && jour ? (
            <Pressable
              onPress={() => { tap(); router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } }); }}
              accessibilityRole="button"
              accessibilityLabel={`${traduire('Continuer')}, ${traduire(p.titre)}`}
              style={({ pressed }) => ({ alignSelf: 'flex-start', maxWidth: '68%', minHeight: 48, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: BLANC, opacity: pressed ? 0.9 : 1, justifyContent: 'center' })}
            >
              <Ink size={12} weight="bold" color={pal.texte2} numberOfLines={1}>{traduire('Continuer')}</Ink>
              <Ink size={14} weight="black" color={pal.indigo} numberOfLines={1}>{nomCourt(traduire(p.titre))}</Ink>
            </Pressable>
          ) : null}
        </CarteIllustree>

        <Pressable
          onPress={() => depart('liste')}
          accessibilityRole="button"
          accessibilityLabel={`${traduire('Je sais ce que je veux')}, ${traduire('PPL, Upper Lower, Push Pull...')}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 104, padding: 18, borderRadius: 26, backgroundColor: pal.teinte, opacity: pressed ? 0.9 : 1 })}
        >
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="list" size={28} color={pal.indigo} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Ink size={19} weight="black" tight color={pal.texte}>{traduire('Je sais ce que je veux')}</Ink>
            <Ink size={13} weight="bold" color={pal.texte2}>{traduire('PPL, Upper Lower, Push Pull...')}</Ink>
          </View>
          <Icon name="chevron" size={18} color={pal.indigo} />
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TuileChoix icone="search" fond={pal.orangeTint} encre={pal.orange} titre={traduire('Trouve mon programme')} sous={traduire('Quelques questions')} onPress={() => depart()} />
          <TuileChoix icone="bolt" fond={pal.vertTint} encre={pal.vert} titre={traduire('Juste une séance')} sous={traduire('Tout de suite')} onPress={() => { tap(); router.push('/programmes/zones' as any); }} />
        </View>

        {/* 3. UNE QUESTION ? */}
        <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header" style={{ marginTop: 4 }}>{traduire('Une question ?')}</Ink>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {tuiles.map((t) => (
            <Pressable
              key={t.cle}
              onPress={t.action}
              accessibilityRole="button"
              accessibilityLabel={t.titre}
              style={({ pressed }) => ({ width: '47%', flexGrow: 1, minHeight: 104, borderRadius: 22, padding: 16, gap: 10, backgroundColor: pal.carte, opacity: pressed ? 0.85 : 1 })}
            >
              {t.icone ? <Icon name={t.icone} size={26} color={t.couleur} /> : <Ink size={22} weight="black" color={t.couleur}>{t.chiffre}</Ink>}
              <Ink size={13} weight="extraBold" color={pal.texte}>{t.titre}</Ink>
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

/** Une tuile de choix carrée, colorée */
function TuileChoix({ icone, fond, encre, titre, sous, onPress }: { icone: IconName; fond: string; encre: string; titre: string; sous: string; onPress: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titre}, ${sous}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 150, padding: 16, borderRadius: 26, backgroundColor: fond, gap: 10, justifyContent: 'space-between', opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icone} size={24} color={encre} />
      </View>
      <View style={{ gap: 2 }}>
        <Ink size={16} weight="black" tight color={pal.texte}>{titre}</Ink>
        <Ink size={12} weight="bold" color={pal.texte2}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

