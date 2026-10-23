/**
 * Ecran 5 (facultatif) : tes sports, en grille illustree a choix multiples, et tous les autres sur demande.
 * Si tu viens performer en combat : ta categorie de poids, facultative.
 */
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import { SPORTS, getSportName } from '@/lib/sports';
import { categoriesOf, categorySportOf } from '@/lib/v2/onboarding/save';
import { ChoiceCard, Chip, MainButton, Shell, SkipLink, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

export function Sport({ nav, genre, sports, onToggle, combat, category, onCategory, onNext }: {
  nav: Nav;
  genre: 'h' | 'f';
  sports: string[];
  onToggle: (id: string) => void;
  combat: boolean;
  category: string | null;
  onCategory: (id: string | null) => void;
  onNext: () => void;
}) {
  const c = useColors();
  const [showAll, setShowAll] = useState(false);
  const illuIds = SPORT_ILLUS.map((s) => s.id);
  const others = SPORTS.filter((s) => !illuIds.includes(s.id));
  const otherSelected = others.filter((s) => sports.includes(s.id));
  const catSport = categorySportOf(sports);
  const cats = categoriesOf(catSport, genre === 'f' ? 'femme' : 'homme');
  return (
    <Shell {...nav} title={traduire("Quels sports **te font vibrer** ?")} sub={traduire("Choisis tout ce que tu pratiques.")} gap={14} footer={<MainButton label="Continuer" onPress={onNext} disabled={sports.length === 0} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
        {SPORT_ILLUS.map((s) => {
          const on = sports.includes(s.id);
          return (
            <ChoiceCard key={s.id} selected={on} onPress={() => onToggle(s.id)} label={getSportName(s.id)} height={150} style={{ width: '48%' }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 }}>
                <Image source={genre === 'f' ? s.f : s.h} resizeMode="contain" style={{ position: 'absolute', top: 6, width: '100%', height: 104 }} />
                <View style={{ backgroundColor: on ? c.accent : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 12, minHeight: 30, maxWidth: '94%', justifyContent: 'center' }}>
                  <Ink size={13} weight="extraBold" color={on ? c.onAccent : c.ink} numberOfLines={2}>{getSportName(s.id)}</Ink>
                </View>
                {on ? (
                  <View style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={14} color={c.onAccent} stroke={3} />
                  </View>
                ) : null}
              </View>
            </ChoiceCard>
          );
        })}
      </View>
      {otherSelected.length > 0 && !showAll ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {otherSelected.map((s) => <Chip key={s.id} label={getSportName(s.id) ?? s.name} on onPress={() => onToggle(s.id)} />)}
        </View>
      ) : null}
      <SkipLink label={showAll ? traduire('Masquer les autres sports') : traduire('Voir tous les sports')} onPress={() => setShowAll((v) => !v)} />
      {showAll ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {others.map((s) => <Chip key={s.id} label={getSportName(s.id) ?? s.name} on={sports.includes(s.id)} onPress={() => onToggle(s.id)} />)}
        </View>
      ) : null}

      {combat ? (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Ink size={19} weight="black" tight>{traduire("Ta catégorie de poids")}</Ink>
          {catSport && cats.length ? (
            <>
              <Ink size={13} color={c.textSecondary}>{traduire("En {0}. Facultatif, tu pourras la changer plus tard.", getSportName(catSport) ?? catSport)}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cats.map((cat) => (
                  <Chip key={cat.id} label={cat.name} on={category === cat.id} onPress={() => onCategory(category === cat.id ? null : cat.id)} />
                ))}
              </View>
            </>
          ) : (
            <Ink size={13} color={c.textSecondary}>{traduire("Choisis ton sport de combat pour voir ses catégories.")}</Ink>
          )}
        </View>
      ) : null}
    </Shell>
  );
}

export default Sport;
