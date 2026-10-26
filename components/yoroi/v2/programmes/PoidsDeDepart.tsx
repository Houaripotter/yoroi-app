/**
 * « Trouver ton poids de départ » (26 octobre 2026) : le guide de qui n'y connait rien, en quatre etapes,
 * avec les etudes. Ouvert depuis le resultat du questionnaire (« Je n'y connais rien ») et la page du programme.
 * Textes et sources : lib/v2/programmes/charge.ts (POIDS_DE_DEPART).
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glass, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { POIDS_DE_DEPART, RESERVE_DEBUTANT, SOURCES_POIDS_DE_DEPART } from '@/lib/v2/programmes/charge';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { traduire } from '@/lib/i18n/tr';

export function FeuillePoidsDeDepart({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Trouver ton poids de départ')}>
      <View style={{ gap: 14, paddingHorizontal: 4 }}>
        {POIDS_DE_DEPART.map((x, i) => (
          <View key={x.titre} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.darkCard, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Ink size={13} weight="black" color={c.onDark}>{String(i + 1)}</Ink>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          </View>
        ))}
        <View style={{ gap: 4, padding: 14, borderRadius: 18, backgroundColor: c.accentTint }}>
          <Ink size={12} weight="extraBold" color={c.accent}>{traduire('BON À SAVOIR')}</Ink>
          <Ink size={14} style={{ lineHeight: 20 }}>{traduire(RESERVE_DEBUTANT)}</Ink>
        </View>
        <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
          <Ink size={12} weight="extraBold" color={c.textMuted}>{traduire('LES ÉTUDES')}</Ink>
          {SOURCES_POIDS_DE_DEPART.map((id) => {
            const s = sourceParId(id);
            if (!s) return null;
            return (
              <Pressable key={id} onPress={() => { tap(); void safeOpenURL(s.lien); }} accessibilityRole="link" style={{ minHeight: 40, justifyContent: 'center' }}>
                <Ink size={12} weight="extraBold" color={c.accent}>{`${s.auteurs.split(',')[0]}, ${s.annee}`}</Ink>
                <Ink size={12} color={c.textSecondary}>{traduire(s.apport)}</Ink>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

/** La ligne de la page du programme, a cote de « Comment choisir ta charge » */
export function CartePoidsDeDepart() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Glass onPress={() => setOuvert(true)} label={traduire('Trouver ton poids de départ')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="scale" size={20} color={c.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" tight>{traduire('Trouver ton poids de départ')}</Ink>
          <Ink size={12} color={c.textSecondary}>{traduire('Tu débutes ? Quelle charge prendre, en quatre étapes.')}</Ink>
        </View>
        <Icon name="chevron" size={18} color={c.textMuted} />
      </Glass>
      <FeuillePoidsDeDepart visible={ouvert} onClose={() => setOuvert(false)} />
    </>
  );
}
