/**
 * « Pourquoi ? » (26 octobre 2026). Houari : « Cardio zone 2, marche inclinée en zone 2, ça ne dit rien. »
 * Un bouton « Pourquoi ? » sur chaque module et chaque conseil d'objectif, qui ouvre une feuille :
 * la carte indigo du titre, une idée par carte avec son icône, puis les études (nom court, ce qu'elles montrent,
 * le lien d'un toucher). Les textes viennent de lib/v2/programmes/pourquoi.ts, les études de sources.ts.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { Cercles, teinteExo, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { nomCourtSource, sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import type { ConseilObjectif, Explication } from '@/lib/v2/programmes/pourquoi';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Le petit bouton « Pourquoi ? », sur une carte claire ou sur l'indigo */
export function BoutonPourquoi({ onPress, surIndigo, label }: { onPress: () => void; surIndigo?: boolean; label?: string }) {
  const pal = usePaletteProgramme();
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
        backgroundColor: surIndigo ? 'rgba(255,255,255,0.2)' : pal.teinte,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Icon name="book" size={14} color={surIndigo ? '#FFFFFF' : pal.accent} />
      <Ink size={12} weight="extraBold" color={surIndigo ? '#FFFFFF' : pal.accent}>{traduire('Pourquoi ?')}</Ink>
    </Pressable>
  );
}

/** La feuille : le titre sur l'indigo, une idée par carte, les études */
export function FeuillePourquoi({ explication, onClose }: { explication: Explication | null; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const e = explication;
  const etudes = (e?.sources ?? []).map((id) => sourceParId(id)).filter((s): s is NonNullable<typeof s> => !!s);
  return (
    <Sheet visible={!!e} onClose={onClose}>
      {e ? (
        <View style={{ gap: 12 }}>
          <View style={{ borderRadius: 24, backgroundColor: pal.indigo, overflow: 'hidden', padding: 18, gap: 10, minHeight: 130, justifyContent: 'flex-end' }}>
            <Cercles />
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={e.icone} size={24} color="#FFFFFF" />
            </View>
            <Ink size={24} weight="black" tight color={c.onDark} accessibilityRole="header">{traduire(e.titre)}</Ink>
            <Ink size={14} weight="bold" color={c.onDarkSecondary}>{traduire(e.ligne)}</Ink>
          </View>

          {e.points.map((x, k) => {
            const t = teinteExo(pal, k);
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 14, backgroundColor: pal.carte }}>
                <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={x.icone} size={22} color={t.encre} />
                </View>
                <Ink size={14} weight="bold" color={pal.texte} style={{ flex: 1, lineHeight: 20 }}>{traduire(x.texte)}</Ink>
              </View>
            );
          })}

          {etudes.length ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Ink size={16} weight="black" tight color={pal.texte}>{traduirePluriel(etudes.length, etudes.length > 1, 'L’étude', 'Les {0} études', etudes.length)}</Ink>
              {etudes.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => { tap(); void safeOpenURL(s.lien); }}
                  accessibilityRole="link"
                  accessibilityLabel={`${nomCourtSource(s)}. ${traduire(s.apport)}`}
                  style={({ pressed }) => ({ gap: 6, borderRadius: 20, padding: 14, backgroundColor: pressed ? pal.teinte : pal.carte })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: pal.teinte }}>
                      <Ink size={12} weight="black" color={pal.accent}>{nomCourtSource(s)}</Ink>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Icon name="link" size={15} color={pal.texte3} />
                  </View>
                  <Ink size={13} weight="bold" color={pal.texte2} style={{ lineHeight: 19 }}>{traduire(s.apport)}</Ink>
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
  const pal = usePaletteProgramme();
  const t = teinteExo(pal, k);
  return (
    <View style={{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: pal.carte }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={conseil.icone} size={24} color={t.encre} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Ink size={17} weight="black" tight color={pal.texte}>{traduire(conseil.titre)}</Ink>
          <Ink size={13} weight="bold" color={pal.texte2} style={{ lineHeight: 18 }}>{traduire(conseil.ligne)}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <BoutonPourquoi onPress={onPourquoi} label={traduire(conseil.titre)} />
        {ajout ? (
          ajout.etat === 'inclus' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: pal.vertTint }}>
              <Icon name="check" size={14} color={pal.vert} strokeWidth={3} />
              <Ink size={12} weight="extraBold" color={pal.vert}>{traduire('Déjà dans ton programme')}</Ink>
            </View>
          ) : (
            <Pressable
              onPress={() => { tap(); ajout.onBasculer?.(); }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ajout.etat === 'ajoute' }}
              accessibilityLabel={traduire('Ajouter le module {0}, si tu veux', traduire(ajout.label))}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: ajout.etat === 'ajoute' ? pal.indigo : pal.orangeTint, opacity: pressed ? 0.8 : 1 })}
            >
              <Icon name={ajout.etat === 'ajoute' ? 'check' : 'plus'} size={14} color={ajout.etat === 'ajoute' ? '#FFFFFF' : pal.orange} strokeWidth={3} />
              <Ink size={12} weight="extraBold" color={ajout.etat === 'ajoute' ? '#FFFFFF' : pal.orange}>
                {ajout.etat === 'ajoute' ? traduire('Module {0} ajouté', traduire(ajout.label)) : traduire('Ajouter le module {0}, si tu veux', traduire(ajout.label))}
              </Ink>
            </Pressable>
          )
        ) : null}
      </View>
    </View>
  );
}
