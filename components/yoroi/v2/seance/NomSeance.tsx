/**
 * Feuille « Nomme ta séance » (25 octobre 2026), pour Mes séances : enregistrer une séance ou la renommer.
 * Le nom proposé est déjà écrit et sélectionné : un appui sur Enregistrer suffit.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { traduire } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

/** Des idées de noms, touchables, pour ne pas chercher */
const IDEES = ['Push', 'Pull', 'Jambes', 'Haut du corps', 'Bas du corps', 'Full body'];

export function NomSeanceSheet({
  visible,
  titre,
  nomInitial,
  action,
  onClose,
  onValider,
}: {
  visible: boolean;
  titre: string;
  nomInitial: string;
  action: string;
  onClose: () => void;
  onValider: (nom: string) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [nom, setNom] = useState(nomInitial);
  useEffect(() => {
    if (visible) setNom(nomInitial);
  }, [visible, nomInitial]);
  const ok = nom.trim().length > 0;

  return (
    <Sheet visible={visible} onClose={onClose} title={titre}>
      <TextInput
        value={nom}
        onChangeText={(t) => setNom(t.slice(0, 40))}
        placeholder={traduire('Push lundi, Jambes, Haut du corps...')}
        placeholderTextColor={c.textMuted}
        autoFocus
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={() => ok && onValider(nom.trim())}
        accessibilityLabel={traduire('Nom de la séance')}
        style={[fontStyle('bold'), { minHeight: 56, fontSize: 18, color: c.ink, paddingHorizontal: 16, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.accent }]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {IDEES.map((i) => (
          <Pressable
            key={i}
            onPress={() => setNom(traduire(i))}
            accessibilityRole="button"
            accessibilityLabel={traduire('Nommer {0}', traduire(i))}
            style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.fillSubtle })}
          >
            <Ink size={14} weight="bold">{traduire(i)}</Ink>
          </Pressable>
        ))}
      </View>
      <BoutonPrincipal onPress={() => onValider(nom.trim())} disabled={!ok} label={action} tailleTexte={16} />
    </Sheet>
  );
}
