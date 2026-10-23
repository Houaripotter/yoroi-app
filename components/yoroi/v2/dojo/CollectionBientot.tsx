/**
 * « Collection complète » en bas de Personnages et scènes (16 octobre 2026, SEANCES AVATAR, puis agent PACKS).
 * Les packs Vie réelle pas encore dessinés, avec leur vrai nom (lib/v2/dojo/packsVie.ts, PACKS_VIE_A_VENIR), en silhouettes.
 * Le compteur suit le catalogue : packs prévus en tout, déjà là, encore à venir. Les packs déjà dessinés sont dans l'onglet
 * Vie réelle, ouverts avec Premium comme les autres personnages Premium. Aucun achat, aucun produit, aucun envoi :
 * « Me prévenir » garde seulement ton intérêt sur ce téléphone. La section disparaît quand tout est dessiné.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import { classiqueImage } from '@/lib/v2/dojo/personnages';
import type { Gender } from '@/lib/v2/dojo/personnages';
import { PACKS_VIE, PACKS_VIE_A_VENIR, PACKS_VIE_PRETS, texteCompteurCollection } from '@/lib/v2/dojo/packsVie';
import { traduire } from '@/lib/i18n/tr';

/** Date de ton « Me prévenir », gardée sur ce téléphone seulement */
export const INTERET_COLLECTION_KEY = 'yoroi_collection_interet_v1';

export function CollectionBientot({ gender }: { gender: Gender }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const packs = PACKS_VIE_A_VENIR;
  const [note, setNote] = useState(false);

  useEffect(() => {
    let vivant = true;
    AsyncStorage.getItem(INTERET_COLLECTION_KEY)
      .then((v) => vivant && setNote(!!v))
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);

  if (!packs.length) return null;

  const prevenir = async () => {
    if (note) return;
    setNote(true);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    try {
      await AsyncStorage.setItem(INTERET_COLLECTION_KEY, new Date().toISOString());
    } catch {
      /* rien de grave : le bouton reste coche pour cette visite */
    }
  };

  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: c.border, padding: 16, gap: 14, marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={18} weight="black" tight accessibilityRole="header">{traduire("Collection complète")}</Ink>
          <Ink size={14} weight="bold" color={c.textSecondary}>{texteCompteurCollection(PACKS_VIE.length, PACKS_VIE_PRETS.length)}</Ink>
        </View>
        <View style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: P.accentSoft }}>
          <Ink size={12} weight="extraBold" color={P.accent}>{traduire("Bientôt disponible")}</Ink>
        </View>
      </View>

      {/* les packs a venir, en silhouettes, avec leur vrai nom */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }} accessible accessibilityLabel={traduire("{0} packs à venir : {1}", packs.length, packs.map((p) => p.nom).join(', '))}>
        {packs.map((p, i) => (
          <View key={p.id} style={{ width: 74, alignItems: 'center', gap: 4 }}>
            <View style={{ width: 62, height: 72, borderRadius: 14, backgroundColor: p.fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.92 }}>
              <Image
                source={classiqueImage(i % 2 ? 'f' : gender, 0, null)}
                style={{ width: 66, height: 80, marginBottom: -6, tintColor: P.accent, opacity: 0.28 }}
                resizeMode="contain"
                blurRadius={1}
                accessibilityIgnoresInvertColors
              />
            </View>
            <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ textAlign: 'center' }}>{traduire(p.nom)}</Ink>
          </View>
        ))}
      </View>

      <Ink size={13} color={c.textSecondary}>{traduire("Homme et femme dans chaque pack, avec sa scène quand elle est prévue. Ils s’ouvriront avec Premium, comme les autres personnages Premium.")}</Ink>

      <Pressable
        onPress={prevenir}
        disabled={note}
        accessibilityRole="button"
        accessibilityState={{ disabled: note, checked: note }}
        accessibilityLabel={note ? traduire('C’est noté, ton intérêt est enregistré sur ce téléphone') : traduire('Me prévenir quand de nouveaux packs arrivent')}
        style={({ pressed }) => ({
          minHeight: 50,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          backgroundColor: note ? c.fillSubtle : P.ink,
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <Ink size={15} weight="extraBold" color={note ? c.textSecondary : P.paper}>{note ? traduire('C’est noté') : traduire('Me prévenir')}</Ink>
      </Pressable>
      {note ? <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', marginTop: -6 }}>{traduire("Ton intérêt est gardé sur ce téléphone, rien n’est envoyé.")}</Ink> : null}
    </View>
  );
}
