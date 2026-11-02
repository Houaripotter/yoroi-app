/**
 * Studio createur, Diagnostic : le banc photo (phase native, 2 novembre 2026).
 *
 * Fait passer le jeu de photos du banc (_propositions/phase_native_2026-11-02/banc/photos/) dans le vrai module photo
 * de l'appareil (Vision sur iPhone, iPad et Mac, ML Kit sur Android), applique le critere A+ (critereAplus.ts),
 * et exporte un JSON avec les masques, a deposer dans banc/resultats/ pour comparer.py.
 *
 * Chaque photo est analysee a 1024 ET a 1440 px (TAILLES_BANC) : niveau, mesures de la tete et des cheveux, temps,
 * memoire donnee par le natif. Une analyse de chauffe d'abord (non comptee), puis toutes les photos a 1024, puis toutes
 * a 1440 : le pic de memoire de l'app (iOS et Mac) ne peut que monter, cet ordre permet de lire le surcout de 1440.
 *
 * Rien ne part sur internet : le partage passe par la feuille du systeme (AirDrop, Fichiers, Drive), c'est toi qui choisis.
 * Les copies de travail vivent dans cacheDirectory/cartes_tmp/ et sont effacees a la fin.
 *
 * Branche dans components/yoroi/v2/studio/Diagnostic.tsx, juste sous <InterrupteurMoteur />.
 * Textes en francais seulement, sans traduire() : ecran du Studio createur, personne d'autre ne le voit.
 */
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Device from 'expo-device';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card } from '@/components/yoroi/v2/espace/ui';
import { KV, Note, SmallAction, SubTitle } from './parts';
import { analyserPhoto, capacites, decoderPixels, moduleDisponible, TAILLE_ANALYSE_DEFAUT, TAILLES_BANC } from '@/modules/yoroi-photo';
import type { ReponseNative } from '@/modules/yoroi-photo';
import { critereAplus } from '@/lib/v2/cartes/moteur/critereAplus';
import { dossierCartesTmp, effacerCopieCarte } from '@/lib/v2/cartes/tmp';

type Mesure = { niveau: string; visages: number; personnes: number | null; ms: number; erreurs: string[] };
type Ligne = { nom: string; parTaille: Record<number, Mesure> };

function texteMesure(t: number, m: Mesure | undefined): string {
  if (!m) return `${t} : …`;
  return `${t} : ${m.niveau} · ${m.visages} v${m.personnes !== null ? ` · ${m.personnes} p` : ''} · ${m.ms} ms${m.erreurs.length ? ' · erreur' : ''}`;
}

function nomSansExtension(n: string): string {
  return n.replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[^A-Za-z0-9_-]/g, '_');
}

export function BancPhoto() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [etat, setEtat] = useState('');
  const [enCours, setEnCours] = useState(false);
  const cap = capacites();
  const erreurs = lignes.flatMap((l) =>
    TAILLES_BANC.filter((t) => l.parTaille[t]?.erreurs.length).map((t) => `${l.nom}, ${t} px : ${l.parTaille[t].erreurs.join(' ; ')}`),
  );

  const lancer = useCallback(async () => {
    if (enCours) return;
    setEnCours(true);
    setLignes([]);
    const aEffacer: string[] = [];
    try {
      const choix = await DocumentPicker.getDocumentAsync({ type: 'image/*', multiple: true, copyToCacheDirectory: true });
      if (choix.canceled || !choix.assets?.length) {
        setEtat('Aucune photo choisie.');
        return;
      }
      const dossier = dossierCartesTmp();
      if (!dossier) throw new Error('cache indisponible');
      await FileSystem.makeDirectoryAsync(dossier, { intermediates: true }).catch(() => undefined);
      // les copies, une fois par photo, dans cartes_tmp : effacees a la fin
      const copies: { nom: string; uri: string }[] = [];
      let i = 0;
      for (const a of choix.assets) {
        i++;
        const nom = nomSansExtension(a.name || `photo_${i}`);
        const copie = `${dossier}banc_${Date.now()}_${i}_${nom}${/\.\w+$/.exec(a.name || '')?.[0] ?? '.jpg'}`;
        await FileSystem.copyAsync({ from: a.uri, to: copie });
        aEffacer.push(copie);
        copies.push({ nom, uri: copie });
      }
      // chauffe : charge les modeles, non comptee
      setEtat('Chauffe du module…');
      const chauffe = await analyserPhoto(copies[0].uri, { tailleMax: TAILLE_ANALYSE_DEFAUT });
      if (chauffe.masque?.uri) aEffacer.push(chauffe.masque.uri);

      const tailles: Record<string, Record<string, unknown>> = {};
      const faites: Record<string, Ligne> = {};
      const ordre: string[] = copies.map((x) => x.nom);
      let n = 0;
      for (const taille of TAILLES_BANC) {
        const photos: Record<string, unknown> = {};
        for (const { nom, uri } of copies) {
          n++;
          setEtat(`Analyse ${n} sur ${copies.length * TAILLES_BANC.length} : ${nom}, ${taille} px`);
          const t0 = Date.now();
          const r: ReponseNative = await analyserPhoto(uri, { tailleMax: taille });
          const msTotal = Date.now() - t0;
          const pixels = decoderPixels(r.masque);
          const masque = r.masque && pixels ? { largeur: r.masque.largeur, hauteur: r.masque.hauteur, donnees: pixels } : null;
          const rapport = r.largeurPhoto > 0 ? r.hauteurPhoto / r.largeurPhoto : undefined;
          const t1 = Date.now();
          const critere = critereAplus(masque, r.visages, rapport);
          const msCritere = Date.now() - t1;
          let png: string | null = null;
          if (r.masque?.uri) {
            aEffacer.push(r.masque.uri);
            png = await FileSystem.readAsStringAsync(r.masque.uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => null);
          }
          photos[nom] = {
            tailleMax: r.tailleMax ?? taille,
            largeur: r.largeur,
            hauteur: r.hauteur,
            largeurPhoto: r.largeurPhoto,
            hauteurPhoto: r.hauteurPhoto,
            visages: r.visages,
            masque: r.masque ? { largeur: r.masque.largeur, hauteur: r.masque.hauteur, personnes: r.masque.personnes, png } : null,
            lumiere: r.lumiere,
            detourageDisponible: r.detourageDisponible,
            niveau: critere.niveau,
            raisons: critere.raisons,
            mesures: critere.mesures,
            // dureeMs : l'analyse native seule ; dureeTotaleMs : vue de JavaScript, pont et masque en base64 compris
            dureeMs: r.dureeMs ?? null,
            dureeTotaleMs: msTotal,
            dureeCritereMs: msCritere,
            memoireAvantMo: r.memoireAvantMo ?? null,
            memoireApresMo: r.memoireApresMo ?? null,
            memoirePicMo: r.memoirePicMo ?? null,
            erreurs: r.erreurs,
          };
          const ligne = faites[nom] ?? { nom, parTaille: {} };
          ligne.parTaille[taille] = {
            niveau: critere.niveau,
            visages: r.visages.length,
            personnes: r.masque?.personnes ?? null,
            ms: Math.round((r.dureeMs ?? 0) + msCritere),
            erreurs: r.erreurs,
          };
          faites[nom] = ligne;
          setLignes(ordre.filter((k) => faites[k]).map((k) => ({ ...faites[k], parTaille: { ...faites[k].parTaille } })));
        }
        tailles[String(taille)] = photos;
      }
      const plateforme = cap.plateforme ?? Platform.OS;
      const fichier = `${dossier}banc_${plateforme === 'macos' ? 'macos_app' : plateforme}.json`;
      const sortie = {
        plateforme: plateforme === 'macos' ? 'macos_app' : plateforme,
        appareil: `${Device.manufacturer ?? ''} ${Device.modelName ?? ''}`.trim(),
        systeme: `${Device.osName ?? Platform.OS} ${Device.osVersion ?? String(Platform.Version)}`,
        moteur: cap.moteur,
        versionModele: cap.versionModele,
        date: new Date().toISOString(),
        source: 'Studio createur, banc photo (module de l’app), apres chauffe',
        // photos : la taille par defaut, pour le tableau principal de comparer.py ; tailles : 1024 et 1440
        photos: tailles[String(TAILLE_ANALYSE_DEFAUT)] ?? {},
        tailles,
      };
      await FileSystem.writeAsStringAsync(fichier, JSON.stringify(sortie));
      aEffacer.push(fichier);
      setEtat('Fini. Envoie le fichier sur ton Mac, dans banc/resultats/.');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fichier, { mimeType: 'application/json', dialogTitle: 'Banc photo YOROI' });
    } catch (e) {
      setEtat(`Arrêté : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      // Android : l'app choisie peut lire le fichier un peu apres le retour, on attend comme pour les cartes
      setTimeout(() => {
        aEffacer.forEach((u) => void effacerCopieCarte(u));
      }, Platform.OS === 'android' ? 60_000 : 0);
      setEnCours(false);
    }
  }, [enCours, cap.moteur, cap.plateforme, cap.versionModele]);

  return (
    <>
      <SubTitle>Banc photo (visages et détourage)</SubTitle>
      <Card>
        <KV first label="Module photo" value={moduleDisponible() ? 'présent' : 'absent'} />
        <KV label="Moteur" value={cap.moteur || 'aucun'} />
        <KV label="Détourage" value={cap.detourage ? 'disponible' : 'indisponible'} />
        <KV label="Plateforme" value={cap.plateforme ?? Platform.OS} />
      </Card>
      <Note>Choisis les 15 photos du dossier banc/photos (dans Fichiers). Chaque photo passe à 1024 puis à 1440 px. Tout reste sur l’appareil, puis le JSON part où tu veux.</Note>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SmallAction label={enCours ? 'Analyse en cours…' : 'Lancer le banc'} onPress={() => void lancer()} disabled={enCours || !moduleDisponible()} />
      </View>
      {etat ? <Note>{etat}</Note> : null}
      {lignes.length ? (
        <Card>
          {lignes.map((l, k) => (
            <KV key={l.nom} first={k === 0} label={l.nom} value={TAILLES_BANC.map((t) => texteMesure(t, l.parTaille[t])).join('\n')} />
          ))}
        </Card>
      ) : null}
      {erreurs.length ? <Ink size={12} color={c.textSecondary}>{erreurs.join('\n')}</Ink> : null}
    </>
  );
}
