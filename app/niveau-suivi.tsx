/**
 * « Ce que tu suis » (1er novembre 2026, demande AU, point 1) : un ecran court, trois niveaux avec leurs stickers.
 * Propose une fois depuis Progres Corps, puis dans les Reglages. Le niveau ne cache jamais une donnee deja
 * enregistree : il decide seulement des cartes vides et des invitations a mesurer (lib/v2/mesures/niveauSuivi.ts).
 */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Aide, EcranCorps, Sticker } from '@/components/yoroi/v2/corps/kit';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { choisirNiveau, marquerPropose, NIVEAUX } from '@/lib/v2/mesures/niveauSuivi';
import type { NiveauSuivi } from '@/lib/v2/mesures/niveauSuivi';
import { useNiveauSuivi } from '@/lib/v2/mesures/useNiveauSuivi';
import { traduire } from '@/lib/i18n/tr';
import { INFO_NIVEAU } from '@/components/yoroi/v2/corps/libelles';

export default function NiveauSuiviEcran() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const etat = useNiveauSuivi();
  useEffect(() => {
    marquerPropose().catch(() => {});
  }, []);
  const choisir = async (n: NiveauSuivi) => {
    selectionAsync().catch(() => {});
    await choisirNiveau(n);
    if (router.canGoBack()) router.back();
  };
  return (
    <EcranCorps titre={traduire('Ce que tu suis')} repli="/settings">
      <Aide>{traduire('Choisis ce que YOROI te propose de mesurer. Tu peux changer quand tu veux dans les Réglages, et rien de ce que tu as déjà noté n’est caché.')}</Aide>
      {NIVEAUX.map((n) => {
        const on = etat.niveau === n;
        const i = INFO_NIVEAU[n];
        return (
          <Pressable
            key={n}
            onPress={() => choisir(n)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${traduire(i.titre)}, ${traduire(i.pour)}`}
            style={({ pressed }) => [carteBlanche(c.surface, c.border), { padding: 16, gap: 8, borderWidth: on ? 2 : 0, borderColor: on ? c.ink : 'transparent', opacity: pressed ? 0.85 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Sticker nom={i.sticker} taille={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={20} weight="black">{traduire(i.titre)}</Ink>
                <Ink size={13} weight="bold" color={c.textSecondary}>{traduire(i.pour)}</Ink>
              </View>
              {on ? (
                <View style={{ paddingHorizontal: 10, minHeight: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: c.successTint }}>
                  <Ink size={12} weight="extraBold" color={c.successText}>{etat.choisi ? traduire('Choisi') : traduire('Proposé')}</Ink>
                </View>
              ) : null}
            </View>
            <Ink size={13.5} color={c.ink} style={{ lineHeight: 19 }}>{traduire(i.suit)}</Ink>
          </Pressable>
        );
      })}
      {!etat.choisi ? <Aide>{traduire('Proposé selon tes séances par semaine et tes sports. Touche un niveau pour le garder.')}</Aide> : null}
    </EcranCorps>
  );
}
