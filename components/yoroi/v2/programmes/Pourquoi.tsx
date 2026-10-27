/**
 * « Pourquoi ? » (26 octobre 2026). Houari : « Cardio zone 2, marche inclinée en zone 2, ça ne dit rien. »
 * Un bouton « Pourquoi ? » sur chaque module et chaque conseil d'objectif, qui ouvre une feuille :
 * la carte indigo du titre, une idée par carte avec son icône, puis les études (nom court, ce qu'elles montrent,
 * le lien d'un toucher). Les textes viennent de lib/v2/programmes/pourquoi.ts, les études de sources.ts.
 * 27 octobre 2026 (refonte des écrans Coach) : cartes pastel (usePastel), plus de grand fond indigo.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { famillePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { nomCourtSource, sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import type { ConseilObjectif, Explication } from '@/lib/v2/programmes/pourquoi';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Le petit bouton « Pourquoi ? », sur une carte claire ou sur l'indigo */
export function BoutonPourquoi({ onPress, surIndigo, label }: { onPress: () => void; surIndigo?: boolean; label?: string }) {
  const pa = usePastel();
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label ? `${traduire('Pourquoi ?')} ${label}` : traduire('Pourquoi ?')}
      hitSlop={6}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 34,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: surIndigo ? 'rgba(255,255,255,0.2)' : pa.carte,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon name="book" size={14} color={surIndigo ? '#FFFFFF' : pa.bleu.encre} />
      <Ink size={12} weight="extraBold" color={surIndigo ? '#FFFFFF' : pa.bleu.encre}>{traduire('Pourquoi ?')}</Ink>
    </Pressable>
  );
}

/** La feuille : le titre sur l'indigo, une idée par carte, les études */
export function FeuillePourquoi({ explication, onClose }: { explication: Explication | null; onClose: () => void }) {
  const pa = usePastel();
  const e = explication;
  const etudes = (e?.sources ?? []).map((id) => sourceParId(id)).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <Sheet visible={!!e} onClose={onClose}>
      {e ? (
        <View style={{ gap: 12 }}>
          <View style={{ borderRadius: 24, backgroundColor: pa.bleu.fond, overflow: 'hidden', padding: 18, gap: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={e.icone} size={20} color={pa.bleu.titre} />
            </View>
            <Ink size={11} weight="black" color={pa.bleu.titre} style={{ letterSpacing: 1.3 }}>{traduire('Pourquoi ?').toLocaleUpperCase()}</Ink>
            <Ink size={22} weight="black" tight color={pa.texte} accessibilityRole="header">{traduire(e.titre)}</Ink>
            <Ink size={14} weight="bold" color={pa.texte2}>{traduire(e.ligne)}</Ink>
          </View>

          {e.points.map((x, k) => {
            const f = famillePastel(pa, k + 1);
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 14, backgroundColor: f.fond }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={x.icone} size={19} color={f.titre} />
                </View>
                <Ink size={14} weight="bold" color={pa.texte} style={{ flex: 1, lineHeight: 20 }}>{traduire(x.texte)}</Ink>
              </View>
            );
          })}

          {etudes.length ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Ink size={16} weight="black" tight color={pa.texte}>{traduirePluriel(etudes.length, etudes.length > 1, 'L’étude', 'Les {0} études', etudes.length)}</Ink>
              {etudes.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { tap(); void safeOpenURL(s.lien); }}
                  accessibilityRole="link"
                  accessibilityLabel={`${nomCourtSource(s)}. ${traduire(s.apport)}`}
                  style={({ pressed }) => ({ gap: 6, borderRadius: 20, padding: 14, backgroundColor: pressed ? pa.choisi : pa.carte, borderWidth: 1, borderColor: pa.ligne })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: pa.bleu.fond }}>
                      <Ink size={12} weight="black" color={pa.bleu.encre}>{nomCourtSource(s)}</Ink>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Icon name="link" size={15} color={pa.texte3} />
                  </View>
                  <Ink size={13} weight="bold" color={pa.texte2} style={{ lineHeight: 19 }}>{traduire(s.apport)}</Ink>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

/**
 * Le conseil du coach pour un de tes objectifs : l'icône, le titre, une ligne, « Pourquoi ? ».
 * `ajout` : le module de l'objectif à ajouter « si tu veux » (ou déjà dans ton programme).
 */
export function CarteConseilObjectif({ conseil, k, onPourquoi, ajout }: {
  conseil: ConseilObjectif;
  k: number;
  onPourquoi: () => void;
  ajout?: { label: string; etat: 'ajoute' | 'possible' | 'inclus'; onBasculer?: () => void };
}) {
  const pa = usePastel();
  const f = famillePastel(pa, k + 1);
  return (
    <View style={{ borderRadius: 22, padding: 14, gap: 12, backgroundColor: f.fond }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={conseil.icone} size={19} color={f.titre} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={16} weight="black" tight color={pa.texte}>{traduire(conseil.titre)}</Ink>
          <Ink size={13} weight="bold" color={pa.texte2} style={{ lineHeight: 18 }}>{traduire(conseil.ligne)}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <BoutonPourquoi onPress={onPourquoi} label={traduire(conseil.titre)} />
        {ajout ? (
          ajout.etat === 'inclus' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: pa.carte }}>
              <Icon name="check" size={14} color={pa.menthe.titre} strokeWidth={3} />
              <Ink size={12} weight="extraBold" color={pa.menthe.titre}>{traduire('Déjà dans ton programme')}</Ink>
            </View>
          ) : (
            <Pressable
              onPress={() => { tap(); ajout.onBasculer?.(); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ajout.etat === 'ajoute' }}
              accessibilityLabel={traduire('Ajouter le module {0}, si tu veux', traduire(ajout.label))}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: ajout.etat === 'ajoute' ? pa.bouton : pa.carte, opacity: pressed ? 0.8 : 1 })}
            >
              <Icon name={ajout.etat === 'ajoute' ? 'check' : 'plus'} size={14} color={ajout.etat === 'ajoute' ? pa.surBouton : pa.creme.titre} strokeWidth={3} />
              <Ink size={12} weight="extraBold" color={ajout.etat === 'ajoute' ? pa.surBouton : pa.creme.titre}>
                {ajout.etat === 'ajoute' ? traduire('Module {0} ajouté', traduire(ajout.label)) : traduire('Ajouter le module {0}, si tu veux', traduire(ajout.label))}
              </Ink>
            </Pressable>
          )
        ) : null}
      </View>
    </View>
  );
}
