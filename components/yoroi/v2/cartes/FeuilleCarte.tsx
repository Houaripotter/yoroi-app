/**
 * Feuille du bas qui propose la carte juste apres le moment (seance, pesee, dimanche) :
 * apercu, choix rapide du modele, Partager, Enregistrer dans la pellicule, Personnaliser, Pas maintenant.
 * Une seule fois par moment ; « Ne plus me proposer » coupe les propositions automatiques
 * (les cartes restent dans Mes cartes).
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { setPropositionsAuto } from '@/lib/v2/cartes/store';
import type { CarteData, ModeleId } from '@/lib/v2/cartes/types';
import { CarteApercu, CARTE_W, HAUTEURS, modeleEffectif, modelesPour } from './CarteRendu';
import { useCarte } from './useCarte';

/** Nom court d'une carte dans le choix de la feuille */
export function nomCourt(d: CarteData): string {
  if (d.moment === 'exploit' && d.exploit) {
    const t = d.exploit.type;
    if (t.startsWith('record_')) return t === 'record_charge' ? `Record ${d.exploit.accroche.toLowerCase()}` : d.exploit.surtitre;
    if (t === 'techniques') return 'Techniques';
    if (t === 'compteur') return 'Compteur';
    if (t === 'annee_progression') return 'Mon année';
    return d.exploit.surtitre;
  }
  return d.moment === 'seance' ? 'Ma séance' : d.moment === 'pesee' ? 'Ma pesée' : 'Ma semaine';
}

export function lienEditeur(d: CarteData): string {
  if (d.moment === 'exploit' && d.source) return `/carte?moment=exploit&src=${d.source.type}&ref=${encodeURIComponent(d.source.ref)}&cle=${encodeURIComponent(d.cle)}`;
  if (d.moment === 'avant_apres' && d.avantApres) return `/carte?moment=avant_apres&avant=${encodeURIComponent(d.avantApres.avant.id)}&apres=${encodeURIComponent(d.avantApres.apres.id)}`;
  const [m, id] = d.cle.split(':');
  if (m === 'seance') return `/carte?moment=seance&id=${id}`;
  if (m === 'pesee') return `/carte?moment=pesee&date=${id}`;
  return `/carte?moment=semaine&debut=${id}`;
}

/**
 * Plusieurs moments en meme temps (un record, un palier, ton compteur...) : une seule feuille,
 * et tu choisis la carte en haut. `autres` : les cartes en plus de `data`, deja dans l'ordre.
 */
export function FeuilleCarte({ data, autres, visible, onClose }: { data: CarteData; autres?: CarteData[]; visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const cartes = [data, ...(autres ?? [])];
  const [sel, setSel] = useState(0);
  const cur = cartes[Math.min(sel, cartes.length - 1)];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel="Fermer" style={{ flex: 1, backgroundColor: 'rgba(15,16,20,0.45)' }} />
      <Contenu key={cur.cle} data={cur} onClose={onClose} choix={cartes.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} style={{ marginHorizontal: -20 }}>
          <View style={{ width: 12 }} />
          {cartes.map((x, i) => {
            const on = x === cur;
            const rec = !!x.exploit?.record;
            return (
              <Pressable key={x.cle} onPress={() => setSel(i)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`Carte ${nomCourt(x)}`} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.border }}>
                {rec ? <View style={{ width: 7, height: 7, borderRadius: 1.5, backgroundColor: c.record, transform: [{ rotate: '45deg' }] }} /> : null}
                <Ink size={14} weight="extraBold" color={on ? c.background : c.ink} numberOfLines={1}>{nomCourt(x)}</Ink>
              </Pressable>
            );
          })}
          <View style={{ width: 12 }} />
        </ScrollView>
      ) : null} nombre={cartes.length} />
    </Modal>
  );
}

function Contenu({ data, onClose, choix, nombre }: { data: CarteData; onClose: () => void; choix: React.ReactNode; nombre: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const k = useCarte(data);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);
  const onErreur = (titre: string, texte: string) => setErreur(`${titre}. ${texte}`);
  const H = HAUTEURS[k.options.format];
  // 17 octobre : l'apercu prend toute la hauteur laissee par le titre, les choix et les boutons
  const carteH = Math.max(260, height - insets.top - insets.bottom - (nombre > 1 ? 440 : 390));
  const largeur = Math.min(width - 56, Math.round((carteH * CARTE_W) / H));

  // navigation directe : l'atelier s'ouvre sous la feuille, qui glisse et le devoile (plus d'attente)
  const personnaliser = () => {
    router.push(lienEditeur(data) as never);
    onClose();
  };

  // confirmation dans la feuille : une fenetre par-dessus un Modal resterait cachee sur iPhone
  const plusJamais = () => {
    if (!confirme) {
      setConfirme(true);
      return;
    }
    setPropositionsAuto(false).catch(() => {});
    onClose();
  };

  return (
      <View style={{ backgroundColor: c.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingBottom: insets.bottom + 14, paddingHorizontal: 20, gap: 12 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.fillSubtle }} />
        <View style={{ gap: 2 }}>
          <Ink size={22} weight="black" tight accessibilityRole="header">{nombre > 1 ? `${nombre} cartes pour toi` : 'Ta carte est prête'}</Ink>
          <Ink size={14} color={c.textSecondary}>{nombre > 1 ? 'Choisis celle que tu veux poster.' : 'Enregistre-la dans ta pellicule ou poste-la.'}</Ink>
        </View>
        {choix}

        <View style={{ alignItems: 'center' }}>
          <View style={{ borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
            <CarteApercu ref={k.ref} largeur={largeur} data={data} options={k.options} visuels={k.visuels} />
          </View>
        </View>

        {data.moment === 'exploit' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ id: 'perso', nom: 'Avec personnage', on: k.personne.visible && k.aPersonnage && k.options.personnage, f: () => k.setStyle({ epure: false, personnage: true, sansPersonne: false }), cache: !k.aPersonnage }, { id: 'sans', nom: 'Sans', on: !k.options.epure && !(k.personne.visible && k.aPersonnage && k.options.personnage), f: () => k.setStyle({ epure: false, sansPersonne: true }) }, { id: 'epure', nom: 'Que mes données', on: !!k.options.epure, f: () => k.setStyle({ epure: true }) }].filter((x) => !x.cache).map((x) => (
              <Pressable key={x.id} onPress={x.f} accessibilityRole="button" accessibilityState={{ selected: x.on }} style={{ minHeight: 40, paddingHorizontal: 13, borderRadius: 20, justifyContent: 'center', backgroundColor: x.on ? c.ink : c.surface, borderWidth: 1, borderColor: x.on ? c.ink : c.border }}>
                <Ink size={13} weight="extraBold" color={x.on ? c.background : c.ink}>{x.nom}</Ink>
              </Pressable>
            ))}
          </View>
        ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {modelesPour(data).map((m) => {
            const on = m.id === modeleEffectif(data, k.options.modele);
            return (
              <Pressable
                key={m.id}
                onPress={() => k.setStyle({ modele: m.id as ModeleId })}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Modèle ${m.nom}`}
                style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.border }}
              >
                <Ink size={14} weight="extraBold" color={on ? c.background : c.ink}>{m.nom}</Ink>
              </Pressable>
            );
          })}
        </ScrollView>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => { setErreur(null); void k.enregistrer(onErreur); }}
            disabled={!!k.busy}
            accessibilityRole="button"
            accessibilityLabel="Enregistrer dans la pellicule"
            style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
          >
            <Icon name={k.saved ? 'check' : 'download'} size={19} color={k.saved ? c.successText : c.ink} />
            <Ink size={16} weight="extraBold" color={k.saved ? c.successText : c.ink}>{k.busy === 'save' ? 'Un instant' : k.saved ? 'Enregistrée' : 'Enregistrer'}</Ink>
          </Pressable>
          <Pressable
            onPress={() => { setErreur(null); void k.partager(onErreur); }}
            disabled={!!k.busy}
            accessibilityRole="button"
            accessibilityLabel="Partager la carte"
            style={({ pressed }) => ({ flex: 1.2, height: 54, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}
          >
            <Icon name="share" size={19} color={c.onAccent} />
            <Ink size={16} weight="extraBold" color={c.onAccent}>{k.busy === 'share' ? 'Un instant' : 'Partager'}</Ink>
          </Pressable>
        </View>

        {erreur ? <Ink size={13} weight="bold" color={c.danger}>{erreur}</Ink> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingRight: 12 }}>
            <Ink size={15} weight="extraBold" color={c.textSecondary}>Pas maintenant</Ink>
          </Pressable>
          <Pressable onPress={personnaliser} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 12 }}>
            <Ink size={15} weight="extraBold" color={c.accent}>Personnaliser</Ink>
          </Pressable>
        </View>
        <Pressable onPress={plusJamais} accessibilityRole="button" style={{ minHeight: 36, alignItems: 'center', justifyContent: 'center', marginTop: -6 }}>
          <Ink size={12} weight="bold" color={confirme ? c.accent : c.textMuted} style={{ textAlign: 'center' }}>
            {confirme ? 'Touche encore pour couper. Tes cartes restent dans Mes cartes.' : 'Ne plus me proposer de cartes'}
          </Ink>
        </Pressable>
      </View>
  );
}
