/**
 * Boite a idees (refonte v2, ecran minimal) : une idee, un souci ou un mot,
 * envoye par mail a l'equipe YOROI.
 */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { APP_CONFIG } from '@/lib/appConfig';
import { safeOpenURL } from '@/lib/security/validators';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, P, Pill } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

type IdeaCategory = 'feature' | 'design' | 'bug' | 'other';

const CATEGORIES: { id: IdeaCategory; label: string }[] = [
  { id: 'feature', label: traduire('Une idée') },
  { id: 'design', label: traduire('Le design') },
  { id: 'bug', label: traduire('Un souci') },
  { id: 'other', label: traduire('Autre chose') },
];

export default function IdeasScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState<IdeaCategory>('feature');
  const [text, setText] = useState('');

  useEffect(() => {
    if (params.category && CATEGORIES.some((c) => c.id === params.category)) setCategory(params.category as IdeaCategory);
  }, [params.category]);

  const send = async () => {
    const label = CATEGORIES.find((c) => c.id === category)?.label ?? traduire('Autre chose');
    const subject = encodeURIComponent(`[Yoroi] ${label}`);
    const body = encodeURIComponent(traduire("{0}\n\nEnvoyé depuis l’app Yoroi", text.trim()));
    const mailto = `mailto:${APP_CONFIG.supportEmail}?subject=${subject}&body=${body}`;
    try {
      const can = await Linking.canOpenURL(mailto);
      if (can) await safeOpenURL(mailto);
      else appAlert(traduire('Pas d’app mail'), traduire("Écris-nous à {0}", APP_CONFIG.supportEmail));
    } catch {
      appAlert(traduire('Pas d’app mail'), traduire("Écris-nous à {0}", APP_CONFIG.supportEmail));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <DetailScreen title={traduire("Boîte à idées")} subtitle={traduire("On lit tout, vraiment")}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Pill key={c.id} label={traduire(c.label)} active={category === c.id} onPress={() => setCategory(c.id)} accent={P.accent} />
          ))}
        </View>
        <Card style={{ padding: 14 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={traduire("Dis-nous ce que tu as en tête")}
            placeholderTextColor={P.muted}
            multiline
            maxLength={2000}
            style={{ minHeight: 140, fontSize: 16, color: P.ink, textAlignVertical: 'top' }}
            accessibilityLabel={traduire("Ton message")}
          />
        </Card>
        <BigButton label={traduire("Envoyer par mail")} icon="share" onPress={send} disabled={!text.trim()} />
        <Ink size={13} weight="bold" color={P.ink2} style={{ textAlign: 'center' }}>{APP_CONFIG.supportEmail}</Ink>
      </DetailScreen>
    </KeyboardAvoidingView>
  );
}
