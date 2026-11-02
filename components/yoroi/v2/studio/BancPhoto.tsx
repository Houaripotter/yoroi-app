/**
 * Studio createur, Diagnostic : le banc photo (phase native, proposition du 2 novembre 2026). PAS INTEGRE.
 *
 * Fait passer le jeu de photos du banc (_propositions/phase_native_2026-11-02/banc/photos/) dans le vrai module photo
 * de l'appareil (Vision sur iPhone, iPad et Mac, ML Kit sur Android), applique le critere A+ (critereAplus.ts),
 * et exporte un JSON avec les masques, a deposer dans banc/resultats/ pour comparer.py.
 *
 * Rien ne part sur internet : le partage passe par la feuille du systeme (AirDrop, Fichiers, Drive), c'est toi qui choisis.
 * Les copies de travail vivent dans cacheDirectory/cartes_tmp/ et sont effacees a la fin.
 *
 * Pour l'integrer (2 lignes dans components/yoroi/v2/studio/Diagnostic.tsx) :
 *   import { BancPhoto } from './BancPhoto';
 *   puis <BancPhoto /> juste sous <InterrupteurMoteur />.
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
import { analyserPhoto, capacites, decoderPixels, moduleDisponible } from '@/modules/yoroi-photo';
import type { ReponseNative } from '@/modules/yoroi-photo';
import { critereAplus } from '@/lib/v2/cartes/moteur/critereAplus';
import { dossierCartesTmp, effacerCopieCarte } from '@/lib/v2/cartes/tmp';

type Ligne = { nom: string; niveau: string; visages: number; personnes: number | null; ms: number; erreurs: string[] };

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
      const photos: Record<string, unknown> = {};
      const faites: Ligne[] = [];
      let i = 0;
      for (const a of choix.assets) {
        i++;
        const nom = nomSansExtension(a.name || `photo_${i}`);
        setEtat(`Analyse ${i} sur ${choix.assets.length} : ${nom}`);
        // copie dans cartes_tmp, comme une photo de carte : effacee a la fin
        const copie = `${dossier}banc_${Date.now()}_${nom}${/\.\w+$/.exec(a.name || '')?.[0] ?? '.jpg'}`;
        await FileSystem.copyAsync({ from: a.uri, to: copie });
        aEffacer.push(copie);
        const r: ReponseNative = await analyserPhoto(copie);
        const pixels = decoderPixels(r.masque);
        const masque = r.masque && pixels ? { largeur: r.masque.largeur, hauteur: r.masque.hauteur, donnees: pixels } : null;
        const rapport = r.largeurPhoto > 0 ? r.hauteurPhoto / r.largeurPhoto : undefined;
        const t0 = Date.now();
        const critere = critereAplus(masque, r.visages, rapport);
        const msCritere = Date.now() - t0;
        let png: string | null = null;
        if (r.masque?.uri) {
          aEffacer.push(r.masque.uri);
          png = await FileSystem.readAsStringAsync(r.masque.uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => null);
        }
        photos[nom] = {
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
          dureeMs: r.dureeMs ?? null,
          dureeCritereMs: msCritere,
          erreurs: r.erreurs,
        };
        faites.push({ nom, niveau: critere.niveau, visages: r.visages.length, personnes: r.masque?.personnes ?? null, ms: Math.round((r.dureeMs ?? 0) + msCritere), erreurs: r.erreurs });
        setLignes([...faites]);
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
        source: 'Studio createur, banc photo (module de l’app)',
        photos,
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
      <Note>Choisis les 15 photos du dossier banc/photos (dans Fichiers). Tout reste sur l’appareil, puis le JSON part où tu veux.</Note>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SmallAction label={enCours ? 'Analyse en cours…' : 'Lancer le banc'} onPress={() => void lancer()} disabled={enCours || !moduleDisponible()} />
      </View>
      {etat ? <Note>{etat}</Note> : null}
      {lignes.length ? (
        <Card>
          {lignes.map((l, k) => (
            <KV key={l.nom} first={k === 0} label={l.nom} value={`${l.niveau} · ${l.visages} visage${l.visages > 1 ? 's' : ''}${l.personnes !== null ? ` · ${l.personnes} pers.` : ''} · ${l.ms} ms${l.erreurs.length ? ' · erreur' : ''}`} />
          ))}
        </Card>
      ) : null}
      {lignes.some((l) => l.erreurs.length) ? (
        <Ink size={12} color={c.textSecondary}>{lignes.filter((l) => l.erreurs.length).map((l) => `${l.nom} : ${l.erreurs.join(' ; ')}`).join('\n')}</Ink>
      ) : null}
    </>
  );
}
