/**
 * Choix de la langue dans l'app (23 octobre 2026). Houari : « dès l'onboarding je vois la possibilité de choisir
 * la langue, en haut à gauche, avec tous les drapeaux et les 2 lettres, et aussi dans les réglages ».
 * BoutonLangue : la pastille drapeau et code (FR, EN...) qui ouvre la feuille.
 * FeuilleLangue : les langues de l'app, chacune écrite dans sa propre langue. Toucher une langue la garde
 * et relance l'app, pour que tout passe dans la nouvelle langue.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { Sheet } from '@/components/yoroi/v2/espace/reglages/parts';
import { LANG, LANGUES_ACTIVES, LANGUES_INFO, choisirLangue, traduire } from '@/lib/i18n/tr';
import type { Lang } from '@/lib/i18n/tr';

/** « 🇫🇷 Français » : la langue en cours, pour la valeur d'une ligne de réglage */
export function langueEnCours(): string {
  const i = LANGUES_INFO[LANG];
  return `${i.drapeau} ${i.nom}`;
}

export function FeuilleLangue({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [enCours, setEnCours] = useState<Lang | null>(null);
  const choisir = (l: Lang) => {
    selectionAsync().catch(() => {});
    if (l === LANG) {
      void choisirLangue(l);
      onClose();
      return;
    }
    setEnCours(l);
    void choisirLangue(l).finally(() => setEnCours(null));
  };
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Langue')} subtitle={traduire('L’app redémarre dans la langue choisie.')}>
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        {LANGUES_ACTIVES.map((l, i) => {
          const info = LANGUES_INFO[l];
          const on = l === LANG;
          return (
            <Pressable
              key={l}
              onPress={() => choisir(l)}
              disabled={enCours !== null}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={info.nom}
              style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: i ? 1 : 0, borderColor: c.divider, backgroundColor: pressed ? c.fillSoft : on ? c.accentTint : 'transparent' })}
            >
              <Ink size={24}>{info.drapeau}</Ink>
              <Ink size={16} weight={on ? 'extraBold' : 'bold'} style={{ flex: 1 }}>{info.nom}</Ink>
              <Ink size={13} weight="extraBold" color={c.textMuted}>{info.code}</Ink>
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: on ? 0 : 2, borderColor: c.border, backgroundColor: on ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {enCours === l ? <ActivityIndicator size="small" color={c.accent} /> : on ? <Icon name="check" size={15} color={c.onPrimary} stroke={3} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** La pastille drapeau et code, qui ouvre le choix de la langue */
export function BoutonLangue() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  const info = LANGUES_INFO[LANG];
  return (
    <>
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); setOuvert(true); }}
        accessibilityRole="button"
        accessibilityLabel={traduire('Changer la langue, {0}', info.nom)}
        hitSlop={6}
        style={({ pressed }) => ({ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
      >
        <Ink size={17}>{info.drapeau}</Ink>
        <Ink size={12} weight="extraBold" color={c.ink}>{info.code}</Ink>
      </Pressable>
      <FeuilleLangue visible={ouvert} onClose={() => setOuvert(false)} />
    </>
  );
}
