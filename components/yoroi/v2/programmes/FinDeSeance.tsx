/**
 * Fin de séance : abdos et cardio (26 octobre 2026). Une carte indigo illustree sur la page du programme en cours,
 * et la feuille de choix : rien, abdos, cardio ou les deux, la duree du cardio, et les seances de marche du
 * programme gardees ou retirees. La feuille s'ouvre aussi une fois au demarrage du programme.
 * Regles et sources : lib/v2/programmes/finSeance.ts.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Chip, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { CHOIX_FIN, FIN_PAR_DEFAUT, MINUTES_FIN, NOTE_FIN, SOURCES_FIN, aDesJoursMarche, avecCardio, resumeFin } from '@/lib/v2/programmes/finSeance';
import type { ChoixFin, FinSeance } from '@/lib/v2/programmes/finSeance';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

const ICONE: Record<ChoixFin, IconName> = { rien: 'close', abdos: 'body', cardio: 'steps', les_deux: 'flame' };

/** « Abdos, puis 30 min de marche inclinée », traduit */
export function texteFin(f: FinSeance | null | undefined): string {
  const r = resumeFin(f);
  return r.minutes !== undefined ? traduire(r.cle, r.minutes) : traduire(r.cle);
}

/** La carte de la page du programme en cours */
export function CarteFinDeSeance({ fin, femme, onPress }: { fin: FinSeance | null | undefined; femme: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const img = sportImage('marche', femme, 0);
  const retire = !!fin?.sansMarche;
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={traduire('Fin de séance : abdos et cardio')}
      style={({ pressed }) => ({ borderRadius: 24, backgroundColor: c.darkCard, overflow: 'hidden', padding: 18, minHeight: 120, justifyContent: 'center', opacity: pressed ? 0.92 : 1 })}
    >
      {img ? <Image source={img} style={{ position: 'absolute', right: -6, bottom: -56, width: 120, height: 170 }} resizeMode="contain" /> : null}
      <View style={{ maxWidth: '66%', gap: 4 }}>
        <Ink size={12} weight="extraBold" color={c.onDarkSecondary}>{traduire('FIN DE SÉANCE')}</Ink>
        <Ink size={18} weight="black" tight color={c.onDark}>{traduire('Abdos et cardio')}</Ink>
        <Ink size={13} color={c.onDarkSecondary}>{texteFin(fin)}</Ink>
        {retire ? <Ink size={12} weight="bold" color={c.onDarkSecondary}>{traduire('Séances de marche du programme retirées')}</Ink> : null}
        <Ink size={13} weight="extraBold" color={c.onDark} style={{ marginTop: 4 }}>{traduire('Choisir')}</Ink>
      </View>
    </Pressable>
  );
}

/** La feuille de choix. `bouton` : « Valider » sur la page, « Commencer le programme » au demarrage */
export function FeuilleFinDeSeance({ visible, programme, valeur, bouton, onValider, onClose }: {
  visible: boolean;
  programme: Programme;
  valeur: FinSeance | null | undefined;
  bouton: string;
  onValider: (f: FinSeance) => void;
  onClose: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [f, setF] = useState<FinSeance>(valeur ?? FIN_PAR_DEFAUT);
  useEffect(() => {
    if (visible) setF(valeur ?? FIN_PAR_DEFAUT);
  }, [visible, valeur]);
  const marche = aDesJoursMarche(programme);

  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Fin de séance')}>
      <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4, lineHeight: 20 }}>{traduire('Ajouté à la fin de chaque séance de musculation. Tu peux changer quand tu veux.')}</Ink>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4 }}>
        {CHOIX_FIN.map((o) => {
          const on = f.choix === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => { tap(); setF((x) => ({ ...x, choix: o.key })); }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ width: '47%', flexGrow: 1, minHeight: 96, borderRadius: 20, padding: 14, gap: 6, backgroundColor: on ? c.darkCard : c.fillSubtle, borderWidth: 1.5, borderColor: on ? c.darkCard : c.divider }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.16)' : c.accentTint }}>
                <Icon name={ICONE[o.key]} size={18} color={on ? c.onDark : c.accent} />
              </View>
              <Ink size={15} weight="black" tight color={on ? c.onDark : c.ink}>{traduire(o.label)}</Ink>
              <Ink size={12} color={on ? c.onDarkSecondary : c.textSecondary}>{traduire(o.sous)}</Ink>
            </Pressable>
          );
        })}
      </View>

      {avecCardio(f) ? (
        <View style={{ gap: 8, paddingHorizontal: 4 }}>
          <Ink size={15} weight="extraBold">{traduire('Durée du cardio')}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MINUTES_FIN.map((m) => <Chip key={m} label={traduire('{0} min', m)} on={f.minutes === m} onPress={() => setF((x) => ({ ...x, minutes: m }))} />)}
          </View>
        </View>
      ) : null}

      {marche ? (
        <View style={{ gap: 8, paddingHorizontal: 4 }}>
          <Ink size={15} weight="extraBold">{traduire('Les séances de marche du programme')}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label={traduire('Je les garde')} on={!f.sansMarche} onPress={() => setF(({ sansMarche: _s, ...x }) => x)} />
            <Chip label={traduire('Je les retire')} on={!!f.sansMarche} onPress={() => setF((x) => ({ ...x, sansMarche: true }))} />
          </View>
          <Ink size={12} color={c.textMuted}>{traduire('Retirées, le programme passe directement à la séance suivante.')}</Ink>
        </View>
      ) : null}

      <View style={{ gap: 6, padding: 14, marginHorizontal: 4, borderRadius: 18, backgroundColor: c.accentTint }}>
        <Ink size={13} style={{ lineHeight: 19 }}>{traduire(NOTE_FIN)}</Ink>
        {SOURCES_FIN.map((id) => {
          const s = sourceParId(id);
          if (!s) return null;
          return (
            <Pressable key={id} onPress={() => { tap(); void safeOpenURL(s.lien); }} accessibilityRole="link" hitSlop={4} style={{ minHeight: 32, justifyContent: 'center' }}>
              <Ink size={12} weight="extraBold" color={c.accent}>{`${s.auteurs.split(',')[0]}, ${s.annee}`}</Ink>
            </Pressable>
          );
        })}
      </View>

      <BigButton label={bouton} icon="check" onPress={() => onValider(f)} />
    </Sheet>
  );
}
