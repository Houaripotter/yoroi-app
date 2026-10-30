/**
 * Fin de séance : abdos et cardio (26 octobre 2026). Une carte indigo illustree sur la page du programme en cours,
 * et la feuille de choix : rien, abdos, cardio (abdos et cardio cochables ensemble, 30 octobre 2026), la duree du cardio, et les seances de marche du
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
import { CHOIX_FIN, FIN_PAR_DEFAUT, MINUTES_FIN, NOTE_FIN, SOURCES_FIN, aDesJoursMarche, avecCardio, basculerCaseFin, caseCochee, resumeFin } from '@/lib/v2/programmes/finSeance';
import type { CaseFin, FinSeance } from '@/lib/v2/programmes/finSeance';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import type { TonSeance } from '@/components/yoroi/v2/seance/pastel';
import { blancA } from '@/components/yoroi/livePalette';

const ICONE: Record<CaseFin, IconName> = { rien: 'close', abdos: 'body', cardio: 'steps' };
/** 30 octobre 2026 : les stickers de l'app à la place des icônes (Encre japonaise : les icônes d'avant) */
const STICKER: Record<CaseFin, NomSticker> = { rien: 'carnet', abdos: 'abdos', cardio: 'cardio_zone2' };

/** La couleur vive de chaque case, prise dans les tons pastel de l'app (seance/pastel.ts) */
const TEINTE: Record<CaseFin, TonSeance> = { rien: 'ciel', abdos: 'peche', cardio: 'menthe' };

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
      style={({ pressed }) => ({ borderRadius: 24, backgroundColor: ton('menthe').fond, overflow: 'hidden', padding: 18, minHeight: 120, justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}
    >
      {img ? <Image source={img} style={{ position: 'absolute', right: -6, bottom: -56, width: 120, height: 170 }} resizeMode="contain" /> : null}
      <View style={{ maxWidth: '66%', gap: 4 }}>
        <Ink size={12} weight="black" color={ton('menthe').encre} style={{ letterSpacing: 0.6 }}>{traduire('FIN DE SÉANCE')}</Ink>
        <Ink size={18} weight="black" tight color={c.ink}>{traduire('Abdos et cardio')}</Ink>
        <Ink size={13} weight="bold" color={c.textSecondary}>{texteFin(fin)}</Ink>
        {retire ? <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Séances de marche du programme retirées')}</Ink> : null}
        <Ink size={13} weight="black" color={ton('menthe').encre} style={{ marginTop: 4 }}>{traduire('Choisir')}</Ink>
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
  const illus = useIllustrations();
  const [f, setF] = useState<FinSeance>(valeur ?? FIN_PAR_DEFAUT);
  useEffect(() => {
    if (visible) setF(valeur ?? FIN_PAR_DEFAUT);
  }, [visible, valeur]);
  const marche = aDesJoursMarche(programme);

  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Fin de séance')}>
      <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4, lineHeight: 20 }}>{traduire('Ajouté à la fin de chaque séance de musculation. Tu peux changer quand tu veux.')}</Ink>

      {/* trois cases : Abdos et Cardio se cochent ensemble, Rien décoche tout (finSeance.ts, basculerCaseFin) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 4 }}>
        {CHOIX_FIN.map((o) => {
          const on = caseCochee(f.choix, o.key);
          const fond = on ? ton(TEINTE[o.key]).fond : c.fillSoft;
          const encre = ton(TEINTE[o.key]).encre;
          return (
            <Pressable
              key={o.key}
              onPress={() => { tap(); setF((x) => ({ ...x, choix: basculerCaseFin(x.choix, o.key) })); }}
              accessibilityRole={o.key === 'rien' ? 'radio' : 'checkbox'}
              accessibilityState={o.key === 'rien' ? { selected: on } : { checked: on }}
              accessibilityLabel={`${traduire(o.label)}, ${traduire(o.sous)}`}
              style={({ pressed }) => ({ flexBasis: 100, flexGrow: 1, minHeight: 116, borderRadius: 22, padding: 12, gap: 6, backgroundColor: fond, borderWidth: 2, borderColor: on ? encre : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                {illus.stickers ? (
                  <Image source={illus.img(STICKER[o.key])} style={{ width: 48, height: 48 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                ) : (
                  <View style={{ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: blancA(on ? 0.75 : 1) }}>
                    <Icon name={ICONE[o.key]} size={18} color={encre} />
                  </View>
                )}
                {/* la case : ronde pour Rien, carrée pour Abdos et Cardio (on peut cocher les deux) */}
                <View style={{ width: 26, height: 26, borderRadius: o.key === 'rien' ? 13 : 8, borderWidth: 2, borderColor: on ? encre : c.textMuted, backgroundColor: on ? encre : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Icon name="check" size={15} color="#FFFFFF" strokeWidth={3} /> : null}
                </View>
              </View>
              <Ink size={16} weight="black" tight color={on ? encre : c.ink}>{traduire(o.label)}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary}>{traduire(o.sous)}</Ink>
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
