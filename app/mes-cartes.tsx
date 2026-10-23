/**
 * Mes cartes : toutes tes cartes a partager, a tout moment. Tes dernieres seances, tes pesees qui montrent
 * un progres et tes semaines, plus le reglage des propositions automatiques.
 * Et tes exploits : records, techniques, paliers, objectifs, compteurs, bilans du mois et de l'annee, poids.
 * ?demo=1 : donnees de demonstration ; ?demo=1&planche=1 : planche de tous les modeles et formats (controle visuel) ;
 * ?demo=1&planche=2 : planche des exploits (scene et personnage, photo, uni, que mes donnees), &photo=<url> pour la photo,
 * &de=<n>&a=<n> pour une partie des exploits, &format=post|carre.
 * ?demo=1&planche=3 : chaque modele avec chaque type de carte (17 octobre), &format=, &fond=, &clair=1, &sans=1 (sans personnage),
 * &personne=0 (interrupteur de la personne eteint). Une case vide : le modele n'est pas propose pour ce type de carte.
 * 17 octobre 2026 : section « Ton avant après », seulement avec au moins 2 photos de corps.
 * ?demo=1&planche=4 : la carte Avant apres en Story, Publication et Carre, clair et sombre, net, flou et masque,
 * avec &photo=<url>&photo2=<url> pour les photos de test.
 */
import React, { useEffect, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { Interrupteur } from '@/components/yoroi/v2/reglages/kit';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { CarteApercu, HAUTEURS, MODELES, modeleDispo } from '@/components/yoroi/v2/cartes/CarteRendu';
import { FeuilleCarte, lienEditeur } from '@/components/yoroi/v2/cartes/FeuilleCarte';
import { useCarte } from '@/components/yoroi/v2/cartes/useCarte';
import { chargerListe } from '@/lib/v2/cartes/charger';
import { chargerPhotosCarte } from '@/lib/v2/cartes/chargerAvantApres';
import { carteAvantApres, dateAvantApres, tempsEcoule } from '@/lib/v2/cartes/avantApres';
import type { ListeCartes } from '@/lib/v2/cartes/charger';
import { chiffresAffiches, chiffresParDefaut } from '@/lib/v2/cartes/chiffres';
import { DEMO_EXPLOITS, DEMO_PESEE, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU, DEMO_SEMAINE, demoAvantApres } from '@/lib/v2/cartes/demo';
import { lireJournal, setPropositionsAuto } from '@/lib/v2/cartes/store';
import type { CarteData, FondId, FormatId, ModeleId, OptionsCarte } from '@/lib/v2/cartes/types';
import { traduire } from '@/lib/i18n/tr';

function ligne(d: CarteData): string {
  return chiffresAffiches(d, chiffresParDefaut(d), 'aucun')
    .slice(0, 3)
    .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ['rounds', 'series', 'seances'].includes(s.key) ? ` ${s.label.split(',')[0]}` : ''}`)
    .join(', ');
}

function ligneExploit(d: CarteData): string {
  const e = d.exploit!;
  if (e.liste?.length) return e.liste.join(', ');
  return `${e.hero.value}${e.hero.unit ? `${e.hero.unit === 'e' || e.hero.unit === 're' ? '' : ' '}${e.hero.unit}` : ''}, ${e.accroche}`;
}

function ligneAvantApres(d: CarteData): string {
  const x = d.avantApres!;
  return traduire("{0} et {1}, {2}", dateAvantApres(x.avant.date), dateAvantApres(x.apres.date), tempsEcoule(d));
}

function PlancheAvantApres({ photos }: { photos: (string | undefined)[] }) {
  const { width } = useWindowDimensions();
  const d = demoAvantApres(photos);
  // la deuxieme photo n'a pas de pesee proche : aucun poids sur la carte
  const sansPoids = demoAvantApres(photos, 'demo1', 'demo2');
  const formats: FormatId[] = ['story', 'post', 'carre'];
  const col = Math.floor((width - 16 * 2 - 8 * 2) / 3);
  const base: OptionsCarte = { modele: 'affiche', format: 'story', fond: 'uni', sombre: false, personnage: false, masque: 'aucun', chiffres: [], slogan: 0 };
  const lignes: { nom: string; d: CarteData; o: Partial<OptionsCarte> }[] = [
    { nom: 'Clair, net', d, o: { sombre: false } },
    { nom: 'Sombre, net', d, o: { sombre: true } },
    { nom: 'Clair, flou', d, o: { sombre: false, flou: true } },
    { nom: traduire('Sombre, écart seulement'), d, o: { sombre: true, masque: 'ecart' } },
    { nom: 'Clair, en %', d, o: { sombre: false, masque: 'pourcentage' } },
    { nom: traduire('Sans pesée proche'), d: sansPoids, o: { sombre: true } },
  ];
  return (
    <View style={{ gap: 14 }}>
      {lignes.map((l) => (
        <View key={l.nom} style={{ gap: 4 }}>
          <Ink size={13} weight="black">{l.nom}</Ink>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            {formats.map((f) => <CarteApercu key={f} largeur={col} data={l.d} options={{ ...base, ...l.o, format: f }} visuels={{}} />)}
          </View>
        </View>
      ))}
    </View>
  );
}

function Planche() {
  const { width } = useWindowDimensions();
  const k = useCarte(DEMO_SEANCE_MUSCU, { modele: 'affiche', format: 'story', fond: 'scene', sombre: true, personnage: true, masque: 'aucun', slogan: 0 });
  const formats: FormatId[] = ['story', 'post', 'carre'];
  const jeux: { d: CarteData; fond: FondId; sombre: boolean; perso: boolean }[] = [
    { d: DEMO_SEANCE_MUSCU, fond: 'salle', sombre: true, perso: true },
    { d: DEMO_SEANCE_COURSE, fond: 'plage', sombre: true, perso: false },
    { d: DEMO_SEMAINE, fond: 'ville', sombre: false, perso: true },
    { d: DEMO_SEANCE_COMBAT, fond: 'noir', sombre: true, perso: true },
    { d: DEMO_PESEE, fond: 'brume', sombre: false, perso: true },
    { d: DEMO_SEMAINE, fond: 'buildings', sombre: true, perso: false },
    { d: DEMO_PESEE, fond: 'scene', sombre: true, perso: true },
  ];
  const col = Math.floor((width - 16 * 2 - 8 * 2) / 3);
  return (
    <View style={{ gap: 18 }}>
      {MODELES.map((m, i) => {
        const j = jeux[i % jeux.length];
        return (
          <View key={m.id} style={{ gap: 6 }}>
            <Ink size={14} weight="black">{`${m.nom}, ${j.d.titre}`}</Ink>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              {formats.map((f) => {
                const o: OptionsCarte = { modele: m.id as ModeleId, format: f, fond: j.fond, sombre: j.sombre, personnage: j.perso, masque: i === 6 ? 'ecart' : 'aucun', chiffres: j.d.moment === 'semaine' ? ['seances', 'temps_total', 'poids_semaine', 'serie_semaines'] : chiffresParDefaut(j.d), slogan: i % 3 };
                return <CarteApercu key={f} largeur={col} data={j.d} options={o} visuels={k.visuelsPour(j.d)} />;
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PlancheExploits({ photo, de, a, format }: { photo?: string; de: number; a: number; format: FormatId }) {
  const { width } = useWindowDimensions();
  const k = useCarte(DEMO_EXPLOITS[0], { modele: 'affiche', format: 'story', fond: 'scene', sombre: true, personnage: true, masque: 'aucun', slogan: 0 });
  const col = Math.floor((width - 16 * 2 - 8 * 4) / 5);
  const variantes: { nom: string; o: Partial<OptionsCarte> }[] = [
    { nom: traduire('Scène, personnage'), o: { fond: 'scene', personnage: true, sombre: true } },
    { nom: traduire('Ma photo'), o: { fond: 'photo', personnage: false, sombre: true } },
    { nom: 'Uni, personnage', o: { fond: 'uni', personnage: true, sombre: true } },
    { nom: traduire('Uni clair, sans'), o: { fond: 'uni', personnage: false, sombre: false } },
    { nom: traduire('Que mes données'), o: { epure: true, sombre: true } },
  ];
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {variantes.map((v) => <Ink key={v.nom} size={12} weight="black" style={{ width: col }}>{v.nom}</Ink>)}
      </View>
      {DEMO_EXPLOITS.slice(de, a).map((d) => (
        <View key={d.cle} style={{ gap: 4 }}>
          <Ink size={12} weight="bold" color="#6B6E78">{d.exploit?.type}</Ink>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            {variantes.map((v) => {
              const o: OptionsCarte = { modele: 'affiche', format, fond: 'scene', sombre: true, personnage: true, masque: 'aucun', chiffres: [], slogan: 0, ...v.o };
              return <CarteApercu key={v.nom} largeur={col} data={d} options={o} visuels={{ ...k.visuelsPour(d), photo: photo ?? null }} />;
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function PlancheTypes({ format, fond, clair, sans, photo, sansPersonne }: { format: FormatId; fond: FondId; clair: boolean; sans: boolean; photo?: string; sansPersonne?: boolean }) {
  const { width } = useWindowDimensions();
  const k = useCarte(DEMO_SEANCE_MUSCU, { modele: 'affiche', format: 'story', fond: 'scene', sombre: true, personnage: true, masque: 'aucun', slogan: 0 });
  const types = [DEMO_SEANCE_MUSCU, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_PESEE, DEMO_SEMAINE];
  const col = Math.floor((width - 16 * 2 - 8 * 4) / 5);
  return (
    <View style={{ gap: 14 }}>
      {MODELES.map((m) => (
        <View key={m.id} style={{ gap: 4 }}>
          <Ink size={13} weight="black">{m.nom}</Ink>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            {types.map((d) => {
              const o: OptionsCarte = { modele: m.id as ModeleId, format, fond, sombre: !clair, personnage: !sans, masque: 'aucun', chiffres: d.moment === 'semaine' ? ['seances', 'temps_total', 'poids_semaine'] : chiffresParDefaut(d), slogan: 0, sansPersonne: sansPersonne };
              if (!modeleDispo(d, m.id)) return <View key={d.cle} style={{ width: col, height: (col * HAUTEURS[format]) / 360, borderRadius: 10, borderWidth: 1, borderColor: '#C9C6BD', borderStyle: 'dashed' }} />;
              return <CarteApercu key={d.cle} largeur={col} data={d} options={o} visuels={{ ...k.visuelsPour(d), photo: photo ?? null }} />;
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MesCartes() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ demo?: string; planche?: string; feuille?: string; photo?: string; photo2?: string; de?: string; a?: string; format?: string; fond?: string; clair?: string; sans?: string; personne?: string }>();
  const demo = p.demo === '1';
  const [liste, setListe] = useState<ListeCartes | null>(null);
  const [auto, setAuto] = useState(true);
  // ton avant apres : seulement avec au moins 2 photos de corps
  const [avantApres, setAvantApres] = useState<CarteData | null>(null);
  // controle visuel de la feuille du bas (demo seulement)
  const [feuille, setFeuille] = useState(demo && p.feuille === '1');

  useEffect(() => {
    let alive = true;
    lireJournal().then((j) => alive && setAuto(j.auto)).catch(() => {});
    if (demo) setAvantApres(demoAvantApres([p.photo, p.photo2]));
    else chargerPhotosCarte().then((l) => alive && setAvantApres(carteAvantApres(l))).catch(() => {});
    if (demo) setListe({ seances: [DEMO_SEANCE_MUSCU, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE], pesees: [DEMO_PESEE], semaines: [DEMO_SEMAINE], exploits: DEMO_EXPLOITS.slice(0, 8) });
    else chargerListe().then((l) => alive && setListe(l)).catch(() => alive && setListe({ seances: [], pesees: [], semaines: [], exploits: [] }));
    return () => {
      alive = false;
    };
  }, [demo]);

  const ouvrir = (d: CarteData) => {
    if (demo && d.moment === 'avant_apres') {
      const q = [p.photo ? `&photo=${encodeURIComponent(p.photo)}` : '', p.photo2 ? `&photo2=${encodeURIComponent(p.photo2)}` : ''].join('');
      router.push(`/carte?demo=1&moment=avant_apres${q}` as never);
    } else if (demo) {
      const sport = d === DEMO_SEANCE_COMBAT ? 'combat' : d === DEMO_SEANCE_COURSE ? 'course' : '';
      router.push(`/carte?demo=1&moment=${d.moment}${sport ? `&sport=${sport}` : ''}${d.exploit ? `&type=${d.exploit.type}` : ''}` as never);
    } else router.push(lienEditeur(d) as never);
  };

  const Section = ({ titre, items, videTexte }: { titre: string; items: CarteData[]; videTexte: string }) => (
    <View style={{ gap: 8 }}>
      <Ink size={17} weight="black" tight style={{ marginTop: 8 }}>{titre}</Ink>
      {items.length === 0 ? (
        <Ink size={14} color={c.textSecondary}>{videTexte}</Ink>
      ) : (
        <View style={{ borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
          {items.map((d, i) => (
            <Pressable key={d.cle} onPress={() => ouvrir(d)} accessibilityRole="button" accessibilityLabel={`Carte ${d.titre}, ${d.sousTitre}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderColor: c.divider, backgroundColor: pressed ? c.fillSoft : 'transparent' })}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {d.exploit?.record ? <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: c.record, transform: [{ rotate: '45deg' }] }} /> : null}
                  <Ink size={15} weight="extraBold" numberOfLines={1} style={{ flexShrink: 1 }}>{d.titre}</Ink>
                </View>
                <Ink size={13} color={c.textSecondary} numberOfLines={1}>{d.avantApres ? ligneAvantApres(d) : [d.sousTitre, d.exploit ? ligneExploit(d) : ligne(d)].filter(Boolean).join(', ')}</Ink>
              </View>
              <Icon name="share" size={18} color={c.accent} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: p.planche === '1' || p.planche === '3' || p.planche === '4' ? 16 : 22, gap: 10 }} showsVerticalScrollIndicator={false}>
        <EnTete
          titre={traduire("Mes cartes")}
          sousTitre={traduire("Tes exploits, tes séances, tes pesées et tes semaines, prêts à poster.")}
          onRetour={() => (router.canGoBack() ? router.back() : router.replace('/' as never))}
          style={{ marginHorizontal: p.planche === '1' || p.planche === '3' || p.planche === '4' ? -16 : -22, marginTop: -8 }}
        />

        {demo && p.planche === '4' ? (
          <PlancheAvantApres photos={[p.photo, p.photo2]} />
        ) : demo && p.planche === '1' ? (
          <Planche />
        ) : demo && p.planche === '3' ? (
          <PlancheTypes format={(p.format as FormatId) || 'story'} fond={(p.fond as FondId) || 'scene'} clair={p.clair === '1'} sans={p.sans === '1'} photo={p.photo} sansPersonne={p.personne === '0'} />
        ) : demo && p.planche === '2' ? (
          <PlancheExploits photo={p.photo} de={Number(p.de ?? 0)} a={Number(p.a ?? 99)} format={(p.format as FormatId) || 'story'} />
        ) : (
          <>
            <Pressable
              onPress={() => {
                const n = !auto;
                setAuto(n);
                setPropositionsAuto(n).catch(() => {});
              }}
              accessibilityRole="switch"
              accessibilityState={{ checked: auto }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, marginTop: 6 }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={15} weight="extraBold">{traduire("Me proposer une carte")}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire("Après une séance, un record, un palier, une pesée qui progresse, le dimanche soir pour ta semaine et en début de mois pour ton bilan. Une seule fois par moment.")}</Ink>
              </View>
              <Interrupteur on={auto} />
            </Pressable>

            {!liste ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}><ChargementPetit /></View>
            ) : (
              <>
                <Section titre={traduire("Tes exploits")} items={(liste.exploits ?? []).slice(0, 30)} videTexte={traduire("Tes records, tes paliers, tes objectifs tenus et tes bilans arrivent ici.")} />
                {avantApres ? <Section titre={traduire("Ton avant après")} items={[avantApres]} videTexte="" /> : null}
                <Section titre={traduire("Tes séances")} items={liste.seances} videTexte={traduire("Enregistre une séance, sa carte arrive ici.")} />
                <Section titre={traduire("Tes pesées en progrès")} items={liste.pesees} videTexte={traduire("Quand une pesée te rapproche de ton objectif, sa carte arrive ici.")} />
                <Section titre={traduire("Tes semaines")} items={liste.semaines} videTexte={traduire("Le bilan de chaque semaine avec au moins une séance arrive ici.")} />
              </>
            )}
          </>
        )}
      </ScrollView>
      {demo && feuille ? <FeuilleCarte data={DEMO_EXPLOITS[3]} autres={[DEMO_EXPLOITS[4], DEMO_SEANCE_COMBAT, DEMO_EXPLOITS[10], DEMO_EXPLOITS[5]]} visible onClose={() => setFeuille(false)} /> : null}
    </View>
  );
}
