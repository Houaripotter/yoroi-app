/**
 * 18 octobre 2026 : « Ton Dojo à l'abri ». Le Dojo est l'ecran ou l'on revient chaque jour, et c'est la que
 * la perte ferait le plus mal : ton rang, ton XP et ta serie vivent seulement sur ce telephone (pas de compte).
 * Une petite carte propose la copie automatique (lib/v2/sauvegarde/copieAuto.ts) tant qu'elle n'est pas active,
 * ou quand elle ne passe plus. Rien quand tout va bien, rien les 48 premieres heures, « Plus tard » la range 7 jours.
 */
import React, { useCallback, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/dojo/parts';
import { PROTECTION_CHANGED_EVENT, etatProtection, lireProtection, type EtatProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { texteAbri } from '@/lib/v2/sauvegarde/textesCopie';
import { lancerCopieAuto } from '@/components/yoroi/v2/sauvegarde/lancerCopieAuto';

const PLUS_TARD = '@yoroi_abri_dojo_plus_tard';
const INSTALL = '@yoroi_install_date';

export function AbriDojo({ rang, xp, serie }: { rang: string; xp: number; serie: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [etat, setEtat] = useState<EtatProtection | null>(null);

  const charger = useCallback(async () => {
    try {
      const infos = await lireProtection();
      const e = etatProtection(infos);
      if (e !== 'a_activer' && e !== 'en_panne') return setEtat(null);
      const [inst, tard] = await Promise.all([AsyncStorage.getItem(INSTALL), AsyncStorage.getItem(PLUS_TARD)]);
      const installe = inst ? new Date(inst).getTime() : Date.now();
      if (e === 'a_activer' && Date.now() - installe < 48 * 3600 * 1000) return setEtat(null);
      if (tard && Date.now() - new Date(tard).getTime() < 7 * 86400000) return setEtat(null);
      setEtat(e);
    } catch {
      setEtat(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void charger();
      const sub = DeviceEventEmitter.addListener(PROTECTION_CHANGED_EVENT, () => void charger());
      return () => sub.remove();
    }, [charger]),
  );

  if (!etat || xp <= 0) return null;
  const t = texteAbri(etat, { rang, xp, serie });
  const plusTard = () => {
    tap();
    setEtat(null);
    void AsyncStorage.setItem(PLUS_TARD, new Date().toISOString()).catch(() => undefined);
  };

  return (
    <View style={{ marginTop: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.goldTint, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={etat === 'en_panne' ? 'cloud-alert' : 'shield-check'} size={24} color={c.goldDeep} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={16} weight="black" accessibilityRole="header">{t.titre}</Ink>
          <Ink size={13} color={c.textSecondary}>{t.texte}</Ink>
        </View>
      </View>
      <Pressable
        onPress={() => {
          tap();
          lancerCopieAuto(() => void charger());
        }}
        accessibilityRole="button"
        style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentTint : c.accent })}
      >
        <Ink size={15} weight="extraBold" color={c.onAccent}>{etat === 'en_panne' ? 'Choisir le dossier' : 'Activer la copie automatique'}</Ink>
      </Pressable>
      <Pressable onPress={plusTard} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'center', minHeight: 32, justifyContent: 'center' }}>
        <Ink size={13} weight="bold" color={c.textMuted}>Plus tard</Ink>
      </Pressable>
    </View>
  );
}
