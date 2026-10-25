/**
 * « Je ne sais pas quoi faire » (24 octobre 2026) : pour ceux qui arrivent à la salle perdus. Tu touches sur
 * le corps ce que tu veux travailler (fessiers, abdos, bras...), YOROI te donne ta séance du jour : chaque
 * exercice avec son animation, ce qu'il travaille, combien en faire, comment bien le faire, et quand tu
 * verras des résultats. Un bouton lance la séance (app/seance/muscu.tsx, paramètre zones).
 *
 * 25 octobre 2026, refonte (Houari : « tu pourrais vraiment mieux préparer ça ») :
 * 1. le corps de face et de dos côte à côte : toutes les zones visibles d'un coup, plus besoin de le retourner
 *    ni de lire une consigne pour trouver le dos ou les fessiers ;
 * 2. quatre raccourcis en haut pour qui ne sait pas quoi choisir (haut, bas, fessiers et abdos, corps entier) ;
 * 3. toutes les zones en pastilles, de la tête aux pieds, cochées comme sur le corps ;
 * 4. le bouton du bas toujours là, qui dit ce qui t'attend : nombre d'exercices et durée.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { CorpsZones } from '@/components/yoroi/v2/programmes/CorpsZones';
import { CarteExoZone } from '@/components/yoroi/v2/programmes/CarteExoZone';
import { P } from '@/components/yoroi/livePalette';
import { RACCOURCIS_ZONES, ZONES, raccourciActif, seanceZones, titreZones, zoneParId } from '@/lib/v2/programmes/zones';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { CORPS_DEVANT } from '@/lib/v2/programmes/corpsCarte';
import { dureeEstimee } from '@/lib/v2/programmes/express';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const CLE = 'yoroi_zones_choisies_v1';
/** de la tête aux pieds, comme on lit le corps */
const ORDRE: ZoneId[] = ['epaules', 'pectoraux', 'dos', 'bras', 'avantbras', 'abdos', 'fessiers', 'quadriceps', 'ischios', 'mollets'];

export default function ZonesScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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

  const garder = (n: ZoneId[]) => AsyncStorage.setItem(CLE, JSON.stringify(n)).catch(() => {});

  const toggle = (z: ZoneId) => {
    setChoisies((l) => {
      const n = l.includes(z) ? l.filter((x) => x !== z) : [...l, z];
      garder(n);
      return n;
    });
    setDerniere(z);
  };

  const prendreRaccourci = (zones: ZoneId[]) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setChoisies(zones);
    garder(zones);
    setDerniere(null);
  };

  const effacer = () => {
    tap();
    setChoisies([]);
    garder([]);
    setDerniere(null);
  };

  const exos = useMemo(() => seanceZones(choisies), [choisies]);
  const minutes = Math.max(10, Math.round((dureeEstimee(exos) + 5) / 5) * 5);
  const titre = titreZones(choisies, traduire);
  const zoneDe = (nom: string) => ZONES.find((z) => choisies.includes(z.id) && z.exos.some((x) => x.nom === nom));
  const actif = raccourciActif(choisies);

  const commencer = () => {
    if (!exos.length) return;
    tap();
    router.push({ pathname: '/seance/muscu' as any, params: { sport: 'musculation', zones: choisies.join(','), label: titre } });
  };

  // deux corps cote a cote dans la carte (marges de page 22, de carte 14, ecart 10)
  const largeurCorps = Math.floor((width - 44 - 28 - 10) / 2);
  const hauteurCorps = Math.min(380, Math.round(largeurCorps / CORPS_DEVANT.ratio));

  const info = derniere ? zoneParId(derniere) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire('Je choisis mes zones')} sousTitre={traduire('Touche ce que tu veux travailler, YOROI te dit quoi faire')} repli="/programmes" style={{ marginHorizontal: -22, marginTop: -8 }} />

        {/* 1. Les raccourcis, pour qui ne sait pas quoi choisir */}
        <View style={{ gap: 8 }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Tu ne sais pas ? Prends une séance toute faite')}</Ink>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}>
            {RACCOURCIS_ZONES.map((r) => {
              const on = actif === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => prendreRaccourci(r.zones)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => ({ minHeight: 46, paddingHorizontal: 16, borderRadius: 23, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? c.ink : pressed ? c.fillSoft : P.carte, borderWidth: 1, borderColor: on ? c.ink : c.border })}
                >
                  {on ? <Icon name="check" size={15} color={P.carte} /> : null}
                  <Ink size={14} weight="extraBold" color={on ? P.carte : c.ink}>{traduire(r.nom)}</Ink>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 2. Le corps, de face et de dos, cote a cote */}
        <Glass style={{ padding: 14, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Ou touche le corps')}</Ink>
            {choisies.length ? (
              <Pressable onPress={effacer} accessibilityRole="button" hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
                <Ink size={13} weight="extraBold" color={c.accent}>{traduire('Tout effacer')}</Ink>
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {(['devant', 'derriere'] as const).map((cote) => (
              <View key={cote} style={{ width: largeurCorps, alignItems: 'center', gap: 6 }}>
                <CorpsZones cote={cote} choisies={choisies} onToggle={toggle} hauteur={hauteurCorps} />
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: c.fillSubtle }}>
                  <Ink size={12} weight="extraBold" color={c.textSecondary}>{cote === 'devant' ? traduire('Devant') : traduire('Dos')}</Ink>
                </View>
              </View>
            ))}
          </View>

          {/* 3. Toutes les zones en pastilles, de la tete aux pieds */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ORDRE.map((id) => {
              const on = choisies.includes(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                    toggle(id);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => ({ minHeight: 42, paddingHorizontal: 13, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border })}
                >
                  {on ? <Icon name="check" size={14} color={c.onAccent} /> : null}
                  <Ink size={14} weight="extraBold" color={on ? c.onAccent : c.ink}>{traduire(zoneParId(id)?.nom ?? id)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </Glass>

        {info && choisies.includes(info.id) ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 18, backgroundColor: c.accentTint }}>
            <Icon name="target" size={20} color={c.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="black" color={c.accent}>{traduire(info.nom)}</Ink>
              <Ink size={13} color={c.textSecondary}>{traduire(info.role)}</Ink>
            </View>
          </View>
        ) : null}

        {exos.length ? (
          <>
            <View style={{ marginTop: 6, padding: 18, borderRadius: 24, backgroundColor: '#2F3243', gap: 12 }}>
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
              <CarteExoZone key={x.nom} exo={x} numero={k + 1} total={exos.length} zone={traduire(zoneDe(x.nom)?.nom ?? '') || undefined} />
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
        ) : null}
      </ScrollView>

      {/* 4. Le bouton, toujours la, qui dit ce qui t'attend */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.border }}>
        <Pressable
          onPress={commencer}
          disabled={!exos.length}
          accessibilityRole="button"
          accessibilityState={{ disabled: !exos.length }}
          style={({ pressed }) => ({ minHeight: 62, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, backgroundColor: !exos.length ? c.fillSoft : pressed ? c.accentPressed : c.accent })}
        >
          <Icon name="play" size={22} color={exos.length ? c.onAccent : c.textMuted} />
          <View style={{ flex: 1 }}>
            <Ink size={17} weight="black" color={exos.length ? c.onAccent : c.textMuted}>{exos.length ? traduire('Commencer ma séance') : traduire('Choisis au moins une zone')}</Ink>
            <Ink size={13} weight="bold" color={exos.length ? c.onAccent : c.textMuted} style={{ opacity: 0.85 }} numberOfLines={1}>
              {exos.length
                ? traduirePluriel(exos.length, exos.length > 1, '{0} exercice, environ {1} min', '{0} exercices, environ {1} min', exos.length, minutes)
                : traduire('sur le corps ou dans la liste')}
            </Ink>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
