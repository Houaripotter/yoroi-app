/**
 * La carte de l'exercice cardio de la seance en direct (30 octobre 2026, sortie de app/seance/muscu.tsx le
 * 31 octobre) : gros chrono, Demarrer, Pause, Terminer, duree a la main. 31 octobre 2026 : le type choisi (toucher
 * l'en-tete rouvre la feuille « Ton cardio »), la plage de zone 2, pente et vitesse (ou niveau), puis le bilan.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';
import { fmtNum } from '@/lib/v2/seance/format';
import { ecouleMs, enCours as chronoEnCours, fmtChrono } from '@/lib/v2/seances/cardioFin';
import type { ChronoCardio } from '@/lib/v2/seances/cardioFin';
import { bilanCardio, infoCardio, typeDepart } from '@/lib/v2/seances/cardioChoix';
import type { Valeurs } from '@/lib/v2/seances/cardioChoix';
import type { Zone2 } from '@/lib/v2/seances/zone2';
import { BandeZone2, SaisieCardio } from './SaisieCardio';
import { BilanCardio } from './BilanCardio';

/** 30 octobre 2026 (J) : la carte de l'exercice cardio, gros chrono, Démarrer, Pause, Terminer, durée à la main */
export function CarteCardio({ chrono, fait, dureeFaite, maintenant, onDemarrer, onPause, onTerminer, onManuel, onDistance, zone2, lectureFc, onChoisir, onValeur, onSegment, onRetirerSegment, onParler, onSuite, nom }: {
  /* 31 octobre 2026 : type, pente et vitesse, zone 2 et bilan */
  zone2: Zone2 | null;
  lectureFc: boolean;
  onChoisir: () => void;
  onValeur: (v: Valeurs) => void;
  onSegment: () => void;
  onRetirerSegment: () => void;
  onParler: (oui: boolean) => void;
  onSuite: (suite: 'garder' | 'suggestion', prochain: Valeurs) => void;
  nom: string;
  chrono: ChronoCardio;
  fait: boolean;
  dureeFaite: number;
  maintenant: number;
  onDemarrer: () => void;
  onPause: () => void;
  onTerminer: () => void;
  onManuel: (min: number) => void;
  onDistance: (km: number) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [manuel, setManuel] = useState(!!chrono.manuelMin);
  const [distance, setDistance] = useState(!!chrono.distanceKm);
  const ecoule = fait ? dureeFaite : Math.floor(ecouleMs(chrono, Math.max(maintenant, Date.now())) / 1000);
  const marche = chronoEnCours(chrono);
  const atteint = ecoule >= chrono.objectifSec;
  const peutTerminer = !fait && (ecoule > 0 || (chrono.manuelMin ?? 0) > 0);
  const type = chrono.type ?? typeDepart(nom);
  const info = infoCardio(type);
  // distance tiree de la vitesse du tapis : la saisie a la main n'est proposee que sans elle
  const distanceTapis = bilanCardio(chrono.segments, Math.max(1, ecoule), info.mesure).distanceKm;
  const bouton = (label: string, onPress: () => void, principal: boolean, actif = true) => (
    <Pressable onPress={onPress} disabled={!actif} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', opacity: actif ? 1 : 0.45, backgroundColor: principal ? (pressed ? c.primaryPressed : c.primary) : pressed ? c.fillSubtle : c.fillSoft })}>
      <Ink size={16} weight="black" color={principal ? c.onPrimary : c.ink}>{label}</Ink>
    </Pressable>
  );
  return (
    <View style={{ borderRadius: 24, backgroundColor: fait || atteint ? ton('menthe').fond : c.surface, borderWidth: 2, borderColor: fait ? ton('menthe').encre : c.primary, padding: 16, gap: 14 }}>
      <Pressable onPress={fait ? undefined : onChoisir} disabled={fait} accessibilityRole="button" accessibilityLabel={traduire('Changer de cardio')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StickerOuIcone sticker={info.sticker as NomSticker} icon="timer" size={44} />
        <View style={{ flex: 1 }}>
          <Ink size={17} weight="black" color={c.ink} numberOfLines={1}>{traduire(info.label)}</Ink>
          <Ink size={14} weight="extraBold" color={fait ? ton('menthe').encre : c.textSecondary}>
            {fait ? traduire('Cardio fait') : traduire('Objectif : {0} min', Math.round(chrono.objectifSec / 60))}
          </Ink>
        </View>
        {fait ? null : <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Changer')}</Ink>}
      </Pressable>
      {!fait && zone2 ? <BandeZone2 zone={zone2} /> : null}
      <View accessibilityLiveRegion="polite" accessibilityLabel={traduire('{0} sur {1}', fmtChrono(ecoule), fmtChrono(chrono.objectifSec))} style={{ alignItems: 'center' }}>
        <Ink size={56} weight="black" tight color={c.ink} style={{ fontVariant: ['tabular-nums'] }}>{fmtChrono(ecoule)}</Ink>
        <Ink size={17} weight="extraBold" color={c.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>{traduire('sur {0}', fmtChrono(chrono.objectifSec))}</Ink>
      </View>
      {fait ? (
        <BilanCardio chrono={chrono} dureeSec={dureeFaite} lecture={lectureFc} onParler={onParler} onSuite={onSuite} />
      ) : (
        <>
          <SaisieCardio type={type} segments={chrono.segments ?? [{ aSec: 0 }]} ecouleSec={ecoule} marche={marche} onValeur={onValeur} onSegment={onSegment} onRetirerSegment={onRetirerSegment} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {marche ? bouton(traduire('Pause'), onPause, false) : bouton(ecoule > 0 ? traduire('Reprendre') : traduire('Démarrer'), onDemarrer, true)}
            {bouton(traduire('Terminer'), onTerminer, marche || atteint, peutTerminer)}
          </View>
          {/* chrono oublie : la duree a la main */}
          {ecoule === 0 && !marche ? (
            manuel ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire('Durée faite')}</Ink>
                <Stepper value={chrono.manuelMin ?? 0} step={1} min={0} max={300} unit={traduire('minutes')} size={20} button={38} format={(v) => traduire('{0} min', v)} onChange={onManuel} />
              </View>
            ) : (
              <Pressable onPress={() => setManuel(true)} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}>
                <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Saisir la durée à la main')}</Ink>
              </Pressable>
            )
          ) : null}
          {distanceTapis ? null : distance ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire('Distance')}</Ink>
              <Stepper value={chrono.distanceKm ?? 0} step={0.1} min={0} max={100} decimals unit={traduire('kilomètres')} size={20} button={38} format={(v) => traduire('{0} km', fmtNum(v))} onChange={onDistance} />
            </View>
          ) : (
            <Pressable onPress={() => setDistance(true)} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}>
              <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Noter la distance')}</Ink>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
