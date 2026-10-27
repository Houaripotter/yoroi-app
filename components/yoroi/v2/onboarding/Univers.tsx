/**
 * Vague 45 : ecran 4 « Ton univers », juste apres le choix du genre. Trois grandes cartes illustrees :
 * Japon (le Guerrier ou la Guerriere au premier rang, dans le Dojo), Classique (le Sportif ou la Sportive
 * au premier rang, dans la salle de sport) et Sans personnage (la scene seule). Japon est preselectionne.
 * Le choix est garde dans le brouillon et enregistre a la fin avec le reste (lib/v2/onboarding/save.ts).
 * 27 octobre 2026 (Houari : « le kimono c'est pour le sport ; sur cette scene je prefere un ronin ou un samourai,
 * ou les deux qui tournent ») : la carte Japon fait defiler le Samourai, le Ronin et le Shogun (les tenues de l'ecran
 * homme ou femme) en fondu doux toutes les 3 s ; genre connu : ses tenues, sinon l'homme et la femme a tour de role.
 * La carte Classique fait defiler le Sportif ou la Sportive en plusieurs teintes (peau claire, peau foncee, Asie),
 * images assets/avatars/app/classique/teintes. Les deux cartes changent a tour de role, 1,5 s d'ecart.
 * « Reduire les animations » ou app en arriere plan : premiere image, fixe.
 */
import React, { useEffect, useState } from 'react';
import { AppState, Image, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import type { ImageSourcePropType } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { guerrierImage, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { CLASSIQUE_IMAGES, GUERRIER_IMAGES } from '@/lib/v2/dojo/personnages';
import { UNIVERS_CHOIX } from '@/lib/v2/dojo/univers';
import type { ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { ChoiceCard, MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

/** Japon : Samourai, Ronin, Shogun (les tenues de l'ecran « Ravi de te connaitre », pas le kimono de sport) */
function japonSerie(g: 'h' | 'f'): ImageSourcePropType[] {
  const G = GUERRIER_IMAGES[g];
  return [G[3], G[2], G[4]].filter((x) => !!x);
}

/** Classique : le meme Sportif ou la meme Sportive, plusieurs teintes de peau (meme tenue, meme pose, 600 x 800) */
const CLASSIQUE_TEINTES: Record<'h' | 'f', ImageSourcePropType[]> = {
  h: [
    require('@/assets/avatars/app/classique/teintes/classique_h_1_debutant_peau_foncee.webp'),
    require('@/assets/avatars/app/classique/teintes/classique_h_1_debutant_asie.webp'),
    require('@/assets/avatars/app/classique/teintes/classique_h_1_debutant_peau_mate.webp'),
  ],
  f: [
    require('@/assets/avatars/app/classique/teintes/classique_f_1_debutant_peau_foncee.webp'),
    require('@/assets/avatars/app/classique/teintes/classique_f_1_debutant_asie.webp'),
    require('@/assets/avatars/app/classique/teintes/classique_f_1_debutant_peau_mate.webp'),
  ],
};

function classiqueSerie(g: 'h' | 'f'): ImageSourcePropType[] {
  return [CLASSIQUE_IMAGES[g][0], ...CLASSIQUE_TEINTES[g]].filter((x) => !!x);
}

/** Genre inconnu : l'homme et la femme a tour de role */
function entrelacer(a: ImageSourcePropType[], b: ImageSourcePropType[]): ImageSourcePropType[] {
  const out: ImageSourcePropType[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

/** Les personnages qui defilent sur une carte, dans l'ordre */
export function serieUnivers(choix: ChoixUnivers, genre: 'h' | 'f', genreConnu = true): ImageSourcePropType[] {
  if (choix !== 'japon' && choix !== 'classique') return [];
  const f = choix === 'japon' ? japonSerie : classiqueSerie;
  if (genreConnu) return f(genre);
  const autre: 'h' | 'f' = genre === 'f' ? 'h' : 'f';
  return entrelacer(f(genre), f(autre));
}

/** Decor et personnage de chaque carte (index : rang dans le defile) */
export function illustrationUnivers(choix: ChoixUnivers, genre: 'h' | 'f', index = 0, genreConnu = true): { scene: ImageSourcePropType; perso: ImageSourcePropType | null } {
  // 27 octobre 2026 (choix de Houari) : la Salle d'armes (scene offerte du pack Samourai) remplace le dojo clair
  const serie = serieUnivers(choix, genre, genreConnu);
  const perso = serie.length ? serie[index % serie.length] : null;
  if (choix === 'japon') return { scene: sceneMeta('samourai_armurerie').image, perso: perso ?? guerrierImage(genre, 3) };
  if (choix === 'classique') return { scene: sceneMeta('classique_salle_jour').image, perso: perso ?? CLASSIQUE_IMAGES[genre][0] };
  return { scene: sceneMeta('classique_salle_jour').image, perso: null };
}

const PAS_MS = 1500;

/** Index du defile des deux cartes, a tour de role (chacune toutes les 3 s) ; fixe si « Reduire les animations » */
function useDefileUnivers(): { japon: number; classique: number } {
  const reduce = useReducedMotion();
  const [pas, setPas] = useState(0);
  const [actif, setActif] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => setActif(st === 'active'));
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduce || !actif) return;
    const t = setInterval(() => setPas((p) => p + 1), PAS_MS);
    return () => clearInterval(t);
  }, [reduce, actif]);
  if (reduce) return { japon: 0, classique: 0 };
  return { japon: Math.floor(pas / 2), classique: Math.ceil(pas / 2) };
}

function Carte({ choix, nom, phrase, genre, genreConnu, index, selected, onPress, height }: { choix: ChoixUnivers; nom: string; phrase: string; genre: 'h' | 'f'; genreConnu: boolean; index: number; selected: boolean; onPress: () => void; height: number }) {
  const c = useColors();
  const reduce = useReducedMotion();
  const n = serieUnivers(choix, genre, genreConnu).length || 1;
  const { scene, perso } = illustrationUnivers(choix, genre, index, genreConnu);
  return (
    <View style={{ gap: 6 }}>
      <ChoiceCard selected={selected} onPress={onPress} label={`${nom}. ${phrase}`} height={height}>
        <Image source={scene} resizeMode="cover" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        {perso ? (
          <Animated.Image
            key={`${choix}-${index % n}`}
            entering={reduce ? undefined : FadeIn.duration(700)}
            exiting={reduce ? undefined : FadeOut.duration(700)}
            source={perso}
            resizeMode="contain"
            style={{ position: 'absolute', right: 10, bottom: 0, width: Math.round(height * 0.78), height: height - 8 }}
            accessibilityIgnoresInvertColors
          />
        ) : null}
        <View style={{ position: 'absolute', left: 12, bottom: 12, backgroundColor: selected ? c.accent : c.surface, borderWidth: selected ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center' }}>
          <Ink size={15} weight="extraBold" color={selected ? c.onAccent : c.ink}>{nom}</Ink>
        </View>
      </ChoiceCard>
      <Ink size={13} weight={selected ? 'bold' : 'medium'} color={selected ? c.ink : c.textSecondary} style={{ paddingHorizontal: 4, lineHeight: 18 }}>{phrase}</Ink>
    </View>
  );
}

export function Univers({ nav, genre, genreConnu = true, value, onPick, onNext }: {
  nav: Nav;
  genre: 'h' | 'f';
  /** 27 octobre 2026 : faux si le genre n'a pas ete choisi (ecran facultatif) : l'homme et la femme defilent */
  genreConnu?: boolean;
  value: ChoixUnivers;
  onPick: (v: ChoixUnivers) => void;
  onNext: () => void;
}) {
  const { height } = useWindowDimensions();
  const idx = useDefileUnivers();
  const cardH = Math.max(112, Math.min(150, Math.round((height - 400) / 3)));
  return (
    <Shell {...nav} title={traduire("Ton **univers**")} sub={traduire("Le décor et le personnage qui t’accompagnent. Tu pourras changer dans Réglages, Personnaliser.")} gap={14} footer={<MainButton label={traduire("Continuer")} onPress={onNext} />}>
      {UNIVERS_CHOIX.map((u) => (
        <Carte key={u.id} choix={u.id} nom={u.nom} phrase={u.phrase} genre={genre} genreConnu={genreConnu} index={u.id === 'japon' ? idx.japon : u.id === 'classique' ? idx.classique : 0} selected={value === u.id} onPress={() => onPick(u.id)} height={cardH} />
      ))}
    </Shell>
  );
}

export default Univers;
