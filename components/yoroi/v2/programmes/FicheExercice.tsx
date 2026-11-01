/**
 * La fiche d'un exercice (1er novembre 2026, Houari : « c'est possible de voir les exercices, c'est quoi, avec une
 * animation ? »). Elle s'ouvre d'un toucher sur un exercice de la séance du programme, de « Tes prochaines séances »
 * et de l'aperçu d'une séance :
 *  - en grand, le meilleur visuel autorisé (lib/v2/programmes/visuelExo.ts) : Gym visual seulement en mode créateur
 *    (licence non achetée), sinon notre animation maison, sinon Everkinetic avec son crédit dessous, sinon
 *    l'illustration de la machine, sinon le sticker du muscle ;
 *  - les muscles ciblés sur la petite carte rouge, face et dos ;
 *  - séries, répétitions, repos et charge proposée ;
 *  - Position, Mouvement et À éviter (ExplicationExo) ;
 *  - ton réglage de machine mémorisé, s'il y en a un (lib/v2/seances/reglagesMachine.ts) ;
 *  - « Changer », qui ouvre la feuille existante de l'écran.
 * `children` : ce que l'écran ajoute (consigne, matériel, technique complète).
 */
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { DemoPaire, FOND_DEMO } from '@/components/yoroi/v2/seance/ExoDemo';
import { CarreSticker } from '@/components/yoroi/v2/seances/kitA';
import { useAnimationsTest } from '@/components/yoroi/v2/programmes/VignetteExo';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { CarteMuscles } from '@/components/yoroi/v2/programmes/CarteMuscles';
import { ExplicationExo } from '@/components/yoroi/v2/programmes/ExplicationExo';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useFeuilleCentree } from '@/lib/v2/nav/useGrandEcran';
import { visuelExo } from '@/lib/v2/programmes/visuelExo';
import { musclesDeExo } from '@/lib/v2/programmes/musclesExos';
import { libelleRepos } from '@/lib/v2/programmes/catalogue';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { musclesExercice } from '@/lib/v2/seances/musclesExercices';
import { chargerReglages, cranDe } from '@/lib/v2/seances/reglagesMachine';
import { libelleHauteurPoulie } from '@/lib/v2/seances/hauteurPoulie';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sansPrise } from '@/lib/v2/seance/prise';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { traduire } from '@/lib/i18n/tr';

export type ExoFiche = Pick<ExoProgramme, 'nom' | 'muscle' | 'series' | 'repsMin' | 'repsMax' | 'reposSec' | 'secondes' | 'minutes'>;

// le rouge de la carte des muscles (components/yoroi/v2/seances/MusclesSemaine.tsx)
const ROUGE = { clair: '#E9694A', sombre: '#F08C6E' };

function Repere({ valeur, libelle }: { valeur: string; libelle: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16, backgroundColor: c.fillSoft }}>
      <Ink size={18} weight="black" tight numberOfLines={1} adjustsFontSizeToFit style={{ fontVariant: ['tabular-nums'] }}>{valeur}</Ink>
      <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={1}>{libelle}</Ink>
    </View>
  );
}

/** Le grand visuel en haut de la fiche */
function GrandVisuel({ e, largeur }: { e: ExoFiche; largeur: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const test = useAnimationsTest();
  const cardio = typeof e.minutes === 'number' && e.minutes > 0;
  const v = React.useMemo(() => visuelExo(e.nom, e.muscle, cardio, test), [e.nom, e.muscle, cardio, test]);
  const hauteur = Math.round(Math.min(260, largeur * 0.7));
  if (v.type === 'animation') {
    const demo = <DemoPaire images={v.images} label={traduire('Animation de l’exercice {0}', traduire(e.nom))} largeur={largeur} hauteur={hauteur} arrondi={24} bordure={false} contenir />;
    if (v.source !== 'everkinetic') return demo;
    // licence CC BY-SA 4.0 : le crédit est visible sous l'illustration (lib/v2/programmes/everkinetic.ts)
    return (
      <View style={{ gap: 6 }}>
        {demo}
        <Ink size={11} weight="bold" color={c.textMuted} style={{ textAlign: 'center' }}>{traduire('Illustration : Everkinetic, CC BY-SA 4.0, adaptée')}</Ink>
      </View>
    );
  }
  if (v.type === 'machine') {
    return (
      <View style={{ width: largeur, height: hauteur, borderRadius: 24, backgroundColor: FOND_DEMO, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Image source={v.image} style={{ width: hauteur * 0.94, height: hauteur * 0.94 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    );
  }
  return (
    <View style={{ width: largeur, alignItems: 'center', paddingVertical: 8 }}>
      <CarreSticker nom={v.sticker} teinte={v.teinte} taille={Math.min(150, hauteur * 0.7)} rayon={36} />
    </View>
  );
}

export function FicheExercice({ exo, charge, onClose, onChanger, children }: {
  exo: ExoFiche | null;
  /** la charge proposée, déjà écrite (« 42,5 kg », « poids du corps ») */
  charge?: string | null;
  onClose: () => void;
  /** absent : pas de bouton « Changer » */
  onChanger?: () => void;
  children?: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const centree = useFeuilleCentree(560);
  const { width } = useWindowDimensions();
  const illus = useIllustrations();
  const [cran, setCran] = useState<number | null>(null);
  const nom = exo?.nom ?? '';

  useEffect(() => {
    if (!nom) return;
    let vivant = true;
    setCran(null);
    void chargerReglages().then((r) => { if (vivant) setCran(cranDe(r, nom)); });
    return () => { vivant = false; };
  }, [nom]);

  if (!exo) return null;
  const largeur = (centree ? Math.min(560, width - 48) : width) - 36;
  const cardio = typeof exo.minutes === 'number' && exo.minutes > 0;
  const base = sansPrise(exo.nom).base;
  const titre = sansTiret(traduire(nomFr(exo.nom)));

  // les muscles : la carte rouge (zones précises de l'exercice) et la phrase « Travaille : ... »
  const mx = cardio ? null : musclesExercice({ name: exo.nom, muscle_group: exo.muscle });
  const zones: ZoneId[] = Array.from(new Set((mx?.principaux ?? []).map((m) => m.zone)));
  const mu = musclesDeExo(base) ?? musclesDeExo(exo.nom);
  const liste = (l: string[]) => l.map((x) => traduire(x)).join(', ');
  const groupe = exo.muscle ? traduire(exo.muscle.charAt(0) + exo.muscle.slice(1).toLocaleLowerCase()) : '';
  const rouge = ROUGE[theme.isDark ? 'sombre' : 'clair'];
  const corps = Math.max(64, Math.min(92, Math.floor(largeur * 0.24)));

  const reps = exo.repsMin === exo.repsMax ? `${exo.repsMin}` : traduire('{0} à {1}', exo.repsMin, exo.repsMax);
  const hauteurPoulie = cardio ? null : libelleHauteurPoulie(exo.nom);

  const changer = onChanger
    ? () => {
        tap();
        onClose();
        // la feuille « Changer » s'ouvre une fois la fiche fermée (deux fenêtres à la fois se gênent sur iPhone)
        setTimeout(onChanger, 320);
      }
    : undefined;

  return (
    <Modal visible transparent animationType={centree ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[{ flex: 1, backgroundColor: 'rgba(16,18,30,0.45)', justifyContent: 'flex-end' }, centree?.fond]}>
        <Pressable style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onPress={onClose} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} />
        <View style={[{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '92%', paddingBottom: insets.bottom + 12 }, centree?.carte]}>
          <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} showsVerticalScrollIndicator={false}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: c.divider }} />

            <GrandVisuel e={exo} largeur={largeur} />

            <View style={{ gap: 2 }}>
              {groupe ? <Ink size={12} weight="extraBold" color={c.textSecondary} style={{ letterSpacing: 1.2 }}>{groupe.toLocaleUpperCase()}</Ink> : null}
              <Ink size={24} weight="black" tight accessibilityRole="header">{titre}</Ink>
            </View>

            {/* séries, répétitions, repos ; la charge proposée dessous */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {cardio ? (
                  <Repere valeur={traduire('{0} min', exo.minutes)} libelle={traduire('Cardio')} />
                ) : (
                  <>
                    <Repere valeur={String(exo.series)} libelle={traduire('séries')} />
                    <Repere valeur={reps} libelle={exo.secondes ? traduire('secondes') : traduire('répétitions')} />
                    <Repere valeur={libelleRepos(exo.reposSec)} libelle={traduire('de repos')} />
                  </>
                )}
              </View>
              {charge ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.fillSoft }}>
                  <Image source={illus.img('poids')} style={{ width: 26, height: 26 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1 }}>{traduire('Charge proposée')}</Ink>
                  <Ink size={15} weight="black" style={{ flexShrink: 1, textAlign: 'right' }}>{charge}</Ink>
                </View>
              ) : null}
            </View>

            {/* la petite carte rouge des muscles ciblés */}
            {zones.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider }}>
                <View style={{ flexDirection: 'row', gap: 4 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <CarteMuscles vue="face" largeur={corps} choisies={zones} accent={rouge} libelle />
                  <CarteMuscles vue="dos" largeur={corps} choisies={zones} accent={rouge} libelle />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }} accessible>
                  <Ink size={11} weight="black" color={rouge} style={{ letterSpacing: 1 }}>{traduire('Muscles ciblés').toLocaleUpperCase()}</Ink>
                  {mu ? (
                    <>
                      <Ink size={14} weight="extraBold" style={{ lineHeight: 19 }}>{liste(mu.principaux)}</Ink>
                      {mu.aussi.length ? <Ink size={12.5} color={c.textSecondary} style={{ lineHeight: 18 }}>{traduire('Aussi : {0}', liste(mu.aussi))}</Ink> : null}
                    </>
                  ) : (
                    <Ink size={14} weight="extraBold">{groupe}</Ink>
                  )}
                </View>
              </View>
            ) : null}

            <ExplicationExo nom={base} />

            {/* ton réglage mémorisé pendant une séance, et la hauteur de poulie quand elle est standard */}
            {cran != null || hauteurPoulie ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider }}>
                <Image source={illus.img('reglage_machine')} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <View style={{ flex: 1, gap: 2 }}>
                  <Ink size={14} weight="extraBold">{traduire('Réglage')}</Ink>
                  {cran != null ? <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire('Dernière fois : cran {0}', cran)}</Ink> : null}
                  {hauteurPoulie ? <Ink size={12.5} weight="bold" color={c.accentText}>{traduire(hauteurPoulie)}</Ink> : null}
                </View>
              </View>
            ) : null}

            {children}

            {changer ? (
              <BoutonPrincipal
                label={traduire('Changer')}
                onPress={changer}
                accessibilityLabel={traduire('Changer {0}', titre)}
                icone={() => <Image source={illus.img('refresh')} style={{ width: 22, height: 22 }} resizeMode="contain" />}
              />
            ) : null}
            <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Fermer')}</Ink>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
