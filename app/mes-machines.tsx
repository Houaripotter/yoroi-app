/**
 * Mes machines (18 novembre 2026) : tes exercices a toi (lib/v2/seances/machinesPerso.ts), jusqu'a 500, avec une
 * recherche et une liste virtualisee (des centaines restent fluides), et « Ajoute d'autres machines d'un coup ».
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { AjoutListe } from '@/components/yoroi/v2/import/AjoutListe';
import { chargerMachinesPerso, machinesEnMemoire, MAX_MACHINES_PERSO } from '@/lib/v2/seances/machinesPerso';
import type { MachinePerso } from '@/lib/v2/seances/machinesPerso';
import { plierHevy } from '@/lib/v2/import/nomsHevy';
import { niceGroup } from '@/lib/v2/seance/format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function MesMachines() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<MachinePerso[]>(machinesEnMemoire());
  const [q, setQ] = useState('');
  const relire = () => chargerMachinesPerso().then(setListe, () => {});
  useEffect(() => {
    void relire();
  }, []);
  const vues = useMemo(() => {
    const k = plierHevy(q);
    const l = k ? liste.filter((m) => plierHevy(m.nom).includes(k) || plierHevy(niceGroup(m.muscle)).includes(k)) : liste;
    return [...l].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [liste, q]);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={vues}
        keyExtractor={(m) => m.nom}
        initialNumToRender={20}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40 }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 12 }}>
            <EnTete titre={traduire('Mes machines')} sousTitre={traduire('{0} sur {1}', liste.length, MAX_MACHINES_PERSO)} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />
            <AjoutListe onAjoute={() => void relire()} />
            {liste.length > 8 ? (
              <TextInput value={q} onChangeText={setQ} placeholder={traduire('Chercher une machine')} placeholderTextColor={c.textMuted} style={{ minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 14, color: c.ink, fontSize: 15 }} accessibilityLabel={traduire('Chercher une machine')} />
            ) : null}
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduirePluriel(vues.length, vues.length > 1, '{0} machine', '{0} machines', vues.length)}</Ink>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.divider }}>
            <Ink size={15} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{item.nom}</Ink>
            <Ink size={12} weight="bold" color={c.accent}>{niceGroup(item.muscle)}</Ink>
          </View>
        )}
      />
    </View>
  );
}
