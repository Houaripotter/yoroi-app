/**
 * Tes courbes (vague 41) : un apercu du style choisi, puis le style de la courbe de poids,
 * son fond et l'interrupteur du cap et de la ligne. Reprend la partie courbes de l'ancienne page Apparence.
 * 16 octobre (Personnaliser) : /settings/courbes?choix=style ouvre tout de suite la feuille du style, avec ses
 * apercus (bouton « Style » de la carte Poids de l'accueil). Aussi choix=couleur et choix=fond.
 */
import React, { useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { choixCourbesInitial } from '@/lib/v2/personnaliser/acces';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { ChoiceSheet, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { Interrupteur, TUILE } from '@/components/yoroi/v2/reglages/kit';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { COULEURS_COURBE, STYLES_COURBE, usePrefsCourbes, type CouleurCourbe, type FondCourbe, type StyleCourbe } from '@/lib/v2/courbes/prefs';
import { ApercuFond, FONDS_PROPOSES, sceneDuFond } from '@/components/yoroi/v2/charts/FondCourbe';
import { ApercuCourbe, arretsCourbe } from '@/components/yoroi/v2/charts/CourbePoids';
import { paletteSombre } from '@/components/yoroi/livePalette';

/** Vague 45 : apercu d'une couleur de trait, une petite courbe avec son halo et son point final */
function ApercuCouleur({ couleur, width = 76, height = 40 }: { couleur: CouleurCourbe; width?: number; height?: number }) {
  const [a, b, c3] = arretsCourbe(couleur);
  const id = `yac${couleur}`;
  const d = `M6 ${height * 0.3} C${width * 0.3} ${height * 0.25}, ${width * 0.45} ${height * 0.7}, ${width * 0.65} ${height * 0.6} S${width - 18} ${height * 0.72}, ${width - 10} ${height * 0.74}`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={a} />
          <Stop offset="0.55" stopColor={b} />
          <Stop offset="1" stopColor={c3} />
        </LinearGradient>
      </Defs>
      <Path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={9} strokeOpacity={0.14} strokeLinecap="round" />
      <Path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={width - 10} cy={height * 0.74} r={4.5} fill={paletteSombre() ? '#1A1E29' : '#FFFFFF'} stroke={c3} strokeWidth={2.6} />
    </Svg>
  );
}

export default function TesCourbes() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace } = useEspace();
  const courbes = usePrefsCourbes();
  const params = useLocalSearchParams<{ choix?: string }>();
  const [picker, setPicker] = useState<null | 'style' | 'fond' | 'couleur'>(() => choixCourbesInitial(params.choix));
  const couleur = COULEURS_COURBE.find((x) => x.id === courbes.couleur) ?? COULEURS_COURBE[0];

  const style = STYLES_COURBE.find((x) => x.id === courbes.style) ?? STYLES_COURBE[0];
  const fondAuto = sceneDuFond('auto', espace.scene);
  const fondNom = courbes.fond === 'aucun' ? 'Sans fond' : courbes.fond === 'auto' ? 'Ton accueil' : sceneMeta(courbes.fond).nom;
  const fondScene = sceneDuFond(courbes.fond, espace.scene);
  const { width } = useWindowDimensions();
  const W = Math.max(240, Math.min(560, width) - 44 - 28);

  return (
    <EspaceScreen title="Tes courbes" subtitle="L’allure de ta courbe de poids" gap={14}>
      {/* apercu : le style et le fond choisis */}
      <Card>
        <View style={{ padding: 14, gap: 10, alignItems: 'center' }}>
          <View style={{ width: '100%', height: 124, borderRadius: 16, overflow: 'hidden', backgroundColor: c.background, borderWidth: 1, borderColor: c.divider, alignItems: 'center', justifyContent: 'center' }}>
            {fondScene ? (
              <>
                <Image source={sceneMeta(fondScene).image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.background, opacity: 0.72 }} />
              </>
            ) : null}
            <ApercuCourbe style={style.id} width={W - 40} height={100} />
          </View>
          <Ink size={13} weight="bold" color={c.textSecondary} style={{ textAlign: 'center' }}>{`Style ${style.id}, ${style.nom}`}</Ink>
        </View>
      </Card>

      <Card>
        <ValueRow first tint={TUILE.bleu} icon="pulse" label="Style de la courbe" value={`Style ${style.id}`} onPress={() => setPicker('style')} />
        <ValueRow tint={TUILE.or} icon="wand" label="Couleur de ta courbe" value={couleur.nom} onPress={() => setPicker('couleur')} />
        <ValueRow tint={TUILE.mousse} icon="image" label="Fond de la courbe" value={fondNom} onPress={() => setPicker('fond')} />
        <ValueRow
          tint={TUILE.indigo}
          icon="target"
          label="Ton cap et ton rythme prévu"
          sub="Ton torii et tes tirets verts sur tes courbes"
          onPress={() => courbes.set({ cap: !courbes.cap })}
          action={<Interrupteur on={courbes.cap} />}
        />
      </Card>

      <ChoiceSheet
        visible={picker === 'style'}
        onClose={() => setPicker(null)}
        title="Style de la courbe"
        subtitle="Glisse ton doigt sur la courbe : chaque style te montre la pesée touchée"
        options={STYLES_COURBE.map((x) => ({
          key: x.id,
          label: `${x.id}. ${x.nom}${x.id === 1 ? ', par défaut' : ''}`,
          sub: x.phrase,
          preview: <ApercuCourbe style={x.id} />,
        }))}
        value={courbes.style}
        onChange={(v) => courbes.set({ style: v as StyleCourbe })}
      />
      <ChoiceSheet
        visible={picker === 'couleur'}
        onClose={() => setPicker(null)}
        title="Couleur de ta courbe"
        subtitle="Le trait de ta courbe de poids, à l’accueil, dans le détail et dans Progrès"
        options={COULEURS_COURBE.map((x) => ({ key: x.id, label: x.nom, sub: x.phrase, preview: <ApercuCouleur couleur={x.id} /> }))}
        value={courbes.couleur}
        onChange={(v) => courbes.set({ couleur: v as CouleurCourbe })}
      />
      <ChoiceSheet
        visible={picker === 'fond'}
        onClose={() => setPicker(null)}
        title="Fond de la courbe"
        subtitle="Une scène derrière ta courbe de poids, sous un voile de papier"
        options={[
          { key: 'auto' as FondCourbe, label: 'Comme ton accueil', sub: fondAuto && fondAuto !== espace.scene ? `${sceneMeta(fondAuto).nom}, ta scène a déjà un torii` : sceneMeta(fondAuto ?? undefined).nom, preview: <ApercuFond scene={fondAuto} /> },
          { key: 'aucun' as FondCourbe, label: 'Sans fond, par défaut', sub: 'Le papier seul, le plus lisible', preview: <ApercuFond scene={null} /> },
          ...FONDS_PROPOSES.map((id) => ({ key: id as FondCourbe, label: sceneMeta(id).nom, preview: <ApercuFond scene={id} /> })),
        ]}
        value={courbes.fond}
        onChange={(v) => courbes.set({ fond: v })}
      />
    </EspaceScreen>
  );
}
