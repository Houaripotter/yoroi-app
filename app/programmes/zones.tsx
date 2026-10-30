/**
 * « Quoi faire ? » (24 octobre 2026) : pour ceux qui arrivent à la salle perdus. YOROI donne la séance du jour :
 * chaque exercice avec son animation, combien en faire, comment bien le faire, et quand tu verras des résultats.
 * Un bouton lance la séance (app/seance/muscu.tsx, paramètre zones).
 *
 * 25 octobre 2026, refonte choisie avec Houari sur maquettes (« comme les autres applications de sport ») :
 * 1. CHOIX : « Qu'est-ce que tu veux travailler ? », quatre grosses cartes de séances toutes faites (le corps
 *    de face et de dos colorié, le nombre d'exercices, la durée), « Refaire » ta dernière séance, et
 *    « Je choisis mes muscles ». Un appui et la séance est prête (façon Freeletics).
 * 2. MUSCLES : une grille de cartes en images, une par muscle, rangées par région (façon Nike Training Club).
 * 3. SÉANCE : ta séance du jour, les exercices un par un, « Commencer » toujours en bas.
 * Paramètre preset (haut, bas, fessiers_abdos, entier) : la séance toute faite s'ouvre directement.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { CarteMuscles } from '@/components/yoroi/v2/programmes/CarteMuscles';
import { CarteExoZone } from '@/components/yoroi/v2/programmes/CarteExoZone';
import { P, blancA } from '@/components/yoroi/livePalette';
import { OMBRE_CARTE, carteBlanche, tonDuRang } from '@/components/yoroi/v2/seance/pastel';
import { RACCOURCIS_ZONES, ZONES, raccourciActif, seanceZones, titreZones, zoneParId } from '@/lib/v2/programmes/zones';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { dureeEstimee } from '@/lib/v2/programmes/express';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { illustration } from '@/components/yoroi/v2/stickers';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

/** 30 octobre 2026 : largeur maximale du contenu sur iPad et Mac */
const LARGEUR_CONTENU = 720;

// la carte programme : le torii, le chemin (meme image que le tampon « Quoi faire »)
const TORII: ImageSourcePropType = require('@/assets/avatars/app/ornements/torii.webp');

/** tes zones de ta derniere seance « Quoi faire ? » */
const CLE = 'yoroi_zones_choisies_v1';

/** les muscles ranges par region, de la tete aux pieds */
const GROUPES: { titre: string; ids: ZoneId[] }[] = [
  { titre: 'Haut du corps', ids: ['epaules', 'trapezes', 'pectoraux', 'dos', 'bras', 'avantbras', 'abdos'] },
  { titre: 'Bas du corps', ids: ['fessiers', 'quadriceps', 'ischios', 'mollets'] },
];

/** une image par muscle, la zone en rouge (decoupee des illustrations du corps, assets/corps/vignettes) */
const VIGNETTES: Record<ZoneId, ImageSourcePropType> = {
  epaules: require('@/assets/corps/vignettes/epaules.webp'),
  // 28 octobre 2026 : les trapèzes, découpés de la vignette du dos (même dessin, seule la zone en rouge)
  trapezes: require('@/assets/corps/vignettes/trapezes.webp'),
  pectoraux: require('@/assets/corps/vignettes/pectoraux.webp'),
  dos: require('@/assets/corps/vignettes/dos.webp'),
  bras: require('@/assets/corps/vignettes/bras.webp'),
  avantbras: require('@/assets/corps/vignettes/avantbras.webp'),
  abdos: require('@/assets/corps/vignettes/abdos.webp'),
  fessiers: require('@/assets/corps/vignettes/fessiers.webp'),
  quadriceps: require('@/assets/corps/vignettes/quadriceps.webp'),
  ischios: require('@/assets/corps/vignettes/ischios.webp'),
  mollets: require('@/assets/corps/vignettes/mollets.webp'),
};

type Mode = 'choix' | 'muscles' | 'seance';

const minutesDe = (zones: readonly string[]) => Math.max(10, Math.round((dureeEstimee(seanceZones(zones)) + 5) / 5) * 5);

export default function ZonesScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // 27 octobre 2026 (Coach, « Explorer par muscle ») : zone=pectoraux ouvre la séance de ce muscle, vue=muscles la grille
  const { preset, zone, vue } = useLocalSearchParams<{ preset?: string; zone?: string; vue?: string }>();
  const [mode, setMode] = useState<Mode>('choix');
  const [choisies, setChoisies] = useState<ZoneId[]>([]);
  const [derniereFois, setDerniereFois] = useState<ZoneId[]>([]);
  const defile = useRef<ScrollView>(null);

  // la seance toute faite demandee en parametre
  useEffect(() => {
    const r = RACCOURCIS_ZONES.find((x) => x.id === preset);
    if (r) {
      setChoisies(r.zones);
      setMode('seance');
      return;
    }
    const z = ZONES.find((x) => x.id === zone);
    if (z) {
      setChoisies([z.id]);
      setMode('seance');
      return;
    }
    if (vue === 'muscles') setMode('muscles');
  }, [preset, zone, vue]);
  // ta derniere seance, relue a chaque retour sur l'ecran (apres une seance, « Refaire » est a jour)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(CLE)
        .then((raw) => {
          const v = raw ? (JSON.parse(raw) as string[]) : [];
          setDerniereFois(ZONES.map((z) => z.id).filter((id) => v.includes(id)));
        })
        .catch(() => {});
    }, []),
  );

  const aller = (m: Mode) => {
    setMode(m);
    defile.current?.scrollTo({ y: 0, animated: false });
  };

  const retour = () => {
    if (mode === 'choix') router.back();
    else aller('choix');
  };
  // Android : le bouton retour du telephone revient d'abord au choix, seulement quand cet ecran est devant
  // (relecture du 25 octobre : sinon il restait actif pendant la seance et bloquait le retour)
  const retourRef = useRef(retour);
  retourRef.current = retour;
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (mode === 'choix') return false;
        retourRef.current();
        return true;
      });
      return () => sub.remove();
    }, [mode]),
  );

  const ouvrirSeance = (zones: ZoneId[]) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setChoisies(zones);
    aller('seance');
  };

  const toggle = (z: ZoneId) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setChoisies((l) => (l.includes(z) ? l.filter((x) => x !== z) : [...l, z]));
  };

  const exos = useMemo(() => seanceZones(choisies), [choisies]);
  const minutes = minutesDe(choisies);
  const titre = titreZones(choisies, traduire);
  const zoneDe = (nom: string) => ZONES.find((z) => choisies.includes(z.id) && z.exos.some((x) => x.nom === nom));
  const presetActif = RACCOURCIS_ZONES.find((r) => r.id === raccourciActif(choisies));

  const commencer = () => {
    if (!exos.length) return;
    tap();
    AsyncStorage.setItem(CLE, JSON.stringify(choisies)).catch(() => {});
    router.push({ pathname: '/seance/muscu' as any, params: { sport: 'musculation', zones: choisies.join(','), label: titre } });
  };

  const presets = useMemo(() => RACCOURCIS_ZONES.map((r) => ({ ...r, nb: seanceZones(r.zones).length, minutes: minutesDe(r.zones) })), []);
  // 30 octobre 2026 : sur iPad et Mac, le contenu garde 720 points au plus, centré (plus de vignettes géantes)
  const largeurContenu = Math.min(width, LARGEUR_CONTENU);
  const largeurTuile = Math.floor((largeurContenu - 44 - 10) / 2);
  const derniereEstUnPreset = !!raccourciActif(derniereFois);

  const titreEcran = mode === 'choix' ? traduire('Quoi faire ?') : mode === 'muscles' ? traduire('Choisis tes muscles') : presetActif ? traduire(presetActif.nom) : traduire('Ta séance');
  const sousTitre = mode === 'choix' ? traduire('Un appui et ta séance est prête') : mode === 'muscles' ? traduire('Touche les muscles que tu veux travailler') : traduire('Les exercices dans l’ordre, avec le bon geste');

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView ref={defile} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + (mode === 'choix' ? 40 : 120), gap: 14, width: '100%', maxWidth: LARGEUR_CONTENU, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <EnTete titre={titreEcran} sousTitre={sousTitre} onRetour={retour} repli="/programmes" style={{ marginHorizontal: -16, marginTop: -8 }} />

        {/* 1. CHOIX : les seances toutes faites en grosses cartes */}
        {mode === 'choix' ? (
          <>
            {/* 25 octobre 2026 (Houari : « Trouve ton programme est cache en bas, mets le en haut ») :
                le meilleur chemin pour progresser, donc en premier, en grande carte */}
            <Pressable
              onPress={() => { tap(); router.push('/programmes' as any); }}
              accessibilityRole="button"
              accessibilityLabel={`${traduire('Trouve ton programme')}, ${traduire('PPL, Upper Lower, Full body : prouvés par des études')}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 112, paddingVertical: 16, paddingLeft: 18, paddingRight: 12, borderRadius: 24, backgroundColor: c.carteDouce, opacity: pressed ? 0.88 : 1, overflow: 'hidden' })}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Ink size={11} weight="black" color={c.accentText} style={{ letterSpacing: 0.6 }}>{traduire('PROUVÉ PAR DES ÉTUDES')}</Ink>
                <Ink size={20} weight="black" tight>{traduire('Trouve ton programme')}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {['PPL', 'Upper Lower', 'Full body'].map((t) => (
                    <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: P.white }}>
                      <Ink size={12} weight="extraBold" color={c.accentText}>{t}</Ink>
                    </View>
                  ))}
                </View>
              </View>
              <Image source={illustration('torii', TORII)} style={{ width: 78, height: 78 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Icon name="chevron" size={18} color={c.accentText} />
            </Pressable>

            {/* ta derniere seance, quand elle n'est pas deja une des cartes */}
            {derniereFois.length && !derniereEstUnPreset ? (
              <Pressable
                onPress={() => ouvrirSeance(derniereFois)}
                accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, borderRadius: 22, backgroundColor: pressed ? P.white : c.accentTint })}
              >
                <Image source={illustration('repeter')} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={{ flex: 1, gap: 1 }}>
                  <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Refaire ta dernière séance')}</Ink>
                  <Ink size={16} weight="black" numberOfLines={2}>{titreZones(derniereFois, traduire)}</Ink>
                </View>
                <Icon name="chevron" size={18} color={c.textMuted} />
              </Pressable>
            ) : null}

            <Ink size={22} weight="black" tight accessibilityRole="header" style={{ marginTop: 6 }}>{traduire('Tu veux travailler quoi ?')}</Ink>
            {presets.filter((r) => r.id !== 'grip').map((r) => (
              <Pressable
                key={r.id}
                onPress={() => ouvrirSeance(r.zones)}
                accessibilityRole="button"
                accessibilityLabel={`${traduire(r.nom)}, ${traduire('{0} exercices', r.nb)}, ${traduire('environ {0} min', r.minutes)}`}
                style={({ pressed }) => [carteBlanche(c.surface, c.divider), { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderRadius: 24, opacity: pressed ? 0.88 : 1 }]}
              >
                <View style={{ flexDirection: 'row', gap: 2, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 18, backgroundColor: c.fillSubtle }}>
                  <CarteMuscles vue="face" largeur={46} choisies={r.zones} />
                  <CarteMuscles vue="dos" largeur={46} choisies={r.zones} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Ink size={18} weight="black" tight>{traduire(r.nom)}</Ink>
                  <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('{0} exercices, {1} min', r.nb, r.minutes)}</Ink>
                </View>
                <Icon name="chevron" size={18} color={c.textMuted} />
              </Pressable>
            ))}

            {/* la section GRIP : la poigne, pour le kimono, la barre et tout ce qu'il faut tenir */}
            {presets.filter((r) => r.id === 'grip').map((r) => (
              <View key={r.id} style={{ gap: 8, marginTop: 6 }}>
                <Ink size={12} weight="black" color={c.textSecondary} style={{ letterSpacing: 0.6 }}>{traduire('GRIP')}</Ink>
                <Pressable
                  onPress={() => ouvrirSeance(r.zones)}
                  accessibilityRole="button"
                  accessibilityLabel={`${traduire('Grip')}, ${traduire('{0} exercices', r.nb)}, ${traduire('environ {0} min', r.minutes)}`}
                  style={({ pressed }) => [carteBlanche(c.surface, c.divider), { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, paddingRight: 14, borderRadius: 24, opacity: pressed ? 0.88 : 1 }]}
                >
                  <View style={{ width: 84, height: 84, borderRadius: 18, overflow: 'hidden', backgroundColor: c.fillSubtle }}>
                    <Image source={VIGNETTES.avantbras} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Ink size={18} weight="black" tight>{traduire('Renforcer ma poigne')}</Ink>
                    <Ink size={13} color={c.textSecondary}>{traduire('Pour tenir le kimono, la barre, et ne rien lâcher')}</Ink>
                    <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('{0} exercices, {1} min', r.nb, r.minutes)}</Ink>
                  </View>
                  <Icon name="chevron" size={18} color={c.textMuted} />
                </Pressable>
              </View>
            ))}

            {/* ou tu fais ta seance toi meme */}
            <Ink size={12} weight="black" color={c.textSecondary} style={{ letterSpacing: 0.6, marginTop: 6 }}>{traduire('À TA FAÇON')}</Ink>
            {/* creer sa propre seance : tu choisis tes exercices, tu lui donnes un nom, elle va dans Mes seances */}
            <BoutonPrincipal
              onPress={() => { tap(); router.push('/mes-seances/modifier' as any); }}
              haptique="none"
              accessibilityLabel={traduire('Je crée ma séance')}
              hauteur={92}
              rayon={24}
              styleBouton={{ justifyContent: 'flex-start', gap: 14, paddingVertical: 16, paddingLeft: 18, paddingRight: 14 }}
            >
              {(col) => (
                <>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Ink size={18} weight="black" tight color={col}>{traduire('Je crée ma séance')}</Ink>
                    <Ink size={13} weight="bold" color={col} style={{ opacity: 0.82 }}>{traduire('Tu choisis tes exercices, tu lui donnes un nom')}</Ink>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    {(['epaules', 'abdos', 'fessiers'] as ZoneId[]).map((id, i) => (
                      <View key={id} style={{ width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2, borderColor: P.white, backgroundColor: P.white, marginLeft: i ? -14 : 0 }}>
                        <Image source={VIGNETTES[id]} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                      </View>
                    ))}
                  </View>
                  <Icon name="chevron" size={18} color={col} />
                </>
              )}
            </BoutonPrincipal>

            {/* ou YOROI propose les exercices pour les muscles choisis */}
            <Pressable
              onPress={() => {
                tap();
                setChoisies(derniereFois.length && !derniereEstUnPreset ? derniereFois : []);
                aller('muscles');
              }}
              accessibilityRole="button"
              style={({ pressed }) => [carteBlanche(c.surface, c.divider), { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, opacity: pressed ? 0.88 : 1 }]}
            >
              <Image source={illustration('corps')} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('YOROI te propose les exercices')}</Ink>
                <Ink size={16} weight="black">{traduire('Je choisis mes muscles')}</Ink>
              </View>
              <Icon name="chevron" size={18} color={c.textMuted} />
            </Pressable>

          </>
        ) : null}

        {/* 2. MUSCLES : une carte en image par muscle, rangees par region */}
        {mode === 'muscles' ? (
          <>
            {choisies.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ink size={14} weight="extraBold" color={c.accentText}>{traduirePluriel(choisies.length, choisies.length > 1, '{0} muscle choisi', '{0} muscles choisis', choisies.length)}</Ink>
                <Pressable onPress={() => { tap(); setChoisies([]); }} accessibilityRole="button" hitSlop={8} style={{ minHeight: 36, justifyContent: 'center' }}>
                  <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Tout effacer')}</Ink>
                </Pressable>
              </View>
            ) : null}
            {GROUPES.map((g) => (
              <View key={g.titre} style={{ gap: 10 }}>
                <Ink size={12} weight="black" color={c.textSecondary} style={{ letterSpacing: 0.6 }}>{traduire(g.titre).toLocaleUpperCase()}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {g.ids.map((id) => {
                    const on = choisies.includes(id);
                    const z = zoneParId(id);
                    const n = z?.exos.length ?? 0;
                    return (
                      <Pressable
                        key={id}
                        onPress={() => toggle(id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={traduire(z?.nom ?? id)}
                        style={({ pressed }) => ({ width: largeurTuile, borderRadius: 20, overflow: 'hidden', backgroundColor: P.white, borderWidth: on ? 2.5 : 0, borderColor: on ? c.detail : c.divider, opacity: pressed ? 0.85 : 1, ...OMBRE_CARTE })}
                      >
                        <Image source={VIGNETTES[id]} style={{ width: '100%', height: Math.round(largeurTuile * 0.62) }} resizeMode="cover" accessibilityIgnoresInvertColors />
                        <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 1 }}>
                          <Ink size={15} weight="black" numberOfLines={1}>{traduire(z?.nom ?? id)}</Ink>
                          <Ink size={12} weight="bold" color={c.textSecondary}>{traduirePluriel(n, n > 1, '{0} exercice', '{0} exercices', n)}</Ink>
                        </View>
                        {on ? (
                          <View style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: P.white }}>
                            <Icon name="check" size={14} color={c.onPrimary} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
            {exos.length ? (
              <Pressable onPress={() => aller('seance')} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Voir les exercices de ma séance')}</Ink>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {/* 3. SEANCE : ta seance du jour, exercice par exercice */}
        {mode === 'seance' && exos.length ? (
          <>
            {/* 27 octobre 2026 (refonte Pastel) : la carte lilas du programme du jour, plus de fond encre plein */}
            <View style={{ padding: 18, borderRadius: 24, backgroundColor: P.programmeFond, gap: 12 }}>
              <Ink size={12} weight="black" color={P.etiquettePrune} style={{ letterSpacing: 0.6 }}>{traduire('TA SÉANCE DU JOUR')}</Ink>
              <Ink size={22} weight="black" tight>{titre}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { icone: 'musculation' as const, t: traduire('{0} exercices', exos.length) },
                  { icone: 'chrono' as const, t: traduire('environ {0} min', minutes) },
                ].map((p) => (
                  <View key={p.icone} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 6, paddingRight: 12, borderRadius: 17, backgroundColor: blancA(0.7) }}>
                    <Image source={illustration(p.icone)} style={{ width: 24, height: 24 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                    <Ink size={13} weight="extraBold" color={P.etiquettePrune}>{p.t}</Ink>
                  </View>
                ))}
              </View>
              <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('À faire dans l’ordre : les gros muscles d’abord, les abdos à la fin.')}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable onPress={() => { tap(); aller('muscles'); }} accessibilityRole="button" style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: P.white }}>
                <Ink size={13} weight="extraBold" color={c.onPrimary}>{traduire('Changer les muscles')}</Ink>
              </Pressable>
              {/* la garder : elle s'ouvre dans Mes seances, tu changes les exercices et tu lui donnes un nom */}
              <Pressable
                onPress={() => { tap(); router.push({ pathname: '/mes-seances/modifier' as any, params: { zones: choisies.join(',') } }); }}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: P.white }}
              >
                <Icon name="bookmark" size={15} color={c.onPrimary} />
                <Ink size={13} weight="extraBold" color={c.onPrimary}>{traduire('La modifier et l’enregistrer')}</Ink>
              </Pressable>
              </View>
            </View>
            {exos.map((x, k) => (
              <CarteExoZone key={x.nom} exo={x} numero={k + 1} total={exos.length} zone={traduire(zoneDe(x.nom)?.nom ?? '') || undefined} />
            ))}

            <Glass style={[carteBlanche(c.surface, c.divider), { gap: 12 }]}>
              <Ink size={16} weight="black">{traduire('Les résultats arrivent quand ?')}</Ink>
              {[
                { t: traduire('Dès les premières séances'), d: traduire('Les gestes deviennent faciles et tu soulèves plus : au début, c’est surtout ton cerveau qui apprend à commander tes muscles.') },
                { t: traduire('Après 3 à 5 semaines'), d: traduire('Chez la plupart des débutants, le muscle commence déjà à grossir, même si ça ne se voit pas encore : une étude l’a mesuré à l’échographie après 20 jours, à 3 séances par semaine.') },
                { t: traduire('Ensuite, dans le miroir'), d: traduire('Ça se voit avec la régularité : 2 à 3 séances par semaine, en ajoutant un peu de charge ou de répétitions quand c’est facile. YOROI te le propose tout seul.') },
              ].map((x, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: tonDuRang(i).fond, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={13} weight="black" color={tonDuRang(i).encre}>{String(i + 1)}</Ink>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={14} weight="extraBold">{x.t}</Ink>
                    <Ink size={13} color={c.textSecondary}>{x.d}</Ink>
                  </View>
                </View>
              ))}
              <Ink size={11} color={c.textMuted}>{traduire('Sources : Moritani et deVries 1979, Seynnes et al. 2007, recommandations de l’ACSM.')}</Ink>
            </Glass>
          </>
        ) : null}
      </ScrollView>

      {/* le bouton, en bas, des qu'on a choisi */}
      {mode !== 'choix' ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: c.background }}>
          <BoutonPrincipal style={{ width: '100%', maxWidth: LARGEUR_CONTENU - 32, alignSelf: 'center' }} onPress={commencer} disabled={!exos.length} hauteur={62} rayon={22} styleBouton={{ justifyContent: 'flex-start', gap: 12, paddingHorizontal: 16 }}>
            {(col) => (
              <>
                <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: exos.length ? 'rgba(255,255,255,0.18)' : blancA(0.7), alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={20} color={col} />
                </View>
                <View style={{ flex: 1 }}>
                  <Ink size={17} weight="black" color={col}>{exos.length ? traduire('Commencer ma séance') : traduire('Choisis au moins un muscle')}</Ink>
                  {exos.length ? (
                    <Ink size={13} weight="bold" color={col} style={{ opacity: 0.82 }} numberOfLines={1}>
                      {traduirePluriel(exos.length, exos.length > 1, '{0} exercice, environ {1} min', '{0} exercices, environ {1} min', exos.length, minutes)}
                    </Ink>
                  ) : null}
                </View>
              </>
            )}
          </BoutonPrincipal>
        </View>
      ) : null}
    </View>
  );
}
