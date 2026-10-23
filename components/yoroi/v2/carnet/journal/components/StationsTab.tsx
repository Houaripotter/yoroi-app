/**
 * Onglet Stations du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/tabs/StationsView.tsx ; ce fichier la sert
 * aussi en page autonome (ecran papier, en-tete v2) si on y arrive directement.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { P, ScreenHead } from '@/components/yoroi/v2/carnet/ui';
import { StationsView } from '@/components/yoroi/v2/carnet/tabs/StationsView';

export { StationsView };

export default function StationsTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <ScreenHead title="Stations" subtitle="Ton carnet technique" />
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <StationsView refreshKey={refreshKey} />
        </View>
      </ScrollView>
    </View>
  );
}
