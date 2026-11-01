/**
 * Fenetre « Quoi de neuf dans YOROI 3.0.2 » (1er novembre 2026). Houari : « une pop-up qui affiche toutes les
 * nouveautes de la version 3.0.2, puis un mot pour dire que les traductions arriveront prochainement ».
 * Plein ecran sur iPhone, fenetre centree en grand ecran (useFeuilleCentree). Rubriques et regles :
 * lib/v2/nouveautes/quoiDeNeuf.ts. Montee au lancement par QuoiDeNeufGate, revue depuis Reglages.
 */
import React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sticker } from '@/components/yoroi/v2/corps/kit';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { carteBlanche, ton } from '@/components/yoroi/v2/seance/pastel';
import { useFeuilleCentree } from '@/lib/v2/nav/useGrandEcran';
import { traduire } from '@/lib/i18n/tr';
import { NOUVEAUTES, TEXTES_QUOI_DE_NEUF, VERSION_NOUVEAUTES, type Nouveaute } from '@/lib/v2/nouveautes/quoiDeNeuf';

function Rubrique({ n }: { n: Nouveaute }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = ton(n.ton);
  return (
    <View style={[carteBlanche(c.surface, c.border), { padding: 14, gap: 10 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Sticker nom={n.sticker} taille={46} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={16.5} weight="extraBold" tight accessibilityRole="header">{traduire(n.titre)}</Ink>
          <Ink size={13.5} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(n.texte)}</Ink>
        </View>
      </View>
      {n.puces?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {n.puces.map((p) => (
            <View key={p} style={{ backgroundColor: t.fond, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Ink size={12} weight="bold" color={t.encre}>{traduire(p)}</Ink>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function QuoiDeNeuf({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const centree = useFeuilleCentree(620);
  const ciel = ton('ciel');
  const creme = ton('creme');

  const contenu = (
    <View style={[{ flex: 1, backgroundColor: c.background, overflow: 'hidden' }, centree ? { ...centree.carte, flex: undefined, height: centree.carte.maxHeight } : null]}>
      <ScrollView contentContainerStyle={{ paddingTop: centree ? 22 : insets.top + 16, paddingHorizontal: 16, paddingBottom: 20, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* En tete pastel : trois stickers, le titre et la version */}
        <View style={{ backgroundColor: ciel.fond, borderRadius: 26, paddingVertical: 20, paddingHorizontal: 18, gap: 10, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <Sticker nom="etincelles" taille={54} style={{ transform: [{ rotate: '-8deg' }] }} />
            <Sticker nom="trophee" taille={66} />
            <Sticker nom="flamme" taille={54} style={{ transform: [{ rotate: '10deg' }] }} />
          </View>
          <Ink size={28} weight="black" tight color={ciel.encre} accessibilityRole="header" style={{ lineHeight: 32 }}>
            {traduire(TEXTES_QUOI_DE_NEUF.titre, VERSION_NOUVEAUTES)}
          </Ink>
          <Ink size={14.5} weight="bold" color={ciel.encre} style={{ opacity: 0.8 }}>{traduire(TEXTES_QUOI_DE_NEUF.sousTitre)}</Ink>
        </View>

        {NOUVEAUTES.map((n) => (
          <Rubrique key={n.id} n={n} />
        ))}

        {/* Le mot sur les traductions, tout en bas, doux */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: creme.fond, borderRadius: 22, padding: 14 }}>
          <Sticker nom="langue" taille={50} />
          <View style={{ flex: 1, gap: 3 }}>
            <Ink size={15} weight="extraBold" color={creme.encre}>{traduire(TEXTES_QUOI_DE_NEUF.traductionsTitre)}</Ink>
            <Ink size={13} color={creme.encre} style={{ lineHeight: 18.5 }}>{traduire(TEXTES_QUOI_DE_NEUF.traductionsTexte)}</Ink>
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: centree ? 18 : insets.bottom + 18, backgroundColor: c.background }}>
        <BoutonPrincipal onPress={onClose} label={traduire(TEXTES_QUOI_DE_NEUF.bouton)} tailleTexte={16} />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType={centree ? 'fade' : 'slide'} transparent={!!centree} onRequestClose={onClose} statusBarTranslucent>
      {centree ? <View style={[{ flex: 1, backgroundColor: 'rgba(16,18,32,0.42)' }, centree.fond]}>{contenu}</View> : contenu}
    </Modal>
  );
}

export default QuoiDeNeuf;
