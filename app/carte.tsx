/**
 * Atelier d'une carte a partager : apercu en haut, puis modele, format, fond, style, personnage,
 * chiffres affiches (2 a 4) et masquage du poids. Enregistrer et Partager en bas.
 * 16 octobre 2026 : plus de choix du texte du bas (toujours YOROI : Musculation, MMA, Boxe), formats expliques
 * par usage (Story, Publication, Carre avec les apps), apercu plus grand, fonds en grille, sections avec icones.
 * 17 octobre 2026 : l'apercu reste en haut, toujours visible ; il se reduit quand tu fais defiler les options,
 * rangees en onglets (Format, Modele, Fond, Chiffres, Plus).
 * 17 octobre 2026 (cartes v4) : plus de battement ni de liseré ; un fondu enchaine de 180 ms entre l'ancien et le nouvel
 * apercu (rien si le mouvement est reduit). Interrupteur « Mon personnage sur la carte » (ou « Ma photo ») des le
 * premier onglet. Modeles en vignettes reelles avec un nom et une ligne d'explication.
 * 17 octobre 2026 (cartes v5) : onglet Fond en premier et ouvert a l'arrivee (Fond, Format, Modele, Chiffres, Plus),
 * avec « Ta photo » en tete de la grille puis Ma scene ; l'interrupteur personnage / photo passe en tete de l'onglet Fond.
 * 31 octobre 2026 (cartes en 6 modeles) : l'onglet Fond ne propose plus que « Ta photo » (galerie ou appareil photo)
 * ou « Couleur » (8 couleurs franches) ; plus de scenes, de decors ni de personnage. Clair ou Sombre seulement
 * pour le papier du Ticket. L'ancien ecran est archive dans _archive_ancien_design_2026-10-09/cartes_10_modeles_2026-10-31.
 * 31 octobre 2026 (cartes de partage v2) : les 10 directions remplacent les 6 modeles. L'onglet Modele (ouvert a l'arrivee)
 * est un carrousel horizontal d'apercus en direct, dans l'ordre 08, 03, 02, 01, 04, 05, 09, 06, 07, 10 ; la direction
 * choisie revient la fois suivante. Autocollants (01, 02, 03) : sortie Story (sur ta photo ou ta couleur) ou Autocollant
 * (PNG transparent, a copier ou enregistrer). Bouton « Partager en story » en tete de la barre du bas.
 * Parametres : moment=seance&id=, moment=pesee&date= (ou id=), moment=semaine&debut=.
 * 31 octobre 2026 (bibliotheque des cartes) : moment=mois&ref=AAAA-MM, moment=annee&ref=AAAA ;
 * objectif ou compteur du moment : moment=exploit&src=objectif|compteur&cle=... (en demo : &cle= suffit).
 * Exploit : moment=exploit&src=seance|pesee|mois|annee&ref=...&cle=... (record, palier, compteur, bilan...).
 * ?demo=1 : donnees de demonstration (copie web), avec &sport=combat|course pour une seance, &type= pour un exploit.
 * 17 octobre 2026 : carte Avant apres, moment=avant_apres&avant=<id>&apres=<id> (&flou=0 pour ne pas flouter) ;
 * onglets Format, Photos (avant, apres, flou) et Plus ; une phrase de prudence avant le premier partage.
 * En demo : &photo=<url>&photo2=<url>... pour les photos de test.
 * 31 octobre 2026 (cartes ou l'on voit ta tete) : sur l'apercu, tu glisses le bloc des chiffres au doigt et tu le
 * pinces pour l'agrandir ou le reduire, comme dans une story. « Replacer » le remet a sa place. Le placement est
 * garde par modele et par format le temps de l'edition seulement ; la capture (enregistrer, partager) le garde.
 * Pas pour la carte holographique ni la Retrospective (voir lib/v2/cartes/zoneVisage.ts).
 * 2 novembre 2026 (cartes v10) : avec l'interrupteur du Studio createur sur « nouveau », les cartes que le nouveau moteur
 * connait s'ouvrent dans son studio (components/yoroi/v2/cartes/moteur/StudioMoteur.tsx). Ancien moteur par defaut.
 * 2 novembre 2026 (derniere page) : l'app fermee completement se rouvre sur cette carte (lib/v2/nav/RouvrirDernierePage.tsx).
 * La carte donne son onglet et ses chiffres choisis (&onglet=, &chiffres=) ; son style revient deja par lib/v2/cartes/store.ts.
 * La photo n'est jamais gardee (ses copies sont effacees a la sortie, lib/v2/cartes/tmp.ts) : &avaitPhoto=1 propose
 * seulement « Ajouter ta photo ».
 * 2 novembre 2026 (studio unique), Houari : « il y a deux studios, je n'en veux qu'un ». Cet ecran ne montre plus que le
 * studio du nouveau moteur (components/yoroi/v2/cartes/moteur/StudioMoteur.tsx), pour toutes les cartes et pour tout le
 * monde, sans interrupteur. L'ancien atelier (onglets Modele, Fond, Format, Chiffres) est archive tel quel dans
 * _archive_ancien_design_2026-10-09/ancien_partage_2026-11-02/app/carte_ancien_atelier.tsx.txt.
 * Avant apres garde le choix de tes deux photos, le flou et la phrase de prudence, dans le meme studio.
 * La reouverture (lib/v2/nav/RouvrirDernierePage.tsx) reste : &avaitPhoto=1 propose « Ajouter ta photo ».
 * 3 novembre 2026 (photos d'exemple) : &exemple= (muscu_homme, muscu_femme...) donne la photo d'exemple de la vignette
 * touchee dans Mes cartes, pour que le studio montre la meme. Jamais dans un export.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton, type IconName } from '@/components/yoroi/v2/espace/ui';
import { Interrupteur } from '@/components/yoroi/v2/reglages/kit';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { nouveauMoteurPour } from '@/components/yoroi/v2/cartes/CarteRendu';
import { StudioMoteur } from '@/components/yoroi/v2/cartes/moteur/StudioMoteur';
import { useCarte } from '@/components/yoroi/v2/cartes/useCarte';
import { chargerExploit, chargerPesee, chargerSeance, chargerSemaine } from '@/lib/v2/cartes/charger';
import { chargerDuMoment, chargerPeriode } from '@/lib/v2/cartes/bibliotheque';
import { demoExploit, demoPhotosAvantApres, demoPour } from '@/lib/v2/cartes/demo';
import { carteAvantApres } from '@/lib/v2/cartes/avantApres';
import { chargerPhotosCarte } from '@/lib/v2/cartes/chargerAvantApres';
import { FLOU } from '@/components/yoroi/v2/cartes/AvantApresVue';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { dateCourte } from '@/lib/v2/photos/outils';
import type { CarteData, PhotoCarte } from '@/lib/v2/cartes/types';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { noterDetailsPage } from '@/lib/v2/nav/RouvrirDernierePage';

const ENTETE = 52;
/** La phrase de prudence de la carte Avant apres n'est montree qu'une fois */
const PRUDENCE_KEY = '@yoroi_cartes_avant_apres_prudence_vue';

type Couleurs = ReturnType<typeof useYoroiTheme>['theme']['colors'];

function LigneInterrupteur({ c, icon, titre, sous, on, onPress }: { c: Couleurs; icon: IconName; titre: string; sous?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={titre} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderRadius: 18, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.accent : c.border, paddingHorizontal: 14, paddingVertical: 10 })}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={17} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={15} weight="extraBold">{titre}</Ink>
        {sous ? <Ink size={13} color={c.textSecondary}>{sous}</Ink> : null}
      </View>
      <Interrupteur on={on} />
    </Pressable>
  );
}

/** Carte Avant apres : une rangee de tes photos, la choisie entouree ; floutees si le flou est mis */
function RangeePhotos({ c, titre, liste, choisie, flou, onChoisir }: { c: Couleurs; titre: string; liste: PhotoCarte[]; choisie: string; flou: boolean; onChoisir: (id: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Ink size={15} weight="extraBold">{titre}</Ink>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {liste.map((ph) => {
          const on = ph.id === choisie;
          return (
            <Pressable key={ph.id} onPress={() => onChoisir(ph.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={traduire("{0}, photo du {1}", titre, dateCourte(ph.date))} style={{ alignItems: 'center', gap: 4 }}>
              <View style={{ width: 66, height: 88, borderRadius: 13, padding: on ? 2 : 0, borderWidth: on ? 2.5 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.surface }}>
                <View style={{ flex: 1, borderRadius: on ? 9 : 12, overflow: 'hidden', backgroundColor: c.fillSubtle }}>
                  {ph.uri ? <Image source={{ uri: ph.uri }} blurRadius={flou ? FLOU : 0} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                </View>
              </View>
              <Ink size={11} weight={on ? 'extraBold' : 'bold'} color={on ? c.accent : c.textSecondary} numberOfLines={1}>{dateCourte(ph.date)}</Ink>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * 2 novembre 2026 : la carte rouverte apres une fermeture de l'app revient sans ta photo (jamais gardee).
 * Un toucher la rajoute ; la croix ferme le bandeau.
 */
function BandeauPhoto({ c, haut, onAjouter, onFermer }: { c: Couleurs; haut: number; onAjouter: () => void; onFermer: () => void }) {
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, top: haut, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
      <Icon name="image" size={20} color={c.ink} />
      <Ink size={13} color={c.textSecondary} style={{ flex: 1 }}>{traduire('Ta photo n’est pas gardée quand tu quittes la carte.')}</Ink>
      <Pressable onPress={onAjouter} accessibilityRole="button" accessibilityLabel={traduire('Ajouter ta photo')} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.primary })}>
        <Ink size={13} weight="extraBold" color={c.onPrimary}>{traduire('Ajouter ta photo')}</Ink>
      </Pressable>
      <Pressable onPress={onFermer} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} hitSlop={10} style={{ minHeight: 40, minWidth: 32, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={16} color={c.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function CarteEditeur() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ moment?: string; id?: string; date?: string; debut?: string; demo?: string; sport?: string; type?: string; src?: string; ref?: string; cle?: string; onglet?: string; chiffres?: string; avaitPhoto?: string; avant?: string; apres?: string; flou?: string; photo?: string; photo2?: string; photo3?: string; photo4?: string; exemple?: string }>();
  const [data, setData] = useState<CarteData | null>(null);
  const [vide, setVide] = useState(false);
  const aa = p.moment === 'avant_apres';
  // Avant apres : toutes tes photos pour choisir la paire, et le flou (mis par defaut, comme dans ton coffre)
  const [photosAA, setPhotosAA] = useState<PhotoCarte[]>([]);
  const [flou, setFlou] = useState(p.flou !== '0');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let d: CarteData | null = null;
        if (aa) {
          const liste = p.demo === '1' ? demoPhotosAvantApres([p.photo, p.photo2, p.photo3, p.photo4]) : await chargerPhotosCarte();
          if (alive) setPhotosAA(liste);
          d = carteAvantApres(liste, p.avant, p.apres);
        } else if (p.demo === '1') d = p.moment === 'exploit' ? demoExploit(p.type, p.cle) : demoPour(p.moment, p.sport);
        // 31 octobre 2026 (bibliotheque) : un objectif ou un compteur du moment, ton mois, ton annee
        else if (p.moment === 'exploit' && (p.src === 'objectif' || p.src === 'compteur')) d = await chargerDuMoment(p.src, p.cle ?? '');
        else if ((p.moment === 'mois' || p.moment === 'annee') && p.ref) d = await chargerPeriode(p.moment, p.ref);
        else if (p.moment === 'exploit' && p.src && p.ref) d = await chargerExploit(p.src, p.ref, p.cle ?? '');
        else if (p.moment === 'pesee') d = await chargerPesee({ id: p.id ? Number(p.id) : undefined, date: p.date });
        else if (p.moment === 'semaine' && p.debut) d = await chargerSemaine(p.debut);
        else if (p.id) d = await chargerSeance(Number(p.id));
        if (!alive) return;
        setData(d);
        setVide(!d);
      } catch (e) {
        logger.warn('[cartes] editeur', e);
        if (alive) setVide(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [p.moment, p.id, p.date, p.debut, p.demo, p.sport, p.type, p.src, p.ref, p.cle, p.avant, p.apres, p.photo, p.photo2, p.photo3, p.photo4, aa]);

  const k = useCarte(data);
  const choisirAA = (cote: 'avant' | 'apres', id: string) => {
    const x = data?.avantApres;
    if (!x) return;
    const d = carteAvantApres(photosAA, cote === 'avant' ? id : x.avant.id, cote === 'apres' ? id : x.apres.id);
    if (d) setData(d);
  };
  const retour = () => (router.canGoBack() ? router.back() : router.replace('/mes-cartes' as never));

  // ce qu'il faut pour rouvrir cette carte apres une fermeture de l'app : jamais la photo, seulement qu'il y en avait une
  useEffect(() => {
    if (!data || aa) return;
    noterDetailsPage('/carte', { avaitPhoto: k.photo ? '1' : '' });
  }, [data, aa, k.photo]);
  const [bandeauFerme, setBandeauFerme] = useState(false);
  const bandeauPhoto = p.avaitPhoto === '1' && !!data && !aa && !k.photo && !k.photoEnCours && !bandeauFerme ? (
    <BandeauPhoto c={c} haut={insets.top + ENTETE + 6} onAjouter={() => { setBandeauFerme(true); void k.choisirPhoto('gallery'); }} onFermer={() => setBandeauFerme(true)} />
  ) : null;

  const pasDeCarte = (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 12, paddingHorizontal: 22, gap: 14 }}>
      <RoundButton icon="back" label={traduire("Retour")} onPress={retour} />
      <Ink size={26} weight="black" tight>{traduire("Pas de carte ici")}</Ink>
      <Ink size={15} color={c.textSecondary}>{aa ? traduire('Il te faut au moins 2 photos de corps pour faire ta carte Avant après. Tu peux les ajouter dans tes photos de forme.') : traduire('Ce moment n’a pas encore de chiffres à montrer. Retrouve tes séances, tes pesées et tes semaines dans Mes cartes.')}</Ink>
      <BoutonPrincipal onPress={() => router.replace('/mes-cartes' as never)} haptique="none" label={traduire("Mes cartes")} hauteur={54} tailleTexte={16} />
    </View>
  );
  if (vide) return pasDeCarte;
  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <View style={{ height: ENTETE, paddingHorizontal: 16, justifyContent: 'center' }}>
          <RoundButton icon="back" label={traduire("Retour")} onPress={retour} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ChargementPetit />
        </View>
      </View>
    );
  }
  // une carte sans assez de chiffres pour le nouveau moteur : jamais l'ancien atelier
  if (!nouveauMoteurPour(data, 'nouveau')) return pasDeCarte;

  const prudence = (partir: () => void) => {
    if (!aa) return partir();
    AsyncStorage.getItem(PRUDENCE_KEY)
      .then((v) => v === '1')
      .catch(() => false)
      .then((vue) => {
        if (vue) return partir();
        appAlert(traduire('Avant de partager'), traduire('Tes photos restent sur ton téléphone tant que tu ne partages pas la carte.'), [
          { text: traduire('Annuler'), style: 'cancel' },
          {
            text: traduire('Partager'),
            style: 'primary',
            onPress: () => {
              AsyncStorage.setItem(PRUDENCE_KEY, '1').catch(() => {});
              partir();
            },
          },
        ]);
      });
  };
  const sectionPhotosAA = aa && data.avantApres ? (
    <View style={{ gap: 14 }}>
      <LigneInterrupteur c={c} icon="eye" titre={traduire("Flouter les photos")} sous={flou ? traduire('Comme dans ton coffre, rien ne se reconnaît') : traduire('Tes photos sont nettes sur la carte')} on={flou} onPress={() => setFlou((v) => !v)} />
      <RangeePhotos c={c} titre={traduire("Avant")} liste={photosAA} choisie={data.avantApres.avant.id} flou={flou} onChoisir={(id) => choisirAA('avant', id)} />
      <RangeePhotos c={c} titre={traduire("Après")} liste={photosAA} choisie={data.avantApres.apres.id} flou={flou} onChoisir={(id) => choisirAA('apres', id)} />
    </View>
  ) : undefined;

  return (
    <View style={{ flex: 1 }}>
      <StudioMoteur
        data={data}
        k={k}
        onRetour={retour}
        sectionPhotos={sectionPhotosAA}
        optionsEnPlus={aa ? { fond: 'uni', personnage: false, sansPersonne: true, epure: false, flou } : undefined}
        avantPartage={aa ? prudence : undefined}
        exempleVoulu={p.exemple}
      />
      {bandeauPhoto}
    </View>
  );
}
