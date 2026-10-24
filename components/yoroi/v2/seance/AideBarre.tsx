/**
 * Aide a la barre (24 octobre 2026) : sous un exercice a la barre olympique, les disques a mettre de chaque cote
 * pour la prochaine serie, et une montee en charge avant la premiere serie lourde. Repliee par defaut : une ligne,
 * on touche pour voir l'echauffement. Calculs dans lib/v2/seance/disques.ts. Aide pratique, pas une prescription.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { disquesParCote, echauffement } from '@/lib/v2/seance/disques';
import { barreOlympique } from '@/lib/v2/programmes/materiel';
import { saisieDepuisKg } from '@/lib/v2/unitePoids';
import { fmtNum } from '@/lib/v2/seance/format';
import { traduire } from '@/lib/i18n/tr';

export function AideBarre({ nom, chargeKg, debut, unite }: { nom: string; chargeKg: number | null | undefined; debut: boolean; unite: 'kg' | 'lb' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  if (!barreOlympique(nom) || !chargeKg || !(chargeKg > 0)) return null;
  const charge = Math.round(saisieDepuisKg(chargeKg, unite) * 100) / 100;
  const d = disquesParCote(charge, unite);
  const echauf = debut ? echauffement(charge, unite) : [];
  if (!d && !echauf.length) return null;
  const u = unite === 'lb' ? 'lb' : 'kg';
  return (
    <Pressable
      onPress={() => { if (echauf.length) { tap(); setOuvert((o) => !o); } }}
      accessibilityRole={echauf.length ? 'button' : 'text'}
      accessibilityState={echauf.length ? { expanded: ouvert } : undefined}
      style={{ marginHorizontal: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: c.fillSubtle, gap: 4 }}
    >
      {d ? (
        <Ink size={13} weight="bold" color={c.textSecondary}>
          {traduire('Disques de chaque côté : {0}', d.cote.map((x) => fmtNum(x)).join(' + '))}
          {d.reste > 0 ? traduire(' (il manque {0} {1})', fmtNum(d.reste), u) : ''}
        </Ink>
      ) : null}
      {echauf.length ? (
        ouvert ? (
          <View style={{ gap: 2 }}>
            <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Échauffement conseillé avant la première série :')}</Ink>
            {echauf.map((e, i) => (
              <Ink key={i} size={13} color={c.textSecondary}>{i === 0 ? traduire('Barre seule × {0}', e.reps) : `${fmtNum(e.charge)} ${u} × ${e.reps}`}</Ink>
            ))}
          </View>
        ) : (
          <Ink size={12} weight="bold" color={c.accent}>{traduire('Voir l’échauffement')}</Ink>
        )
      ) : null}
    </Pressable>
  );
}
