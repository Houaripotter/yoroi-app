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
 * 31 octobre 2026 (bibliotheque des cartes, Houari : « je veux plein de cartes qu'ils peuvent partager ») :
 * l'ecran devient une bibliotheque rangee par rubriques (dernieres seances, records, objectifs, ma semaine,
 * mon mois, mon annee, compteurs, pesees et avant apres), chaque rubrique en vignettes qui sont les vraies cartes.
 * Un sommaire en pastilles en haut ; un toucher ouvre l'atelier sur la carte. Lecture : lib/v2/cartes/bibliotheque.ts,
 * dessin : components/yoroi/v2/cartes/Bibliotheque.tsx. ?demo=1 : la bibliotheque pleine de demonstration.
 * 3 novembre 2026 (photos d'exemple) : sans tes deux photos de corps, la rubrique montre un avant apres d'EXEMPLE
 * (photos et chiffre d'exemple, pastille « Exemple ») ; le toucher ouvre la carte Avant apres, qui explique quoi ajouter.
 * 3 novembre 2026 (refonte, Houari : « c'est moche ») : le langage des onglets Seances et Progres (cartes blanches douces,
 * carres pastel et stickers), l'avant apres en tete et en grand, puis records, compteurs et course ; semaine et mois en
 * bas. Une rubrique vide montre des cartes d'EXEMPLE marquees (lib/v2/cartes/exemplesRubriques.ts) ; leur toucher
 * n'ouvre jamais le studio sur l'exemple (lienExemple), rien d'exemple ne part dans un export.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Interrupteur } from '@/components/yoroi/v2/reglages/kit';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { CarteApercu, HAUTEURS, MODELES, modeleDispo } from '@/components/yoroi/v2/cartes/CarteRendu';
import { FeuilleCarte, lienEditeur } from '@/components/yoroi/v2/cartes/FeuilleCarte';
import { useCarte } from '@/components/yoroi/v2/cartes/useCarte';
import { Bibliotheque, rubriquesDe } from '@/components/yoroi/v2/cartes/Bibliotheque';
import { BIBLIOTHEQUE_VIDE, chargerBibliotheque, type Bibliotheque as DonneesBiblio } from '@/lib/v2/cartes/bibliotheque';
import { chargerPhotosCarte } from '@/lib/v2/cartes/chargerAvantApres';
import { carteAvantApres } from '@/lib/v2/cartes/avantApres';
import { chiffresParDefaut } from '@/lib/v2/cartes/chiffres';
import { bibliothequeDemo, DEMO_ANNEE_2025, DEMO_EXPLOITS, DEMO_MOIS_SEPT, DEMO_PESEE, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU, DEMO_SEMAINE, demoAvantApres } from '@/lib/v2/cartes/demo';
import { lireJournal, setPropositionsAuto } from '@/lib/v2/cartes/store';
import type { CarteData, FondId, FormatId, ModeleId, OptionsCarte } from '@/lib/v2/cartes/types';
import { traduire } from '@/lib/i18n/tr';
import { avantApresExemple } from '@/components/yoroi/v2/cartes/exemples';
import { avantApresOuExemple } from '@/lib/v2/cartes/exemples';
import type { ExempleId } from '@/lib/v2/cartes/exemples';
import { lienExemple } from '@/lib/v2/cartes/exemplesRubriques';
import { CarreSticker, useCarteA } from '@/components/yoroi/v2/seances/kitA';

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
          <Ink size={13} weight="black">{traduire(l.nom)}</Ink>
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
        {variantes.map((v) => <Ink key={v.nom} size={12} weight="black" style={{ width: col }}>{traduire(v.nom)}</Ink>)}
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
          <Ink size={13} weight="black">{traduire(m.nom)}</Ink>
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
  const [biblio, setBiblio] = useState<DonneesBiblio | null>(null);
  const [auto, setAuto] = useState(true);
  // ton avant apres : seulement avec au moins 2 photos de corps
  const [avantApres, setAvantApres] = useState<CarteData | null>(null);
  const exempleAA = useMemo(() => avantApresExemple(), []);
  // controle visuel de la feuille du bas (demo seulement)
  const [feuille, setFeuille] = useState(demo && p.feuille === '1');
  const defilement = useRef<ScrollView>(null);
  // le style memorise (couleur, masquage du poids, modele des seances) et le personnage pour les vignettes
  const k = useCarte(null);
  const carteA = useCarteA();

  useEffect(() => {
    let alive = true;
    lireJournal().then((j) => alive && setAuto(j.auto)).catch(() => {});
    if (demo) setAvantApres(p.photo ? demoAvantApres([p.photo, p.photo2]) : null);
    else chargerPhotosCarte().then((l) => alive && setAvantApres(carteAvantApres(l))).catch(() => {});
    if (demo) setBiblio(bibliothequeDemo());
    else chargerBibliotheque().then((b) => alive && setBiblio(b)).catch(() => alive && setBiblio(BIBLIOTHEQUE_VIDE));
    return () => {
      alive = false;
    };
  }, [demo]);

  const ouvrir = (d: CarteData, ex?: ExempleId | null) => {
    // la photo d'exemple de la vignette : le studio montre la meme
    const qx = ex ? `&exemple=${ex}` : '';
    // une carte d'exemple : jamais le studio sur l'exemple. L'avant apres dit d'ajouter tes deux photos, les autres
    // ouvrent la carte du moment sans donnees, qui renvoie vers tes vraies cartes
    if (d.exemple) router.push(lienExemple(d) as never);
    else if (demo && d.moment === 'avant_apres') {
      const q = [p.photo ? `&photo=${encodeURIComponent(p.photo)}` : '', p.photo2 ? `&photo2=${encodeURIComponent(p.photo2)}` : ''].join('');
      router.push(`/carte?demo=1&moment=avant_apres${q}` as never);
    } else if (demo) {
      const sport = d === DEMO_SEANCE_COMBAT || d === DEMO_MOIS_SEPT || d === DEMO_ANNEE_2025 ? 'combat' : d === DEMO_SEANCE_COURSE ? 'course' : '';
      router.push(`/carte?demo=1&moment=${d.moment}${sport ? `&sport=${sport}` : ''}${d.exploit ? `&type=${d.exploit.type}&cle=${encodeURIComponent(d.cle)}` : ''}${qx}` as never);
    } else router.push(`${lienEditeur(d)}${qx}` as never);
  };

  const planche = demo && ['1', '2', '3', '4'].includes(p.planche ?? '');
  // 3 novembre 2026 : la marge des onglets Seances et Progres (16)
  const pad = 16;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView ref={defilement} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: pad, gap: 10 }} showsVerticalScrollIndicator={false}>
        <EnTete
          titre={traduire("Mes cartes")}
          sousTitre={traduire("Tes séances, tes records, tes objectifs, ton mois et ton année, prêts à poster.")}
          onRetour={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))}
          style={{ marginHorizontal: -pad, marginTop: -8 }}
        />

        {planche && p.planche === '4' ? (
          <PlancheAvantApres photos={[p.photo, p.photo2]} />
        ) : planche && p.planche === '1' ? (
          <Planche />
        ) : planche && p.planche === '3' ? (
          <PlancheTypes format={(p.format as FormatId) || 'story'} fond={(p.fond as FondId) || 'scene'} clair={p.clair === '1'} sans={p.sans === '1'} photo={p.photo} sansPersonne={p.personne === '0'} />
        ) : planche && p.planche === '2' ? (
          <PlancheExploits photo={p.photo} de={Number(p.de ?? 0)} a={Number(p.a ?? 99)} format={(p.format as FormatId) || 'story'} />
        ) : !biblio ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}><ChargementPetit /></View>
        ) : (
          <View style={{ marginTop: 6 }}>
            <Bibliotheque
              rubriques={rubriquesDe(biblio, avantApresOuExemple(avantApres, exempleAA))}
              base={k.options}
              visuelsPour={k.visuelsPour}
              onOuvrir={ouvrir}
              defiler={(y) => defilement.current?.scrollTo({ y, animated: true })}
              apres={
                <Pressable
                  onPress={() => {
                    const n = !auto;
                    setAuto(n);
                    setPropositionsAuto(n).catch(() => {});
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: auto }}
                  style={[carteA, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }]}
                >
                  <CarreSticker nom="rappels" teinte="bleu" taille={46} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="extraBold">{traduire("Me proposer une carte")}</Ink>
                    <Ink size={13} color={c.textSecondary}>{traduire("Après une séance, un record, un palier, une pesée qui progresse, le dimanche soir pour ta semaine et en début de mois pour ton bilan. Une seule fois par moment.")}</Ink>
                  </View>
                  <Interrupteur on={auto} />
                </Pressable>
              }
            />
          </View>
        )}
      </ScrollView>
      {demo && feuille ? <FeuilleCarte data={DEMO_EXPLOITS[3]} autres={[DEMO_EXPLOITS[4], DEMO_SEANCE_COMBAT, DEMO_EXPLOITS[10], DEMO_EXPLOITS[5]]} visible onClose={() => setFeuille(false)} /> : null}
    </View>
  );
}
