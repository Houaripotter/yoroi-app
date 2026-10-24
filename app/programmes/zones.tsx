/**
 * « Je ne sais pas quoi faire » (24 octobre 2026) : pour ceux qui arrivent à la salle perdus. Tu touches sur
 * le corps ce que tu veux travailler (fessiers, abdos, bras...), YOROI te donne ta séance du jour : chaque
 * exercice avec son animation, ce qu'il travaille, combien en faire, comment bien le faire, et quand tu
 * verras des résultats. Un bouton lance la séance (app/seance/muscu.tsx, paramètre zones).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Chip, Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { CorpsZones, PastillesZones } from '@/components/yoroi/v2/programmes/CorpsZones';
import { CarteExoZone } from '@/components/yoroi/v2/programmes/CarteExoZone';
import { ZONES, seanceZones, titreZones, zoneParId } from '@/lib/v2/programmes/zones';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { dureeEstimee } from '@/lib/v2/programmes/express';
import { traduire } from '@/lib/i18n/tr';

const CLE = 'yoroi_zones_choisies_v1';
const DEVANT: ZoneId[] = ['epaules', 'pectoraux', 'bras', 'avantbras', 'abdos', 'quadriceps', 'mollets'];
const DERRIERE: ZoneId[] = ['epaules', 'dos', 'bras', 'avantbras', 'fessiers', 'ischios', 'mollets'];

export default function ZonesScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cote, setCote] = useState<'devant' | 'derriere'>('devant');
  const [choisies, setChoisies] = useState<ZoneId[]>([]);
  const [derniere, setDerniere] = useState<ZoneId | null>(null);

  // tes zones de la derniere fois
  useEffect(() => {
    AsyncStorage.getItem(CLE)
      .then((raw) => {
        const v = raw ? (JSON.parse(raw) as string[]) : [];
        const ok = ZONES.map((z) => z.id).filter((id) => v.includes(id));
        if (ok.length) setChoisies(ok);
      })
      .catch(() => {});
  }, []);

  // 24 octobre 2026, Houari : « est-ce qu'on peut faire tourner l'humain en 3D ? ». Tu glisses le doigt sur le
  // corps : il suit ton doigt en pivotant, puis fait le demi-tour et montre l'autre face. Les boutons Devant et
  // Derrière font le même demi-tour.
  const rot = useSharedValue(0);
  const enTour = useSharedValue(false);
  const changer = (n: 'devant' | 'derriere') => setCote(n);
  const tourner = (vers: 1 | -1, depuis = 0) => {
    'worklet';
    if (enTour.value) return;
    enTour.value = true;
    rot.value = depuis;
    rot.value = withTiming(90 * vers, { duration: 170, easing: Easing.in(Easing.quad) }, (fini) => {
      if (!fini) return;
      runOnJS(changer)(cote === 'devant' ? 'derriere' : 'devant');
      rot.value = -90 * vers;
      rot.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }, () => {
        enTour.value = false;
      });
    });
  };
  const glisse = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      if (enTour.value) return;
      rot.value = Math.max(-55, Math.min(55, e.translationX * 0.35));
    })
    .onEnd((e) => {
      if (enTour.value) return;
      if (Math.abs(e.translationX) > 50 || Math.abs(e.velocityX) > 600) tourner(e.translationX > 0 ? 1 : -1, rot.value);
      else rot.value = withTiming(0, { duration: 180 });
    });
  const styleTour = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${rot.value}deg` }] }));
  const choisirCote = (n: 'devant' | 'derriere') => {
    tap();
    if (n !== cote) tourner(n === 'derriere' ? 1 : -1);
  };

  const toggle = (z: ZoneId) => {
    setChoisies((l) => {
      const n = l.includes(z) ? l.filter((x) => x !== z) : [...l, z];
      AsyncStorage.setItem(CLE, JSON.stringify(n)).catch(() => {});
      return n;
    });
    setDerniere(z);
  };

  const exos = useMemo(() => seanceZones(choisies), [choisies]);
  const minutes = Math.max(10, Math.round((dureeEstimee(exos) + 5) / 5) * 5);
  const titre = titreZones(choisies, traduire);
  const zoneDe = (muscle: string) => ZONES.find((z) => z.exos.some((x) => x.muscle === muscle && exos.some((y) => y.nom === x.nom)));

  const commencer = () => {
    if (!exos.length) return;
    tap();
    router.push({ pathname: '/seance/muscu' as any, params: { sport: 'musculation', zones: choisies.join(','), label: titre } });
  };

  const info = derniere ? zoneParId(derniere) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + (exos.length ? 120 : 40), gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire('Je choisis mes zones')} sousTitre={traduire('Touche ce que tu veux travailler, YOROI te dit quoi faire')} repli="/programmes" style={{ marginHorizontal: -22, marginTop: -8 }} />

        <Glass style={{ gap: 12, paddingVertical: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            <Chip label={traduire('Devant')} on={cote === 'devant'} onPress={() => choisirCote('devant')} />
            <Chip label={traduire('Derrière')} on={cote === 'derriere'} onPress={() => choisirCote('derriere')} />
          </View>
          <GestureDetector gesture={glisse}>
            <Animated.View style={styleTour}>
              <CorpsZones cote={cote} choisies={choisies} onToggle={toggle} />
            </Animated.View>
          </GestureDetector>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
            <Icon name="refresh" size={14} color={c.textMuted} />
            <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Glisse ton doigt sur le corps pour le faire tourner')}</Ink>
          </View>
          <Ink size={13} color={c.textSecondary} style={{ textAlign: 'center' }}>
            {cote === 'devant' ? traduire('Le dos, les fessiers et l’arrière des cuisses sont derrière : retourne le corps.') : traduire('Les abdos, les pectoraux et l’avant des cuisses sont devant.')}
          </Ink>
          <PastillesZones ids={cote === 'devant' ? DEVANT : DERRIERE} choisies={choisies} onToggle={toggle} />
        </Glass>

        {info ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 18, backgroundColor: c.accentTint }}>
            <Icon name="target" size={20} color={c.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="black" color={c.accent}>{traduire(info.nom)}{choisies.includes(info.id) ? '' : traduire(', retiré')}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire(info.role)}</Ink>
            </View>
          </View>
        ) : null}

        {exos.length ? (
          <>
            <View style={{ marginTop: 10, padding: 18, borderRadius: 24, backgroundColor: '#2F3243', gap: 12 }}>
              <Ink size={12} weight="black" color="rgba(255,255,255,0.7)">{traduire('TA SÉANCE DU JOUR')}</Ink>
              <Ink size={22} weight="black" color="#FFFFFF" tight>{titre}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { icone: 'dumbbell' as const, t: traduire('{0} exercices', exos.length) },
                  { icone: 'clock' as const, t: traduire('environ {0} min', minutes) },
                ].map((p) => (
                  <View key={p.icone} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                    <Icon name={p.icone} size={15} color="#FFFFFF" />
                    <Ink size={13} weight="extraBold" color="#FFFFFF">{p.t}</Ink>
                  </View>
                ))}
              </View>
              <Ink size={13} color="rgba(255,255,255,0.8)">{traduire('Fais-les dans l’ordre : les gros muscles d’abord, les abdos à la fin.')}</Ink>
            </View>
            {exos.map((x, k) => (
              <CarteExoZone key={x.nom} exo={x} numero={k + 1} total={exos.length} zone={traduire(zoneDe(x.muscle)?.nom ?? '') || undefined} />
            ))}

            <Glass style={{ gap: 12 }}>
              <Ink size={16} weight="black">{traduire('Quand verras-tu des résultats ?')}</Ink>
              {[
                { t: traduire('Dès les premières séances'), d: traduire('Les gestes deviennent faciles et tu soulèves plus : au début, c’est surtout ton cerveau qui apprend à commander tes muscles.') },
                { t: traduire('Après 3 à 5 semaines'), d: traduire('Chez la plupart des débutants, le muscle commence déjà à grossir, même si ça ne se voit pas encore : une étude l’a mesuré à l’échographie après 20 jours, à 3 séances par semaine.') },
                { t: traduire('Ensuite, dans le miroir'), d: traduire('Ça se voit avec la régularité : 2 à 3 séances par semaine, en ajoutant un peu de charge ou de répétitions quand c’est facile. YOROI te le propose tout seul.') },
              ].map((x, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={13} weight="black" color={c.onAccent}>{String(i + 1)}</Ink>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={14} weight="extraBold">{x.t}</Ink>
                    <Ink size={13} color={c.textSecondary}>{x.d}</Ink>
                  </View>
                </View>
              ))}
              <Ink size={11} color={c.textMuted}>{traduire('Sources : Moritani et deVries 1979, Seynnes et al. 2007, recommandations de l’ACSM.')}</Ink>
            </Glass>

            <Pressable onPress={() => { tap(); router.push('/programmes' as any); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accent}>{traduire('Envie d’un plan pour chaque semaine ? Trouve ton programme')}</Ink>
            </Pressable>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
            <Ink size={15} weight="extraBold">{traduire('Touche une zone du corps pour commencer')}</Ink>
            <Ink size={13} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire('Tu peux en choisir plusieurs : YOROI construit ta séance avec les bons exercices.')}</Ink>
          </View>
        )}
      </ScrollView>

      {exos.length ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.border }}>
          <Pressable onPress={commencer} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 62, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, backgroundColor: pressed ? c.accentPressed : c.accent })}>
            <Icon name="play" size={22} color={c.onAccent} />
            <View style={{ flex: 1 }}>
              <Ink size={17} weight="black" color={c.onAccent}>{traduire('Commencer ma séance')}</Ink>
              <Ink size={13} weight="bold" color={c.onAccent} style={{ opacity: 0.85 }} numberOfLines={1}>{titre}</Ink>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
