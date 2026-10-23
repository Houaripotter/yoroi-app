/**
 * Partenaires de sparring v2 : ton carnet de guerre. Chaque partenaire est une
 * carte de guerrier (sceau, ceinture, bilan en barres). Toucher une carte ouvre
 * sa fiche tactique complete. Parametre facultatif : partnerName.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { aBesoinDeRappels, scheduleSparringReminders, requestNotificationPermissions } from '@/lib/sparringNotifications';
import { proposerNotifications } from '@/lib/v2/notifications/permission';
import { useCombatData } from '@/lib/v2/combat/useCombatData';
import { allStats, deletePartner, effectiveStats, newPartner, upsertPartner } from '@/lib/v2/combat/partners';
import type { Partner } from '@/lib/v2/combat/partners';
import { agoText, BELTS, daysAgo, makeId, plural } from '@/lib/v2/combat/rounds';
import { BeltBar, BigButton, Card, Chip, ChipScroll, CIcon, D, DetailScreen, Enter, Field, FormSheet, Glass, IconBtn, P, Press, RecordBars, Seal, Section, sportLabel, Stat, V } from '@/components/yoroi/v2/combat/ui';
import { PartnerDetail } from '@/components/yoroi/v2/combat/partner/PartnerDetail';
import { useCombatArt } from '@/components/yoroi/v2/combat/images';
import { traduire } from '@/lib/i18n/tr';

type Filter = 'tous' | 'noires' | 'favorables' | 'revoir';

export default function SparringPartnersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ partnerName?: string }>();
  const { trainings, partners, setPartners, loaded } = useCombatData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBelt, setNewBelt] = useState<string | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('tous');
  const autoDone = useRef(false);
  const remindersDone = useRef(false);
  const art = useCombatArt('jjb', 2);

  const stats = useMemo(() => allStats(partners, trainings), [partners, trainings]);

  // Rappels de sparring et ouverture directe depuis un autre ecran
  useEffect(() => {
    if (!loaded) return;
    // Rappels seulement si un objectif en a besoin. Deja autorise : on programme.
    // Sinon, fenetre maison qui explique (jamais apres un refus du systeme, pas avant 7 jours apres Plus tard).
    if (!remindersDone.current && aBesoinDeRappels(partners)) {
      remindersDone.current = true;
      requestNotificationPermissions()
        .then(async (ok) => {
          if (ok) {
            await scheduleSparringReminders(partners as never);
            return;
          }
          await proposerNotifications('sparring', {
            titre: traduire('Un rappel pour tes objectifs'),
            texte: traduire('Un rappel quand un objectif de sparring attend depuis un moment. Jamais de chiffre de santé sur l’écran verrouillé.'),
            onAccepte: () => void scheduleSparringReminders(partners as never),
          });
        })
        .catch(() => {});
    }
    if (params.partnerName && !autoDone.current) {
      autoDone.current = true;
      const found = partners.find((p) => p.name.toLowerCase() === params.partnerName!.toLowerCase());
      if (found) setSelectedId(found.id);
      else {
        setNewName(params.partnerName);
        setAddOpen(true);
      }
    }
  }, [loaded, partners, params.partnerName]);

  const rows = useMemo(
    () =>
      partners.map((p) => {
        const s = effectiveStats(p, stats[p.id]?.live);
        return { p, s };
      }),
    [partners, stats],
  );

  const filtered = rows.filter(({ s }) => {
    if (filter === 'noires') return s.winRateVD != null && s.winRateVD < 40 && s.total >= 3;
    if (filter === 'favorables') return s.winRateVD != null && s.winRateVD >= 60 && s.total >= 3;
    if (filter === 'revoir') {
      const d = daysAgo(s.lastDate);
      return d == null || d > 21;
    }
    return true;
  });

  const totals = rows.reduce((a, { s }) => ({ rounds: a.rounds + s.total, wins: a.wins + s.wins }), { rounds: 0, wins: 0 });
  const nemesis = rows.filter(({ s }) => s.total >= 3 && s.winRateVD != null).sort((a, b) => (a.s.winRateVD ?? 0) - (b.s.winRateVD ?? 0))[0];

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    const p: Partner = { ...newPartner(name, makeId()), belt: newBelt };
    const next = await upsertPartner(p);
    setPartners(next);
    setNewName('');
    setNewBelt(undefined);
    setAddOpen(false);
    setSelectedId(p.id);
  };

  const selected = selectedId ? partners.find((p) => p.id === selectedId) ?? null : null;
  if (selected) {
    return (
      <PartnerDetail
        partner={selected}
        entries={stats[selected.id]?.entries ?? []}
        loaded={loaded}
        onClose={() => setSelectedId(null)}
        onDeleted={async (id) => {
          const next = await deletePartner(id);
          setPartners(next);
          setSelectedId(null);
        }}
      />
    );
  }

  return (
    <>
      <DetailScreen
        title="Partenaires"
        subtitle={traduire("Ton carnet de guerre, un guerrier par carte")}
        right={
          <>
            <IconBtn icon="crown" label="Classement" onPress={() => router.push('/sparring-ranking' as any)} />
            <IconBtn icon="plus" label={traduire("Ajouter un partenaire")} tone="red" onPress={() => { setNewName(''); setAddOpen(true); }} />
          </>
        }
      >
        {partners.length === 0 && loaded ? (
          <Enter i={0}>
            <Glass style={{ padding: 0, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <View style={{ flex: 1, padding: 20, gap: 8 }}>
                  <Ink size={24} weight="black" tight>
                    {traduire("Tes adversaires ont tous un point faible")}</Ink>
                  <Ink size={14} color={P.ink2}>
                    {traduire("Ajoute les gens avec qui tu roules. Note leurs forces, leurs failles, ce qui marche contre eux. Ton bilan se remplit tout seul à chaque séance.")}</Ink>
                </View>
                <Image source={art} style={{ width: 120, height: 170 }} resizeMode="contain" />
              </View>
              <View style={{ padding: 16, paddingTop: 0 }}>
                <BigButton label={traduire("Ajouter mon premier partenaire")} icon="plus" onPress={() => { setNewName(''); setAddOpen(true); }} />
              </View>
            </Glass>
          </Enter>
        ) : null}

        {partners.length > 0 ? (
          <Enter i={0}>
            <Glass style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row' }}>
                <Stat value={String(partners.length)} label={partners.length > 1 ? 'partenaires' : 'partenaire'} />
                <Stat value={String(totals.rounds)} label={traduire("rounds notés")} />
                <Stat value={totals.rounds > 0 ? `${Math.round((totals.wins / totals.rounds) * 100)}\u00A0%` : '0\u00A0%'} label={traduire("de victoires")} color={V} />
              </View>
              {nemesis ? (
                <Press onPress={() => setSelectedId(nemesis.p.id)} accessibilityRole="button" accessibilityLabel={traduire("Ta bête noire : {0}", nemesis.p.name)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: P.accentSoft }}>
                    <Seal name={nemesis.p.name} photoUri={nemesis.p.photoUri} belt={nemesis.p.belt} size={44} />
                    <View style={{ flex: 1 }}>
                      <Ink size={12} weight="extraBold" color={D}>
                        {traduire("Ta bête noire")}</Ink>
                      <Ink size={16} weight="black">
                        {traduire("{0}, {1} % de victoires", nemesis.p.name, nemesis.s.winRateVD)}
                      </Ink>
                    </View>
                    <CIcon name="chevron" size={16} color={D} />
                  </View>
                </Press>
              ) : null}
            </Glass>
          </Enter>
        ) : null}

        {partners.length > 0 ? (
          <Enter i={1}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'Classement', icon: 'crown' as const, route: '/sparring-ranking' },
                { label: traduire('Rangs S à D'), icon: 'flag' as const, route: '/partners-tier-list' },
                { label: 'Matrice', icon: 'grid' as const, route: '/matchup-matrix' },
              ].map((l) => (
                <Press key={l.route} onPress={() => router.push(l.route as any)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={l.label}>
                  <Card style={{ padding: 14, alignItems: 'center', gap: 8 }}>
                    <CIcon name={l.icon} size={22} color={P.accent} />
                    <Ink size={13} weight="extraBold" style={{ textAlign: 'center' }}>
                      {l.label}
                    </Ink>
                  </Card>
                </Press>
              ))}
            </View>
          </Enter>
        ) : null}

        {partners.length > 0 ? (
          <ChipScroll>
            {([
              { k: 'tous', l: 'Tous' },
              { k: 'noires', l: 'Bêtes noires' },
              { k: 'favorables', l: 'Favorables' },
              { k: 'revoir', l: 'À revoir' },
            ] as const).map((f) => (
              <Chip key={f.k} label={f.l} on={filter === f.k} onPress={() => setFilter(f.k)} />
            ))}
          </ChipScroll>
        ) : null}

        {partners.length > 0 && filtered.length === 0 ? (
          <Card>
            <Ink size={14} color={P.ink2}>
              {traduire("Personne dans ce filtre pour l'instant.")}</Ink>
          </Card>
        ) : null}

        {filtered.map(({ p, s }, i) => (
          <Enter key={p.id} i={Math.min(i + 2, 8)}>
            <Press onPress={() => setSelectedId(p.id)} accessibilityRole="button" accessibilityLabel={traduire("Ouvrir la fiche de {0}", p.name)}>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Seal name={p.name} photoUri={p.photoUri} belt={p.belt} size={64} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Ink size={19} weight="black" tight numberOfLines={2}>
                      {p.name}
                    </Ink>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <BeltBar belt={p.belt} width={56} height={9} />
                      {[sportLabel(p.sport), p.weight].filter(Boolean).map((t) => (
                        <Ink key={t} size={12} weight="bold" color={P.muted}>
                          {t}
                        </Ink>
                      ))}
                    </View>
                    <Ink size={12} weight="bold" color={(daysAgo(s.lastDate) ?? 0) > 21 ? '#A8832F' : P.ink2}>
                      {s.total > 0 ? `${plural(s.total, 'round')}${s.lastDate ? `, ${agoText(s.lastDate)}` : ''}` : traduire('Pas encore de round')}
                    </Ink>
                  </View>
                  {s.total > 0 ? (
                    <View style={{ alignItems: 'center' }}>
                      <Ink size={26} weight="black" tight color={(s.winRateVD ?? 0) >= 50 ? V : D}>
                        {`${s.winRateVD ?? 0}\u00A0%`}
                      </Ink>
                      <Ink size={11} weight="bold" color={P.ink2}>
                        victoires
                      </Ink>
                    </View>
                  ) : null}
                </View>
                {s.total > 0 ? <RecordBars wins={s.wins} losses={s.losses} draws={s.draws} compact /> : null}
                {p.strengths.length + p.weaknesses.length + p.whatWorks.length + p.notes.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { n: p.strengths.length, l: 'forces' },
                      { n: p.weaknesses.length, l: 'failles' },
                      { n: p.whatWorks.length, l: 'tactiques' },
                      { n: p.notes.length, l: 'notes' },
                    ]
                      .filter((x) => x.n > 0)
                      .map((x) => (
                        <View key={x.l} style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: P.paper }}>
                          <Ink size={12} weight="bold" color={P.ink2}>
                            {`${x.n} ${x.l}`}
                          </Ink>
                        </View>
                      ))}
                  </View>
                ) : null}
              </Card>
            </Press>
          </Enter>
        ))}

        {partners.length > 0 ? <Section title={traduire("Un nouveau partenaire ?")} sub={traduire("Ajoute-le, son bilan se calcule à partir de tes rounds")} action={traduire("Ajouter")} onAction={() => { setNewName(''); setAddOpen(true); }} /> : null}

        <FormSheet visible={addOpen} onClose={() => setAddOpen(false)} title={traduire("Nouveau partenaire")} sub={traduire("Écris le même nom que dans tes rounds pour relier son bilan.")}>
          <Field value={newName} onChangeText={setNewName} autoFocus placeholder={traduire("Prénom ou surnom")} returnKeyType="done" onSubmitEditing={add} />
          <Ink size={13} weight="bold" color={P.ink2}>
            {traduire("Sa ceinture")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BELTS.map((b) => {
              const on = newBelt === b.key;
              return (
                <Press key={b.key} onPress={() => setNewBelt(on ? undefined : b.key)} accessibilityRole="button" accessibilityLabel={traduire("Ceinture {0}", b.label)} accessibilityState={{ selected: on }}>
                  <View style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? P.ink : P.white, borderWidth: 1, borderColor: on ? P.ink : P.line2 }}>
                    <View style={{ width: 22, height: 9, borderRadius: 3, backgroundColor: b.color, borderWidth: 1, borderColor: b.edge }} />
                    <Ink size={14} weight="bold" color={on ? P.white : P.ink2}>
                      {b.label}
                    </Ink>
                  </View>
                </Press>
              );
            })}
          </View>
          <BigButton label={traduire("Ajouter")} icon="plus" onPress={add} disabled={!newName.trim()} />
        </FormSheet>
      </DetailScreen>
    </>
  );
}
