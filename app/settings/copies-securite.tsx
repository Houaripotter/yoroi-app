/**
 * Copies de securite automatiques (13 octobre 2026, soir).
 * Avant chaque mise a jour qui touche a tes donnees, YOROI range une copie complete sur ton telephone.
 * Ici : les voir (date, taille), les partager vers ton cloud, et les remettre par fusion
 * (on ajoute ce qui manque, on ne remplace jamais rien).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { Sheet, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { useCustomPopup } from '@/components/CustomPopup';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { logger } from '@/lib/security/logger';
import { listSafetyCopies, restoreSafetyCopy, safetyReportText, shareSafetyCopy, type SafetyCopy } from '@/lib/v2/sauvegarde/copiesSecurite';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];

function quand(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Date inconnue';
  return traduire("{0} {1} {2} à {3} h {4}", d.getDate(), MONTHS[d.getMonth()], d.getFullYear(), d.getHours(), String(d.getMinutes()).padStart(2, '0'));
}
function taille(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', DECIMAL)} Mo`;
}
const versionCourte = (v: string) => v.replace(/\s*\(.*\)$/, '');
function versions(copy: SafetyCopy): string {
  // IMPORT MULTI : copie faite avant un import de plusieurs pesees
  if (copy.reason) return copy.reason;
  const from = copy.from && copy.from !== 'version precedente' ? versionCourte(copy.from) : null;
  const to = copy.to ? versionCourte(copy.to) : null;
  if (from && to) return traduire("Avant le passage de la {0} à la {1}", from, to);
  if (to) return traduire("Avant le passage à la {0}", to);
  return traduire('Avant une mise à jour');
}

export default function CopiesSecurite() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();
  const [copies, setCopies] = useState<SafetyCopy[] | null>(null);
  const [open, setOpen] = useState<SafetyCopy | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listSafetyCopies().then(setCopies).catch(() => setCopies([]));
  }, []);
  useEffect(load, [load]);

  // La fenetre se ferme d'abord : la feuille de partage et les messages s'ouvrent sur l'ecran, pas dessous
  const wait = () => new Promise((r) => setTimeout(r, 380));

  const share = async (copy: SafetyCopy) => {
    if (busy) return;
    setOpen(null);
    await wait();
    setBusy(true);
    try {
      const ok = await shareSafetyCopy(copy);
      if (!ok) showPopup('Oups', traduire('Le partage n’est pas disponible sur ce téléphone.'));
    } catch (e) {
      logger.error('[Copies] partage', e);
      showPopup('Oups', traduire('La copie n’a pas pu être préparée. Réessaie.'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (copy: SafetyCopy) => {
    setOpen(null);
    await wait();
    showPopup(
      traduire('Remettre cette copie ?'),
      traduire('Ce qui manque sur ce téléphone est ajouté. Rien n’est effacé, rien n’est remplacé, et ce qui est déjà là n’est pas recopié deux fois. Ce que tu as supprimé depuis cette date peut revenir.'),
      [
        { text: traduire('Annuler'), style: 'cancel' },
        {
          text: 'Remettre',
          style: 'primary',
          onPress: async () => {
            setBusy(true);
            try {
              const rep = await restoreSafetyCopy(copy);
              if (!rep) {
                notificationAsync(NotificationFeedbackType.Error).catch(() => {});
                showPopup('Oups', traduire('La copie n’a pas pu être remise. Rien n’a été effacé sur ce téléphone.'));
                return;
              }
              notificationAsync(NotificationFeedbackType.Success).catch(() => {});
              DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
              showPopup('Copie remise', safetyReportText(rep));
            } catch (e) {
              logger.error('[Copies] restauration', e);
              showPopup('Oups', traduire('La copie n’a pas pu être remise. Rien n’a été effacé sur ce téléphone.'));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const cloud = Platform.OS === 'ios' ? traduire('Fichiers ou iCloud Drive') : traduire('Fichiers ou Google Drive');

  return (
    <View style={{ flex: 1 }}>
      <EspaceScreen title={traduire("Copies de sécurité")} subtitle={traduire("Faites toutes seules avant chaque mise à jour")} gap={14}>
        <Card>
          <View style={{ padding: 14, gap: 6 }}>
            <Ink size={14} color={c.textSecondary}>
              {traduire("Avant chaque mise à jour qui touche à tes données, YOROI garde une copie complète sur ce téléphone. Les trois dernières restent là.")}</Ink>
            <Ink size={14} color={c.textSecondary}>
              {traduire("Partage une copie vers {0} pour l’avoir aussi en dehors du téléphone.", cloud)}
            </Ink>
          </View>
        </Card>

        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
            <ChargementPetit size={22} />
            <Ink size={14} color={c.textSecondary}>{traduire("Un instant")}</Ink>
          </View>
        ) : null}

        {copies === null ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}><ChargementPetit size={30} /></View>
        ) : copies.length === 0 ? (
          <Card>
            <View style={{ padding: 14, gap: 4 }}>
              <Ink size={15} weight="bold">{traduire("Aucune copie pour l’instant")}</Ink>
              <Ink size={14} color={c.textSecondary}>{traduire("La première sera faite à la prochaine mise à jour de l’app.")}</Ink>
            </View>
          </Card>
        ) : (
          <Card>
            {copies.map((copy, i) => (
              <ValueRow
                key={copy.dir}
                first={i === 0}
                icon="archive"
                label={quand(copy.at)}
                sub={`${versions(copy)}, ${taille(copy.bytes)}`}
                onPress={() => setOpen(copy)}
              />
            ))}
          </Card>
        )}
      </EspaceScreen>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={traduire("Copie de sécurité")} subtitle={open ? quand(open.at) : undefined}>
        {open ? (
          <>
            <View style={{ backgroundColor: c.fillSoft, borderRadius: 18, padding: 14, gap: 4 }}>
              <Ink size={14} color={c.textSecondary}>{versions(open)}</Ink>
              <Ink size={14} color={c.textSecondary}>{traduire("Taille : {0}", taille(open.bytes))}</Ink>
              <Ink size={14} color={c.textSecondary}>
                {open.hasDb ? traduire('Contient ta base (pesées, séances, profil et le reste), les réglages de l’app et le coffre.') : traduire('Contient les réglages de l’app et le coffre.')}
              </Ink>
              {open.unreadableKeys?.length ? (
                <Ink size={13} color={c.textMuted}>{traduire("{0} élément(s) trop gros n’ont pas pu être copiés.", open.unreadableKeys.length)}</Ink>
              ) : null}
            </View>
            <Button tone="accent" icon="share" label={traduire("Partager vers ton cloud")} disabled={busy} onPress={() => share(open)} />
            <Button tone="ink" icon="restore" label={traduire("Remettre sur ce téléphone")} disabled={busy} onPress={() => restore(open)} />
            <Button tone="ghost" label={traduire("Fermer")} onPress={() => setOpen(null)} />
          </>
        ) : null}
      </Sheet>

      <PopupComponent />
    </View>
  );
}
