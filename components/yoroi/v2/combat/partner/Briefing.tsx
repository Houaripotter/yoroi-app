/**
 * Briefing avant le combat, plein ecran : objectif, dangers, opportunites,
 * faiblesses, dernier debrief, forme recente et dernieres notes.
 */
import React from 'react';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { shortDate } from '@/lib/v2/combat/rounds';
import type { Partner } from '@/lib/v2/combat/partners';
import type { PartnerInsights } from '@/lib/v2/combat/partnerInsights';
import { BeltBar, Card, D, Glass, IconBtn, N, P, ResultPlate, Seal, V } from '../ui';

function Tags({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((s, i) => (
        <View key={`${s}_${i}`} style={{ paddingHorizontal: 12, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: `${color}14` }}>
          <Ink size={14} weight="bold" color={color}>
            {s}
          </Ink>
        </View>
      ))}
    </View>
  );
}

function Block({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <Card style={{ gap: 10, borderLeftWidth: 5, borderLeftColor: color }}>
      <Ink size={16} weight="black" color={color}>
        {title}
      </Ink>
      {children}
    </Card>
  );
}

export function Briefing({ visible, onClose, p, ins }: { visible: boolean; onClose: () => void; p: Partner; ins: PartnerInsights }) {
  const insets = useSafeAreaInsets();
  const empty = !p.activeGoal?.text && !p.longTermGoal?.text && p.strengths.length === 0 && p.weaknesses.length === 0 && p.whatWorks.length === 0 && p.notes.length === 0 && ins.blocks.length === 0;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={15} weight="extraBold" color={P.accent}>
              Briefing avant le combat
            </Ink>
            <IconBtn icon="close" label="Fermer le briefing" onPress={onClose} />
          </View>
          <Glass style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Seal name={p.name} photoUri={p.photoUri} belt={p.belt} size={76} tone={ins.title.color} />
              <View style={{ flex: 1, gap: 4 }}>
                <Ink size={28} weight="black" tight numberOfLines={1}>
                  {p.name}
                </Ink>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <BeltBar belt={p.belt} width={66} height={10} />
                  {p.weight ? (
                    <Ink size={13} weight="bold" color={P.muted}>
                      {p.weight}
                    </Ink>
                  ) : null}
                </View>
              </View>
              {ins.winRate != null ? (
                <View style={{ alignItems: 'center' }}>
                  <Ink size={32} weight="black" tight color={ins.winRate >= 50 ? V : D}>
                    {`${ins.winRate}%`}
                  </Ink>
                  <Ink size={11} weight="bold" color={P.ink2}>
                    victoires
                  </Ink>
                </View>
              ) : null}
            </View>
            {ins.total > 0 ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { v: ins.wins, l: 'victoires', c: V },
                  { v: ins.losses, l: 'défaites', c: D },
                  { v: ins.draws, l: 'nuls', c: N },
                  { v: ins.total, l: 'rounds', c: P.ink },
                ].map((s) => (
                  <View key={s.l} style={{ flex: 1, paddingVertical: 10, borderRadius: 16, backgroundColor: `${s.c}10`, alignItems: 'center' }}>
                    <Ink size={22} weight="black" color={s.c}>
                      {String(s.v)}
                    </Ink>
                    <Ink size={11} weight="bold" color={P.ink2}>
                      {s.l}
                    </Ink>
                  </View>
                ))}
              </View>
            ) : null}
            {ins.currentStreak && ins.currentStreak.count >= 2 ? (
              <Ink size={14} weight="extraBold" color={ins.currentStreak.type === 'win' ? V : D}>
                {`${ins.currentStreak.count} ${ins.currentStreak.type === 'win' ? 'victoires' : 'défaites'} d'affilée`}
              </Ink>
            ) : null}
          </Glass>

          {p.activeGoal?.text ? (
            <View style={{ borderRadius: 24, padding: 18, backgroundColor: P.accent, gap: 6 }}>
              <Ink size={13} weight="extraBold" color="rgba(255,255,255,0.85)">
                Objectif du jour
              </Ink>
              <Ink size={20} weight="black" tight color={P.white}>
                {p.activeGoal.text}
              </Ink>
            </View>
          ) : null}

          {p.longTermGoal?.text ? (
            <Block title={`Objectif à long terme, ${p.longTermGoal.targetWinRate} % visé`} color={P.indigo}>
              <Ink size={15} weight="bold">
                {p.longTermGoal.text}
              </Ink>
            </Block>
          ) : null}

          {p.strengths.length > 0 || ins.topTaken.length > 0 ? (
            <Block title="Dangers, ses points forts" color={D}>
              {p.strengths.length > 0 ? <Tags items={p.strengths} color={D} /> : null}
              {ins.topTaken.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    Ses finitions préférées sur toi
                  </Ink>
                  <Tags items={ins.topTaken.map((t) => `${t.label} x${t.count}`)} color={D} />
                </View>
              ) : null}
            </Block>
          ) : null}

          {p.whatWorks.length > 0 || ins.topGiven.length > 0 ? (
            <Block title="Opportunités, ce qui marche" color={V}>
              {p.whatWorks.length > 0 ? <Tags items={p.whatWorks} color={V} /> : null}
              {ins.topGiven.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    Tes finitions qui passent
                  </Ink>
                  <Tags items={ins.topGiven.map((t) => `${t.label} x${t.count}`)} color={V} />
                </View>
              ) : null}
            </Block>
          ) : null}

          {p.weaknesses.length > 0 ? (
            <Block title="Ses faiblesses, à exploiter" color={N}>
              <Tags items={p.weaknesses} color={N} />
            </Block>
          ) : null}

          {ins.lastGamePlan || ins.lastWorked || ins.lastDidnt || ins.lastImprovement ? (
            <Block title="Dernier débrief" color={P.ink}>
              {[
                { k: 'Plan prévu', v: ins.lastGamePlan, c: P.ink2 },
                { k: 'Ce qui a marché', v: ins.lastWorked, c: V },
                { k: "Ce qui n'a pas marché", v: ins.lastDidnt, c: D },
                { k: 'À améliorer', v: ins.lastImprovement?.text, c: P.indigo },
              ]
                .filter((x) => !!x.v)
                .map((x) => (
                  <View key={x.k} style={{ gap: 2 }}>
                    <Ink size={12} weight="extraBold" color={x.c}>
                      {x.k}
                    </Ink>
                    <Ink size={15}>{x.v}</Ink>
                  </View>
                ))}
            </Block>
          ) : null}

          {ins.blocks.length > 0 ? (
            <Block title={`Forme récente, ${ins.blocks.length} séances`} color={P.ink2}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ins.blocks.slice(0, 20).map((b, i) => (
                  <ResultPlate key={i} result={b.result} size={24} />
                ))}
              </View>
              <Ink size={12} color={P.muted}>
                La plus récente à gauche
              </Ink>
            </Block>
          ) : null}

          {p.notes.length > 0 ? (
            <Block title="Notes récentes" color={P.ink2}>
              {p.notes.slice(0, 3).map((n) => (
                <View key={n.id} style={{ gap: 2 }}>
                  <Ink size={12} weight="bold" color={P.muted}>
                    {shortDate(n.date, true)}
                  </Ink>
                  <Ink size={15}>{n.content}</Ink>
                </View>
              ))}
              {p.notes.length > 3 ? (
                <Ink size={12} color={P.muted}>
                  {`Et ${p.notes.length - 3} autres dans sa fiche`}
                </Ink>
              ) : null}
            </Block>
          ) : null}

          {empty ? (
            <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
              <Ornement name="katanas" size={84} />
              <Ink size={15} color={P.ink2} style={{ textAlign: 'center' }}>
                {`Remplis la fiche de ${p.name} (forces, faiblesses, ce qui marche) pour avoir un vrai briefing avant ton prochain combat.`}
              </Ink>
            </Card>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
