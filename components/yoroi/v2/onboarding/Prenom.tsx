/** Ecran 2 : le prenom, ecrit en grand au-dessus du champ pendant la saisie. */
import React, { useEffect, useRef } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { validators } from '@/lib/security/validators';
import { fontStyle } from '@/components/yoroi/fonts';
import { MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

export function Prenom({ nav, name, onChange, onNext }: { nav: Nav; name: string; onChange: (v: string) => void; onNext: () => void }) {
  const c = useColors();
  const ref = useRef<TextInput>(null);
  const valid = validators.username(name.trim()).valid;
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 420);
    return () => clearTimeout(t);
  }, []);
  const shown = name.trim();
  return (
    <Shell {...nav} title={traduire("D’abord, **ton prénom**")} footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!valid} />}>
      <View style={{ minHeight: 120, justifyContent: 'center', alignItems: 'center', paddingVertical: 8 }} accessibilityLiveRegion="polite">
        {shown ? (
          <Animated.View key={shown.length > 0 ? 'on' : 'off'} entering={ZoomIn.springify().damping(14)}>
            <Ink size={52} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ textAlign: 'center', color: c.accent }}>{shown}</Ink>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(300)}>
            <Ink size={52} weight="black" tight style={{ color: c.fillSubtle, textAlign: 'center' }}>{traduire("Prénom")}</Ink>
          </Animated.View>
        )}
      </View>
      <View style={{ backgroundColor: c.surface, borderRadius: 20, borderWidth: valid ? 2 : 1, borderColor: valid ? c.accent : c.border, paddingHorizontal: 16, minHeight: 60, justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          value={name}
          onChangeText={onChange}
          placeholder={traduire("Ton prénom")}
          placeholderTextColor={c.textMuted}
          maxLength={50}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="givenName"
          autoComplete="given-name"
          returnKeyType="done"
          onSubmitEditing={() => (valid ? onNext() : undefined)}
          accessibilityLabel={traduire("Prénom")}
          style={[fontStyle('extraBold'), { fontSize: 22, color: c.ink, paddingVertical: 12 }]}
        />
      </View>
      <Ink size={13} color={c.textSecondary}>{traduire("Il reste sur ton téléphone.")}</Ink>
    </Shell>
  );
}

export default Prenom;
