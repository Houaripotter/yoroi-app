/**
 * La suggestion douce (1er novembre 2026, Houari : « l'application regarde ce que j'ai l'habitude de faire ») :
 * « Tu fais souvent 30 min de marche inclinée après ta séance, l'ajouter à ton programme ? », « Tu passes souvent
 * les abdos, les mettre 2 fois par semaine ? ». Deux boutons, Oui et Non merci. Rien n'est appliqué sans ton accord,
 * rien ne bloque : la carte se ferme et ne revient pas avant 21 jours (habitudesFin.ts).
 * Posée sur la page du programme en cours et dans Tes prochaines séances. `trainings` : tes séances, déjà lues.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { enregistrerFin, semaineDeLaFin } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { jourDuProgramme } from '@/lib/v2/programmes/semaineLibre';
import { chargerEnchainements } from '@/lib/v2/programmes/enchainements';
import type { Programme } from '@/lib/v2/programmes/types';
import { libelleCardio } from '@/lib/v2/seances/cardioJour';
import { chargerRefus, finAvecSuggestion, liensGardes, noterReponse, retenirHabitudes, seancesSuivies, suggestionDuMoment } from '@/lib/v2/seances/habitudesFin';
import type { Refus, SeanceLue, Suggestion } from '@/lib/v2/seances/habitudesFin';
import { traduire } from '@/lib/i18n/tr';

/** La question, en clair */
export function texteSuggestion(s: Suggestion): { titre: string; sous: string } {
  const freq = (n?: number) => (n ? traduire('{0} fois par semaine', n) : traduire('À chaque séance'));
  switch (s.genre) {
    case 'ajouter_cardio':
      return { titre: traduire('Tu fais souvent {0} après ta séance, l’ajouter à ton programme ?', libelleCardio(s.type, s.minutes)), sous: traduire('{0} fois ces 4 dernières semaines. Prévu : {1}', s.fois, freq(s.parSemaine)) };
    case 'ajouter_abdos':
      return { titre: traduire('Tu fais souvent des abdos après ta séance, les ajouter à ton programme ?'), sous: traduire('{0} fois ces 4 dernières semaines. Prévu : {1}', s.fois, freq(s.parSemaine)) };
    case 'moins_abdos':
      return { titre: s.parSemaine ? traduire('Tu passes souvent les abdos, les mettre {0} fois par semaine ?', s.parSemaine) : traduire('Tu passes souvent les abdos, les retirer de ton programme ?'), sous: traduire('Passés {0} fois ces 4 dernières semaines', s.passes) };
    case 'moins_cardio':
      return { titre: s.parSemaine ? traduire('Tu passes souvent le cardio, le mettre {0} fois par semaine ?', s.parSemaine) : traduire('Tu passes souvent le cardio, le retirer de ton programme ?'), sous: traduire('Passé {0} fois ces 4 dernières semaines', s.passes) };
  }
}

export function SuggestionHabitude({ programme, actif, trainings, maintenant }: { programme: Programme; actif: ProgrammeActif | null; trainings: readonly SeanceLue[]; maintenant?: Date }) {
  const pa = usePastel();
  const illus = useIllustrations();
  const [refus, setRefus] = useState<Refus | null>(null);
  const [liens, setLiens] = useState<Map<string, string>>(new Map());
  const [ferme, setFerme] = useState(false);
  useEffect(() => {
    let vivant = true;
    void chargerRefus().then((r) => { if (vivant) setRefus(r); });
    void chargerEnchainements().then((e) => { if (vivant) setLiens(liensGardes(e)); }).catch(() => {});
    return () => { vivant = false; };
  }, []);
  // tes habitudes servent aussi de départ aux écrans qui annoncent la séance (cardio, abdos)
  useEffect(() => {
    retenirHabitudes(trainings, maintenant, liens);
  }, [trainings, liens, maintenant]);
  const s = useMemo(() => {
    if (!actif || actif.id !== programme.id || refus === null) return null;
    const suivies = seancesSuivies(actif.faits, trainings, (id) => jourDuProgramme(programme, id), actif.fin, maintenant);
    const { semaine } = semaineDeLaFin(actif, programme, maintenant);
    return suggestionDuMoment({ fin: actif.fin, trainings, suivies, seancesParSemaine: semaine.length, refus, maintenant });
  }, [actif, programme, trainings, refus, maintenant]);
  if (!s || ferme) return null;
  const t = texteSuggestion(s);
  const fam = s.genre.endsWith('cardio') ? pa.peche : pa.creme;
  const repondre = async (oui: boolean) => {
    tap();
    setFerme(true);
    if (oui) await enregistrerFin(finAvecSuggestion(actif?.fin, s)).catch(() => {});
    await noterReponse(s.genre, maintenant);
  };
  return (
    <View accessibilityRole="summary" style={[{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: fam.fond }, ombrePastel(pa.ombre)]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {illus.stickers ? <Image source={illus.img(s.genre.endsWith('cardio') ? 'cardio_zone2' : 'abdos')} style={{ width: 52, height: 52 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Ink size={12} weight="black" color={fam.encre} style={{ letterSpacing: 0.6 }}>{traduire('TES HABITUDES')}</Ink>
          <Ink size={16} weight="black" tight color={pa.texte}>{t.titre}</Ink>
          <Ink size={13} weight="bold" color={pa.texte2}>{t.sous}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={() => void repondre(true)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.boutonAppui : pa.bouton })}>
          <Ink size={15} weight="black" color={pa.surBouton}>{traduire('Oui')}</Ink>
        </Pressable>
        <Pressable onPress={() => void repondre(false)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.ligne : pa.carte, borderWidth: 1.5, borderColor: pa.ligne })}>
          <Ink size={15} weight="extraBold" color={pa.texte}>{traduire('Non merci')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}
