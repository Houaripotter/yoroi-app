/**
 * Ton programme mixte (30 octobre 2026), les petits morceaux posés ailleurs que dans son écran (app/programme-mixte.tsx) :
 *  - BandeauMixte : « Semaine mixte jusqu'à dimanche » et « Annuler », tant qu'une semaine mixte ponctuelle tourne
 *    (page du programme, Coach). Annuler : ta semaine normale revient tout de suite (suivi.ts, annulerMixtePonctuel).
 *  - BoutonSemaineMixte : « Faire une semaine mixte », le raccourci ponctuel depuis la page du programme en cours.
 *  - DeuxFoisPrevu : combien de groupes reviennent 2 fois dans la semaine que tu composes (lib/v2/frequence),
 *    avec « Pourquoi 2 fois ? » et ses études.
 * Le modèle : lib/v2/programmes/mixte.ts.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { illustration } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { FeuillePourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import { OBJECTIF_JOURS } from '@/lib/v2/frequence/deuxFois';
import { POURQUOI_DEUX_FOIS } from '@/lib/v2/frequence/pourquoiDeuxFois';
import { groupesAtteints, libelleFin } from '@/lib/v2/programmes/mixte';
import { PROGRAMME_CHANGED_EVENT, annulerMixtePonctuel, chargerProgrammeActif, mixteEnCours } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { LigneSemaine, SemaineLibre } from '@/lib/v2/programmes/semaineLibre';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

function useActif(): ProgrammeActif | null {
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  useEffect(() => {
    let vivant = true;
    const lire = () => chargerProgrammeActif().then((a) => { if (vivant) setActif(a); }).catch(() => {});
    lire();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lire);
    return () => { vivant = false; sub.remove(); };
  }, []);
  return actif;
}

/** « Semaine mixte jusqu'à dimanche », « Annuler » */
export function BandeauMixte({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const pal = usePaletteProgramme();
  const actif = useActif();
  const m = mixteEnCours(actif);
  if (!m) return null;
  const fin = libelleFin(m.jusquau);
  const texte = traduire(fin.gabarit, ...fin.valeurs);
  const annuler = () => {
    tap();
    appAlert(
      traduire('Arrêter ta semaine mixte ?'),
      m.temporaire ? traduire('Tes séances faites et tes charges restent.') : traduire('Ta semaine normale revient tout de suite. Tes séances faites et tes charges restent.'),
      [
        { text: traduire('Garder'), style: 'cancel' },
        { text: traduire('Arrêter'), style: 'destructive', onPress: () => void annulerMixtePonctuel() },
      ],
    );
  };
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, borderRadius: 22, backgroundColor: pal.orangeTint }, style]}>
      <Image source={illustration('sablier')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={14.5} weight="black" color={pal.texte}>{texte}</Ink>
        {m.nom ? <Ink size={12} weight="bold" color={pal.texte2} numberOfLines={1}>{traduire(m.nom)}</Ink> : null}
      </View>
      <Pressable
        onPress={annuler}
        accessibilityRole="button"
        accessibilityLabel={traduire('Annuler la semaine mixte')}
        style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? pal.anneau : pal.carte })}
      >
        <Ink size={13} weight="extraBold" color={pal.texte}>{traduire('Annuler')}</Ink>
      </Pressable>
    </View>
  );
}

/** « Faire une semaine mixte » : le raccourci ponctuel, depuis ton programme en cours */
export function BoutonSemaineMixte() {
  const pal = usePaletteProgramme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => { tap(); router.push({ pathname: '/programme-mixte' as any, params: { mode: 'ponctuel' } }); }}
      accessibilityRole="button"
      accessibilityLabel={`${traduire('Faire une semaine mixte')}, ${traduire('PPL, Upper Lower, Full body, pour quelques jours')}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? pal.teinte : pal.carte })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: pal.orangeTint, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={illustration('repeter')} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15.5} weight="black" color={pal.texte}>{traduire('Faire une semaine mixte')}</Ink>
        <Ink size={12} weight="bold" color={pal.texte2}>{traduire('PPL, Upper Lower, Full body, pour quelques jours')}</Ink>
      </View>
      <Icon name="chevron" size={16} color={pal.texte3} />
    </Pressable>
  );
}

/** Combien de groupes reviennent 2 fois dans la semaine composée, et pourquoi c'est utile */
export function DeuxFoisPrevu({ semaine, base, lignes }: { semaine: SemaineLibre; base: Programme; lignes: LigneSemaine[] }) {
  const pal = usePaletteProgramme();
  const [pourquoi, setPourquoi] = useState(false);
  const r = lignes.map((l) => groupesAtteints(semaine, base, l, OBJECTIF_JOURS));
  const atteints = Math.min(...r.map((x) => x.atteints));
  const total = r[0]?.total ?? 0;
  if (!total) return null;
  const tout = atteints === total;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: tout ? pal.vertTint : pal.teinte }}>
      <Image source={illustration('objectif_semaine')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, gap: 4 }}>
        <Ink size={14} weight="black" color={pal.texte}>
          {tout ? traduire('Chaque groupe 2 fois par semaine') : traduire('{0} groupes sur {1} travaillés 2 fois par semaine', atteints, total)}
        </Ink>
        <Pressable onPress={() => { tap(); setPourquoi(true); }} accessibilityRole="button" accessibilityLabel={traduire('Pourquoi 2 fois ?')} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
          <Ink size={12.5} weight="extraBold" color={pal.accent}>{traduire('Pourquoi 2 fois ?')}</Ink>
        </Pressable>
      </View>
      <FeuillePourquoi explication={pourquoi ? POURQUOI_DEUX_FOIS : null} onClose={() => setPourquoi(false)} />
    </View>
  );
}
