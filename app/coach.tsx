/**
 * « Ton coach » (26 octobre 2026), refait le 27 octobre 2026 d'après la maquette choisie par Houari
 * (Coach2-A-Entree.dc.html). Ouvert depuis l'accueil et depuis l'onglet Séances, la barre d'onglets ne change pas.
 *  1. Deux grands choix : « J'ai un programme » (app/coach-sais.tsx, les 30 programmes rangés par type) et
 *     « Aide moi à choisir » (app/coach-depart.tsx, le Guide : sept questions puis ton programme).
 *  2. MES PROGRAMMES : celui en cours (sa semaine, où tu en es, ▶ lance la séance du jour), tes programmes construits,
 *     « Créer mon programme » (app/coach-construire.tsx). « Tes jours » du programme en cours restent juste dessous.
 *  3. EXPLORER PAR MUSCLE : la silhouette de face et de dos, un muscle touché ouvre sa séance (app/programmes/zones.tsx).
 *  4. Les séances toutes faites (haut du corps, bas du corps...).
 * « Une question ? » est passé à la fin du Guide et en bas de la page du programme (QuestionsCoach.tsx).
 * Première ouverture, sans programme et sans départ fait : le Guide s'ouvre, comme avant.
 * Ancien rendu : _archive_ancien_design_2026-10-09/coach_2026-10-27/avant_entree_coach2/.
 */
import React, { useCallback, useRef, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { Capitales, nomCourt, ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import type { FamillePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { MiniSemaine, PuceConseil } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { TesJoursEnCours } from '@/components/yoroi/v2/programmes/TesJours';
import { BoutonLecture } from '@/components/yoroi/v2/programmes/Lecture';
import { PROGRAMMES } from '@/lib/v2/programmes/catalogue';
import { routeDuJour } from '@/lib/v2/programmes/lancer';
import { lireDepart } from '@/lib/v2/programmes/depart';
import { RACCOURCIS_ZONES, ZONES, zoneParId } from '@/lib/v2/programmes/zones';
import { DeuxVues } from '@/components/yoroi/v2/programmes/CarteMuscles';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { chargerProgrammesPerso, joursDuPerso, nomDuPerso, programmesVisibles } from '@/lib/v2/programmes/monProgramme';
import type { ProgrammePerso } from '@/lib/v2/programmes/monProgramme';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import { libelleHeureRappel } from '@/lib/v2/programmes/rappel';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, joursDuProgramme, prochainJour, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

/** Les séances toutes faites, chacune dans sa teinte */
const TEINTE_RACCOURCI: Record<string, 'bleu' | 'lilas' | 'creme' | 'menthe' | 'peche'> = { haut: 'bleu', bas: 'peche', fessiers_abdos: 'lilas', entier: 'menthe', grip: 'creme' };

export default function CoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pa = usePastel();
  const illus = useIllustrations();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [persos, setPersos] = useState<ProgrammePerso[]>([]);
  // le muscle touché sur la carte musculaire
  const [muscle, setMuscle] = useState<ZoneId | null>(null);
  const { width } = useWindowDimensions();
  const largeurCarte = width - 32 - 28;
  // le départ s'ouvre tout seul une fois par visite, jamais en boucle
  const departOuvert = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      const charger = () => {
        chargerProgrammeActif().then((a) => { if (vivant) setActif(a); }).catch(() => { if (vivant) setActif(null); });
        chargerProgrammesPerso().then((l) => { if (vivant) setPersos(programmesVisibles(l)); }).catch(() => {});
      };
      charger();
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
  const actifPerso = !!p && estProgrammePerso(p.id);
  const autres = persos.filter((x) => x.id !== actif?.id);
  const famille = (t: keyof Pick<typeof pa, 'bleu' | 'lilas' | 'creme' | 'menthe' | 'peche'>): FamillePastel => pa[t];

  const nomPerso = (x: Pick<ProgrammePerso, 'nom' | 'semaine'>) => {
    const n = nomDuPerso(x);
    return n.gabarit === '{0}' ? String(n.valeurs[0]) : traduire(n.gabarit, ...n.valeurs);
  };

  return (
    <View style={{ flex: 1, backgroundColor: pa.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* en tête : retour, « Entraînement » en petites capitales, « Coach » en grand */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={() => { tap(); if (router.canGoBack()) router.back(); else router.replace('/(tabs)' as any); }}
            accessibilityRole="button"
            accessibilityLabel={traduire('Retour')}
            style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, ombrePastel(pa.ombre)]}
          >
            <Icon name="chevronLeft" size={18} color={pa.texte} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Capitales texte={traduire('Entraînement')} couleur={pa.bleu.titre} />
            <Ink size={32} weight="black" tight color={pa.texte} accessibilityRole="header" style={{ lineHeight: 36 }}>{traduire('Coach')}</Ink>
          </View>
        </View>

        {/* 1. DEUX GRANDS CHOIX */}
        <Animated.View entering={FadeInDown.duration(380).delay(40)} style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <GrandChoix
            famille={pa.bleu}
            sticker="carnet"
            icone="list"
            titre={traduire('J’ai un programme')}
            sous={traduire('PPL, Upper Lower, Full body et {0} autres', PROGRAMMES.length - 3)}
            onPress={() => { tap(); router.push('/coach-sais' as any); }}
          />
          <GrandChoix
            famille={pa.lilas}
            sticker="coach"
            icone="target"
            rond
            badge={traduire('Débutant')}
            titre={traduire('Aide moi à choisir')}
            sous={traduire('7 questions, puis ton programme')}
            onPress={() => { tap(); router.push('/coach-depart' as any); }}
          />
        </Animated.View>

        {/* 2. MES PROGRAMMES */}
        <Animated.View entering={FadeInDown.duration(380).delay(110)} layout={LinearTransition}>
        <View style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}><Capitales texte={traduire('Mes programmes')} couleur={pa.bleu.encre} /></View>
        <View style={[{ backgroundColor: pa.carte, borderRadius: 24, paddingHorizontal: 14 }, ombrePastel(pa.ombre)]}>
          {p && jour && actif ? (
            <LigneProgramme
              jours={joursDuProgramme(actif, p)}
              couleur={actifPerso ? pa.creme.barre : pa.bleu.barre}
              titre={actifPerso ? nomPerso(persos.find((x) => x.id === p.id) ?? { nom: '', semaine: [] }) : traduire(p.titre)}
              sous={actifPerso ? traduire('En cours, semaine {0}', semaineDuProgramme(actif)) : traduire('En cours, semaine {0} sur {1}', Math.min(semaineDuProgramme(actif), p.semaines), p.semaines)}
              sous2={traduire('Prochaine : {0}', nomCourt(traduire(jour.titre)))}
              onPress={() => { tap(); router.push({ pathname: '/programmes/[id]' as any, params: { id: p.id } }); }}
              lancer={() => { const r = routeDuJour(p, jour, semaineDuProgramme(actif)); router.push({ pathname: r.pathname as any, params: r.params }); }}
            />
          ) : null}
          {/* l'aperçu vivant de ta prochaine séance : ses premiers exercices */}
          {p && jour && jour.exos.length ? (
            <Animated.View key={jour.id} entering={FadeIn.duration(300)} style={{ marginBottom: 12, padding: 12, borderRadius: 18, backgroundColor: pa.bleu.fond, gap: 6 }}>
              <Capitales texte={traduire('Ta prochaine séance')} couleur={pa.bleu.titre} taille={10.5} />
              {jour.exos.slice(0, 3).map((e, k) => (
                <View key={`${e.nom}${k}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={11} weight="black" color={pa.bleu.titre}>{String(k + 1)}</Ink>
                  </View>
                  <Ink size={13.5} weight="bold" color={pa.texte} style={{ flex: 1 }} numberOfLines={1}>{sansTiret(traduire(nomFr(e.nom)))}</Ink>
                  <Ink size={12.5} weight="extraBold" color={pa.texte2}>{`${e.series} × ${e.repsMin === e.repsMax ? e.repsMin : traduire('{0} à {1}', e.repsMin, e.repsMax)}`}</Ink>
                </View>
              ))}
              {jour.exos.length > 3 ? <Ink size={12.5} weight="bold" color={pa.texte2}>{traduirePluriel(jour.exos.length - 3, jour.exos.length - 3 > 1, 'et {0} autre', 'et {0} autres', jour.exos.length - 3)}</Ink> : null}
            </Animated.View>
          ) : null}
          {/* état vide : rien en cours, rien de construit */}
          {!p && !autres.length ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              {illus.stickers ? <Image source={illus.img('carnet_vide')} style={{ width: 52, height: 52 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={15} weight="black" color={pa.texte}>{traduire('Pas encore de programme')}</Ink>
                <Ink size={13} weight="bold" color={pa.texte2}>{traduire('Choisis en un plus haut, ou construis le tien.')}</Ink>
              </View>
            </View>
          ) : null}
          {autres.map((x) => (
            <LigneProgramme
              key={x.id}
              trait={!!(p && jour) || x !== autres[0]}
              jours={joursDuPerso(x)}
              couleur={pa.creme.barre}
              titre={nomPerso(x)}
              sous={x.rappel?.actif ? traduire('Créé par toi, rappel à {0}', libelleHeureRappel(x.rappel.heure).replace(/ /g, '\u00A0')) : traduire('Créé par toi')}
              onPress={() => { tap(); router.push({ pathname: '/coach-construire' as any, params: { id: x.id } }); }}
            />
          ))}
          <Pressable
            onPress={() => { tap(); router.push('/coach-construire' as any); }}
            accessibilityRole="button"
            accessibilityLabel={`${traduire('Créer mon programme')}, ${traduire('Tes exercices, tes jours, tes rappels')}`}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 12, borderTopWidth: 1, borderColor: pa.ligne, opacity: pressed ? 0.75 : 1 })}
          >
            <View style={{ width: 64, alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: pa.bleu.barre2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" size={18} color="#FFFFFF" strokeWidth={3.2} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={16} weight="black" color={pa.surBouton}>{traduire('Créer mon programme')}</Ink>
              <Ink size={13} weight="bold" color={pa.texte2}>{traduire('Tes exercices, tes jours, tes rappels')}</Ink>
            </View>
            <Icon name="chevron" size={16} color={pa.texte3} />
          </Pressable>
        </View>
        </Animated.View>

        {/* « Tes jours » du programme du catalogue en cours, modifiables d'ici (TesJours.tsx) ; le tien se modifie dans sa page */}
        {p && !actifPerso ? <View style={{ marginTop: 10 }}><TesJoursEnCours programme={p} /></View> : null}

        {/* 3. EXPLORER PAR MUSCLE : la carte musculaire, face et dos ; toucher un muscle le montre et donne sa séance */}
        <Animated.View entering={FadeInDown.duration(380).delay(180)}>
        <View style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}><Capitales texte={traduire('Explorer par muscle')} couleur={pa.menthe.titre} /></View>
        <View style={[{ backgroundColor: pa.carte, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 14, gap: 14 }, ombrePastel(pa.ombre)]}>
          <DeuxVues largeur={Math.min(largeurCarte, 380)} choisies={muscle ? [muscle] : []} onToggle={(z) => setMuscle((m) => (m === z ? null : z))} />
          {muscle ? (
            <Animated.View key={muscle} entering={FadeInDown.duration(220)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: pa.bleu.fond }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={17} weight="black" tight color={pa.texte}>{traduire(zoneParId(muscle)?.nom ?? muscle)}</Ink>
                <Ink size={13} weight="bold" color={pa.texte2}>{traduirePluriel(zoneParId(muscle)?.exos.length ?? 0, (zoneParId(muscle)?.exos.length ?? 0) > 1, '{0} exercice', '{0} exercices', zoneParId(muscle)?.exos.length ?? 0)}</Ink>
              </View>
              <BoutonPrincipal onPress={() => { tap(); router.push({ pathname: '/programmes/zones' as any, params: { zone: muscle } }); }} haptique="none" label={traduire('Voir la séance')} hauteur={44} rayon={22} tailleTexte={14} compact lignes={1} />
            </Animated.View>
          ) : (
            <Ink size={13} weight="bold" color={pa.texte2} style={{ textAlign: 'center' }}>{traduire('Touche un muscle pour voir sa séance')}</Ink>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}>
            {ZONES.map((z) => {
              const on = z.id === muscle;
              return (
                <Pressable key={z.id} onPress={() => { tap(); setMuscle(on ? null : z.id); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? pa.bouton : pressed ? pa.bleu.fond : pa.page })}>
                  <Ink size={13.5} weight="extraBold" color={on ? pa.surBouton : pa.texte}>{traduire(z.nom)}</Ink>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        </Animated.View>

        {/* 4. SÉANCES TOUTES FAITES */}
        <Animated.View entering={FadeInDown.duration(380).delay(240)}>
        <View style={{ marginTop: 22, marginBottom: 8, marginHorizontal: 2 }}><Capitales texte={traduire('Séances toutes faites')} couleur={pa.creme.titre} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RACCOURCIS_ZONES.map((r) => {
            const f = famille(TEINTE_RACCOURCI[r.id] ?? 'bleu');
            return (
              <Pressable
                key={r.id}
                onPress={() => { tap(); router.push({ pathname: '/programmes/zones' as any, params: { preset: r.id } }); }}
                accessibilityRole="button"
                style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', backgroundColor: f.fond, transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <Ink size={14} weight="extraBold" color={f.titre}>{traduire(r.nom)}</Ink>
              </Pressable>
            );
          })}
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** Un des deux grands choix : carte pastel, sticker (ou petit carré d'icône), titre, une ligne */
function GrandChoix({ famille, sticker, icone, rond, badge, titre, sous, onPress }: { famille: FamillePastel; sticker: NomSticker; icone: IconName; rond?: boolean; badge?: string; titre: string; sous: string; onPress: () => void }) {
  const pa = usePastel();
  const illus = useIllustrations();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titre}, ${sous}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 150, borderRadius: 24, padding: 14, gap: 8, backgroundColor: famille.fond, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, minHeight: 48 }}>
        {illus.stickers ? (
          rond ? (
            <View style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }, ombrePastel(pa.ombre)]}>
              <Image source={illus.img(sticker)} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
          ) : (
            <Image source={illus.img(sticker)} style={{ width: 46, height: 46 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          )
        ) : (
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icone} size={19} color={famille.titre} />
          </View>
        )}
        {badge ? <View style={{ flexShrink: 1 }}><PuceConseil texte={badge} /></View> : null}
      </View>
      <Ink size={19} weight="black" color={pa.texte} style={{ lineHeight: 23 }}>{titre}</Ink>
      <Ink size={13} weight="bold" color={pa.texte2} style={{ lineHeight: 18 }}>{sous}</Ink>
    </Pressable>
  );
}

/** Une ligne de « Mes programmes » : la semaine en barres, le nom, où tu en es ; ▶ pour le programme en cours */
function LigneProgramme({ jours, couleur, titre, sous, sous2, onPress, lancer, trait }: { jours: readonly number[]; couleur: string; titre: string; sous: string; sous2?: string; onPress: () => void; lancer?: () => void; trait?: boolean }) {
  const pa = usePastel();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: trait ? 1 : 0, borderColor: pa.ligne }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[titre, sous, sous2].filter(Boolean).join(', ')} style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 76, paddingVertical: 12, opacity: pressed ? 0.75 : 1 })}>
        <View style={{ width: 64 }}>
          <MiniSemaine jours={jours} couleur={couleur} vide={pa.ligne} hauteur={34} gap={2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={16} weight="black" color={pa.texte} numberOfLines={2}>{titre.replace(/(\d) /g, '$1\u00A0')}</Ink>
          <Ink size={13} weight="bold" color={pa.texte2}>{sous}</Ink>
          {sous2 ? <Ink size={13} weight="bold" color={pa.texte2} numberOfLines={1}>{sous2}</Ink> : null}
        </View>
        {lancer ? null : <Icon name="chevron" size={16} color={pa.texte3} />}
      </Pressable>
      {lancer ? (
        <BoutonLecture onPress={lancer} label={traduire('Commencer la séance du jour')} />
      ) : null}
    </View>
  );
}
