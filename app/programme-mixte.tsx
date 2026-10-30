/**
 * Ton programme mixte (30 octobre 2026). Houari : « Crée moi un programme mixte : si je veux faire du PPL et du
 * Upper Lower ou du Full body, à ma façon, et choisir si c'est habituel ou ponctuel. »
 * Ouvert depuis « Je sais ce que je veux » (app/coach-sais.tsx, tuile « Mixte, à ta façon ») et, en raccourci
 * ponctuel, depuis la page du programme en cours (« Faire une semaine mixte », mode=ponctuel : on part de l'étape 2
 * avec ta semaine actuelle).
 *  1. Combien de jours par semaine (tes jours connus préchoisis).
 *  2. Ta semaine : les 7 jours de Tes jours (TesJours.tsx), proposés d'après tes jours, tout se change ; Semaines A et B
 *     en option ; ce que ta semaine travaille et combien de groupes reviennent 2 fois.
 *  3. Un nom, puis « Habituel » (ton programme, 8, 12 semaines ou sans fin) ou « Ponctuel » (cette semaine, les
 *     2 prochaines semaines ou jusqu'à une date, par dessus ton programme en cours).
 * Le modèle : lib/v2/programmes/mixte.ts ; l'enregistrement : suivi.ts (creerMixteHabituel, lancerMixtePonctuel).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { illustration } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { TuilesJours } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { TesJours, semaineAffichee } from '@/components/yoroi/v2/programmes/TesJours';
import { ChoixDuree } from '@/components/yoroi/v2/programmes/GarderProgramme';
import { DeuxFoisPrevu } from '@/components/yoroi/v2/programmes/Mixte';
import { PROGRAMMES, programmeParId } from '@/lib/v2/programmes/catalogue';
import { indexJour } from '@/lib/v2/programmes/coach';
import { BASE_MIXTE, FAMILLES_PROPOSEES, JOURS_MIXTE, MAX_JOURS_PONCTUEL, NOM_MIXTE, borneFin, finDuPonctuel, isoDe, joursPourMixte, plusJours, suggestionMixte } from '@/lib/v2/programmes/mixte';
import type { DureePonctuel } from '@/lib/v2/programmes/mixte';
import { joursLePlusProche } from '@/lib/v2/programmes/preselection';
import { lireProfilCoach } from '@/lib/v2/programmes/profilCoach';
import { FAMILLES_SEANCES } from '@/lib/v2/programmes/semaineLibre';
import type { LigneSemaine, SemaineLibre } from '@/lib/v2/programmes/semaineLibre';
import { chargerProgrammeActif, creerMixteHabituel, joursConseilles, joursDuProgramme, lancerMixtePonctuel, ponctuelLe } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';
import logger from '@/lib/security/logger';

type Etape = 'jours' | 'semaine' | 'choix';
type Facon = 'habituel' | 'ponctuel';
type FinChoisie = DureePonctuel | 'date';
const NOMS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** « Push, Pull, Upper, Lower », « Full body ×3 » */
function legendeJours(n: number): string {
  const f = FAMILLES_PROPOSEES[n] ?? [];
  const vus: { id: string; n: number }[] = [];
  for (const x of f) {
    const v = vus.find((y) => y.id === x);
    if (v) v.n += 1;
    else vus.push({ id: x, n: 1 });
  }
  return vus.map((v) => `${traduire(FAMILLES_SEANCES.find((y) => y.id === v.id)?.label ?? v.id)}${v.n > 1 ? ` ×${v.n}` : ''}`).join(', ');
}

/** « dimanche 8/11 » */
function dateCourte(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return traduire('{0} {1}/{2}', traduire(NOMS[indexJour(d)]), d.getDate(), String(d.getMonth() + 1).padStart(2, '0'));
}

export default function ProgrammeMixte() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pal = usePaletteProgramme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const raccourci = mode === 'ponctuel';
  const defilement = useRef<ScrollView>(null);

  const [charge, setCharge] = useState(false);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [connus, setConnus] = useState<number[]>([]);
  const [etape, setEtape] = useState<Etape>(raccourci ? 'semaine' : 'jours');
  const [nJours, setNJours] = useState<number | undefined>(undefined);
  const [base, setBase] = useState<Programme>(BASE_MIXTE);
  const [semaine, setSemaine] = useState<SemaineLibre | null>(null);
  const [nom, setNom] = useState('');
  const [facon, setFacon] = useState<Facon>(raccourci ? 'ponctuel' : 'habituel');
  const [duree, setDuree] = useState<number>(0);
  const [finChoisie, setFinChoisie] = useState<FinChoisie>('semaine');
  const [finDate, setFinDate] = useState<string>(() => finDuPonctuel('deux'));
  const [occupe, setOccupe] = useState(false);

  // une seule lecture au montage : ton programme en cours et tes jours connus
  useEffect(() => {
    let vivant = true;
    Promise.all([chargerProgrammeActif().catch(() => null), lireProfilCoach().catch(() => null)])
      .then(([a, profil]) => {
        if (!vivant) return;
        setActif(a);
        const p = a ? programmeParId(a.id) ?? null : null;
        const jours = profil?.jours?.length ? profil.jours : a && p ? joursDuProgramme(a, p) : [];
        setConnus(jours);
        if (jours.length) setNJours(joursLePlusProche(jours.length, JOURS_MIXTE));
        if (raccourci && a && p) {
          // ta semaine mixte déjà en cours, sinon ta semaine actuelle : tu changes juste quelques jours
          const pc = ponctuelLe(a, new Date());
          setBase(p);
          setSemaine(pc ? pc.semaine : semaineAffichee(a, p).semaine);
          if (pc?.nom) setNom(pc.nom);
        } else if (raccourci) {
          setEtape('jours');
        }
      })
      .finally(() => { if (vivant) setCharge(true); });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const precedente = (): boolean => {
    if (etape === 'choix') { setEtape('semaine'); return true; }
    if (etape === 'semaine' && !(raccourci && base !== BASE_MIXTE)) { setEtape('jours'); return true; }
    return false;
  };
  const retour = () => {
    tap();
    if (precedente()) return;
    if (router.canGoBack()) router.back();
    else router.replace('/coach-sais' as any);
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', precedente);
    return () => sub.remove();
  });
  useEffect(() => { defilement.current?.scrollTo({ y: 0, animated: false }); }, [etape]);

  const choisirJours = (n: number) => {
    tap();
    setNJours(n);
    setBase(BASE_MIXTE);
    setSemaine(suggestionMixte(joursPourMixte(n, connus, joursConseilles(n)), PROGRAMMES));
    setTimeout(() => setEtape('semaine'), 160);
  };

  const lignes: LigneSemaine[] = semaine?.ab && semaine.b ? ['a', 'b'] : ['a'];
  const pActif = actif ? programmeParId(actif.id) ?? null : null;
  const jusquau = finChoisie === 'date' ? borneFin(finDate) : finDuPonctuel(finChoisie);
  const aujIso = isoDe(new Date());
  const maxIso = plusJours(aujIso, MAX_JOURS_PONCTUEL - 1);

  const lancer = async () => {
    if (!semaine || occupe) return;
    setOccupe(true);
    const n = nom.trim() || traduire(NOM_MIXTE);
    try {
      const a = facon === 'habituel' ? await creerMixteHabituel(n, semaine, duree) : await lancerMixtePonctuel(n, semaine, jusquau);
      if (!a) {
        appAlert(traduire('Ta semaine n’a pas pu être enregistrée'), traduire('Vérifie qu’il y a au moins une séance d’exercices, puis réessaie.'));
        return;
      }
      router.replace({ pathname: '/programmes/[id]' as any, params: { id: a.id } });
    } catch (e) {
      logger.error('[programme-mixte] enregistrement', e);
      appAlert(traduire('Ta semaine n’a pas pu être enregistrée'), traduire('Rien n’a changé. Réessaie dans un instant.'));
    } finally {
      setOccupe(false);
    }
  };

  const titre = etape === 'jours' ? traduire('Combien de jours par semaine ?') : etape === 'semaine' ? traduire('Compose ta semaine') : traduire('Habituel ou ponctuel ?');
  const sous = etape === 'jours'
    ? traduire('Je te propose une semaine, tu changes tout ce que tu veux')
    : etape === 'semaine'
      ? traduire('Touche un jour pour choisir sa séance.')
      : raccourci ? traduire('Pour quelques jours, ton programme reprend après') : traduire('Pour longtemps, ou juste pour quelques jours');
  const rang = raccourci ? (etape === 'semaine' ? 0 : 1) : etape === 'jours' ? 0 : etape === 'semaine' ? 1 : 2;
  const nbEtapes = raccourci ? 2 : 3;

  return (
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      <ScrollView ref={defilement} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire('Retour')} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <Icon name="chevronLeft" size={18} color={pal.texte} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Ink size={13} weight="extraBold" color={pal.indigo}>{raccourci ? traduire('Ta semaine mixte') : traduire('Ton programme mixte')}</Ink>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: nbEtapes }, (_, k) => (
                <View key={k} style={{ flex: 1, maxWidth: 40, height: 4, borderRadius: 2, backgroundColor: k <= rang ? pal.indigo : pal.anneau }} />
              ))}
            </View>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Ink size={26} weight="black" tight color={pal.texte} accessibilityRole="header" style={{ lineHeight: 31 }}>{titre}</Ink>
          <Ink size={14} weight="bold" color={pal.texte2}>{sous}</Ink>
        </View>

        {!charge ? null : etape === 'jours' ? (
          <Animated.View entering={FadeInDown.duration(260)}>
            <TuilesJours options={JOURS_MIXTE} valeur={nJours} nombre={() => 0} legende={legendeJours} onChoisir={choisirJours} />
            {nJours !== undefined ? <BoutonPrincipal label={traduire('Continuer')} onPress={() => choisirJours(nJours)} haptique="none" style={{ marginTop: 16 }} /> : null}
          </Animated.View>
        ) : etape === 'semaine' && semaine ? (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 14 }}>
            <TesJours programme={base} semaine={semaine} onSemaine={setSemaine} fin={base === BASE_MIXTE ? null : actif?.fin} />
            <DeuxFoisPrevu semaine={semaine} base={base} lignes={lignes} />
            <BoutonPrincipal label={traduire('Suivant')} onPress={() => { tap(); setEtape('choix'); }} haptique="none" />
          </Animated.View>
        ) : etape === 'choix' && semaine ? (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 14 }}>
            {/* le nom */}
            <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 16, gap: 10 }}>
              <Ink size={14} weight="black" color={pal.texte}>{traduire('Son nom')}</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 18, backgroundColor: pal.page }}>
                <Icon name="edit" size={16} color={pal.texte2} />
                <TextInput
                  value={nom}
                  onChangeText={(t) => setNom(t.slice(0, 40))}
                  placeholder={traduire(NOM_MIXTE)}
                  placeholderTextColor={pal.texte3}
                  accessibilityLabel={traduire('Nom du programme')}
                  returnKeyType="done"
                  style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: '700', color: pal.texte }}
                />
              </View>
            </View>

            {/* habituel ou ponctuel */}
            {!raccourci ? (
              <View style={{ gap: 10 }}>
                <CarteFacon
                  on={facon === 'habituel'}
                  fond={pal.vertTint}
                  sticker="repeter"
                  titre={traduire('Habituel')}
                  sous={traduire('Il devient ton programme, semaine après semaine')}
                  onPress={() => { tap(); setFacon('habituel'); }}
                />
                <CarteFacon
                  on={facon === 'ponctuel'}
                  fond={pal.orangeTint}
                  sticker="sablier"
                  titre={traduire('Ponctuel')}
                  sous={pActif ? traduire('Pour quelques jours, ton programme reprend après') : traduire('Pour quelques jours, puis tu choisis ton programme')}
                  onPress={() => { tap(); setFacon('ponctuel'); }}
                />
              </View>
            ) : null}

            {facon === 'habituel' ? (
              <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 16, gap: 12 }}>
                <ChoixDuree valeur={duree} onChange={setDuree} />
                <Note texte={pActif ? traduire('Il remplace {0} et reste dans Mes programmes. Tes séances faites et tes charges restent.', traduire(pActif.titre)) : traduire('Il rejoint Mes programmes. Tes séances faites et tes charges restent.')} />
              </View>
            ) : (
              <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 16, gap: 10 }}>
                <Ink size={14} weight="black" color={pal.texte}>{traduire('Jusqu’à quand ?')}</Ink>
                {([
                  ['semaine', traduire('Cette semaine'), traduire('Jusqu’à {0}', dateCourte(finDuPonctuel('semaine')))],
                  ['deux', traduire('Les 2 prochaines semaines'), traduire('Jusqu’à {0}', dateCourte(finDuPonctuel('deux')))],
                  ['date', traduire('Jusqu’à une date'), finChoisie === 'date' ? dateCourte(jusquau) : traduire('Tu choisis le jour')],
                ] as [FinChoisie, string, string][]).map(([id, t, s]) => (
                  <Pressable
                    key={id}
                    onPress={() => { tap(); setFinChoisie(id); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: finChoisie === id }}
                    accessibilityLabel={`${t}, ${s}`}
                    style={({ pressed }) => ({ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: pressed ? pal.teinte : pal.page, borderWidth: 2, borderColor: finChoisie === id ? pal.indigo : 'transparent' })}
                  >
                    <View style={{ flex: 1, gap: 1 }}>
                      <Ink size={14.5} weight="extraBold" color={pal.texte}>{t}</Ink>
                      <Ink size={12} weight="bold" color={pal.texte2}>{s}</Ink>
                    </View>
                    {finChoisie === id ? <Icon name="check" size={16} color={pal.indigo} strokeWidth={3} /> : null}
                  </Pressable>
                ))}
                {finChoisie === 'date' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 18, backgroundColor: pal.page }}>
                    <PasDate icone="chevronLeft" label={traduire('Un jour de moins')} actif={jusquau > aujIso} onPress={() => setFinDate(borneFin(plusJours(jusquau, -1)))} />
                    <Ink size={16} weight="black" color={pal.texte} style={{ flex: 1, textAlign: 'center' }}>{dateCourte(jusquau)}</Ink>
                    <PasDate icone="chevron" label={traduire('Un jour de plus')} actif={jusquau < maxIso} onPress={() => setFinDate(borneFin(plusJours(jusquau, 1)))} />
                  </View>
                ) : null}
                <Note texte={pActif ? traduire('{0} reprend tout seul après. Tes séances faites et tes charges restent.', traduire(pActif.titre)) : traduire('Après, tu choisis ton programme. Tes séances faites et tes charges restent.')} />
              </View>
            )}

            <BoutonPrincipal label={traduire('C’est parti')} onPress={() => void lancer()} loading={occupe} haptique="none" />
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function CarteFacon({ on, fond, sticker, titre, sous, onPress }: { on: boolean; fond: string; sticker: 'repeter' | 'sablier'; titre: string; sous: string; onPress: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${titre}, ${sous}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 88, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: on ? fond : pal.carte, borderWidth: 2, borderColor: on ? pal.indigo : 'transparent', transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: on ? pal.carte : fond, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={illustration(sticker)} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Ink size={18} weight="black" color={pal.texte}>{titre}</Ink>
        <Ink size={12.5} weight="bold" color={pal.texte2}>{sous}</Ink>
      </View>
      {on ? <Icon name="check" size={18} color={pal.indigo} strokeWidth={3} /> : null}
    </Pressable>
  );
}

function PasDate({ icone, label, actif, onPress }: { icone: 'chevronLeft' | 'chevron'; label: string; actif: boolean; onPress: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={() => { if (!actif) return; tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !actif }}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.teinte : pal.carte, opacity: actif ? 1 : 0.4 })}
    >
      <Icon name={icone} size={18} color={pal.texte} strokeWidth={3} />
    </Pressable>
  );
}

function Note({ texte }: { texte: string }) {
  const pal = usePaletteProgramme();
  return <Ink size={12.5} weight="bold" color={pal.texte2} style={{ lineHeight: 18 }}>{texte}</Ink>;
}
