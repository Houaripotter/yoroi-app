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
import { traduire } from '@/lib/i18n/tr';

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
    <StudioSection id="ecrans" icon="grid" title={traduire("Aller à un écran")} sub={traduire("{0} écrans, ouverts d’un appui", STUDIO_SCREENS.length)} keywords="ecran route aller ouvrir navigation page">
      <SearchField value={q} onChange={setQ} placeholder={traduire("Chercher un écran")} label={traduire("Chercher un écran")} />
      <Card>
        {shown.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Ink size={14} color={c.textSecondary}>{traduire("Aucun écran ne correspond.")}</Ink>
          </View>
        ) : (
          shown.map((s, i) => <Row key={s.route} first={i === 0} label={s.route} sub={s.sub} onPress={() => router.push(s.route as never)} />)
        )}
      </Card>
      {!q.trim() && !all && list.length > FIRST ? <Button tone="ghost" label={traduire("Voir les {0} écrans", list.length)} onPress={() => setAll(true)} small /> : null}
      <Note>{traduire("La liste vient de scripts/studio-screens.mjs. Après l’ajout d’un écran : node scripts/studio-screens.mjs.")}</Note>
    </StudioSection>
  );
}

export default Ecrans;
