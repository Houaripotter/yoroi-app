/**
 * Un exercice de « Je choisis mes zones », présenté comme une vraie fiche (24 octobre 2026). Houari : « pour
 * les exercices il faut que ça soit mieux présenté ». En haut l'animation en grand, puis le nom, la zone
 * travaillée, trois repères lisibles d'un coup d'œil (séries, répétitions, repos), le bon geste, et la
 * technique complète à déplier.
 */
import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { ExoDemo, FOND_DEMO } from '@/components/yoroi/v2/seance/ExoDemo';
import { FicheTechnique } from '@/components/yoroi/v2/programmes/FicheTechnique';
import { blancA } from '@/components/yoroi/livePalette';
import { demoDe } from '@/lib/v2/programmes/demos';
import { useSourceDemos } from '@/lib/v2/programmes/demosTest';
import { ficheDe } from '@/lib/v2/programmes/fiches';
import { preuveDe } from '@/lib/v2/programmes/preuves';
import { libelleRepos } from '@/lib/v2/programmes/catalogue';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';
import { carteBlanche, ton } from '@/components/yoroi/v2/seance/pastel';

function Repere({ valeur, libelle }: { valeur: string; libelle: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 14, backgroundColor: c.fillSubtle }}>
      <Ink size={18} weight="black" tight numberOfLines={1} adjustsFontSizeToFit style={{ fontVariant: ['tabular-nums'] }}>{valeur}</Ink>
      <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={1}>{libelle}</Ink>
    </View>
  );
}

export function CarteExoZone({ exo, numero, total, zone, marge = 44 }: { exo: ExoProgramme; numero: number; total: number; zone?: string; marge?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const [ouvert, setOuvert] = useState(false);
  const largeur = Math.max(200, width - marge);
  useSourceDemos();
  const animee = !!demoDe(exo.nom);
  const fiche = !!ficheDe(exo.nom);
  const preuve = preuveDe(exo.nom);
  const reps = `${exo.repsMin} ${traduire('à')} ${exo.repsMax}`;

  return (
    <View style={[carteBlanche(c.surface, c.divider), { borderRadius: 24, overflow: 'hidden' }]}>
      {/* l'animation en grand, avec le numéro et la zone posés dessus */}
      <View style={{ backgroundColor: FOND_DEMO }}>
        {animee ? <ExoDemo nom={exo.nom} largeur={largeur} hauteur={Math.round(Math.min(220, largeur * 0.58))} arrondi={0} bordure={false} /> : <View style={{ height: 64 }} />}
        <View style={{ position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: blancA(0.92), flexDirection: 'row', alignItems: 'center' }}>
            <Ink size={12} weight="black" color={c.ink} style={{ fontVariant: ['tabular-nums'] }}>{traduire('{0} sur {1}', numero, total)}</Ink>
          </View>
          {zone ? (
            <View style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Icon name="target" size={13} color={c.onPrimary} strokeWidth={2.4} />
              <Ink size={12} weight="black" color={c.onPrimary}>{zone}</Ink>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <Ink size={20} weight="black" tight>{traduire(nomFr(exo.nom))}</Ink>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Repere valeur={String(exo.series)} libelle={traduire('séries')} />
          <Repere valeur={reps} libelle={exo.secondes ? traduire('secondes') : traduire('répétitions')} />
          <Repere valeur={libelleRepos(exo.reposSec)} libelle={traduire('de repos')} />
        </View>

        {exo.conseil ? (
          <View style={{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 18, backgroundColor: ton('menthe').fond }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: blancA(0.8), alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={16} color={ton('menthe').encre} strokeWidth={2.8} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={12} weight="black" color={ton('menthe').encre}>{traduire('LE BON GESTE')}</Ink>
              <Ink size={14} color={c.ink}>{traduire(exo.conseil)}</Ink>
            </View>
          </View>
        ) : null}

        {preuve ? (
          <View style={{ gap: 4, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="medal" size={15} color={c.accent} />
              <Ink size={12} weight="black" color={c.accent}>{traduire('PROUVÉ PAR UNE ÉTUDE')}</Ink>
            </View>
            <Ink size={14} color={c.ink}>{traduire(preuve.texte)}</Ink>
            <Ink size={12} color={c.textMuted}>{traduire('Source : {0}', preuve.source)}</Ink>
          </View>
        ) : null}

        {fiche ? (
          <View>
            <Pressable
              onPress={() => { tap(); setOuvert((o) => !o); }}
              accessibilityRole="button"
              accessibilityState={{ expanded: ouvert }}
              style={({ pressed }) => ({ minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.fillSubtle : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 })}
            >
              <Icon name="book" size={17} color={c.ink} />
              <Ink size={14} weight="extraBold">{traduire(ouvert ? 'Masquer la technique' : 'Voir la technique complète')}</Ink>
              <View style={{ transform: [{ rotate: ouvert ? '-90deg' : '90deg' }] }}>
                <Icon name="chevron" size={15} color={c.textSecondary} />
              </View>
            </Pressable>
            {ouvert ? <FicheTechnique nom={exo.nom} avecPreuve={false} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
