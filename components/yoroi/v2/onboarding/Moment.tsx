/**
 * Ecran 12 (vague 28, facultatif) : quand tu te peses. Combien de fois par semaine, quels jours
 * (preremplis selon le nombre, toujours modifiables) et a quel moment (ou une heure precise).
 * Garde pour un seul rappel doux environ 2 h apres, seulement ces jours-la et si la pesee manque
 * (lib/v2/pesee/rappelHabitude.ts). Rien n'est demande ici : les notifications ne le sont qu'apres Premium.
 * Vague 30 (« elle est moche, sincerement ») : refaite. Un tampon en tete, trois cartes numerotees et aerees,
 * les jours en pastilles rondes, chaque moment avec son tampon dans sa propre encre, l'heure precise dans une roue simple.
 * La logique ne change pas.
 * 15 octobre 2026 (Houari : « 1 fois par semaine puis je touche un jour, ca passe a 2 ») : la frequence choisie est respectee.
 * Toucher un jour le prend ; si la frequence est deja atteinte, il remplace le plus ancien pris (lib/v2/joursFrequence.ts).
 * La frequence ne change que si tu la touches.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { JOURS_LETTRES, JOURS_NOMS, joursRepartis, joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import { joursTries, synchroniserOrdre, toucherJour } from '@/lib/v2/joursFrequence';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import type { PeseeMoment } from '@/lib/v2/onboarding/draft';
import { ENCRES_THEME as ENCRES } from './couleurs';
import type { Encre } from './couleurs';
import { MainButton, Riche, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const CHRONO = require('@/assets/avatars/app/ornements/chrono.webp');

type MomentDef = { id: Exclude<PeseeMoment, 'inconnu'>; label: string; tampon: TamponId | null; encre: Encre };

const LIST: MomentDef[] = [
  { id: 'reveil', label: traduire('Au réveil'), tampon: 'frein_progres', encre: ENCRES.or },
  { id: 'douche', label: traduire('Après la douche'), tampon: 'vague', encre: ENCRES.sarcelle },
  { id: 'midi', label: traduire('Le midi'), tampon: 'objectif_maintien', encre: ENCRES.vermillon },
  { id: 'soir', label: traduire('Le soir'), tampon: 'lapin_lune', encre: ENCRES.prune },
  { id: 'heure', label: traduire('Heure précise'), tampon: null, encre: ENCRES.indigo },
];

const NB = ' ';
const ITEM = 44;

/** « 7 h 30 » */
function dire(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}${NB}h` : `${Number(h)}${NB}h${NB}${m}`;
}

/** Une colonne de la roue : valeurs qui defilent, celle du milieu est choisie */
function Colonne({ values, index, onIndex, label, format }: { values: number[]; index: number; onIndex: (i: number) => void; label: string; format: (v: number) => string }) {
  const c = useColors();
  const ref = useRef<ScrollView>(null);
  const [vu, setVu] = useState(index);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const at = (y: number) => Math.max(0, Math.min(values.length - 1, Math.round(y / ITEM)));
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const k = at(e.nativeEvent.contentOffset.y);
    if (k !== vu) {
      setVu(k);
      selectionAsync().catch(() => {});
    }
    // fin du geste (aussi sur le web, ou l'elan n'envoie pas toujours sa fin)
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (k !== index) onIndex(k);
    }, 160);
  };
  return (
    <View style={{ width: 84, height: ITEM * 3 }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: ITEM }}
        accessibilityLabel={label}
        accessibilityRole="adjustable"
        accessibilityValue={{ text: format(values[index]) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const k = e.nativeEvent.actionName === 'increment' ? Math.min(values.length - 1, index + 1) : Math.max(0, index - 1);
          onIndex(k);
          ref.current?.scrollTo({ y: k * ITEM, animated: true });
        }}
      >
        {values.map((v, i) => {
          const on = i === vu;
          const loin = Math.abs(i - vu);
          return (
            <View key={v} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={on ? 28 : 19} weight="black" tight color={on ? c.ink : c.textMuted} style={{ opacity: loin > 1 ? 0.3 : 1, fontVariant: ['tabular-nums'] }}>{format(v)}</Ink>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const HEURES = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/** La roue de l'heure precise : heures, minutes par 5 */
function RoueHeure({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const c = useColors();
  const [h, m] = value.split(':').map(Number);
  const mi = Math.max(0, Math.min(11, Math.round(m / 5)));
  const ecrire = (hh: number, mm: number) => onChange(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
  return (
    <Animated.View entering={FadeInDown.duration(240)} style={{ alignItems: 'center', gap: 6, paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {/* bande du milieu, derriere les chiffres */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM, height: ITEM, borderRadius: 14, backgroundColor: ENCRES.indigo.fond }} />
        <Colonne values={HEURES} index={Math.max(0, Math.min(23, h))} onIndex={(i) => ecrire(i, mi * 5)} label={traduire("Heure de la pesée")} format={(v) => String(v)} />
        <Ink size={26} weight="black" color={c.textSecondary}>h</Ink>
        <Colonne values={MINUTES} index={mi} onIndex={(i) => ecrire(h, i * 5)} label={traduire("Minutes de la pesée")} format={(v) => String(v).padStart(2, '0')} />
      </View>
      <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("Ta pesée à {0}", dire(value))}</Ink>
    </Animated.View>
  );
}

/** Carte numerotee d'une question */
function Bloc({ n, titre, children, delay }: { n: number; titre: string; children: React.ReactNode; delay: number }) {
  const c = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(300)} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={13} weight="black" color={c.background}>{String(n)}</Ink>
        </View>
        <Ink size={17} weight="black" tight style={{ flex: 1 }}>{titre}</Ink>
      </View>
      {children}
    </Animated.View>
  );
}

/** Pastille ronde (nombre ou jour) */
function Rond({ label, sous, on, onPress, a11y, role = 'button' }: { label: string; sous?: string; on: boolean; onPress: () => void; a11y: string; role?: 'button' | 'checkbox' }) {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {
        tap('medium');
        onPress();
      }}
      accessibilityRole={role}
      accessibilityState={role === 'checkbox' ? { checked: on } : { selected: on }}
      accessibilityLabel={a11y}
      style={{ flex: 1, alignItems: 'center', gap: 4 }}
    >
      {({ pressed }) => (
        <>
          <View style={{ width: '100%', maxWidth: 44, aspectRatio: 1, borderRadius: 999, backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.fillSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: on ? 1.06 : 1 }] }}>
            <Ink size={17} weight="black" color={on ? c.onAccent : c.ink}>{label}</Ink>
          </View>
          {sous ? <Ink size={10} weight="bold" color={on ? c.accent : c.textMuted}>{sous}</Ink> : null}
        </>
      )}
    </Pressable>
  );
}

export function Moment({ nav, value, jours, heure, onPick, onJours, onHeure, onNext }: {
  nav: Nav;
  value: PeseeMoment | null;
  /** 0 = lundi a 6 = dimanche */
  jours: number[];
  heure: string | null;
  onPick: (m: PeseeMoment) => void;
  onJours: (j: number[]) => void;
  onHeure: (h: string) => void;
  onNext: () => void;
}) {
  const c = useColors();
  const n = jours.length;
  const h = heure ?? '07:00';
  // la frequence choisie a la main ; au retour sur l'ecran, celle qui correspond aux jours deja pris
  const [freq, setFreq] = useState<number | null>(jours.length || null);
  // l'ordre ou les jours ont ete pris (le plus ancien en tete) : c'est lui qui laisse sa place
  const ordre = useRef<number[]>(joursTries(jours));
  ordre.current = synchroniserOrdre(ordre.current, jours);
  const toucher = (j: number) => {
    const next = toucherJour(ordre.current, j, freq);
    ordre.current = next;
    onJours(joursTries(next));
  };
  const choisirFrequence = (k: number) => {
    setFreq(k);
    const next = joursRepartis(k);
    ordre.current = next;
    onJours(next);
  };
  const reste = freq != null && n < freq ? freq - n : 0;
  const ready = !!value && value !== 'inconnu' && n > 0;
  return (
    <Shell {...nav} title={traduire("Ton **rendez-vous** avec la balance")} gap={14} footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!ready} />}>
      <Animated.View entering={FadeIn.duration(260)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, backgroundColor: ENCRES.sarcelle.fond, paddingVertical: 12, paddingHorizontal: 14 }}>
        <Tampon name="objectif_perdre" size={64} rotate={-8} ink={ENCRES.sarcelle.ink} animate accessibilityLabel={null} />
        <Riche
          text={traduire("Te peser **aux mêmes moments**, c’est ce qui rend ta courbe fiable d’une semaine à l’autre.")}
          size={15}
          weight="bold"
          color={c.ink}
          ink={ENCRES.sarcelle.ink}
          lineHeight={21}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Bloc n={1} titre={traduire("Combien de fois par semaine ?")} delay={60}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5, 6, 7].map((k) => (
            <Rond key={k} label={String(k)} on={freq === k} onPress={() => choisirFrequence(k)} a11y={k === 7 ? traduire('Tous les jours') : traduire("{0} fois par semaine", k)} />
          ))}
        </View>
      </Bloc>

      <Bloc n={2} titre={traduire("Quels jours ?")} delay={120}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {JOURS_LETTRES.map((l, j) => (
            <Rond key={JOURS_NOMS[j]} label={l} sous={JOURS_NOMS[j].slice(0, 3)} on={jours.includes(j)} onPress={() => toucher(j)} a11y={traduire("Pesée : {0}", JOURS_NOMS[j])} role="checkbox" />
          ))}
        </View>
        <Riche
          text={
            n
              ? `${n === 7 ? traduire('**Tous les jours**') : traduire("**{0} fois** : {1}", n, joursTexte(jours))}${reste ? traduirePluriel(reste, reste > 1, ". Encore {0} jour à choisir.", ". Encore {0} jours à choisir.", reste) : ''}`
              : freq
                ? `Touche ${freq === 1 ? traduire('ton jour') : traduire("tes {0} jours", freq)}.`
                : traduire('Choisis un nombre ou touche tes jours.')
          }
          size={14}
          weight="bold"
          ink={c.accent}
        />
      </Bloc>

      <Bloc n={3} titre={traduire("À quel moment ?")} delay={180}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LIST.map((m) => {
            const on = value === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => {
                  tap('medium');
                  onPick(m.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={traduire(m.label)}
                style={{ flexBasis: '47%', flexGrow: 1 }}
              >
                {({ pressed }) => (
                  <View style={{ minHeight: 66, borderRadius: 18, backgroundColor: on ? m.encre.fond : pressed ? c.fillSubtle : c.background, borderWidth: on ? 2.5 : 1, borderColor: on ? m.encre.ink : c.border, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    {m.tampon ? (
                      <Tampon name={m.tampon} size={44} rotate={-6} ink={m.encre.ink} accessibilityLabel={null} />
                    ) : (
                      <Image source={CHRONO} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                    )}
                    <Ink size={15} weight="black" color={on ? m.encre.ink : c.ink} style={{ flex: 1, lineHeight: 19 }} numberOfLines={2}>{traduire(m.label)}</Ink>
                    {on ? (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: m.encre.ink, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={12} color={c.onAccent} stroke={3} />
                      </View>
                    ) : null}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
        {value === 'heure' ? <RoueHeure value={h} onChange={onHeure} /> : null}
        {value === 'reveil' ? <Riche text={traduire("**À jeun, au réveil** : le plus fiable d’un jour à l’autre.")} size={13} weight="bold" ink={ENCRES.or.ink} /> : null}
      </Bloc>

      <Animated.View entering={FadeInDown.delay(240).duration(300)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 20, backgroundColor: c.accentTint, padding: 14 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={16} color={c.accent} />
        </View>
        <Riche
          text={traduire("**Un seul rappel doux**, environ 2{0}h après, seulement ces jours-là et si ta pesée manque. Tu peux tout changer dans Réglages, Rappels.", NB)}
          size={13}
          lineHeight={19}
          color={c.ink}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </Shell>
  );
}

export default Moment;
