/**
 * Studio, rubrique Aller a un ecran : tous les ecrans de app/ (liste generee par
 * scripts/studio-screens.mjs, a relancer apres l'ajout d'un ecran), avec une recherche.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Row } from '@/components/yoroi/v2/espace/ui';
import { STUDIO_SCREENS } from '@/lib/v2/creator/screens';
import { Note, SearchField, StudioSection, fold } from './parts';

const FIRST = 12;

export function Ecrans() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);

  const list = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return STUDIO_SCREENS;
    return STUDIO_SCREENS.filter((s) => fold(`${s.route} ${s.sub}`).includes(f));
  }, [q]);
  const shown = q.trim() || all ? list : list.slice(0, FIRST);

  return (
    <StudioSection id="ecrans" icon="grid" title="Aller à un écran" sub={`${STUDIO_SCREENS.length} écrans, ouverts d’un appui`} keywords="ecran route aller ouvrir navigation page">
      <SearchField value={q} onChange={setQ} placeholder="Chercher un écran" label="Chercher un écran" />
      <Card>
        {shown.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Ink size={14} color={c.textSecondary}>Aucun écran ne correspond.</Ink>
          </View>
        ) : (
          shown.map((s, i) => <Row key={s.route} first={i === 0} label={s.route} sub={s.sub} onPress={() => router.push(s.route as never)} />)
        )}
      </Card>
      {!q.trim() && !all && list.length > FIRST ? <Button tone="ghost" label={`Voir les ${list.length} écrans`} onPress={() => setAll(true)} small /> : null}
      <Note>La liste vient de scripts/studio-screens.mjs. Après l’ajout d’un écran : node scripts/studio-screens.mjs.</Note>
    </StudioSection>
  );
}

export default Ecrans;
