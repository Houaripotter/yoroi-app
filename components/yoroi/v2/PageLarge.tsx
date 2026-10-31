/**
 * Mode grand ecran (30 octobre 2026) : les briques de mise en page. Chacune ne fait rien sur iPhone (actif faux) :
 * ses enfants sont rendus tels quels, a la meme place, avec les memes espaces qu'avant.
 * En grand ecran : Rangee met ses colonnes cote a cote, Colonne donne sa largeur aux cartes qu'elle contient
 * (LargeurEcranContext), Case pose une carte dans une grille a colonnes fixes.
 * 31 octobre 2026 : Bento, le tableau de bord. Des cartes sur 1 ou 2 colonnes (ou toute la largeur), rangees en
 * colonnes equilibrees (lib/v2/nav/grandEcran.ts, placerBento) : chaque carte mesure sa hauteur, puis se pose sous
 * la colonne la plus courte. Les cartes gardent leur place dans l'arbre (aucun remontage quand elles bougent).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { LargeurEcranContext } from '@/lib/v2/nav/useGrandEcran';
import { ESPACE_COLONNES, espaceGrille, largeurEcranPourColonne, placerBento } from '@/lib/v2/nav/grandEcran';

export function Rangee({ actif, children, espace = ESPACE_COLONNES, style }: { actif: boolean; children: React.ReactNode; espace?: number; style?: StyleProp<ViewStyle> }) {
  if (!actif) return <>{children}</>;
  return <View style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: espace }, style]}>{children}</View>;
}

export function Colonne({ actif, largeur, children, espace = 12, style }: { actif: boolean; largeur: number; children: React.ReactNode; espace?: number; style?: StyleProp<ViewStyle> }) {
  if (!actif) return <>{children}</>;
  return (
    <LargeurEcranContext.Provider value={largeurEcranPourColonne(largeur)}>
      <View style={[{ width: largeur, gap: espace }, style]}>{children}</View>
    </LargeurEcranContext.Provider>
  );
}

/** La largeur vue par les cartes d'une page entiere (tout l'ecran utile) ; rien sur iPhone */
export function LargeurPage({ actif, largeur, children }: { actif: boolean; largeur: number; children: React.ReactNode }) {
  if (!actif) return <>{children}</>;
  return <LargeurEcranContext.Provider value={largeurEcranPourColonne(largeur)}>{children}</LargeurEcranContext.Provider>;
}

/** Une grille a colonnes fixes (Seances, En detail) : sur iPhone, les enfants tels quels */
export function GrilleColonnes({ actif, children, espace = ESPACE_COLONNES }: { actif: boolean; children: React.ReactNode; espace?: number }) {
  if (!actif) return <>{children}</>;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: espace }}>{children}</View>;
}

/** Une carte du tableau de bord : sa cle, sur combien de colonnes (« toute » : toute la largeur), son contenu */
export type CaseBento = { cle: string; span?: number | 'toute'; contenu: React.ReactNode };

/**
 * Le tableau de bord en grand ecran : `colonnes` colonnes sur `largeur` points, gouttieres regulieres. Chaque carte
 * recoit sa largeur (LargeurEcranContext) et dimensionne son contenu dessus, jamais sur la largeur de l'ecran.
 * Tant que toutes les hauteurs ne sont pas connues, la grille reste invisible (pas de cartes empilees qui sautent).
 */
export function Bento({ largeur, colonnes, cases, espace = espaceGrille(largeur), style }: { largeur: number; colonnes: number; cases: (CaseBento | null | false | undefined)[]; espace?: number; style?: StyleProp<ViewStyle> }) {
  const liste = cases.filter((c): c is CaseBento => !!c);
  const [hauteurs, setHauteurs] = useState<Record<string, number>>({});
  const mesurer = useCallback((cle: string, e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setHauteurs((avant) => (avant[cle] === h ? avant : { ...avant, [cle]: h }));
  }, []);
  const spans = liste.map((c) => (c.span === 'toute' ? colonnes : c.span ?? 1));
  const pret = liste.every((c) => hauteurs[c.cle] !== undefined);
  const { places, hauteur } = useMemo(
    () => placerBento(liste.map((c, i) => ({ span: spans[i], hauteur: hauteurs[c.cle] ?? 0 })), colonnes, largeur, espace),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [liste.map((c) => c.cle).join('|'), spans.join('|'), hauteurs, colonnes, largeur, espace],
  );
  return (
    <View style={[{ width: largeur, height: hauteur, opacity: pret ? 1 : 0 }, style]}>
      {liste.map((c, i) => {
        const p = places[i];
        return (
          <LargeurEcranContext.Provider key={c.cle} value={largeurEcranPourColonne(p.largeur)}>
            <View onLayout={(e) => mesurer(c.cle, e)} style={{ position: 'absolute', left: p.x, top: p.y, width: p.largeur }}>
              {c.contenu}
            </View>
          </LargeurEcranContext.Provider>
        );
      })}
    </View>
  );
}

/** Une carte de BentoEnfants : sur iPhone, son contenu tel quel ; en grand ecran, sur `span` colonnes */
export function Case({ children }: { span?: number | 'toute'; children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Le tableau de bord ecrit en enfants (<Case span={2}>...</Case>) : en grand ecran, un Bento ; sur iPhone, les
 * enfants tels quels dans une View de style `sinon` (la meme qu'avant).
 */
export function BentoEnfants({ actif, largeur, colonnes, children, espace, sinon, style }: { actif: boolean; largeur: number; colonnes: number; children: React.ReactNode; espace?: number; sinon?: StyleProp<ViewStyle>; style?: StyleProp<ViewStyle> }) {
  if (!actif) return <View style={sinon}>{children}</View>;
  const cases: CaseBento[] = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((el, i) => ({ cle: String(el.key ?? i), span: (el.props as { span?: number | 'toute' }).span, contenu: el }));
  return <Bento largeur={largeur} colonnes={colonnes} cases={cases} espace={espace} style={style} />;
}
