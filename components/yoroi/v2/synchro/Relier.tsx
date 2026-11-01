/**
 * Rendu de l'ecran « Relie tes appareils » (31 octobre 2026). Purement visuel : l'etape vient de
 * lib/v2/synchro/ecranRelier.ts, les actions de app/sync-devices.tsx. Rendu aussi hors app (react-native-web)
 * pour _propositions/appairage_2026-11-01.
 *
 * Stickers seulement (pas d'icone au trait), toujours les stickers quel que soit le reglage Illustrations :
 * l'ecran doit rester lisible en un coup d'oeil. « Relies » montre le pont (la chaine du catalogue est cassee).
 */
import React from 'react';
import { ActivityIndicator, Image, TextInput, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Press } from '@/components/yoroi/v2/accueil/kit';
import { GlassBox, Label, Notice, S, SmallButton } from '@/components/yoroi/v2/sante/ui';
import { STICKERS, type NomSticker } from '@/components/yoroi/v2/stickers';
import { nettoyerCode, type EtapeRelier } from '@/lib/v2/synchro/ecranRelier';
import { useGrandEcran } from '@/lib/v2/nav/useGrandEcran';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export interface RelierVueProps {
  etape: EtapeRelier;
  /** Appareils proches a relier */
  proposes: string[];
  /** Appareils appaires relies en ce moment */
  connectes: string[];
  /** Appareils appaires (relies ou non) */
  paires: Array<{ id: string; nom: string }>;
  code?: string | null;
  secondes?: number;
  /** Nom de l'appareil qui affiche le code (proposition de saisie) */
  invitationDe?: string | null;
  saisie: string;
  onSaisie: (t: string) => void;
  onRelier: () => void;
  onValiderCode: () => void;
  onAnnuler: () => void;
  onAfficherCode: () => void;
  onJaiUnCode: () => void;
  onSynchroniser: () => void;
  synchroEnCours?: boolean;
  message?: { text: string; tone: 'neutral' | 'good' | 'bad' } | null;
  onOuvrirReglages: () => void;
  onOublier: (id: string) => void;
  derniereSynchro?: string | null;
  onJournal?: () => void;
  /** Bloc affiche une fois relies (etat du dernier echange) */
  apresRelies?: React.ReactNode;
  /** Force la mise en page grand ecran (rendus hors app) ; sinon lue sur la largeur de la fenetre */
  grand?: boolean;
}

function Sticker({ nom, taille }: { nom: NomSticker; taille: number }) {
  return <Image source={STICKERS[nom]} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

const HERO: Record<EtapeRelier, { sticker: NomSticker; titre: () => string; couleur: () => string }> = {
  indisponible: { sticker: 'hors_ligne', titre: () => traduire('Pas disponible ici'), couleur: () => S.ink },
  cherche: { sticker: 'recherche', titre: () => traduire('Cherche tes appareils…'), couleur: () => S.ink },
  probleme: { sticker: 'alerte', titre: () => traduire('Problème'), couleur: () => S.danger },
  trouve: { sticker: 'telephone', titre: () => traduire('Trouvé'), couleur: () => S.accentDark },
  montre_code: { sticker: 'cadenas', titre: () => traduire('Ton code'), couleur: () => S.ink },
  tape_code: { sticker: 'cle', titre: () => traduire('Tape le code'), couleur: () => S.ink },
  attend: { sticker: 'sablier', titre: () => traduire('Vérification…'), couleur: () => S.ink },
  relies: { sticker: 'pont', titre: () => traduire('Reliés'), couleur: () => S.mossText },
};

function sousTitre(p: RelierVueProps): string {
  switch (p.etape) {
    case 'indisponible':
      return traduire('La synchro entre tes appareils marche dans l’app installée sur iPhone, iPad et Mac.');
    case 'cherche':
      return traduire('Ouvre YOROI sur ton autre appareil, sur ce même écran, à côté de toi.');
    case 'probleme':
      return traduire('Vérifie que le Wi-Fi ou le Bluetooth est activé et que YOROI est ouvert sur les deux.');
    case 'trouve':
      return traduirePluriel(p.proposes.length, p.proposes.length > 1, 'Un appareil YOROI est à côté de toi.', '{0} appareils YOROI sont à côté de toi.', p.proposes.length);
    case 'montre_code':
      return traduire('Tape ce code sur ton autre appareil.');
    case 'tape_code':
      return p.invitationDe ? traduire('{0} affiche un code. Tape-le ici.', p.invitationDe) : traduire('Tape le code affiché sur ton autre appareil.');
    case 'attend':
      return traduire('Garde YOROI ouvert sur les deux.');
    case 'relies':
      return traduire('Relié à {0}. Tes données se synchronisent toutes seules.', p.connectes.join(', '));
  }
}

function Etapes() {
  const etapes: Array<{ sticker: NomSticker; texte: string }> = [
    { sticker: 'telephone', texte: traduire('Ouvre cet écran sur tes deux appareils') },
    { sticker: 'pont', texte: traduire('Touche «\u00a0Relier\u00a0» sur l’un') },
    { sticker: 'cle', texte: traduire('Tape le code sur l’autre') },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {etapes.map((e, i) => (
        <View key={e.sticker} style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: S.glass, borderRadius: 20, borderWidth: 1, borderColor: S.line2, paddingVertical: 12, paddingHorizontal: 6 }}>
          <Sticker nom={e.sticker} taille={52} />
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: S.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={13} weight="black" color={S.paper}>
              {String(i + 1)}
            </Ink>
          </View>
          <Ink size={13} weight="bold" style={{ textAlign: 'center' }}>
            {e.texte}
          </Ink>
        </View>
      ))}
    </View>
  );
}

function AppareilACote({ nom, onRelier }: { nom: string; onRelier: () => void }) {
  return (
    <GlassBox style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Sticker nom="telephone" taille={56} />
        <Ink size={19} weight="black" tight style={{ flex: 1 }}>
          {traduire('{0} est à côté', nom)}
        </Ink>
      </View>
      <BigButton label={traduire('Relier')} onPress={onRelier} />
    </GlassBox>
  );
}

export function RelierVue(p: RelierVueProps) {
  const grandEcran = useGrandEcran();
  const grand = p.grand ?? grandEcran;
  const hero = HERO[p.etape];
  const enCode = p.etape === 'montre_code' || p.etape === 'tape_code' || p.etape === 'attend';

  const blocHero = (
    <GlassBox style={{ gap: 10, alignItems: 'center', paddingVertical: grand ? 30 : 22 }}>
      <Sticker nom={hero.sticker} taille={grand ? 120 : 96} />
      <Ink size={grand ? 32 : 28} weight="black" tight color={hero.couleur()} style={{ textAlign: 'center' }} accessibilityRole="header">
        {hero.titre()}
      </Ink>
      <Ink size={16} weight="bold" color={S.ink2} style={{ textAlign: 'center' }}>
        {sousTitre(p)}
      </Ink>
      {p.etape === 'cherche' || p.etape === 'attend' ? <ActivityIndicator size="small" color={S.accent} /> : null}

      {p.etape === 'montre_code' && p.code ? (
        <View style={{ alignItems: 'center', gap: 6, marginTop: 4 }}>
          <Ink size={grand ? 72 : 56} weight="black" tight style={{ letterSpacing: 8 }} accessibilityLabel={p.code.split('').join(' ')}>
            {p.code}
          </Ink>
          <Ink size={13} weight="bold" color={S.muted}>
            {traduire('Valable encore {0} s', p.secondes ?? 0)}
          </Ink>
        </View>
      ) : null}

      {p.etape === 'tape_code' ? (
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 4 }}>
          <TextInput
            value={p.saisie}
            onChangeText={(t) => p.onSaisie(nettoyerCode(t))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            placeholder="000000"
            placeholderTextColor={S.line2}
            accessibilityLabel={traduire('Code à 6 chiffres')}
            style={{ fontSize: 44, fontWeight: '900', letterSpacing: 8, textAlign: 'center', color: S.ink, borderRadius: 20, borderWidth: 2, borderColor: S.ink, paddingVertical: 12, backgroundColor: S.paper }}
          />
          <BigButton label={traduire('Relier')} onPress={p.onValiderCode} disabled={p.saisie.length !== 6} />
        </View>
      ) : null}

      {enCode ? (
        <View style={{ alignSelf: 'stretch', marginTop: 2 }}>
          <SmallButton label={traduire('Annuler')} tone="light" onPress={p.onAnnuler} />
        </View>
      ) : null}
    </GlassBox>
  );

  const blocMessage = p.message ? <Notice text={p.message.text} tone={p.message.tone} /> : null;

  const blocProposes =
    (p.etape === 'trouve' || p.etape === 'relies') && p.proposes.length
      ? p.proposes.map((nom) => <AppareilACote key={nom} nom={nom} onRelier={p.onRelier} />)
      : null;

  const blocRelies =
    p.etape === 'relies' ? (
      <View style={{ gap: 10 }}>
        <BigButton label={p.synchroEnCours ? traduire('Synchronisation…') : traduire('Synchroniser maintenant')} onPress={p.onSynchroniser} disabled={p.synchroEnCours} />
        {p.onJournal ? (
          <Press onPress={p.onJournal} accessibilityRole="button" accessibilityLabel={traduire('Voir le journal de synchro')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 4 }}>
              <Sticker nom="refresh" taille={34} />
              <Ink size={14} weight="bold" color={S.ink2} style={{ flex: 1 }}>
                {p.derniereSynchro ? traduire('Dernière synchro : {0}', p.derniereSynchro) : traduire('Aucune synchro pour le moment')}
              </Ink>
              <Ink size={14} weight="extraBold" color={S.accentDark}>
                {traduire('Journal')}
              </Ink>
            </View>
          </Press>
        ) : null}
        {p.apresRelies}
      </View>
    ) : null;

  const blocAide =
    p.etape === 'probleme' ? (
      <GlassBox style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Sticker nom="wifi" taille={48} />
          <Ink size={17} weight="black" tight style={{ flex: 1 }}>
            {traduire('Autorise le réseau local')}
          </Ink>
        </View>
        <Ink size={14} weight="bold" color={S.ink2}>
          {traduire('Sur iPhone et iPad : Réglages, Confidentialité et sécurité, Réseau local, puis active YOROI.')}
        </Ink>
        <Ink size={14} weight="bold" color={S.ink2}>
          {traduire('Sur le Mac : Réglages Système, Confidentialité et sécurité, Réseau local, puis active YOROI.')}
        </Ink>
        <SmallButton label={traduire('Ouvrir les Réglages')} tone="ink" onPress={p.onOuvrirReglages} />
      </GlassBox>
    ) : null;

  const blocEtapes = p.etape === 'cherche' || p.etape === 'trouve' || p.etape === 'probleme' ? <Etapes /> : null;

  const blocCode =
    !enCode && p.etape !== 'indisponible' ? (
      <View style={{ gap: 10 }}>
        <Label>{traduire('Ton appareil n’apparaît pas ?')}</Label>
        <View style={{ gap: 10 }}>
          <BigButton label={traduire('Afficher mon code')} tone="light" onPress={p.onAfficherCode} />
          <BigButton label={traduire('J’ai un code')} tone="light" onPress={p.onJaiUnCode} />
        </View>
      </View>
    ) : null;

  const blocPaires =
    p.paires.length && !enCode ? (
      <View style={{ gap: 8 }}>
        <Label>{traduire('Tes appareils reliés')}</Label>
        {p.paires.map((a) => {
          const enLigne = p.connectes.includes(a.nom);
          return (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: S.glass, borderRadius: 18, borderWidth: 1, borderColor: S.line2, padding: 12 }}>
              <Sticker nom={enLigne ? 'pont' : 'telephone'} taille={40} />
              <View style={{ flex: 1 }}>
                <Ink size={16} weight="black" tight>
                  {a.nom}
                </Ink>
                <Ink size={13} weight="bold" color={enLigne ? S.mossText : S.muted}>
                  {enLigne ? traduire('Relié maintenant') : traduire('Pas à côté')}
                </Ink>
              </View>
              <SmallButton label={traduire('Oublier')} tone="light" onPress={() => p.onOublier(a.id)} />
            </View>
          );
        })}
      </View>
    ) : null;

  // 1er novembre 2026 : en grand ecran (iPad, Mac), deux colonnes centrees : l'etape a gauche, l'aide a droite
  if (grand) {
    return (
      <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start', width: '100%', maxWidth: 1040, alignSelf: 'center' }}>
        <View style={{ flex: 1.15, gap: 14 }}>
          {blocHero}
          {blocMessage}
          {blocProposes}
          {blocRelies}
        </View>
        <View style={{ flex: 1, gap: 14 }}>
          {blocAide}
          {blocEtapes}
          {blocCode}
          {blocPaires}
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {blocHero}
      {blocMessage}
      {blocProposes}
      {blocRelies}
      {blocAide}
      {blocEtapes}
      {blocCode}
      {blocPaires}
    </View>
  );
}

export default RelierVue;
