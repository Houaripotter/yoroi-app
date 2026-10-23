/**
 * Onglet Compétitions du carnet technique (refonte v2).
 * La version v2 vit dans components/yoroi/v2/carnet/tabs/CompetitionsView.tsx ; ce fichier la sert
 * aussi en page autonome (ecran papier, en-tete v2) si on y arrive directement.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { P, ScreenHead } from '@/components/yoroi/v2/carnet/ui';
import { CompetitionsView } from '@/components/yoroi/v2/carnet/tabs/CompetitionsView';

export { CompetitionsView };

export default function CompetitionsTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <ScreenHead title="Compétitions" subtitle="Ton carnet technique" />
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <CompetitionsView refreshKey={refreshKey} />
        </View>
      </ScrollView>
    </View>
  );
}
