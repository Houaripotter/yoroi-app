/**
 * Carte « Ton programme » de l'onglet Seances (24 octobre 2026, refaite le soir meme : la premiere version,
 * une simple ligne, passait inapercue). Grande carte illustree comme « Ta derniere seance » : le programme,
 * la semaine avec sa barre de progression, la seance du jour et ses premiers exercices en animation, et le
 * bouton pour la commencer. Sans programme : une carte qui donne envie d'en choisir un.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, SectionTitle, tap } from './ui';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, faitsCetteSemaine, joursDuProgramme, planEffectif, prochainJour, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { messageCoach } from '@/lib/v2/programmes/coach';
import { CoachProgramme } from '@/components/yoroi/v2/programmes/CoachProgramme';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import { traduire } from '@/lib/i18n/tr';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';

export function ProgrammeCard({ onOpen, femme = false }: { onOpen: () => void; femme?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [actif, setActif] = useState<ProgrammeActif | null>(null);

  useEffect(() => {
    const charger = () => chargerProgrammeActif().then(setActif).catch(() => setActif(null));
    charger();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, charger);
    return () => sub.remove();
  }, []);

  const suite = actif ? prochainJour(actif) : null;

  if (!actif || !suite) {
    // pas de programme : l'entree vers les programmes, bien visible
    const art = sportImage('musculation', femme, 1);
    return (
      <>
        <SectionTitle title={traduire('Programmes')} />
        <View style={[carteBlanche(c.surface, c.divider), { borderRadius: 24, overflow: 'hidden' }]}>
          <View style={{ height: 124, backgroundColor: sportTint('musculation'), overflow: 'hidden', padding: 16, justifyContent: 'flex-end' }}>
            {art ? <Image source={art} style={{ position: 'absolute', right: 0, top: 8, width: 118, height: 158 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            <View style={{ maxWidth: '66%', gap: 2 }}>
              <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Basés sur des études')}</Ink>
              <Ink size={21} weight="black" tight>{traduire('Suis un programme')}</Ink>
            </View>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <Ink size={14} color={c.textSecondary}>{traduire('Muscle, perte de poids, fessiers, course, combat : 4 questions, et YOROI te dit quoi faire chaque jour.')}</Ink>
            <BigButton label={traduire('Trouver mon programme')} icon="target" onPress={onOpen} />
            {/* perdu a la salle : la seance des zones touchees sur le corps (app/programmes/zones.tsx) */}
            <BigButton label={traduire('Je choisis mes zones')} tone="soft" onPress={() => { tap(); router.push('/programmes/zones' as any); }} />
          </View>
        </View>
      </>
    );
  }

  const p = suite.programme;
  const j = suite.jour;
  const semaine = semaineDuProgramme(actif);
  const faits = faitsCetteSemaine(actif);
  const part = Math.min(1, faits / Math.max(1, p.joursParSemaine));
  const art = sportImage(sportDuProgramme(p), femme, 1);
  const apercu = j.exos.slice(0, 3);

  const commencer = () => {
    tap();
    const r = routeDuJour(p, j, semaine);
    router.push({ pathname: r.pathname as any, params: r.params });
  };

  return (
    <>
      <SectionTitle title={traduire('Ton programme')} action={traduire('Voir')} onAction={onOpen} />
      <View style={[carteBlanche(c.surface, c.divider), { borderRadius: 24, overflow: 'hidden' }]}>
        <View style={{ height: 124, backgroundColor: sportTint(sportDuProgramme(p)), overflow: 'hidden', padding: 16, justifyContent: 'flex-end' }}>
          {art ? <Image source={art} style={{ position: 'absolute', right: 0, top: 8, width: 118, height: 158 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          <View style={{ maxWidth: '66%', gap: 2 }}>
            <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Semaine {0}', semaine)}</Ink>
            <Ink size={21} weight="black" tight numberOfLines={2}>{traduire(p.titre)}</Ink>
          </View>
        </View>

        <View style={{ padding: 16, gap: 14 }}>
          {/* 25 octobre 2026 : le mot du coach du jour (lib/v2/programmes/coach.ts) ; le bouton Commencer est plus bas */}
          <CoachProgramme
            message={{ ...messageCoach({ programme: p, actif, jours: joursDuProgramme(actif, p), prochaineSeance: traduire(j.titre), femme, fixe: !!planEffectif(actif, p) }), seanceDuJour: false }}
            onCommencer={commencer}
          />
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Ink size={13} weight="extraBold">{traduire('Cette semaine')}</Ink>
              <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('{0} sur {1} séances', faits, p.joursParSemaine)}</Ink>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSubtle, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(part * 100)}%`, height: 8, borderRadius: 4, backgroundColor: c.detail }} />
            </View>
          </View>

          <View style={{ borderRadius: 16, backgroundColor: c.fillSoft, padding: 12, gap: 10 }}>
            <View style={{ gap: 1 }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Ta prochaine séance')}</Ink>
              <Ink size={17} weight="black" tight>{traduire('Jour {0}, {1}', suite.index + 1, traduire(j.titre))}</Ink>
              <Ink size={13} color={c.textSecondary}>{resumeDuJour(j, semaine)}</Ink>
            </View>
            {apercu.length ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {apercu.map((e, k) => (
                  <View key={`${e.nom}${k}`} style={{ flex: 1, gap: 4, alignItems: 'center' }}>
                    <ExoDemo nom={e.nom} taille={78} arrondi={14} />
                    <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ textAlign: 'center' }}>{traduire(nomFr(e.nom))}</Ink>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <BigButton label={traduire('Commencer')} icon="play" tone="accent" onPress={commencer} style={{ flex: 1 }} />
            <BigButton label={traduire('Le programme')} tone="soft" onPress={onOpen} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </>
  );
}
