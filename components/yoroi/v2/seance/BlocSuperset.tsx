/**
 * Superset en seance (31 octobre 2026) : l'en tete du groupe (« SUPERSET », les exercices lies A, B, celui ou tu en
 * es, les series faites), le bouton « Ajouter un exercice » du bloc abdos, et la pastille « Superset A » de la liste
 * « Ta séance ». La logique est dans lib/v2/seances/superset.ts.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { StickerSinon } from '@/components/yoroi/v2/ui/StickerSinon';
import { Icon } from './Icon';
import { ton } from './pastel';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import type { LiveExercise } from '@/lib/v2/seance/model';
import { estEnGroupe, groupeDe, lettreDansGroupe, nomDuGroupe } from '@/lib/v2/seances/superset';

/** Les exercices lies et celui ou tu en es ; rien hors d'un groupe */
export function EnTeteSuperset({ exercises, currentId, onAller }: { exercises: readonly LiveExercise[]; currentId: string; onAller: (id: string) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const groupe = groupeDe(exercises, currentId);
  if (groupe.length < 2) return null;
  const li = ton('lilas');
  const dernier = groupe[groupe.length - 1];
  const nom = (e: LiveExercise) => sansTiret(traduire(nomFr(e.name)));
  return (
    <View accessibilityLabel={`${traduire(nomDuGroupe(groupe.length))} : ${groupe.map(nom).join(', ')}`} style={{ marginHorizontal: 4, marginTop: 4, padding: 12, borderRadius: 22, backgroundColor: li.fond, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
        <StickerSinon nom="chaine" taille={28} />
        <Ink size={13} weight="black" color={li.encre} style={{ letterSpacing: 1, textTransform: 'uppercase' }}>{traduire(nomDuGroupe(groupe.length))}</Ink>
        <Ink size={12} weight="bold" color={li.encre} style={{ flex: 1, textAlign: 'right' }} numberOfLines={1}>{traduire('Sans repos, repos après {0}', lettreDansGroupe(exercises, dernier.id) ?? '')}</Ink>
      </View>
      {groupe.map((e) => {
        const on = e.id === currentId;
        const faites = e.sets.filter((x) => x.done).length;
        return (
          <Pressable key={e.id} onPress={() => onAller(e.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 16, backgroundColor: on ? c.surface : 'transparent' }}>
            <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: on ? li.encre : c.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="black" color={on ? li.fond : li.encre}>{lettreDansGroupe(exercises, e.id)}</Ink>
            </View>
            <Ink size={14.5} weight={on ? 'black' : 'bold'} color={c.ink} style={{ flex: 1 }} numberOfLines={1}>{nom(e)}</Ink>
            <Ink size={12.5} weight="extraBold" color={li.encre}>{traduire('{0} sur {1}', faites, e.sets.length)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** « Ajouter un exercice » dans le bloc abdos : a la suite, en superset */
export function AjoutAuBloc({ exercises, id, onPress }: { exercises: readonly LiveExercise[]; id: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const li = ton('lilas');
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire('Ajouter un exercice d’abdos à la suite, en superset')} style={({ pressed }) => ({ minHeight: 64, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: li.fond, opacity: pressed ? 0.85 : 1 })}>
      <StickerSinon nom="abdos" taille={42} />
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="black" color={li.encre}>{traduire('Ajouter un exercice')}</Ink>
        <Ink size={12} weight="bold" color={c.textSecondary}>{estEnGroupe(exercises, id) ? traduire('Un de plus dans le circuit') : traduire('Enchaîné à la suite, en superset')}</Ink>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 13, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="plus" size={16} color={li.encre} strokeWidth={2.8} />
      </View>
    </Pressable>
  );
}

/** « Superset A » sous le nom d'un exercice lie, dans la liste de la seance */
export function PastilleGroupe({ exercises, id }: { exercises: readonly LiveExercise[]; id: string }) {
  const lettre = lettreDansGroupe(exercises, id);
  if (!lettre) return null;
  const li = ton('lilas');
  const circuit = nomDuGroupe(groupeDe(exercises, id).length) === 'Circuit';
  return (
    <View style={{ alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 9, backgroundColor: li.fond }}>
      <Ink size={11} weight="black" color={li.encre}>{circuit ? traduire('Circuit {0}', lettre) : traduire('Superset {0}', lettre)}</Ink>
    </View>
  );
}
