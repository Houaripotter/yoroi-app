/**
 * La fiche technique d'un exercice (24 octobre 2026) : 3 consignes, 2 erreurs fréquentes et, quand il y a
 * un risque précis, un point de sécurité (lib/v2/programmes/fiches.ts). Repères de technique, pas un avis
 * médical. Rien ne s'affiche si l'exercice n'a pas de fiche.
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ficheDe } from '@/lib/v2/programmes/fiches';
import { preuveDe } from '@/lib/v2/programmes/preuves';
import { traduire } from '@/lib/i18n/tr';

function Liste({ titre, items, couleur, puce }: { titre: string; items: string[]; couleur: string; puce: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 4 }}>
      <Ink size={12} weight="black" color={couleur}>{traduire(titre)}</Ink>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
          <Ink size={13} weight="black" color={couleur}>{puce}</Ink>
          <Ink size={13} color={c.textSecondary} style={{ flex: 1 }}>{traduire(t)}</Ink>
        </View>
      ))}
    </View>
  );
}

/** avecPreuve : ce que dit une étude sur l'exercice (lib/v2/programmes/preuves.ts), sauf quand l'écran l'affiche déjà */
export function FicheTechnique({ nom, avecPreuve = true }: { nom: string; avecPreuve?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const f = ficheDe(nom);
  const p = avecPreuve ? preuveDe(nom) : null;
  if (!f) return null;
  return (
    <View style={{ gap: 10, paddingTop: 8 }}>
      <Liste titre="Consignes" items={f.consignes} couleur={c.accent} puce="✓" />
      <Liste titre="Erreurs fréquentes" items={f.erreurs} couleur={c.danger} puce="✕" />
      {f.securite ? <Liste titre="Sécurité" items={[f.securite]} couleur={c.ink} puce="!" /> : null}
      {p ? (
        <View style={{ gap: 2 }}>
          <Ink size={12} weight="black" color={c.accent}>{traduire('Prouvé par une étude')}</Ink>
          <Ink size={13} color={c.textSecondary}>{traduire(p.texte)}</Ink>
          <Ink size={11} color={c.textMuted}>{traduire('Source : {0}', p.source)}</Ink>
        </View>
      ) : null}
      <Ink size={11} color={c.textMuted}>{traduire('Repères de technique, pas un avis médical. En cas de douleur, arrête et demande à un professionnel.')}</Ink>
    </View>
  );
}
