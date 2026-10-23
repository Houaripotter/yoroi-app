/**
 * Studio, rubrique Gamification.
 * XP, rang, dan, avatar et reprise des anciens : seulement avec Heny chargee (le registre de la demo
 * est rendu par le retour des vraies donnees : tes vraies XP ne sont jamais touchees).
 * Animations : chaque passage de rang, le dan, la plaque, les sceaux, la Lune du mois et la bienvenue,
 * avec des donnees fictives, rien n'est ecrit. La semaine tenue se voit sur la fin de seance de Heny.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Row } from '@/components/yoroi/v2/espace/ui';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { ARMURE_CHANGED_EVENT, DAN_STEP, RANKS, danFor, rankFor, rankTitle, syncArmure } from '@/lib/v2/armure';
import type { ArmureRank } from '@/lib/v2/armure';
import { getTrainings } from '@/lib/database';
import { adjustDemoXp, setDemoRank, setDemoXp } from '@/lib/v2/creator/studioXp';
import { ONCE_WINDOWS } from '@/lib/v2/creator/onceWindows';
import { Chip, ChipWrap, Note, StudioSection, SubTitle, useStudio } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, LOCALE } from '@/lib/i18n/tr';

export function Gamification() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { espace } = useEspace();
  const { demoActive, show, openSection } = useStudio();
  const [xp, setXp] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    syncArmure().then((s) => setXp(s.state.xp)).catch(() => setXp(null));
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(ARMURE_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load, demoActive]);

  const run = async (fn: () => Promise<number>) => {
    if (busy) return;
    setBusy(true);
    try {
      setXp(await fn());
    } catch (e) {
      appAlert(traduire('Impossible'), e instanceof Error ? e.message : traduire('L’opération n’a pas abouti.'));
    } finally {
      setBusy(false);
    }
  };

  const rank: ArmureRank | null = xp === null ? null : rankFor(xp);
  const dan = xp === null ? 0 : danFor(xp);
  const image = (i: number) => personnageImage(espace.personnage, i);

  /** Fin de seance de la derniere seance de Heny : la semaine tenue s'y affiche */
  const openWeekHeld = async () => {
    try {
      const list = await getTrainings(21);
      const last = [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id) - Number(a.id))[0];
      if (!last?.id) {
        appAlert(traduire('Aucune séance'), traduire('Heny n’a pas de séance récente à ouvrir.'));
        return;
      }
      router.push({ pathname: '/seance/fin', params: { id: String(last.id) } } as never);
    } catch {
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être lue.'));
    }
  };

  const replayWelcome = async () => {
    const w = ONCE_WINDOWS.find((x) => x.id === 'bienvenue');
    try {
      await w?.reset();
      router.push('/(tabs)/dojo' as never);
    } catch {
      appAlert(traduire('Oups'), traduire('La reprise n’a pas pu être réarmée.'));
    }
  };

  return (
    <StudioSection id="gamif" icon="crown" title={traduire("Gamification")} sub={traduire("XP, rang, dan, avatar et chaque animation")} keywords="xp rang dan avatar personnage celebration plaque sceau lune semaine tenue bienvenue reprise anciens">
      {demoActive ? (
        <>
          <Card style={{ padding: 14, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Ink size={34} weight="black" tight>{xp === null ? traduire('Un instant') : xp.toLocaleString(LOCALE)}</Ink>
              <Ink size={15} weight="bold" color={c.textSecondary}>{traduire("XP de Heny{0}", rank ? `, ${rankTitle(rank)}` : '')}</Ink>
            </View>
            <ChipWrap>
              {[-1000, -100, 100, 500, 2000].map((d) => (
                <Chip key={d} label={d > 0 ? `+${d}` : traduire("moins {0}", -d)} disabled={busy} accessibilityLabel={d > 0 ? `Donner ${d} XP` : `Retirer ${-d} XP`} onPress={() => void run(() => adjustDemoXp(d))} />
              ))}
            </ChipWrap>
          </Card>

          <Card style={{ padding: 14, gap: 10 }}>
            <Ink size={15} weight="extraBold">{traduire("Rang et avatar")}</Ink>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {RANKS.map((r) => {
                const on = rank?.index === r.index;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => {
                      selectionAsync().catch(() => {});
                      void run(() => setDemoRank(r.index));
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={traduire("Passer Heny au rang {0}", r.name)}
                    style={{ width: '19%', alignItems: 'center', gap: 4, paddingVertical: 6, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentTint : c.surface }}
                  >
                    <Image source={image(r.index)} style={{ width: 52, height: 66 }} resizeMode="contain" />
                    <Ink size={11} weight="extraBold" numberOfLines={1}>{traduire(r.name)}</Ink>
                  </Pressable>
                );
              })}
            </View>
            <SubTitle>{traduire("Dan de Shōgun{0}", dan > 0 ? `, actuel : ${dan}` : '')}</SubTitle>
            <ChipWrap>
              {[1, 2, 3, 5].map((n) => (
                <Chip key={n} label={`Dan ${n}`} on={dan === n} disabled={busy} onPress={() => void run(() => setDemoXp(RANKS[RANKS.length - 1].minXp + DAN_STEP * n))} />
              ))}
            </ChipWrap>
            <Note>{traduire("Un rang place Heny au début de ce rang, un dan ajoute {0} XP par dan après Shōgun. L’avatar de l’accueil et du Dojo suit, et le Dojo fête le passage.", DAN_STEP.toLocaleString(LOCALE))}</Note>
          </Card>

          <Card>
            <Row first icon="user" label={traduire("Choisir le personnage")} sub={traduire("Guerrier, guerrière, personnages du monde")} onPress={() => router.push('/avatar-selection' as never)} />
            <Row icon="restore" label={traduire("Rejouer la reprise des anciens")} sub={traduire("Réarme le résumé de reprise de Heny, puis ouvre le Dojo")} onPress={() => void replayWelcome()} />
            <Row icon="calendar" label={traduire("Semaine tenue")} sub={traduire("La fin de séance de la dernière séance de Heny")} onPress={() => void openWeekHeld()} />
          </Card>
        </>
      ) : (
        <Card style={{ padding: 16, gap: 10 }}>
          <Ink size={15} weight="extraBold">{traduire("Charge Heny pour régler les XP")}</Ink>
          <Ink size={13} color={c.textSecondary}>{traduire("XP, rang, dan, avatar et reprise se règlent seulement sur Heny, pour ne jamais toucher à tes vraies XP. Elles reviennent intactes quand tu remets tes vraies données. Les animations ci-dessous marchent sans elle.")}</Ink>
          <Button tone="ghost" label={traduire("Aller à Démo et captures")} onPress={() => openSection('demo')} small />
        </Card>
      )}

      <SubTitle>{traduire("Animations, données fictives, rien n’est écrit")}</SubTitle>
      <Card style={{ padding: 14, gap: 10 }}>
        <Ink size={15} weight="extraBold">{traduire("Passage de rang")}</Ink>
        <ChipWrap>
          {RANKS.map((r) => (
            <Chip key={r.id} label={traduire(r.name)} onPress={() => show({ kind: 'rang', rankIndex: r.index })} accessibilityLabel={traduire("Voir le passage au rang {0}", r.name)} />
          ))}
          <Chip label={traduire("Dan")} onPress={() => show({ kind: 'dan' })} accessibilityLabel={traduire("Voir le passage d’un dan")} />
        </ChipWrap>
      </Card>
      <Card>
        <Row first icon="shield" label={traduire("Nouvelle plaque d’armure")} sub={traduire("Deux plaques sur trois")} onPress={() => show({ kind: 'plaque' })} />
        <Row icon="star" label={traduire("Nouveaux sceaux")} sub={traduire("Trois sceaux fictifs")} onPress={() => show({ kind: 'sceaux' })} />
        <Row icon="moon" label={traduire("Lune du mois")} sub={traduire("Trois semaines tenues dans le mois")} onPress={() => show({ kind: 'lune' })} />
        <Row icon="user" label={traduire("Bienvenue des anciens")} sub={traduire("Le résumé de reprise, chiffres fictifs")} onPress={() => show({ kind: 'bienvenue' })} />
      </Card>
    </StudioSection>
  );
}

export default Gamification;
