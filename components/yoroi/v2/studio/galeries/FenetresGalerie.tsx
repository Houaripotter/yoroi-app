/**
 * Studio, galerie des fenetres : un bouton par type de fenetre maison (components/yoroi/v2/fenetre)
 * et les feuilles ou cartes courantes (feuille de resultat du carnet, limites de la version gratuite,
 * message court en bas d'ecran). Rien n'est enregistre : chaque bouton dit seulement ce qui a ete touche.
 */
import React, { useCallback, useState } from 'react';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { appAlert, appChoices, appPassword, appPrompt } from '@/components/yoroi/v2/fenetre/api';
import { ResultSheet } from '@/components/yoroi/v2/carnet/ResultSheet';
import type { ResultInfo } from '@/components/yoroi/v2/carnet/ResultSheet';
import { Toast } from '@/components/yoroi/v2/carnet/ui';
import { LimitNotice } from '@/components/yoroi/v2/premium/LimitNotice';
import { FREE_LIMITS, limitNotice } from '@/lib/v2/premium/limits';
import type { FreeLimitKey } from '@/lib/v2/premium/limits';
import { Bloc, GalerieScreen, Ligne, Lignes, Rubrique } from './kit';
import { View } from 'react-native';
import { ToriiIcone } from '@/components/yoroi/v2/charts/CourbePoids';
import { texteFenetreTorii } from '@/lib/v2/pesee/ligneDirectrice';
import { localISO } from '@/lib/v2/accueil/hydration';
import { fenetreFinPremium } from '@/components/yoroi/v2/premium/finPremiumFenetre';
import { traduire } from '@/lib/i18n/tr';

/** Vague 32 : les deux fenetres du torii qui bouge (carte Poids de l'accueil), avec une date d'exemple */
function fenetreTorii(kind: 'recule' | 'rapproche', dit: (s: string) => () => void) {
  const today = localISO();
  const d = new Date(`${today}T12:00:00`);
  d.setDate(d.getDate() + (kind === 'recule' ? 48 : 30));
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const t = texteFenetreTorii(kind, iso, 76, today);
  appAlert(t.titre, t.texte, [{ text: traduire('Garder ce rythme'), style: 'cancel', onPress: dit(traduire('Garder ce rythme')) }, { text: traduire('Voir mon plan'), onPress: dit(traduire('Voir mon plan')) }], {
    illustration: (
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F6EFD9', alignItems: 'center', justifyContent: 'center' }}>
        <ToriiIcone size={38} />
      </View>
    ),
  });
}

const LONG =
  traduire('Tes séances, tes pesées et ton carnet restent sur ce téléphone. Si tu changes de téléphone sans sauvegarde, tout repart de zéro. ') +
  traduire('Une sauvegarde prend quelques secondes : elle crée un fichier que tu gardes où tu veux, dans tes fichiers, sur ton ordinateur ou dans ton nuage. ') +
  traduire('Le jour où tu en as besoin, tu ouvres ce fichier depuis YOROI et tout revient comme avant, tes records, tes techniques, tes photos de progression. ') +
  traduire('Fais-en une maintenant, puis une fois par mois, ou avant chaque mise à jour importante de ton téléphone.');

const RESULTATS: { label: string; sub: string; r: ResultInfo }[] = [
  { label: traduire('Nouveau record'), sub: traduire('Le tampon rouge se pose'), r: { name: traduire('Développé couché'), performance: '45 kg x 5 reps', isPR: true, gain: '+2,5 kg', recordText: '42,5 kg x 5 reps', illus: 'musculation' } },
  { label: 'Premier record', sub: traduire('La toute première perf'), r: { name: 'Tractions', performance: '6 reps', isPR: true, first: true, illus: 'force' } },
  { label: traduire('Perf notée'), sub: traduire('Sans record battu'), r: { name: 'Squat', performance: '70 kg x 5 reps', isPR: false, recordText: '75 kg x 5 reps', illus: 'musculation' } },
];

export function FenetresGalerie() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [dernier, setDernier] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const dit = (s: string) => () => setDernier(s);
  const finToast = useCallback(() => setToast(null), []);

  const limites = (Object.keys(FREE_LIMITS) as FreeLimitKey[]).filter((k) => limitNotice(k, 3) !== null);

  return (
    <GalerieScreen
      title={traduire("Fenêtres")}
      sub={traduire("Chaque fenêtre de l’app, pour voir ses textes, ses boutons et ses couleurs. Rien n’est enregistré.")}
      overlay={
        <>
          <ResultSheet
            result={resultat}
            onShare={() => {
              setResultat(null);
              setDernier(traduire('Partager'));
            }}
            onClose={() => {
              setResultat(null);
              setDernier(traduire('Fermer'));
            }}
          />
          <Toast message={toast} onDone={finToast} />
        </>
      }
    >
      <Bloc style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
        <Icon name="info" size={18} color={c.accent} />
        <Ink size={13} weight="bold" color={c.textSecondary} style={{ flex: 1 }}>
          {dernier ? traduire("Dernier bouton touché : {0}", dernier) : traduire('Le bouton que tu touches dans une fenêtre s’affiche ici.')}
        </Ink>
      </Bloc>

      <Rubrique title="Alertes" sub="appAlert" />
      <Lignes>
        <Ligne first icon="info" label={traduire("Un bouton")} sub={traduire("Une information, un OK")} onPress={() => appAlert(traduire('Pesée enregistrée'), traduire('Ta courbe se met à jour.'), [{ text: 'OK', onPress: dit('OK') }])} />
        <Ligne
          icon="check"
          label="Deux boutons"
          sub={traduire("Annuler et une action")}
          onPress={() =>
            appAlert(traduire('Terminer la séance ?'), traduire('Ta séance sera enregistrée avec ses 6 exercices.'), [
              { text: 'Continuer', style: 'cancel', onPress: dit('Continuer') },
              { text: traduire('Terminer'), onPress: dit(traduire('Terminer')) },
            ])
          }
        />
        <Ligne
          icon="grid"
          label="Trois boutons"
          sub={traduire("Un choix entre deux actions")}
          onPress={() =>
            appAlert(traduire('Quitter sans enregistrer ?'), traduire('Tu as noté 3 séries. Tu peux les garder pour plus tard.'), [
              { text: traduire('Annuler'), style: 'cancel', onPress: dit(traduire('Annuler')) },
              { text: traduire('Garder le brouillon'), onPress: dit(traduire('Garder le brouillon')) },
              { text: 'Quitter', style: 'destructive', onPress: dit('Quitter') },
            ])
          }
        />
        <Ligne
          danger
          icon="trash"
          label="Suppression"
          sub={traduire("Bouton rouge, définitif")}
          onPress={() =>
            appAlert(traduire('Supprimer cette séance ?'), traduire('C’est définitif. Ses records restent dans ton carnet.'), [
              { text: traduire('Annuler'), style: 'cancel', onPress: dit(traduire('Annuler')) },
              { text: traduire('Supprimer'), style: 'destructive', onPress: dit(traduire('Supprimer')) },
            ])
          }
        />
        <Ligne icon="doc" label="Texte long" sub={traduire("Pour vérifier que rien n’est coupé")} onPress={() => appAlert(traduire('Pense à ta sauvegarde'), LONG, [{ text: traduire('Plus tard'), style: 'cancel', onPress: dit(traduire('Plus tard')) }, { text: 'Sauvegarder', onPress: dit('Sauvegarder') }])} />
        <Ligne
          icon="star"
          label={traduire("Avec pictogramme")}
          sub={traduire("Petite image au-dessus du titre")}
          onPress={() =>
            appAlert(traduire('Objectif atteint'), traduire('Tu as fait tes 3 séances de la semaine.'), [{ text: traduire('Super'), onPress: dit(traduire('Super')) }], {
              icon: <Icon name="trophy" size={26} color={c.accent} />,
            })
          }
        />
      </Lignes>

      <Rubrique title={traduire("Le torii bouge")} sub={traduire("Carte Poids : la date d’arrivée recalculée avec ta vraie tendance")} />
      <Lignes>
        <Ligne first icon="calendar" label={traduire("Ton torii a reculé")} sub={traduire("L’arrivée prévue recule d’une semaine ou plus")} onPress={() => fenetreTorii('recule', dit)} />
        <Ligne icon="target" label={traduire("Ton torii s’est rapproché")} sub={traduire("L’arrivée prévue avance d’une semaine ou plus")} onPress={() => fenetreTorii('rapproche', dit)} />
      </Lignes>

      <Rubrique title={traduire("Fin du Premium")} sub={traduire("La première fois que l’abonnement prend fin")} />
      <Lignes>
        <Ligne first icon="star" label={traduire("Ton Premium a pris fin")} sub={traduire("Reprendre Premium ou Plus tard")} onPress={() => fenetreFinPremium(dit(traduire('Reprendre Premium')), dit(traduire('Plus tard')))} />
      </Lignes>

      <Rubrique title={traduire("Feuille de choix")} sub="appChoices" />
      <Lignes>
        <Ligne
          first
          icon="camera"
          label={traduire("Choisir une photo")}
          sub={traduire("Avec Annuler ajouté tout seul")}
          onPress={() =>
            appChoices(traduire('Photo de profil'), traduire('D’où vient ta photo ?'), [
              { text: traduire('Prendre une photo'), onPress: dit(traduire('Prendre une photo')) },
              { text: traduire('Choisir dans la galerie'), onPress: dit(traduire('Choisir dans la galerie')) },
              { text: traduire('Retirer la photo'), style: 'destructive', onPress: dit(traduire('Retirer la photo')) },
            ])
          }
        />
      </Lignes>

      <Rubrique title="Saisie" sub={traduire("appPrompt et appPassword")} />
      <Lignes>
        <Ligne first icon="text" label="Texte libre" sub="Renommer quelque chose" onPress={() => appPrompt(traduire('Renommer le club'), traduire('Le nouveau nom s’affiche partout.'), (v) => setDernier(traduire("OK avec « {0} »", v)), 'plain-text', 'First Jiu-Jitsu Academy')} />
        <Ligne
          icon="scale"
          label="Nombre"
          sub={traduire("Clavier chiffré")}
          onPress={() =>
            appPrompt(
              traduire('Ton poids ce matin'),
              traduire('En kilos, par exemple 72,4.'),
              [
                { text: traduire('Annuler'), style: 'cancel', onPress: dit(traduire('Annuler')) },
                { text: traduire('Enregistrer'), onPress: (v) => setDernier(traduire("Enregistrer avec « {0} »", v ?? '')) },
              ],
              'plain-text',
              '',
              'decimal-pad',
              { placeholder: '72,4' },
            )
          }
        />
        <Ligne
          icon="lock"
          label={traduire("Mot de passe")}
          sub={traduire("Saisie masquée, 6 caractères au moins")}
          onPress={() => {
            appPassword({ title: traduire('Protéger ta sauvegarde'), message: traduire('Choisis un mot de passe. Sans lui, personne ne peut ouvrir le fichier.'), confirmLabel: traduire('Protéger'), minLength: 6 })
              .then((v) => setDernier(v === null ? traduire('Annuler') : traduire("Protéger ({0} caractères)", v.length)))
              .catch(() => undefined);
          }}
        />
      </Lignes>

      <Rubrique title={traduire("Feuille de résultat")} sub={traduire("Après une perf notée dans le carnet")} />
      <Lignes>
        {RESULTATS.map((x, i) => (
          <Ligne key={x.label} first={i === 0} icon={x.r.isPR ? 'trophy' : 'check'} label={x.label} sub={x.sub} onPress={() => setResultat(x.r)} />
        ))}
      </Lignes>

      <Rubrique title="Message court" sub={traduire("En bas de l’écran, deux secondes")} />
      <Lignes>
        <Ligne first icon="check" label={traduire("Afficher le message")} sub={traduire("Technique ajoutée")} onPress={() => setToast(traduire('Technique ajoutée'))} />
      </Lignes>

      <Rubrique title={traduire("Limites de la version gratuite")} sub={traduire("Telles qu’elles s’affichent là où elles s’appliquent")} />
      {limites.map((k) => (
        <LimitNotice key={k} limit={k} count={FREE_LIMITS[k] as number} />
      ))}

    </GalerieScreen>
  );
}

export default FenetresGalerie;
