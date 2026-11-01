/**
 * Abdos et cardio en fin de séance, en détail (1er novembre 2026, Houari : « vérifie que l'app me les demande bien
 * quand je crée mon programme, ce que j'aime faire »). Une seule pièce, posée partout où un programme se crée :
 * départ du coach (coach-depart.tsx), Trouver mon programme (Questionnaire.tsx), « Je construis le mien »
 * (coach-construire.tsx) et la feuille Fin de séance de la page du programme (FinDeSeance.tsx).
 *  - les abdos : à chaque séance, 2 ou 3 fois par semaine ;
 *  - le cardio : son type (liste fermée de cardioJour.ts, en stickers), sa durée, combien de fois par semaine.
 * Les valeurs vont dans la fin de séance du programme (finSeance.ts : abdosParSemaine, cardioParSemaine, cardioType).
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { FREQUENCES_ABDOS, FREQUENCES_CARDIO, MINUTES_FIN } from '@/lib/v2/programmes/finSeance';
import type { FinSeance } from '@/lib/v2/programmes/finSeance';
import { TYPES_CARDIO, TYPE_DEFAUT, habitudeCardio } from '@/lib/v2/seances/cardioJour';
import { traduire } from '@/lib/i18n/tr';

export type DetailsFin = Pick<FinSeance, 'minutes' | 'abdosParSemaine' | 'cardioParSemaine' | 'cardioType'>;

/** « À chaque séance », « 2 fois par semaine » */
export const texteFrequence = (n: number | undefined): string => (n ? traduire('{0} fois par semaine', n) : traduire('À chaque séance'));

function Puce({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.choisi : pressed ? pa.bleu.fond : pa.carte, borderWidth: 1.5, borderColor: on ? pa.bordChoisi : pa.ligne })}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? pa.bleu.encre : pa.texte}>{label}</Ink>
    </Pressable>
  );
}

function Titre({ texte, sticker }: { texte: string; sticker: NomSticker }) {
  const pa = usePastel();
  const illus = useIllustrations();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {illus.stickers ? <Image source={illus.img(sticker)} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <Ink size={15} weight="extraBold" color={pa.texte}>{texte}</Ink>
    </View>
  );
}

/** Les questions qui suivent les cases Abdos et Cardio cochées */
export function ReglagesFin({ abdos, cardio, valeur, onChange }: { abdos: boolean; cardio: boolean; valeur: DetailsFin; onChange: (v: DetailsFin) => void }) {
  const pa = usePastel();
  const illus = useIllustrations();
  if (!abdos && !cardio) return null;
  const changer = (patch: Partial<DetailsFin>) => {
    const v = { ...valeur, ...patch };
    // 0 : à chaque séance, le champ disparaît
    if (!v.abdosParSemaine) delete v.abdosParSemaine;
    if (!v.cardioParSemaine) delete v.cardioParSemaine;
    onChange(v);
  };
  // sans choix : ton cardio habituel, sinon la marche inclinée (ce que la séance lancera)
  const type = valeur.cardioType ?? habitudeCardio()?.type ?? TYPE_DEFAUT;
  return (
    <View style={{ gap: 16 }}>
      {abdos ? (
        <View style={{ gap: 10 }}>
          <Titre texte={traduire('Les abdos, combien de fois ?')} sticker="abdos" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FREQUENCES_ABDOS.map((n) => <Puce key={n} label={texteFrequence(n)} on={(valeur.abdosParSemaine ?? 0) === n} onPress={() => changer({ abdosParSemaine: n })} />)}
          </View>
        </View>
      ) : null}
      {cardio ? (
        <View style={{ gap: 10 }}>
          <Titre texte={traduire('Quel cardio ?')} sticker="cardio_zone2" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES_CARDIO.map((t) => {
              const on = type === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => { tap(); changer({ cardioType: t.id }); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={traduire(t.label)}
                  style={({ pressed }) => ({ flexBasis: '22%', flexGrow: 1, minHeight: 84, borderRadius: 18, padding: 8, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? pa.peche.fond : pressed ? pa.bleu.fond : pa.carte, borderWidth: 1.5, borderColor: on ? pa.peche.barre : pa.ligne })}
                >
                  {illus.stickers ? <Image source={illus.img(t.sticker as NomSticker)} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                  <Ink size={12} weight={on ? 'extraBold' : 'bold'} color={on ? pa.peche.encre : pa.texte} numberOfLines={2} style={{ textAlign: 'center' }}>{traduire(t.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
          <Titre texte={traduire('Durée du cardio')} sticker="chrono" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MINUTES_FIN.map((m) => <Puce key={m} label={traduire('{0} min', m)} on={valeur.minutes === m} onPress={() => changer({ minutes: m })} />)}
            {!(MINUTES_FIN as readonly number[]).includes(valeur.minutes) ? <Puce label={traduire('{0} min', valeur.minutes)} on onPress={() => undefined} /> : null}
          </View>
          <Titre texte={traduire('Le cardio, combien de fois ?')} sticker="calendrier" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FREQUENCES_CARDIO.map((n) => <Puce key={n} label={texteFrequence(n)} on={(valeur.cardioParSemaine ?? 0) === n} onPress={() => changer({ cardioParSemaine: n })} />)}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * « Je construis le mien » : les deux cases (Abdos, Cardio) en stickers, puis les questions. `fin` absente : rien.
 */
export function ChoixFinCompact({ fin, onChange }: { fin: FinSeance | null | undefined; onChange: (f: FinSeance) => void }) {
  const pa = usePastel();
  const illus = useIllustrations();
  const f: FinSeance = fin ?? { choix: 'rien', minutes: 30 };
  const abdos = f.choix === 'abdos' || f.choix === 'les_deux';
  const cardio = f.choix === 'cardio' || f.choix === 'les_deux';
  const choix = (a: boolean, c: boolean): FinSeance['choix'] => (a && c ? 'les_deux' : a ? 'abdos' : c ? 'cardio' : 'rien');
  const Case = ({ k, on, sticker, titre, sous, famille }: { k: 'abdos' | 'cardio'; on: boolean; sticker: NomSticker; titre: string; sous: string; famille: 'creme' | 'peche' }) => (
    <Pressable
      onPress={() => { tap(); onChange({ ...f, choix: k === 'abdos' ? choix(!abdos, cardio) : choix(abdos, !cardio) }); }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${titre}, ${sous}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 104, borderRadius: 22, padding: 12, gap: 4, backgroundColor: on ? pa[famille].fond : pa.carte, borderWidth: 2, borderColor: on ? pa[famille].barre : pa.ligne, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {illus.stickers ? <Image source={illus.img(sticker)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ height: 44 }} />}
        <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: on ? pa[famille].encre : pa.texte3, backgroundColor: on ? pa[famille].encre : 'transparent' }} />
      </View>
      <Ink size={16} weight="black" color={on ? pa[famille].encre : pa.texte}>{titre}</Ink>
      <Ink size={12} weight="bold" color={pa.texte2}>{sous}</Ink>
    </Pressable>
  );
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Case k="abdos" on={abdos} sticker="abdos" titre={traduire('Abdos')} sous={traduire('En fin de séance')} famille="creme" />
        <Case k="cardio" on={cardio} sticker="cardio_zone2" titre={traduire('Cardio')} sous={traduire('En fin de séance')} famille="peche" />
      </View>
      <ReglagesFin abdos={abdos} cardio={cardio} valeur={f} onChange={(v) => onChange({ ...f, ...v, ...(v.abdosParSemaine ? {} : { abdosParSemaine: undefined }), ...(v.cardioParSemaine ? {} : { cardioParSemaine: undefined }) })} />
    </View>
  );
}
