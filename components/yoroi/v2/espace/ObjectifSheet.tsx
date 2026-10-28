/**
 * Objectif de la semaine dans les Reglages (vague 28) : le nombre de seances et, si tu veux, tes jours.
 * Toucher des jours regle le nombre tout seul ; choisir un autre nombre efface des jours qui ne collent plus.
 * Les jours (espace.joursSemaine, 0 = lundi) marquent tes jours prevus sur Ta semaine (accueil et Seances)
 * quand ton planning n'a pas de creneaux. Le planning n'est jamais modifie ici.
 * 15 octobre 2026 (retour de Houari) : le nombre choisi est respecte. Toucher un jour ne change plus le nombre :
 * s'il est deja atteint, le nouveau jour remplace le plus ancien pris (lib/v2/joursFrequence.ts). Changer le nombre
 * garde les jours qui tiennent (les plus recents). Sans nombre choisi, les jours se prennent librement.
 */
import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Espace } from '@/lib/v2/espace';
import { objectifVise } from '@/lib/v2/espace';
import { Sheet } from './reglages/parts';
import { JoursPicker, joursTexte } from './JoursPicker';
import { ajusterAFrequence, joursTries, synchroniserOrdre, toucherJour } from '@/lib/v2/joursFrequence';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

export function ObjectifSheet({ visible, onClose, espace, onSave }: {
  visible: boolean;
  onClose: () => void;
  espace: Espace;
  onSave: (patch: Partial<Espace>) => void;
}) {
  const c = useYoroiTheme().theme.colors;
  const obj = objectifVise(espace);
  const jours = espace.joursSemaine ?? [];
  // l'ordre ou les jours ont ete pris (le plus ancien en tete) : c'est lui qui laisse sa place
  const ordre = useRef<number[]>(joursTries(jours));
  ordre.current = synchroniserOrdre(ordre.current, jours);
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire("Objectif de la semaine")} subtitle={traduire("Le nombre de séances que tu vises, et tes jours si tu veux. C’est toi qui choisis.")}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Ink size={14} weight="extraBold" color={c.textSecondary}>{traduire("Combien de séances ?")}</Ink>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => {
              const on = obj === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    selectionAsync().catch(() => {});
                    const garde = ajusterAFrequence(ordre.current, n);
                    const change = garde.length !== jours.length;
                    if (change) ordre.current = garde;
                    onSave({ objectifSemaine: n, objectifChoisi: true, ...(change ? { joursSemaine: joursTries(garde) } : {}) });
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={traduirePluriel(n, n > 1, "{0} séance par semaine", "{0} séances par semaine", n)}
                  style={{ flex: 1 }}
                >
                  <View style={{ height: 52, borderRadius: 14, backgroundColor: on ? c.primary : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={20} weight="black" color={on ? c.onPrimary : c.ink}>{String(n)}</Ink>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Ink size={14} weight="extraBold" color={c.textSecondary}>{traduire("Tes jours, si tu veux")}</Ink>
          <JoursPicker
            value={jours}
            onToggle={(j) => {
              // le nombre choisi ne bouge pas : seuls les jours changent
              const next = toucherJour(ordre.current, j, obj || null);
              ordre.current = next;
              onSave({ joursSemaine: joursTries(next) });
            }}
            label="Entraînement"
          />
          <Ink size={13} color={c.textMuted} style={{ lineHeight: 18 }}>
            {jours.length ? traduire("Prévu : {0}. Ton planning, s’il a des créneaux, passe avant.", joursTexte(jours)) : traduire('Aucun jour imposé. Touche tes jours pour les voir marqués sur Ta semaine.')}
          </Ink>
        </View>
        <BoutonPrincipal onPress={onClose} label={traduire("C’est bon")} hauteur={52} rayon={16} tailleTexte={16} />
      </View>
    </Sheet>
  );
}

export default ObjectifSheet;
