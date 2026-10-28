/**
 * « Ajouter par muscle » (27 octobre 2026, maquette Coach2-B-Construis) : dans « Je construis le mien », tu touches
 * un muscle sur le corps (ou sa pastille), ses exercices s'affichent, un plus ajoute l'exercice à ta séance, une
 * coche l'enlève. Les exercices sont ceux des séances par muscle (lib/v2/programmes/zones.ts) : séries et
 * répétitions de débutant, réglables ensuite dans ta semaine.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { DeuxVues } from '@/components/yoroi/v2/programmes/CarteMuscles';
import { Capitales, ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { ZONES, zoneParId } from '@/lib/v2/programmes/zones';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

/** « 3 × 8 à 12 », « 3 × 30 à 45 s » */
export function seriesTexte(e: Pick<ExoProgramme, 'series' | 'repsMin' | 'repsMax' | 'secondes'>): string {
  const reps = e.repsMin === e.repsMax ? String(e.repsMin) : traduire('{0} à {1}', e.repsMin, e.repsMax);
  return e.secondes ? traduire('{0} × {1} s', e.series, reps) : `${e.series} × ${reps}`;
}

export function ChoixParMuscle({ visible, titre, exos, onBasculer, onClose }: { visible: boolean; titre: string; exos: readonly ExoProgramme[]; onBasculer: (e: ExoProgramme) => void; onClose: () => void }) {
  const pa = usePastel();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [zone, setZone] = useState<ZoneId>('pectoraux');
  const z = zoneParId(zone) ?? ZONES[0];
  const choisis = exos.map((e) => e.nom);
  const n = exos.length;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: pa.page }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <Ink size={22} weight="black" color={pa.texte} accessibilityRole="header" style={{ flex: 1 }}>{traduire('Ajouter par muscle')}</Ink>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 }, ombrePastel(pa.ombre)]}>
            <Icon name="close" size={18} color={pa.texte} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
          {/* le corps de face et de dos : toucher un muscle le choisit */}
          <View style={{ borderRadius: 24, backgroundColor: pa.carte, paddingVertical: 14, alignItems: 'center', gap: 8 }}>
            <Ink size={13} weight="extraBold" color={pa.texte2}>{traduire('Touche un muscle')}</Ink>
            <DeuxVues largeur={Math.min(width - 32 - 24, 340)} choisies={[zone]} onToggle={(x) => setZone(x)} />
          </View>
          {/* les pastilles, pour qui ne veut pas viser le dessin */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {ZONES.map((x) => {
              const on = x.id === zone;
              return (
                <Pressable key={x.id} onPress={() => { tap(); setZone(x.id); }} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? pa.bouton : pressed ? pa.bleu.fond : pa.carte }, on ? null : ombrePastel(pa.ombre)]}>
                  <Ink size={14} weight="extraBold" color={on ? pa.surBouton : pa.texte}>{traduire(x.nom)}</Ink>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ marginTop: 4, marginHorizontal: 2 }}>
            <Capitales texte={traduirePluriel(z.exos.length, z.exos.length > 1, '{0}, {1} exercice', '{0}, {1} exercices', traduire(z.nom), z.exos.length)} couleur={pa.bleu.titre} />
          </View>
          <View style={[{ backgroundColor: pa.carte, borderRadius: 24, paddingHorizontal: 14 }, ombrePastel(pa.ombre)]}>
            {z.exos.map((e, k) => {
              const on = choisis.includes(e.nom);
              const nom = sansTiret(traduire(nomFr(e.nom)));
              return (
                <Pressable
                  key={e.nom}
                  onPress={() => { tap(); onBasculer(e); }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${nom}, ${seriesTexte(e)}`}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, borderTopWidth: k === 0 ? 0 : 1, borderColor: pa.ligne, opacity: pressed ? 0.75 : 1 })}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold" color={pa.texte}>{nom}</Ink>
                    <Ink size={12.5} weight="bold" color={pa.texte2}>{seriesTexte(e)}</Ink>
                  </View>
                  <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.menthe.fond : pa.bouton }}>
                    <Icon name={on ? 'check' : 'plus'} size={18} color={on ? pa.menthe.titre : pa.surBouton} strokeWidth={3} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        {/* en bas : ta séance et le nombre d'exercices choisis, « Terminé » */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 14 }}>
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 28, backgroundColor: pa.carte, paddingLeft: 18, paddingRight: 8, paddingVertical: 8 }, ombrePastel(pa.ombre)]}>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15} weight="black" color={pa.texte} numberOfLines={1}>{titre}</Ink>
              <Ink size={12.5} weight="bold" color={pa.texte2}>{traduirePluriel(n, n > 1, '{0} exercice choisi', '{0} exercices choisis', n)}</Ink>
            </View>
            <BoutonPrincipal onPress={() => { tap(); onClose(); }} haptique="none" label={traduire('Terminé')} hauteur={50} rayon={25} tailleTexte={16} styleBouton={{ paddingHorizontal: 24 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
